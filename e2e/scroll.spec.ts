import { expect, test } from '@playwright/test';
import { frames, settled } from './helpers';

test('a vertical wheel over a code block scrolls the page', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'the wheel is a desktop input');
  await page.goto('/projects/subagent-monitor/');
  await settled(page);
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'full');

  const pre = page.locator('main pre').first();
  await pre.scrollIntoViewIfNeeded();
  await frames(page);
  const box = await pre.boundingBox();
  if (!box) throw new Error('the code block has no box');
  const before = await page.evaluate(() => Math.round(window.scrollY));
  await page.mouse.move(box.x + box.width / 2, box.y + Math.min(box.height / 2, 100));
  await page.mouse.wheel(0, 300);
  await expect
    .poll(() => page.evaluate(() => Math.round(window.scrollY)), {
      message: 'the page did not scroll under the wheel',
      timeout: 3_000,
    })
    .toBeGreaterThan(before + 100);
});
