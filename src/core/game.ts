import { createInitialWorld } from '../content/valenport';
import { SeededRng, checkD100, commitEvent } from './rules';
import type { WorldState } from './schema';

export const actionIds = ['event_misdelivered_medical_case', 'event_sealed_warehouse_ledger', 'event_night_whistle'] as const;
export type ActionId = (typeof actionIds)[number];
export type ApproachId = 'safe' | 'risky';
export type CaseState = { stage: 'available' | 'approach' | 'resolved'; approach?: ApproachId };
export type Game = { state: WorldState; log: ReturnType<typeof commitEvent>['event'][]; availableActions: ActionId[]; caseStates: Record<ActionId, CaseState>; legalAttention: number };
const clues: Record<ActionId, string> = { event_misdelivered_medical_case: 'clue_misdelivered_case', event_sealed_warehouse_ledger: 'clue_warehouse_ledger', event_night_whistle: 'clue_night_whistle' };
export function createGame(seed = 'seed_valenport_001'): Game { return { state: createInitialWorld(seed), log: [], availableActions: [...actionIds], legalAttention: 0, caseStates: Object.fromEntries(actionIds.map((id) => [id, { stage: 'available' }])) as Record<ActionId, CaseState> }; }
export function startCase(game: Game, action: ActionId): Game { if (game.caseStates[action].stage !== 'available') return game; return { ...game, caseStates: { ...game.caseStates, [action]: { stage: 'approach' } } }; }
export function chooseApproach(game: Game, action: ActionId, approach: ApproachId): Game {
  if (game.caseStates[action].stage !== 'approach') return game;
  const check = checkD100(approach === 'safe' ? 65 : 45, new SeededRng(`${game.state.worldSeed}:${game.state.eventCursor}:${action}:${approach}`).d100());
  const committed = commitEvent(game.state, { eventType: 'investigation_resolved', actorId: 'char_player', minutes: approach === 'safe' ? 15 : 30 });
  const state = { ...committed.state, clues: { ...committed.state.clues, [clues[action]]: { action, approach, tier: check.tier, roll: check.roll } } };
  return { ...game, state, log: [...game.log, committed.event], legalAttention: game.legalAttention + (approach === 'risky' ? 1 : 0), availableActions: game.availableActions.filter((id) => id !== action), caseStates: { ...game.caseStates, [action]: { stage: 'resolved', approach } } };
}
export function performAction(game: Game, action: ActionId): Game { return chooseApproach(startCase(game, action), action, 'safe'); }
