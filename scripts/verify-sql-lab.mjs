import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const origin = process.env.TEST_BASE_URL || 'http://localhost:5173';
const browser = await chromium.launch({ headless: true,
  ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : {}),
});
const checks = [];
const pass = name => { checks.push(name); console.log('PASS ' + name); };
await fs.mkdir('tmp/sql-lab', { recursive: true });
try {
  const page = await browser.newPage({ viewport: { width: 1536, height: 1000 }, locale: 'en-US' });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(origin + '/login');
  await page.locator('input[type=email]').fill(process.env.TEST_EMAIL || 'principal@meridian.school');
  await page.locator('input[type=password]').fill(process.env.TEST_PASSWORD || 'meridian123');
  await page.getByRole('button', { name: 'Sign in', exact: false }).click();
  await page.waitForURL(origin + '/');
  const initialSchema = page.waitForResponse(response => response.url().endsWith('/database/lab/schema'));
  await page.goto(origin + '/database');
  const schemaResponse = await initialSchema;
  assert.equal(schemaResponse.status(), 200);
  const structure = (await schemaResponse.json()).schema;
  assert(structure.columns.length > 100);
  await expect(page.getByRole('button', { name: 'Run SQL', exact: true })).toBeEnabled();
  pass('Private PostgreSQL workspace and schema initialize');

  const editor = page.getByRole('textbox', { name: 'SQL query', exact: true });
  const results = page.getByRole('region', { name: 'Query results' });
  async function run(sql, expectedStatus = 200) {
    if (sql !== undefined) await editor.fill(sql);
    const pending = page.waitForResponse(response => response.url().endsWith('/database/lab/execute'));
    await page.getByRole('button', { name: 'Run SQL', exact: true }).click();
    const response = await pending;
    const body = await response.json();
    assert.equal(response.status(), expectedStatus, JSON.stringify(body));
    await expect(page.getByRole('button', { name: 'Run SQL', exact: true })).toBeEnabled();
    return body;
  }
  const initial = await run();
  assert.equal(initial.results[0].rows.length, 8);
  await expect(results.getByRole('cell', { name: 'Aarav Shah', exact: true })).toBeVisible();
  pass('Starter SELECT displays all eight fictional students');

  const multiple = await run('SELECT 1 AS same, 2 AS same, NULL AS empty; SELECT 9 AS second;');
  assert.deepEqual(multiple.results[0].rows, [[1, 2, null]]);
  await expect(results.getByRole('columnheader', { name: 'same', exact: true })).toHaveCount(2);
  await expect(results.getByRole('cell', { name: 'NULL', exact: true })).toBeVisible();
  await results.getByRole('button', { name: /^Result 2/ }).click();
  await expect(results.getByRole('columnheader', { name: 'second' })).toBeVisible();
  pass('Multiple result tabs, duplicate column names, and NULL values render correctly');

  await editor.fill('SELECT 41 AS answer;\nSELECT 99 AS not_selected;');
  await editor.evaluate(element => { element.focus(); element.setSelectionRange(0, element.value.indexOf(';') + 1); });
  const selectedResponse = page.waitForResponse(response => response.url().endsWith('/database/lab/execute'));
  await editor.press('Control+Enter');
  const selected = await (await selectedResponse).json();
  assert.equal(selected.results.length, 1); assert.deepEqual(selected.results[0].rows, [[41]]);
  await expect(page.getByRole('button', { name: 'Run SQL', exact: true })).toBeEnabled();
  pass('Keyboard shortcut executes the selected SQL only');

  for (const title of ['Add a student', 'Update a student', 'Delete the demo student']) {
    await page.getByRole('button', { name: new RegExp('^' + title) }).click();
    const response = await run();
    assert.equal(response.results[0].rows[0][0], 'demo-student');
  }
  pass('Query shelf INSERT, UPDATE, and DELETE operate on the demo database');

  await run('SELEC 1;', 400);
  await expect(page.locator('main').getByRole('alert')).toContainText('42601');
  await run('SELECT 7 AS recovered;');
  await expect(page.locator('main').getByRole('alert')).toHaveCount(0);
  pass('Readable PostgreSQL errors clear after a successful retry');

  await page.getByRole('button', { name: /^Call a payment function/ }).click();
  const payment = await run();
  assert.equal(Number(payment.results[1].rows[0][2]), 100);
  await page.getByRole('button', { name: /^Vector similarity search/ }).click();
  const vectors = await run();
  assert.equal(vectors.results[0].rows[0][0], 'Attendance policy');
  pass('PL/pgSQL payment function and pgvector similarity run from the editor');

  await run("SELECT '=example' AS text, 123 AS number;");
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'CSV', exact: true }).click();
  const download = await downloadEvent;
  const csv = await fs.readFile(await download.path(), 'utf8');
  assert(csv.includes("'=example")); assert(csv.includes('123'));
  pass('CSV exports the current result and escapes spreadsheet formulas');
  await page.getByRole('button', { name: /^History/ }).click();
  await page.getByRole('button', { name: /SELECT '=example'/ }).click();
  await expect(editor).toHaveValue("SELECT '=example' AS text, 123 AS number;");
  pass('Query history restores a previous query into the editor');

  await run('CREATE TABLE "QueryDemo" (id integer PRIMARY KEY, note text);');
  await page.getByRole('textbox', { name: 'Find a table' }).fill('QueryDemo');
  await page.getByRole('button', { name: 'QueryDemo', exact: true }).click();
  await page.getByRole('button', { name: 'Query this table' }).click();
  await expect(editor).toHaveValue('SELECT * FROM "QueryDemo" LIMIT 100;');
  pass('Schema explorer refreshes after DDL and generates a table query');
  await page.getByRole('button', { name: 'Reset demo', exact: true }).click();
  await page.getByRole('button', { name: 'Keep working', exact: true }).click();
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
  await page.getByRole('button', { name: 'Reset demo', exact: true }).click();
  await page.getByRole('button', { name: 'Restore demo database', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Playground reset', { timeout: 50_000 });
  await expect(page.getByRole('button', { name: 'QueryDemo', exact: true })).toHaveCount(0);
  const restored = await run('SELECT count(*) FROM "Student";');
  assert.equal(Number(restored.results[0].rows[0][0]), 8);
  await page.getByRole('textbox', { name: 'Find a table' }).fill('');
  pass('Reset confirmation supports cancel and restores schema and fictional records');

  await page.getByRole('tab', { name: 'Live database evidence' }).click();
  const livePending = page.waitForResponse(response => response.url().endsWith('/database/queries/fee-summary'));
  await page.getByRole('button', { name: 'View + GROUP BY + aggregates', exact: true }).click();
  assert.equal((await livePending).status(), 200);
  await expect(page.getByText('Live website database · read-only examples', { exact: true })).toBeVisible();
  const featuresPending = page.waitForResponse(response => response.url().endsWith('/database/features'));
  await page.getByRole('button', { name: 'Vector indexes and role policies', exact: true }).click();
  assert.equal((await featuresPending).status(), 200);
  pass('Existing live SQL evidence and vector index/policy inspection still work');

  await page.getByRole('tab', { name: 'SQL playground', exact: true }).click();
  await editor.fill('SELECT "name", "admissionNo" FROM "Student" ORDER BY "name";');
  await run();
  await page.locator('main').evaluate(main => { main.scrollTop = 0; });
  await page.screenshot({ path: 'tmp/sql-lab/desktop.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('main').evaluate(main => { main.scrollTop = 0; });
  const overflow = await page.evaluate(() => ({ body: document.body.scrollWidth > window.innerWidth,
    main: document.querySelector('main').scrollWidth > document.querySelector('main').clientWidth }));
  assert(!overflow.body && !overflow.main, 'Page overflows horizontally on mobile');
  await page.screenshot({ path: 'tmp/sql-lab/mobile.png' });
  pass('Desktop and mobile layouts fit without page-level horizontal overflow');
  assert.deepEqual(errors, []);
  pass('No uncaught browser errors');
  await fs.writeFile('tmp/sql-lab/browser-results.json', JSON.stringify({ checks, count: checks.length }, null, 2));
  console.log(`${checks.length} SQL Lab browser checks passed.`);
} finally { await browser.close(); }
