import { describe, expect, it } from 'vitest';
import { createKeeperFlow, beginInterpretation, confirmPreview, receiveInterpretation, receiveNarration, withdrawPreview } from './keeper-flow';
import type { ModelContextEnvelope, ResolutionEnvelope } from '../model/contracts';

const context: ModelContextEnvelope = {
  schemaVersion: '0.4.0', requestId: 'req-1', worldId: 'world-1', sceneId: 'scene-1', sceneRevision: 2, purpose: 'keeper_interpret',
  playerVisibleContext: { location: '码头边', time: '夜晚', visibleEntities: ['木箱'], knownFactIds: [], dangerForeshadowing: [] },
  characterProjection: { characterId: 'char-1', name: '林岚', occupationId: 'reporter', relevantSkills: { spot_hidden: 55 }, hp: { current: 10, max: 10 }, san: { current: 55, max: 65, presentation: 'SAN：55/65（轻度污染）' }, spirituality: { current: 12, max: 12 }, conditionIds: [], unlockedAbilityIds: [] },
  allowedActionCatalog: { targetIds: ['crate'], methodIds: ['observe'], skillIds: ['spot_hidden'], abilityIds: [], riskIds: ['noticed'] },
  conversationWindow: [], conversationSummary: '', contentPackId: 'parallel-tingen-v04', rulesetVersion: 'coc7-v04', promptVersion: 'keeper-v1',
};
const execute = { kind: 'execute' as const, targetId: 'crate', methodId: 'observe', skillId: 'spot_hidden', proposedDifficulty: 'regular' as const, riskIds: ['noticed'], rationale: 'visible target' };
const resolution: ResolutionEnvelope = { schemaVersion: '0.4.0', requestId: 'req-1', eventIds: ['event-1'], actionId: 'inspect-crate', targetId: 'crate', methodId: 'observe', skillId: 'spot_hidden', difficulty: 'regular', roll: 34, successLevel: 'regular', visibleChanges: ['发现划痕'], visibleFactIds: ['fact-1'], nextActionIds: ['ask-docker'] };

describe('Keeper action flow', () => {
  it('requires a preview and commits exactly once before narration', () => {
    const interpreting = beginInterpretation(createKeeperFlow(2), 'req-1', 'hash-1');
    const preview = receiveInterpretation(interpreting, context, execute);
    expect(preview.phase).toBe('preview');
    expect(preview.preview?.playerConfirmationRequired).toBe(true);
    const committed = confirmPreview(preview, () => resolution);
    expect(committed.phase).toBe('narrating');
    expect(committed.committedRequestIds).toEqual(['req-1']);
    expect(confirmPreview(committed, () => resolution).committedRequestIds).toEqual(['req-1']);
    expect(receiveNarration(committed, undefined).lastResolution).toEqual(resolution);
  });

  it('does not mutate authority state for clarify, reject, stale, or withdrawal', () => {
    const interpreting = beginInterpretation(createKeeperFlow(2), 'req-1', 'hash-1');
    expect(receiveInterpretation(interpreting, context, { kind: 'clarify', question: '观察哪里？', allowedAnswerHints: ['木箱'] }).committedRequestIds).toEqual([]);
    const stale = receiveInterpretation(interpreting, { ...context, sceneRevision: 3 }, execute);
    expect(stale.notice?.code).toBe('stale_candidate');
    const preview = receiveInterpretation(interpreting, context, execute);
    expect(withdrawPreview(preview).committedRequestIds).toEqual([]);
  });
});
