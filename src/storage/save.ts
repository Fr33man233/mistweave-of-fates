import { openDB } from 'idb';
import { z } from 'zod';
import { actionIds, createGame, pathwayIds, recordMeaningfulEvent, type Game, type PathwayId, type PathwayTrack } from '../core/game';
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
  state: z.enum(['hidden', 'hinted', 'trusted', 'prepared', 'ascended']),
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
    if (typeof candidate !== 'object' || candidate === null || 'initialIntent' in candidate) return [id, candidate];
    return [id, { ...candidate, initialIntent: '延续旧存档的调查' }];
  }));
  return { ...game, state: { ...state, characters: migratedCharacters } };
}

function trackIsConsistent(pathway: PathwayId, track: PathwayTrack): boolean {
  if (track.ascension && track.ascension.pathway !== pathway) return false;
  if (track.state === 'hidden' || track.state === 'hinted' || track.state === 'trusted') {
    return track.preparation === null && track.ascension === null;
  }
  if (track.state === 'prepared') {
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
  };
  if (!saved.pathwayTracks && normalized.meaningfulEventCount >= 3) {
    if (normalized.state.eventCursor === 0) return undefined;
    normalized = recordMeaningfulEvent({
      ...normalized,
      meaningfulEventCount: 2,
      recordedEventCursor: normalized.state.eventCursor - 1,
    });
  }
  return gameIsConsistent(normalized) ? normalized : undefined;
}

export async function saveGame(game: Game) {
  const db = database();
  if (db) await (await db).put('run', game, 'current');
}

export async function loadGame(): Promise<Game | undefined> {
  const db = database();
  if (!db) return undefined;
  return normalizeSavedGame(await (await db).get('run', 'current'));
}

export async function clearGame() {
  const db = database();
  if (db) await (await db).delete('run', 'current');
}
