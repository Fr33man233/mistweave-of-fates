import { validateParallelCase, type ParallelCaseCore } from '../../case-schema';

export const riverCrateCase: ParallelCaseCore = validateParallelCase({
  caseId: 'case-river-crate', version: '0.4.0', locationIds: ['tingen-riverside', 'old-freight-yard'],
  npcIds: ['dock-clerk-elsa', 'night-porter-jonas', 'apothecary-marta'], truthVariantIds: ['missing-dose', 'misdirected-dose'],
  facts: [
    { factId: 'fact-drag-marks', summary: '木箱旁有从河阶延向仓门的拖痕。', visibility: 'hidden', truthLocked: true },
    { factId: 'fact-relabelled-crate', summary: '药箱外标签被重新粘贴过。', visibility: 'hidden', truthLocked: true },
    { factId: 'fact-salt-smell', summary: '箱内残留不属于药房的盐味。', visibility: 'hidden', truthLocked: true },
  ],
  sources: [
    { sourceId: 'source-crate', label: '木箱现场', factIds: ['fact-drag-marks', 'fact-relabelled-crate'], methods: ['observe-crate'], recoverySourceIds: ['source-yard-ledger'] },
    { sourceId: 'source-clerk', label: '码头登记员口述', factIds: ['fact-relabelled-crate'], methods: ['interview-clerk'], recoverySourceIds: [] },
    { sourceId: 'source-yard-ledger', label: '旧货场登记簿', factIds: ['fact-drag-marks', 'fact-salt-smell'], methods: ['occupation-records', 'trade-ledger'], recoverySourceIds: [] },
    { sourceId: 'source-apothecary', label: '药房收货单', factIds: ['fact-salt-smell'], methods: ['interview-apothecary', 'trade-ledger'], recoverySourceIds: ['source-clerk'] },
  ],
  methods: [
    { methodId: 'observe-crate', label: '现场观察木箱', category: 'observation', targetType: 'crate', minutes: 15, difficulty: 'regular', costIds: [] },
    { methodId: 'interview-clerk', label: '访谈码头登记员', category: 'social', targetType: 'dock-clerk', minutes: 30, difficulty: 'regular', costIds: [] },
    { methodId: 'interview-apothecary', label: '访谈药房收货人', category: 'social', targetType: 'apothecary', minutes: 30, difficulty: 'regular', costIds: [] },
    { methodId: 'occupation-records', label: '以职业权限查登记簿', category: 'occupation', targetType: 'ledger', minutes: 30, difficulty: 'hard', costIds: ['time'] },
    { methodId: 'trade-ledger', label: '交易或交换收货单', category: 'trade', targetType: 'receipt', minutes: 45, difficulty: 'regular', costIds: ['money'] },
  ],
  endings: [
    { endingId: 'quiet-recovery', label: '安静追回药箱', requiredFactIds: ['fact-drag-marks', 'fact-relabelled-crate'], requiredFlags: ['return-crate'], costIds: [] },
    { endingId: 'public-warning', label: '公开警告并封存线索', requiredFactIds: ['fact-relabelled-crate', 'fact-salt-smell'], requiredFlags: ['warn-public'], costIds: ['legal-attention'] },
    { endingId: 'follow-the-shadow', label: '带着代价跟进河岸暗影', requiredFactIds: ['fact-drag-marks', 'fact-salt-smell'], requiredFlags: ['accept-danger'], costIds: ['san-risk'] },
  ],
  occupationLenses: [
    { occupationId: 'apothecary-apprentice', allowedSourceIds: ['source-apothecary', 'source-clerk'], preferredMethodIds: ['interview-apothecary', 'trade-ledger'], costModifiers: { money: -1 } },
    { occupationId: 'reporter', allowedSourceIds: ['source-clerk', 'source-yard-ledger'], preferredMethodIds: ['interview-clerk', 'occupation-records'], costModifiers: { legalAttention: 1 } },
    { occupationId: 'detective', allowedSourceIds: ['source-crate', 'source-yard-ledger'], preferredMethodIds: ['observe-crate', 'occupation-records'], costModifiers: { time: -1 } },
    { occupationId: 'dockworker', allowedSourceIds: ['source-crate', 'source-clerk'], preferredMethodIds: ['observe-crate', 'interview-clerk'], costModifiers: { sanRisk: -1 } },
  ],
  pathwayLenses: [
    { pathwayId: 'seer', methodModifiers: { 'observe-crate': -1 }, informationTiers: { 'fact-drag-marks': 1 } },
    { pathwayId: 'spectator', methodModifiers: { 'interview-clerk': -1 }, informationTiers: { 'fact-relabelled-crate': 1 } },
    { pathwayId: 'sleepless', methodModifiers: { 'occupation-records': -1 }, informationTiers: { 'fact-salt-smell': 1 } },
    { pathwayId: 'hunter', methodModifiers: { 'observe-crate': -1 }, informationTiers: { 'fact-drag-marks': 1 } },
  ],
});
