import 'fake-indexeddb/auto';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import V04App from './V04App';
import { clearV04, loadV04 } from './storage/v04-save';

beforeEach(async () => { await clearV04(); });

describe('V0.4 平行廷根可见切片', () => {
  it('明确显示当前行动解释方式，并用选中样式反馈模式切换', async () => {
    const user = userEvent.setup();
    render(<V04App onBack={() => undefined} />);
    const local = screen.getByRole('button', { name: '本地确定性建议（当前）' });
    const external = screen.getByRole('button', { name: '使用真实模型' });
    expect(local).toHaveClass('is-selected');
    expect(screen.getByText('当前行动解释方式：本地确定性建议')).toBeInTheDocument();
    await user.click(external);
    expect(screen.getByRole('button', { name: '使用真实模型（当前）' })).toHaveClass('is-selected');
    expect(screen.getByText('当前行动解释方式：真实模型')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '本地确定性建议' })).not.toHaveClass('is-selected');
  });

  it('要求姓名与性别后创建调查员，并显示 COC 资源与透镜', async () => {
    const user = userEvent.setup();
    render(<V04App onBack={() => undefined} />);
    expect(screen.getByRole('heading', { name: '创建人物档案' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '创建人物档案' })).toBeDisabled();
    expect(screen.getByText(/职业技能点 = 教育值 × 20/)).toBeInTheDocument();
    expect(screen.getByText(/兴趣技能点 = 智力值 × 10/)).toBeInTheDocument();
    expect(screen.getByLabelText('侦查兴趣加点')).toBeInTheDocument();
    expect(screen.queryByText(/COC 7e|Keeper/)).not.toBeInTheDocument();
    await user.type(screen.getByLabelText('姓名'), '河岸调查员');
    await user.selectOptions(screen.getByLabelText('性别'), 'female');
    expect(screen.queryByRole('option', { name: '非二元' })).not.toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('职业'), 'reporter');
    await user.type(screen.getByLabelText('力量额外点数'), '10');
    await user.clear(screen.getByLabelText('新闻学职业加点'));
    await user.type(screen.getByLabelText('新闻学职业加点'), '30');
    await user.click(screen.getByRole('button', { name: '创建人物档案' }));
    expect(screen.getByRole('heading', { name: '廷根河岸' })).toBeInTheDocument();
    expect(screen.getByText(/SAN：70\/70（无污染）/)).toBeInTheDocument();
    expect(screen.getByText(/力量：45/)).toBeInTheDocument();
    expect(screen.getByText(/新闻学：35/)).toBeInTheDocument();
    expect(screen.queryByText(/STR/)).not.toBeInTheDocument();
    expect(screen.getByText(/职业透镜/)).toBeInTheDocument();
    expect(screen.getByText(/路径透镜/)).toBeInTheDocument();
  });

  it('实时显示加点结果，并支持随机与平均分配预设', async () => {
    const user = userEvent.setup();
    render(<V04App onBack={() => undefined} />);
    await user.type(screen.getByLabelText('姓名'), '加点测试员');
    await user.selectOptions(screen.getByLabelText('性别'), 'male');
    expect(screen.getByText(/力量：45/)).toBeInTheDocument();
    await user.type(screen.getByLabelText('力量额外点数'), '10');
    expect(screen.getByText(/力量：55/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '随机分配' }));
    expect(screen.getByText(/剩余属性点：0\/100/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '平均分配当前职业' }));
    expect(screen.getByText(/剩余职业技能点：0\//)).toBeInTheDocument();
    expect(screen.getByText(/剩余兴趣技能点：0\//)).toBeInTheDocument();
  });

  it('把自由行动送入预览，确认后产生即时反馈、确定性事实和 Keeper 叙事', async () => {
    const user = userEvent.setup();
    render(<V04App onBack={() => undefined} />);
    await user.type(screen.getByLabelText('姓名'), '现场观察员');
    await user.selectOptions(screen.getByLabelText('性别'), 'male');
    await user.click(screen.getByRole('button', { name: '创建人物档案' }));
    await user.type(screen.getByLabelText('自由行动（仍属于当前调查链）'), '我检查路边木箱上留下的划痕。');
    await user.click(screen.getByRole('button', { name: '提交行动意图' }));
    expect(screen.getByText('行动预览')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '确认并结算' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '确认并结算' }));
    expect(screen.getByText(/即时行动反馈/)).toBeInTheDocument();
    expect(screen.getAllByText(/拖痕/).length).toBeGreaterThan(0);
    expect(screen.getByRole('heading', { name: '事件叙事' })).toBeInTheDocument();
    expect(screen.getByText(/模型交互元数据：1 条/)).toBeInTheDocument();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(JSON.stringify(await loadV04())).not.toContain('木箱上留下的划痕');
    await user.click(screen.getByRole('button', { name: '退出当前事件' }));
    expect(screen.getByText(/已退出当前事件/)).toBeInTheDocument();
  });

  it('在具体调查步骤中选择占卜能力，预览效果并在结算后扣除灵性', async () => {
    const user = userEvent.setup();
    render(<V04App onBack={() => undefined} />);
    await user.type(screen.getByLabelText('姓名'), '占卜链测试员');
    await user.selectOptions(screen.getByLabelText('性别'), 'female');
    await user.click(screen.getByRole('button', { name: '创建人物档案' }));
    expect(screen.getByText(/路径：占卜家序列 9/)).toBeInTheDocument();
    expect(screen.getByText(/灵性：11\/11/)).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('占卜家序列 9 能力'), 'seer-glimpse');
    await user.click(screen.getByRole('button', { name: '检查木箱上的划痕（15 分钟）' }));
    expect(screen.getByText(/能力：预兆窥视 · 灵性消耗：1/)).toBeInTheDocument();
    expect(screen.getByText(/骰点影响：奖励骰/)).toBeInTheDocument();
    expect(screen.getByText(/确认后消耗 1 点灵性/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '确认并结算' }));
    expect(screen.getByText(/已消耗 1 点灵性/)).toBeInTheDocument();
    expect(screen.getByText(/灵性：10\/11/)).toBeInTheDocument();
    const saved = await loadV04();
    expect(saved?.world.characters[0]?.pathwayId).toBe('seer');
    expect(saved?.world.characters[0]?.spirituality.current).toBe(10);
    expect(saved?.world.events.at(-1)?.visibleSummary).toContain('预兆窥视');
    expect(saved?.world.events.at(-1)?.abilityId).toBe('seer-glimpse');
    expect(saved?.world.events.at(-1)?.abilitySpiritualityCost).toBe(1);
  });

  it('灵性直觉在同一调查链中解锁沿水痕继续追踪的额外行动', async () => {
    const user = userEvent.setup();
    render(<V04App onBack={() => undefined} />);
    await user.type(screen.getByLabelText('姓名'), '额外行动测试员');
    await user.selectOptions(screen.getByLabelText('性别'), 'male');
    await user.click(screen.getByRole('button', { name: '创建人物档案' }));
    await user.selectOptions(screen.getByLabelText('占卜家序列 9 能力'), 'seer-hunch');
    await user.click(screen.getByRole('button', { name: '检查木箱上的划痕（15 分钟）' }));
    await user.click(screen.getByRole('button', { name: '确认并结算' }));
    expect(screen.getByText(/已解锁额外行动：trace-waterline/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '沿水痕继续追踪（已解锁）' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '沿水痕继续追踪（已解锁）' }));
    expect(screen.getByText(/沿着已经发现的水痕追踪到仓门附近/)).toBeInTheDocument();
  });

  it('未知自由行动得到澄清，不会直接改变规则状态', async () => {
    const user = userEvent.setup();
    render(<V04App onBack={() => undefined} />);
    await user.type(screen.getByLabelText('姓名'), '澄清测试员');
    await user.selectOptions(screen.getByLabelText('性别'), 'male');
    await user.click(screen.getByRole('button', { name: '创建人物档案' }));
    await user.type(screen.getByLabelText('自由行动（仍属于当前调查链）'), '我要求立即揭示真相。');
    await user.click(screen.getByRole('button', { name: '提交行动意图' }));
    expect(screen.getByText(/你想观察木箱/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '确认并结算' })).not.toBeInTheDocument();
  });

  it('将环境变化限制为可见对象上的一次性本地提案，并记录脱敏元数据', async () => {
    const user = userEvent.setup();
    render(<V04App onBack={() => undefined} />);
    await user.type(screen.getByLabelText('姓名'), '环境提案测试员');
    await user.selectOptions(screen.getByLabelText('性别'), 'female');
    await user.click(screen.getByRole('button', { name: '创建人物档案' }));
    await user.click(screen.getByRole('button', { name: '检查一次环境变化（本地边界验证）' }));
    expect(screen.getByText(/木箱下方的水声突然变得更近/)).toBeInTheDocument();
    expect(screen.getByText(/环境提案已通过模板与可见对象校验/)).toBeInTheDocument();
    expect(screen.getByText(/模型交互元数据：1 条/)).toBeInTheDocument();
    const saved = await loadV04();
    expect(saved?.world.worldProposals).toHaveLength(1);
    expect(saved?.world.modelInteractions[0]?.purpose).toBe('world_propose');
  });

  it('刷新后从 V0.4 快照恢复角色与已记录元数据，不重放候选', async () => {
    const user = userEvent.setup();
    const view = render(<V04App onBack={() => undefined} />);
    await user.type(screen.getByLabelText('姓名'), '恢复测试员');
    await user.selectOptions(screen.getByLabelText('性别'), 'female');
    await user.click(screen.getByRole('button', { name: '创建人物档案' }));
    await user.click(screen.getByRole('button', { name: '检查木箱上的划痕（15 分钟）' }));
    await user.click(screen.getByRole('button', { name: '撤回预览' }));
    expect(screen.getByText(/模型交互元数据：1 条/)).toBeInTheDocument();
    view.unmount();
    render(<V04App onBack={() => undefined} />);
    expect(await screen.findByRole('heading', { name: '人物档案' })).toBeInTheDocument();
    expect(screen.getByText(/已恢复 V0.4 本地快照/)).toBeInTheDocument();
    expect(screen.getByText(/模型交互元数据：1 条/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '确认并结算' })).not.toBeInTheDocument();
  });

  it('重置本地切片同时清除 V0.4 快照', async () => {
    const user = userEvent.setup();
    render(<V04App onBack={() => undefined} />);
    await user.type(screen.getByLabelText('姓名'), '重置测试员');
    await user.selectOptions(screen.getByLabelText('性别'), 'female');
    await user.click(screen.getByRole('button', { name: '创建人物档案' }));
    await user.click(screen.getByRole('button', { name: '重置本地切片' }));
    expect(await screen.findByRole('heading', { name: '创建人物档案' })).toBeInTheDocument();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(await loadV04()).toBeUndefined();
  });

  it('在主界面创建第二个档案并切换，两个档案的数据互不覆盖', async () => {
    const user = userEvent.setup();
    render(<V04App onBack={() => undefined} />);
    await user.type(screen.getByLabelText('姓名'), '甲档案');
    await user.selectOptions(screen.getByLabelText('性别'), 'female');
    await user.click(screen.getByRole('button', { name: '创建人物档案' }));
    await user.click(screen.getByRole('button', { name: '创建新人物档案' }));
    await user.type(screen.getByLabelText('姓名'), '乙档案');
    await user.selectOptions(screen.getByLabelText('性别'), 'male');
    await user.selectOptions(screen.getByLabelText('职业'), 'dockworker');
    await user.click(screen.getByRole('button', { name: '创建人物档案' }));
    expect(screen.getAllByText(/乙档案 · 码头工人/).length).toBeGreaterThan(0);
    await user.click(screen.getByRole('button', { name: /甲档案 · 警探/ }));
    expect(screen.getAllByText(/甲档案 · 警探/).length).toBeGreaterThan(0);
    expect(screen.getByText(/力量：45/)).toBeInTheDocument();
    expect(screen.getByText(/乙档案 · 码头工人（切换）/)).toBeInTheDocument();
  });
});
