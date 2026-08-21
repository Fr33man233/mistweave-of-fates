import { expect, test } from '../fixtures';
import { createProfile, enterV04, readAutomationState } from '../helpers';

test.beforeEach(async ({ gamePage }) => enterV04(gamePage));

test('人物档案要求姓名和二选一性别，并实时投影属性加点', async ({ gamePage }) => {
  const createButton = gamePage.getByRole('button', { name: '创建人物档案' });
  await expect(createButton).toBeDisabled();
  await expect(gamePage.getByRole('option', { name: '非二元' })).toHaveCount(0);
  await expect(gamePage.getByText('力量：45')).toBeVisible();

  await gamePage.getByLabel('力量额外点数').fill('10');
  await expect(gamePage.getByText('力量：55')).toBeVisible();
  await createProfile(gamePage);

  const state = await readAutomationState(gamePage);
  expect(state.character).toMatchObject({ occupationId: 'detective', gender: 'female', attributes: { STR: 55 } });
  expect(state.world.eventCursor).toBe(1);
});

test('随机与平均分配能用固定 seed 快速用尽属性和技能预算', async ({ gamePage }) => {
  await gamePage.getByRole('button', { name: '随机分配' }).click();
  await expect(gamePage.getByText('剩余属性点：0/100')).toBeVisible();
  await gamePage.getByRole('button', { name: '平均分配当前职业' }).click();
  await expect(gamePage.getByText(/剩余职业技能点：0\//)).toBeVisible();
  await expect(gamePage.getByText(/剩余兴趣技能点：0\//)).toBeVisible();
});
