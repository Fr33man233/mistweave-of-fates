import { useAbilityInEvent, type AbilityCharge } from '../../core/abilities';
import type { Game, PathwayId } from '../../core/game';

export function resolvePostAscensionBeaconEvent(game: Game, pathway: PathwayId, charge: AbilityCharge, seed: string, targetActionId?: string): Game {
  if (!game.pathwayTracks[pathway] || game.pathwayTracks[pathway].state !== 'ascended') throw new Error('An ascended pathway is required');
  return useAbilityInEvent(game, pathway, charge, `post-beacon:${seed}:${pathway}:${game.state.eventCursor}`, targetActionId);
}
