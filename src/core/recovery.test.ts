import { describe, expect, it } from 'vitest';
import { addCharacter, createGame, performAction } from './game';
import { recoverResource, switchCharacter } from './recovery';

describe('resource recovery and character switching', () => {
  it('recovers hp/sanity zero without reviving a deceased card', () => {
    const game = addCharacter(createGame(), 'detective', 'protect the port', { name: '阿澜', gender: 'unspecified' });
    const character = game.profile.characters[0]!;
    const broken = { ...game, profile: { ...game.profile, characters: [{ ...character, derived: { ...character.derived, hp: { current: 0, max: 9 }, sanity: { current: 0, max: 50 } } }] }, recoveryState: 'broken' as const };
    const restored = recoverResource(broken, 'rest');
    expect(restored.profile.characters[0]?.derived.hp.current).toBe(1);
    expect(restored.profile.characters[0]?.derived.sanity.current).toBe(1);
    expect(restored.profile.characters[0]?.status).toBe('active');
  });
  it('switches to a retired living character and retires the current one', () => {
    let game = addCharacter(createGame(), 'reporter', 'find facts', { name: '甲', gender: 'unspecified' });
    game = addCharacter(game, 'dockworker', 'move cargo', { name: '乙', gender: 'unspecified' });
    const first = game.profile.characters.find((entry) => entry.name === '甲')!;
    const switched = switchCharacter(game, first.characterId);
    expect(switched.profile.activeCharacterId).toBe(first.characterId);
    expect(switched.profile.characters.find((entry) => entry.name === '甲')?.status).toBe('active');
    expect(switched.profile.characters.find((entry) => entry.name === '乙')?.status).toBe('retired');
  });
  it('keeps investigation progress separated between character sessions', () => {
    let game = addCharacter(createGame('separated-sessions'), 'reporter', 'find facts', { name: '甲', gender: 'female' });
    const first = game.profile.characters.find((entry) => entry.name === '甲')!;
    game = performAction(game, 'event_night_whistle');
    game = addCharacter(game, 'dockworker', 'move cargo', { name: '乙', gender: 'male' });
    const second = game.profile.characters.find((entry) => entry.name === '乙')!;
    expect(game.profile.activeCharacterId).toBe(second.characterId);
    expect(game.state.clues).toEqual({});
    game = switchCharacter(game, first.characterId);
    expect(game.state.clues.clue_night_whistle).toBeDefined();
    expect(game.caseStates.event_night_whistle.stage).toBe('resolved');
    game = switchCharacter(game, second.characterId);
    expect(game.state.clues).toEqual({});
    expect(game.caseStates.event_night_whistle.stage).toBe('available');
  });
  it('exits an in-progress case back to an available contact without a soft lock', () => {
    const game = addCharacter(createGame(), 'detective', 'protect the port', { name: '阿澜', gender: 'female' });
    const inProgress = { ...game, caseStates: { ...game.caseStates, event_night_whistle: { stage: 'approach' as const } } };
    const exited = recoverResource(inProgress, 'leave_case');
    expect(exited.caseStates.event_night_whistle.stage).toBe('available');
    expect(exited.log.at(-1)?.publicConsequences[0]).toContain('退出当前任务流程');
  });
  it('does not create a fake exit event when no case is in progress', () => {
    const game = addCharacter(createGame(), 'detective', 'protect the port', { name: '阿澜', gender: 'female' });
    const exited = recoverResource(game, 'leave_case');
    expect(exited.state.eventCursor).toBe(game.state.eventCursor);
    expect(exited.log).toHaveLength(game.log.length);
  });
});
