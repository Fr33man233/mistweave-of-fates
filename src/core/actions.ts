import type { ActionResult, Game } from './game';

export type ActionIntent = {
  instanceId: string;
  requestId: string;
  actionId: string;
  methodId: string;
  targetId?: string;
  abilityId?: string;
  charge?: 1 | 2 | 3;
};

export type ActionResolution = { game: Game; resolution: ActionResult };

function payloadHash(intent: ActionIntent): string {
  const text = JSON.stringify(intent);
  let hash = 2166136261;
  for (const char of text) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0;
  return hash.toString(16);
}

export function submitIdempotent(
  game: Game,
  intent: ActionIntent,
  resolve: (game: Game) => ActionResolution,
): ActionResolution {
  if (!intent.instanceId || !intent.requestId || !intent.actionId || !intent.methodId) throw new Error('Invalid action intent');
  const key = `${intent.instanceId}:${intent.requestId}`;
  const hash = payloadHash(intent);
  const previous = game.actionResults[key];
  if (previous) {
    if (previous.payloadHash !== hash) throw new Error('Request payload conflicts with committed result');
    return { game, resolution: previous };
  }
  const result = resolve(game);
  const committed = { ...result.resolution, requestId: intent.requestId, payloadHash: hash };
  return {
    game: { ...result.game, actionResults: { ...result.game.actionResults, [key]: committed } },
    resolution: committed,
  };
}
