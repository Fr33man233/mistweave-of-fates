import { z } from 'zod';

const id = z.string().trim().min(1).max(128);
const sourceSchema = z.object({ sourceId: id, label: z.string().trim().min(1), factIds: z.array(id).min(1), methods: z.array(id).min(1), recoverySourceIds: z.array(id) }).strict();
const factSchema = z.object({ factId: id, summary: z.string().trim().min(1), visibility: z.enum(['hidden', 'visible']), truthLocked: z.literal(true) }).strict();
const methodSchema = z.object({ methodId: id, label: z.string().trim().min(1), category: z.enum(['observation', 'social', 'occupation', 'trade']), targetType: id, minutes: z.int().positive(), difficulty: z.enum(['regular', 'hard', 'extreme']), costIds: z.array(id) }).strict();
const endingSchema = z.object({ endingId: id, label: z.string().trim().min(1), requiredFactIds: z.array(id).min(1), requiredFlags: z.array(id), costIds: z.array(id) }).strict();
const occupationLensSchema = z.object({ occupationId: id, allowedSourceIds: z.array(id).min(1), preferredMethodIds: z.array(id).min(1), costModifiers: z.record(id, z.number()) }).strict();
const pathwayLensSchema = z.object({ pathwayId: id, methodModifiers: z.record(id, z.number()), informationTiers: z.record(id, z.int().min(0).max(3)) }).strict();

export const parallelCaseCoreSchema = z.object({
  caseId: id, version: z.literal('0.4.0'), locationIds: z.array(id).min(1), npcIds: z.array(id).min(2).max(4),
  truthVariantIds: z.array(id).min(1), facts: z.array(factSchema).min(3), sources: z.array(sourceSchema).min(4),
  methods: z.array(methodSchema).min(3), endings: z.array(endingSchema).min(3), occupationLenses: z.array(occupationLensSchema).length(4), pathwayLenses: z.array(pathwayLensSchema).length(4),
}).strict();
export type ParallelCaseCore = z.infer<typeof parallelCaseCoreSchema>;

export const investigationInstanceSchema = z.object({
  instanceId: id, caseId: id, truthVariantId: id, seed: z.string().min(1), stage: z.enum(['available', 'investigating', 'resolved', 'ended']),
  factStates: z.record(id, z.enum(['unknown', 'visible', 'confirmed'])), sourceStates: z.record(id, z.enum(['available', 'used', 'exhausted'])), flags: z.array(id), actionResultKeys: z.array(id),
}).strict();
export type InvestigationInstance = z.infer<typeof investigationInstanceSchema>;

export function validateParallelCase(candidate: unknown): ParallelCaseCore {
  const parsed = parallelCaseCoreSchema.parse(candidate);
  const unique = (values: string[], label: string) => { if (new Set(values).size !== values.length) throw new Error(`duplicate ${label}`); };
  unique(parsed.facts.map((item) => item.factId), 'fact');
  unique(parsed.sources.map((item) => item.sourceId), 'source');
  unique(parsed.methods.map((item) => item.methodId), 'method');
  unique(parsed.endings.map((item) => item.endingId), 'ending');
  const facts = new Set(parsed.facts.map((item) => item.factId));
  const sources = new Set(parsed.sources.map((item) => item.sourceId));
  const methods = new Set(parsed.methods.map((item) => item.methodId));
  for (const source of parsed.sources) {
    if (source.factIds.some((factId) => !facts.has(factId)) || source.recoverySourceIds.some((sourceId) => !sources.has(sourceId))) throw new Error('dangling source reference');
  }
  for (const method of parsed.methods) if (method.costIds.length > 4) throw new Error('method cost exceeds bounded contract');
  for (const ending of parsed.endings) if (ending.requiredFactIds.some((factId) => !facts.has(factId))) throw new Error('dangling ending fact reference');
  for (const lens of parsed.occupationLenses) if (lens.allowedSourceIds.some((sourceId) => !sources.has(sourceId)) || lens.preferredMethodIds.some((methodId) => !methods.has(methodId))) throw new Error('dangling occupation lens reference');
  for (const lens of parsed.pathwayLenses) if (Object.keys(lens.methodModifiers).some((methodId) => !methods.has(methodId))) throw new Error('dangling pathway lens reference');
  for (const fact of parsed.facts) if (parsed.sources.filter((source) => source.factIds.includes(fact.factId)).length < 2) throw new Error(`fact ${fact.factId} needs two sources`);
  return parsed;
}

export function createInvestigationInstance(core: ParallelCaseCore, seed: string): InvestigationInstance {
  let hash = 2166136261;
  for (const char of seed) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0;
  const truthVariantId = core.truthVariantIds[hash % core.truthVariantIds.length]!;
  return investigationInstanceSchema.parse({
    instanceId: `${core.caseId}:${seed}`, caseId: core.caseId, truthVariantId, seed, stage: 'available',
    factStates: Object.fromEntries(core.facts.map((fact) => [fact.factId, 'unknown'])),
    sourceStates: Object.fromEntries(core.sources.map((source) => [source.sourceId, 'available'])), flags: [], actionResultKeys: [],
  });
}
