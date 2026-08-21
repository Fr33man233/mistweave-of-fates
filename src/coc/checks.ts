export type Difficulty = 'regular' | 'hard' | 'extreme';
export type SuccessLevel = 'critical' | 'extreme' | 'hard' | 'regular' | 'failure' | 'fumble';

export type CheckResult = { roll: number; skill: number; difficulty: Difficulty; successLevel: SuccessLevel; passed: boolean };

function threshold(skill: number, difficulty: Difficulty) {
  if (difficulty === 'hard') return Math.floor(skill / 2);
  if (difficulty === 'extreme') return Math.floor(skill / 5);
  return skill;
}

export function resolvePercentile(ones: number, tens: number[], modifier: number): number {
  if (!Number.isInteger(ones) || ones < 0 || ones > 9 || tens.some((value) => !Number.isInteger(value) || value < 0 || value > 9)) throw new Error('invalid percentile dice');
  const candidates = tens.map((tensDigit) => {
    const raw = tensDigit * 10 + ones;
    return raw === 0 ? 100 : raw;
  });
  if (candidates.length === 0) throw new Error('at least one tens die is required');
  if (modifier > 0) return Math.min(...candidates);
  if (modifier < 0) return Math.max(...candidates);
  return candidates[0]!;
}

export function evaluateCheck(skill: number, roll: number, difficulty: Difficulty = 'regular'): CheckResult {
  if (!Number.isInteger(skill) || skill < 0 || skill > 100 || !Number.isInteger(roll) || roll < 1 || roll > 100) throw new Error('invalid COC check input');
  const limit = threshold(skill, difficulty);
  const fumble = roll === 100 || (skill < 50 && roll >= 96);
  const successLevel: SuccessLevel = roll === 1 ? 'critical'
    : fumble ? 'fumble'
      : roll <= Math.floor(skill / 5) && roll <= limit ? 'extreme'
        : roll <= Math.floor(skill / 2) && roll <= limit ? 'hard'
          : roll <= limit ? 'regular'
            : 'failure';
  return { roll, skill, difficulty, successLevel, passed: ['critical', 'extreme', 'hard', 'regular'].includes(successLevel) };
}

export function spendLuck(result: CheckResult, luckAvailable: number): { result: CheckResult; spent: number } | undefined {
  if (result.passed || result.successLevel === 'fumble' || !Number.isInteger(luckAvailable) || luckAvailable < 0) return undefined;
  const target = threshold(result.skill, result.difficulty);
  const spent = result.roll - target;
  if (spent <= 0 || spent > luckAvailable) return undefined;
  return { result: evaluateCheck(result.skill, target, result.difficulty), spent };
}

export function pushCheck(result: CheckResult, replacementRoll: number, playerConfirmedRisk: boolean): CheckResult | undefined {
  if (result.passed || result.successLevel === 'fumble' || !playerConfirmedRisk) return undefined;
  return evaluateCheck(result.skill, replacementRoll, result.difficulty);
}

export type RiskKind = 'passive' | 'player_proactive' | 'automatic_hazard';
export function requiresPlayerConfirmation(risk: RiskKind): boolean {
  return risk === 'player_proactive';
}
