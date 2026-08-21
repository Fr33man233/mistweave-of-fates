import { describe, expect, it } from 'vitest';
import { FakeModelProvider } from './fake-provider';
import { ModelProviderError } from './provider';

const usage = { inputTokens: 12, cachedInputTokens: 0, outputTokens: 8, reasoningOutputTokens: 0, totalTokens: 20 };

describe('FakeModelProvider', () => {
  it('records requests without performing network calls', async () => {
    const provider = new FakeModelProvider([{ model: 'fake-model', content: '{"kind":"clarify"}', usage }]);
    await expect(provider.complete({
      purpose: 'keeper_interpret', messages: [{ role: 'user', content: 'test' }], maxTokens: 100,
      thinking: 'disabled', userId: 'test-user',
    })).resolves.toMatchObject({ model: 'fake-model' });
    expect(provider.requests).toHaveLength(1);
    expect(provider.networkCalls).toBe(0);
  });

  it('replays a configured provider failure', async () => {
    const provider = new FakeModelProvider([new ModelProviderError('provider_timeout', 'Timed out.', true)]);
    await expect(provider.complete({
      purpose: 'keeper_interpret', messages: [{ role: 'user', content: 'test' }], maxTokens: 100,
      thinking: 'disabled', userId: 'test-user',
    })).rejects.toMatchObject({ code: 'provider_timeout', retryable: true });
  });
});
