import type { KeeperInterpretRequest, KeeperNarrateRequest, WorldProposeRequest } from './contracts.ts';
import type { ProviderMessage } from './provider.ts';

export const promptVersion = 'keeper-v1';
export const worldPromptVersion = 'world-v2';

const jsonInstruction = 'Return JSON only. Do not include markdown fences, hidden facts, state changes, dice results, tool calls, or facts not present in the supplied visible context.';

export function buildInterpretMessages(request: KeeperInterpretRequest): ProviderMessage[] {
  return [
    { role: 'system', content: `You are a bounded game intent classifier for Mistweave of Fates. Return JSON only, with exactly one object and no extra keys. The only legal kind values are execute, clarify, or reject. The clarification literal is exactly "clarify"; never use "clarification". For execute, return exactly {"kind":"execute","targetId":"...","methodId":"...","skillId":"...","proposedDifficulty":"regular|hard|extreme","riskIds":[],"rationale":"..."}; copy IDs only from the allowed catalog. For clarify, return exactly {"kind":"clarify","question":"...","allowedAnswerHints":[]}. For reject, return exactly {"kind":"reject","reasonCode":"...","explanation":"...","suggestedAlternatives":[]}. ${jsonInstruction}` },
    { role: 'user', content: JSON.stringify({ visibleContext: request.context.playerVisibleContext, character: request.context.characterProjection, catalog: request.context.allowedActionCatalog, conversation: request.context.conversationWindow, summary: request.context.conversationSummary, playerText: request.playerText }) },
  ];
}

export function buildNarrateMessages(request: KeeperNarrateRequest): ProviderMessage[] {
  return [
    { role: 'system', content: `You are the Mistweave of Fates AI Keeper. Narrate only the already committed visible resolution. Do not add facts, alter numbers, invent hidden information, or decide the next state. ${jsonInstruction} The JSON shape is {"narrative":"...","npcReactions":["..."]}.` },
    { role: 'user', content: JSON.stringify({ visibleContext: request.context.playerVisibleContext, conversation: request.context.conversationWindow, resolution: request.resolution }) },
  ];
}

export function buildWorldMessages(request: WorldProposeRequest): ProviderMessage[] {
  const visible = new Set(request.context.playerVisibleContext.visibleEntities);
  const subjectId = request.context.allowedActionCatalog.targetIds.find((id) => visible.has(id))
    ?? request.context.playerVisibleContext.visibleEntities.find((id) => /^[a-zA-Z0-9][a-zA-Z0-9_.:-]*$/.test(id));
  const example = subjectId ? {
    proposals: [{
      proposalId: `world-proposal-${request.context.sceneRevision + 1}`,
      templateId: request.allowedTemplateIds[0],
      subjectIds: [subjectId],
      triggerId: request.checkpointId,
      proposedParameters: { intensity: 1 },
      visibleForeshadowing: '可见环境出现一次短暂而明确的变化。',
      expiresAtCheckpoint: request.context.sceneRevision + 2,
    }],
  } : { proposals: [] };
  return [
    { role: 'system', content: `You are the bounded world AI for Mistweave of Fates. ${subjectId ? 'Return exactly one proposal.' : 'Return an empty proposals array because no stable visible subject is available.'} Copy the supplied IDs, numbers, root key, and field names exactly; only rewrite visibleForeshadowing as one short sentence grounded in visible context. Never create pathways, sequence rules, hidden truth, unexplained death, executable instructions, or arbitrary persistent objects. ${jsonInstruction} Required JSON example: ${JSON.stringify(example)}` },
    { role: 'user', content: JSON.stringify({ visibleContext: request.context.playerVisibleContext, character: request.context.characterProjection, knownFacts: request.context.playerVisibleContext.knownFactIds, allowedTemplateIds: request.allowedTemplateIds, checkpointId: request.checkpointId }) },
  ];
}
