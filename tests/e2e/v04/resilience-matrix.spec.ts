import { expect, test } from '../fixtures';
import { createProfile, enterV04, readAutomationState, waitForSavedEventCursor } from '../helpers';

test.beforeEach(async ({ gamePage }) => enterV04(gamePage));

test('模型返回非法候选时不提交行动，并可回到确定性路径', async ({ gamePage }) => {
  await createProfile(gamePage);
  await gamePage.route('**/api/model/keeper/interpret', async (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ requestId: 'v04-ui-request-1', model: 'deepseek-v4-flash', promptVersion: 'keeper-v1', purpose: 'keeper_interpret', candidate: { kind: 'clarification', question: '不应通过合同。', allowedAnswerHints: [] }, usage: { inputTokens: 2, cachedInputTokens: 0, outputTokens: 2, reasoningOutputTokens: 0, totalTokens: 4 }, latencyMs: 4 }),
  }));
  await gamePage.getByRole('button', { name: '使用真实模型' }).click();
  await gamePage.getByRole('button', { name: '检查木箱上的划痕（15 分钟）' }).click();
  await expect(gamePage.getByRole('alert')).toContainText('原行动仍未提交');
  const state = await readAutomationState(gamePage);
  expect(state.world.eventCursor).toBe(1);
  expect(state.flow.phase).toBe('ready');
  await gamePage.getByRole('button', { name: '改用确定性建议' }).click();
  await expect(gamePage.getByText('行动预览', { exact: true })).toBeVisible();
});

test('模型服务离线时原行动保留，确定性降级仍可结算', async ({ gamePage }) => {
  await createProfile(gamePage);
  await gamePage.route('**/api/model/keeper/interpret', async (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ error: { code: 'provider_unavailable', message: '模型服务暂时无法连接。', retryable: true } }),
  }));
  await gamePage.getByRole('button', { name: '使用真实模型' }).click();
  await gamePage.getByRole('button', { name: '检查木箱上的划痕（15 分钟）' }).click();
  await expect(gamePage.getByRole('alert')).toContainText('原行动仍未提交');
  await gamePage.getByRole('button', { name: '改用确定性建议' }).click();
  await gamePage.getByRole('button', { name: '确认并结算' }).click();
  await expect(gamePage.getByText(/判定：regular（D100 34）/)).toBeVisible();
  const state = await readAutomationState(gamePage);
  expect(state.world.eventCursor).toBe(2);
});

test('快速重复确认同一个预览只产生一次事件与一次结算', async ({ gamePage }) => {
  await createProfile(gamePage);
  await gamePage.getByRole('button', { name: '检查木箱上的划痕（15 分钟）' }).click();
  const confirm = gamePage.getByRole('button', { name: '确认并结算' });
  await confirm.evaluate((element) => { (element as HTMLButtonElement).click(); (element as HTMLButtonElement).click(); });
  await expect(gamePage.getByText(/判定：regular（D100 34）/)).toBeVisible();
  const state = await readAutomationState(gamePage);
  expect(state.world.eventCursor).toBe(2);
  expect(state.flow.committedRequestIds).toEqual(['v04-ui-request-1']);
  expect(state.scene.sceneRevision).toBe(1);
});

test('刷新后保留已提交状态，且旧 V0.3 存档不会被 V0.4 覆盖', async ({ gamePage }) => {
  await gamePage.evaluate(async () => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('veilport-v01', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('run');
      request.onerror = () => reject(request.error);
      request.onsuccess = () => { const db = request.result; const tx = db.transaction('run', 'readwrite'); tx.objectStore('run').put({ marker: 'legacy-v03' }, 'current'); tx.oncomplete = () => { db.close(); resolve(); }; };
    });
  });
  await createProfile(gamePage);
  await gamePage.getByRole('button', { name: '检查木箱上的划痕（15 分钟）' }).click();
  await gamePage.getByRole('button', { name: '确认并结算' }).click();
  await waitForSavedEventCursor(gamePage, 2);
  await gamePage.reload();
  await gamePage.getByRole('button', { name: '进入 V0.4 平行廷根封闭切片' }).click();
  await expect(gamePage.getByRole('heading', { name: '人物档案', exact: true })).toBeVisible();
  const state = await readAutomationState(gamePage);
  expect(state.world.eventCursor).toBe(2);
  const legacy = await gamePage.evaluate(async () => await new Promise<unknown>((resolve, reject) => {
    const request = indexedDB.open('veilport-v01'); request.onerror = () => reject(request.error); request.onsuccess = () => { const db = request.result; const get = db.transaction('run', 'readonly').objectStore('run').get('current'); get.onerror = () => reject(get.error); get.onsuccess = () => { const value = get.result; db.close(); resolve(value); }; };
  }));
  expect(legacy).toEqual({ marker: 'legacy-v03' });
});

test('当前快照损坏时回退到上一份完整快照，不进入软锁', async ({ gamePage }) => {
  await createProfile(gamePage);
  await gamePage.getByRole('button', { name: '检查木箱上的划痕（15 分钟）' }).click();
  await gamePage.getByRole('button', { name: '确认并结算' }).click();
  await waitForSavedEventCursor(gamePage, 2);
  await gamePage.evaluate(async () => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('mistweave-v04'); request.onerror = () => reject(request.error); request.onsuccess = () => { const db = request.result; const tx = db.transaction('v04-run', 'readwrite'); const store = tx.objectStore('v04-run'); const get = store.get('current'); get.onerror = () => reject(get.error); get.onsuccess = () => { const envelope = get.result; store.put({ ...envelope, current: { broken: true }, integrity: 'fnv1a-corrupted' }, 'current'); }; tx.oncomplete = () => { db.close(); resolve(); }; };
    });
  });
  await gamePage.reload();
  await gamePage.getByRole('button', { name: '进入 V0.4 平行廷根封闭切片' }).click();
  await expect(gamePage.getByRole('heading', { name: '人物档案', exact: true })).toBeVisible();
  const state = await readAutomationState(gamePage);
  expect(state.world.eventCursor).toBe(1);
  expect(state.flow.phase).toBe('ready');
  await gamePage.getByRole('button', { name: '检查木箱上的划痕（15 分钟）' }).click();
  await expect(gamePage.getByText('行动预览', { exact: true })).toBeVisible();
});
