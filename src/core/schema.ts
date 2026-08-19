import { z } from 'zod';

export const worldTimeSchema = z.object({ worldDay: z.int().min(1), hour: z.int().min(0).max(23), minute: z.int().min(0).max(59) });
export type WorldTime = z.infer<typeof worldTimeSchema>;
export const meterSchema = z.object({ current: z.int().min(0), max: z.int().min(1) }).refine((meter) => meter.current <= meter.max, { message: 'meter current must not exceed max' });
export type Meter = z.infer<typeof meterSchema>;
const value = z.int().min(0).max(100);
export const characterSchema = z.object({
  characterId: z.string().min(1), status: z.enum(['active', 'deceased', 'retired']), occupationId: z.string().min(1),
  attributes: z.object({ physique: value, constitution: value, agility: value, perception: value, intelligence: value, willpower: value, charisma: value, education: value }),
  skills: z.record(z.string(), value), derived: z.object({ hp: meterSchema, sanity: meterSchema, spirituality: meterSchema, pollution: value }),
  conditions: z.array(z.string()), inventoryIds: z.array(z.string()), money: z.object({ currency: z.string().min(1), balance: z.number().min(0) }),
  locationId: z.string().min(1), pathwayState: z.string().nullable(), lawStateId: z.string().min(1),
});
export type Character = z.infer<typeof characterSchema>;
const record = z.record(z.string(), z.unknown());
export const worldStateSchema = z.object({
  schemaVersion: z.literal('0.1.0'), worldId: z.string().min(1), contentPackId: z.string().min(1), contentVersion: z.string().min(1), worldSeed: z.string().min(1), eventCursor: z.int().min(0), worldTime: worldTimeSchema, weatherId: z.string().min(1),
  locationStates: record, npcStates: record, factionStates: record, eventInstances: record, eventClocks: record, clues: record, lawStates: record, globalFlags: record, characters: z.record(z.string(), characterSchema),
});
export type WorldState = z.infer<typeof worldStateSchema>;
export const committedEventSchema = z.object({ schemaVersion: z.literal('0.1.0'), eventId: z.string().min(1), eventCursor: z.int().min(0), eventType: z.string().min(1), worldId: z.string().min(1), actorId: z.string().nullable(), worldTimeBefore: worldTimeSchema, worldTimeAfter: worldTimeSchema, randomEvidence: z.array(z.string()), factsAdded: z.array(z.string()), factsRemoved: z.array(z.string()), stateChanges: z.array(z.object({ path: z.string().min(1), from: z.unknown(), to: z.unknown() })), publicConsequences: z.array(z.string()), privateConsequences: z.array(z.string()) });
export type CommittedEvent = z.infer<typeof committedEventSchema>;
