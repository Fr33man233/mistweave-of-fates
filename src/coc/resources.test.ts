import { describe, expect, it } from 'vitest';
import { applyResourceCost, calculateHp, calculateSpiritualityMax, formatSan } from './resources';

describe('COC resources', () => {
  it('uses approved HP and spirituality formulas', () => {
    expect(calculateHp({ CON: 55, SIZ: 65 })).toBe(12);
    expect(calculateSpiritualityMax(67, { sequenceBaseBonus: 2, pathwayRankBonus: 1, actingMilestoneBonus: 1, modifier: -1 })).toBe(16);
  });

  it('projects pollution through the SAN presentation and clamps depletion', () => {
    expect(formatSan(45, 70)).toBe('SAN：45/70（轻度污染）');
    expect(applyResourceCost({ current: 2, max: 10 }, 5)).toEqual({ current: 0, max: 10, depleted: true });
  });
});
