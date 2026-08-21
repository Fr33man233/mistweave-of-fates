import { describe, expect, it } from 'vitest';
import { effectiveDifficulty, occupationLens, pathwayLens } from './lenses';
import type { Occupation } from '../core/profile';

describe('occupation and pathway lenses', () => {
  it('provides four legal occupation lenses without duplicating case content', () => {
    expect((['apothecary', 'reporter', 'detective', 'dockworker'] as Occupation[]).map(occupationLens)).toHaveLength(4);
    expect(new Set(['apothecary', 'reporter', 'detective', 'dockworker'].map((id) => occupationLens(id as never).occupationId)).size).toBe(4);
  });
  it('changes a method or cost without changing the case truth', () => {
    expect(effectiveDifficulty(55, 'detective', 'observer', 'method_inspect')).toBe(40);
    expect(pathwayLens('hound').costModifiers.hp).toBe(1);
  });
});
