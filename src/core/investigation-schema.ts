import { z } from 'zod';

export const factSchema = z.object({
  factId: z.string().min(1), visibility: z.enum(['hidden', 'observed', 'confirmed']), sourceEventId: z.string().min(1).nullable(),
});
export const clueSourceSchema = z.object({
  sourceId: z.string().min(1), factIds: z.array(z.string().min(1)).min(1), methods: z.array(z.string().min(1)).min(1), prerequisiteFactIds: z.array(z.string().min(1)), recoverySourceIds: z.array(z.string().min(1)),
});
export const endingPredicateSchema = z.object({
  endingId: z.string().min(1), requiredFactIds: z.array(z.string().min(1)), forbiddenFactIds: z.array(z.string().min(1)).default([]), requiredFlags: z.array(z.string().min(1)).default([]),
});
export const grammarMethodSchema = z.object({
  methodId: z.string().min(1), label: z.string().min(1), targetType: z.string().min(1), sourceIds: z.array(z.string().min(1)).min(1), difficulty: z.int().min(1).max(100), minutes: z.int().min(0), cost: z.record(z.string(), z.number()),
});
export const caseGrammarSchema = z.object({ grammarId: z.string().min(1), methods: z.array(grammarMethodSchema).min(3) });
export const occupationLensSchema = z.object({ occupationId: z.string().min(1), allowedSourceIds: z.array(z.string().min(1)).min(1), preferredMethodIds: z.array(z.string().min(1)), costModifiers: z.record(z.string(), z.number()) });
export const pathwayLensSchema = z.object({ pathwayId: z.enum(['observer', 'hound']), methodModifiers: z.record(z.string(), z.number()), costModifiers: z.record(z.string(), z.number()) });
export const caseCoreSchema = z.object({
  caseId: z.string().min(1), version: z.literal('0.3.0'), truthVariantIds: z.array(z.string().min(1)).min(1), facts: z.array(factSchema).min(2), sources: z.array(clueSourceSchema).min(2), grammar: caseGrammarSchema, endings: z.array(endingPredicateSchema).min(3), occupationLenses: z.array(occupationLensSchema).min(4), pathwayLenses: z.array(pathwayLensSchema).length(2),
});
export const investigationInstanceSchema = z.object({
  instanceId: z.string().min(1), caseId: z.string().min(1), truthVariantId: z.string().min(1), seed: z.string().min(1), stage: z.enum(['available', 'investigating', 'resolved', 'ended']), factStates: z.record(z.string(), z.enum(['unknown', 'observed', 'confirmed'])), sourceStates: z.record(z.string(), z.enum(['available', 'used', 'exhausted'])), actionResultKeys: z.array(z.string()), flags: z.array(z.string()),
});
export type Fact = z.infer<typeof factSchema>;
export type ClueSource = z.infer<typeof clueSourceSchema>;
export type EndingPredicate = z.infer<typeof endingPredicateSchema>;
export type CaseGrammar = z.infer<typeof caseGrammarSchema>;
export type CaseCore = z.infer<typeof caseCoreSchema>;
export type InvestigationInstance = z.infer<typeof investigationInstanceSchema>;
