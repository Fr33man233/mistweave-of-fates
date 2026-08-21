import { describe, expect, it } from 'vitest';
import { acquireMaterial, advanceTrack, attemptAscension, prepareRitual } from './ascension';
import { actionIds, chooseApproach, createGame, startCase, type Game, type PathwayId } from './game';
import { createCharacter } from './profile';

function hintedGame(): Game {
  let game = createGame('ascension-fixture');
  game = { ...game, profile: createCharacter(game.profile, 'reporter', 'notice every hidden detail') };
  for (const action of actionIds) game = chooseApproach(startCase(game, action), action, 'safe');
  return game;
}

function preparedGame(pathway: PathwayId = 'observer', approach: 'safe' | 'risky' = 'safe'): Game {
  const trusted = advanceTrack(hintedGame(), pathway);
  return prepareRitual(acquireMaterial(trusted, pathway, approach), pathway, approach);
}

describe('first ascension', () => {
  it('rejects pathway advancement before its anomalous lead is hinted', () => {
    expect(() => advanceTrack(createGame(), 'observer')).toThrow('Pathway lead is not hinted');
  });

  it('requires a trusted source and completed preparation before ascension', () => {
    const hinted = hintedGame();
    expect(() => prepareRitual(hinted, 'observer', 'safe')).toThrow('Trusted source is required');
    expect(() => attemptAscension(advanceTrack(hinted, 'observer'), 'observer', 'asc-1')).toThrow('Ritual preparation is required');
  });

  it('records safe and risky material preparation with distinct consequences', () => {
    const trusted = advanceTrack(hintedGame(), 'observer');
    const safe = prepareRitual(acquireMaterial(trusted, 'observer', 'safe'), 'observer', 'safe');
    const risky = prepareRitual(acquireMaterial(trusted, 'observer', 'risky'), 'observer', 'risky');

    expect(safe.pathwayTracks.observer.preparation).toEqual({ approach: 'safe', materialId: 'stabilized_aether_salts', quality: 2 });
    expect(safe.legalAttention).toBe(trusted.legalAttention);
    expect(risky.pathwayTracks.observer.preparation).toEqual({ approach: 'risky', materialId: 'unlicensed_mist_distillate', quality: 3 });
    expect(risky.legalAttention).toBe(trusted.legalAttention + 1);
    expect(risky.profile.characters[0]?.derived.pollution).toBe(1);
  });

  it('raises spirituality from five to eight on a clean success and locks the chosen pathway', () => {
    const result = attemptAscension(preparedGame(), 'observer', 'asc-1');
    const character = result.profile.characters[0];

    expect(result.pathwayTracks.observer.state).toBe('ascended');
    expect(result.pathwayTracks.hound.state).toBe('hinted');
    expect(result.pathwayTracks.observer.ascension?.outcome).toBe('success');
    expect(character?.derived.spirituality).toEqual({ current: 8, max: 8 });
    expect(character?.pathwayState).toBe('observer');
    expect(result.log.at(-1)).toMatchObject({
      eventType: 'ascension_attempted',
      randomEvidence: ['d100:16', 'preparation_quality:2'],
      privateConsequences: ['ascension_outcome:success'],
    });
  });

  it('applies pollution and sanity costs to a costly success', () => {
    const result = attemptAscension(preparedGame(), 'observer', 'asc-3');
    const character = result.profile.characters[0];

    expect(result.pathwayTracks.observer.ascension?.outcome).toBe('costly_success');
    expect(character?.derived.spirituality).toEqual({ current: 8, max: 8 });
    expect(character?.derived.pollution).toBe(2);
    expect(character?.derived.sanity.current).toBe(45);
  });

  it('reopens a concrete follow-up event after successful ascension', () => {
    const result = attemptAscension(preparedGame(), 'observer', 'asc-1');
    expect(result.caseStates.event_night_whistle.stage).toBe('available');
    expect(result.availableActions).toContain('event_night_whistle');
  });

  it('keeps an ordinary ascension failure nonlethal and retryable', () => {
    const result = attemptAscension(preparedGame(), 'observer', 'asc-0');
    const character = result.profile.characters[0];

    expect(result.pathwayTracks.observer.ascension?.outcome).toBe('failure');
    expect(result.pathwayTracks.observer.state).toBe('restricted');
    expect(character?.status).toBe('active');
    expect(character?.derived.spirituality).toEqual({ current: 5, max: 5 });
  });

  it('permanently deactivates the character on catastrophic failure', () => {
    const result = attemptAscension(preparedGame(), 'observer', 'asc-502');
    const character = result.profile.characters[0];

    expect(result.pathwayTracks.observer.ascension?.outcome).toBe('catastrophic_failure');
    expect(character?.status).toBe('deceased');
    expect(result.profile.deceasedIds).toEqual(['char_1']);
    expect(result.profile.activeCharacterId).toBeNull();
    expect(() => attemptAscension(result, 'observer', 'asc-1')).toThrow('An active character is required');
  });
});
