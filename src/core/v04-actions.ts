import type { KeeperInterpretation, ModelContextEnvelope, ResolutionEnvelope } from '../model/contracts';
import type { SeerAbilityEffect } from '../pathways/seer';

export type ActionPreview = {
  requestId: string;
  payloadHash: string;
  sceneRevision: number;
  targetId: string;
  methodId: string;
  skillId: string;
  abilityId?: string;
  difficulty: 'regular' | 'hard' | 'extreme';
  riskIds: string[];
  rationale: string;
  diceSources: string[];
  resourceCostSummary: string;
  abilityEffect?: SeerAbilityEffect;
  playerConfirmationRequired: true;
};

export function createActionPreview(context: ModelContextEnvelope, payloadHash: string, candidate: Extract<KeeperInterpretation, { kind: 'execute' }>): ActionPreview {
  const catalog = context.allowedActionCatalog;
  if (!catalog.targetIds.includes(candidate.targetId)
    || !catalog.methodIds.includes(candidate.methodId)
    || !catalog.skillIds.includes(candidate.skillId)
    || (candidate.abilityId && !catalog.abilityIds.includes(candidate.abilityId))
    || candidate.riskIds.some((risk) => !catalog.riskIds.includes(risk))) throw new Error('candidate references unavailable action');
  return {
    requestId: context.requestId,
    payloadHash,
    sceneRevision: context.sceneRevision,
    targetId: candidate.targetId,
    methodId: candidate.methodId,
    skillId: candidate.skillId,
    ...(candidate.abilityId ? { abilityId: candidate.abilityId } : {}),
    difficulty: candidate.proposedDifficulty,
    riskIds: candidate.riskIds,
    rationale: candidate.rationale,
    diceSources: candidate.abilityId ? [`ability:${candidate.abilityId}`] : [],
    resourceCostSummary: candidate.riskIds.length ? '确认后可能产生场景规定的风险或资源代价。' : '无预声明资源代价。',
    playerConfirmationRequired: true,
  };
}

export type DeterministicResolver = (preview: ActionPreview) => ResolutionEnvelope;
