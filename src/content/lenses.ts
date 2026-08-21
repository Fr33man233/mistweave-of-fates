import { stolenBeaconCase } from './cases/stolen-beacon';
import type { Occupation } from '../core/profile';
import type { PathwayId } from '../core/game';

export function occupationLens(occupation: Occupation) {
  const lens = stolenBeaconCase.occupationLenses.find((entry) => entry.occupationId === occupation);
  if (!lens) throw new Error('Occupation lens is unavailable');
  return lens;
}

export function pathwayLens(pathway: PathwayId) {
  const lens = stolenBeaconCase.pathwayLenses.find((entry) => entry.pathwayId === pathway);
  if (!lens) throw new Error('Pathway lens is unavailable');
  return lens;
}

export function effectiveDifficulty(base: number, occupation: Occupation, pathway: PathwayId | null, methodId: string): number {
  const occupationAdjustment = occupationLens(occupation).preferredMethodIds.includes(methodId) ? -5 : 0;
  const pathwayAdjustment = pathway ? (pathwayLens(pathway).methodModifiers[methodId] ?? 0) : 0;
  return Math.max(1, Math.min(100, base + occupationAdjustment + pathwayAdjustment));
}
