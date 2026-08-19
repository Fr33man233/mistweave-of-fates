import { describe, expect, it } from 'vitest';
import { activeCharacter, chooseApproach, createGame, startCase } from './game';
import { createCharacter } from './profile';

describe('three playable investigations', () => {
  it('reads the selected profile character as the active game character', () => {
    const game = createGame();
    const profile = createCharacter(game.profile, 'detective', 'protect the district');

    expect(activeCharacter({ ...game, profile })?.occupationId).toBe('detective');
  });

  it('resolves a selected case into an authoritative event and clue', () => {
    const game = createGame('case-seed');
    const next = chooseApproach(startCase(game, 'event_misdelivered_medical_case'), 'event_misdelivered_medical_case', 'safe');
    expect(next.state.eventCursor).toBe(1);
    expect(next.state.clues.clue_misdelivered_case).toBeDefined();
    expect(next.log[0]?.eventType).toBe('investigation_resolved');
  });
  it('requires a contact step and gives risky approaches legal attention', () => {
    const contact = startCase(createGame(), 'event_night_whistle');
    expect(contact.caseStates.event_night_whistle.stage).toBe('approach');
    const result = chooseApproach(contact, 'event_night_whistle', 'risky');
    expect(result.caseStates.event_night_whistle.stage).toBe('resolved');
    expect(result.legalAttention).toBe(1);
  });
  it('keeps all three cases available before resolution', () => {
    expect(createGame().availableActions).toEqual(['event_misdelivered_medical_case', 'event_sealed_warehouse_ledger', 'event_night_whistle']);
  });
});
