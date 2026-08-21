import type { Character, Profile } from './schema';

export const occupations = ['apothecary', 'reporter', 'detective', 'dockworker'] as const;
export type Occupation = (typeof occupations)[number];
export type { Profile } from './schema';

export function createProfile(): Profile { return { slotLimit: 3, characters: [], deceasedIds: [], activeCharacterId: null }; }
export type CharacterIdentity = { name?: string; gender?: Character['gender'] };
export function createCharacter(profile: Profile, occupation: Occupation, intent: string, identity: CharacterIdentity = {}): Profile {
  if (!occupations.includes(occupation)) throw new Error('Unknown occupation');
  if (profile.characters.length >= profile.slotLimit) throw new Error('No character slots remain');
  const id = `char_${profile.characters.length + 1}`;
  const character: Character = { characterId: id, status: 'active', name: identity.name?.trim() || `调查员 ${id.replace('char_', '')}`, gender: identity.gender ?? 'unspecified', occupationId: occupation, initialIntent: intent, attributes: { physique: 50, constitution: 50, agility: 50, perception: occupation === 'reporter' ? 60 : 50, intelligence: 50, willpower: 50, charisma: 50, education: 50 }, skills: { intent: intent.length }, derived: { hp: { current: 9, max: 9 }, sanity: { current: 50, max: 50 }, spirituality: { current: 5, max: 5 }, pollution: 0 }, conditions: [], inventoryIds: [], money: { currency: 'city_pound', balance: 10 }, locationId: 'loc_greyfurnace_apothecary', pathwayState: null, lawStateId: 'law_state_unaffiliated' };
  const retired = profile.characters.map((entry) => entry.status === 'active' ? { ...entry, status: 'retired' as const } : entry);
  return { ...profile, characters: [...retired, character], activeCharacterId: id };
}
