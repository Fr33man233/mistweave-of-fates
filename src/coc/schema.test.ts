import { describe, expect, it } from 'vitest';
import { cocCharacterSchema, modelInteractionRecordSchema, v04WorldSchema } from './schema';

const character = {
  characterId: 'char-1', name: '林岚', gender: 'female', occupationId: 'reporter',
  attributes: { STR: 45, CON: 50, SIZ: 55, DEX: 60, APP: 50, INT: 70, POW: 65, EDU: 75 },
  skills: { spot_hidden: 55 }, hp: { current: 10, max: 10 },
  san: { current: 55, max: 65, pollutionPresentation: '轻度污染' },
  spirituality: { current: 13, max: 13, sequenceBaseBonus: 0, pathwayRankBonus: 0, actingMilestoneBonus: 0, modifier: 0 },
  conditionIds: [], pathwayId: null, actingPresentation: '扮演进度：尚未开始（无失控）',
};

describe('V0.4 COC schema', () => {
  it('requires a selected gender and rejects legacy unspecified', () => {
    expect(cocCharacterSchema.safeParse(character).success).toBe(true);
    expect(cocCharacterSchema.safeParse({ ...character, gender: 'unspecified' }).success).toBe(false);
    expect(cocCharacterSchema.safeParse({ ...character, gender: 'nonbinary' }).success).toBe(true);
  });

  it('rejects future schema versions and invalid resource bounds', () => {
    expect(v04WorldSchema.safeParse({ schemaVersion: '0.5.0' }).success).toBe(false);
    expect(cocCharacterSchema.safeParse({ ...character, hp: { current: 11, max: 10 } }).success).toBe(false);
  });

  it('stores only bounded model metadata and rejects raw prompt fields', () => {
    const record = { requestId: 'req-1', purpose: 'keeper_interpret', model: 'local-deterministic', promptVersion: 'v04-ui-local-preview', contextHash: 'fnv1a-abc', resultKind: 'execute', latencyMs: 0, usage: { inputTokens: 0, cachedInputTokens: 0, outputTokens: 0, reasoningOutputTokens: 0, totalTokens: 0 }, errorCode: null, eventIds: [] };
    expect(modelInteractionRecordSchema.safeParse(record).success).toBe(true);
    expect(modelInteractionRecordSchema.safeParse({ ...record, playerText: '原始自由行动' }).success).toBe(false);
  });

  it('migrates the original single-character V0.4 snapshot into the three-slot shape', () => {
    const legacy = { schemaVersion: '0.4.0', worldId: 'legacy-world', worldSeed: 'legacy-seed', contentPackId: 'parallel-tingen-v04', rulesetVersion: 'coc7-v04', eventCursor: 1, character, scene: { sceneId: 'tingen-arrival', sceneRevision: 0, locationId: 'tingen-riverside', visibleEntityIds: [], knownFactIds: [], dangerForeshadowing: [] }, events: [], modelInteractions: [] };
    const parsed = v04WorldSchema.parse(legacy);
    expect(parsed.characters).toEqual([character]);
    expect(parsed.activeCharacterId).toBe('char-1');
    expect('character' in parsed).toBe(false);
  });
});
