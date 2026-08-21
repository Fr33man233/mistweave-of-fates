import { type CocCharacter, type V04World, v04WorldSchema } from '../coc/schema';

function seededHex(seed: string): string {
  let hash = 2166136261;
  for (const char of seed) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0;
  return hash.toString(16).padStart(8, '0');
}

export function createParallelTingenWorld(seed: string, character: CocCharacter | null = null): V04World {
  const world = {
    schemaVersion: '0.4.0' as const,
    worldId: `parallel-tingen-${seededHex(seed)}`,
    worldSeed: seed,
    contentPackId: 'parallel-tingen-v04',
    rulesetVersion: 'coc7-v04' as const,
    eventCursor: 0,
    characters: character ? [character] : [],
    activeCharacterId: character?.characterId ?? null,
    worldProposals: [],
    scene: {
      sceneId: 'tingen-arrival',
      sceneRevision: 0,
      locationId: 'tingen-riverside',
      visibleEntityIds: ['riverside-noticeboard', 'rain-soaked-crate'],
      knownFactIds: [],
      dangerForeshadowing: ['潮湿石阶上有一道尚未干涸的深色拖痕。'],
    },
    events: [],
    modelInteractions: [],
  };
  return v04WorldSchema.parse(world);
}
