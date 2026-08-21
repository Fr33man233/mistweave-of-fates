import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { createFileTelemetrySink, telemetryLimits, type ServerTelemetryRecord } from './telemetry';

const record = (index: number): ServerTelemetryRecord => ({
  recordedAt: new Date(0).toISOString(), requestId: `request-${index}`, route: '/api/model/keeper/interpret', purpose: 'keeper_interpret', model: 'deepseek-v4-flash', promptVersion: 'keeper-v1', status: 200, outcome: 'success', errorCode: null, retryable: false, latencyMs: index, usage: { inputTokens: 1, cachedInputTokens: 0, outputTokens: 2, reasoningOutputTokens: 0, totalTokens: 3 },
});

describe('server telemetry ledger', () => {
  it('retains a bounded JSONL metadata ledger and drops oldest records first', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'mistweave-telemetry-'));
    const file = path.join(dir, 'telemetry.jsonl');
    try {
      const sink = createFileTelemetrySink(file);
      for (let index = 0; index < telemetryLimits.maxRecords + 7; index += 1) await sink.record(record(index));
      const lines = (await readFile(file, 'utf8')).trim().split('\n');
      expect(lines).toHaveLength(telemetryLimits.maxRecords);
      expect(JSON.parse(lines[0]).requestId).toBe('request-7');
      expect((await readFile(file)).length).toBeLessThanOrEqual(telemetryLimits.maxBytes + 1);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
