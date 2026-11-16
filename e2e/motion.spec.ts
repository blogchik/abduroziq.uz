import { expect, test } from '@playwright/test';
import { frames, scrollToBottom, settled, unrevealed } from './helpers';

// Pages with reveals: both home pages, the lists, a project with a gallery and one without,
// and a not-found page (its giant name).
const REVEAL_PAGES = [
  '/',
  '/uz/',
  '/projects/',
  '/projects/payzone/',
  '/uz/projects/subagent-monitor/',
  '/projects/tavryn/',
  '/blog/',
  '/nope/',
];

// With motion off in any of three ways the content shows as written: after a full scroll
// every reveal target is opaque and in its place.
const OFF_MODES = [
  { name: 'prefers-reduced-motion', reducedMotion: true, switchOff: false, noScript: false },
  { name: 'motion switch off', reducedMotion: false, switchOff: true, noScript: false },
  { name: 'JavaScript disabled', reducedMotion: false, switchOff: false, noScript: true },
];

for (const mode of OFF_MODES) {
  test.describe(mode.name, () => {
    test.use({
      reducedMotion: mode.reducedMotion ? 'reduce' : 'no-preference',
      javaScriptEnabled: !mode.noScript,
    });

    for (const url of REVEAL_PAGES) {
      test(`${url} shows everything`, async ({ page }) => {
        if (mode.switchOff) {
          await page.addInitScript(() => localStorage.setItem('motion', 'reduced'));
        }
        await page.goto(url);
        if (mode.noScript) {
          // Nothing can run to scroll: the document must already be complete as served.
          await page.keyboard.press('End');
        } else {
          await settled(page);
          await scrollToBottom(page);
          await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduced');
        }
        await expect.poll(() => unrevealed(page), { timeout: 3_000 }).toEqual([]);
      });
    }
  });
}

// With full motion the footer's giant name has to rise when the reader arrives at the bottom,
// also on pages whose height changes while their lazy images load.
test.describe('full motion', () => {
  const cases = [
    { url: '/', only: undefined },
    { url: '/projects/payzone/', only: 'desktop' },
  ];

  for (const { url, only } of cases) {
    test(`footer name reveals on ${url}`, async ({ page }, info) => {
      test.skip(only !== undefined && info.project.name !== only, `${url} is checked on ${only}`);
      await page.goto(url);
      await settled(page);
      await expect(page.locator('html')).toHaveAttribute('data-motion', 'full');
      await expect(page.locator('footer [data-giant-letter]').first()).toBeAttached();
      await scrollToBottom(page);
      await frames(page);
      await expect
        .poll(() => unrevealed(page, 'footer'), {
          message: 'footer giant name letters still hidden or offset',
          timeout: 5_000,
        })
        .toEqual([]);
    });
  }
});
