import { useEffect, useMemo, useState } from 'react';
import type { KeeperInterpretation, KeeperNarrative, ModelContextEnvelope, ResolutionEnvelope } from './model/contracts';
import { keeperInterpretationSchema, keeperNarrativeSchema, modelContextEnvelopeSchema, worldProposalListSchema } from './model/contracts';
import { requestKeeperInterpret, requestKeeperNarrate, requestWorldProposal, ModelGatewayClientError } from './model/client';
import { calculateHp, calculateSpiritualityMax, formatSan, pollutionPresentation } from './coc/resources';
import { cocCharacterSchema, type CocCharacter, type CocGender, type ModelInteractionRecord, type V04World } from './coc/schema';
import { createParallelTingenWorld } from './tingen/world';
import { riverCrateCase } from './tingen/content/cases/river-crate';
import { createInvestigationInstance } from './tingen/case-schema';
import { beginInterpretation, confirmPreview, createKeeperFlow, receiveInterpretation, receiveNarration, withdrawPreview, type KeeperFlowState } from './core/keeper-flow';
import { commitWorldProposal, validateWorldProposalList } from './core/world-proposals';
import { projectV04Scene } from './core/v04-view-model';
import { clearV04, loadV04, saveV04 } from './storage/v04-save';
import { renderAutomationState } from './test-support/automation-state';
import { useSeerSequence9Ability, type SeerAbilityEffect, type SeerAbilityId, type ThreatLevel } from './pathways/seer';

type Props = { onBack: () => void };
type OccupationId = 'apothecary-apprentice' | 'reporter' | 'detective' | 'dockworker';
type ModelMode = 'local' | 'external';
type PendingInterpretation = { requestId: string; text: string; contextHash: string; characterId: string };
type PendingNarration = { requestId: string; context: ModelContextEnvelope; resolution: ResolutionEnvelope; characterId: string };
const occupationLabels: Record<OccupationId, string> = { 'apothecary-apprentice': '药房学徒', reporter: '记者', detective: '警探', dockworker: '码头工人' };
const genderLabels: Partial<Record<CocGender, string>> = { female: '女性', male: '男性' };
const attributeLabels = { STR: '力量', CON: '体质', SIZ: '体型', DEX: '敏捷', APP: '外貌', INT: '智力', POW: '意志', EDU: '教育' } as const;
const skillLabels: Record<string, string> = { spot_hidden: '侦查', listen: '聆听', first_aid: '急救', pharmacy: '药学', biology: '生物学', chemistry: '化学', journalism: '新闻学', library_use: '图书馆使用', persuade: '说服', psychology: '心理学', law: '法律', climb: '攀爬', dodge: '闪避', mechanical_repair: '机械维修' };
type SkillId = 'first_aid' | 'pharmacy' | 'biology' | 'chemistry' | 'journalism' | 'library_use' | 'persuade' | 'psychology' | 'spot_hidden' | 'listen' | 'law' | 'climb' | 'dodge' | 'mechanical_repair';
type SkillAllocations = Partial<Record<SkillId, number>>;
type AttributeId = keyof typeof attributeLabels;
type AttributeAllocations = Partial<Record<AttributeId, number>>;
const occupationSkillPools: Record<OccupationId, readonly SkillId[]> = { 'apothecary-apprentice': ['first_aid', 'pharmacy', 'biology', 'chemistry'], reporter: ['journalism', 'library_use', 'persuade', 'psychology'], detective: ['spot_hidden', 'listen', 'law', 'psychology'], dockworker: ['climb', 'dodge', 'mechanical_repair', 'listen'] };
const allSkillIds: readonly SkillId[] = ['spot_hidden', 'listen', 'first_aid', 'pharmacy', 'biology', 'chemistry', 'journalism', 'library_use', 'persuade', 'psychology', 'law', 'climb', 'dodge', 'mechanical_repair'];
const occupationAttributeTemplates: Record<OccupationId, Record<AttributeId, number>> = {
  'apothecary-apprentice': { STR: 40, CON: 50, SIZ: 45, DEX: 45, APP: 50, INT: 55, POW: 50, EDU: 55 },
  reporter: { STR: 35, CON: 45, SIZ: 45, DEX: 50, APP: 55, INT: 60, POW: 50, EDU: 60 },
  detective: { STR: 45, CON: 50, SIZ: 50, DEX: 60, APP: 45, INT: 60, POW: 55, EDU: 60 },
  dockworker: { STR: 60, CON: 60, SIZ: 65, DEX: 55, APP: 40, INT: 40, POW: 45, EDU: 45 },
};
const freeAttributePointBudget = 100;
const skillBaseValues: Record<SkillId, number> = { spot_hidden: 20, listen: 5, first_aid: 5, pharmacy: 5, biology: 5, chemistry: 5, journalism: 5, library_use: 5, persuade: 5, psychology: 5, law: 5, climb: 5, dodge: 5, mechanical_repair: 5 };
const visibleEntityLabels: Record<string, string> = { 'riverside-noticeboard': '河岸公告栏', 'rain-soaked-crate': '被雨淋湿的木箱' };
const factLabels: Record<string, string> = { 'fact-drag-marks': '木箱旁出现从河阶延向仓门的拖痕。', 'fact-relabelled-crate': '药箱外标签被重新粘贴过。', 'fact-salt-smell': '箱内残留不属于药房的盐味。' };
const seerAbilityLabels: Record<SeerAbilityId, string> = { 'seer-glimpse': '预兆窥视', 'seer-hunch': '灵性直觉' };

function fixedCharacter(characterId: string, name: string, gender: CocGender, occupationId: OccupationId, attributeAllocations: AttributeAllocations, occupationAllocations: SkillAllocations, interestAllocations: SkillAllocations): CocCharacter {
  const template = occupationAttributeTemplates[occupationId];
  const attributes = Object.fromEntries(Object.entries(template).map(([id, value]) => [id, Math.min(100, value + (attributeAllocations[id as AttributeId] ?? 0))])) as Record<AttributeId, number>;
  const hpMax = calculateHp(attributes);
  const sanMax = 70;
  const spiritualityMax = calculateSpiritualityMax(attributes.POW, { sequenceBaseBonus: 0, pathwayRankBonus: 0, actingMilestoneBonus: 0, modifier: 0 });
  const skills: Record<string, number> = {};
  for (const skillId of allSkillIds) skills[skillId] = Math.min(90, skillBaseValues[skillId] + (occupationAllocations[skillId] ?? 0) + (interestAllocations[skillId] ?? 0));
  return cocCharacterSchema.parse({ characterId, name: name.trim(), gender, occupationId, attributes, skills, hp: { current: hpMax, max: hpMax }, san: { current: sanMax, max: sanMax, pollutionPresentation: pollutionPresentation(sanMax, sanMax) }, spirituality: { current: spiritualityMax, max: spiritualityMax, sequenceBaseBonus: 0, pathwayRankBonus: 0, actingMilestoneBonus: 0, modifier: 0 }, conditionIds: [], pathwayId: 'seer', actingPresentation: '占卜家序列 9：初步接受（轻微失控）' });
}

function splitEvenly(total: number, ids: readonly string[], caps: Record<string, number>): Record<string, number> {
  const result: Record<string, number> = Object.fromEntries(ids.map((id) => [id, 0]));
  let remaining = total;
  while (remaining > 0) {
    let changed = false;
    for (const id of ids) {
      if (remaining <= 0) break;
      if ((result[id] ?? 0) < (caps[id] ?? total)) { result[id] = (result[id] ?? 0) + 1; remaining -= 1; changed = true; }
    }
    if (!changed) break;
  }
  return result;
}

function seededRandom(seed: string): () => number {
  let state = 2166136261;
  for (const char of seed) state = Math.imul(state ^ char.charCodeAt(0), 16777619) >>> 0;
  return () => { state = Math.imul(state ^ (state >>> 13), 0x5bd1e995) >>> 0; return state / 0xffffffff; };
}

function splitRandom(total: number, ids: readonly string[], caps: Record<string, number>, seed: string): Record<string, number> {
  const result: Record<string, number> = Object.fromEntries(ids.map((id) => [id, 0]));
  const random = seededRandom(seed);
  let remaining = total;
  let guard = 0;
  while (remaining > 0 && guard < 10_000) {
    const id = ids[Math.floor(random() * ids.length)]!;
    const available = (caps[id] ?? total) - (result[id] ?? 0);
    if (available > 0) { const amount = Math.min(available, 1 + Math.floor(random() * Math.min(20, remaining))); result[id] = (result[id] ?? 0) + amount; remaining -= amount; }
    guard += 1;
  }
  return result;
}

function makeContext(world: V04World, character: CocCharacter, requestId: string, purpose: 'keeper_interpret' | 'keeper_narrate' | 'world_propose', extraMethodIds: readonly string[] = []): ModelContextEnvelope {
  const visibleEntities = world.scene.visibleEntityIds.flatMap((id) => [id, visibleEntityLabels[id] ?? id]);
  const methodIds = [...new Set(['observe-crate', ...extraMethodIds])];
  return modelContextEnvelopeSchema.parse({ schemaVersion: '0.4.0', requestId, worldId: world.worldId, sceneId: world.scene.sceneId, sceneRevision: world.scene.sceneRevision, purpose, playerVisibleContext: { location: '廷根河岸旧货场河阶', time: '雨后傍晚', visibleEntities, knownFactIds: world.scene.knownFactIds, dangerForeshadowing: world.scene.dangerForeshadowing }, characterProjection: { characterId: 'anonymous-player-character', name: '调查员', occupationId: character.occupationId, relevantSkills: character.skills, hp: character.hp, san: { current: character.san.current, max: character.san.max, presentation: formatSan(character.san.current, character.san.max) }, spirituality: { current: character.spirituality.current, max: character.spirituality.max }, conditionIds: character.conditionIds, unlockedAbilityIds: character.pathwayId === 'seer' ? ['seer-glimpse', 'seer-hunch'] : [] }, allowedActionCatalog: { targetIds: ['rain-soaked-crate'], methodIds, skillIds: ['spot_hidden'], abilityIds: character.pathwayId === 'seer' ? ['seer-glimpse', 'seer-hunch'] : [], riskIds: ['noticed', 'san-risk'] }, conversationWindow: [], conversationSummary: '无', contentPackId: world.contentPackId, rulesetVersion: world.rulesetVersion, promptVersion: 'v04-ui-local-preview' });
}

function deterministicCandidate(playerText: string, abilityId?: SeerAbilityId): KeeperInterpretation {
  if (playerText.includes('水痕') || playerText.includes('追踪')) return { kind: 'execute', targetId: 'rain-soaked-crate', methodId: 'trace-waterline', skillId: 'spot_hidden', ...(abilityId ? { abilityId } : {}), proposedDifficulty: 'hard', riskIds: ['noticed'], rationale: '沿着已经发现的水痕追踪到仓门附近，寻找可复核的现场入口。' };
  if (playerText.includes('木箱') || playerText.includes('划痕') || playerText.includes('拖痕')) return { kind: 'execute', targetId: 'rain-soaked-crate', methodId: 'observe-crate', skillId: 'spot_hidden', ...(abilityId ? { abilityId } : {}), proposedDifficulty: 'regular', riskIds: ['noticed'], rationale: '检查可见木箱与周围拖痕，寻找不改变现场的线索。' };
  return { kind: 'clarify', question: '你想观察木箱，还是与公告栏附近的人交谈？', allowedAnswerHints: ['检查木箱上的划痕', '询问码头登记员'] };
}

function threatForDifficulty(difficulty: NonNullable<KeeperFlowState['preview']>['difficulty']): ThreatLevel {
  return difficulty === 'extreme' ? 'high' : difficulty === 'hard' ? 'elevated' : 'basic';
}

function deterministicResolution(preview: NonNullable<KeeperFlowState['preview']>, cursor: number): ResolutionEnvelope {
  const ability = preview.abilityEffect;
  const baseChange = preview.methodId === 'trace-waterline' ? '你沿着水痕追踪到仓门附近，确认拖痕没有被雨水完全冲掉。' : '你在木箱边缘确认了一组从河阶延向仓门的拖痕。';
  return {
    schemaVersion: '0.4.0', requestId: preview.requestId, eventIds: [`v04-action-${cursor}`], actionId: preview.methodId, targetId: preview.targetId, methodId: preview.methodId, skillId: preview.skillId, difficulty: preview.difficulty, roll: 34, successLevel: 'regular',
    visibleChanges: [baseChange], visibleFactIds: ['fact-drag-marks'], nextActionIds: [...new Set(['free-action', ...(ability?.unlockedActionIds ?? [])])],
    ...(ability ? { abilityId: ability.abilityId, abilitySpiritualityCost: ability.spiritualityCost, abilityEffective: ability.effective, abilityDiceModifier: ability.diceModifier, abilityInformationTier: ability.informationTier, abilityUnlockedActionIds: ability.unlockedActionIds, abilityExplanation: ability.explanation } : {}),
  };
}

function fingerprint(value: string): string {
  let hash = 2166136261;
  for (const char of value) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0;
  return `fnv1a-${hash.toString(16)}`;
}

function interactionRecord(requestId: string, purpose: ModelInteractionRecord['purpose'], model: string, promptVersion: string, contextHash: string, resultKind: ModelInteractionRecord['resultKind'], latencyMs: number, usage: ModelInteractionRecord['usage'], errorCode: string | null = null, eventIds: string[] = []): ModelInteractionRecord {
  return { requestId, purpose, model, promptVersion, contextHash, resultKind, latencyMs, usage, errorCode, eventIds };
}

function localInteraction(requestId: string, contextHash: string, resultKind: ModelInteractionRecord['resultKind'], eventIds: string[] = [], purpose: ModelInteractionRecord['purpose'] = 'keeper_interpret'): ModelInteractionRecord {
  return interactionRecord(requestId, purpose, 'local-deterministic', 'v04-ui-local-preview', contextHash, resultKind, 0, { inputTokens: 0, cachedInputTokens: 0, outputTokens: 0, reasoningOutputTokens: 0, totalTokens: 0 }, null, eventIds);
}

const staticNarrative: KeeperNarrative = { narrative: '你沿着木箱边缘检查，雨水把旧划痕洗得更清楚；河阶下方似乎还有人来过。', npcReactions: [] };

export function V04App({ onBack }: Props) {
  const [world, setWorld] = useState<V04World>(() => createParallelTingenWorld('v04-ui-demo'));
  const [flow, setFlow] = useState<KeeperFlowState>(() => createKeeperFlow(0));
  const [name, setName] = useState('');
  const [gender, setGender] = useState<CocGender | ''>('');
  const [occupation, setOccupation] = useState<OccupationId>('detective');
  const [attributeAllocations, setAttributeAllocations] = useState<AttributeAllocations>({});
  const [occupationSkillAllocations, setOccupationSkillAllocations] = useState<SkillAllocations>({});
  const [interestSkillAllocations, setInterestSkillAllocations] = useState<SkillAllocations>({});
  const [playerText, setPlayerText] = useState('');
  const [feedback, setFeedback] = useState('先创建角色，再选择任务中的行动。');
  const [modelStatus, setModelStatus] = useState('未调用模型：本切片默认使用本地确定性候选。');
  const [modelMode, setModelMode] = useState<ModelMode>('local');
  const [requestCounter, setRequestCounter] = useState(0);
  const [lastInterpretationMode, setLastInterpretationMode] = useState<ModelMode>('local');
  const [pendingInterpretation, setPendingInterpretation] = useState<PendingInterpretation | null>(null);
  const [pendingNarration, setPendingNarration] = useState<PendingNarration | null>(null);
  const [selectedAbilityId, setSelectedAbilityId] = useState<SeerAbilityId | ''>('');
  const [environmentNotice, setEnvironmentNotice] = useState('尚未出现新的环境提案。');
  const [worldProposalPending, setWorldProposalPending] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const character = world.characters.find((entry) => entry.characterId === world.activeCharacterId) ?? null;
  const instance = useMemo(() => createInvestigationInstance(riverCrateCase, world.worldSeed), [world.worldSeed]);
  const scene = projectV04Scene(world, flow, feedback);
  const template = occupationAttributeTemplates[occupation];
  const allocatedAttributePoints = Object.values(attributeAllocations).reduce((sum, value) => sum + (value ?? 0), 0);
  const remainingAttributePoints = freeAttributePointBudget - allocatedAttributePoints;
  const previewAttributes = Object.fromEntries(Object.entries(template).map(([id, value]) => [id, value + (attributeAllocations[id as AttributeId] ?? 0)])) as Record<AttributeId, number>;
  const occupationSkillPointBudget = Math.floor(previewAttributes.EDU / 5) * 20;
  const interestSkillPointBudget = Math.floor(previewAttributes.INT / 5) * 10;
  const allocatedOccupationSkillPoints = Object.values(occupationSkillAllocations).reduce((sum, value) => sum + (value ?? 0), 0);
  const allocatedInterestSkillPoints = Object.values(interestSkillAllocations).reduce((sum, value) => sum + (value ?? 0), 0);
  const remainingOccupationSkillPoints = occupationSkillPointBudget - allocatedOccupationSkillPoints;
  const remainingInterestSkillPoints = interestSkillPointBudget - allocatedInterestSkillPoints;

  useEffect(() => {
    let mounted = true;
    void loadV04().then((saved) => { if (mounted && saved) { setWorld(saved.world); setFlow(createKeeperFlow(saved.world.scene.sceneRevision)); setEnvironmentNotice(saved.world.worldProposals.at(-1)?.visibleForeshadowing ?? '尚未出现新的环境提案。'); setFeedback(`已恢复 V0.4 本地快照；${saved.world.events.at(-1)?.visibleSummary ?? '暂无已提交事件'} 历史模型请求不会自动重放。`); } if (mounted) setHydrated(true); });
    return () => { mounted = false; };
  }, []);
  useEffect(() => { if (hydrated && world.characters.length > 0) void saveV04({ schemaVersion: '0.4.0', world }); }, [hydrated, world]);
  useEffect(() => { if (import.meta.env.VITE_E2E !== '1') return; window.render_game_to_text = () => renderAutomationState(world, flow, feedback); return () => { delete window.render_game_to_text; }; }, [feedback, flow, world]);

  const updateInteraction = (record: ModelInteractionRecord) => setWorld((current) => ({ ...current, modelInteractions: [...current.modelInteractions.filter((entry) => entry.requestId !== record.requestId), record].slice(-128) }));
  const resetAllocations = () => { setAttributeAllocations({}); setOccupationSkillAllocations({}); setInterestSkillAllocations({}); };
  const resetCreation = () => { setName(''); setGender(''); resetAllocations(); };
  const create = () => {
    if (!name.trim() || !gender || world.characters.length >= 3) return;
    const characterId = `v04-character-${world.eventCursor + 1}`;
    const next = fixedCharacter(characterId, name, gender, occupation, attributeAllocations, occupationSkillAllocations, interestSkillAllocations);
    setWorld((current) => ({ ...current, characters: [...current.characters, next], activeCharacterId: next.characterId, events: [...current.events, { eventId: `character-created-${current.eventCursor + 1}`, cursor: current.eventCursor + 1, type: 'character_created', actorId: next.characterId, visibleSummary: '角色档案已创建。' }], eventCursor: current.eventCursor + 1 }));
    setFlow(createKeeperFlow(world.scene.sceneRevision)); setFeedback('角色档案已创建；廷根河岸的最小调查场景已开放。'); resetCreation();
  };
  const beginNewCharacter = () => { if (world.characters.length >= 3) return; setWorld((current) => ({ ...current, activeCharacterId: null })); setFlow(createKeeperFlow(world.scene.sceneRevision)); setPendingInterpretation(null); setPendingNarration(null); setSelectedAbilityId(''); setFeedback('请选择或创建一个人物档案。'); resetCreation(); };
  const switchCharacter = (characterId: string) => { if (!world.characters.some((entry) => entry.characterId === characterId)) return; setWorld((current) => ({ ...current, activeCharacterId: characterId })); setFlow(createKeeperFlow(world.scene.sceneRevision)); setPendingInterpretation(null); setPendingNarration(null); setSelectedAbilityId(''); setFeedback('已切换人物档案；未提交行动候选已丢弃。'); };
  const requestEnvironmentProposal = async (mode: 'local' | 'external') => {
    if (!character) return;
    if (worldProposalPending) return;
    const requestId = `v04-world-request-${world.scene.sceneRevision + 1}`;
    const checkpointId = `scene-${world.scene.sceneRevision}`;
    setWorldProposalPending(true);
    try {
      const context = makeContext(world, character, requestId, 'world_propose');
      const started = Date.now();
      let candidate: unknown;
      let modelRecord: ModelInteractionRecord;
      if (mode === 'local') {
        candidate = { proposals: [{ proposalId: `v04-proposal-${world.scene.sceneRevision + 1}`, templateId: 'temporary-danger', subjectIds: ['rain-soaked-crate'], triggerId: checkpointId, proposedParameters: { intensity: 1 }, visibleForeshadowing: '木箱下方的水声突然变得更近，周围的人开始留意河阶。', expiresAtCheckpoint: world.scene.sceneRevision + 2 }] };
        modelRecord = localInteraction(requestId, fingerprint(JSON.stringify(candidate)), 'execute', [], 'world_propose');
      } else {
        const result = await requestWorldProposal({ context, checkpointId, allowedTemplateIds: ['temporary-danger'] });
        candidate = result.candidate;
        modelRecord = interactionRecord(requestId, 'world_propose', result.model, result.promptVersion, fingerprint(JSON.stringify(context)), 'execute', Date.now() - started, result.usage);
      }
      const accepted = validateWorldProposalList(worldProposalListSchema.parse(candidate), context, checkpointId, ['temporary-danger']);
      const committed = accepted[0] ? commitWorldProposal({ checkpointId, sceneRevision: world.scene.sceneRevision, ephemeralProposals: world.worldProposals }, accepted[0]) : { checkpointId, sceneRevision: world.scene.sceneRevision, ephemeralProposals: world.worldProposals };
      setWorld((current) => ({ ...current, worldProposals: committed.ephemeralProposals, modelInteractions: [...current.modelInteractions.filter((entry) => entry.requestId !== requestId), modelRecord].slice(-128) }));
      setEnvironmentNotice(accepted[0]?.visibleForeshadowing ?? '环境提案为空；当前世界状态未新增提案。');
      setFeedback(mode === 'local' ? '环境提案已通过模板与可见对象校验；它不会改变隐藏真相或直接提交事件。' : '真实世界模型提案已通过本地模板、可见对象与检查点校验；它不会直接提交事件。');
    } catch (error) {
      const typed = error instanceof ModelGatewayClientError ? error : null;
      if (mode === 'external') updateInteraction(interactionRecord(requestId, 'world_propose', 'deepseek-v4-flash', 'keeper-v1', fingerprint(`${world.worldId}:${world.scene.sceneRevision}`), 'error', 0, { inputTokens: 0, cachedInputTokens: 0, outputTokens: 0, reasoningOutputTokens: 0, totalTokens: 0 }, typed?.code ?? 'world_proposal_invalid'));
      setFeedback(mode === 'external' ? '真实世界模型提案未通过本地校验；世界状态没有改变。' : '环境提案未通过边界校验；世界状态没有改变。');
    } finally {
      setWorldProposalPending(false);
    }
  };

  const setAttributeAllocation = (attributeId: AttributeId, rawValue: string) => { const requested = Math.max(0, Math.min(100 - template[attributeId], Number.parseInt(rawValue, 10) || 0)); const otherPoints = allocatedAttributePoints - (attributeAllocations[attributeId] ?? 0); setAttributeAllocations((current) => ({ ...current, [attributeId]: Math.min(requested, freeAttributePointBudget - otherPoints) })); };
  const setSkillAllocation = (kind: 'occupation' | 'interest', skillId: SkillId, rawValue: string) => { const allocations = kind === 'occupation' ? occupationSkillAllocations : interestSkillAllocations; const budget = kind === 'occupation' ? occupationSkillPointBudget : interestSkillPointBudget; const allocated = kind === 'occupation' ? allocatedOccupationSkillPoints : allocatedInterestSkillPoints; const requested = Math.max(0, Math.min(85, Number.parseInt(rawValue, 10) || 0)); const otherPoints = allocated - (allocations[skillId] ?? 0); const nextValue = Math.min(requested, budget - otherPoints); if (kind === 'occupation') setOccupationSkillAllocations((current) => ({ ...current, [skillId]: nextValue })); else setInterestSkillAllocations((current) => ({ ...current, [skillId]: nextValue })); };
  const skillPreviewValue = (skillId: SkillId) => Math.min(90, skillBaseValues[skillId] + (occupationSkillAllocations[skillId] ?? 0) + (interestSkillAllocations[skillId] ?? 0));
  const applyAllocationPreset = (mode: 'random' | 'even') => { const attributeCaps = Object.fromEntries((Object.keys(attributeLabels) as AttributeId[]).map((id) => [id, 100 - template[id]])); const occupationCaps = Object.fromEntries(occupationSkillPools[occupation].map((id) => [id, 85])); const interestCaps = Object.fromEntries(allSkillIds.map((id) => [id, 85])); const suffix = `${world.worldSeed}:${occupation}:${mode}`; const allocate = (total: number, ids: readonly string[], caps: Record<string, number>, seed: string) => mode === 'even' ? splitEvenly(total, ids, caps) : splitRandom(total, ids, caps, seed); const nextAttributes = allocate(freeAttributePointBudget, Object.keys(attributeLabels), attributeCaps, suffix) as AttributeAllocations; const nextOccupationBudget = Math.floor((template.EDU + (nextAttributes.EDU ?? 0)) / 5) * 20; const nextInterestBudget = Math.floor((template.INT + (nextAttributes.INT ?? 0)) / 5) * 10; setAttributeAllocations(nextAttributes); setOccupationSkillAllocations(allocate(nextOccupationBudget, occupationSkillPools[occupation], occupationCaps, `${suffix}:occupation`) as SkillAllocations); setInterestSkillAllocations(allocate(nextInterestBudget, allSkillIds, interestCaps, `${suffix}:interest`) as SkillAllocations); };

  const abilityEffectForPreview = (preview: NonNullable<KeeperFlowState['preview']>, abilityId: SeerAbilityId | ''): SeerAbilityEffect | undefined => {
    if (!abilityId || !character || character.pathwayId !== 'seer') return undefined;
    try { return useSeerSequence9Ability(abilityId, preview.targetId === 'rain-soaked-crate' ? 'observe-crate' : preview.targetId, threatForDifficulty(preview.difficulty), character.spirituality.current); }
    catch { return undefined; }
  };
  const decoratePreview = (next: KeeperFlowState, abilityId: SeerAbilityId | '') => {
    if (!next.preview || !abilityId) return next;
    const effect = abilityEffectForPreview(next.preview, abilityId);
    if (!effect) return { ...next, phase: 'ready' as const, preview: undefined, notice: { code: 'ability_unavailable', message: '当前灵性或目标不满足该能力的使用条件。' } };
    return { ...next, preview: { ...next.preview, abilityEffect: effect, diceSources: effect.diceModifier ? [...next.preview.diceSources, `占卜：${effect.diceModifier > 0 ? '奖励骰' : '惩罚骰'}`] : next.preview.diceSources, resourceCostSummary: `确认后消耗 ${effect.spiritualityCost} 点灵性；${effect.explanation}` } };
  };
  const applyPlayerAbility = (candidate: KeeperInterpretation): KeeperInterpretation => {
    if (candidate.kind !== 'execute') return candidate;
    const { abilityId: _modelAbility, ...withoutModelAbility } = candidate;
    return selectedAbilityId ? { ...withoutModelAbility, abilityId: selectedAbilityId } : withoutModelAbility;
  };

  const runExternalInterpretation = async (requestId: string, text: string, context: ModelContextEnvelope, contextHash: string, currentCharacterId: string) => {
    try {
      const result = await requestKeeperInterpret({ context, playerText: text });
      const candidate = applyPlayerAbility(keeperInterpretationSchema.parse(result.candidate));
      const next = decoratePreview(receiveInterpretation({ ...flow, phase: 'interpreting', requestId, payloadHash: `external:${text}` }, context, candidate), selectedAbilityId);
      setFlow(next); setLastInterpretationMode('external'); setPendingInterpretation(null); updateInteraction(interactionRecord(requestId, 'keeper_interpret', result.model, result.promptVersion, contextHash, candidate.kind, result.latencyMs, result.usage)); setFeedback(next.notice?.message ?? (next.preview ? '模型已提出行动候选，请检查预览后确认。' : '模型请求了更明确的行动意图。')); setModelStatus(`真实模型已返回候选：${candidate.kind}；未自动提交规则状态。`);
    } catch (error) {
      const typed = error instanceof ModelGatewayClientError ? error : new ModelGatewayClientError('model_gateway_error', '模型请求失败。', true);
      setFlow(createKeeperFlow(world.scene.sceneRevision)); setPendingInterpretation({ requestId, text, contextHash, characterId: currentCharacterId }); updateInteraction(interactionRecord(requestId, 'keeper_interpret', 'deepseek-v4-flash', 'keeper-v1', contextHash, 'error', 0, { inputTokens: 0, cachedInputTokens: 0, outputTokens: 0, reasoningOutputTokens: 0, totalTokens: 0 }, typed.code)); setModelStatus(`真实模型失败：${typed.code}${typed.retryable ? '，可以重试或改用确定性建议。' : '，请改用确定性建议。'}`); setFeedback('模型候选没有进入规则引擎；原行动仍保留。');
    }
  };

  const submitCandidate = (text: string, mode: ModelMode = modelMode, requestIdOverride?: string) => {
    if (!character || !text.trim() || flow.phase !== 'ready') return;
    const requestId = requestIdOverride ?? `v04-ui-request-${requestCounter + 1}`;
    if (!requestIdOverride) setRequestCounter((value) => value + 1);
    const normalized = text.trim(); const unlockedMethods = flow.lastResolution?.nextActionIds.includes('trace-waterline') ? ['trace-waterline'] : []; const contextHash = fingerprint(`${world.worldId}:${world.scene.sceneRevision}:${character.characterId}:${normalized}:${selectedAbilityId}`); const context = makeContext(world, character, requestId, 'keeper_interpret', unlockedMethods); const started = beginInterpretation(flow, requestId, `${mode}:${normalized}`); setFlow(started); setPlayerText(''); setPendingNarration(null);
    if (mode === 'external') { setModelStatus('正在请求真实模型；规则状态尚未改变。'); void runExternalInterpretation(requestId, normalized, context, contextHash, character.characterId); return; }
    const candidate = applyPlayerAbility(keeperInterpretationSchema.parse(deterministicCandidate(normalized, selectedAbilityId || undefined))); const next = decoratePreview(receiveInterpretation(started, context, candidate), selectedAbilityId); setFlow(next); setLastInterpretationMode('local'); setPendingInterpretation(null); updateInteraction(localInteraction(requestId, contextHash, candidate.kind)); setFeedback(next.notice?.message ?? (next.preview ? '规则引擎已生成行动预览，请确认后才会产生事件。' : '需要更明确的行动意图。')); setModelStatus('本次使用本地确定性候选；未向外部模型发送角色姓名或存档。');
  };

  const runExternalNarration = async (pending: PendingNarration) => {
    try { const result = await requestKeeperNarrate({ context: pending.context, resolution: pending.resolution }); const narrative = keeperNarrativeSchema.parse(result.candidate); setFlow((current) => receiveNarration(current, narrative)); setPendingNarration(null); updateInteraction(interactionRecord(pending.requestId, 'keeper_narrate', result.model, result.promptVersion, fingerprint(JSON.stringify(pending.resolution)), 'narrative', result.latencyMs, result.usage, null, pending.resolution.eventIds)); setFeedback('规则结算已保留；真实模型叙事已返回。'); setModelStatus('真实模型叙事已返回；事实仍来自已提交结算。'); }
    catch (error) { const typed = error instanceof ModelGatewayClientError ? error : new ModelGatewayClientError('model_gateway_error', '叙事请求失败。', true); setFlow((current) => receiveNarration(current, undefined)); setPendingNarration(pending); updateInteraction(interactionRecord(pending.requestId, 'keeper_narrate', 'deepseek-v4-flash', 'keeper-v1', fingerprint(JSON.stringify(pending.resolution)), 'error', 0, { inputTokens: 0, cachedInputTokens: 0, outputTokens: 0, reasoningOutputTokens: 0, totalTokens: 0 }, typed.code, pending.resolution.eventIds)); setFeedback('规则结算已保存；叙事模型失败，可以重试或显示确定性摘要。'); setModelStatus(`叙事模型失败：${typed.code}。`); }
  };

  const confirm = () => {
    if (!character || !flow.preview) return;
    const next = confirmPreview(flow, (preview) => deterministicResolution(preview, world.eventCursor + 1)); const resolution = next.lastResolution; if (!resolution) return;
    const abilityEffect = flow.preview.abilityEffect;
    const nextCharacters = world.characters.map((entry) => entry.characterId === character.characterId && abilityEffect ? { ...entry, spirituality: { ...entry.spirituality, current: entry.spirituality.current - abilityEffect.spiritualityCost } } : entry);
    const abilitySummary = abilityEffect ? ` ${seerAbilityLabels[abilityEffect.abilityId]}：${abilityEffect.explanation}` : '';
    const nextWorld: V04World = { ...world, characters: nextCharacters, scene: { ...world.scene, sceneRevision: world.scene.sceneRevision + 1, knownFactIds: [...new Set([...world.scene.knownFactIds, ...resolution.visibleFactIds])] }, events: [...world.events, { eventId: resolution.eventIds[0]!, cursor: world.eventCursor + 1, type: 'investigation_resolved', actorId: character.characterId, visibleSummary: `${resolution.visibleChanges[0]!}${abilitySummary}`, ...(abilityEffect ? { abilityId: abilityEffect.abilityId, abilitySpiritualityCost: abilityEffect.spiritualityCost, abilityEffective: abilityEffect.effective, abilityDiceModifier: abilityEffect.diceModifier, abilityInformationTier: abilityEffect.informationTier, abilityUnlockedActionIds: abilityEffect.unlockedActionIds } : {}) }], eventCursor: world.eventCursor + 1, modelInteractions: world.modelInteractions.map((entry) => entry.requestId === resolution.requestId ? { ...entry, eventIds: [...resolution.eventIds] } : entry) };
    const nextFlow = { ...next, sceneRevision: nextWorld.scene.sceneRevision };
    setWorld(nextWorld); setPendingInterpretation(null); setSelectedAbilityId(''); setFeedback(`${resolution.visibleChanges[0]} 判定：${resolution.successLevel}（D100 ${resolution.roll}${resolution.abilityDiceModifier ? `；${resolution.abilityDiceModifier > 0 ? '奖励骰' : '惩罚骰'}影响 ${Math.abs(resolution.abilityDiceModifier)}` : ''}）。${abilityEffect ? `已消耗 ${abilityEffect.spiritualityCost} 点灵性；${abilityEffect.explanation}` : ''}${abilityEffect?.unlockedActionIds.length ? ` 已解锁额外行动：${abilityEffect.unlockedActionIds.join('、')}。` : ''}`);
    if (lastInterpretationMode === 'external') { const pendingCharacter = nextWorld.characters.find((entry) => entry.characterId === character.characterId) ?? character; const pending: PendingNarration = { requestId: `${resolution.requestId}:narrate`, context: makeContext(nextWorld, pendingCharacter, `${resolution.requestId}:narrate`, 'keeper_narrate'), resolution, characterId: character.characterId }; setFlow(nextFlow); setPendingNarration(pending); setModelStatus('规则已结算，正在请求真实模型叙事。'); void runExternalNarration(pending); } else { setFlow(receiveNarration(nextFlow, staticNarrative)); setModelStatus('本地确定性结算与摘要已完成。'); }
  };
  const withdraw = () => { const next = withdrawPreview(flow); setFlow(next); setFeedback(next.notice?.message ?? '行动预览已撤回。'); };
  const exitEvent = () => { setFlow(createKeeperFlow(world.scene.sceneRevision)); setPlayerText(''); setPendingInterpretation(null); setPendingNarration(null); setSelectedAbilityId(''); setFeedback('已退出当前事件；已提交事实保留，未提交候选已丢弃。'); };
  const resetSlice = () => { void clearV04(); setWorld(createParallelTingenWorld('v04-ui-demo')); setFlow(createKeeperFlow(0)); setEnvironmentNotice('尚未出现新的环境提案。'); setWorldProposalPending(false); setFeedback('已清除 V0.4 本地快照并重置切片。'); setModelStatus('未调用模型：本切片默认使用本地确定性候选。'); setPendingInterpretation(null); setPendingNarration(null); setSelectedAbilityId(''); resetCreation(); };

  return <main className="shell v04-shell">
    <header className="masthead"><p className="eyebrow">V0.4 · 平行廷根 · 封闭垂直切片</p><h1>河岸调查</h1><p className="location">{scene.location} · {scene.phaseLabel}</p></header>
    <section className="panel v04-boundary"><strong>规则边界</strong><p>{scene.modelBoundary}</p><p className="v04-model-status" aria-live="polite">模型状态：{modelStatus}</p><div className="button-row" role="group" aria-label="行动解释方式"><button type="button" className={modelMode === 'local' ? 'mode-choice is-selected' : 'mode-choice'} onClick={() => setModelMode('local')} aria-pressed={modelMode === 'local'}>本地确定性建议{modelMode === 'local' ? '（当前）' : ''}</button><button type="button" className={modelMode === 'external' ? 'mode-choice is-selected' : 'mode-choice'} onClick={() => setModelMode('external')} aria-pressed={modelMode === 'external'}>使用真实模型{modelMode === 'external' ? '（当前）' : ''}</button></div><p className="v04-mode-selection" aria-live="polite">当前行动解释方式：{modelMode === 'external' ? '真实模型' : '本地确定性建议'}</p></section>
    {world.characters.length > 0 && <section className="panel" aria-labelledby="v04-roster-title"><div className="panel-heading"><h2 id="v04-roster-title">人物档案与切换</h2><span>{world.characters.length}/3 个档案</span></div><div className="button-row">{world.characters.map((entry) => <button key={entry.characterId} type="button" onClick={() => switchCharacter(entry.characterId)} disabled={entry.characterId === world.activeCharacterId}>{entry.name} · {occupationLabels[entry.occupationId as OccupationId]}{entry.characterId === world.activeCharacterId ? '（当前）' : '（切换）'}</button>)}{world.characters.length < 3 && <button type="button" onClick={beginNewCharacter}>创建新人物档案</button>}</div></section>}
    {!character && <section className="panel" aria-labelledby="v04-create-title"><div className="panel-heading"><h2 id="v04-create-title">创建人物档案</h2><span>姓名与性别为必填</span></div><div className="creation-form"><label htmlFor="v04-name">姓名</label><input id="v04-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="人物姓名" /><label htmlFor="v04-gender">性别</label><select id="v04-gender" value={gender} onChange={(event) => setGender(event.target.value as CocGender)}><option value="" disabled>请选择性别</option>{(Object.entries(genderLabels) as [CocGender, string][]).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select><label htmlFor="v04-occupation">职业</label><select id="v04-occupation" value={occupation} onChange={(event) => { setOccupation(event.target.value as OccupationId); resetAllocations(); }}>{(Object.entries(occupationLabels) as [OccupationId, string][]).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select><div className="v04-preset-actions"><button type="button" onClick={() => applyAllocationPreset('random')}>随机分配</button><button type="button" onClick={() => applyAllocationPreset('even')}>平均分配当前职业</button></div><div className="v04-attribute-allocation"><strong>职业属性模板</strong><p>职业会提供不同的属性基础；剩余属性点由你自由分配，可以不全部使用。剩余属性点：{remainingAttributePoints}/{freeAttributePointBudget}</p>{(Object.entries(attributeLabels) as [AttributeId, string][]).map(([id, label]) => <label key={id} htmlFor={`v04-attribute-${id}`}><span>{label}：{template[id] + (attributeAllocations[id] ?? 0)}</span><input id={`v04-attribute-${id}`} aria-label={`${label}额外点数`} type="number" min="0" max={100 - template[id]} value={attributeAllocations[id] ?? 0} onChange={(event) => setAttributeAllocation(id, event.target.value)} /></label>)}</div><div className="v04-skill-allocation"><strong>职业技能</strong><p>职业技能点 = 教育值 × 20；职业决定可分配的技能范围，点数由你分配。剩余职业技能点：{remainingOccupationSkillPoints}/{occupationSkillPointBudget}</p>{occupationSkillPools[occupation].map((skillId) => <label key={skillId} htmlFor={`v04-occupation-skill-${skillId}`}><span>{skillLabels[skillId]}：{skillPreviewValue(skillId)}</span><input id={`v04-occupation-skill-${skillId}`} aria-label={`${skillLabels[skillId]}职业加点`} type="number" min="0" max="85" value={occupationSkillAllocations[skillId] ?? 0} onChange={(event) => setSkillAllocation('occupation', skillId, event.target.value)} /></label>)}</div><div className="v04-skill-allocation"><strong>兴趣技能</strong><p>兴趣技能点 = 智力值 × 10；可以投入任意已列出的技能。剩余兴趣技能点：{remainingInterestSkillPoints}/{interestSkillPointBudget}</p>{allSkillIds.map((skillId) => <label key={skillId} htmlFor={`v04-interest-skill-${skillId}`}><span>{skillLabels[skillId]}：{skillPreviewValue(skillId)}</span><input id={`v04-interest-skill-${skillId}`} aria-label={`${skillLabels[skillId]}兴趣加点`} type="number" min="0" max="85" value={interestSkillAllocations[skillId] ?? 0} onChange={(event) => setSkillAllocation('interest', skillId, event.target.value)} /></label>)}</div><button type="button" className="start" onClick={create} disabled={!name.trim() || !gender || remainingAttributePoints < 0 || remainingOccupationSkillPoints < 0 || remainingInterestSkillPoints < 0}>创建人物档案</button></div></section>}
    {character && <>
      <section className="panel" aria-labelledby="v04-profile-title"><div className="panel-heading"><h2 id="v04-profile-title">人物档案</h2><span>{character.name} · {occupationLabels[character.occupationId as OccupationId]} · {genderLabels[character.gender] ?? '既有档案'}</span></div><div className="v04-stat-grid">{(Object.entries(attributeLabels) as [keyof typeof attributeLabels, string][]).map(([id, label]) => <p key={id}>{label}：{character.attributes[id]}</p>)}<p>生命值：{character.hp.current}/{character.hp.max}</p><p>{formatSan(character.san.current, character.san.max)}</p><p>灵性：{character.spirituality.current}/{character.spirituality.max}</p><p>路径：{character.pathwayId === 'seer' ? '占卜家序列 9（本切片能力验证）' : '未启用超凡能力'}</p><p>扮演进度：{character.actingPresentation}</p><p>模型交互元数据：{world.modelInteractions.length} 条（不含原始文本）</p></div><div className="v04-skills"><h3>技能</h3>{Object.entries(character.skills).map(([id, value]) => <p key={id}>{skillLabels[id] ?? id}：{value}</p>)}</div></section>
      <section className="panel" aria-labelledby="v04-scene-title"><div className="panel-heading"><h2 id="v04-scene-title">{scene.title}</h2><span>场景修订 {scene.sceneRevision}</span></div><p>可见对象：{scene.visibleEntities.map((id) => visibleEntityLabels[id] ?? id).join('、')}</p><ul className="v04-foreshadowing">{scene.dangerForeshadowing.map((item) => <li key={item}>{item}</li>)}</ul>{scene.knownFacts.length > 0 && <div className="v04-facts"><strong>已确认事实</strong>{scene.knownFacts.map((id) => <p key={id}>{factLabels[id] ?? id}</p>)}</div>}<div className="v04-lenses"><div><strong>职业透镜</strong><p>{occupationLabels[character.occupationId as OccupationId]}：可从职业权限、现场与访谈中选择不同入口。</p></div><div><strong>路径透镜</strong><p>占卜家、观众、无眠者、猎人均有独立方法修正；未晋升时不会凭空获得能力。</p></div></div><div className="v04-world-proposal"><strong>环境提案</strong><p>{environmentNotice}</p><div className="button-row"><button type="button" onClick={() => { void requestEnvironmentProposal('local'); }} disabled={worldProposalPending}>检查一次环境变化（本地边界验证）</button><button type="button" onClick={() => { void requestEnvironmentProposal('external'); }} disabled={worldProposalPending}>请求真实世界模型提案</button></div></div></section>
      <section className="panel" aria-labelledby="v04-actions-title"><div className="panel-heading"><h2 id="v04-actions-title">任务行动</h2><span>{scene.phaseLabel}</span></div>{character.pathwayId === 'seer' ? <div className="v04-ability-choice"><strong>当前任务能力</strong><p>能力只在确认具体调查时生效；选择后会进入行动预览，撤回不会消耗灵性。</p><label htmlFor="v04-seer-ability">占卜家序列 9 能力</label><select id="v04-seer-ability" value={selectedAbilityId} onChange={(event) => setSelectedAbilityId(event.target.value as SeerAbilityId | '')} disabled={flow.phase !== 'ready'}><option value="">不使用能力</option><option value="seer-glimpse" disabled={character.spirituality.current < 1}>预兆窥视（消耗 1 点灵性，影响检定与信息层级）</option><option value="seer-hunch" disabled={character.spirituality.current < 1}>灵性直觉（消耗 1 点灵性，解锁额外追踪入口）</option></select>{selectedAbilityId && <p>已选择：{seerAbilityLabels[selectedAbilityId]}；最终效果以行动预览中的目标与难度为准。</p>}</div> : <p className="v04-ability-choice">该旧档未启用本切片的占卜能力；可以继续使用普通调查。</p>}<div className="button-row"><button type="button" onClick={() => submitCandidate('我检查路边木箱上留下的划痕。')} disabled={flow.phase !== 'ready'}>检查木箱上的划痕（15 分钟）</button>{scene.nextActions.includes('trace-waterline') && <button type="button" onClick={() => submitCandidate('我沿着水痕继续追踪。')} disabled={flow.phase !== 'ready'}>沿水痕继续追踪（已解锁）</button>}<button type="button" onClick={() => submitCandidate('我想看看。')} disabled={flow.phase !== 'ready'}>请求行动澄清</button></div><label htmlFor="v04-free-action">自由行动（仍属于当前调查链）</label><div className="button-row"><input id="v04-free-action" value={playerText} onChange={(event) => setPlayerText(event.target.value)} placeholder="例如：我检查路边木箱上留下的划痕。" /><button type="button" onClick={() => submitCandidate(playerText)} disabled={!playerText.trim() || flow.phase !== 'ready'}>提交行动意图</button></div>{pendingInterpretation && <div className="v04-model-retry" role="alert"><strong>模型请求失败</strong><p>原行动仍未提交，规则状态没有改变。</p><div className="button-row"><button type="button" onClick={() => submitCandidate(pendingInterpretation.text, 'external', pendingInterpretation.requestId)}>重试模型解释</button><button type="button" onClick={() => { const pending = pendingInterpretation; setPendingInterpretation(null); submitCandidate(pending.text, 'local', pending.requestId); }}>改用确定性建议</button></div></div>}{flow.preview && <div className="v04-preview" aria-live="polite"><strong>行动预览</strong><p>{flow.preview.rationale}</p><p>目标：{visibleEntityLabels[flow.preview.targetId] ?? flow.preview.targetId} · 方法：{flow.preview.methodId} · 难度：{flow.preview.difficulty}</p><p>风险提示：{flow.preview.riskIds.join('、') || '无'}</p><p>{flow.preview.resourceCostSummary}</p>{flow.preview.abilityEffect && <div className="v04-ability-preview"><p>能力：{seerAbilityLabels[flow.preview.abilityEffect.abilityId]} · 灵性消耗：{flow.preview.abilityEffect.spiritualityCost}</p><p>{flow.preview.abilityEffect.explanation}</p><p>骰点影响：{flow.preview.abilityEffect.diceModifier > 0 ? '奖励骰' : flow.preview.abilityEffect.diceModifier < 0 ? '惩罚骰' : '无'} · 信息层级：{flow.preview.abilityEffect.informationTier}{flow.preview.abilityEffect.unlockedActionIds.length ? ` · 额外行动：${flow.preview.abilityEffect.unlockedActionIds.join('、')}` : ''}</p></div>}<div className="button-row"><button type="button" className="start" onClick={confirm}>确认并结算</button><button type="button" onClick={withdraw}>撤回预览</button></div></div>} {pendingNarration && <div className="v04-model-retry" role="alert"><strong>叙事模型暂不可用</strong><p>规则结算已经保存；可以重试叙事或查看确定性摘要。</p><div className="button-row"><button type="button" onClick={() => { const pending = pendingNarration; void runExternalNarration(pending); }}>重试叙事</button><button type="button" onClick={() => { setPendingNarration(null); setFlow((current) => receiveNarration(current, staticNarrative)); setFeedback('规则结算已保留；已显示确定性摘要。'); setModelStatus('真实模型不可用，已切换为确定性摘要。'); }}>显示确定性摘要</button></div></div>}<div className="inline-feedback v04-feedback" aria-live="polite"><strong>即时行动反馈</strong><p>{scene.actionFeedback}</p></div></section>
      {flow.lastNarrative && <section className="panel v04-narrative" aria-labelledby="v04-narrative-title"><h2 id="v04-narrative-title">事件叙事</h2><p>{flow.lastNarrative.narrative}</p></section>}
      <section className="panel navigation"><button type="button" onClick={exitEvent}>退出当前事件</button><button type="button" onClick={onBack}>返回 V0.3 主界面</button><button type="button" onClick={resetSlice}>重置本地切片</button></section><p className="v04-debug">调查实例：{instance.instanceId} · 代表案件：{riverCrateCase.caseId}</p>
    </>}
    {!character && <section className="panel navigation"><button type="button" onClick={onBack}>返回 V0.3 主界面</button><button type="button" onClick={resetSlice}>重置本地切片</button></section>}
  </main>;
}

export default V04App;
