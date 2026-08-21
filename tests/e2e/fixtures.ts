import { expect, test as base, type Page } from '@playwright/test';

type GameFixtures = { gamePage: Page };

export const test = base.extend<GameFixtures>({
  gamePage: async ({ page }, use) => {
    const browserErrors: string[] = [];
    const externalRequests: string[] = [];

    page.on('console', (message) => {
      if (message.type() === 'error') browserErrors.push(`console.error: ${message.text()}`);
    });
    page.on('pageerror', (error) => browserErrors.push(`pageerror: ${error.message}`));
    await page.route('**/*', async (route) => {
      const url = new URL(route.request().url());
      if (url.protocol === 'data:' || url.protocol === 'blob:' || ['127.0.0.1', 'localhost'].includes(url.hostname)) {
        await route.continue();
        return;
      }
      externalRequests.push(url.href);
      await route.abort('blockedbyclient');
    });

    // Playwright creates a new isolated BrowserContext for every test. Deleting an
    // IndexedDB after React has opened it would be blocked, so isolation happens at
    // the context boundary instead of mutating a live application's storage.
    await page.goto('/');
    await use(page);

    expect(externalRequests, '默认自动化测试不得访问外部网络').toEqual([]);
    expect(browserErrors, '浏览器控制台或页面出现错误').toEqual([]);
  },
});

export { expect } from '@playwright/test';
