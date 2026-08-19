import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { createGame, performAction } from '../core/game';
import { loadGame, saveGame } from './save';

describe('local save', () => {
  it('restores events and world state after a save', async () => {
    const game = performAction(createGame('save-seed'), 'event_night_whistle');
    await saveGame(game);
    const restored = await loadGame();
    expect(restored?.state.worldSeed).toBe('save-seed');
    expect(restored?.log).toHaveLength(1);
  });
});
