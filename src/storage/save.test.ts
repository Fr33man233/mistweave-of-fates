import 'fake-indexeddb/auto';
import { openDB } from 'idb';
import { beforeEach, describe, expect, it } from 'vitest';
import { acquireMaterial, advanceTrack, attemptAscension, prepareRitual } from '../core/ascension';
import { actionIds, addCharacter, chooseApproach, createGame, performAction, startCase } from '../core/game';
import { createCharacter } from '../core/profile';
import { clearGame, loadGame, normalizeSavedGame, saveGame } from './save';

function hintedGame() {
  let game = createGame('save-v02');
  game = { ...game, profile: createCharacter(game.profile, 'reporter', '追查雾中的真相') };
  for (const action of actionIds) game = chooseApproach(startCase(game, action), action, 'safe');
  return game;
}

beforeEach(async () => {
  await clearGame();
});

describe('local save', () => {
  it('restores events and world state after a save', async () => {
    const game = performAction(createGame('save-seed'), 'event_night_whistle');
    await saveGame(game);
    const restored = await loadGame();
    expect(restored?.state.worldSeed).toBe('save-seed');
    expect(restored?.log).toHaveLength(1);
  });

  it('restores profile, tracks, material preparation, ritual risk, and death', async () => {
    const prepared = prepareRitual(acquireMaterial(advanceTrack(hintedGame(), 'observer'), 'observer', 'risky'), 'observer', 'risky');
    const deceased = attemptAscension(prepared, 'observer', 'asc-502');
    await saveGame(deceased);

    const restored = await loadGame();
    expect(restored?.profile.characters[0]?.status).toBe('deceased');
    expect(restored?.profile.deceasedIds).toEqual(['char_1']);
    expect(restored?.pathwayTracks.observer.preparation).toEqual({
      approach: 'risky', materialId: 'unlicensed_mist_distillate', quality: 3,
    });
    expect(restored?.pathwayTracks.observer.ascension?.outcome).toBe('catastrophic_failure');
    expect(restored?.legalAttention).toBe(1);
  });

  it('fills V0.2 defaults when loading a structurally valid legacy save', () => {
    let current = createGame('legacy-save');
    for (const action of actionIds) current = chooseApproach(startCase(current, action), action, 'safe');
    const { profile: _profile, pathwayTracks: _tracks, abilityUses: _uses, ...legacy } = current;
    const legacyCharacters = Object.fromEntries(Object.entries(legacy.state.characters).map(([id, character]) => {
      const { initialIntent: _initialIntent, ...legacyCharacter } = character;
      return [id, legacyCharacter];
    }));
    const normalized = normalizeSavedGame({
      ...legacy,
      state: { ...legacy.state, characters: legacyCharacters },
    });

    expect(normalized?.profile.characters).toEqual([]);
    expect(normalized?.meaningfulEventCount).toBe(3);
    expect(normalized?.pathwayTracks.observer.state).toBe('hinted');
    expect(normalized?.pathwayTracks.hound.state).toBe('hinted');
    expect(normalized?.abilityUses).toEqual([]);
    expect(normalized?.state.characters.char_player?.initialIntent).toBe('延续旧存档的调查');
  });

  it('rejects malformed saved values instead of treating them as a game', () => {
    expect(normalizeSavedGame({ state: { worldSeed: '' } })).toBeUndefined();
    expect(normalizeSavedGame('not-a-game')).toBeUndefined();

    const prepared = prepareRitual(acquireMaterial(advanceTrack(hintedGame(), 'observer'), 'observer', 'safe'), 'observer', 'safe');
    expect(normalizeSavedGame({
      ...prepared,
      pathwayTracks: {
        ...prepared.pathwayTracks,
        observer: { ...prepared.pathwayTracks.observer, preparation: null },
      },
    })).toBeUndefined();
    expect(normalizeSavedGame({
      ...prepared,
      profile: { ...prepared.profile, activeCharacterId: 'missing-character' },
    })).toBeUndefined();
  });

  it('round-trips per-character investigation sessions', async () => {
    let game = addCharacter(createGame('session-save'), 'reporter', 'find facts', { name: '甲', gender: 'female' });
    game = performAction(game, 'event_night_whistle');
    game = addCharacter(game, 'dockworker', 'move cargo', { name: '乙', gender: 'male' });
    await saveGame(game);
    const restored = await loadGame();
    expect(restored?.profile.characters.find((entry) => entry.name === '乙')?.status).toBe('active');
    expect(restored?.state.clues).toEqual({});
    expect(restored?.characterSessions.char_1?.clues.clue_night_whistle).toBeDefined();
  });

  it('falls back to the previous verified snapshot when current is corrupted', async () => {
    const first = performAction(createGame('snapshot-first'), 'event_night_whistle');
    const second = performAction(createGame('snapshot-second'), 'event_night_whistle');
    await saveGame(first);
    await saveGame(second);
    const db = await openDB('veilport-v01', 1);
    const stored = await db.get('run', 'current') as { current: unknown };
    stored.current = { corrupted: true };
    await db.put('run', stored, 'current');
    const restored = await loadGame();
    expect(restored?.state.worldSeed).toBe('snapshot-first');
    db.close();
  });

  it('reopens the post-ascension follow-up when loading an older ascended save', () => {
    const ascended = attemptAscension(prepareRitual(acquireMaterial(advanceTrack(hintedGame(), 'observer'), 'observer', 'safe'), 'observer', 'safe'), 'observer', 'asc-1');
    const legacy = {
      ...ascended,
      caseStates: { ...ascended.caseStates, event_night_whistle: { stage: 'resolved' as const, approach: 'safe' as const } },
      availableActions: ascended.availableActions.filter((id) => id !== 'event_night_whistle'),
    };
    const normalized = normalizeSavedGame(legacy);
    expect(normalized?.caseStates.event_night_whistle.stage).toBe('available');
    expect(normalized?.availableActions).toContain('event_night_whistle');
  });
});
