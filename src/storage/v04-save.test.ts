import 'fake-indexeddb/auto';
import { openDB } from 'idb';
import { beforeEach, describe, expect, it } from 'vitest';
import { createParallelTingenWorld } from '../tingen/world';
import { clearV04, loadV04, normalizeV04Save, saveV04, v04StorageIdentity } from './v04-save';

const payload = (seed: string) => ({ schemaVersion: '0.4.0' as const, world: createParallelTingenWorld(seed) });

beforeEach(async () => { await clearV04(); });

describe('V0.4 isolated save', () => {
  it('uses a separate namespace and leaves the V0.3 store untouched', async () => {
    const old = await openDB('veilport-v01', 1, { upgrade(db) { if (!db.objectStoreNames.contains('run')) db.createObjectStore('run'); } });
    await old.put('run', { sentinel: 'legacy' }, 'current');
    await saveV04(payload('v04-first'));
    expect(await old.get('run', 'current')).toEqual({ sentinel: 'legacy' });
    expect(v04StorageIdentity.databaseName).toBe('mistweave-v04');
    old.close();
  });

  it('restores the previous verified snapshot when current is corrupted', async () => {
    await saveV04(payload('first'));
    await saveV04(payload('second'));
    const db = await openDB(v04StorageIdentity.databaseName, 1);
    const stored = await db.get(v04StorageIdentity.storeName, v04StorageIdentity.recordKey);
    await db.put(v04StorageIdentity.storeName, { ...stored, integrity: 'broken' }, v04StorageIdentity.recordKey);
    expect((await loadV04())?.world.worldSeed).toBe('first');
    db.close();
  });

  it('rejects malformed and future-version saves without partial loading', () => {
    expect(normalizeV04Save({ schemaVersion: '0.5.0', world: {} })).toBeUndefined();
    expect(normalizeV04Save({ schemaVersion: '0.4.0', world: { schemaVersion: '0.4.0' } })).toBeUndefined();
  });
});
