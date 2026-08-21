import type { IncomingMessage, ServerResponse } from 'node:http';
import { keeperInterpretRequestSchema, keeperInterpretationSchema, keeperNarrateRequestSchema, keeperNarrativeSchema, modelGatewayErrorSchema, modelGatewaySuccessSchema, worldProposalListSchema, worldProposeRequestSchema, type ModelPurpose } from '../../src/model/contracts.ts';
import { buildInterpretMessages, buildNarrateMessages, buildWorldMessages, promptVersion, worldPromptVersion } from '../../src/model/prompts.ts';
import { ModelProviderError, type ModelProvider, type ProviderResponse } from '../../src/model/provider.ts';
import { createFileTelemetrySink, recordTelemetrySafely, type ServerTelemetryRecord, type ServerTelemetrySink } from './telemetry.ts';

const maxBodyBytes = 128 * 1024;
const closedTestUserId = 'mistweave-closed-v04';

export type GatewayResult = { status: number; body: unknown };

function telemetryRecord(path: string, result: GatewayResult, started: number, now: () => number, payload: unknown): ServerTelemetryRecord {
  const body = result.body as { requestId?: unknown; model?: unknown; promptVersion?: unknown; purpose?: unknown; usage?: unknown; error?: { code?: unknown; retryable?: unknown } };
  const usage = body.usage && typeof body.usage === 'object' ? body.usage as ServerTelemetryRecord['usage'] : null;
  const error = body.error;
  const purpose = body.purpose === 'keeper_interpret' || body.purpose === 'keeper_narrate' || body.purpose === 'world_propose' ? body.purpose : null;
  const context = payload && typeof payload === 'object' && 'context' in payload ? (payload as { context?: { requestId?: unknown; purpose?: unknown } }).context : undefined;
  const requestId = typeof body.requestId === 'string' ? body.requestId : typeof context?.requestId === 'string' ? context.requestId : null;
  const requestPurpose = purpose ?? (context?.purpose === 'keeper_interpret' || context?.purpose === 'keeper_narrate' || context?.purpose === 'world_propose' ? context.purpose : null);
  return {
    recordedAt: new Date().toISOString(),
    requestId,
    route: path,
    purpose: requestPurpose,
    model: typeof body.model === 'string' ? body.model : null,
    promptVersion: typeof body.promptVersion === 'string' ? body.promptVersion : null,
    status: result.status,
    outcome: result.status === 200 ? 'success' : error?.code === 'gateway_busy' ? 'busy' : result.status === 400 ? 'rejected' : 'error',
    errorCode: typeof error?.code === 'string' ? error.code : null,
    retryable: error?.retryable === true,
    latencyMs: Math.max(0, now() - started),
    usage,
  };
}

function errorResult(status: number, code: string, message: string, retryable = false): GatewayResult {
  return { status, body: modelGatewayErrorSchema.parse({ error: { code, message, retryable } }) };
}

function candidateJson(response: ProviderResponse): unknown {
  try {
    return JSON.parse(response.content) as unknown;
  } catch {
    throw new ModelProviderError('provider_invalid_response', 'Model output was not valid JSON.', true);
  }
}

async function completeJson(provider: ModelProvider, request: Parameters<ModelProvider['complete']>[0], validate: (candidate: unknown) => unknown): Promise<{ response: ProviderResponse; candidate: unknown }> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const providerRequest = attempt === 0 ? request : {
        ...request,
        messages: [...request.messages, { role: 'user' as const, content: 'Your previous response failed the output contract. Return JSON only, with exactly one legal object and no extra keys. Use the exact literal kind values execute, clarify, or reject.' }],
      };
      const response = await provider.complete(providerRequest);
      let candidate: unknown;
      try {
        candidate = validate(candidateJson(response));
      } catch (error) {
        if (error instanceof Error && error.name === 'ZodError') {
          throw new ModelProviderError('provider_invalid_response', 'Model output failed schema validation.', true);
        }
        throw error;
      }
      return { response, candidate };
    } catch (error) {
      lastError = error;
      if (!(error instanceof ModelProviderError && error.code === 'provider_invalid_response' && error.retryable && attempt === 0)) throw error;
    }
  }
  if (lastError instanceof ModelProviderError) throw lastError;
  throw new ModelProviderError('provider_invalid_response', 'Model output failed validation.', false);
}

function success(requestId: string, purpose: ModelPurpose, response: ProviderResponse, candidate: unknown, latencyMs: number, version = promptVersion): GatewayResult {
  return { status: 200, body: modelGatewaySuccessSchema.parse({ requestId, model: response.model, promptVersion: version, purpose, candidate, usage: response.usage, latencyMs }) };
}

export async function handleGatewayRequest(path: string, payload: unknown, provider: ModelProvider, now: () => number = Date.now): Promise<GatewayResult> {
  const started = now();
  try {
    if (path === '/api/model/keeper/interpret') {
      const request = keeperInterpretRequestSchema.parse(payload);
      const result = await completeJson(provider, { purpose: 'keeper_interpret', messages: buildInterpretMessages(request), maxTokens: 320, thinking: 'disabled', userId: closedTestUserId }, (candidate) => {
        const parsed = keeperInterpretationSchema.parse(candidate);
        if (parsed.kind === 'execute') {
          const catalog = request.context.allowedActionCatalog;
          if (!catalog.targetIds.includes(parsed.targetId) || !catalog.methodIds.includes(parsed.methodId) || !catalog.skillIds.includes(parsed.skillId) || (parsed.abilityId && !catalog.abilityIds.includes(parsed.abilityId)) || parsed.riskIds.some((risk) => !catalog.riskIds.includes(risk))) {
            throw new ModelProviderError('provider_invalid_response', 'Model proposed an unavailable action ID.', false);
          }
        }
        return parsed;
      });
      return success(request.context.requestId, 'keeper_interpret', result.response, result.candidate, Math.max(0, now() - started));
    }
    if (path === '/api/model/keeper/narrate') {
      const request = keeperNarrateRequestSchema.parse(payload);
      const result = await completeJson(provider, { purpose: 'keeper_narrate', messages: buildNarrateMessages(request), maxTokens: 900, thinking: 'disabled', userId: closedTestUserId }, (candidate) => keeperNarrativeSchema.parse(candidate));
      return success(request.context.requestId, 'keeper_narrate', result.response, result.candidate, Math.max(0, now() - started));
    }
    if (path === '/api/model/world/propose') {
      const request = worldProposeRequestSchema.parse(payload);
      const result = await completeJson(provider, { purpose: 'world_propose', messages: buildWorldMessages(request), maxTokens: 512, thinking: 'disabled', userId: closedTestUserId }, (candidate) => {
        const parsed = worldProposalListSchema.parse(candidate);
        if (parsed.proposals.some((proposal) => !request.allowedTemplateIds.includes(proposal.templateId))) {
          throw new ModelProviderError('provider_invalid_response', 'Model proposed an unavailable world template.', false);
        }
        return parsed;
      });
      return success(request.context.requestId, 'world_propose', result.response, result.candidate, Math.max(0, now() - started), worldPromptVersion);
    }
    return errorResult(404, 'unknown_model_route', 'Model route not found.');
  } catch (error) {
    if (error instanceof ModelProviderError) return errorResult(error.code === 'provider_request_rejected' ? 400 : 502, error.code, error.message, error.retryable);
    if (error instanceof Error && error.name === 'ZodError') return errorResult(400, 'invalid_model_request', 'Model request failed schema validation.');
    return errorResult(500, 'model_gateway_error', 'Model gateway failed safely.');
  }
}

async function readBody(request: IncomingMessage): Promise<string> {
  return await new Promise((resolve, reject) => {
    let size = 0;
    const chunks: Buffer[] = [];
    request.on('data', (chunk: Buffer | string) => {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      size += buffer.length;
      if (size > maxBodyBytes) {
        reject(new Error('body_too_large'));
        request.destroy();
        return;
      }
      chunks.push(buffer);
    });
    request.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    request.on('error', reject);
  });
}

export function createGatewayHandler(provider: ModelProvider, telemetry: ServerTelemetrySink = createFileTelemetrySink()) {
  let activeRequests = 0;
  const maxConcurrentRequests = 2;
  return async (request: IncomingMessage, response: ServerResponse, next: () => void) => {
    const path = new URL(request.url ?? '/', 'http://localhost').pathname;
    if (request.method !== 'POST' || !path.startsWith('/api/model/')) {
      next();
      return;
    }
    if (activeRequests >= maxConcurrentRequests) {
      const started = Date.now();
      response.statusCode = 429;
      response.setHeader('content-type', 'application/json; charset=utf-8');
      const result = errorResult(429, 'gateway_busy', 'Model gateway is busy; retry later.', true);
      response.end(JSON.stringify(result.body));
      recordTelemetrySafely(telemetry, telemetryRecord(path, result, started, Date.now, undefined));
      return;
    }
    activeRequests += 1;
    try {
      const raw = await readBody(request);
      const payload = JSON.parse(raw) as unknown;
      const started = Date.now();
      const result = await handleGatewayRequest(path, payload, provider);
      recordTelemetrySafely(telemetry, telemetryRecord(path, result, started, Date.now, payload));
      response.statusCode = result.status;
      response.setHeader('content-type', 'application/json; charset=utf-8');
      response.end(JSON.stringify(result.body));
    } catch (error) {
      const result = errorResult(400, error instanceof Error && error.message === 'body_too_large' ? 'request_too_large' : 'invalid_json', 'Request was rejected before model execution.');
      response.statusCode = 400;
      response.setHeader('content-type', 'application/json; charset=utf-8');
      response.end(JSON.stringify(result.body));
      recordTelemetrySafely(telemetry, telemetryRecord(path, result, Date.now(), Date.now, undefined));
    } finally {
      activeRequests -= 1;
    }
  };
}
