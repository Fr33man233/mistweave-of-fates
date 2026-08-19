import { describe, expect, it } from 'vitest';
import { createCharacter, createProfile } from './profile';

describe('character profile', () => {
  it('creates one of four legal ordinary characters with five spirituality', () => {
    const profile = createCharacter(createProfile(), 'reporter', 'curious');
    expect(profile.characters).toHaveLength(1);
    expect(profile.characters[0]?.derived.spirituality).toEqual({ current: 5, max: 5 });
  });
  it('rejects a fourth character card', () => {
    let profile = createProfile();
    profile = createCharacter(profile, 'apothecary', 'careful');
    profile = createCharacter(profile, 'detective', 'orderly');
    profile = createCharacter(profile, 'dockworker', 'bold');
    expect(() => createCharacter(profile, 'reporter', 'curious')).toThrow('No character slots remain');
  });
});
