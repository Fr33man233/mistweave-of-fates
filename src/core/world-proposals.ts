import { worldProposalListSchema, worldProposalSchema, type ModelContextEnvelope, type WorldProposal } from '../model/contracts';

export const worldTemplateIds = ['temporary-danger', 'public-rumor', 'npc-motion'] as const;
export type WorldTemplateId = (typeof worldTemplateIds)[number];
export type WorldCheckpointState = { checkpointId: string; sceneRevision: number; ephemeralProposals: WorldProposal[] };

const forbiddenParameterKeys = new Set(['truth', 'hiddenTruth', 'death', 'pathway', 'sequence', 'fact', 'worldState']);

export function validateWorldProposalList(candidate: unknown, context: ModelContextEnvelope, checkpointId: string, allowedTemplates: readonly string[]): WorldProposal[] {
  const parsed = worldProposalListSchema.parse(candidate);
  if (parsed.proposals.length > 1) throw new Error('only one proposal is allowed at a checkpoint');
  const visible = new Set(context.playerVisibleContext.visibleEntities);
  for (const proposal of parsed.proposals) {
    if (!allowedTemplates.includes(proposal.templateId) || !worldTemplateIds.includes(proposal.templateId as WorldTemplateId)) throw new Error('world template is not allowed');
    if (proposal.triggerId !== checkpointId || proposal.expiresAtCheckpoint <= context.sceneRevision) throw new Error('world proposal checkpoint is invalid');
    if (proposal.subjectIds.some((subjectId) => !visible.has(subjectId))) throw new Error('world proposal subject is not visible');
    if (Object.keys(proposal.proposedParameters).some((key) => forbiddenParameterKeys.has(key))) throw new Error('world proposal attempts forbidden authority');
  }
  return parsed.proposals;
}

export function commitWorldProposal(state: WorldCheckpointState, proposal: WorldProposal): WorldCheckpointState {
  if (proposal.expiresAtCheckpoint <= state.sceneRevision || proposal.triggerId !== state.checkpointId) throw new Error('world proposal is expired');
  const parsed = worldProposalSchema.parse(proposal);
  if (state.ephemeralProposals.some((entry) => entry.proposalId === parsed.proposalId)) return state;
  return { ...state, ephemeralProposals: [...state.ephemeralProposals, parsed] };
}
