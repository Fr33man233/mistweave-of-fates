import { z } from 'zod';
import { worldProposalSchema } from '../model/contracts';

export const cocAttributeNames = ['STR', 'CON', 'SIZ', 'DEX', 'APP', 'INT', 'POW', 'EDU'] as const;
export type CocAttributeName = (typeof cocAttributeNames)[number];

const stableId = z.string().trim().min(1).max(128).regex(/^[a-zA-Z0-9][a-zA-Z0-9_.:-]*$/);
const percentage = z.int().min(0).max(100);
const meter = z.object({ current: z.int().nonnegative(), max: z.int().positive() }).strict()
  .refine((value) => value.current <= value.max, 'resource current must not exceed max');

export const cocAttributesSchema = z.object({
  STR: percentage, CON: percentage, SIZ: percentage, DEX: percentage,
  APP: percentage, INT: percentage, POW: percentage, EDU: percentage,
}).strict();
export type CocAttributes = z.infer<typeof cocAttributesSchema>;

// 保留 nonbinary 仅用于解析已存在的 V0.4 快照；新建档案 UI 不再提供该选项。
export const cocGenderSchema = z.enum(['female', 'male', 'nonbinary']);
export type CocGender = z.infer<typeof cocGenderSchema>;

export const sanPollutionPresentationSchema = z.enum(['无污染', '轻度污染', '中度污染', '重度污染']);
export type SanPollutionPresentation = z.infer<typeof sanPollutionPresentationSchema>;

export const spiritualitySchema = meter.extend({
  sequenceBaseBonus: z.int().min(0),
  pathwayRankBonus: z.int().min(0),
  actingMilestoneBonus: z.int().min(0),
  modifier: z.int(),
}).strict();
export type Spirituality = z.infer<typeof spiritualitySchema>;

export const cocCharacterSchema = z.object({
  characterId: stableId,
  name: z.string().trim().min(1).max(80),
  gender: cocGenderSchema,
  occupationId: stableId,
  attributes: cocAttributesSchema,
  skills: z.record(stableId, percentage),
  hp: meter,
  san: meter.extend({ pollutionPresentation: sanPollutionPresentationSchema }).strict(),
  spirituality: spiritualitySchema,
  conditionIds: z.array(stableId).max(32),
  pathwayId: stableId.nullable(),
  actingPresentation: z.string().trim().min(1).max(128),
}).strict();
export type CocCharacter = z.infer<typeof cocCharacterSchema>;

export const v04SceneSchema = z.object({
  sceneId: stableId,
  sceneRevision: z.int().nonnegative(),
  locationId: stableId,
  visibleEntityIds: z.array(stableId).max(32),
  knownFactIds: z.array(stableId).max(64),
  dangerForeshadowing: z.array(z.string().trim().min(1).max(500)).max(16),
}).strict();
export type V04Scene = z.infer<typeof v04SceneSchema>;

export const v04EventSchema = z.object({
  eventId: stableId,
  cursor: z.int().nonnegative(),
  type: stableId,
  actorId: stableId.nullable(),
  visibleSummary: z.string().trim().min(1).max(2_000),
  abilityId: stableId.optional(),
  abilitySpiritualityCost: z.int().nonnegative().optional(),
  abilityEffective: z.boolean().optional(),
  abilityDiceModifier: z.int().min(-1).max(1).optional(),
  abilityInformationTier: z.int().min(0).max(3).optional(),
  abilityUnlockedActionIds: z.array(stableId).max(16).optional(),
}).strict();
export type V04Event = z.infer<typeof v04EventSchema>;

export const modelInteractionRecordSchema = z.object({
  requestId: stableId,
  purpose: z.enum(['keeper_interpret', 'keeper_narrate', 'world_propose']),
  model: stableId,
  promptVersion: stableId,
  contextHash: stableId,
  resultKind: z.enum(['execute', 'clarify', 'reject', 'narrative', 'error']),
  latencyMs: z.int().nonnegative(),
  usage: z.object({
    inputTokens: z.int().nonnegative(), cachedInputTokens: z.int().nonnegative(), outputTokens: z.int().nonnegative(), reasoningOutputTokens: z.int().nonnegative(), totalTokens: z.int().nonnegative(),
  }).strict(),
  errorCode: stableId.nullable(),
  eventIds: z.array(stableId).max(16),
}).strict();
export type ModelInteractionRecord = z.infer<typeof modelInteractionRecordSchema>;

const v04WorldBaseSchema = z.object({
  schemaVersion: z.literal('0.4.0'),
  worldId: stableId,
  worldSeed: z.string().trim().min(1).max(256),
  contentPackId: stableId,
  rulesetVersion: z.literal('coc7-v04'),
  eventCursor: z.int().nonnegative(),
  characters: z.array(cocCharacterSchema).max(3),
  activeCharacterId: stableId.nullable(),
  worldProposals: z.array(worldProposalSchema).max(4),
  scene: v04SceneSchema,
  events: z.array(v04EventSchema).max(512),
  modelInteractions: z.array(modelInteractionRecordSchema).max(128),
}).strict();

/**
 * V0.4 initially shipped a single `character` field. Keep old local snapshots
 * readable while making the three-slot model canonical for all new writes.
 */
export const v04WorldSchema = z.preprocess((value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
  const candidate = value as Record<string, unknown>;
  if ('characters' in candidate) return 'worldProposals' in candidate ? candidate : { ...candidate, worldProposals: [] };
  if (!('character' in candidate)) return candidate;
  const legacyCharacter = candidate.character;
  const { character: _ignored, ...rest } = candidate;
  const characters = legacyCharacter && typeof legacyCharacter === 'object' ? [legacyCharacter] : [];
  const activeCharacterId = legacyCharacter && typeof legacyCharacter === 'object' && typeof (legacyCharacter as { characterId?: unknown }).characterId === 'string'
    ? (legacyCharacter as { characterId: string }).characterId
    : null;
  return { ...rest, characters, activeCharacterId, worldProposals: [] };
}, v04WorldBaseSchema);
export type V04World = z.infer<typeof v04WorldSchema>;

export const v04SavePayloadSchema = z.object({
  schemaVersion: z.literal('0.4.0'),
  world: v04WorldSchema,
}).strict();
export type V04SavePayload = z.infer<typeof v04SavePayloadSchema>;
