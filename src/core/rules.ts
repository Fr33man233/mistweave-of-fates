import type { WorldState, WorldTime } from './schema';

export class SeededRng {
  private state: number;
  constructor(seed: string) { if (!seed) throw new Error('seed is required'); this.state = [...seed].reduce((value, char) => ((value * 31) + char.codePointAt(0)!) >>> 0, 2166136261); }
  d100(): number { this.state = (Math.imul(this.state, 1664525) + 1013904223) >>> 0; return (this.state % 100) + 1; }
}
export type CheckTier = 'critical_success' | 'success' | 'failure' | 'critical_failure';
export function checkD100(effectiveValue: number, roll: number): { roll: number; tier: CheckTier } {
  if (roll === 1) return { roll, tier: 'critical_success' }; if (roll === 100) return { roll, tier: 'critical_failure' };
  return { roll, tier: roll <= effectiveValue ? 'success' : 'failure' };
}
export function advanceWorldTime(time: WorldTime, minutes: number): WorldTime {
  const total = (time.hour * 60) + time.minute + minutes; return { worldDay: time.worldDay + Math.floor(total / 1440), hour: Math.floor((total % 1440) / 60), minute: total % 60 };
}
export function commitEvent(state: WorldState, input: { eventType: string; actorId: string | null; minutes: number }) {
  const next: WorldState = { ...state, eventCursor: state.eventCursor + 1, worldTime: advanceWorldTime(state.worldTime, input.minutes) };
  return { state: next, event: { schemaVersion: '0.1.0' as const, eventId: `evt_${next.eventCursor}`, eventCursor: next.eventCursor, eventType: input.eventType, worldId: state.worldId, actorId: input.actorId, worldTimeBefore: state.worldTime, worldTimeAfter: next.worldTime, randomEvidence: [], factsAdded: [], factsRemoved: [], stateChanges: [], publicConsequences: [], privateConsequences: [] } };
}
