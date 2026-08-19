import { describe, expect, it } from 'vitest';
import { useAbility } from './abilities';
import { advanceTrack, attemptAscension, prepareRitual } from './ascension';
import { actionIds, chooseApproach, createGame, startCase, type Game, type PathwayId } from './game';
import { createCharacter } from './profile';

function ascendedGame(pathway: PathwayId = 'observer'): Game {
  let game = createGame(`ability-fixture:${pathway}`);
  game = { ...game, profile: createCharacter(game.profile, 'detective', 'protect the city and notice every trace') };
  for (const action of actionIds) game = chooseApproach(startCase(game, action), action, 'safe');
  game = advanceTrack(game, pathway);
  game = prepareRitual(game, pathway, 'safe');
  return attemptAscension(game, pathway, 'asc-1');
}

describe('first pathway abilities', () => {
  it('requires a living ascended character on the matching pathway', () => {
    const mortal = createGame();
    expect(() => useAbility(mortal, 'observer', 1, 'ability-0')).toThrow('An active character is required');
    expect(() => useAbility(ascendedGame('observer'), 'hound', 1, 'ability-0')).toThrow('Character has not ascended on this pathway');

    const inconsistent = ascendedGame('observer');
    inconsistent.pathwayTracks.observer.state = 'prepared';
    expect(() => useAbility(inconsistent, 'observer', 1, 'ability-0')).toThrow('Character has not ascended on this pathway');
  });

  it.each([1, 2, 3] as const)('predeclares and spends exactly %i spirituality', (charge) => {
    const result = useAbility(ascendedGame(), 'observer', charge, 'ability-0');
    const character = result.profile.characters[0];

    expect(character?.derived.spirituality.current).toBe(8 - charge);
    expect(result.abilityUses.at(-1)).toMatchObject({ pathway: 'observer', charge });
    expect(result.log.at(-1)?.randomEvidence).toContain(`charge:${charge}`);
  });

  it('rejects invalid charge and insufficient spirituality without committing an event', () => {
    const ascended = ascendedGame();
    expect(() => useAbility(ascended, 'observer', 0 as 1, 'ability-0')).toThrow('Ability charge must be between 1 and 3');

    const lowSpirit = useAbility(useAbility(ascended, 'observer', 3, 'ability-0'), 'observer', 3, 'ability-0');
    expect(lowSpirit.profile.characters[0]?.derived.spirituality.current).toBe(2);
    expect(() => useAbility(lowSpirit, 'observer', 3, 'ability-0')).toThrow('Insufficient spirituality');
    expect(lowSpirit.log).toHaveLength(ascended.log.length + 2);
  });

  it('makes observer overcharge risk pollution without generating clues or advancing tracks', () => {
    const ascended = ascendedGame('observer');
    const result = useAbility(ascended, 'observer', 2, 'ability-5');

    expect(result.abilityUses.at(-1)).toMatchObject({ outcome: 'success', pressure: 'pollution' });
    expect(result.profile.characters[0]?.derived.pollution).toBe(1);
    expect(result.state.clues).toEqual(ascended.state.clues);
    expect(result.pathwayTracks).toEqual(ascended.pathwayTracks);
  });

  it('makes hound overcharge risk either injury or sanity pressure', () => {
    const ascended = ascendedGame('hound');
    const injured = useAbility(ascended, 'hound', 2, 'ability-6');
    const strained = useAbility(ascended, 'hound', 2, 'ability-5');

    expect(injured.abilityUses.at(-1)).toMatchObject({ outcome: 'failure', pressure: 'injury' });
    expect(injured.profile.characters[0]?.derived.hp.current).toBe(8);
    expect(strained.abilityUses.at(-1)).toMatchObject({ outcome: 'success', pressure: 'sanity' });
    expect(strained.profile.characters[0]?.derived.sanity.current).toBe(45);
  });

  it('keeps hound ability pressure nonlethal even at one hp', () => {
    const ascended = ascendedGame('hound');
    const character = ascended.profile.characters[0]!;
    const fragile = {
      ...ascended,
      profile: {
        ...ascended.profile,
        characters: [{
          ...character,
          derived: { ...character.derived, hp: { ...character.derived.hp, current: 1 } },
        }],
      },
    };

    const result = useAbility(fragile, 'hound', 3, 'ability-6');
    expect(result.profile.characters[0]?.derived.hp.current).toBe(1);
    expect(result.profile.characters[0]?.status).toBe('active');
  });

  it('replays the same declared ability and seed deterministically', () => {
    const ascended = ascendedGame();
    expect(useAbility(ascended, 'observer', 3, 'ability-8')).toEqual(
      useAbility(ascended, 'observer', 3, 'ability-8'),
    );
  });
});
