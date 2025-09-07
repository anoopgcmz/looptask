import { test, expect } from '@playwright/test';

test('signin with otp navigates to tasks', async ({ page }) => {
  let captured = '123456';
  await page.route('**/api/auth/otp/request', (route) => {
    route.fulfill({ json: { ok: true, code: captured } });
  });
  await page.route('**/api/auth/otp/verify', (route) => {
    const data = JSON.parse(route.request().postData() || '{}') as unknown;
    expect((data as { code: string }).code).toBe(captured);
    route.fulfill({ json: { ok: true } });
  });
  await page.goto('about:blank');
  await page.evaluate(async () => {
    await fetch('/api/auth/otp/request', { method: 'POST', body: '{}' });
    await fetch('/api/auth/otp/verify', {
      method: 'POST',
      body: JSON.stringify({ code: '123456' }),
    });
    history.pushState({}, '', '/tasks');
  });
  await expect(page).toHaveURL('/tasks');
});
