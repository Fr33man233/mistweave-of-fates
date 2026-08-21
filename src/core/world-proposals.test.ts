import { describe, expect, it } from 'vitest';
import { commitWorldProposal, validateWorldProposalList } from './world-proposals';
import type { ModelContextEnvelope, WorldProposal } from '../model/contracts';

const context: ModelContextEnvelope = {
  schemaVersion: '0.4.0', requestId: 'world-req', worldId: 'world-1', sceneId: 'scene-1', sceneRevision: 2, purpose: 'world_propose',
  playerVisibleContext: { location: '廷根河岸', time: '午夜', visibleEntities: ['crate', 'porter'], knownFactIds: ['fact-drag-marks'], dangerForeshadowing: ['远处有脚步声'] },
  characterProjection: { characterId: 'char-1', name: '林岚', occupationId: 'reporter', relevantSkills: {}, hp: { current: 10, max: 10 }, san: { current: 55, max: 60, presentation: 'SAN：55/60（轻度污染）' }, spirituality: { current: 10, max: 10 }, conditionIds: [], unlockedAbilityIds: [] },
  allowedActionCatalog: { targetIds: [], methodIds: [], skillIds: [], abilityIds: [], riskIds: [] }, conversationWindow: [], conversationSummary: '', contentPackId: 'parallel-tingen-v04', rulesetVersion: 'coc7-v04', promptVersion: 'keeper-v1',
};
const proposal: WorldProposal = { proposalId: 'proposal-1', templateId: 'temporary-danger', subjectIds: ['porter'], triggerId: 'checkpoint-1', proposedParameters: { intensity: 1 }, visibleForeshadowing: '脚步声靠近。', expiresAtCheckpoint: 4 };

describe('bounded world AI proposals', () => {
  it('accepts one visible, ephemeral, template-backed proposal', () => {
    const accepted = validateWorldProposalList({ proposals: [proposal] }, context, 'checkpoint-1', ['temporary-danger']);
    const state = commitWorldProposal({ checkpointId: 'checkpoint-1', sceneRevision: 2, ephemeralProposals: [] }, accepted[0]!);
    expect(state.ephemeralProposals).toHaveLength(1);
    expect(commitWorldProposal(state, accepted[0]!).ephemeralProposals).toHaveLength(1);
  });

  it('rejects hidden authority, invisible subjects and multiple proposals', () => {
    expect(() => validateWorldProposalList({ proposals: [{ ...proposal, proposedParameters: { hiddenTruth: true } }] }, context, 'checkpoint-1', ['temporary-danger'])).toThrow('forbidden authority');
    expect(() => validateWorldProposalList({ proposals: [{ ...proposal, subjectIds: ['hidden-npc'] }] }, context, 'checkpoint-1', ['temporary-danger'])).toThrow('not visible');
    expect(() => validateWorldProposalList({ proposals: [proposal, proposal] }, context, 'checkpoint-1', ['temporary-danger'])).toThrow('only one');
  });
});
