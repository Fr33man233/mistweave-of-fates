import { createInitialWorld } from '../content/valenport';
import { SeededRng, checkD100, commitEvent } from './rules';
import { createProfile, type Profile } from './profile';
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
export type AscensionOutcome = 'success' | 'costly_success' | 'failure' | 'catastrophic_failure';
export type AscensionRecord = {
  pathway: PathwayId;
  roll: number;
  preparationQuality: number;
  outcome: AscensionOutcome;
};
export type PathwayTrack = {
  state: 'hidden' | 'hinted' | 'trusted' | 'prepared' | 'ascended';
  hintOrder: 1 | 2 | null;
  preparation: RitualPreparation | null;
  ascension: AscensionRecord | null;
};
export type PathwayTracks = Record<PathwayId, PathwayTrack>;
export type CaseState = { stage: 'available' | 'approach' | 'resolved'; approach?: ApproachId };
export type Game = { state: WorldState; profile: Profile; log: ReturnType<typeof commitEvent>['event'][]; availableActions: ActionId[]; caseStates: Record<ActionId, CaseState>; legalAttention: number; meaningfulEventCount: number; recordedEventCursor: number; pathwayTracks: PathwayTracks };
const clues: Record<ActionId, string> = { event_misdelivered_medical_case: 'clue_misdelivered_case', event_sealed_warehouse_ledger: 'clue_warehouse_ledger', event_night_whistle: 'clue_night_whistle' };
const hiddenTracks = (): PathwayTracks => ({
  observer: { state: 'hidden', hintOrder: null, preparation: null, ascension: null },
  hound: { state: 'hidden', hintOrder: null, preparation: null, ascension: null },
});
export function createGame(seed = 'seed_valenport_001'): Game { return { state: createInitialWorld(seed), profile: createProfile(), log: [], availableActions: [...actionIds], legalAttention: 0, meaningfulEventCount: 0, recordedEventCursor: 0, pathwayTracks: hiddenTracks(), caseStates: Object.fromEntries(actionIds.map((id) => [id, { stage: 'available' }])) as Record<ActionId, CaseState> }; }
export function activeCharacter(game: Game): Character | undefined { return game.profile.characters.find((character) => character.characterId === game.profile.activeCharacterId); }
export function getPathwayTracks(game: Game): PathwayTracks { return game.pathwayTracks; }
function intentIncludes(intent: string, terms: string[]) { const normalized = intent.toLowerCase(); return terms.some((term) => normalized.includes(term)); }
function pathwayWeights(game: Game): Record<PathwayId, number> {
  const character = activeCharacter(game);
  const safeCount = Object.values(game.caseStates).filter((caseState) => caseState.approach === 'safe').length;
  const riskyCount = Object.values(game.caseStates).filter((caseState) => caseState.approach === 'risky').length;
  const tiers = Object.values(game.state.clues).flatMap((clue) => typeof clue === 'object' && clue !== null && 'tier' in clue && typeof clue.tier === 'string' ? [clue.tier] : []);
  const observerResults = tiers.filter((tier) => tier === 'success' || tier === 'critical_success').length;
  const houndResults = tiers.filter((tier) => tier === 'failure' || tier === 'critical_failure').length;
  if (!character) return { observer: safeCount + observerResults, hound: riskyCount + houndResults };
  return {
    observer: safeCount + observerResults + (character.occupationId === 'reporter' ? 2 : 0) + (character.occupationId === 'detective' ? 1 : 0) + (intentIncludes(character.initialIntent, ['notice', 'detail', 'observe', '调查', '真相', '线索']) ? 2 : 0),
    hound: riskyCount * 2 + houndResults + (character.occupationId === 'dockworker' ? 2 : 0) + (character.occupationId === 'detective' ? 1 : 0) + (intentIncludes(character.initialIntent, ['danger', 'protect', 'trail', '危险', '保护', '追踪']) ? 2 : 0),
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
  const state = { ...committed.state, clues: { ...committed.state.clues, [clues[action]]: { action, approach, tier: check.tier, roll: check.roll } } };
  return recordMeaningfulEvent({ ...game, state, log: [...game.log, committed.event], legalAttention: game.legalAttention + (approach === 'risky' ? 1 : 0), availableActions: game.availableActions.filter((id) => id !== action), caseStates: { ...game.caseStates, [action]: { stage: 'resolved', approach } } });
}
export function performAction(game: Game, action: ActionId): Game { return chooseApproach(startCase(game, action), action, 'safe'); }
