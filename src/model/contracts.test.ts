import { describe, expect, it } from 'vitest';
import {
  keeperInterpretRequestSchema,
  keeperInterpretationSchema,
  modelContextEnvelopeSchema,
  worldProposalSchema,
  type ModelContextEnvelope,
} from './contracts';

export function modelContext(purpose: ModelContextEnvelope['purpose'] = 'keeper_interpret'): ModelContextEnvelope {
  return {
    schemaVersion: '0.4.0',
    requestId: 'request-001',
    worldId: 'world-tingen-001',
    sceneId: 'scene-north-street',
    sceneRevision: 0,
    purpose,
    playerVisibleContext: {
      location: '廷根北区的一条旧街，只包含玩家当前可见信息。',
      time: '第一日 18:00',
      visibleEntities: ['一扇半开的仓门', '神色紧张的搬运工'],
      knownFactIds: ['fact-door-open'],
      dangerForeshadowing: ['空气里有轻微刺鼻气味'],
    },
    characterProjection: {
      characterId: 'character-001',
      name: '测试调查员',
      occupationId: 'reporter',
      relevantSkills: { spot_hidden: 55, psychology: 40 },
      hp: { current: 10, max: 10 },
      san: { current: 60, max: 70, presentation: 'SAN：60/70（无明显污染）' },
      spirituality: { current: 10, max: 10 },
      conditionIds: [],
      unlockedAbilityIds: [],
    },
    allowedActionCatalog: {
      targetIds: ['target-warehouse-door', 'npc-dockworker'],
      methodIds: ['method-observe', 'method-interview'],
      skillIds: ['spot_hidden', 'psychology'],
      abilityIds: [],
      riskIds: ['risk-noticed'],
    },
    conversationWindow: [],
    conversationSummary: '',
    contentPackId: 'parallel-tingen-v04',
    rulesetVersion: 'coc7-v04',
    promptVersion: 'keeper-v1',
  };
}

describe('model contracts', () => {
  it('accepts the minimum visible context and a legal execute candidate', () => {
    expect(modelContextEnvelopeSchema.parse(modelContext())).toBeDefined();
    expect(keeperInterpretRequestSchema.parse({ context: modelContext(), playerText: '我观察仓门的锁和地面痕迹。' })).toBeDefined();
    expect(keeperInterpretationSchema.parse({
      kind: 'execute',
      targetId: 'target-warehouse-door',
      methodId: 'method-observe',
      skillId: 'spot_hidden',
      proposedDifficulty: 'regular',
      riskIds: [],
      rationale: '玩家正在检查当前可见目标。',
    })).toBeDefined();
  });

  it('rejects hidden state, unknown output fields and wrong endpoint purposes', () => {
    expect(modelContextEnvelopeSchema.safeParse({ ...modelContext(), hiddenTruth: 'forbidden' }).success).toBe(false);
    expect(keeperInterpretationSchema.safeParse({
      kind: 'execute', targetId: 'target-warehouse-door', methodId: 'method-observe', skillId: 'spot_hidden',
      proposedDifficulty: 'regular', riskIds: [], rationale: '合法候选', stateChanges: [{ hp: 0 }],
    }).success).toBe(false);
    expect(keeperInterpretRequestSchema.safeParse({ context: modelContext('world_propose'), playerText: '观察仓门' }).success).toBe(false);
  });

  it('rejects a world proposal with unbounded or executable data', () => {
    expect(worldProposalSchema.safeParse({
      proposalId: 'proposal-001', templateId: 'rumor-spreads', subjectIds: ['npc-dockworker'], triggerId: 'checkpoint-001',
      proposedParameters: { intensity: 2 }, visibleForeshadowing: '码头上开始流传新的说法。', expiresAtCheckpoint: 2,
      script: 'rm -rf /',
    }).success).toBe(false);
  });
});
