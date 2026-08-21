import { describe, expect, it } from 'vitest';
import { addCharacter, createGame, startCase, chooseApproach } from './game';
import { projectScene } from './view-model';

describe('SceneViewModel', () => {
  it('projects committed feedback and identity without hidden truth', () => {
    let game = addCharacter(createGame(), 'detective', '保护港口', { name: '林澈', gender: 'unspecified' });
    game = chooseApproach(startCase(game, 'event_night_whistle'), 'event_night_whistle', 'safe');
    const view = projectScene(game);
    expect(view.profile?.name).toBe('林澈');
    expect(view.feedback.eventType).toBe('investigation_resolved');
    expect(view.caseBoard.confirmedFacts.join(' ')).not.toContain('truthVariantId');
  });
  it('never exposes an unavailable action as a committed action', () => {
    const view = projectScene(createGame());
    expect(view.navigation.actions).toContain('return_main_menu');
  });
  it('only exposes exit while a concrete case is in progress', () => {
    let game = addCharacter(createGame(), 'detective', '保护港口', { name: '林澈', gender: 'female' });
    expect(projectScene(game).navigation.canExit).toBe(false);
    game = startCase(game, 'event_night_whistle');
    expect(projectScene(game).navigation.canExit).toBe(true);
  });
});
