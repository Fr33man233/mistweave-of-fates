export type SeerAbilityId = 'seer-glimpse' | 'seer-hunch';
export type ThreatLevel = 'basic' | 'elevated' | 'high';
export type SeerAbilityEffect = {
  abilityId: SeerAbilityId;
  targetId: string;
  spiritualityCost: number;
  effective: boolean;
  diceModifier: -1 | 0 | 1;
  informationTier: number;
  unlockedActionIds: string[];
  explanation: string;
};

export function useSeerSequence9Ability(abilityId: SeerAbilityId, targetId: string, threat: ThreatLevel, spirituality: number): SeerAbilityEffect {
  if (!Number.isInteger(spirituality) || spirituality < 0) throw new Error('invalid spirituality');
  if (targetId !== 'observe-crate') throw new Error('seer ability is not allowed for this target');
  const cost = 1;
  if (spirituality < cost) throw new Error('insufficient spirituality');
  const highThreat = threat === 'high';
  if (abilityId === 'seer-glimpse') return {
    abilityId, targetId, spiritualityCost: cost, effective: !highThreat, diceModifier: highThreat ? 0 : 1,
    informationTier: highThreat ? 0 : 1, unlockedActionIds: [],
    explanation: highThreat ? '高威胁压制了占卜的清晰度。' : '短暂的灵性直觉使观察更可靠，并提高可见信息层级。',
  };
  return {
    abilityId, targetId, spiritualityCost: cost, effective: !highThreat, diceModifier: 0,
    informationTier: highThreat ? 0 : 1, unlockedActionIds: highThreat ? [] : ['trace-waterline'],
    explanation: highThreat ? '高威胁下无法安全追踪额外水痕。' : '直觉指出一条可选的水痕追踪入口。',
  };
}
