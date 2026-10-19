import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const { version } = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url)));
// Deliberately synthetic local data: tests exercise UI, not live representative accuracy.
const representative = {
  id: 'profile-regression-fixture', name: 'Profile Test Representative',
  constituency: 'Test Riding', province: 'Ontario', party: 'Independent',
  electedOffice: 'MP', level: 'federal', email: 'test@example.invalid',
  offices: [],
};

async function openProfile(page) {
  await page.getByRole('button', { name: 'View Full Profile' }).tap();
  const dialog = page.getByRole('dialog', { name: /Profile Test Representative/ });
  await expect(dialog).toBeVisible();
  // Visibility alone does not catch the transparent, tap-blocking regression.
  await expect(dialog).toHaveCSS('opacity', '1');
  const box = await dialog.boundingBox();
  expect(box.width).toBeGreaterThan(300);
  expect(box.width).toBeLessThanOrEqual(600);
  await expect.poll(() => dialog.evaluate(el => {
    const b = el.getBoundingClientRect();
    return el.contains(document.elementFromPoint(b.x + b.width / 2, b.y + Math.min(60, b.height / 2)));
  })).toBe(true);
  return dialog;
}

async function assertDismissed(page) {
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.body).pointerEvents)).not.toBe('none');
}

test.beforeEach(async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(({ representative, version }) => {
    localStorage.setItem('CapacitorStorage.termsAcceptedVersion', version);
    localStorage.setItem('CapacitorStorage.disclaimerAcceptedVersion', version);
    localStorage.setItem('CapacitorStorage.SAVED_REPS_V2', JSON.stringify([representative]));
  }, { representative, version });
  await page.goto('/saved');
  await expect(page.getByRole('button', { name: 'View Full Profile' })).toBeVisible();
  page.__profileErrors = errors;
});

test.afterEach(async ({ page }) => {
  expect(page.__profileErrors).toEqual([]);
});

test('touch open, close, reopen and Escape leave the app interactive', async ({ page }) => {
  for (let i = 0; i < 3; i++) {
    const dialog = await openProfile(page);
    await dialog.getByRole('button', { name: 'Close', exact: true }).tap();
    await assertDismissed(page);
  }
  await openProfile(page);
  await page.keyboard.press('Escape');
  await assertDismissed(page);
  await page.getByRole('link', { name: 'Profile', exact: true }).tap();
  const clearCaches = page.getByRole('button', { name: 'Clear all caches', exact: true });
  await clearCaches.scrollIntoViewIfNeeded();
  await expect(clearCaches).toBeInViewport();
  await expect(clearCaches).toBeEnabled();
  await page.getByRole('button', { name: 'Save Profile', exact: true }).tap();
  await expect(page.getByText('Your profile has been updated.')).toBeVisible();
});

test('viewport switches during entrance never strand an invisible modal', async ({ page }) => {
  await page.setViewportSize({ width: 820, height: 1180 });
  await page.getByRole('button', { name: 'View Full Profile' }).tap();
  await page.setViewportSize({ width: 390, height: 844 });
  const dialog = page.getByRole('dialog');
  await expect(dialog).toHaveCSS('opacity', '1');
  await expect(dialog).toHaveCSS('transform', 'none');
  await dialog.getByRole('button', { name: 'Close', exact: true }).tap();
  await assertDismissed(page);
  await openProfile(page);
  await page.setViewportSize({ width: 820, height: 1180 });
  await expect(dialog).toHaveCSS('opacity', '1');
  await dialog.getByRole('button', { name: 'Close', exact: true }).tap();
  await assertDismissed(page);
});

test('phone touch drag dismisses and allows reopening', async ({ page, context }, testInfo) => {
  test.skip(testInfo.project.name === 'tablet', 'Tablet uses a centered modal without a drag handle');
  const dialog = await openProfile(page);
  const box = await dialog.boundingBox();
  const cdp = await context.newCDPSession(page);
  const x = box.x + box.width / 2;
  const y = box.y + 8;
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  for (let offset = 20; offset <= 180; offset += 20) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y + offset }] });
    await page.waitForTimeout(20);
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await cdp.detach();
  await assertDismissed(page);
  await openProfile(page);
});
