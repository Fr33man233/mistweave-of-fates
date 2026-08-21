import { openDB } from 'idb';
import { z } from 'zod';
import { actionIds, captureCharacterSession, createGame, pathwayIds, recordMeaningfulEvent, syncActiveCharacterSession, type Game, type PathwayId, type PathwayTrack } from '../core/game';
import { committedEventSchema, profileSchema, worldStateSchema } from '../core/schema';

let dbPromise: ReturnType<typeof openDB> | undefined;

const preparationSchema = z.object({
  approach: z.enum(['safe', 'risky']),
  materialId: z.enum(['stabilized_aether_salts', 'unlicensed_mist_distillate']),
  quality: z.union([z.literal(2), z.literal(3)]),
});
const ascensionRecordSchema = z.object({
  pathway: z.enum(pathwayIds),
  roll: z.int().min(1).max(100),
  preparationQuality: z.int().min(0),
  outcome: z.enum(['success', 'costly_success', 'failure', 'catastrophic_failure']),
});
const pathwayTrackSchema = z.object({
  state: z.enum(['hidden', 'hinted', 'trusted', 'prepared', 'restricted', 'ascended']),
  hintOrder: z.union([z.literal(1), z.literal(2), z.null()]),
  preparation: preparationSchema.nullable(),
  ascension: ascensionRecordSchema.nullable(),
});
const abilityUseSchema = z.object({
  pathway: z.enum(pathwayIds),
  abilityId: z.enum(['trace_sense', 'danger_trail']),
  charge: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  roll: z.int().min(1).max(100),
  target: z.int().min(0).max(100),
  pressureRoll: z.int().min(1).max(100),
  outcome: z.enum(['success', 'failure']),
  pressure: z.enum(['none', 'pollution', 'injury', 'sanity']),
});
const caseStateSchema = z.object({
  stage: z.enum(['available', 'approach', 'resolved']),
  approach: z.enum(['safe', 'risky']).optional(),
});
const actionResultSchema = z.object({
  requestId: z.string().min(1), payloadHash: z.string().min(1), resultCode: z.string().min(1), message: z.string(), eventCursors: z.array(z.int().min(0)), factsAdded: z.array(z.string()), nextActions: z.array(z.string()),
});
const materialSchema = z.object({ materialId: z.enum(['stabilized_aether_salts', 'unlicensed_mist_distillate']), pathway: z.enum(pathwayIds), sourceActionId: z.string().min(1), cost: z.number().nonnegative(), risk: z.enum(['low', 'high']), consumed: z.boolean() });
const characterSessionSchema = z.object({
  clues: z.record(z.string(), z.unknown()),
  availableActions: z.array(z.enum(actionIds)),
  caseStates: z.object({
    event_misdelivered_medical_case: caseStateSchema,
    event_sealed_warehouse_ledger: caseStateSchema,
    event_night_whistle: caseStateSchema,
  }),
  legalAttention: z.int().min(0),
  meaningfulEventCount: z.int().min(0),
  recordedEventCursor: z.int().min(0),
  pathwayTracks: z.object({ observer: pathwayTrackSchema, hound: pathwayTrackSchema }),
  abilityUses: z.array(abilityUseSchema),
  actionResults: z.record(z.string(), actionResultSchema),
  materials: z.array(materialSchema),
  conflictedPathways: z.array(z.enum(pathwayIds)),
  recoveryState: z.enum(['normal', 'incapacitated', 'broken']),
});
const savedGameSchema = z.object({
  state: worldStateSchema,
  profile: profileSchema.optional(),
  log: z.array(committedEventSchema),
  availableActions: z.array(z.enum(actionIds)),
  caseStates: z.object({
    event_misdelivered_medical_case: caseStateSchema,
    event_sealed_warehouse_ledger: caseStateSchema,
    event_night_whistle: caseStateSchema,
  }),
  legalAttention: z.int().min(0),
  meaningfulEventCount: z.int().min(0).optional(),
  recordedEventCursor: z.int().min(0).optional(),
  pathwayTracks: z.object({ observer: pathwayTrackSchema, hound: pathwayTrackSchema }).optional(),
  abilityUses: z.array(abilityUseSchema).optional(),
  actionResults: z.record(z.string(), actionResultSchema).optional(),
  materials: z.array(materialSchema).optional(),
  conflictedPathways: z.array(z.enum(pathwayIds)).optional(),
  recoveryState: z.enum(['normal', 'incapacitated', 'broken']).optional(),
  characterSessions: z.record(z.string(), characterSessionSchema).optional(),
});
const saveEnvelopeSchema = z.object({
  schemaVersion: z.literal('0.3.0'),
  current: z.unknown(),
  previous: z.unknown().nullable(),
  savedAt: z.number().int().nonnegative(),
  integrity: z.string().min(1),
});

function database() {
  if (!globalThis.indexedDB) return undefined;
  return (dbPromise ??= openDB('veilport-v01', 1, {
    upgrade(db) { db.createObjectStore('run'); },
  }));
}

function withLegacyCharacterIntent(value: unknown): unknown {
  if (typeof value !== 'object' || value === null) return value;
  const game = value as Record<string, unknown>;
  if (typeof game.state !== 'object' || game.state === null) return value;
  const state = game.state as Record<string, unknown>;
  if (typeof state.characters !== 'object' || state.characters === null) return value;
  const characters = state.characters as Record<string, unknown>;
  const migratedCharacters = Object.fromEntries(Object.entries(characters).map(([id, candidate]) => {
    if (typeof candidate !== 'object' || candidate === null) return [id, candidate];
    const entry = candidate as Record<string, unknown>;
    return [id, {
      ...entry,
      initialIntent: typeof entry.initialIntent === 'string' && entry.initialIntent.trim() ? entry.initialIntent : '延续旧存档的调查',
      name: typeof entry.name === 'string' && entry.name.trim() ? entry.name : `旧档调查员 ${id}`,
      gender: typeof entry.gender === 'string' ? entry.gender : 'unspecified',
    }];
  }));
  const profile = game.profile;
  const migratedProfile = typeof profile === 'object' && profile !== null
    ? { ...profile, characters: Array.isArray((profile as Record<string, unknown>).characters)
      ? ((profile as Record<string, unknown>).characters as unknown[]).map((candidate) => {
        if (typeof candidate !== 'object' || candidate === null) return candidate;
        const entry = candidate as Record<string, unknown>;
        return { ...entry, name: typeof entry.name === 'string' && entry.name.trim() ? entry.name : `旧档调查员 ${entry.characterId ?? ''}`, gender: typeof entry.gender === 'string' ? entry.gender : 'unspecified' };
      }) : (profile as Record<string, unknown>).characters }
    : profile;
  return { ...game, profile: migratedProfile, state: { ...state, characters: migratedCharacters } };
}

function checksum(value: unknown): string {
  const text = JSON.stringify(value);
  let hash = 2166136261;
  for (const char of text) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0;
  return `fnv1a:${hash.toString(16)}`;
}

function unwrapStored(value: unknown): { current: unknown; previous: unknown | null } {
  const envelope = saveEnvelopeSchema.safeParse(value);
  return envelope.success ? { current: envelope.data.current, previous: envelope.data.previous } : { current: value, previous: null };
}

function trackIsConsistent(pathway: PathwayId, track: PathwayTrack): boolean {
  if (track.ascension && track.ascension.pathway !== pathway) return false;
  if (track.state === 'hidden' || track.state === 'hinted' || track.state === 'trusted') {
    return track.preparation === null && track.ascension === null;
  }
  if (track.state === 'prepared' || track.state === 'restricted') {
    return track.preparation !== null
      && (track.ascension === null
        || track.ascension.outcome === 'failure'
        || track.ascension.outcome === 'catastrophic_failure');
  }
  return track.preparation !== null
    && track.ascension !== null
    && (track.ascension.outcome === 'success' || track.ascension.outcome === 'costly_success');
}

function gameIsConsistent(game: Game): boolean {
  if (game.recordedEventCursor > game.state.eventCursor) return false;
  const activeCharacters = game.profile.characters.filter((character) => character.status === 'active');
  if (game.profile.activeCharacterId === null) {
    if (activeCharacters.length !== 0) return false;
  } else if (activeCharacters.length !== 1 || activeCharacters[0]?.characterId !== game.profile.activeCharacterId) {
    return false;
  }
  if (game.profile.deceasedIds.some((id) =>
    game.profile.characters.find((character) => character.characterId === id)?.status !== 'deceased')) return false;
  if (game.profile.characters.some((character) =>
    character.status === 'deceased' && !game.profile.deceasedIds.includes(character.characterId))) return false;
  if (!trackIsConsistent('observer', game.pathwayTracks.observer)
    || !trackIsConsistent('hound', game.pathwayTracks.hound)) return false;
  if (game.profile.characters.some((character) =>
    character.pathwayState !== null
    && game.pathwayTracks[character.pathwayState as PathwayId]?.state !== 'ascended')) return false;
  return (['observer', 'hound'] as const).every((pathway) =>
    game.pathwayTracks[pathway].state !== 'ascended'
    || game.profile.characters.some((character) => character.pathwayState === pathway));
}

export function normalizeSavedGame(value: unknown): Game | undefined {
  const parsed = savedGameSchema.safeParse(withLegacyCharacterIntent(value));
  if (!parsed.success) return undefined;
  const saved = parsed.data;
  const defaults = createGame(saved.state.worldSeed);
  const resolvedCaseCount = Object.values(saved.caseStates).filter((caseState) => caseState.stage === 'resolved').length;
  let normalized: Game = {
    ...defaults,
    ...saved,
    profile: saved.profile ?? defaults.profile,
    meaningfulEventCount: saved.meaningfulEventCount ?? resolvedCaseCount,
    recordedEventCursor: saved.recordedEventCursor ?? saved.state.eventCursor,
    pathwayTracks: saved.pathwayTracks ?? defaults.pathwayTracks,
    abilityUses: saved.abilityUses ?? defaults.abilityUses,
    actionResults: saved.actionResults ?? defaults.actionResults,
    materials: saved.materials ?? defaults.materials,
    conflictedPathways: saved.conflictedPathways ?? defaults.conflictedPathways,
    recoveryState: saved.recoveryState ?? defaults.recoveryState,
    characterSessions: saved.characterSessions ?? defaults.characterSessions,
  };
  const active = normalized.profile.activeCharacterId;
  if (active && !normalized.characterSessions[active]) {
    normalized = { ...normalized, characterSessions: { ...normalized.characterSessions, [active]: captureCharacterSession(normalized) } };
  }
  if (!saved.pathwayTracks && normalized.meaningfulEventCount >= 3) {
    if (normalized.state.eventCursor === 0) return undefined;
    normalized = recordMeaningfulEvent({
      ...normalized,
      meaningfulEventCount: 2,
      recordedEventCursor: normalized.state.eventCursor - 1,
    });
  }
  const lastAscensionCursor = normalized.log.filter((event) => event.eventType === 'ascension_attempted').at(-1)?.eventCursor ?? -1;
  const hasPostAscensionAbilityEvent = normalized.log.some((event) => event.eventType === 'ability_applied_to_investigation' && event.eventCursor > lastAscensionCursor);
  if (normalized.profile.characters.some((character) => character.pathwayState !== null) && !hasPostAscensionAbilityEvent && normalized.caseStates.event_night_whistle.stage === 'resolved') {
    normalized = {
      ...normalized,
      caseStates: { ...normalized.caseStates, event_night_whistle: { stage: 'available' } },
      availableActions: normalized.availableActions.includes('event_night_whistle') ? normalized.availableActions : [...normalized.availableActions, 'event_night_whistle'],
    };
  }
  return gameIsConsistent(normalized) ? normalized : undefined;
}

export async function saveGame(game: Game) {
  const db = database();
  if (!db) return;
  const opened = await db;
  const tx = opened.transaction('run', 'readwrite');
  const previousRecord = await tx.store.get('current');
  const previous = unwrapStored(previousRecord).current;
  const current = syncActiveCharacterSession(game);
  const envelope = { schemaVersion: '0.3.0' as const, current, previous: previousRecord ? previous : null, savedAt: Date.now(), integrity: checksum(current) };
  await tx.store.put(envelope, 'current');
  await tx.done;
}

export async function loadGame(): Promise<Game | undefined> {
  const db = database();
  if (!db) return undefined;
  const stored = await (await db).get('run', 'current');
  const envelope = saveEnvelopeSchema.safeParse(stored);
  if (!envelope.success) return normalizeSavedGame(stored);
  if (checksum(envelope.data.current) === envelope.data.integrity) {
    const current = normalizeSavedGame(envelope.data.current);
    if (current) return current;
  }
  if (envelope.data.previous !== null) return normalizeSavedGame(envelope.data.previous);
  return undefined;
}

export async function clearGame() {
  const db = database();
  if (db) await (await db).delete('run', 'current');
}
