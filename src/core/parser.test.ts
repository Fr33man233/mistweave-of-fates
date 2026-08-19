import { describe, expect, it } from 'vitest';
import { createGame } from './game';
import { parseLocalAction } from './parser';

describe('local action parser', () => {
  it('maps known local keywords to available cases', () => {
    expect(parseLocalAction('我想检查药箱', createGame()).action).toBe('event_misdelivered_medical_case');
    expect(parseLocalAction('去仓库看看', createGame()).action).toBe('event_sealed_warehouse_ledger');
  });
  it('rejects unknown input without inventing an action', () => {
    expect(parseLocalAction('召唤一条龙', createGame()).action).toBeNull();
  });
});
