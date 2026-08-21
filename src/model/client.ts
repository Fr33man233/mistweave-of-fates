import { modelGatewayErrorSchema, modelGatewaySuccessSchema, type KeeperInterpretRequest, type KeeperNarrateRequest, type WorldProposeRequest } from './contracts';

export class ModelGatewayClientError extends Error {
  readonly code: string;
  readonly retryable: boolean;

  constructor(code: string, message: string, retryable: boolean) {
    super(message);
    this.name = 'ModelGatewayClientError';
    this.code = code;
    this.retryable = retryable;
  }
}

async function post(path: string, payload: unknown, signal?: AbortSignal) {
  let response: Response;
  try {
    response = await fetch(path, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      signal,
    });
  } catch {
    throw new ModelGatewayClientError('provider_unavailable', '模型服务暂时无法连接。', true);
  }
  const body = await response.json().catch(() => undefined);
  if (!response.ok) {
    const parsed = modelGatewayErrorSchema.safeParse(body);
    throw new ModelGatewayClientError(
      parsed.success ? parsed.data.error.code : 'model_gateway_error',
      parsed.success ? parsed.data.error.message : '模型服务返回了无法识别的错误。',
      parsed.success ? parsed.data.error.retryable : true,
    );
  }
  return modelGatewaySuccessSchema.parse(body);
}

export function requestKeeperInterpret(request: KeeperInterpretRequest, signal?: AbortSignal) {
  return post('/api/model/keeper/interpret', request, signal);
}

export function requestKeeperNarrate(request: KeeperNarrateRequest, signal?: AbortSignal) {
  return post('/api/model/keeper/narrate', request, signal);
}

export function requestWorldProposal(request: WorldProposeRequest, signal?: AbortSignal) {
  return post('/api/model/world/propose', request, signal);
}
