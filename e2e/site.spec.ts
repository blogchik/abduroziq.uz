import fs from 'node:fs';
import path from 'node:path';
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

// The content panel (docs/ADMIN.md) is left out of the page checks above: it is a tool whose
// script comes from a CDN. Here: it is in the build with its configuration, kept out of search
// engines, and its one script is pinned to an exact version with a hash. It is fetched, not
// opened, so the suite never depends on the CDN.
test('the content panel is in the build', async ({ request }) => {
  const response = await request.get('/admin/');
  expect(response.status()).toBe(200);
  const html = await response.text();
  expect(html).toContain('<meta name="robots" content="noindex" />');
  expect(html).toMatch(
    /src="https:\/\/unpkg\.com\/@sveltia\/cms@\d+\.\d+\.\d+\/dist\/sveltia-cms\.js"/,
  );
  expect(html).toMatch(/integrity="sha384-[A-Za-z0-9+/]{64}"/);
  expect((await request.get('/admin/config.yml')).status()).toBe(200);
});

// About: two paragraphs, and one link to the post about building the site, present exactly
// when that post's page is in the build (drafts are not built). The post is found the way the
// site finds it: its `translationKey` is `profile.aboutPost`; its version in the page's
// language wins, otherwise the other language's.
const root = path.join(__dirname, '..');
const aboutKey = /aboutPost:\s*'([^']+)'/.exec(
  fs.readFileSync(path.join(root, 'packages', 'content', 'src', 'site.ts'), 'utf8'),
)?.[1];

/** URL paths of the posts that carry `translationKey: key`, by locale (published or not). */
function postUrlsByKey(key: string): Record<'en' | 'uz', string[]> {
  const urls: Record<'en' | 'uz', string[]> = { en: [], uz: [] };
  for (const locale of ['en', 'uz'] as const) {
    const dir = path.join(root, 'packages', 'content', 'posts', locale);
    for (const file of fs.readdirSync(dir).filter((name) => name.endsWith('.mdx'))) {
      const head = fs.readFileSync(path.join(dir, file), 'utf8').split(/^---\s*$/m)[1] ?? '';
      if (new RegExp(`^translationKey:\\s*["']?${key}["']?\\s*$`, 'm').test(head)) {
        const slug = file.replace(/\.mdx$/, '');
        urls[locale].push(locale === 'uz' ? `/uz/blog/${slug}/` : `/blog/${slug}/`);
      }
    }
  }
  return urls;
}

for (const url of ['/', '/uz/']) {
  test(`about on ${url}: two paragraphs, the post link only when the post is built`, async ({
    page,
  }) => {
    expect(aboutKey, 'profile.aboutPost not found in packages/content/src/site.ts').toBeTruthy();
    const locale = localeOf(url);
    const other = locale === 'uz' ? 'en' : 'uz';
    const built = new Set(builtPages());
    const own = postUrlsByKey(aboutKey as string)[locale].find((u) => built.has(u));
    const foreign = postUrlsByKey(aboutKey as string)[other].find((u) => built.has(u));
    const expected = own ?? foreign;

    await page.goto(url);
    await settled(page);

    // The count only: the wording is copy, and editing copy must not break a test.
    await expect(page.locator('#about .about__text')).toHaveCount(2);

    const link = page.locator('#about .about__more a');
    if (!expected) {
      await expect(link).toHaveCount(0);
      return;
    }
    await expect(link).toHaveCount(1);
    await expect(link).toHaveAttribute('href', expected);
    if (own) await expect(link).not.toHaveAttribute('hreflang', /./);
    else await expect(link).toHaveAttribute('hreflang', other);
  });
}
