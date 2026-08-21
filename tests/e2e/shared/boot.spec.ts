import { expect, test } from '../fixtures';
import { enterV04, readAutomationState } from '../helpers';

test('从公共入口进入 V0.4，并只在测试模式暴露版本化状态投影', async ({ gamePage }) => {
  await expect(gamePage.getByRole('heading', { name: 'Mistweave of Fates' })).toBeVisible();
  await enterV04(gamePage);

  const state = await readAutomationState(gamePage);
  expect(state).toMatchObject({
    automationStateVersion: '1.0.0',
    productVersion: '0.4.0',
    productMode: 'v04',
    character: null,
    world: { worldSeed: 'v04-ui-demo', eventCursor: 0 },
    model: { externalCalls: 0, rawTextStored: false },
  });
  expect(JSON.stringify(state)).not.toMatch(/"(?:apiKey|prompt|playerText|hiddenTruth)"/i);
});
