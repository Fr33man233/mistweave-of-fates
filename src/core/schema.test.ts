import { describe, expect, it } from 'vitest';
import { characterSchema, worldStateSchema } from './schema';
import { createInitialWorld } from '../content/valenport';

describe('initial world', () => {
  it('parses and preserves the supplied seed', () => {
    const world = createInitialWorld('seed_parent_probe_042');
    expect(world.worldSeed).toBe('seed_parent_probe_042');
    expect(worldStateSchema.safeParse(world).success).toBe(true);
  });

  it('rejects a meter whose current exceeds max', () => {
    const world = createInitialWorld();
    const broken = {
      ...world,
      characters: {
        ...world.characters,
        char_player: {
          ...world.characters.char_player,
          derived: { ...world.characters.char_player.derived, hp: { current: 10, max: 9 } },
        },
      },
    };
    expect(characterSchema.safeParse(broken.characters.char_player).success).toBe(false);
    expect(worldStateSchema.safeParse(broken).success).toBe(false);
  });
});
