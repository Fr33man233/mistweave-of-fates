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

async function request(messages, maxTokens) {
  const started = Date.now();
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages, response_format: { type: 'json_object' }, max_tokens: maxTokens, stream: false, user_id: 'mistweave-t3-closed', thinking: { type: 'disabled' } }),
  });
  const payload = await response.json();
  if (!response.ok || typeof payload?.choices?.[0]?.message?.content !== 'string') throw new Error('provider_response_invalid');
  return { candidate: JSON.parse(payload.choices[0].message.content), model: payload.model ?? model, usage: usageOf(payload.usage), latencyMs: Date.now() - started };
}

function isAllowedExecute(candidate) {
  const keys = Object.keys(candidate ?? {}).sort().join(',');
  return candidate?.kind === 'execute'
    && candidate.targetId === 'crate'
    && candidate.methodId === 'observe'
    && candidate.skillId === 'spot_hidden'
    && candidate.proposedDifficulty === 'regular'
    && Array.isArray(candidate.riskIds)
    && candidate.riskIds.every((id) => id === 'noticed')
    && keys === 'kind,methodId,proposedDifficulty,rationale,riskIds,skillId,targetId';
}

function isNarrative(candidate) {
  return candidate && Object.keys(candidate).sort().join(',') === 'narrative,npcReactions'
    && typeof candidate.narrative === 'string' && candidate.narrative.trim().length > 0
    && Array.isArray(candidate.npcReactions) && candidate.npcReactions.every((value) => typeof value === 'string');
}

async function run() {
  if (process.argv[2] !== '--live') return { status: 't0_only', calls: 0 };
  if (!apiKey) return { status: 'blocked', code: 'provider_not_configured', calls: 0 };
  const visible = { location: '廷根河岸', time: '雨后夜晚', visibleEntities: ['路边木箱', '公告牌'], knownFactIds: [], dangerForeshadowing: ['石阶有未干的深色拖痕'] };
  const interpret = await request([
    { role: 'system', content: 'You are a bounded game intent classifier. Return JSON only. Return exactly {"kind":"execute","targetId":"crate","methodId":"observe","skillId":"spot_hidden","proposedDifficulty":"regular","riskIds":["noticed"],"rationale":"..."}. Do not add fields, hidden facts, dice results, state changes, tools, or markdown.' },
    { role: 'user', content: JSON.stringify({ visible, playerText: '我检查路边木箱上留下的划痕。', allowed: { targetIds: ['crate'], methodIds: ['observe'], skillIds: ['spot_hidden'], riskIds: ['noticed'] } }) },
  ], 320);
  if (!isAllowedExecute(interpret.candidate)) return { status: 'failed', code: 'interpret_contract_failed', calls: 1, model: interpret.model, usage: interpret.usage, latencyMs: interpret.latencyMs, candidateKind: interpret.candidate?.kind ?? null, candidateKeys: Object.keys(interpret.candidate ?? {}).sort() };
  const resolution = { actionId: 'inspect-crate', targetId: 'crate', methodId: 'observe', skillId: 'spot_hidden', difficulty: 'regular', roll: 34, successLevel: 'regular', visibleChanges: ['发现木箱边缘的新鲜划痕'], visibleFactIds: ['fact-crate-scratches'], nextActionIds: ['ask-docker'] };
  const narrate = await request([
    { role: 'system', content: 'Narrate only the supplied committed visible resolution. Return JSON only with exactly {"narrative":"...","npcReactions":["..."]}. Do not add facts, names, numbers, hidden information, state changes, tools, or markdown.' },
    { role: 'user', content: JSON.stringify({ visible, resolution }) },
  ], 320);
  return { status: isNarrative(narrate.candidate) ? 'passed' : 'failed', code: isNarrative(narrate.candidate) ? undefined : 'narrative_contract_failed', calls: 2, interpret: { model: interpret.model, usage: interpret.usage, latencyMs: interpret.latencyMs }, narrate: { model: narrate.model, usage: narrate.usage, latencyMs: narrate.latencyMs, schemaValid: isNarrative(narrate.candidate) } };
}

run().then((result) => console.log(JSON.stringify(result))).catch(() => { console.log(JSON.stringify({ status: 'failed', code: 'provider_error', calls: 0 })); process.exitCode = 1; });
