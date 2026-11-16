import { expect, test } from '@playwright/test';
import { NOT_FOUND_PAGES, builtPages, localeOf, scrollToBottom, settled } from './helpers';

// Every production page, in both languages, plus the two not-found pages: nothing logs an
// error, nothing fails to load, nothing sticks out sideways, one h1, the right language.
for (const url of [...builtPages(), ...NOT_FOUND_PAGES]) {
  const notFound = NOT_FOUND_PAGES.includes(url);

  test(`page ${url}`, async ({ page }) => {
    const problems: string[] = [];
    page.on('console', (m) => {
      // Chromium logs the not-found document's own 404 as a console error: expected there.
      if (notFound && m.location().url.endsWith(url)) return;
      if (m.type() === 'error' || m.type() === 'warning') {
        problems.push(`console ${m.type()}: ${m.text()}`);
      }
    });
    page.on('pageerror', (e) => problems.push(`page error: ${e.message}`));
    page.on('requestfailed', (r) =>
      problems.push(`request failed: ${r.url()} ${r.failure()?.errorText}`),
    );
    page.on('response', (r) => {
      // The not-found document itself is meant to be a 404; nothing else may be >= 400.
      const expected = notFound && r.request().resourceType() === 'document' ? 404 : 0;
      if (r.status() >= 400 && r.status() !== expected) {
        problems.push(`HTTP ${r.status()}: ${r.url()}`);
      }
    });

    const response = await page.goto(url);
    expect(response?.status()).toBe(notFound ? 404 : 200);
    await settled(page);
    await scrollToBottom(page);

    expect(problems).toEqual([]);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('html')).toHaveAttribute('lang', localeOf(url));
    const width = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth,
    }));
    expect(width.scroll, 'horizontal overflow').toBeLessThanOrEqual(width.client);
  });
}
