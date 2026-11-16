import { expect, test } from '@playwright/test';
import { frames, panelAway, settled, unrevealed } from './helpers';

// The page-transition panel must never stay on screen, and the page after it must be whole.

const PROJECT_ROW = 'main a[href^="/projects/"]:not([href="/projects/"])';

test('the panel leaves after BACK TO TOP is clicked during the cover', async ({ page }) => {
  await page.goto('/projects/');
  await settled(page);
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'full');

  // A project row starts the transition; the footer's BACK TO TOP belongs to the old page.
  const top = page.locator('footer a[href="#top"]');
  await top.scrollIntoViewIfNeeded();
  await frames(page);
  await page
    .locator(PROJECT_ROW)
    .first()
    .evaluate((a: HTMLAnchorElement) => a.click());
  await expect(page.locator('.m-wipe')).toBeVisible();
  await top.click();

  await expect
    .poll(() => panelAway(page), { message: 'panel still covering', timeout: 3_000 })
    .toBe(true);
  await expect
    .poll(() => unrevealed(page, 'body', true), {
      message: 'reveals in view are hidden',
      timeout: 3_000,
    })
    .toEqual([]);
});

test('home, projects, a project, Back: panel away, scroll restored', async ({ page }) => {
  await page.goto('/');
  await settled(page);
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'full');

  // The header link sits in the menu sheet on a phone: click it from the page.
  await page
    .locator('header a[href="/projects/"]')
    .first()
    .evaluate((a: HTMLAnchorElement) => a.click());
  await expect(page).toHaveURL(/\/projects\/$/);
  await expect.poll(() => panelAway(page), { timeout: 3_000 }).toBe(true);

  await page.evaluate(() => window.scrollTo(0, 400));
  await expect.poll(() => page.evaluate(() => Math.round(window.scrollY))).toBe(400);
  await frames(page);
  const row = page.locator(PROJECT_ROW).first();
  const target = await row.getAttribute('href');
  await row.evaluate((a: HTMLAnchorElement) => a.click());
  await expect(page).toHaveURL(new RegExp(`${target}$`));
  await expect.poll(() => panelAway(page), { timeout: 3_000 }).toBe(true);

  // Astro restores the scroll position right after the swap, before `astro:after-swap`: the root
  // must already carry the `js` class then, or the page is laid out for no JavaScript (a taller,
  // non-sticky header) and scroll anchoring moves the restored position (39px with Linux fonts).
  await page.evaluate(() => {
    const root = document.documentElement;
    const seen: boolean[] = [];
    const scrollTo = window.scrollTo.bind(window) as (...args: unknown[]) => void;
    window.scrollTo = ((...args: unknown[]) => {
      seen.push(root.classList.contains('js'));
      scrollTo(...args);
    }) as typeof window.scrollTo;
    (window as unknown as { __jsAtScroll: boolean[] }).__jsAtScroll = seen;
  });
  await page.goBack();
  await expect(page).toHaveURL(/\/projects\/$/);
  await expect
    .poll(() => panelAway(page), { message: 'panel after Back', timeout: 3_000 })
    .toBe(true);
  const jsAtScroll = () =>
    page.evaluate(() => (window as unknown as { __jsAtScroll: boolean[] }).__jsAtScroll);
  await expect
    .poll(async () => (await jsAtScroll()).length, { message: 'the router restored the scroll' })
    .toBeGreaterThan(0);
  expect(await jsAtScroll(), 'the js class when the router restores the scroll').not.toContain(
    false,
  );
  await expect
    .poll(() => page.evaluate(() => Math.round(window.scrollY)), {
      message: 'scroll position after Back',
      timeout: 3_000,
    })
    .toBeGreaterThan(398);
  expect(await page.evaluate(() => Math.round(window.scrollY))).toBeLessThan(402);
  await expect
    .poll(() => unrevealed(page, 'body', true), {
      message: 'reveals in view are hidden',
      timeout: 3_000,
    })
    .toEqual([]);
});
