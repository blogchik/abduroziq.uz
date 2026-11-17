import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import { builtHtml, builtPages, localeOf, settled } from './helpers';

// Notes (`kind: note`): a short entry that is read where it stands in a list, and a post page
// with less. Notes are drafts today, drafts are not built, so a build may hold none: the
// note-specific tests are then skipped with a reason. Nothing here depends on any wording of
// a note or a post; labels and patterns come from the site's own language files.

const pages = builtPages();
const built = new Set(pages);
const NO_NOTE_ROWS = 'No built page contains a .note-row (no note is published in this build).';
const NO_NOTE_PAGES = 'No built page is a note page (no note is published in this build).';

const htmlOf = new Map(pages.map((url) => [url, builtHtml(url)]));
const noteRowPages = pages.filter((url) => /class="[^"]*\bnote-row\b(?!_)/.test(htmlOf.get(url)!));
const notePages = pages.filter((url) => htmlOf.get(url)!.includes('data-kind="note"'));
const postPages = pages.filter((url) => htmlOf.get(url)!.includes('data-kind="post"'));

type Strings = { readingTime: string; note: { label: string } };
const strings = (locale: 'en' | 'uz'): Strings =>
  JSON.parse(
    fs.readFileSync(
      path.join(__dirname, '..', 'packages', 'content', 'i18n', locale, 'blog.json'),
      'utf8',
    ),
  ) as Strings;

/** The localized reading-time line as a pattern: `{minutes}` becomes digits. */
function readingTimePattern(locale: 'en' | 'uz'): RegExp {
  const source = strings(locale)
    .readingTime.split('{minutes}')
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('\\d+');
  return new RegExp(source);
}

/** The page path of an href, or null for an external link. */
function pagePath(href: string, from: string): string | null {
  const url = new URL(href, `http://site.test${from}`);
  if (url.host !== 'site.test') return null;
  return url.pathname.endsWith('/') ? url.pathname : `${url.pathname}/`;
}

/** Nested `<a>` in the built HTML itself (the browser's parser would silently repair them). */
function nestedAnchors(html: string): number {
  const body = html.replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, '');
  let depth = 0;
  let nested = 0;
  for (const tag of body.matchAll(/<(\/?)a(?=[\s>])/gi)) {
    if (tag[1]) depth = Math.max(0, depth - 1);
    else if (++depth > 1) nested++;
  }
  return nested;
}

if (noteRowPages.length === 0) {
  test('note rows in lists', () => {
    test.skip(true, NO_NOTE_ROWS);
  });
}

for (const url of noteRowPages) {
  test(`note rows on ${url}: one title link to a built page, text outside links, visible`, async ({
    page,
  }) => {
    expect(nestedAnchors(htmlOf.get(url)!), 'nested <a> in the built HTML').toBe(0);

    await page.goto(url);
    await settled(page);

    expect(await page.locator('a a').count(), 'nested <a> in the page').toBe(0);

    const rows = page.locator('.note-row');
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const row = rows.nth(i);
      const links = row.locator(':is(h2, h3, h4, h5, h6) a');
      await expect(links, `row ${i}: links inside the heading`).toHaveCount(1);
      await expect(links.first()).toHaveClass(/\bnote-row__link\b/);

      const href = (await links.first().getAttribute('href')) ?? '';
      const target = pagePath(href, url);
      expect(target, `row ${i}: title link "${href}" is internal`).not.toBeNull();
      expect(built.has(target!), `row ${i}: "${href}" is a page in the build`).toBe(true);

      const text = row.locator('.note-row__text');
      await expect(text, `row ${i}: one text block`).toHaveCount(1);
      const inLink = await row.evaluate((el) => {
        const body = el.querySelector('.note-row__text')!;
        return {
          rowInLink: el.closest('a') !== null,
          textInLink: body.closest('a') !== null,
          headingLinkHoldsText: el.querySelector('a.note-row__link')!.contains(body),
        };
      });
      expect(inLink, `row ${i}: the text is not inside a link`).toEqual({
        rowInLink: false,
        textInLink: false,
        headingLinkHoldsText: false,
      });

      await text.scrollIntoViewIfNeeded();
      await settled(page);
      const shown = await text.evaluate((el) => ({
        height: el.getBoundingClientRect().height,
        visibility: getComputedStyle(el).visibility,
        chars: (el.textContent ?? '').trim().length,
      }));
      expect(shown.height, `row ${i}: text height`).toBeGreaterThan(0);
      expect(shown.visibility, `row ${i}: text visibility`).toBe('visible');
      expect(shown.chars, `row ${i}: text is not empty`).toBeGreaterThan(0);
    }
  });
}

if (notePages.length === 0) {
  test('note pages', () => {
    test.skip(true, NO_NOTE_PAGES);
  });
}

for (const url of notePages) {
  test(`note page ${url}: no progress rail, no reading time, the note label, one h1`, async ({
    page,
  }) => {
    const locale = localeOf(url);
    await page.goto(url);
    await settled(page);

    const article = page.locator('article[data-kind="note"]');
    await expect(article).toHaveCount(1);
    await expect(page.locator('.rail, [data-progress]')).toHaveCount(0);

    const meta = article.locator('.article-head__meta');
    await expect(meta).toHaveCount(1);
    const metaText = (await meta.textContent()) ?? '';
    expect(metaText).not.toMatch(readingTimePattern(locale));
    expect(metaText).toContain(strings(locale).note.label);

    await expect(page.locator('h1')).toHaveCount(1);
  });
}

if (postPages.length === 0) {
  test('post pages', () => {
    test.skip(true, 'No built page is a post page.');
  });
}

// The rail is for posts, and only at desktop width (it is display:none below 64rem, but stays
// in the page); the reading time is in the meta line at every width. Every post has a
// reading time (at least one minute), so there is no length threshold to apply.
for (const url of postPages) {
  test(`post page ${url}: progress rail and reading time are still there`, async ({ page }) => {
    const locale = localeOf(url);
    await page.goto(url);
    await settled(page);

    const article = page.locator('article[data-kind="post"]');
    await expect(article).toHaveCount(1);

    const rail = article.locator('.rail');
    await expect(rail).toHaveCount(1);
    await expect(rail.locator('[data-progress]')).toHaveCount(1);
    const wide = (page.viewportSize()?.width ?? 0) >= 1024;
    if (wide) await expect(rail).toBeVisible();
    else await expect(rail).toBeHidden();

    await expect(article.locator('.article-head__meta')).toHaveText(readingTimePattern(locale));
  });
}

// Every feed item carries a description, notes included.
for (const feed of ['/rss.xml', '/uz/rss.xml']) {
  test(`feed ${feed}: every item has a non-empty description`, async ({ request }) => {
    const response = await request.get(feed);
    expect(response.status()).toBe(200);
    const xml = await response.text();
    const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => m[1]!);
    test.skip(items.length === 0, `${feed} has no items (no post is published in this language).`);
    for (const [i, item] of items.entries()) {
      const title = /<title>([\s\S]*?)<\/title>/.exec(item)?.[1] ?? `item ${i}`;
      const raw = /<description>([\s\S]*?)<\/description>/.exec(item)?.[1] ?? '';
      const description = raw.replace(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/, '$1').trim();
      expect(description, `description of ${title}`).not.toBe('');
    }
  });
}
