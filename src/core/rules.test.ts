import { describe, expect, it } from 'vitest';
import { checkD100, SeededRng, advanceWorldTime, commitEvent } from './rules';
import { createInitialWorld } from '../content/valenport';

describe('deterministic rules', () => {
  it('replays the same D100 sequence for the same seed', () => {
    const a = new SeededRng('amber'); const b = new SeededRng('amber');
    expect(Array.from({ length: 10 }, () => a.d100())).toEqual(Array.from({ length: 10 }, () => b.d100()));
  });
  it('returns D100 rolls within 1 through 100', () => {
    const rng = new SeededRng('bounds');
    expect(Array.from({ length: 100 }, () => rng.d100()).every((roll) => roll >= 1 && roll <= 100)).toBe(true);
  });
  it('gives critical rolls precedence', () => {
    expect(checkD100(100, 100).tier).toBe('critical_failure');
    expect(checkD100(0, 1).tier).toBe('critical_success');
    expect(checkD100(50, 50).tier).toBe('success');
  });
  it('advances time across a day boundary', () => expect(advanceWorldTime({ worldDay: 1, hour: 23, minute: 50 }, 20)).toEqual({ worldDay: 2, hour: 0, minute: 10 }));
  it('commits exactly one cursor and requested time', () => {
    const result = commitEvent(createInitialWorld(), { eventType: 'test', actorId: 'char_player', minutes: 20 });
    expect(result.state.eventCursor).toBe(1); expect(result.state.worldTime).toEqual({ worldDay: 1, hour: 8, minute: 20 });
  });
});
