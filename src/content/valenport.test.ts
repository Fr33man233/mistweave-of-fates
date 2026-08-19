import { describe, expect, it } from 'vitest';
import { contentPack } from './valenport';

const requiredEventIds = [
  'event_misdelivered_medical_case',
  'event_sealed_warehouse_ledger',
  'event_night_whistle',
] as const;

describe('content pack', () => {
  it('exposes exactly the required three event IDs', () => {
    const eventIds = contentPack.events.map((event) => event.id);
    expect(eventIds).toEqual(requiredEventIds);
  });

  it('keeps every event id unique', () => {
    const eventIds = contentPack.events.map((event) => event.id);
    expect(new Set(eventIds).size).toBe(eventIds.length);
  });
});
