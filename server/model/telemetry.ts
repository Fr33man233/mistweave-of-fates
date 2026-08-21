import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { ModelPurpose, ModelUsage } from '../../src/model/contracts.ts';

/**
 * Server-side operational telemetry deliberately contains metadata only.  It
 * must never receive request messages, player text, candidate JSON, archives,
 * hidden facts, or credentials.
 */
export type ServerTelemetryRecord = {
  recordedAt: string;
  requestId: string | null;
  route: string;
  purpose: ModelPurpose | null;
  model: string | null;
  promptVersion: string | null;
  status: number;
  outcome: 'success' | 'error' | 'busy' | 'rejected';
  errorCode: string | null;
  retryable: boolean;
  latencyMs: number;
  usage: ModelUsage | null;
};

export interface ServerTelemetrySink {
  record(record: ServerTelemetryRecord): Promise<void> | void;
}

const maxRecords = 256;
const maxBytes = 256 * 1024;

export class MemoryTelemetrySink implements ServerTelemetrySink {
  readonly records: ServerTelemetryRecord[] = [];

  record(record: ServerTelemetryRecord): void {
    this.records.push(record);
    if (this.records.length > maxRecords) this.records.splice(0, this.records.length - maxRecords);
  }
}

function parseLines(raw: string): ServerTelemetryRecord[] {
  return raw.split(/\r?\n/).filter(Boolean).flatMap((line) => {
    try {
      const value: unknown = JSON.parse(line);
      return value && typeof value === 'object' ? [value as ServerTelemetryRecord] : [];
    } catch {
      return [];
    }
  });
}

export function createFileTelemetrySink(filePath = process.env.MISTWEAVE_TELEMETRY_FILE ?? path.join(process.cwd(), '.local', 'v04-model-telemetry.jsonl')): ServerTelemetrySink {
  let queue = Promise.resolve();
  return {
    record(record) {
      queue = queue.then(async () => {
        try {
          await mkdir(path.dirname(filePath), { recursive: true });
          let records: ServerTelemetryRecord[] = [];
          try { records = parseLines(await readFile(filePath, 'utf8')); } catch (error) {
            if ((error as NodeJS.ErrnoException).code !== 'ENOENT') records = [];
          }
          records.push(record);
          records = records.slice(-maxRecords);
          let lines = records.map((entry) => JSON.stringify(entry));
          while (lines.join('\n').length > maxBytes && lines.length > 1) lines.shift();
          const tempPath = `${filePath}.${process.pid}.tmp`;
          await writeFile(tempPath, `${lines.join('\n')}\n`, 'utf8');
          await rename(tempPath, filePath);
        } catch {
          // Telemetry is observability only; a full disk or permission error
          // must never change gameplay or the model response.
        }
      });
      return queue;
    },
  };
}

export function recordTelemetrySafely(sink: ServerTelemetrySink | undefined, record: ServerTelemetryRecord): void {
  if (!sink) return;
  void Promise.resolve(sink.record(record)).catch(() => undefined);
}

export const telemetryLimits = { maxRecords, maxBytes } as const;
