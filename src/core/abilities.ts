import {
  activeCharacter,
  type AbilityPressure,
  type AbilityUse,
  type Game,
  type PathwayId,
} from './game';
import { SeededRng, commitEvent } from './rules';
import { updateRecoveryState } from './recovery';
import type { Character } from './schema';

export type AbilityCharge = 1 | 2 | 3;

function requireAbilityUser(game: Game, pathway: PathwayId): Character {
  const character = activeCharacter(game);
  if (!character || character.status !== 'active') throw new Error('An active character is required');
  if (character.pathwayState !== pathway || game.pathwayTracks[pathway].state !== 'ascended') {
    throw new Error('Character has not ascended on this pathway');
  }
  return character;
}

function pressureFor(pathway: PathwayId, charge: AbilityCharge, pressureRoll: number): AbilityPressure {
  const extraCharges = charge - 1;
  if (extraCharges === 0 || pressureRoll > extraCharges * 15) return 'none';
  if (pathway === 'observer') return 'pollution';
  return pressureRoll % 2 === 1 ? 'injury' : 'sanity';
}

function applyAbilityCost(character: Character, charge: AbilityCharge, pressure: AbilityPressure): Character {
  const extraCharges = charge - 1;
  return {
    ...character,
    derived: {
      ...character.derived,
      spirituality: {
        ...character.derived.spirituality,
        current: character.derived.spirituality.current - charge,
      },
      pollution: pressure === 'pollution'
        ? Math.min(100, character.derived.pollution + extraCharges)
        : character.derived.pollution,
      hp: pressure === 'injury'
        ? { ...character.derived.hp, current: Math.max(1, character.derived.hp.current - extraCharges) }
        : character.derived.hp,
      sanity: pressure === 'sanity'
        ? { ...character.derived.sanity, current: Math.max(0, character.derived.sanity.current - (extraCharges * 5)) }
        : character.derived.sanity,
    },
  };
}

export function useAbility(game: Game, pathway: PathwayId, charge: AbilityCharge, seed: string): Game {
  if (![1, 2, 3].includes(charge)) throw new Error('Ability charge must be between 1 and 3');
  const character = requireAbilityUser(game, pathway);
  if (character.derived.spirituality.current < charge) throw new Error('Insufficient spirituality');

  const rng = new SeededRng(seed);
  const roll = rng.d100();
  const pressureRoll = rng.d100();
  const target = 50 + (charge * 10);
  const pressure = pressureFor(pathway, charge, pressureRoll);
  const abilityUse: AbilityUse = {
    pathway,
    abilityId: pathway === 'observer' ? 'trace_sense' : 'danger_trail',
    charge,
    roll,
    target,
    pressureRoll,
    outcome: roll <= target ? 'success' : 'failure',
    pressure,
  };
  const committed = commitEvent(game.state, {
    eventType: 'ability_used',
    actorId: character.characterId,
    minutes: 5,
  });
  const event = {
    ...committed.event,
    randomEvidence: [
      `d100:${roll}`,
      `target:${target}`,
      `pressure_d100:${pressureRoll}`,
      `charge:${charge}`,
    ],
    privateConsequences: [
      `ability_outcome:${abilityUse.outcome}`,
      `ability_pressure:${pressure}`,
    ],
  };
  const updatedCharacter = applyAbilityCost(character, charge, pressure);

  return {
    ...game,
    state: committed.state,
    profile: {
      ...game.profile,
      characters: game.profile.characters.map((entry) =>
        entry.characterId === character.characterId ? updatedCharacter : entry,
      ),
    },
    log: [...game.log, event],
    abilityUses: [...game.abilityUses, abilityUse],
  };
}

export function useAbilityInEvent(game: Game, pathway: PathwayId, charge: AbilityCharge, seed: string, targetActionId?: string): Game {
  const afterAbility = useAbility(game, pathway, charge, seed);
  const character = activeCharacter(afterAbility);
  if (!character) throw new Error('An active character is required');
  const committed = commitEvent(afterAbility.state, { eventType: 'ability_applied_to_investigation', actorId: character.characterId, minutes: 10 });
  const use = afterAbility.abilityUses.at(-1)!;
  const event = { ...committed.event, randomEvidence: [`ability_roll:${use.roll}`, `charge:${charge}`, ...(targetActionId ? [`target:${targetActionId}`] : [])], publicConsequences: [use.outcome === 'success' ? '能力改变了当前任务可尝试的方法，并揭示额外迹象。' : '能力未能改变当前任务方法，但代价已经结算。'] };
  return updateRecoveryState({ ...afterAbility, state: committed.state, log: [...afterAbility.log, event] });
}
