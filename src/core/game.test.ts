import { describe, expect, it } from 'vitest';
import { activeCharacter, chooseApproach, createGame, getPathwayTracks, recordMeaningfulEvent, startCase } from './game';
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

  it('records the active character as the committed investigation actor', () => {
    const game = createGame();
    const profile = createCharacter(game.profile, 'detective', 'protect the district');
    const next = chooseApproach(startCase({ ...game, profile }, 'event_misdelivered_medical_case'), 'event_misdelivered_medical_case', 'safe');

    expect(next.log[0]?.actorId).toBe('char_1');
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

  it('reveals both pathway leads only after three resolved meaningful events', () => {
    let game = createGame('pathway-seed');
    for (const action of ['event_misdelivered_medical_case', 'event_sealed_warehouse_ledger', 'event_night_whistle'] as const) {
      game = chooseApproach(startCase(game, action), action, 'safe');
    }

    expect(getPathwayTracks(game).observer.state).toBe('hinted');
    expect(getPathwayTracks(game).hound.state).toBe('hinted');
  });

  it('does not count a pathway event without a newly committed game event', () => {
    const game = createGame();

    expect(recordMeaningfulEvent(game).meaningfulEventCount).toBe(0);
  });

  it('uses committed investigation outcomes to order otherwise identical leads', () => {
    const orderFor = (tier: 'success' | 'failure') => {
      const game = createGame();
      return recordMeaningfulEvent({
        ...game,
        meaningfulEventCount: 2,
        recordedEventCursor: 2,
        state: { ...game.state, eventCursor: 3, clues: { first: { tier }, second: { tier }, third: { tier } } },
        caseStates: {
          event_misdelivered_medical_case: { stage: 'resolved', approach: 'safe' },
          event_sealed_warehouse_ledger: { stage: 'resolved', approach: 'risky' },
          event_night_whistle: { stage: 'resolved', approach: 'risky' },
        },
      });
    };

    expect(getPathwayTracks(orderFor('success')).observer.hintOrder).toBe(1);
    expect(getPathwayTracks(orderFor('failure')).hound.hintOrder).toBe(1);
  });

  it('uses player behaviour only to order the two still-investigable leads', () => {
    let observerGame = { ...createGame('observer-path'), profile: createCharacter(createGame('observer-path').profile, 'reporter', 'notice every detail') };
    let houndGame = { ...createGame('hound-path'), profile: createCharacter(createGame('hound-path').profile, 'dockworker', 'face danger to protect the docks') };
    for (const action of ['event_misdelivered_medical_case', 'event_sealed_warehouse_ledger', 'event_night_whistle'] as const) {
      observerGame = chooseApproach(startCase(observerGame, action), action, 'safe');
      houndGame = chooseApproach(startCase(houndGame, action), action, 'risky');
    }

    expect(getPathwayTracks(observerGame).observer.hintOrder).toBe(1);
    expect(getPathwayTracks(observerGame).hound.hintOrder).toBe(2);
    expect(getPathwayTracks(houndGame).hound.hintOrder).toBe(1);
    expect(getPathwayTracks(houndGame).observer.hintOrder).toBe(2);
  });
});
