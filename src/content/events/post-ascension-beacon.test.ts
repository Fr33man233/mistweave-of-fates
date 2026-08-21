import { describe, expect, it } from 'vitest';
import { resolvePostAscensionBeaconEvent } from './post-ascension-beacon';
import { advanceTrack, attemptAscension, acquireMaterial, prepareRitual } from '../../core/ascension';
import { actionIds, chooseApproach, createGame, startCase } from '../../core/game';
import { createCharacter } from '../../core/profile';

function ascended() {
  let game = { ...createGame('post-beacon'), profile: createCharacter(createGame('post-beacon').profile, 'detective', 'follow the trace', { name: '探员', gender: 'unspecified' }) };
  for (const action of actionIds) game = chooseApproach(startCase(game, action), action, 'safe');
  game = advanceTrack(game, 'observer');
  game = acquireMaterial(game, 'observer', 'safe');
  game = prepareRitual(game, 'observer', 'safe');
  return attemptAscension(game, 'observer', 'asc-1');
}

describe('post-ascension ability event', () => {
  it('binds an ability to a later investigation event', () => {
    const result = resolvePostAscensionBeaconEvent(ascended(), 'observer', 1, 'event-1');
    expect(result.log.at(-1)?.eventType).toBe('ability_applied_to_investigation');
  });
});
