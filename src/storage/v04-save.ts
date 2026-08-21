import { openDB } from 'idb';
import { z } from 'zod';
import { type V04SavePayload, v04SavePayloadSchema } from '../coc/schema';

const databaseName = 'mistweave-v04';
const storeName = 'v04-run';
const recordKey = 'current';
let dbPromise: ReturnType<typeof openDB> | undefined;
let mutationQueue: Promise<void> = Promise.resolve();

const envelopeSchema = z.object({
  schemaVersion: z.literal('0.4.0'),
  current: v04SavePayloadSchema,
  previous: v04SavePayloadSchema.nullable(),
  savedAt: z.int().nonnegative(),
  integrity: z.string().min(1),
}).strict();

// Keep the envelope readable even when only `current` is damaged.  The
// previous snapshot is the recovery boundary and must not be hidden by a
// strict parse of the corrupted current payload.
const recoveryEnvelopeSchema = z.object({
  schemaVersion: z.literal('0.4.0'),
  current: z.unknown(),
  previous: z.unknown().nullable(),
  savedAt: z.int().nonnegative(),
  integrity: z.string().min(1),
}).strict();

function database() {
  if (!globalThis.indexedDB) return undefined;
  return (dbPromise ??= openDB(databaseName, 1, {
    upgrade(db) { db.createObjectStore(storeName); },
  }));
}

function checksum(value: V04SavePayload): string {
  let hash = 2166136261;
  for (const char of JSON.stringify(value)) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0;
  return `fnv1a:${hash.toString(16)}`;
}

export function normalizeV04Save(value: unknown): V04SavePayload | undefined {
  return v04SavePayloadSchema.safeParse(value).data;
}

export function saveV04(payload: V04SavePayload): Promise<void> {
  mutationQueue = mutationQueue.then(async () => {
    const db = database();
    if (!db) return;
    const opened = await db;
    const previousStored = await opened.get(storeName, recordKey);
    const previousEnvelope = envelopeSchema.safeParse(previousStored);
    const previous = previousEnvelope.success && checksum(previousEnvelope.data.current) === previousEnvelope.data.integrity
      ? previousEnvelope.data.current
      : null;
    const current = v04SavePayloadSchema.parse(payload);
    await opened.put(storeName, {
      schemaVersion: '0.4.0', current, previous, savedAt: Date.now(), integrity: checksum(current),
    }, recordKey);
  });
  return mutationQueue;
}

export async function loadV04(): Promise<V04SavePayload | undefined> {
  await mutationQueue;
  const db = database();
  if (!db) return undefined;
  const parsed = recoveryEnvelopeSchema.safeParse(await (await db).get(storeName, recordKey));
  if (!parsed.success) return undefined;
  const current = v04SavePayloadSchema.safeParse(parsed.data.current);
  if (current.success && checksum(current.data) === parsed.data.integrity) return current.data;
  const previous = v04SavePayloadSchema.safeParse(parsed.data.previous);
  return previous.success ? previous.data : undefined;
}

export function clearV04(): Promise<void> {
  mutationQueue = mutationQueue.then(async () => {
    const db = database();
    if (db) await (await db).delete(storeName, recordKey);
  });
  return mutationQueue;
}

export const v04StorageIdentity = { databaseName, storeName, recordKey } as const;
