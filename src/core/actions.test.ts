import { describe, expect, it } from 'vitest';
import { acquireMaterial, advanceTrack, attemptAscension, prepareRitual } from './ascension';
import { actionIds, chooseApproach, createGame, startCase, submitInvestigation, submitInvestigationWithAbility } from './game';
import { createCharacter } from './profile';

function ascendedGame() {
  let game = { ...createGame('ability-idempotent'), profile: createCharacter(createGame('ability-idempotent').profile, 'reporter', 'observe the truth', { name: '观察员', gender: 'female' }) };
  for (const action of actionIds) game = chooseApproach(startCase(game, action), action, 'safe');
  game = prepareRitual(acquireMaterial(advanceTrack(game, 'observer'), 'observer', 'safe'), 'observer', 'safe');
  return attemptAscension(game, 'observer', 'asc-1');
}

describe('idempotent action submission', () => {
  it('returns the original resolution without a second event', () => {
    const started = startCase(createGame('idempotent'), 'event_night_whistle');
    const first = submitInvestigation(started, 'event_night_whistle', 'safe', 'req-1');
    const second = submitInvestigation(first.game, 'event_night_whistle', 'safe', 'req-1');
    expect(second.game).toEqual(first.game);
    expect(second.resolution).toEqual(first.resolution);
  });
  it('rejects the same request id with a different payload', () => {
    const started = startCase(createGame('idempotent-conflict'), 'event_night_whistle');
    const first = submitInvestigation(started, 'event_night_whistle', 'safe', 'req-1');
    expect(() => submitInvestigation(first.game, 'event_night_whistle', 'risky', 'req-1')).toThrow('conflicts');
    expect(first.game.log).toHaveLength(1);
  });
  it('commits an event-bound ability exactly once for a stable request id', () => {
    const started = startCase(ascendedGame(), 'event_night_whistle');
    const first = submitInvestigationWithAbility(started, 'event_night_whistle', 'safe', 'observer', 1, 'ability-req');
    const second = submitInvestigationWithAbility(first.game, 'event_night_whistle', 'safe', 'observer', 1, 'ability-req');
    expect(second.game).toEqual(first.game);
    expect(first.game.abilityUses).toHaveLength(1);
    expect(first.game.log.filter((event) => event.eventType === 'ability_applied_to_investigation')).toHaveLength(1);
  });
});
