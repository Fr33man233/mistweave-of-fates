import { describe, expect, it } from 'vitest';
import { createStolenBeaconInstance, stolenBeaconCase } from './stolen-beacon';

describe('stolen beacon representative case', () => {
  it('has three methods, three endings and two recovery sources per key fact', () => {
    expect(stolenBeaconCase.grammar.methods).toHaveLength(3);
    expect(stolenBeaconCase.endings).toHaveLength(3);
    for (const factId of ['fact_beacon_swapped', 'fact_true_destination']) {
      expect(stolenBeaconCase.sources.filter((source) => source.factIds.includes(factId)).length).toBeGreaterThanOrEqual(2);
    }
  });
  it('freezes truth at instance creation', () => {
    const first = createStolenBeaconInstance('seed-a');
    expect(createStolenBeaconInstance('seed-a')).toEqual(first);
    expect(first.truthVariantId).toBeTruthy();
  });
});
