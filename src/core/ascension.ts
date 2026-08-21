import {
  activeCharacter,
  type ApproachId,
  type AscensionOutcome,
  type Game,
  type MaterialRecord,
  type PathwayId,
  type RitualPreparation,
} from './game';
import { SeededRng, commitEvent } from './rules';
import { updateRecoveryState } from './recovery';
import type { Character } from './schema';

function requireActiveCharacter(game: Game): Character {
  const character = activeCharacter(game);
  if (!character || character.status !== 'active') throw new Error('An active character is required');
  return character;
}

function replaceCharacter(game: Game, replacement: Character): Game {
  return {
    ...game,
    profile: {
      ...game.profile,
      characters: game.profile.characters.map((character) =>
        character.characterId === replacement.characterId ? replacement : character,
      ),
    },
  };
}

function appendEvent(game: Game, eventType: string, minutes: number): Game {
  const committed = commitEvent(game.state, {
    eventType,
    actorId: requireActiveCharacter(game).characterId,
    minutes,
  });
  return { ...game, state: committed.state, log: [...game.log, committed.event] };
}

export function acquireMaterial(game: Game, pathway: PathwayId, approach: ApproachId, sourceActionId = `material:${pathway}:${game.state.eventCursor}`): Game {
  requireActiveCharacter(game);
  if (!['hinted', 'trusted', 'prepared', 'restricted'].includes(game.pathwayTracks[pathway].state)) throw new Error('Pathway material is not available');
  if (game.materials.some((material) => material.pathway === pathway && !material.consumed)) throw new Error('Material already acquired');
  const material: MaterialRecord = { materialId: approach === 'safe' ? 'stabilized_aether_salts' : 'unlicensed_mist_distillate', pathway, sourceActionId, cost: approach === 'safe' ? 2 : 0, risk: approach === 'safe' ? 'low' : 'high', consumed: false };
  let acquired = appendEvent(game, 'material_acquired', approach === 'safe' ? 30 : 15);
  const character = activeCharacter(acquired)!;
  if (approach === 'safe' && character.money.balance < material.cost) throw new Error('Insufficient money for material');
  acquired = replaceCharacter(acquired, { ...character, money: { ...character.money, balance: Math.max(0, character.money.balance - material.cost) } });
  return { ...acquired, legalAttention: acquired.legalAttention + (approach === 'risky' ? 1 : 0), materials: [...acquired.materials, material] };
}

export function advanceTrack(game: Game, pathway: PathwayId): Game {
  const track = game.pathwayTracks[pathway];
  if (track.state !== 'hinted') throw new Error('Pathway lead is not hinted');
  requireActiveCharacter(game);
  const advanced = appendEvent(game, 'pathway_source_trusted', 30);
  return {
    ...advanced,
    pathwayTracks: {
      ...advanced.pathwayTracks,
      [pathway]: { ...track, state: 'trusted' },
    },
  };
}

function preparationFor(approach: ApproachId): RitualPreparation {
  return approach === 'safe'
    ? { approach, materialId: 'stabilized_aether_salts', quality: 2 }
    : { approach, materialId: 'unlicensed_mist_distillate', quality: 3 };
}

export function prepareRitual(game: Game, pathway: PathwayId, approach: ApproachId): Game {
  const track = game.pathwayTracks[pathway];
  if (track.state !== 'trusted') throw new Error('Trusted source is required');
  const character = requireActiveCharacter(game);
  const material = game.materials.find((entry) => entry.pathway === pathway && !entry.consumed && entry.risk === (approach === 'safe' ? 'low' : 'high'));
  if (!material) throw new Error('Material acquisition is required');
  const preparation = preparationFor(approach);
  let prepared = appendEvent(game, 'ritual_prepared', approach === 'safe' ? 60 : 30);

  if (approach === 'risky') {
    prepared = replaceCharacter(prepared, {
      ...character,
      derived: {
        ...character.derived,
        pollution: Math.min(100, character.derived.pollution + 1),
      },
    });
  }

  return {
    ...prepared,
    legalAttention: prepared.legalAttention,
    materials: prepared.materials.map((entry) => entry === material ? { ...entry, consumed: true } : entry),
    pathwayTracks: {
      ...prepared.pathwayTracks,
      [pathway]: { ...track, state: 'prepared', preparation },
    },
  };
}

function ascensionOutcome(roll: number, preparationQuality: number): AscensionOutcome {
  if (roll >= 96) return 'catastrophic_failure';
  if (roll <= 30 + (preparationQuality * 10)) return 'success';
  if (roll <= 50 + (preparationQuality * 10)) return 'costly_success';
  return 'failure';
}

export function attemptAscension(game: Game, pathway: PathwayId, seed: string): Game {
  const character = requireActiveCharacter(game);
  if (character.pathwayState !== null) throw new Error('Character pathway is already locked');
  const track = game.pathwayTracks[pathway];
  if ((track.state !== 'prepared' && track.state !== 'restricted') || !track.preparation) throw new Error('Ritual preparation is required');
  if (track.state === 'restricted') throw new Error('Pathway is restricted after a failed ascension');

  const roll = new SeededRng(seed).d100();
  const outcome = ascensionOutcome(roll, track.preparation.quality);
  const committed = commitEvent(game.state, {
    eventType: 'ascension_attempted',
    actorId: character.characterId,
    minutes: 120,
  });
  const event = {
    ...committed.event,
    randomEvidence: [`d100:${roll}`, `preparation_quality:${track.preparation.quality}`],
    privateConsequences: [`ascension_outcome:${outcome}`],
  };
  const ascension = {
    pathway,
    roll,
    preparationQuality: track.preparation.quality,
    outcome,
  };
  let result: Game = {
    ...game,
    state: committed.state,
    log: [...game.log, event],
    pathwayTracks: {
      ...game.pathwayTracks,
      [pathway]: {
        ...track,
        state: outcome === 'success' || outcome === 'costly_success' ? 'ascended' : 'prepared',
        ascension,
      },
    },
  };

  if (outcome === 'catastrophic_failure') {
    result = replaceCharacter(result, { ...character, status: 'deceased' });
    return updateRecoveryState({
      ...result,
      profile: {
        ...result.profile,
        deceasedIds: result.profile.deceasedIds.includes(character.characterId)
          ? result.profile.deceasedIds
          : [...result.profile.deceasedIds, character.characterId],
        activeCharacterId: null,
      },
    });
  }

  if (outcome === 'failure') {
    return updateRecoveryState(replaceCharacter({ ...result, pathwayTracks: { ...result.pathwayTracks, [pathway]: { ...result.pathwayTracks[pathway], state: 'restricted' } } }, {
      ...character,
      derived: {
        ...character.derived,
        sanity: {
          ...character.derived.sanity,
          current: Math.max(0, character.derived.sanity.current - 8),
        },
      },
    }));
  }

  const otherPathway = pathway === 'observer' ? 'hound' : 'observer';
  const otherTrack = result.pathwayTracks[otherPathway];
  const conflictedPathways: PathwayId[] = otherTrack.state === 'prepared' ? [...new Set([...result.conflictedPathways, otherPathway])] as PathwayId[] : result.conflictedPathways;
  const pathwayTracks = otherTrack.state === 'prepared' ? { ...result.pathwayTracks, [otherPathway]: { ...otherTrack, state: 'restricted' as const } } : result.pathwayTracks;
  const followUpAction = 'event_night_whistle' as const;
  const reopened = result.caseStates[followUpAction].stage === 'resolved'
    ? { ...result, caseStates: { ...result.caseStates, [followUpAction]: { stage: 'available' as const } }, availableActions: result.availableActions.includes(followUpAction) ? result.availableActions : [...result.availableActions, followUpAction] }
    : result;
  return updateRecoveryState(replaceCharacter({ ...reopened, pathwayTracks, conflictedPathways }, {
    ...character,
    pathwayState: pathway,
    derived: {
      ...character.derived,
      spirituality: { current: 8, max: 8 },
      pollution: outcome === 'costly_success'
        ? Math.min(100, character.derived.pollution + 2)
        : character.derived.pollution,
      sanity: outcome === 'costly_success'
        ? { ...character.derived.sanity, current: Math.max(0, character.derived.sanity.current - 5) }
        : character.derived.sanity,
    },
  }));
}

export function recoverPathway(game: Game, pathway: PathwayId): Game {
  const track = game.pathwayTracks[pathway];
  if (track.state !== 'restricted' || track.ascension?.outcome !== 'failure') throw new Error('Pathway has no recoverable failure');
  const recovered = appendEvent(game, 'ascension_recovered', 240);
  return { ...recovered, pathwayTracks: { ...recovered.pathwayTracks, [pathway]: { state: 'trusted', hintOrder: track.hintOrder, preparation: null, ascension: null } } };
}
