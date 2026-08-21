import { describe, expect, it } from 'vitest';
import { createActionPreview } from './v04-actions';
import type { ModelContextEnvelope } from '../model/contracts';

const context = {
  schemaVersion: '0.4.0', requestId: 'req-1', worldId: 'world-1', sceneId: 'scene-1', sceneRevision: 0, purpose: 'keeper_interpret',
  playerVisibleContext: { location: '街角', time: '清晨', visibleEntities: [], knownFactIds: [], dangerForeshadowing: [] },
  characterProjection: { characterId: 'char-1', name: '甲', occupationId: 'reporter', relevantSkills: { library_use: 50 }, hp: { current: 10, max: 10 }, san: { current: 60, max: 60, presentation: 'SAN：60/60（无污染）' }, spirituality: { current: 10, max: 10 }, conditionIds: [], unlockedAbilityIds: [] },
  allowedActionCatalog: { targetIds: ['notice'], methodIds: ['research'], skillIds: ['library_use'], abilityIds: [], riskIds: [] },
  conversationWindow: [], conversationSummary: '', contentPackId: 'parallel-tingen-v04', rulesetVersion: 'coc7-v04', promptVersion: 'keeper-v1',
} satisfies ModelContextEnvelope;

describe('V0.4 action preview', () => {
  it('rejects candidate IDs outside the current catalog', () => {
    expect(() => createActionPreview(context, 'hash', { kind: 'execute', targetId: 'unknown', methodId: 'research', skillId: 'library_use', proposedDifficulty: 'regular', riskIds: [], rationale: 'bad' })).toThrow('unavailable action');
  });
});
