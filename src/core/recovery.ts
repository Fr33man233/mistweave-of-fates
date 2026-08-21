import { activeCharacter, applyCharacterSession, blankCharacterSession, captureCharacterSession, type Game } from './game';
import { commitEvent } from './rules';

export type RecoveryAction = 'rest' | 'leave_case' | 'switch_character';

export function updateRecoveryState(game: Game): Game {
  const character = activeCharacter(game);
  if (!character) return { ...game, recoveryState: 'normal' };
  const hpZero = character.derived.hp.current === 0;
  const sanityZero = character.derived.sanity.current === 0;
  return { ...game, recoveryState: hpZero ? 'incapacitated' : sanityZero ? 'broken' : 'normal' };
}

export function recoverResource(game: Game, action: RecoveryAction): Game {
  const character = activeCharacter(game);
  if (!character || character.status !== 'active') throw new Error('An active character is required');
  if (action === 'switch_character') return { ...game, profile: { ...game.profile, activeCharacterId: null }, recoveryState: 'normal' };
  if (action === 'leave_case' && !Object.values(game.caseStates).some((caseState) => caseState.stage === 'approach')) return game;
  const committed = commitEvent(game.state, { eventType: action === 'rest' ? 'resource_recovered' : 'case_exited', actorId: character.characterId, minutes: action === 'rest' ? 480 : 0 });
  const restored = {
    ...game,
    state: committed.state,
    log: [...game.log, action === 'leave_case' ? { ...committed.event, publicConsequences: ['已退出当前任务流程；未结算的调查可以重新开始。'] } : committed.event],
    caseStates: action === 'leave_case'
      ? Object.fromEntries(Object.entries(game.caseStates).map(([id, state]) => [id, state.stage === 'approach' ? { stage: 'available' } : state])) as Game['caseStates']
      : game.caseStates,
    profile: {
      ...game.profile,
      characters: game.profile.characters.map((entry) => entry.characterId === character.characterId ? {
        ...entry,
        derived: {
          ...entry.derived,
          hp: action === 'rest' ? { ...entry.derived.hp, current: Math.max(1, entry.derived.hp.current) } : entry.derived.hp,
          sanity: action === 'rest' ? { ...entry.derived.sanity, current: Math.max(1, entry.derived.sanity.current) } : entry.derived.sanity,
        },
      } : entry),
    },
  };
  return updateRecoveryState(restored);
}

export function switchCharacter(game: Game, characterId: string): Game {
  const target = game.profile.characters.find((entry) => entry.characterId === characterId);
  if (!target || target.status === 'deceased') throw new Error('Character is unavailable');
  const current = activeCharacter(game);
  const sessions = current
    ? { ...game.characterSessions, [current.characterId]: captureCharacterSession(game) }
    : game.characterSessions;
  const targetSession = sessions[characterId] ?? blankCharacterSession();
  const characters = game.profile.characters.map((entry) => {
    if (entry.characterId === characterId) return { ...entry, status: 'active' as const };
    return entry.status === 'active' ? { ...entry, status: 'retired' as const } : entry;
  });
  return updateRecoveryState(applyCharacterSession({
    ...game,
    profile: { ...game.profile, characters, activeCharacterId: characterId },
    characterSessions: { ...sessions, [characterId]: targetSession },
  }, targetSession));
}
