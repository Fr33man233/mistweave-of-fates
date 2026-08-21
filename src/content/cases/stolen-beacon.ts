import type { CaseCore, InvestigationInstance } from '../../core/investigation-schema';
import { caseCoreSchema } from '../../core/investigation-schema';

export const stolenBeaconCase: CaseCore = caseCoreSchema.parse({
  caseId: 'case_stolen_beacon', version: '0.3.0', truthVariantIds: ['smuggling_cover', 'pollution_cover', 'false_witness'],
  facts: [
    { factId: 'fact_beacon_swapped', visibility: 'hidden', sourceEventId: null },
    { factId: 'fact_true_destination', visibility: 'hidden', sourceEventId: null },
    { factId: 'fact_night_risk', visibility: 'hidden', sourceEventId: null },
  ],
  sources: [
    { sourceId: 'source_scraped_mark', factIds: ['fact_beacon_swapped'], methods: ['method_inspect'], prerequisiteFactIds: [], recoverySourceIds: ['source_watch_ledger'] },
    { sourceId: 'source_watch_ledger', factIds: ['fact_beacon_swapped', 'fact_night_risk'], methods: ['method_interview', 'method_exchange'], prerequisiteFactIds: [], recoverySourceIds: ['source_scraped_mark'] },
    { sourceId: 'source_medic_testimony', factIds: ['fact_true_destination'], methods: ['method_interview'], prerequisiteFactIds: ['fact_beacon_swapped'], recoverySourceIds: ['source_seal_record'] },
    { sourceId: 'source_seal_record', factIds: ['fact_true_destination', 'fact_night_risk'], methods: ['method_exchange', 'method_inspect'], prerequisiteFactIds: [], recoverySourceIds: ['source_medic_testimony'] },
    { sourceId: 'source_tide_trace', factIds: ['fact_night_risk'], methods: ['method_inspect'], prerequisiteFactIds: [], recoverySourceIds: ['source_watch_ledger'] },
  ],
  grammar: { grammarId: 'grammar_minimal_investigation', methods: [
    { methodId: 'method_inspect', label: '现场勘查', targetType: 'scene', sourceIds: ['source_scraped_mark', 'source_seal_record', 'source_tide_trace'], difficulty: 55, minutes: 20, cost: { hp: 0, sanity: 0 } },
    { methodId: 'method_interview', label: '访谈与凭证', targetType: 'witness', sourceIds: ['source_watch_ledger', 'source_medic_testimony'], difficulty: 50, minutes: 30, cost: { legalAttention: 0 } },
    { methodId: 'method_exchange', label: '职业或交易交换', targetType: 'contact', sourceIds: ['source_watch_ledger', 'source_seal_record'], difficulty: 60, minutes: 45, cost: { money: 2 } },
  ] },
  endings: [
    { endingId: 'report_authority', requiredFactIds: ['fact_beacon_swapped', 'fact_night_risk'], requiredFlags: ['reported'] },
    { endingId: 'repair_quietly', requiredFactIds: ['fact_beacon_swapped', 'fact_true_destination'], requiredFlags: ['repaired'] },
    { endingId: 'expose_smuggling', requiredFactIds: ['fact_beacon_swapped', 'fact_true_destination', 'fact_night_risk'], requiredFlags: ['exposed'] },
  ],
  occupationLenses: [
    { occupationId: 'apothecary', allowedSourceIds: ['source_medic_testimony', 'source_tide_trace'], preferredMethodIds: ['method_interview'], costModifiers: {} },
    { occupationId: 'reporter', allowedSourceIds: ['source_watch_ledger', 'source_medic_testimony'], preferredMethodIds: ['method_interview'], costModifiers: { legalAttention: 1 } },
    { occupationId: 'detective', allowedSourceIds: ['source_scraped_mark', 'source_watch_ledger'], preferredMethodIds: ['method_inspect'], costModifiers: {} },
    { occupationId: 'dockworker', allowedSourceIds: ['source_seal_record', 'source_tide_trace'], preferredMethodIds: ['method_exchange'], costModifiers: { money: -1 } },
  ],
  pathwayLenses: [
    { pathwayId: 'observer', methodModifiers: { method_inspect: -10 }, costModifiers: { pollution: 1 } },
    { pathwayId: 'hound', methodModifiers: { method_inspect: -5, method_exchange: -5 }, costModifiers: { hp: 1, sanity: 1 } },
  ],
});

export function createStolenBeaconInstance(seed: string): InvestigationInstance {
  const variant = stolenBeaconCase.truthVariantIds[seed.length % stolenBeaconCase.truthVariantIds.length];
  return { instanceId: `inst_stolen_beacon_${seed}`, caseId: stolenBeaconCase.caseId, truthVariantId: variant, seed, stage: 'investigating', factStates: Object.fromEntries(stolenBeaconCase.facts.map((fact) => [fact.factId, 'unknown'])), sourceStates: Object.fromEntries(stolenBeaconCase.sources.map((source) => [source.sourceId, 'available'])), actionResultKeys: [], flags: [] };
}
