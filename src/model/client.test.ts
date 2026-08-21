import { describe, expect, it, vi } from 'vitest';
import { requestKeeperInterpret, ModelGatewayClientError } from './client';

const context = {
  schemaVersion: '0.4.0' as const, requestId: 'req-client', worldId: 'world-client', sceneId: 'scene-client', sceneRevision: 0, purpose: 'keeper_interpret' as const,
  playerVisibleContext: { location: '廷根河岸', time: '傍晚', visibleEntities: ['木箱'], knownFactIds: [], dangerForeshadowing: ['拖痕'] },
  characterProjection: { characterId: 'anonymous-player-character', name: '调查员', occupationId: 'detective', relevantSkills: { spot_hidden: 50 }, hp: { current: 10, max: 10 }, san: { current: 60, max: 60, presentation: 'SAN：60/60（无污染）' }, spirituality: { current: 10, max: 10 }, conditionIds: [], unlockedAbilityIds: [] },
  allowedActionCatalog: { targetIds: ['rain-soaked-crate'], methodIds: ['observe-crate'], skillIds: ['spot_hidden'], abilityIds: [], riskIds: ['noticed'] }, conversationWindow: [], conversationSummary: '无', contentPackId: 'parallel-tingen-v04', rulesetVersion: 'coc7-v04', promptVersion: 'keeper-v1',
};

describe('model client', () => {
  it('maps a retryable gateway error without exposing response internals', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: { code: 'provider_timeout', message: 'Model timed out.', retryable: true } }), { status: 502, headers: { 'content-type': 'application/json' } })));
    await expect(requestKeeperInterpret({ context, playerText: '我观察木箱。' })).rejects.toMatchObject({ code: 'provider_timeout', retryable: true });
    expect(fetch).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
  });

  it('maps network failures to a retryable client error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network details')));
    await expect(requestKeeperInterpret({ context, playerText: '我观察木箱。' })).rejects.toBeInstanceOf(ModelGatewayClientError);
    await expect(requestKeeperInterpret({ context, playerText: '我观察木箱。' })).rejects.toMatchObject({ code: 'provider_unavailable', retryable: true });
    vi.unstubAllGlobals();
  });
});
