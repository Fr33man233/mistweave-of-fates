import { expect, type Page } from '@playwright/test';
import type { AutomationState } from '../../src/test-support/automation-state';

export async function enterV04(page: Page): Promise<void> {
  await page.getByRole('button', { name: '进入 V0.4 平行廷根封闭切片' }).click();
  await expect(page.getByRole('heading', { name: '创建人物档案' })).toBeVisible();
  await page.waitForFunction(() => typeof window.render_game_to_text === 'function');
}

export async function readAutomationState(page: Page): Promise<AutomationState> {
  const serialized = await page.evaluate(() => {
    if (!window.render_game_to_text) throw new Error('render_game_to_text is unavailable');
    return window.render_game_to_text();
  });
  return JSON.parse(serialized) as AutomationState;
}

export async function createProfile(page: Page, name = '自动化调查员'): Promise<void> {
  await page.getByLabel('姓名').fill(name);
  await page.getByLabel('性别').selectOption('female');
  await page.getByRole('button', { name: '创建人物档案' }).click();
  await expect(page.getByRole('heading', { name: '人物档案', exact: true })).toBeVisible();
}

export async function waitForSavedEventCursor(page: Page, expectedCursor: number): Promise<void> {
  await expect.poll(async () => page.evaluate(async () => {
    return new Promise<number | null>((resolve, reject) => {
      const openRequest = indexedDB.open('mistweave-v04');
      openRequest.onerror = () => reject(openRequest.error);
      openRequest.onsuccess = () => {
        const db = openRequest.result;
        const transaction = db.transaction('v04-run', 'readonly');
        const request = transaction.objectStore('v04-run').get('current');
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const cursor = request.result?.current?.world?.eventCursor;
          db.close();
          resolve(typeof cursor === 'number' ? cursor : null);
        };
      };
    });
  })).toBe(expectedCursor);
}
