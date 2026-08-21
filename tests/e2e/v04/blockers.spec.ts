import { expect, test } from '../fixtures';
import { createProfile, enterV04, readAutomationState, waitForSavedEventCursor } from '../helpers';

test.beforeEach(async ({ gamePage }) => enterV04(gamePage));

test('主界面支持创建第二个档案并切换，切换不覆盖已创建档案', async ({ gamePage }) => {
  await createProfile(gamePage, '第一档案');
  await gamePage.getByRole('button', { name: '创建新人物档案' }).click();
  await gamePage.getByLabel('姓名').fill('第二档案');
  await gamePage.getByLabel('性别').selectOption('male');
  await gamePage.getByLabel('职业', { exact: true }).selectOption('dockworker');
  await gamePage.getByRole('button', { name: '创建人物档案' }).click();
  await expect(gamePage.getByRole('button', { name: '第二档案 · 码头工人（当前）', exact: true })).toBeVisible();

  await gamePage.getByRole('button', { name: /第一档案 · 警探（切换）/ }).click();
  await expect(gamePage.getByRole('button', { name: '第一档案 · 警探（当前）', exact: true })).toBeVisible();
  const state = await readAutomationState(gamePage);
  expect(state.characterRoster).toHaveLength(2);
  expect(state.characterRoster.filter((entry) => entry.active)).toHaveLength(1);
  expect(state.character?.occupationId).toBe('detective');
});

test('真实模型失败时保留原行动，支持重试或确定性降级', async ({ gamePage }) => {
  await createProfile(gamePage);
  await gamePage.route('**/api/model/keeper/interpret', async (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ error: { code: 'provider_timeout', message: 'Model timed out.', retryable: true } }),
  }));
  await gamePage.getByRole('button', { name: '使用真实模型' }).click();
  await expect(gamePage.getByRole('button', { name: '使用真实模型（当前）' })).toHaveClass(/is-selected/);
  await expect(gamePage.getByText('当前行动解释方式：真实模型')).toBeVisible();
  await gamePage.getByRole('button', { name: '检查木箱上的划痕（15 分钟）' }).click();
  await expect(gamePage.getByRole('alert')).toContainText('原行动仍未提交');
  let state = await readAutomationState(gamePage);
  expect(state.world.eventCursor).toBe(1);
  expect(state.flow.phase).toBe('ready');
  expect(state.model.interactionMetadataCount).toBe(1);

  await gamePage.getByRole('button', { name: '改用确定性建议' }).click();
  await expect(gamePage.getByText('行动预览', { exact: true })).toBeVisible();
  state = await readAutomationState(gamePage);
  expect(state.flow.phase).toBe('preview');
  expect(state.world.eventCursor).toBe(1);
  await gamePage.getByRole('button', { name: '确认并结算' }).click();
  await expect(gamePage.getByText(/木箱边缘确认了一组从河阶延向仓门的拖痕/)).toBeVisible();
});

test('真实模型成功的解释与叙事只提交脱敏遥测，并能保存恢复', async ({ gamePage }) => {
  await createProfile(gamePage, '模型链测试员');
  await gamePage.route('**/api/model/keeper/interpret', async (route) => {
    const request = route.request().postDataJSON() as { context: { requestId: string } };
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ requestId: request.context.requestId, model: 'deepseek-v4-flash', promptVersion: 'keeper-v1', purpose: 'keeper_interpret', candidate: { kind: 'execute', targetId: 'rain-soaked-crate', methodId: 'observe-crate', skillId: 'spot_hidden', proposedDifficulty: 'regular', riskIds: ['noticed'], rationale: '检查可见木箱。' }, usage: { inputTokens: 12, cachedInputTokens: 0, outputTokens: 9, reasoningOutputTokens: 0, totalTokens: 21 }, latencyMs: 12 }) });
  });
  await gamePage.route('**/api/model/keeper/narrate', async (route) => {
    const request = route.request().postDataJSON() as { context: { requestId: string } };
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ requestId: request.context.requestId, model: 'deepseek-v4-flash', promptVersion: 'keeper-v1', purpose: 'keeper_narrate', candidate: { narrative: '雨水让划痕显得更清楚。', npcReactions: [] }, usage: { inputTokens: 20, cachedInputTokens: 0, outputTokens: 7, reasoningOutputTokens: 0, totalTokens: 27 }, latencyMs: 10 }) });
  });
  await gamePage.getByRole('button', { name: '使用真实模型' }).click();
  await gamePage.getByRole('button', { name: '检查木箱上的划痕（15 分钟）' }).click();
  await expect(gamePage.getByText('行动预览', { exact: true })).toBeVisible();
  await gamePage.getByRole('button', { name: '确认并结算' }).click();
  await expect(gamePage.getByText('雨水让划痕显得更清楚。')).toBeVisible();
  let state = await readAutomationState(gamePage);
  expect(state.model.externalCalls).toBe(2);
  expect(state.model.rawTextStored).toBe(false);
  await waitForSavedEventCursor(gamePage, 2);
  await gamePage.reload();
  await gamePage.getByRole('button', { name: '进入 V0.4 平行廷根封闭切片' }).click();
  await expect(gamePage.getByRole('heading', { name: '人物档案', exact: true })).toBeVisible();
  state = await readAutomationState(gamePage);
  expect(state.model.externalCalls).toBe(2);
});

test('真实世界模型提案先经过可见对象与检查点校验再进入临时状态', async ({ gamePage }) => {
  await createProfile(gamePage, '世界提案测试员');
  await gamePage.route('**/api/model/world/propose', async (route) => {
    const request = route.request().postDataJSON() as { context: { requestId: string } };
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ requestId: request.context.requestId, model: 'deepseek-v4-flash', promptVersion: 'keeper-v1', purpose: 'world_propose', candidate: { proposals: [{ proposalId: 'e2e-world-proposal-1', templateId: 'temporary-danger', subjectIds: ['rain-soaked-crate'], triggerId: 'scene-0', proposedParameters: { intensity: 1 }, visibleForeshadowing: '木箱下方传来更近的水声。', expiresAtCheckpoint: 2 }] }, usage: { inputTokens: 30, cachedInputTokens: 0, outputTokens: 18, reasoningOutputTokens: 0, totalTokens: 48 }, latencyMs: 15 }) });
  });
  await gamePage.getByRole('button', { name: '请求真实世界模型提案' }).click();
  await expect(gamePage.getByText('木箱下方传来更近的水声。')).toBeVisible();
  const state = await readAutomationState(gamePage);
  expect(state.scene.worldProposalCount).toBe(1);
  expect(state.model.externalCalls).toBe(1);
  expect(state.model.rawTextStored).toBe(false);
});
