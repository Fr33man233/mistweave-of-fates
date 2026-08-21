import type { CocAttributes, SanPollutionPresentation, Spirituality } from './schema';

export function calculateHp(attributes: Pick<CocAttributes, 'CON' | 'SIZ'>): number {
  return Math.floor((attributes.CON + attributes.SIZ) / 10);
}

export function calculateSpiritualityMax(pow: number, bonuses: Pick<Spirituality, 'sequenceBaseBonus' | 'pathwayRankBonus' | 'actingMilestoneBonus' | 'modifier'>): number {
  if (!Number.isInteger(pow) || pow < 0 || pow > 100) throw new Error('invalid POW');
  return Math.max(0, Math.floor(pow / 5) + bonuses.sequenceBaseBonus + bonuses.pathwayRankBonus + bonuses.actingMilestoneBonus + bonuses.modifier);
}

export function pollutionPresentation(current: number, max: number): SanPollutionPresentation {
  if (current < 0 || max <= 0 || current > max) throw new Error('invalid SAN meter');
  const ratio = current / max;
  if (ratio > 0.75) return '无污染';
  if (ratio > 0.45) return '轻度污染';
  if (ratio > 0.2) return '中度污染';
  return '重度污染';
}

export function formatSan(current: number, max: number): string {
  return `SAN：${current}/${max}（${pollutionPresentation(current, max)}）`;
}

export function applyResourceCost(resource: { current: number; max: number }, cost: number): { current: number; max: number; depleted: boolean } {
  if (!Number.isInteger(cost) || cost < 0) throw new Error('invalid resource cost');
  const current = Math.max(0, resource.current - cost);
  return { current, max: resource.max, depleted: current === 0 };
}
