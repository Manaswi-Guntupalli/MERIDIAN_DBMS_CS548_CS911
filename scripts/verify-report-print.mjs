// Checks real browser print output, including content that extends beyond the viewport.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { chromium, expect } from '@playwright/test';
import { createCanvas } from '@napi-rs/canvas';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';

const origin = process.env.TEST_BASE_URL || 'http://localhost:5173';
const browser = await chromium.launch({ headless: true,
  ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : {}),
});
await fs.mkdir('tmp/pdfs', { recursive: true });
await fs.mkdir('output/pdf', { recursive: true });
const normalized = text => text.replace(/\s+/g, '');

async function verifyPdf(page, report, path, options, render = false) {
  const bytes = await page.pdf({ path, printBackground: true, ...options });
  const task = pdfjs.getDocument({ data: new Uint8Array(bytes), useSystemFonts: true });
  const pdf = await task.promise;
  let text = '';
  let studentTotalPresent = false;
  for (let i = 1; i <= pdf.numPages; i++) {
    const sheet = await pdf.getPage(i);
    const viewport = sheet.getViewport({ scale: 1 });
    const content = await sheet.getTextContent();
    studentTotalPresent ||= content.items.some(item => item.str?.trim() === String(report.metrics.students));
    // Chromium may emit grid text after later blocks in the PDF content stream.
    const readingOrder = [...content.items].filter(item => item.str).sort((a, b) =>
      Math.abs(a.transform[5] - b.transform[5]) < 2
        ? a.transform[4] - b.transform[4] : b.transform[5] - a.transform[5]);
    text += readingOrder.map(item => item.str).join(' ') + ' ';
    for (const item of content.items.filter(item => item.str?.trim())) {
      const [, , , , x, y] = item.transform;
      assert(x >= 0 && x + item.width <= viewport.width + 1, `Text cropped horizontally on page ${i}: ${item.str}`);
      assert(y >= 0 && y <= viewport.height, `Text cropped vertically on page ${i}: ${item.str}`);
    }
    if (render) {
      const view = sheet.getViewport({ scale: 1.3 });
      const canvas = createCanvas(Math.ceil(view.width), Math.ceil(view.height));
      await sheet.render({ canvasContext: canvas.getContext('2d'), viewport: view }).promise;
      await fs.writeFile(`tmp/pdfs/${path.includes('long') ? 'long' : 'fixed'}-${i}.png`, canvas.toBuffer('image/png'));
    }
  }
  for (const expected of ['AI-generated reports', 'Operations Summary', 'Forecast highlights', report.narrative,
    ...report.recommendations, ...report.predictions.flatMap(p => [p.label, p.note])]) {
    assert(normalized(text).includes(normalized(expected)), `Missing printed content: ${expected}`);
  }
  assert(!text.includes('Search or jump'), 'App navigation leaked into PDF');
  assert(!text.includes('Regenerate'), 'Action buttons leaked into PDF');
  assert(studentTotalPresent, 'Printed student total must match live metrics');
  console.log(`PASS ${path}: ${pdf.numPages} page(s), all report and forecast text present within page bounds`);
  const count = pdf.numPages;
  await task.destroy();
  return count;
}

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 700 }, locale: 'en-US' });
  await page.goto(`${origin}/login`);
  await page.locator('input[type=email]').fill(process.env.TEST_EMAIL || 'principal@meridian.school');
  await page.locator('input[type=password]').fill(process.env.TEST_PASSWORD || 'meridian123');
  await page.getByRole('button', { name: 'Sign in', exact: false }).click();
  await page.waitForURL(`${origin}/`);
  const response = page.waitForResponse(r => r.url().includes('/api/reports/summary'));
  await page.goto(`${origin}/reports`);
  const report = await (await response).json();
  await expect(page.getByRole('heading', { name: 'Forecast highlights' })).toBeAttached();
  await page.evaluate(() => document.fonts.ready);
  await page.locator('main').evaluate(main => { main.scrollTop = main.scrollHeight; });
  await verifyPdf(page, report, 'output/pdf/meridian-operations-report.pdf', { format: 'A4' }, true);
  await page.setViewportSize({ width: 760, height: 500 });
  await verifyPdf(page, report, 'tmp/pdfs/report-letter.pdf', { format: 'Letter' });
  await verifyPdf(page, report, 'tmp/pdfs/report-landscape.pdf', { format: 'A4', landscape: true });

  // Deliberately long fixture verifies natural pagination rather than squeezing or truncation.
  const longReport = { ...report,
    narrative: Array(25).fill(report.narrative).join(' '),
    recommendations: Array.from({ length: 15 }, (_, i) => `Recommendation ${i + 1}: ${report.recommendations[i % report.recommendations.length]}`),
    predictions: [...report.predictions, { label: 'Final forecast completeness check', note: 'This final forecast must appear after every recommendation.' }],
  };
  await page.route('**/api/reports/summary', route => route.fulfill({ status: 200, json: longReport }));
  await page.getByRole('button', { name: 'Regenerate', exact: true }).click();
  await expect(page.getByText('Final forecast completeness check', { exact: true })).toBeAttached();
  const pages = await verifyPdf(page, longReport, 'tmp/pdfs/report-long.pdf', { format: 'A4' }, true);
  assert(pages > 1, 'Long report must paginate');
  console.log('All 4 print export checks passed.');
} finally { await browser.close(); }
