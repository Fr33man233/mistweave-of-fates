import { describe, expect, it } from 'vitest';
import { createInvestigationInstance } from '../../case-schema';
import { riverCrateCase } from './river-crate';

describe('parallel Tingen representative case', () => {
  it('has three method categories, four occupations and double-source facts', () => {
    expect(new Set(riverCrateCase.methods.map((method) => method.category)).size).toBe(4);
    expect(riverCrateCase.occupationLenses).toHaveLength(4);
    for (const fact of riverCrateCase.facts) expect(riverCrateCase.sources.filter((source) => source.factIds.includes(fact.factId)).length).toBeGreaterThanOrEqual(2);
  });

  it('locks truth at instance creation and reproduces it by seed', () => {
    expect(createInvestigationInstance(riverCrateCase, 'fixed-seed')).toEqual(createInvestigationInstance(riverCrateCase, 'fixed-seed'));
    expect(createInvestigationInstance(riverCrateCase, 'fixed-seed').factStates['fact-drag-marks']).toBe('unknown');
  });

  it('retains three legal endings and an explicit recovery source', () => {
    expect(riverCrateCase.endings).toHaveLength(3);
    expect(riverCrateCase.sources.find((source) => source.sourceId === 'source-crate')?.recoverySourceIds).toContain('source-yard-ledger');
  });
});
