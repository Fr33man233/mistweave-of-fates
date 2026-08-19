import { describe, expect, it } from 'vitest';
import { createCharacter, createProfile, occupations } from './profile';
import { profileSchema } from './schema';

describe('character profile', () => {
  it('creates one of four legal ordinary characters with five spirituality', () => {
    const profile = createCharacter(createProfile(), 'reporter', 'curious');
    expect(profile.characters).toHaveLength(1);
    expect(profile.characters[0]?.derived.spirituality).toEqual({ current: 5, max: 5 });
    expect(profile.characters[0]?.initialIntent).toBe('curious');
  });
  it('rejects a fourth character card', () => {
    let profile = createProfile();
    profile = createCharacter(profile, 'apothecary', 'careful');
    profile = createCharacter(profile, 'detective', 'orderly');
    profile = createCharacter(profile, 'dockworker', 'bold');
    expect(() => createCharacter(profile, 'reporter', 'curious')).toThrow('No character slots remain');
  });

  it.each(occupations)('creates the %s starting occupation', (occupation) => {
    const profile = createCharacter(createProfile(), occupation, 'begin an honest life');

    expect(profile.characters[0]?.occupationId).toBe(occupation);
  });

  it('serializes an active three-slot profile through the authoritative schema', () => {
    const profile = createCharacter(createProfile(), 'dockworker', 'earn honest coin');

    expect(profileSchema.safeParse(profile).success).toBe(true);
  });

  it('rejects an occupation outside the four legal starting roles', () => {
    expect(() => createCharacter(createProfile(), 'occultist' as never, 'seek forbidden power')).toThrow('Unknown occupation');
  });
});
