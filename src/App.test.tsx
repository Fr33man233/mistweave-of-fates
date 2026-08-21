import 'fake-indexeddb/auto';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import App from './App';
import { acquireMaterial, advanceTrack, attemptAscension, prepareRitual } from './core/ascension';
import { actionIds, chooseApproach, createGame, startCase } from './core/game';
import { createCharacter } from './core/profile';
import { clearGame, saveGame } from './storage/save';

async function startAndCreate(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: '开始调查' }));
  expect(screen.getByRole('heading', { name: '创建角色卡' })).toBeInTheDocument();
  await user.type(screen.getByLabelText('姓名'), '测试调查员');
  await user.selectOptions(screen.getByLabelText('性别'), 'female');
  await user.selectOptions(screen.getByLabelText('初始职业'), 'reporter');
  await user.type(screen.getByLabelText('初始意愿'), '查清瓦伦港雾中的真相');
  await user.click(screen.getByRole('button', { name: '创建角色' }));
}

async function resolveAllCases(user: ReturnType<typeof userEvent.setup>) {
  for (const label of ['误投的药箱', '封锁仓库的账册', '夜航哨声']) {
    await user.click(screen.getByRole('button', { name: `接触：${label}` }));
    await user.click(screen.getByRole('button', { name: '谨慎调查（15 分钟）' }));
  }
}

async function reachObserverSource(user: ReturnType<typeof userEvent.setup>) {
  await startAndCreate(user);
  await resolveAllCases(user);
  await user.click(screen.getByRole('button', { name: '调查观察者线索' }));
}

beforeEach(async () => {
  await clearGame();
});

describe('V0.3 调查闭环界面', () => {
  it('渲染项目标题、地点和可访问的开始按钮', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Mistweave of Fates' })).toBeInTheDocument();
    expect(screen.getByText('瓦伦港，灰炉药房')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '开始调查' })).toBeInTheDocument();
  });

  it('先创建四职业之一的角色卡，再开放调查', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: '开始调查' }));

    expect(screen.queryByRole('button', { name: /接触：/ })).not.toBeInTheDocument();
    expect(screen.getByLabelText('初始职业').querySelectorAll('option')).toHaveLength(4);
    expect(screen.getByLabelText('性别').querySelectorAll('option')).toHaveLength(4);
    expect(screen.queryByRole('option', { name: '未指定' })).not.toBeInTheDocument();
    await user.type(screen.getByLabelText('姓名'), '测试调查员');
    await user.selectOptions(screen.getByLabelText('性别'), 'female');
    await user.selectOptions(screen.getByLabelText('初始职业'), 'reporter');
    await user.type(screen.getByLabelText('初始意愿'), '查清瓦伦港雾中的真相');
    await user.click(screen.getByRole('button', { name: '创建角色' }));

    expect(screen.getByText(/记者 · 活动/)).toBeInTheDocument();
    expect(screen.getByText(/灵性 5\/5/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '接触：误投的药箱' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '创建角色卡' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '创建新角色卡' })).toBeInTheDocument();
  });

  it('允许玩家结算调查并在三次有效事件后同时显示双线索', async () => {
    const user = userEvent.setup();
    render(<App />);
    await startAndCreate(user);
    await resolveAllCases(user);

    expect(screen.getByText(/判定：已提交事件 #4/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '调查观察者线索' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '调查猎犬线索' })).toBeInTheDocument();
  });

  it('在仪式前展示能力方向、不可逆改变和死亡风险', async () => {
    const user = userEvent.setup();
    render(<App />);
    await reachObserverSource(user);

    expect(screen.getByText('能力方向：痕迹感知')).toBeInTheDocument();
    expect(screen.getByText(/不可逆改变：角色将锁定所选路径/)).toBeInTheDocument();
    expect(screen.getByText(/失控或死亡风险/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '冒险获取材料' }));
    await user.click(screen.getByRole('button', { name: '冒险准备观察者仪式' }));
    expect(screen.getByText(/未许可雾质馏出物 · 准备质量 3/)).toBeInTheDocument();
    expect(screen.getByText(/警方关注 1/)).toBeInTheDocument();
  });

  it('要求主动获取材料并在每次调查后显示结果反馈', async () => {
    const user = userEvent.setup();
    render(<App />);
    await reachObserverSource(user);

    expect(screen.getByRole('button', { name: '获取安全材料（2 银币）' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '获取安全材料（2 银币）' }));
    expect(screen.getByRole('button', { name: '安全准备观察者仪式' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '行动反馈' })).toBeInTheDocument();
  });

  it('提供返回主菜单和退出当前流程出口', async () => {
    const user = userEvent.setup();
    render(<App />);
    await startAndCreate(user);
    await user.click(screen.getByRole('button', { name: '接触：误投的药箱' }));
    await user.click(screen.getByRole('button', { name: '退出当前流程' }));
    expect(screen.getByRole('button', { name: '接触：误投的药箱' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '返回主菜单' }));
    expect(screen.getByRole('button', { name: '开始调查' })).toBeInTheDocument();
  });


  it('要求二次确认后才提交首次服药', async () => {
    const user = userEvent.setup();
    render(<App />);
    await reachObserverSource(user);
    await user.click(screen.getByRole('button', { name: '获取安全材料（2 银币）' }));
    await user.click(screen.getByRole('button', { name: '安全准备观察者仪式' }));
    await user.click(screen.getByRole('button', { name: '准备服药：观察者' }));

    expect(screen.getByRole('dialog', { name: '观察者服药确认' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '确认服药并承担风险' }));
    expect(screen.getByText(/晋升结果：/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '调查猎犬线索' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '接触：夜航哨声' }));
    await user.click(screen.getByRole('button', { name: '使用痕迹感知并调查' }));
    expect(screen.getByText(/灵性 7\/8/)).toBeInTheDocument();
  });

  it('恢复灾难失败存档时禁用永久失效角色卡', async () => {
    let game = createGame('deceased-ui');
    game = { ...game, profile: createCharacter(game.profile, 'dockworker', '保护码头工人') };
    for (const action of actionIds) game = chooseApproach(startCase(game, action), action, 'safe');
    game = prepareRitual(acquireMaterial(advanceTrack(game, 'hound'), 'hound', 'safe'), 'hound', 'safe');
    game = attemptAscension(game, 'hound', 'asc-502');
    await saveGame(game);

    render(<App />);
    expect(await screen.findByText(/码头工人 · 已永久失效/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '角色卡已永久失效' })).toBeDisabled();
  });

  it('将自由行动映射到现有案件并拒绝未知行动', async () => {
    const user = userEvent.setup();
    render(<App />);
    await startAndCreate(user);
    await user.type(screen.getByLabelText('自由行动'), '检查药箱');
    await user.click(screen.getByRole('button', { name: '尝试行动' }));
    expect(screen.getByText('已识别行动：药箱')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '谨慎调查（15 分钟）' })).toBeInTheDocument();
  });
});
