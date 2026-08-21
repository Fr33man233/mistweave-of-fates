const apiKey = process.env.DEEPSEEK_API_KEY;
const model = 'deepseek-v4-flash';
const baseUrl = 'https://api.deepseek.com';
const maxTokens = 128;
const promptVersion = 't1-clarify-v2';

function reportFailure(code, message, details = {}) {
  console.error(JSON.stringify({ status: 'failed', code, message, ...details }));
}

function safeUsage(usage = {}) {
  return {
    inputTokens: Number.isInteger(usage.prompt_tokens) ? usage.prompt_tokens : 0,
    cachedInputTokens: Number.isInteger(usage.prompt_cache_hit_tokens) ? usage.prompt_cache_hit_tokens : 0,
    outputTokens: Number.isInteger(usage.completion_tokens) ? usage.completion_tokens : 0,
    reasoningOutputTokens: Number.isInteger(usage.completion_tokens_details?.reasoning_tokens) ? usage.completion_tokens_details.reasoning_tokens : 0,
    totalTokens: Number.isInteger(usage.total_tokens) ? usage.total_tokens : 0,
  };
}

function providerMetadata(payload, latencyMs) {
  return { model: payload?.model ?? model, promptVersion, usage: safeUsage(payload?.usage), latencyMs };
}

async function run() {
  if (process.argv[2] !== '--live') {
    console.log('T0 only: no network request performed. Use --live for the single approved T1 request.');
    return 0;
  }
  if (!apiKey) {
    reportFailure('provider_not_configured', 'DEEPSEEK_API_KEY is not present in the server environment.');
    return 2;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  const started = Date.now();
  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: 'Return JSON only. Do not include markdown. Return exactly this object shape: {"kind":"clarify","question":"...","allowedAnswerHints":["..."]}. The kind value must be exactly the lowercase string "clarify". Do not use "clarification" or any other kind value.' },
          { role: 'user', content: 'The player says: "I look around." Ask one concise clarification question. Output the required JSON object.' },
        ],
        response_format: { type: 'json_object' },
        max_tokens: maxTokens,
        stream: false,
        user_id: 'mistweave-t1-retest-2',
        thinking: { type: 'disabled' },
      }),
      signal: controller.signal,
    });
    const raw = await response.text();
    if (!response.ok) {
      reportFailure('provider_http_error', `DeepSeek returned HTTP ${response.status}.`, { latencyMs: Date.now() - started });
      return 3;
    }
    let payload;
    try {
      payload = JSON.parse(raw);
    } catch {
      reportFailure('invalid_provider_json', 'Provider response was not valid JSON.', { latencyMs: Date.now() - started });
      return 4;
    }
    const content = payload?.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || content.trim().length === 0) {
      reportFailure('empty_provider_content', 'Provider returned empty content.', providerMetadata(payload, Date.now() - started));
      return 5;
    }
    let candidate;
    try {
      candidate = JSON.parse(content);
    } catch {
      reportFailure('invalid_json_output', 'JSON Output content was not a JSON object.', providerMetadata(payload, Date.now() - started));
      return 6;
    }
    if (candidate?.kind !== 'clarify' || typeof candidate?.question !== 'string' || !Array.isArray(candidate?.allowedAnswerHints)) {
      reportFailure('t1_schema_mismatch', 'Fixed clarify contract was not returned.', {
        ...providerMetadata(payload, Date.now() - started),
        candidateKeys: candidate && typeof candidate === 'object' ? Object.keys(candidate).sort() : [],
        candidateKind: candidate?.kind ?? null,
      });
      return 7;
    }
    console.log(JSON.stringify({
      status: 'passed',
      ...providerMetadata(payload, Date.now() - started),
      candidateKind: candidate.kind,
    }));
    return 0;
  } catch (error) {
    if (error?.name === 'AbortError') reportFailure('provider_timeout', 'DeepSeek request timed out.');
    else reportFailure('provider_network_error', 'DeepSeek request failed; details omitted.');
    return 8;
  } finally {
    clearTimeout(timeout);
  }
}

process.exitCode = await run();
