import { createInitialWorld } from '../content/valenport';
import { useAbilityInEvent, type AbilityCharge } from './abilities';
import { submitIdempotent, type ActionResolution } from './actions';
import { SeededRng, checkD100, commitEvent } from './rules';
import { createCharacter, createProfile, type Occupation, type Profile } from './profile';
import type { Character, WorldState } from './schema';

export const actionIds = ['event_misdelivered_medical_case', 'event_sealed_warehouse_ledger', 'event_night_whistle'] as const;
export type ActionId = (typeof actionIds)[number];
export type ApproachId = 'safe' | 'risky';
export const pathwayIds = ['observer', 'hound'] as const;
export type PathwayId = (typeof pathwayIds)[number];
export type RitualPreparation = {
  approach: ApproachId;
  materialId: 'stabilized_aether_salts' | 'unlicensed_mist_distillate';
  quality: 2 | 3;
};
export type MaterialRecord = { materialId: RitualPreparation['materialId']; pathway: PathwayId; sourceActionId: string; cost: number; risk: 'low' | 'high'; consumed: boolean };
export type AscensionOutcome = 'success' | 'costly_success' | 'failure' | 'catastrophic_failure';
export type AscensionRecord = {
  pathway: PathwayId;
  roll: number;
  preparationQuality: number;
  outcome: AscensionOutcome;
};
export type AbilityPressure = 'none' | 'pollution' | 'injury' | 'sanity';
export type AbilityUse = {
  pathway: PathwayId;
  abilityId: 'trace_sense' | 'danger_trail';
  charge: 1 | 2 | 3;
  roll: number;
  target: number;
  pressureRoll: number;
  outcome: 'success' | 'failure';
  pressure: AbilityPressure;
};
export type PathwayTrack = {
  state: 'hidden' | 'hinted' | 'trusted' | 'prepared' | 'restricted' | 'ascended';
  hintOrder: 1 | 2 | null;
  preparation: RitualPreparation | null;
  ascension: AscensionRecord | null;
};
export type PathwayTracks = Record<PathwayId, PathwayTrack>;
export type CaseState = { stage: 'available' | 'approach' | 'resolved'; approach?: ApproachId };
export type ActionResult = { requestId: string; payloadHash: string; resultCode: string; message: string; eventCursors: number[]; factsAdded: string[]; nextActions: string[] };
export type CharacterSession = { clues: Record<string, unknown>; availableActions: ActionId[]; caseStates: Record<ActionId, CaseState>; legalAttention: number; meaningfulEventCount: number; recordedEventCursor: number; pathwayTracks: PathwayTracks; abilityUses: AbilityUse[]; actionResults: Record<string, ActionResult>; materials: MaterialRecord[]; conflictedPathways: PathwayId[]; recoveryState: 'normal' | 'incapacitated' | 'broken' };
export type Game = { state: WorldState; profile: Profile; log: ReturnType<typeof commitEvent>['event'][]; availableActions: ActionId[]; caseStates: Record<ActionId, CaseState>; legalAttention: number; meaningfulEventCount: number; recordedEventCursor: number; pathwayTracks: PathwayTracks; abilityUses: AbilityUse[]; actionResults: Record<string, ActionResult>; materials: MaterialRecord[]; conflictedPathways: PathwayId[]; recoveryState: 'normal' | 'incapacitated' | 'broken'; characterSessions: Record<string, CharacterSession> };
const clues: Record<ActionId, string> = { event_misdelivered_medical_case: 'clue_misdelivered_case', event_sealed_warehouse_ledger: 'clue_warehouse_ledger', event_night_whistle: 'clue_night_whistle' };
const hiddenTracks = (): PathwayTracks => ({
  observer: { state: 'hidden', hintOrder: null, preparation: null, ascension: null },
  hound: { state: 'hidden', hintOrder: null, preparation: null, ascension: null },
});
export function blankCharacterSession(): CharacterSession { return { clues: {}, availableActions: [...actionIds], legalAttention: 0, meaningfulEventCount: 0, recordedEventCursor: 0, pathwayTracks: hiddenTracks(), abilityUses: [], actionResults: {}, materials: [], conflictedPathways: [], recoveryState: 'normal', caseStates: Object.fromEntries(actionIds.map((id) => [id, { stage: 'available' }])) as Record<ActionId, CaseState> }; }
export function createGame(seed = 'seed_valenport_001'): Game { return { state: createInitialWorld(seed), profile: createProfile(), log: [], ...blankCharacterSession(), characterSessions: {} }; }
export function activeCharacter(game: Game): Character | undefined { return game.profile.characters.find((character) => character.characterId === game.profile.activeCharacterId); }
export function captureCharacterSession(game: Game): CharacterSession { return { clues: game.state.clues, availableActions: game.availableActions, caseStates: game.caseStates, legalAttention: game.legalAttention, meaningfulEventCount: game.meaningfulEventCount, recordedEventCursor: game.recordedEventCursor, pathwayTracks: game.pathwayTracks, abilityUses: game.abilityUses, actionResults: game.actionResults, materials: game.materials, conflictedPathways: game.conflictedPathways, recoveryState: game.recoveryState }; }
export function applyCharacterSession(game: Game, session: CharacterSession): Game { return { ...game, state: { ...game.state, clues: session.clues }, ...session }; }
export function syncActiveCharacterSession(game: Game): Game { const active = activeCharacter(game); return active ? { ...game, characterSessions: { ...game.characterSessions, [active.characterId]: captureCharacterSession(game) } } : game; }
export function addCharacter(game: Game, occupation: Occupation, intent: string, identity?: { name?: string; gender?: Character['gender'] }): Game {
  const previous = activeCharacter(game);
  const profile = createCharacter(game.profile, occupation, intent, identity);
  const character = profile.characters.find((entry) => entry.characterId === profile.activeCharacterId)!;
  const committed = commitEvent(game.state, { eventType: 'character_created', actorId: character.characterId, minutes: 0 });
  const event = {
    ...committed.event,
    stateChanges: [{ path: `profile.characters.${character.characterId}`, from: null, to: character.characterId }],
  };
  const sessions = previous ? { ...game.characterSessions, [previous.characterId]: captureCharacterSession(game) } : game.characterSessions;
  return applyCharacterSession({ ...game, state: committed.state, profile, log: [...game.log, event], characterSessions: { ...sessions, [character.characterId]: blankCharacterSession() } }, blankCharacterSession());
}
export function getPathwayTracks(game: Game): PathwayTracks { return game.pathwayTracks; }
function intentIncludes(intent: string, terms: string[]) { const normalized = intent.toLowerCase(); return terms.some((term) => normalized.includes(term)); }
function pathwayWeights(game: Game): Record<PathwayId, number> {
  const character = activeCharacter(game);
  const safeCount = Object.values(game.caseStates).filter((caseState) => caseState.approach === 'safe').length;
  const riskyCount = Object.values(game.caseStates).filter((caseState) => caseState.approach === 'risky').length;
  const tiers = Object.values(game.state.clues).flatMap((clue) => typeof clue === 'object' && clue !== null && 'tier' in clue && typeof clue.tier === 'string' ? [clue.tier] : []);
  const observerResults = tiers.filter((tier) => tier === 'success' || tier === 'critical_success').length;
  const houndResults = tiers.filter((tier) => tier === 'failure' || tier === 'critical_failure').length;
  const observerAbilityUses = game.abilityUses.filter((use) => use.pathway === 'observer').length;
  const houndAbilityUses = game.abilityUses.filter((use) => use.pathway === 'hound').length;
  if (!character) return { observer: safeCount + observerResults, hound: riskyCount + houndResults };
  return {
    observer: safeCount + observerResults + observerAbilityUses + (character.occupationId === 'reporter' ? 2 : 0) + (character.occupationId === 'detective' ? 1 : 0) + (intentIncludes(character.initialIntent, ['notice', 'detail', 'observe', '调查', '真相', '线索']) ? 2 : 0),
    hound: riskyCount * 2 + houndResults + houndAbilityUses + (character.occupationId === 'dockworker' ? 2 : 0) + (character.occupationId === 'detective' ? 1 : 0) + (intentIncludes(character.initialIntent, ['danger', 'protect', 'trail', '危险', '保护', '追踪']) ? 2 : 0),
  };
}
export function recordMeaningfulEvent(game: Game): Game {
  if (game.state.eventCursor <= game.recordedEventCursor) return game;
  const meaningfulEventCount = game.meaningfulEventCount + 1;
  const recordedEventCursor = game.state.eventCursor;
  if (meaningfulEventCount < 3 || game.pathwayTracks.observer.state !== 'hidden' || game.pathwayTracks.hound.state !== 'hidden') return { ...game, meaningfulEventCount, recordedEventCursor };
  const weights = pathwayWeights(game);
  const first: PathwayId = weights.observer >= weights.hound ? 'observer' : 'hound';
  const pathwayTracks: PathwayTracks = first === 'observer'
    ? {
        observer: { state: 'hinted', hintOrder: 1, preparation: null, ascension: null },
        hound: { state: 'hinted', hintOrder: 2, preparation: null, ascension: null },
      }
    : {
        observer: { state: 'hinted', hintOrder: 2, preparation: null, ascension: null },
        hound: { state: 'hinted', hintOrder: 1, preparation: null, ascension: null },
      };
  return { ...game, meaningfulEventCount, recordedEventCursor, pathwayTracks };
}
export function startCase(game: Game, action: ActionId): Game { if (game.caseStates[action].stage !== 'available') return game; return { ...game, caseStates: { ...game.caseStates, [action]: { stage: 'approach' } } }; }
export function chooseApproach(game: Game, action: ActionId, approach: ApproachId): Game {
  if (game.caseStates[action].stage !== 'approach') return game;
  const check = checkD100(approach === 'safe' ? 65 : 45, new SeededRng(`${game.state.worldSeed}:${game.state.eventCursor}:${action}:${approach}`).d100());
  const committed = commitEvent(game.state, { eventType: 'investigation_resolved', actorId: activeCharacter(game)?.characterId ?? 'char_player', minutes: approach === 'safe' ? 15 : 30 });
  const outcomeMessage = check.tier === 'critical_success' || check.tier === 'success'
    ? `调查完成：${approach === 'safe' ? '谨慎方法' : '冒险方法'}得到${check.tier === 'critical_success' ? '关键' : '可用'}线索。`
    : `调查受阻：${approach === 'safe' ? '谨慎方法' : '冒险方法'}未能完整确认线索，但你仍可从其他来源继续。`;
  const event = { ...committed.event, randomEvidence: [`d100:${check.roll}`, `tier:${check.tier}`, `approach:${approach}`], publicConsequences: [outcomeMessage] };
  const state = { ...committed.state, clues: { ...committed.state.clues, [clues[action]]: { action, approach, tier: check.tier, roll: check.roll } } };
  return recordMeaningfulEvent({ ...game, state, log: [...game.log, event], legalAttention: game.legalAttention + (approach === 'risky' ? 1 : 0), availableActions: game.availableActions.filter((id) => id !== action), caseStates: { ...game.caseStates, [action]: { stage: 'resolved', approach } } });
}
export function submitInvestigation(game: Game, action: ActionId, approach: ApproachId, requestId: string): ActionResolution {
  return submitIdempotent(game, { instanceId: `${game.state.worldId}:legacy-investigation`, requestId, actionId: action, methodId: approach }, (current) => {
    const next = chooseApproach(current, action, approach);
    const latest = next.log.at(-1);
    return { game: next, resolution: { requestId, payloadHash: '', resultCode: latest?.eventType ?? 'investigation_resolved', message: latest?.publicConsequences[0] ?? `调查${action}已结算`, eventCursors: latest ? [latest.eventCursor] : [], factsAdded: latest?.factsAdded ?? [], nextActions: next.availableActions } };
  });
}
export function submitInvestigationWithAbility(game: Game, action: ActionId, approach: ApproachId, pathway: PathwayId, charge: AbilityCharge, requestId: string): ActionResolution {
  return submitIdempotent(game, { instanceId: `${game.state.worldId}:investigation`, requestId, actionId: action, methodId: `${approach}:with_ability`, abilityId: pathway, charge }, (current) => {
    const afterAbility = useAbilityInEvent(current, pathway, charge, `${current.state.worldSeed}:${requestId}`, action);
    const next = chooseApproach(afterAbility, action, approach);
    const latest = next.log.at(-1);
    return { game: next, resolution: { requestId, payloadHash: '', resultCode: latest?.eventType ?? 'investigation_resolved', message: `能力已用于当前任务。${latest?.publicConsequences[0] ?? `调查${action}已结算`}`, eventCursors: latest ? [latest.eventCursor] : [], factsAdded: latest?.factsAdded ?? [], nextActions: next.availableActions } };
  });
}
export function performAction(game: Game, action: ActionId): Game { return chooseApproach(startCase(game, action), action, 'safe'); }
