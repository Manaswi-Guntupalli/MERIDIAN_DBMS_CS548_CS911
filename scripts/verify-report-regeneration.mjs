// Focused browser regression check. Only reads reports (and their normal audit logs).
import { chromium, expect } from '@playwright/test';

const origin = process.env.TEST_BASE_URL || 'http://localhost:5173';
const browser = await chromium.launch({ headless: true,
  ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : {}),
});
const checks = [];
const check = (name) => { checks.push(name); console.log(`PASS ${name}`); };
try {
  const context = await browser.newContext();
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`${origin}/login`);
  await page.locator('input[type=email]').fill(process.env.TEST_EMAIL || 'principal@meridian.school');
  await page.locator('input[type=password]').fill(process.env.TEST_PASSWORD || 'meridian123');
  await page.getByRole('button', { name: 'Sign in', exact: false }).click();
  await page.waitForURL(`${origin}/`);
  const firstResponse = page.waitForResponse(r => r.url().includes('/api/reports/summary'));
  await page.goto(`${origin}/reports`);
  const initial = await firstResponse;
  expect(initial.status()).toBe(200);
  const previous = await initial.json();
  expect(['ai', 'template']).toContain(previous.narrativeSource);
  expect(initial.headers()['cache-control']).toBe('no-store');
  await expect(page.getByText(previous.narrative, { exact: true })).toBeVisible();
  if (previous.narrativeSource === 'template') {
    await expect(page.getByText('Using a data-based summary template because AI generation is unavailable.')).toBeVisible();
  }
  check('Live report loads with generation source and no-store policy');

  let calls = 0;
  await page.route('**/api/reports/summary', async route => {
    calls++;
    const response = await route.fetch();
    await new Promise(resolve => setTimeout(resolve, 700));
    await route.fulfill({ response });
  });
  const nextResponse = page.waitForResponse(r => r.url().includes('/api/reports/summary'));
  await page.getByRole('button', { name: 'Regenerate', exact: true }).click();
  const busy = page.getByRole('button', { name: 'Regenerating…', exact: true });
  await expect(busy).toBeDisabled();
  await expect(busy).toHaveAttribute('aria-busy', 'true');
  await expect(busy.locator('.animate-spin')).toBeVisible();
  await expect(page.getByRole('status')).toContainText('Refreshing school data and forecasts');
  await busy.evaluate(button => button.click());
  check('Loading spinner, accessible status, and duplicate-click protection');
  const refreshedResponse = await nextResponse;
  expect(refreshedResponse.status()).toBe(200);
  const refreshed = await refreshedResponse.json();
  expect(Date.parse(refreshed.generatedAt)).toBeGreaterThan(Date.parse(previous.generatedAt));
  await expect(page.getByRole('status')).toContainText('Report regenerated');
  await expect(page.getByRole('button', { name: 'Regenerate', exact: true })).toBeEnabled();
  expect(calls).toBe(1);
  await expect(page.getByText(new Date(refreshed.generatedAt).toLocaleString('en-US'), { exact: true })).toBeVisible();
  check('Successful live regeneration updates timestamp and confirms completion');

  await page.unroute('**/api/reports/summary');
  await page.route('**/api/reports/summary', route => route.fulfill({
    status: 503, json: { error: 'Report service temporarily unavailable.' },
  }));
  await page.getByRole('button', { name: 'Regenerate', exact: true }).click();
  await expect(page.locator('main').getByRole('alert')).toContainText('Report service temporarily unavailable. Your previous report is still displayed.');
  await expect(page.getByText(refreshed.narrative, { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Regenerate', exact: true })).toBeEnabled();
  check('Refresh failure shows the error and preserves the previous report');

  await page.unroute('**/api/reports/summary');
  await page.getByRole('button', { name: 'Regenerate', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Report regenerated');
  await expect(page.locator('main').getByRole('alert')).toHaveCount(0);
  check('Retry succeeds and clears the previous error');

  await page.route('**/api/reports/summary', route => route.fulfill({
    status: 200, json: { ...refreshed, engineOnline: false, predictions: [] },
  }));
  await page.getByRole('button', { name: 'Regenerate', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('forecast service is unavailable');
  await expect(page.getByText('Intelligence engine offline', { exact: false })).toBeVisible();
  check('Unavailable forecast service is reported without hiding the report');

  const freshPage = await context.newPage();
  freshPage.on('pageerror', error => errors.push(error.message));
  await freshPage.route('**/api/reports/summary', route => route.fulfill({
    status: 503, json: { error: 'Report service temporarily unavailable.' },
  }));
  await freshPage.goto(`${origin}/reports`);
  await expect(freshPage.locator('main').getByRole('alert')).toContainText('Report service temporarily unavailable.');
  await expect(freshPage.getByRole('button', { name: 'Try again' })).toBeVisible();
  check('Initial load failure displays a recoverable error instead of crashing');
  await freshPage.unroute('**/api/reports/summary');
  await freshPage.getByRole('button', { name: 'Try again' }).click();
  await expect(freshPage.getByRole('button', { name: 'Regenerate', exact: true })).toBeVisible();
  await expect(freshPage.locator('main').getByRole('alert')).toHaveCount(0);
  check('Initial load retry restores the full report');
  expect(errors).toEqual([]);
  check('No uncaught browser errors');
  console.log(`${checks.length} report regeneration checks passed.`);
} finally {
  await browser.close();
}
