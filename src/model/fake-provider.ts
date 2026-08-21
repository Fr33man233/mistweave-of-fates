import { ModelProviderError, type ModelProvider, type ProviderRequest, type ProviderResponse } from './provider';

export type FakeProviderStep = ProviderResponse | ModelProviderError;

export class FakeModelProvider implements ModelProvider {
  readonly requests: ProviderRequest[] = [];
  readonly networkCalls = 0;
  private readonly steps: FakeProviderStep[];

  constructor(steps: FakeProviderStep[]) {
    this.steps = [...steps];
  }

  async complete(request: ProviderRequest): Promise<ProviderResponse> {
    this.requests.push(request);
    const step = this.steps.shift();
    if (!step) throw new ModelProviderError('provider_invalid_response', 'Fake provider has no response configured.', false);
    if (step instanceof ModelProviderError) throw step;
    return step;
  }
}
