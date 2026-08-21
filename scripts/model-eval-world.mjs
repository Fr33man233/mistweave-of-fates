const apiKey = process.env.DEEPSEEK_API_KEY;
const model = 'deepseek-v4-flash';
const baseUrl = 'https://api.deepseek.com';

function usageOf(usage = {}) {
  return {
    inputTokens: Number.isInteger(usage.prompt_tokens) ? usage.prompt_tokens : 0,
    cachedInputTokens: Number.isInteger(usage.prompt_cache_hit_tokens) ? usage.prompt_cache_hit_tokens : 0,
    outputTokens: Number.isInteger(usage.completion_tokens) ? usage.completion_tokens : 0,
    reasoningOutputTokens: Number.isInteger(usage.completion_tokens_details?.reasoning_tokens) ? usage.completion_tokens_details.reasoning_tokens : 0,
    totalTokens: Number.isInteger(usage.total_tokens) ? usage.total_tokens : 0,
  };
}

function safeCandidateSummary(candidate) {
  const proposals = Array.isArray(candidate?.proposals) ? candidate.proposals : [];
  const forbidden = new Set(['truth', 'hiddenTruth', 'death', 'pathway', 'sequence', 'fact', 'worldState']);
  return {
    shapeValid: Boolean(candidate && typeof candidate === 'object' && Array.isArray(candidate.proposals)),
    topLevelKeys: candidate && typeof candidate === 'object' ? Object.keys(candidate).sort() : [],
    proposalCount: proposals.length,
    proposalKeys: proposals.map((proposal) => proposal && typeof proposal === 'object' ? Object.keys(proposal).sort() : []),
    templateIds: proposals.map((proposal) => typeof proposal?.templateId === 'string' ? proposal.templateId : null),
    subjectCounts: proposals.map((proposal) => Array.isArray(proposal?.subjectIds) ? proposal.subjectIds.length : 0),
    foreshadowingLengths: proposals.map((proposal) => typeof proposal?.visibleForeshadowing === 'string' ? proposal.visibleForeshadowing.length : 0),
    forbiddenParameterKeyFound: proposals.some((proposal) => Object.keys(proposal?.proposedParameters ?? {}).some((key) => forbidden.has(key))),
    hasRawText: false,
  };
}

async function run() {
  if (!apiKey) return { status: 'blocked', code: 'provider_not_configured', calls: 0 };
  const context = {
    schemaVersion: '0.4.0',
    requestId: 'v04-live-world-2',
    worldId: 'parallel-tingen-v04',
    sceneId: 'river-crate-scene',
    sceneRevision: 0,
    purpose: 'world_propose',
    playerVisibleContext: {
      location: '廷根河岸旧货场河阶',
      time: '雨后傍晚',
      visibleEntities: ['rain-soaked-crate', 'riverside-noticeboard'],
      knownFactIds: [],
      dangerForeshadowing: ['石阶有未干的深色拖痕'],
    },
    characterProjection: {
      characterId: 'anonymous-player-character',
      name: '调查员',
      occupationId: 'reporter',
      relevantSkills: { spot_hidden: 50, listen: 35 },
      hp: { current: 10, max: 10 },
      san: { current: 70, max: 70, presentation: 'SAN：70/70（无污染）' },
      spirituality: { current: 10, max: 10 },
      conditionIds: [],
      unlockedAbilityIds: [],
    },
    allowedActionCatalog: { targetIds: ['rain-soaked-crate'], methodIds: ['observe-crate'], skillIds: ['spot_hidden'], abilityIds: [], riskIds: ['noticed'] },
    conversationWindow: [],
    conversationSummary: '无',
    contentPackId: 'parallel-tingen-v04',
    rulesetVersion: 'coc7-v04',
    promptVersion: 'keeper-v1',
  };
  const started = Date.now();
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: 'Return JSON only. Copy this exact JSON shape and values with no extra keys or markdown: {"proposals":[{"proposalId":"v04-live-proposal-2","templateId":"temporary-danger","subjectIds":["rain-soaked-crate"],"triggerId":"scene-0","proposedParameters":{"intensity":1},"visibleForeshadowing":"河阶下的水声突然靠近。","expiresAtCheckpoint":2}]}. Never add hidden truth, death, pathway, sequence, fact, worldState, dice results, tools, or executable instructions.' },
        { role: 'user', content: JSON.stringify({ context, checkpointId: 'scene-0', allowedTemplateIds: ['temporary-danger'] }) },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 512,
      stream: false,
      user_id: 'mistweave-closed-v04',
      thinking: { type: 'disabled' },
    }),
  });
  const payload = await response.json().catch(() => undefined);
  const finishReason = payload?.choices?.[0]?.finish_reason ?? null;
  if (!response.ok || typeof payload?.choices?.[0]?.message?.content !== 'string') return { status: 'failed', code: 'provider_response_invalid', calls: 1, httpStatus: response.status, model: payload?.model ?? model, usage: usageOf(payload?.usage), latencyMs: Date.now() - started, finishReason };
  const content = payload.choices[0].message.content;
  let candidate;
  try { candidate = JSON.parse(content); } catch { return { status: 'failed', code: 'invalid_json_output', calls: 1, model: payload?.model ?? model, usage: usageOf(payload?.usage), latencyMs: Date.now() - started, finishReason, contentLength: content.length }; }
  const summary = safeCandidateSummary(candidate);
  const proposals = Array.isArray(candidate?.proposals) ? candidate.proposals : [];
  const expectedProposalKeys = ['expiresAtCheckpoint', 'proposalId', 'proposedParameters', 'subjectIds', 'templateId', 'triggerId', 'visibleForeshadowing'];
  const boundaryPassed = summary.shapeValid && summary.topLevelKeys.join(',') === 'proposals' && proposals.length === 1 && proposals.every((proposal) => Object.keys(proposal).sort().join(',') === expectedProposalKeys.join(',') && proposal.proposalId === 'v04-live-proposal-2' && proposal.templateId === 'temporary-danger' && Array.isArray(proposal.subjectIds) && proposal.subjectIds.length === 1 && proposal.subjectIds.every((id) => context.playerVisibleContext.visibleEntities.includes(id)) && proposal.triggerId === 'scene-0' && proposal.proposedParameters?.intensity === 1 && Object.keys(proposal.proposedParameters ?? {}).join(',') === 'intensity' && typeof proposal.visibleForeshadowing === 'string' && proposal.visibleForeshadowing.length > 0 && Number.isInteger(proposal.expiresAtCheckpoint) && proposal.expiresAtCheckpoint > context.sceneRevision && !summary.forbiddenParameterKeyFound);
  return { status: boundaryPassed ? 'passed' : 'failed', code: boundaryPassed ? undefined : 'world_proposal_boundary_failed', calls: 1, model: payload?.model ?? model, usage: usageOf(payload?.usage), latencyMs: Date.now() - started, finishReason, contentLength: content.length, boundaryPassed, candidate: summary };
}

run().then((result) => console.log(JSON.stringify(result))).catch(() => { console.log(JSON.stringify({ status: 'failed', code: 'provider_error', calls: 1 })); process.exitCode = 1; });
