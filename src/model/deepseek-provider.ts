import { ModelProviderError, type ModelProvider, type ProviderRequest, type ProviderResponse } from './provider.ts';

type DeepSeekUsage = {
  prompt_tokens?: unknown;
  prompt_cache_hit_tokens?: unknown;
  completion_tokens?: unknown;
  completion_tokens_details?: { reasoning_tokens?: unknown };
  total_tokens?: unknown;
};

type DeepSeekResponse = {
  model?: unknown;
  choices?: Array<{ message?: { content?: unknown } }>;
  usage?: DeepSeekUsage;
};

type DeepSeekProviderOptions = {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
};

function integer(value: unknown): number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : 0;
}

function mapStatus(status: number): { code: ConstructorParameters<typeof ModelProviderError>[0]; retryable: boolean } {
  if (status === 401 || status === 403) return { code: 'provider_auth_failed', retryable: false };
  if (status === 402) return { code: 'provider_quota_exhausted', retryable: false };
  if (status === 429) return { code: 'provider_rate_limited', retryable: true };
  if (status >= 500) return { code: 'provider_unavailable', retryable: true };
  return { code: 'provider_request_rejected', retryable: false };
}

export class DeepSeekProvider implements ModelProvider {
  private readonly apiKey: string | undefined;
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;

  constructor(options: DeepSeekProviderOptions = {}) {
    this.apiKey = options.apiKey;
    this.baseUrl = (options.baseUrl ?? 'https://api.deepseek.com').replace(/\/$/, '');
    this.model = options.model ?? 'deepseek-v4-flash';
    this.timeoutMs = options.timeoutMs ?? 15_000;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async complete(request: ProviderRequest): Promise<ProviderResponse> {
    if (!this.apiKey) throw new ModelProviderError('provider_not_configured', 'DeepSeek provider is not configured.', false);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    const abortExternal = () => controller.abort();
    request.signal?.addEventListener('abort', abortExternal, { once: true });
    try {
      const response = await this.fetchImpl(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${this.apiKey}` },
        body: JSON.stringify({
          model: this.model,
          messages: request.messages,
          response_format: { type: 'json_object' },
          max_tokens: request.maxTokens,
          stream: false,
          user_id: request.userId,
          thinking: { type: request.thinking },
        }),
        signal: controller.signal,
      });
      if (!response.ok) {
        const mapped = mapStatus(response.status);
        throw new ModelProviderError(mapped.code, `DeepSeek request failed with status ${response.status}.`, mapped.retryable);
      }
      let parsed: DeepSeekResponse;
      try {
        parsed = JSON.parse(await response.text()) as DeepSeekResponse;
      } catch {
        throw new ModelProviderError('provider_invalid_response', 'DeepSeek returned invalid JSON.', true);
      }
      const content = parsed.choices?.[0]?.message?.content;
      if (typeof content !== 'string' || content.trim().length === 0) {
        throw new ModelProviderError('provider_invalid_response', 'DeepSeek returned empty content.', true);
      }
      const inputTokens = integer(parsed.usage?.prompt_tokens);
      const cachedInputTokens = integer(parsed.usage?.prompt_cache_hit_tokens);
      const outputTokens = integer(parsed.usage?.completion_tokens);
      const reasoningOutputTokens = integer(parsed.usage?.completion_tokens_details?.reasoning_tokens);
      const totalTokens = integer(parsed.usage?.total_tokens) || inputTokens + outputTokens;
      return {
        model: typeof parsed.model === 'string' && parsed.model.length > 0 ? parsed.model : this.model,
        content,
        usage: { inputTokens, cachedInputTokens, outputTokens, reasoningOutputTokens, totalTokens },
      };
    } catch (error) {
      if (error instanceof ModelProviderError) throw error;
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new ModelProviderError('provider_timeout', 'DeepSeek request timed out.', true);
      }
      if (error instanceof Error && error.name === 'AbortError') {
        throw new ModelProviderError('provider_timeout', 'DeepSeek request timed out.', true);
      }
      throw new ModelProviderError('provider_unavailable', 'DeepSeek request could not be completed.', true);
    } finally {
      clearTimeout(timeout);
      request.signal?.removeEventListener('abort', abortExternal);
    }
  }
}
