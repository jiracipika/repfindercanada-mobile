// Opt-in LIVE network check, separate from deterministic fixture e2e.
// Run after npm run build: node scripts/verify-unified-search-live.mjs
import { chromium, expect } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
const directory = 'design-evidence/unified-search';
mkdirSync(directory, { recursive: true });
const { version } = JSON.parse(readFileSync('package.json'));
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', '4175', '--strictPort'], { stdio: 'pipe' });
const responses = [], pending = [], errors = [], searches = [];
let browser, limited = false;
try {
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Preview startup timeout')), 15000);
    server.stdout.on('data', chunk => { if (String(chunk).includes('4175')) { clearTimeout(timer); resolve(); } });
    server.on('exit', code => { clearTimeout(timer); reject(new Error(`Preview exited ${code}`)); });
  });
  browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, colorScheme: 'dark' });
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => {
    if (!response.url().startsWith('https://represent.opennorth.ca/')) return;
    pending.push((async () => {
      if (response.status() === 429) { limited = true; await page.context().setOffline(true); }
      responses.push({ url: response.url(), status: response.status(), body: await response.text().catch(String) });
    })());
  });
  await page.addInitScript(version => {
    localStorage.setItem('CapacitorStorage.termsAcceptedVersion', version);
    localStorage.setItem('CapacitorStorage.disclaimerAcceptedVersion', version);
    localStorage.setItem('CapacitorStorage.theme', 'dark');
  }, version);
  await page.goto('http://127.0.0.1:4175/');
  for (const query of ['  cArNeY  ', 'oTtAwA', 'k1a0a9']) {
    if (limited) throw new Error('STOP: live HTTP 429');
    await page.getByRole('searchbox').fill(query);
    await page.getByRole('button', { name: 'Find representatives', exact: true }).tap();
    await expect(page.getByRole('heading', { name: 'Representatives found', exact: true })).toBeVisible({ timeout: 60000 });
    const names = await page.getByRole('heading', { level: 3 }).allTextContents();
    searches.push({ query, headings: names });
    await page.getByRole('button', { name: 'View Full Profile' }).first().scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${directory}/live-${query.trim().toLowerCase()}.png` });
    if (query.trim().toLowerCase() === 'carney') {
      await expect(page.getByRole('heading', { name: 'Mark Carney', exact: true })).toBeVisible();
      await page.getByRole('button', { name: 'View Full Profile' }).tap();
      await expect(page.getByRole('dialog')).toHaveCSS('opacity', '1');
      await page.screenshot({ path: `${directory}/live-carney-details.png` });
      await page.getByRole('dialog').getByRole('button', { name: 'Close', exact: true }).tap();
    }
  }
  expect(errors).toEqual([]);
  console.log(JSON.stringify({ searches, errors, limited }, null, 2));
} finally {
  await Promise.allSettled(pending);
  writeFileSync(`${directory}/live-browser.json`, JSON.stringify({ kind: 'LIVE — no fixtures or intercepted API responses', capturedAt: new Date().toISOString(), searches, responses, errors, limited }, null, 2));
  await browser?.close();
  server.kill('SIGTERM');
}
