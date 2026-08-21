import type { V04World } from '../coc/schema';
import type { KeeperFlowState } from '../core/keeper-flow';

export const automationStateVersion = '1.0.0' as const;

export type AutomationState = {
  automationStateVersion: typeof automationStateVersion;
  productVersion: '0.4.0';
  productMode: 'v04';
  world: {
    worldId: string;
    worldSeed: string;
    eventCursor: number;
  };
  character: null | {
    anonymousId: 'active-character';
    occupationId: string;
    gender: string;
    attributes: Record<string, number>;
    skills: Record<string, number>;
    hp: { current: number; max: number };
    san: { current: number; max: number };
    spirituality: { current: number; max: number };
    pathwayId: string | null;
  };
  characterRoster: Array<{
    anonymousId: string;
    occupationId: string;
    active: boolean;
  }>;
  scene: {
    sceneId: string;
    sceneRevision: number;
    locationId: string;
    visibleEntityIds: string[];
    knownFactIds: string[];
    worldProposalCount: number;
  };
  flow: {
    phase: KeeperFlowState['phase'];
    preview: null | {
      requestId: string;
      targetId: string;
      methodId: string;
      difficulty: string;
      riskIds: string[];
      abilityId?: string;
    };
    committedRequestIds: string[];
    lastResolution: null | {
      requestId: string;
      eventIds: string[];
      successLevel: string;
      visibleFactIds: string[];
      abilityId?: string;
      abilitySpiritualityCost?: number;
      abilityDiceModifier?: number;
      abilityInformationTier?: number;
      abilityUnlockedActionIds?: string[];
    };
  };
  feedback: string;
  model: {
    interactionMetadataCount: number;
    externalCalls: number;
    rawTextStored: false;
  };
};

export function projectAutomationState(world: V04World, flow: KeeperFlowState, feedback: string): AutomationState {
  const character = world.characters.find((entry) => entry.characterId === world.activeCharacterId) ?? null;
  return {
    automationStateVersion,
    productVersion: '0.4.0',
    productMode: 'v04',
    world: {
      worldId: world.worldId,
      worldSeed: world.worldSeed,
      eventCursor: world.eventCursor,
    },
    character: character
      ? {
          anonymousId: 'active-character',
          occupationId: character.occupationId,
          gender: character.gender,
          attributes: { ...character.attributes },
          skills: { ...character.skills },
          hp: { ...character.hp },
          san: { current: character.san.current, max: character.san.max },
          spirituality: { current: character.spirituality.current, max: character.spirituality.max },
          pathwayId: character.pathwayId,
        }
      : null,
    characterRoster: world.characters.map((entry, index) => ({ anonymousId: entry.characterId === world.activeCharacterId ? 'active-character' : `character-slot-${index + 1}`, occupationId: entry.occupationId, active: entry.characterId === world.activeCharacterId })),
    scene: {
      sceneId: world.scene.sceneId,
      sceneRevision: world.scene.sceneRevision,
      locationId: world.scene.locationId,
      visibleEntityIds: [...world.scene.visibleEntityIds],
      knownFactIds: [...world.scene.knownFactIds],
      worldProposalCount: world.worldProposals.length,
    },
    flow: {
      phase: flow.phase,
      preview: flow.preview
        ? {
            requestId: flow.preview.requestId,
            targetId: flow.preview.targetId,
            methodId: flow.preview.methodId,
            difficulty: flow.preview.difficulty,
            riskIds: [...flow.preview.riskIds],
            ...(flow.preview.abilityId ? { abilityId: flow.preview.abilityId } : {}),
          }
        : null,
      committedRequestIds: [...flow.committedRequestIds],
      lastResolution: flow.lastResolution
        ? {
            requestId: flow.lastResolution.requestId,
            eventIds: [...flow.lastResolution.eventIds],
            successLevel: flow.lastResolution.successLevel,
            visibleFactIds: [...flow.lastResolution.visibleFactIds],
            ...(flow.lastResolution.abilityId ? { abilityId: flow.lastResolution.abilityId } : {}),
            ...(flow.lastResolution.abilitySpiritualityCost !== undefined ? { abilitySpiritualityCost: flow.lastResolution.abilitySpiritualityCost } : {}),
            ...(flow.lastResolution.abilityDiceModifier !== undefined ? { abilityDiceModifier: flow.lastResolution.abilityDiceModifier } : {}),
            ...(flow.lastResolution.abilityInformationTier !== undefined ? { abilityInformationTier: flow.lastResolution.abilityInformationTier } : {}),
            ...(flow.lastResolution.abilityUnlockedActionIds ? { abilityUnlockedActionIds: [...flow.lastResolution.abilityUnlockedActionIds] } : {}),
          }
        : null,
    },
    feedback,
    model: {
      interactionMetadataCount: world.modelInteractions.length,
      externalCalls: world.modelInteractions.filter((entry) => entry.model !== 'local-deterministic').length,
      rawTextStored: false,
    },
  };
}

export function renderAutomationState(world: V04World, flow: KeeperFlowState, feedback: string): string {
  return JSON.stringify(projectAutomationState(world, flow, feedback));
}

declare global {
  interface Window {
    render_game_to_text?: () => string;
  }
}
