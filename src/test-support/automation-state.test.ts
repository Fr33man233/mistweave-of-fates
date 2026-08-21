import { describe, expect, it } from 'vitest';
import { createKeeperFlow } from '../core/keeper-flow';
import { createParallelTingenWorld } from '../tingen/world';
import { cocCharacterSchema } from '../coc/schema';
import { projectAutomationState, renderAutomationState } from './automation-state';

function syntheticCharacter() {
  return cocCharacterSchema.parse({
    characterId: 'private-character-name',
    name: '不应进入测试投影的姓名',
    gender: 'female',
    occupationId: 'detective',
    attributes: { STR: 45, CON: 50, SIZ: 50, DEX: 60, APP: 45, INT: 60, POW: 55, EDU: 60 },
    skills: { spot_hidden: 50 },
    hp: { current: 10, max: 10 },
    san: { current: 70, max: 70, pollutionPresentation: '无污染' },
    spirituality: { current: 11, max: 11, sequenceBaseBonus: 0, pathwayRankBonus: 0, actingMilestoneBonus: 0, modifier: 0 },
    conditionIds: [],
    pathwayId: null,
    actingPresentation: '尚未开始扮演',
  });
}

describe('跨版本自动化状态投影', () => {
  it('只输出玩家可见白名单，不包含姓名、原始输入、Prompt 或隐藏真相', () => {
    const world = createParallelTingenWorld('automation-seed', syntheticCharacter());
    const projected = projectAutomationState(world, createKeeperFlow(), '等待行动。');
    const serialized = JSON.stringify(projected);

    expect(projected.automationStateVersion).toBe('1.0.0');
    expect(projected.character?.anonymousId).toBe('active-character');
    expect(projected.characterRoster).toHaveLength(1);
    expect(projected.scene.knownFactIds).toEqual([]);
    expect(projected.scene.worldProposalCount).toBe(0);
    expect(serialized).not.toContain('不应进入测试投影的姓名');
    expect(serialized).not.toContain('private-character-name');
    expect(serialized).not.toMatch(/"(?:playerText|prompt|hiddenTruth|apiKey)"/i);
  });

  it('render_game_to_text 合同返回可解析的紧凑 JSON', () => {
    const world = createParallelTingenWorld('automation-seed');
    expect(JSON.parse(renderAutomationState(world, createKeeperFlow(), '尚未建档。'))).toMatchObject({
      automationStateVersion: '1.0.0',
      productMode: 'v04',
      character: null,
      characterRoster: [],
      model: { externalCalls: 0, rawTextStored: false },
    });
  });
});
