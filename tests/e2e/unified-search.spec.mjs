import { test, expect } from '@playwright/test';
import { readFileSync, mkdirSync } from 'node:fs';
const { version } = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url)));
// SYNTHETIC API fixtures. These UI tests do not establish live data accuracy.
const mp = { name: 'Mark Carney', district_name: 'Nepean', elected_office: 'MP', representative_set_name: 'House of Commons', party_name: 'Fixture Party', email: 'fixture@example.invalid', url: 'https://example.invalid/fixture-carney', related: { boundary_url: '/boundaries/federal-electoral-districts/35001/' }, offices: [] };
const mayor = { ...mp, name: 'Synthetic Ottawa Mayor', district_name: 'Ottawa', elected_office: 'Mayor', representative_set_name: 'Ottawa City Council', url: 'https://example.invalid/fixture-mayor' };
const ward = { ...mayor, name: 'Synthetic Ward Councillor', district_name: 'Ward 2', elected_office: 'Councillor', url: 'https://example.invalid/fixture-ward' };
const sets = [{ name: 'Ottawa City Council', related: { representatives_url: '/representatives/ottawa-city-council/' } }];

async function search(page, query) {
  await page.getByRole('searchbox', { name: 'Postal code, name or place' }).fill(query);
  await page.getByRole('button', { name: 'Find representatives', exact: true }).tap();
}

test.beforeEach(async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.__searchErrors = errors;
  page.__searchRequests = [];
  await page.addInitScript(version => {
    localStorage.setItem('CapacitorStorage.termsAcceptedVersion', version);
    localStorage.setItem('CapacitorStorage.disclaimerAcceptedVersion', version);
  }, version);
  await page.route('https://represent.opennorth.ca/**', route => {
    const u = new URL(route.request().url());
    page.__searchRequests.push(u.href);
    let objects = [];
    const name = u.searchParams.get('name__icontains')?.toLowerCase();
    const district = u.searchParams.get('district_name__icontains')?.toLowerCase();
    if (u.pathname === '/representative-sets/') objects = sets;
    else if (u.pathname === '/representatives/ottawa-city-council/') objects = [mayor, ward];
    else if (u.searchParams.has('point')) objects = [mp];
    else if (name && mp.name.toLowerCase().includes(name)) objects = [mp];
    else if (district && 'nepean'.includes(district)) objects = [mp];
    else if (district && district === 'ottawa') objects = [mayor];
    else if (district && district === 'ward 2') objects = [ward];
    return route.fulfill({ json: { objects, meta: { next: null } } });
  });
  await page.goto('/');
  await expect(page.getByRole('searchbox')).toBeVisible();
});
test.afterEach(async ({ page }) => expect(page.__searchErrors).toEqual([]));

test('one accessible input: Carney to full details, saved representative and activity replay', async ({ page }) => {
  await expect(page.getByRole('form', { name: 'Find representatives', exact: true }).locator('input')).toHaveCount(1);
  await expect(page.getByRole('searchbox')).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Find representatives', exact: true })).toBeDisabled();
  await search(page, '  cArNeY  ');
  await expect(page.getByRole('heading', { name: 'Mark Carney', exact: true })).toBeVisible();
  // Verify the existing message handoff without opening a mail client or sending.
  await page.evaluate(() => { window.__mailHandoffs = []; window.open = (...args) => { window.__mailHandoffs.push(args); return null; }; });
  await page.getByRole('button', { name: 'Email', exact: true }).tap();
  expect(await page.evaluate(() => window.__mailHandoffs)).toEqual([['mailto:fixture@example.invalid', '_self']]);
  await page.getByRole('button', { name: 'View Full Profile' }).tap();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toHaveCSS('opacity', '1');
  await expect(dialog.locator('section').filter({ has: page.getByText('Contact', { exact: true }) }).getByRole('link', { name: 'fixture@example.invalid', exact: true })).toHaveAttribute('href', 'mailto:fixture@example.invalid');
  await dialog.getByRole('button', { name: /Save Representative/ }).tap();
  await dialog.getByRole('button', { name: 'Close', exact: true }).tap();
  await page.getByRole('link', { name: 'Saved', exact: true }).tap();
  await expect(page.getByRole('heading', { name: 'Mark Carney', exact: true })).toBeVisible();
  await page.goto('/name-search?q=Carney');
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { name: 'Mark Carney', exact: true })).toBeVisible();
  await expect(page.getByRole('form', { name: 'Find representatives', exact: true }).locator('input')).toHaveCount(1);
  await expect(page.getByRole('searchbox')).toHaveCount(1);
});

test('city includes council wards; area and numbered riding remain searchable', async ({ page }) => {
  await search(page, '  oTtAwA  ');
  await expect(page.getByRole('heading', { name: 'Synthetic Ottawa Mayor', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Synthetic Ward Councillor', exact: true })).toBeVisible();
  await search(page, 'Nepean');
  await expect(page.getByRole('heading', { name: 'Mark Carney', exact: true })).toBeVisible();
  await search(page, 'Ward 2');
  await expect(page.getByRole('heading', { name: 'Synthetic Ward Councillor', exact: true })).toBeVisible();
});

test('postal variants retain local geocoding, cache and offline recovery', async ({ page }) => {
  for (const code of ['k1a0a9', 'K1A 0A9']) {
    await search(page, code);
    await expect(page.getByRole('heading', { name: 'Mark Carney', exact: true })).toBeVisible();
    await expect(page.getByRole('searchbox')).toHaveValue(/K1A ?0A9/);
  }
  expect(page.__searchRequests.some(url => url.includes('point='))).toBe(true);
  expect(page.__searchRequests.some(url => url.includes('name__icontains'))).toBe(false);
  await page.route('https://represent.opennorth.ca/**', route => route.abort());
  await page.reload();
  await search(page, 'k1a 0a9');
  await expect(page.getByText(/Showing saved results.*offline/)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Mark Carney', exact: true })).toBeVisible();
});

test('partial postal and blank do not request text; no results and network error are distinct', async ({ page }) => {
  const count = page.__searchRequests.length;
  await search(page, 'K1A');
  await expect(page.getByRole('alert')).toContainText('complete Canadian postal code');
  await expect(page.getByRole('searchbox')).toHaveAttribute('aria-invalid', 'true');
  expect(page.__searchRequests.length).toBe(count);
  await page.getByRole('searchbox').fill('   ');
  await expect(page.getByRole('button', { name: 'Find representatives', exact: true })).toBeDisabled();
  await search(page, 'NoSuchRepresentativeFixture');
  await expect(page.getByText('No representatives found', { exact: true })).toBeVisible();
  await page.route('https://represent.opennorth.ca/**', route => route.abort());
  await search(page, 'UncachedFixtureQuery');
  await expect(page.getByText('Search unavailable', { exact: true })).toBeVisible();
  await expect(page.getByText('No representatives found', { exact: true })).toHaveCount(0);
});

test('text cache survives reload offline, then editing clears stale results', async ({ page }) => {
  await search(page, 'Mark Carney');
  await expect(page.getByRole('heading', { name: 'Mark Carney', exact: true })).toBeVisible();
  await page.route('https://represent.opennorth.ca/**', route => route.abort());
  await page.reload();
  await search(page, '  MARK   carney  ');
  await expect(page.getByText(/Showing saved results.*offline/)).toBeVisible();
  await page.getByRole('searchbox').fill('Other');
  await expect(page.getByRole('heading', { name: 'Mark Carney', exact: true })).toHaveCount(0);
});

test('phone layouts at 320, 390, 768 and 1440 pixels keep one usable search control', async ({ page }, testInfo) => {
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    const input = page.getByRole('searchbox');
    await input.scrollIntoViewIfNeeded();
    await expect(input).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const box = await input.boundingBox();
    expect(box.height).toBeGreaterThanOrEqual(44);
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(width);
    mkdirSync('design-evidence/unified-search', { recursive: true });
    await page.screenshot({ path: `design-evidence/unified-search/fixture-${testInfo.project.name}-${width}.png` });
  }
});
