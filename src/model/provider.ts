import type { ModelPurpose, ModelUsage } from './contracts.ts';

export type ProviderMessage = { role: 'system' | 'user' | 'assistant'; content: string };

export type ProviderRequest = {
  purpose: ModelPurpose;
  messages: ProviderMessage[];
  maxTokens: number;
  thinking: 'enabled' | 'disabled';
  userId: string;
  signal?: AbortSignal;
};

export type ProviderResponse = {
  model: string;
  content: string;
  usage: ModelUsage;
};

export type ProviderErrorCode =
  | 'provider_not_configured'
  | 'provider_auth_failed'
  | 'provider_quota_exhausted'
  | 'provider_rate_limited'
  | 'provider_timeout'
  | 'provider_unavailable'
  | 'provider_invalid_response'
  | 'provider_request_rejected';

export class ModelProviderError extends Error {
  readonly code: ProviderErrorCode;
  readonly retryable: boolean;

  constructor(code: ProviderErrorCode, message: string, retryable: boolean) {
    super(message);
    this.name = 'ModelProviderError';
    this.code = code;
    this.retryable = retryable;
  }
}

export interface ModelProvider {
  complete(request: ProviderRequest): Promise<ProviderResponse>;
}
