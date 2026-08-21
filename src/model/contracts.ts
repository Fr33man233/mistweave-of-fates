import { z } from 'zod';

const stableId = z.string().trim().min(1).max(128).regex(/^[a-zA-Z0-9][a-zA-Z0-9_.:-]*$/);
const shortText = z.string().trim().min(1).max(2_000);
const summaryText = z.string().trim().min(1).max(4_000);

export const modelPurposeSchema = z.enum(['keeper_interpret', 'keeper_narrate', 'world_propose']);
export type ModelPurpose = z.infer<typeof modelPurposeSchema>;

export const allowedActionCatalogSchema = z.object({
  targetIds: z.array(stableId).max(64),
  methodIds: z.array(stableId).max(64),
  skillIds: z.array(stableId).max(64),
  abilityIds: z.array(stableId).max(32),
  riskIds: z.array(stableId).max(32),
}).strict();

export const modelContextEnvelopeSchema = z.object({
  schemaVersion: z.literal('0.4.0'),
  requestId: stableId,
  worldId: stableId,
  sceneId: stableId,
  sceneRevision: z.int().nonnegative(),
  purpose: modelPurposeSchema,
  playerVisibleContext: z.object({
    location: summaryText,
    time: shortText,
    visibleEntities: z.array(shortText).max(32),
    knownFactIds: z.array(stableId).max(64),
    dangerForeshadowing: z.array(shortText).max(16),
  }).strict(),
  characterProjection: z.object({
    characterId: stableId,
    name: z.string().trim().min(1).max(80),
    occupationId: stableId,
    relevantSkills: z.record(stableId, z.int().min(0).max(100)),
    hp: z.object({ current: z.int().nonnegative(), max: z.int().positive() }).strict(),
    san: z.object({ current: z.int().nonnegative(), max: z.int().positive(), presentation: shortText }).strict(),
    spirituality: z.object({ current: z.int().nonnegative(), max: z.int().positive() }).strict(),
    conditionIds: z.array(stableId).max(32),
    unlockedAbilityIds: z.array(stableId).max(32),
  }).strict(),
  allowedActionCatalog: allowedActionCatalogSchema,
  conversationWindow: z.array(z.object({ role: z.enum(['player', 'npc', 'keeper']), text: shortText }).strict()).max(16),
  conversationSummary: z.string().trim().max(4_000),
  contentPackId: stableId,
  rulesetVersion: stableId,
  promptVersion: stableId,
}).strict();
export type ModelContextEnvelope = z.infer<typeof modelContextEnvelopeSchema>;

const executeInterpretationSchema = z.object({
  kind: z.literal('execute'),
  targetId: stableId,
  methodId: stableId,
  skillId: stableId,
  abilityId: stableId.optional(),
  proposedDifficulty: z.enum(['regular', 'hard', 'extreme']),
  riskIds: z.array(stableId).max(16),
  rationale: shortText,
}).strict();

const clarifyInterpretationSchema = z.object({
  kind: z.literal('clarify'),
  question: shortText,
  allowedAnswerHints: z.array(shortText).max(8),
}).strict();

const rejectInterpretationSchema = z.object({
  kind: z.literal('reject'),
  reasonCode: stableId,
  explanation: shortText,
  suggestedAlternatives: z.array(shortText).max(8),
}).strict();

export const keeperInterpretationSchema = z.discriminatedUnion('kind', [
  executeInterpretationSchema,
  clarifyInterpretationSchema,
  rejectInterpretationSchema,
]);
export type KeeperInterpretation = z.infer<typeof keeperInterpretationSchema>;

export const keeperInterpretRequestSchema = z.object({
  context: modelContextEnvelopeSchema.refine((value) => value.purpose === 'keeper_interpret', 'purpose must be keeper_interpret'),
  playerText: z.string().trim().min(1).max(2_000),
}).strict();
export type KeeperInterpretRequest = z.infer<typeof keeperInterpretRequestSchema>;

export const resolutionEnvelopeSchema = z.object({
  schemaVersion: z.literal('0.4.0'),
  requestId: stableId,
  eventIds: z.array(stableId).min(1).max(16),
  actionId: stableId,
  targetId: stableId,
  methodId: stableId,
  skillId: stableId,
  difficulty: z.enum(['regular', 'hard', 'extreme']),
  roll: z.int().min(1).max(100),
  successLevel: z.enum(['critical', 'extreme', 'hard', 'regular', 'failure', 'fumble']),
  visibleChanges: z.array(shortText).max(32),
  visibleFactIds: z.array(stableId).max(32),
  nextActionIds: z.array(stableId).max(32),
  abilityId: stableId.optional(),
  abilitySpiritualityCost: z.int().nonnegative().optional(),
  abilityEffective: z.boolean().optional(),
  abilityDiceModifier: z.int().min(-1).max(1).optional(),
  abilityInformationTier: z.int().min(0).max(3).optional(),
  abilityUnlockedActionIds: z.array(stableId).max(16).optional(),
  abilityExplanation: shortText.optional(),
}).strict();
export type ResolutionEnvelope = z.infer<typeof resolutionEnvelopeSchema>;

export const keeperNarrateRequestSchema = z.object({
  context: modelContextEnvelopeSchema.refine((value) => value.purpose === 'keeper_narrate', 'purpose must be keeper_narrate'),
  resolution: resolutionEnvelopeSchema,
}).strict();
export type KeeperNarrateRequest = z.infer<typeof keeperNarrateRequestSchema>;

export const keeperNarrativeSchema = z.object({
  narrative: z.string().trim().min(1).max(4_000),
  npcReactions: z.array(shortText).max(8),
}).strict();
export type KeeperNarrative = z.infer<typeof keeperNarrativeSchema>;

export const worldProposalSchema = z.object({
  proposalId: stableId,
  templateId: stableId,
  subjectIds: z.array(stableId).min(1).max(16),
  triggerId: stableId,
  proposedParameters: z.record(stableId, z.union([z.string().max(256), z.number(), z.boolean()])),
  visibleForeshadowing: shortText,
  expiresAtCheckpoint: z.int().nonnegative(),
}).strict();
export type WorldProposal = z.infer<typeof worldProposalSchema>;

export const worldProposeRequestSchema = z.object({
  context: modelContextEnvelopeSchema.refine((value) => value.purpose === 'world_propose', 'purpose must be world_propose'),
  checkpointId: stableId,
  allowedTemplateIds: z.array(stableId).min(1).max(32),
}).strict();
export type WorldProposeRequest = z.infer<typeof worldProposeRequestSchema>;

export const worldProposalListSchema = z.object({ proposals: z.array(worldProposalSchema).max(4) }).strict();

export type ModelUsage = {
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
  reasoningOutputTokens: number;
  totalTokens: number;
};

export const modelGatewaySuccessSchema = z.object({
  requestId: stableId,
  model: stableId,
  promptVersion: stableId,
  purpose: modelPurposeSchema,
  candidate: z.unknown(),
  usage: z.object({
    inputTokens: z.int().nonnegative(),
    cachedInputTokens: z.int().nonnegative(),
    outputTokens: z.int().nonnegative(),
    reasoningOutputTokens: z.int().nonnegative(),
    totalTokens: z.int().nonnegative(),
  }).strict(),
  latencyMs: z.int().nonnegative(),
}).strict();

export const modelGatewayErrorSchema = z.object({
  error: z.object({
    code: stableId,
    message: z.string().min(1).max(256),
    retryable: z.boolean(),
  }).strict(),
}).strict();
