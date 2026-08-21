import { describe, expect, it } from 'vitest';
import { evaluateCheck, pushCheck, requiresPlayerConfirmation, resolvePercentile, spendLuck } from './checks';

describe('COC 7e checks', () => {
  it('evaluates regular, hard, extreme, critical and fumble outcomes', () => {
    expect(evaluateCheck(60, 55).successLevel).toBe('regular');
    expect(evaluateCheck(60, 30, 'hard').successLevel).toBe('hard');
    expect(evaluateCheck(60, 12, 'extreme').successLevel).toBe('extreme');
    expect(evaluateCheck(60, 1).successLevel).toBe('critical');
    expect(evaluateCheck(40, 96).successLevel).toBe('fumble');
    expect(evaluateCheck(60, 96).successLevel).toBe('failure');
  });

  it('cancels bonus and penalty dice and preserves 00 as 100', () => {
    expect(resolvePercentile(5, [7, 2, 4], 1)).toBe(25);
    expect(resolvePercentile(5, [7, 2, 4], -1)).toBe(75);
    expect(resolvePercentile(0, [0], 0)).toBe(100);
  });

  it('allows luck only for a non-fumble failed roll', () => {
    const result = evaluateCheck(60, 68);
    expect(spendLuck(result, 8)?.spent).toBe(8);
    expect(spendLuck(evaluateCheck(40, 96), 100)).toBeUndefined();
  });

  it('allows a pushed reroll only after the player confirms the risk', () => {
    const failed = evaluateCheck(60, 68);
    expect(pushCheck(failed, 32, false)).toBeUndefined();
    expect(pushCheck(failed, 32, true)?.passed).toBe(true);
  });

  it('requires confirmation for proactive risk only', () => {
    expect(requiresPlayerConfirmation('player_proactive')).toBe(true);
    expect(requiresPlayerConfirmation('passive')).toBe(false);
  });
});
