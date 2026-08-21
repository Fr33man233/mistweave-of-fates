import type { KeeperFlowState } from './keeper-flow';
import type { V04World } from '../coc/schema';

export type V04SceneViewModel = {
  title: string;
  location: string;
  sceneId: string;
  sceneRevision: number;
  visibleEntities: string[];
  dangerForeshadowing: string[];
  knownFacts: string[];
  phase: KeeperFlowState['phase'];
  phaseLabel: string;
  actionFeedback: string;
  nextActions: string[];
  modelBoundary: string;
  canWithdraw: boolean;
};

const phaseLabels: Record<KeeperFlowState['phase'], string> = {
  ready: '等待行动',
  interpreting: '正在整理行动意图',
  preview: '等待玩家确认行动预览',
  narrating: '规则已结算，等待叙事',
};

export function projectV04Scene(world: V04World, flow: KeeperFlowState, feedback = '尚未提交行动。'): V04SceneViewModel {
  const knownFacts = [...world.scene.knownFactIds];
  return {
    title: '廷根河岸',
    location: '平行廷根 · 旧货场河阶',
    sceneId: world.scene.sceneId,
    sceneRevision: world.scene.sceneRevision,
    visibleEntities: [...world.scene.visibleEntityIds],
    dangerForeshadowing: [...world.scene.dangerForeshadowing],
    knownFacts,
    phase: flow.phase,
    phaseLabel: phaseLabels[flow.phase],
    actionFeedback: feedback,
    nextActions: flow.lastResolution?.nextActionIds.length ? [...flow.lastResolution.nextActionIds] : ['observe-crate', 'free-action'],
    modelBoundary: '模型只提出候选；确定性规则引擎负责检定、状态与终局。',
    canWithdraw: flow.phase === 'preview',
  };
}
