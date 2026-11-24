import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

// Layout and wiring checks added with the Civic Field Guide pass. The one
// representative below is a synthetic fixture: these tests do not establish
// live data accuracy.
const { version } = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url)));
const mp = { name: 'Design Fixture MP', district_name: 'Fixture Riding', elected_office: 'MP', representative_set_name: 'House of Commons', party_name: 'Fixture Party', email: 'fixture@example.invalid', url: 'https://example.invalid/fixture-design', related: { boundary_url: '/boundaries/federal-electoral-districts/35001/' }, offices: [] };

test.beforeEach(async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.__errors = errors;
  await page.addInitScript(version => {
    localStorage.setItem('CapacitorStorage.termsAcceptedVersion', version);
    localStorage.setItem('CapacitorStorage.disclaimerAcceptedVersion', version);
  }, version);
  await page.goto('/');
  await expect(page.getByRole('searchbox')).toBeVisible();
});
test.afterEach(async ({ page }) => expect(page.__errors).toEqual([]));

test('a sheet mounted closed opens above its own scrim and closes from its button', async ({ page }) => {
  await page.getByRole('button', { name: 'Who handles what?' }).tap();
  const dialog = page.getByRole('dialog', { name: 'Who handles what?' });
  await expect(dialog).toHaveCSS('opacity', '1');
  await expect(dialog.getByRole('heading', { name: 'Federal', exact: true })).toBeVisible();
  // Scrim and sheet are both fixed children of <body>. With equal z-indexes the
  // DOM order decided, and a sheet that mounts closed gets its scrim appended
  // after it: the scrim then covered its own sheet and swallowed every tap.
  const coveredByScrim = await dialog.evaluate(el => {
    const box = el.getBoundingClientRect();
    const hit = document.elementFromPoint(box.x + box.width / 2, box.top + 40);
    return !el.contains(hit);
  });
  expect(coveredByScrim).toBe(false);
  await dialog.getByRole('button', { name: 'Close', exact: true }).tap();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('the search button stays above the tab bar on a 320x568 phone with a notch', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  // The insets a notched device reports through env(safe-area-inset-*).
  await page.addStyleTag({ content: ':root{--s-top:47px;--s-bottom:34px}' });
  // The title, intro and trust chips used to push the button under the bar.
  await expect.poll(() => page.evaluate(() => {
    const button = document.querySelector('.civic-primary-button').getBoundingClientRect();
    const nav = document.querySelector('.civic-nav-shell').getBoundingClientRect();
    return button.top >= 0 && button.bottom <= nav.top;
  })).toBe(true);
});

test('tab labels hold the 12px floor', async ({ page }) => {
  const sizes = await page.evaluate(() => [...document.querySelectorAll('.civic-nav-item .nav-label')].map(el => parseFloat(getComputedStyle(el).fontSize)));
  expect(sizes).toHaveLength(4);
  for (const size of sizes) expect(size).toBeGreaterThanOrEqual(12);
});

test('an incomplete postal code is explained once', async ({ page }) => {
  await page.getByRole('searchbox').fill('K1A');
  await page.getByRole('button', { name: 'Find representatives', exact: true }).tap();
  await expect(page.locator('#search-input-error')).toHaveText(/complete Canadian postal code/);
  // The grey hint used to repeat the red message directly above it.
  await expect(page.locator('#search-hint')).toHaveCount(0);
  await expect(page.getByText(/complete Canadian postal code/)).toHaveCount(1);
});

test('off-screen pager pages are hidden from paint and the tab order at rest', async ({ page }) => {
  const pageVisibility = title => page.evaluate(text => {
    const heading = [...document.querySelectorAll('h2')].find(el => el.textContent.trim() === text);
    return getComputedStyle(heading.closest('[aria-hidden]')).visibility;
  }, title);
  // The pager keeps all four tabs mounted; aria-hidden alone left their links
  // and buttons focusable, and had them painted off-screen.
  await expect.poll(() => pageVisibility('Saved representatives.')).toBe('hidden');
  await page.getByRole('link', { name: 'Saved', exact: true }).tap();
  await expect(page.getByRole('heading', { name: 'Saved representatives.' })).toBeVisible();
  await expect.poll(() => pageVisibility('Saved representatives.')).toBe('visible');
  await expect.poll(() => pageVisibility('Know who represents you.')).toBe('hidden');
});

test('the postal index is loaded off the main thread', async ({ page }) => {
  await page.route('https://represent.opennorth.ca/**', route => route.fulfill({ json: { objects: [mp], meta: { next: null } } }));
  await page.getByRole('searchbox').fill('K1A 0A9');
  await page.getByRole('button', { name: 'Find representatives', exact: true }).tap();
  await expect(page.getByRole('heading', { name: mp.name, exact: true })).toBeVisible();
  // A lookup succeeded, and the page never fetched the index itself: a worker
  // did. If this fails, the worker path broke and the search fell back to a
  // 1.5 s main-thread parse on slow phones.
  const fetchedByPage = await page.evaluate(() => performance.getEntriesByType('resource').some(entry => /postal_(index|data)/.test(entry.name)));
  expect(fetchedByPage).toBe(false);
});
