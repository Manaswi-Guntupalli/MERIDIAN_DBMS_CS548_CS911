// Browser contract checks with fictional identity/provider responses; no paid calls.
import { chromium, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
const origin = process.env.TEST_BASE_URL || 'http://localhost:5173';
const browser = await chromium.launch({ headless: true,
  ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : {}),
});
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await context.addInitScript(() => localStorage.setItem('meridian_token', 'fictional-browser-test-token'));
  let configured = true, statusFailure = false, role = 'SUPER_ADMIN', calls = 0, mode = 'success';
  const status = () => ({ configured, model: 'gpt-4o-mini', timeoutMs: 12000 });
  await context.route('**/api/**', async route => {
    const url = new URL(route.request().url()).pathname;
    if (url === '/api/auth/me') return route.fulfill({ json: { user: {
      id: 'test-super', schoolId: 'fictional-school', name: 'Test Administrator', role,
      email: 'test@example.test', school: { id: 'fictional-school', name: 'Fictional School', code: 'TEST' },
    } } });
    if (url === '/api/ai/status') return route.fulfill(statusFailure
      ? { status: 503, json: { error: 'Status unavailable' } } : { json: status() });
    if (url === '/api/ai/check') {
      calls++;
      await new Promise(resolve => setTimeout(resolve, 500));
      if (mode === 'network') return route.fulfill({ status: 503, json: { error: 'Connection check unavailable.' } });
      return route.fulfill({ json: { ...status(), ok: mode === 'success',
        message: mode === 'success' ? 'OpenAI responded successfully.' : 'OpenAI quota is exhausted.',
        checkedAt: new Date().toISOString() } });
    }
    if (url === '/api/notifications/channels') return route.fulfill({ json: { email: { provider: 'SendGrid', configured: false } } });
    if (url === '/api/notifications') return route.fulfill({ json: { unread: 0, notifications: [] } });
    if (url === '/api/emergency/active') return route.fulfill({ json: { active: null } });
    if (url === '/api/school/hours') return route.fulfill({ json: {
      configured: true, dayStart: '09:00', dayEnd: '16:00', workingDays: 5,
      periods: [], breaks: [], holidays: [], todayIsHoliday: false,
    } });
    return route.fulfill({ json: {} });
  });
  await context.route('**/socket.io*', route => route.abort());
  await context.routeWebSocket('**/socket.io*', socket => socket.close());
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => { errors.push(error.message); console.error(error.stack); });
  await page.goto(`${origin}/settings`);
  await expect(page.getByRole('heading', { name: 'OpenAI connection' })).toBeVisible();
  await expect(page.getByText('Key configured', { exact: true })).toBeVisible();
  expect(calls).toBe(0);
  console.log('PASS configuration renders without an automatic billable request');
  await page.getByRole('button', { name: 'Test connection', exact: true }).click();
  const pending = page.getByRole('button', { name: 'Testing connection…' });
  await expect(pending).toBeDisabled();
  await expect(pending).toHaveAttribute('aria-busy', 'true');
  await expect(pending.locator('.animate-spin')).toBeVisible();
  await pending.evaluate(button => button.click());
  await expect(page.getByRole('status')).toContainText('OpenAI responded successfully.');
  expect(calls).toBe(1);
  console.log('PASS spinner, duplicate-click protection and explicit success');
  mode = 'quota';
  await page.getByRole('button', { name: 'Test connection', exact: true }).click();
  await expect(page.locator('main').getByRole('alert')).toContainText('quota is exhausted');
  mode = 'network';
  await page.getByRole('button', { name: 'Test connection', exact: true }).click();
  await expect(page.locator('main').getByRole('alert')).toContainText('Connection check unavailable.');
  mode = 'success';
  await page.getByRole('button', { name: 'Test connection', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('OpenAI responded successfully.');
  await expect(page.locator('main').getByRole('alert')).toHaveCount(0);
  console.log('PASS provider/HTTP failures are visible and retry clears the error');
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await mkdir('tmp/openai-qa', { recursive: true });
  await page.screenshot({ path: 'tmp/openai-qa/settings-mobile.png', fullPage: true });
  console.log('PASS mobile layout stays inside the viewport');
  configured = false;
  await page.reload();
  await expect(page.getByText('Disabled · server key missing')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Test connection', exact: true })).toBeDisabled();
  statusFailure = true;
  await page.reload();
  await expect(page.locator('main').getByRole('alert')).toContainText('Unable to load OpenAI configuration.');
  console.log('PASS missing key and configuration errors have explicit states');
  role = 'PRINCIPAL';
  await page.reload();
  await expect(page.getByRole('heading', { name: 'OpenAI connection' })).toHaveCount(0);
  expect(errors).toEqual([]);
  console.log('PASS non-Super Admin UI guard and no uncaught browser errors');
} finally { await browser.close(); }
