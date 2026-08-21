import { describe, expect, it } from 'vitest';
import { validateCaseCore } from './validate';
import { stolenBeaconCase } from './cases/stolen-beacon';

describe('V0.3 content validator', () => {
  it('accepts the representative case', () => expect(validateCaseCore(stolenBeaconCase).caseId).toBe('case_stolen_beacon'));
  it('rejects a fact without two source or recovery entries', () => {
    const broken = { ...stolenBeaconCase, sources: stolenBeaconCase.sources.map((source) => source.sourceId === 'source_watch_ledger' ? { ...source, factIds: ['fact_night_risk'] } : source) };
    expect(() => validateCaseCore(broken)).toThrow('needs two sources');
  });

  it('rejects duplicate ids and dangling lens references', () => {
    const duplicate = { ...stolenBeaconCase, facts: [...stolenBeaconCase.facts, stolenBeaconCase.facts[0]] };
    expect(() => validateCaseCore(duplicate)).toThrow('Duplicate fact id');
    const dangling = { ...stolenBeaconCase, pathwayLenses: stolenBeaconCase.pathwayLenses.map((lens, index) => index === 0 ? { ...lens, methodModifiers: { unknown_method: -10 } } : lens) };
    expect(() => validateCaseCore(dangling)).toThrow('Dangling pathway lens reference');
  });

  it('rejects an ending with no prerequisite facts', () => {
    const broken = { ...stolenBeaconCase, endings: stolenBeaconCase.endings.map((ending, index) => index === 0 ? { ...ending, requiredFactIds: [] } : ending) };
    expect(() => validateCaseCore(broken)).toThrow('has no prerequisite facts');
  });
});
