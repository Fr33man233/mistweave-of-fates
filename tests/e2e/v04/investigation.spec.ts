import { expect, test } from '../fixtures';
import { createProfile, enterV04, readAutomationState, waitForSavedEventCursor } from '../helpers';

test.beforeEach(async ({ gamePage }) => {
  await enterV04(gamePage);
  await createProfile(gamePage);
});

test('行动预览可以撤回，且不会提交事件或事实', async ({ gamePage }) => {
  await gamePage.getByRole('button', { name: '检查木箱上的划痕（15 分钟）' }).click();
  await expect(gamePage.getByText('行动预览', { exact: true })).toBeVisible();

  let state = await readAutomationState(gamePage);
  expect(state.flow.phase).toBe('preview');
  expect(state.world.eventCursor).toBe(1);
  expect(state.scene.knownFactIds).toEqual([]);

  await gamePage.getByRole('button', { name: '撤回预览' }).click();
  await expect(gamePage.getByText(/行动预览已撤回/)).toBeVisible();
  state = await readAutomationState(gamePage);
  expect(state.flow.phase).toBe('ready');
  expect(state.world.eventCursor).toBe(1);
  expect(state.scene.knownFactIds).toEqual([]);
});

test('确认调查后显示即时反馈、提交事实，并在刷新后恢复', async ({ gamePage }) => {
  await gamePage.getByRole('button', { name: '检查木箱上的划痕（15 分钟）' }).click();
  await gamePage.getByRole('button', { name: '确认并结算' }).click();
  await expect(gamePage.getByText(/判定：regular（D100 34）/)).toBeVisible();
  await expect(gamePage.getByText(/木箱旁出现从河阶延向仓门的拖痕/)).toBeVisible();

  let state = await readAutomationState(gamePage);
  expect(state.world.eventCursor).toBe(2);
  expect(state.scene.sceneRevision).toBe(1);
  expect(state.scene.knownFactIds).toContain('fact-drag-marks');
  expect(state.flow.committedRequestIds).toEqual(['v04-ui-request-1']);

  await waitForSavedEventCursor(gamePage, 2);
  await gamePage.reload();
  await gamePage.getByRole('button', { name: '进入 V0.4 平行廷根封闭切片' }).click();
  await expect(gamePage.getByRole('heading', { name: '人物档案', exact: true })).toBeVisible();
  await gamePage.waitForFunction(() => typeof window.render_game_to_text === 'function');
  state = await readAutomationState(gamePage);
  expect(state.world.eventCursor).toBe(2);
  expect(state.scene.knownFactIds).toContain('fact-drag-marks');
  expect(state.model.interactionMetadataCount).toBe(1);
});

test('占卜能力绑定具体调查，预览后扣除灵性并留下可追踪的能力结果', async ({ gamePage }) => {
  await gamePage.getByLabel('占卜家序列 9 能力').selectOption('seer-hunch');
  await gamePage.getByRole('button', { name: '检查木箱上的划痕（15 分钟）' }).click();
  await expect(gamePage.getByText(/能力：灵性直觉 · 灵性消耗：1/)).toBeVisible();
  await expect(gamePage.getByText(/额外行动：trace-waterline/)).toBeVisible();

  let state = await readAutomationState(gamePage);
  expect(state.flow.preview?.abilityId).toBe('seer-hunch');
  expect(state.world.eventCursor).toBe(1);
  await gamePage.getByRole('button', { name: '确认并结算' }).click();
  await expect(gamePage.getByText(/已消耗 1 点灵性/)).toBeVisible();
  await expect(gamePage.getByRole('button', { name: '沿水痕继续追踪（已解锁）' })).toBeVisible();
  state = await readAutomationState(gamePage);
  expect(state.character?.spirituality.current).toBe((state.character?.spirituality.max ?? 0) - 1);
  expect(state.flow.lastResolution?.abilityId).toBe('seer-hunch');
  expect(state.flow.lastResolution?.abilityUnlockedActionIds).toEqual(['trace-waterline']);
});

test('世界提案只能进入临时状态，并可与占卜能力串联到后续行动', async ({ gamePage }) => {
  await gamePage.route('**/api/model/world/propose', async (route) => {
    const request = route.request().postDataJSON() as { context: { requestId: string } };
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ requestId: request.context.requestId, model: 'deepseek-v4-flash', promptVersion: 'world-v2', purpose: 'world_propose', candidate: { proposals: [{ proposalId: 'e2e-chain-proposal', templateId: 'temporary-danger', subjectIds: ['rain-soaked-crate'], triggerId: 'scene-0', proposedParameters: { intensity: 1 }, visibleForeshadowing: '木箱边缘出现一线新的水痕。', expiresAtCheckpoint: 2 }] }, usage: { inputTokens: 30, cachedInputTokens: 0, outputTokens: 18, reasoningOutputTokens: 0, totalTokens: 48 }, latencyMs: 15 }) });
  });
  await gamePage.getByRole('button', { name: '请求真实世界模型提案' }).click();
  await expect(gamePage.getByText('木箱边缘出现一线新的水痕。')).toBeVisible();
  let state = await readAutomationState(gamePage);
  expect(state.scene.worldProposalCount).toBe(1);
  expect(state.world.eventCursor).toBe(1);

  await gamePage.getByLabel('占卜家序列 9 能力').selectOption('seer-hunch');
  await gamePage.getByRole('button', { name: '检查木箱上的划痕（15 分钟）' }).click();
  await expect(gamePage.getByText(/额外行动：trace-waterline/)).toBeVisible();
  await gamePage.getByRole('button', { name: '确认并结算' }).click();
  await expect(gamePage.getByRole('button', { name: '沿水痕继续追踪（已解锁）' })).toBeVisible();
  state = await readAutomationState(gamePage);
  expect(state.world.eventCursor).toBe(2);
  expect(state.flow.lastResolution?.abilityUnlockedActionIds).toEqual(['trace-waterline']);
});

test('未知自由行动要求澄清，规则状态保持不变', async ({ gamePage }) => {
  await gamePage.getByLabel('自由行动（仍属于当前调查链）').fill('我要求立即揭示真相。');
  await gamePage.getByRole('button', { name: '提交行动意图' }).click();
  await expect(gamePage.getByText(/你想观察木箱/)).toBeVisible();

  const state = await readAutomationState(gamePage);
  expect(state.flow.phase).toBe('ready');
  expect(state.world.eventCursor).toBe(1);
  expect(state.scene.knownFactIds).toEqual([]);
  expect(state.model.interactionMetadataCount).toBe(1);
});

test('退出当前事件丢弃未提交预览，但保留已提交世界状态', async ({ gamePage }) => {
  await gamePage.getByRole('button', { name: '检查木箱上的划痕（15 分钟）' }).click();
  await expect(gamePage.getByText('行动预览', { exact: true })).toBeVisible();
  await gamePage.getByRole('button', { name: '退出当前事件' }).click();
  await expect(gamePage.getByText(/已退出当前事件/)).toBeVisible();

  const state = await readAutomationState(gamePage);
  expect(state.flow.phase).toBe('ready');
  expect(state.flow.preview).toBeNull();
  expect(state.world.eventCursor).toBe(1);
  expect(state.scene.knownFactIds).toEqual([]);
});
