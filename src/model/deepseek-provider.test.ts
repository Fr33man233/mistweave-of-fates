import { describe, expect, it, vi } from 'vitest';
import { DeepSeekProvider } from './deepseek-provider';

function response(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' }, ...init });
}

describe('DeepSeekProvider', () => {
  it('uses the pinned model, JSON output and server-side key without logging it', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(response({
      model: 'deepseek-v4-flash',
      choices: [{ message: { content: '{"kind":"clarify"}' } }],
      usage: { prompt_tokens: 20, prompt_cache_hit_tokens: 4, completion_tokens: 8, total_tokens: 28 },
    }));
    const provider = new DeepSeekProvider({ apiKey: 'secret-test-key', fetchImpl });
    await expect(provider.complete({
      purpose: 'keeper_interpret', messages: [{ role: 'system', content: 'Return JSON.' }], maxTokens: 128,
      thinking: 'disabled', userId: 'mistweave-test',
    })).resolves.toMatchObject({ model: 'deepseek-v4-flash', content: '{"kind":"clarify"}', usage: { cachedInputTokens: 4 } });
    const request = fetchImpl.mock.calls[0]?.[1];
    expect(request?.headers).toMatchObject({ authorization: 'Bearer secret-test-key' });
    expect(String(request?.body)).toContain('deepseek-v4-flash');
    expect(String(request?.body)).toContain('"type":"json_object"');
  });

  it('maps missing key, quota, rate limit and empty content to safe errors', async () => {
    await expect(new DeepSeekProvider({ apiKey: '' }).complete({ purpose: 'keeper_interpret', messages: [], maxTokens: 1, thinking: 'disabled', userId: 'test' })).rejects.toMatchObject({ code: 'provider_not_configured' });
    const quotaFetch = vi.fn<typeof fetch>().mockResolvedValue(new Response('', { status: 402 }));
    await expect(new DeepSeekProvider({ apiKey: 'key', fetchImpl: quotaFetch }).complete({ purpose: 'keeper_interpret', messages: [], maxTokens: 1, thinking: 'disabled', userId: 'test' })).rejects.toMatchObject({ code: 'provider_quota_exhausted', retryable: false });
    const rateFetch = vi.fn<typeof fetch>().mockResolvedValue(new Response('', { status: 429 }));
    await expect(new DeepSeekProvider({ apiKey: 'key', fetchImpl: rateFetch }).complete({ purpose: 'keeper_interpret', messages: [], maxTokens: 1, thinking: 'disabled', userId: 'test' })).rejects.toMatchObject({ code: 'provider_rate_limited', retryable: true });
    const emptyFetch = vi.fn<typeof fetch>().mockResolvedValue(response({ model: 'deepseek-v4-flash', choices: [{ message: { content: '' } }] }));
    await expect(new DeepSeekProvider({ apiKey: 'key', fetchImpl: emptyFetch }).complete({ purpose: 'keeper_interpret', messages: [], maxTokens: 1, thinking: 'disabled', userId: 'test' })).rejects.toMatchObject({ code: 'provider_invalid_response', retryable: true });
  });
});
