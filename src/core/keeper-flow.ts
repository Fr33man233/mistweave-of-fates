import type { KeeperInterpretation, KeeperNarrative, ModelContextEnvelope, ResolutionEnvelope } from '../model/contracts';
import { createActionPreview, type ActionPreview, type DeterministicResolver } from './v04-actions';

export type KeeperFlowPhase = 'ready' | 'interpreting' | 'preview' | 'narrating';
export type KeeperFlowState = {
  phase: KeeperFlowPhase;
  sceneRevision: number;
  requestId?: string;
  payloadHash?: string;
  preview?: ActionPreview;
  lastResolution?: ResolutionEnvelope;
  lastNarrative?: KeeperNarrative;
  notice?: { code: string; message: string };
  committedRequestIds: readonly string[];
};

export function createKeeperFlow(sceneRevision = 0): KeeperFlowState {
  return { phase: 'ready', sceneRevision, committedRequestIds: [] };
}

export function beginInterpretation(state: KeeperFlowState, requestId: string, payloadHash: string): KeeperFlowState {
  if (state.phase !== 'ready' || state.committedRequestIds.includes(requestId)) return { ...state, notice: { code: 'request_not_ready', message: '该请求不能再次开始。' } };
  return { ...state, phase: 'interpreting', requestId, payloadHash, notice: undefined };
}

export function receiveInterpretation(state: KeeperFlowState, context: ModelContextEnvelope, candidate: KeeperInterpretation): KeeperFlowState {
  if (state.phase !== 'interpreting' || context.requestId !== state.requestId || context.sceneRevision !== state.sceneRevision) {
    return { ...state, phase: 'ready', preview: undefined, notice: { code: 'stale_candidate', message: '场景已变化，候选未被采用。' } };
  }
  if (candidate.kind === 'clarify') return { ...state, phase: 'ready', notice: { code: 'clarify', message: candidate.question } };
  if (candidate.kind === 'reject') return { ...state, phase: 'ready', notice: { code: candidate.reasonCode, message: candidate.explanation } };
  return { ...state, phase: 'preview', preview: createActionPreview(context, state.payloadHash!, candidate) };
}

export function withdrawPreview(state: KeeperFlowState): KeeperFlowState {
  if (state.phase !== 'preview') return state;
  return { ...state, phase: 'ready', preview: undefined, notice: { code: 'withdrawn', message: '行动预览已撤回，未产生事件。' } };
}

export function confirmPreview(state: KeeperFlowState, resolver: DeterministicResolver): KeeperFlowState {
  if (state.phase !== 'preview' || !state.preview) return { ...state, notice: { code: 'no_preview', message: '没有可确认的行动预览。' } };
  if (state.committedRequestIds.includes(state.preview.requestId)) return { ...state, phase: 'narrating', notice: { code: 'duplicate_request', message: '该请求已经结算。' } };
  const resolution = resolver(state.preview);
  if (resolution.requestId !== state.preview.requestId) throw new Error('resolution requestId mismatch');
  return {
    ...state,
    phase: 'narrating',
    preview: undefined,
    lastResolution: resolution,
    committedRequestIds: [...state.committedRequestIds, resolution.requestId],
    notice: undefined,
  };
}

export function receiveNarration(state: KeeperFlowState, narrative: KeeperNarrative | undefined): KeeperFlowState {
  if (state.phase !== 'narrating') return state;
  return narrative
    ? { ...state, phase: 'ready', lastNarrative: narrative }
    : { ...state, phase: 'ready', notice: { code: 'narration_unavailable', message: '规则结算已保留；叙事暂不可用。' } };
}
