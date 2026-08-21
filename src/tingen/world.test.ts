import { describe, expect, it } from 'vitest';
import { createParallelTingenWorld } from './world';

describe('parallel Tingen world', () => {
  it('creates a repeatable world identity and fixed visible scene for the same seed', () => {
    const first = createParallelTingenWorld('tingen-seed');
    const second = createParallelTingenWorld('tingen-seed');
    expect(first).toEqual(second);
    expect(first.worldId).toMatch(/^parallel-tingen-/);
    expect(first.scene.locationId).toBe('tingen-riverside');
    expect(first.characters).toEqual([]);
    expect(first.activeCharacterId).toBeNull();
  });
});
