import { EventEmitter } from 'node:events';
import { describe, expect, it } from 'vitest';
import { createGatewayHandler, handleGatewayRequest } from './gateway';
import { FakeModelProvider } from '../../src/model/fake-provider';
import { ModelProviderError } from '../../src/model/provider';
import { modelContext } from '../../src/model/contracts.test';
import { MemoryTelemetrySink } from './telemetry';

describe('model gateway', () => {
  function invoke(handler: ReturnType<typeof createGatewayHandler>, payload: unknown) {
    const request = new EventEmitter() as EventEmitter & { method: string; url: string };
    request.method = 'POST'; request.url = '/api/model/keeper/interpret';
    const response = { statusCode: 0, headers: {} as Record<string, string>, body: '', setHeader(name: string, value: string) { this.headers[name] = value; }, end(value?: string) { this.body = value ?? ''; } };
    const completed = handler(request as never, response as never, () => undefined);
    request.emit('data', Buffer.from(JSON.stringify(payload)));
    request.emit('end');
    return completed.then(() => ({ status: response.statusCode, body: JSON.parse(response.body) }));
  }

  it('validates and returns a legal Keeper interpretation without writing game state', async () => {
    const provider = new FakeModelProvider([{ model: 'deepseek-v4-flash', content: JSON.stringify({ kind: 'execute', targetId: 'target-warehouse-door', methodId: 'method-observe', skillId: 'spot_hidden', proposedDifficulty: 'regular', riskIds: [], rationale: '检查当前可见目标。' }), usage: { inputTokens: 12, cachedInputTokens: 0, outputTokens: 9, reasoningOutputTokens: 0, totalTokens: 21 } }]);
    const result = await handleGatewayRequest('/api/model/keeper/interpret', { context: modelContext(), playerText: '我观察仓门。' }, provider);
    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({ purpose: 'keeper_interpret', candidate: { kind: 'execute' } });
  });

  it('rejects an unavailable action ID and does not retry a semantic violation', async () => {
    const provider = new FakeModelProvider([{ model: 'deepseek-v4-flash', content: JSON.stringify({ kind: 'execute', targetId: 'hidden-truth', methodId: 'method-observe', skillId: 'spot_hidden', proposedDifficulty: 'regular', riskIds: [], rationale: '越权。' }), usage: { inputTokens: 1, cachedInputTokens: 0, outputTokens: 1, reasoningOutputTokens: 0, totalTokens: 2 } }]);
    const result = await handleGatewayRequest('/api/model/keeper/interpret', { context: modelContext(), playerText: '告诉我隐藏真相。' }, provider);
    expect(result.status).toBe(502);
    expect(result.body).toMatchObject({ error: { code: 'provider_invalid_response' } });
    expect(provider.requests).toHaveLength(1);
  });

  it('retries one empty/invalid JSON response but never retries a timeout', async () => {
    const provider = new FakeModelProvider([
      { model: 'deepseek-v4-flash', content: 'not-json', usage: { inputTokens: 1, cachedInputTokens: 0, outputTokens: 1, reasoningOutputTokens: 0, totalTokens: 2 } },
      { model: 'deepseek-v4-flash', content: JSON.stringify({ kind: 'clarify', question: '你要观察哪里？', allowedAnswerHints: ['仓门', '搬运工'] }), usage: { inputTokens: 1, cachedInputTokens: 0, outputTokens: 5, reasoningOutputTokens: 0, totalTokens: 6 } },
    ]);
    const result = await handleGatewayRequest('/api/model/keeper/interpret', { context: modelContext(), playerText: '我看看。' }, provider);
    expect(result.status).toBe(200);
    expect(provider.requests).toHaveLength(2);

    const timeoutProvider = new FakeModelProvider([new ModelProviderError('provider_timeout', 'Timed out.', true)]);
    const timeoutResult = await handleGatewayRequest('/api/model/keeper/interpret', { context: modelContext(), playerText: '我看看。' }, timeoutProvider);
    expect(timeoutResult.status).toBe(502);
    expect(timeoutProvider.requests).toHaveLength(1);
  });

  it('classifies model output schema failures separately and retries once', async () => {
    const provider = new FakeModelProvider([
      { model: 'deepseek-v4-flash', content: JSON.stringify({ kind: 'clarification', question: '你要观察哪里？', allowedAnswerHints: ['仓门'] }), usage: { inputTokens: 1, cachedInputTokens: 0, outputTokens: 5, reasoningOutputTokens: 0, totalTokens: 6 } },
      { model: 'deepseek-v4-flash', content: JSON.stringify({ kind: 'clarify', question: '你要观察哪里？', allowedAnswerHints: ['仓门'] }), usage: { inputTokens: 1, cachedInputTokens: 0, outputTokens: 5, reasoningOutputTokens: 0, totalTokens: 6 } },
    ]);
    const result = await handleGatewayRequest('/api/model/keeper/interpret', { context: modelContext(), playerText: '我看看。' }, provider);
    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({ purpose: 'keeper_interpret', candidate: { kind: 'clarify' } });
    expect(provider.requests).toHaveLength(2);
    expect(provider.requests[0]?.maxTokens).toBe(320);
    expect(provider.requests[1]?.messages.at(-1)?.content).toContain('failed the output contract');
  });

  it('does not misreport a persistent model output mismatch as an invalid request', async () => {
    const provider = new FakeModelProvider([{ model: 'deepseek-v4-flash', content: JSON.stringify({ kind: 'clarification', question: '你要观察哪里？', allowedAnswerHints: ['仓门'] }), usage: { inputTokens: 1, cachedInputTokens: 0, outputTokens: 5, reasoningOutputTokens: 0, totalTokens: 6 } }]);
    const result = await handleGatewayRequest('/api/model/keeper/interpret', { context: modelContext(), playerText: '我看看。' }, provider);
    expect(result.status).toBe(502);
    expect(result.body).toMatchObject({ error: { code: 'provider_invalid_response', retryable: true } });
    expect(provider.requests).toHaveLength(2);
  });

  it('limits concurrent model requests and passes non-model requests to Vite', async () => {
    const provider = new FakeModelProvider([{ model: 'deepseek-v4-flash', content: JSON.stringify({ kind: 'clarify', question: '你要观察哪里？', allowedAnswerHints: ['仓门'] }), usage: { inputTokens: 1, cachedInputTokens: 0, outputTokens: 1, reasoningOutputTokens: 0, totalTokens: 2 } }]);
    provider.complete = async (request) => { provider.requests.push(request); await new Promise((resolve) => setTimeout(resolve, 20)); return { model: 'deepseek-v4-flash', content: JSON.stringify({ kind: 'clarify', question: '你要观察哪里？', allowedAnswerHints: ['仓门'] }), usage: { inputTokens: 1, cachedInputTokens: 0, outputTokens: 1, reasoningOutputTokens: 0, totalTokens: 2 } }; };
    const handler = createGatewayHandler(provider);
    const payload = { context: modelContext(), playerText: '我看看。' };
    const results = await Promise.all([invoke(handler, payload), invoke(handler, payload), invoke(handler, payload)]);
    expect(results.filter((result) => result.status === 200)).toHaveLength(2);
    expect(results.filter((result) => result.status === 429)).toHaveLength(1);
    const passThrough = new EventEmitter() as EventEmitter & { method: string; url: string };
    passThrough.method = 'GET'; passThrough.url = '/';
    let forwarded = false;
    await handler(passThrough as never, {} as never, () => { forwarded = true; });
    expect(forwarded).toBe(true);
  });

  it('keeps world proposals ephemeral and disables thinking for stable JSON output', async () => {
    const provider = new FakeModelProvider([{ model: 'deepseek-v4-flash', content: JSON.stringify({ proposals: [] }), usage: { inputTokens: 8, cachedInputTokens: 0, outputTokens: 2, reasoningOutputTokens: 0, totalTokens: 10 } }]);
    const result = await handleGatewayRequest('/api/model/world/propose', { context: modelContext('world_propose'), checkpointId: 'scene-0', allowedTemplateIds: ['temporary-danger'] }, provider);
    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({ purpose: 'world_propose', promptVersion: 'world-v2', candidate: { proposals: [] } });
    expect(provider.requests[0]?.thinking).toBe('disabled');
    expect(provider.requests[0]?.maxTokens).toBe(512);
    expect(provider.requests[0]?.messages[0]?.content).toContain('Required JSON example');
  });

  it('records only redacted server metadata and never blocks the gateway', async () => {
    const provider = new FakeModelProvider([{ model: 'deepseek-v4-flash', content: JSON.stringify({ kind: 'clarify', question: '你要观察哪里？', allowedAnswerHints: ['仓门'] }), usage: { inputTokens: 3, cachedInputTokens: 1, outputTokens: 4, reasoningOutputTokens: 0, totalTokens: 7 } }]);
    const telemetry = new MemoryTelemetrySink();
    const handler = createGatewayHandler(provider, telemetry);
    const result = await invoke(handler, { context: modelContext(), playerText: '个人信息与隐藏真相不应进入遥测。' });
    expect(result.status).toBe(200);
    expect(telemetry.records).toHaveLength(1);
    expect(telemetry.records[0]).toMatchObject({ route: '/api/model/keeper/interpret', purpose: 'keeper_interpret', model: 'deepseek-v4-flash', outcome: 'success', usage: { totalTokens: 7 } });
    expect(JSON.stringify(telemetry.records[0])).not.toContain('隐藏真相');
  });
});
