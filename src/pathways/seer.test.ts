import { describe, expect, it } from 'vitest';
import { useSeerSequence9Ability } from './seer';

describe('seer sequence 9 event abilities', () => {
  it('adds a dice effect and visible information at normal threat', () => {
    const effect = useSeerSequence9Ability('seer-glimpse', 'observe-crate', 'basic', 3);
    expect(effect.diceModifier).toBe(1);
    expect(effect.informationTier).toBe(1);
    expect(effect.spiritualityCost).toBe(1);
  });

  it('unlocks an extra event action without creating a new fact', () => {
    expect(useSeerSequence9Ability('seer-hunch', 'observe-crate', 'elevated', 2).unlockedActionIds).toEqual(['trace-waterline']);
  });

  it('reduces ability influence at high threat and enforces cost/target boundaries', () => {
    const effect = useSeerSequence9Ability('seer-glimpse', 'observe-crate', 'high', 1);
    expect(effect.effective).toBe(false);
    expect(effect.diceModifier).toBe(0);
    expect(() => useSeerSequence9Ability('seer-hunch', 'other', 'basic', 3)).toThrow('not allowed');
    expect(() => useSeerSequence9Ability('seer-glimpse', 'observe-crate', 'basic', 0)).toThrow('insufficient');
  });
});
