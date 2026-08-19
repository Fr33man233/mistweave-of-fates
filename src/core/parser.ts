import type { ActionId, Game } from './game';

const keywords: Array<[string, ActionId]> = [['药箱', 'event_misdelivered_medical_case'], ['药', 'event_misdelivered_medical_case'], ['仓库', 'event_sealed_warehouse_ledger'], ['账册', 'event_sealed_warehouse_ledger'], ['哨声', 'event_night_whistle'], ['夜航', 'event_night_whistle']];

export function parseLocalAction(input: string, game: Game): { action: ActionId | null; message: string } {
  const found = keywords.find(([keyword, action]) => input.trim().includes(keyword) && game.availableActions.includes(action));
  return found ? { action: found[1], message: `已识别行动：${found[0]}` } : { action: null, message: '无法理解该行动；请使用案件相关关键词或选择界面行动。' };
}
