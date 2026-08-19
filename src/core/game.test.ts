import { describe, expect, it } from 'vitest';
import { chooseApproach, createGame, startCase } from './game';

describe('three playable investigations', () => {
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
