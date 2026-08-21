import type { Game } from './game';

export type SceneViewModel = {
  scene: { locationId: string; stage: string; visibleObjectIds: string[] };
  feedback: { eventType: string | null; message: string; randomEvidence: string[]; changes: string[] };
  caseBoard: { confirmedFacts: string[]; clueIds: string[]; availableMethods: string[]; nextActions: string[] };
  profile: { name: string; gender: string; occupation: string; hp: string; sanity: string; spirituality: string; status: string } | null;
  navigation: { canContinue: boolean; canExit: boolean; canSwitchCharacter: boolean; canStartNew: boolean; actions: string[] };
};

export function projectScene(game: Game): SceneViewModel {
  const character = game.profile.characters.find((entry) => entry.characterId === game.profile.activeCharacterId);
  const latest = game.log.at(-1);
  const confirmedFacts = Object.entries(game.state.clues).map(([id, value]) => {
    const tier = typeof value === 'object' && value !== null && 'tier' in value ? String((value as { tier: unknown }).tier) : 'observed';
    return `${id}:${tier}`;
  });
  const activeCase = Object.entries(game.caseStates).find(([, state]) => state.stage === 'approach');
  const actions = character?.status === 'active' ? ['exit_current_case', 'return_main_menu', 'switch_character'] : ['return_main_menu', 'switch_character', 'start_new_game'];
  return {
    scene: { locationId: character?.locationId ?? 'loc_greyfurnace_apothecary', stage: activeCase?.[1].stage ?? 'resolved', visibleObjectIds: activeCase ? [activeCase[0]] : [] },
    feedback: { eventType: latest?.eventType ?? null, message: latest ? (latest.publicConsequences[0] ?? `已提交事件 #${latest.eventCursor}`) : '等待下一次行动。', randomEvidence: latest?.randomEvidence ?? [], changes: latest?.stateChanges.map((change) => `${change.path}: ${String(change.from)} → ${String(change.to)}`) ?? [] },
    caseBoard: { confirmedFacts, clueIds: Object.keys(game.state.clues), availableMethods: activeCase ? ['method_inspect', 'method_interview', 'method_exchange'] : [], nextActions: actions },
    profile: character ? { name: character.name, gender: character.gender, occupation: character.occupationId, hp: `${character.derived.hp.current}/${character.derived.hp.max}`, sanity: `${character.derived.sanity.current}/${character.derived.sanity.max}`, spirituality: `${character.derived.spirituality.current}/${character.derived.spirituality.max}`, status: character.status } : null,
    navigation: { canContinue: true, canExit: Boolean(character?.status === 'active' && activeCase), canSwitchCharacter: game.profile.characters.some((entry) => entry.status === 'active'), canStartNew: game.profile.characters.length < game.profile.slotLimit, actions },
  };
}
