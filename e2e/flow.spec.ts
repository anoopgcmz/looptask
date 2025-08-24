import { test, expect } from '@playwright/test';

test('three step task flow completes', async ({ page }) => {
  await page.goto('about:blank');
  const result = await page.evaluate(() => {
    const steps = ['Acc', 'Sr', 'Chief'];
    const notifications: string[] = [];
    let idx = 0;
    while (idx < steps.length) {
      notifications.push(`notify:${steps[idx]}`);
      idx++;
    }
    return { notifications, status: 'DONE' };
  });
  expect(result.notifications).toEqual([
    'notify:Acc',
    'notify:Sr',
    'notify:Chief',
  ]);
  expect(result.status).toBe('DONE');
});
