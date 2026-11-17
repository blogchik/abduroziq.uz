import fs from 'node:fs';
import path from 'node:path';
import type { Page } from '@playwright/test';

const dist = path.resolve(
  process.env.E2E_DIST ?? path.join(__dirname, '..', 'apps', 'web', 'dist'),
);

/** Every production page, as a URL path with a trailing slash, read from the build. */
export function builtPages(): string[] {
  if (!fs.existsSync(path.join(dist, 'index.html'))) {
    throw new Error(`No build found in ${dist}. Run "pnpm build" before "pnpm test:e2e".`);
  }
  const found: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name === 'index.html') {
        const rel = path.relative(dist, dir).split(path.sep).join('/');
        found.push(rel ? `/${rel}/` : '/');
      }
    }
  };
  walk(dist);
  return found.sort();
}

/** The pages that do not exist: they answer 404 with the site's own not-found page. */
export const NOT_FOUND_PAGES = ['/nope/', '/uz/nope/'];

export const localeOf = (url: string): 'uz' | 'en' => (url.startsWith('/uz/') ? 'uz' : 'en');

/** Resolves after `count` animation frames. */
export function frames(page: Page, count = 2): Promise<void> {
  return page.evaluate(async (n) => {
    for (let i = 0; i < n; i++) await new Promise((resolve) => requestAnimationFrame(resolve));
  }, count);
}

/** Waits until the page has loaded, its fonts are in and a couple of frames have run. */
export async function settled(page: Page): Promise<void> {
  await page.waitForLoadState('load');
  await page.evaluate(() => document.fonts.ready);
  await frames(page);
}

/**
 * A natural, unhurried scroll to the bottom: half a screen every 120ms, measured again at
 * every step (lazy images change the page height on the way), and it only ends after the
 * bottom has held still for a few steps, so late layout changes have happened.
 */
export function scrollToBottom(page: Page): Promise<void> {
  return page.evaluate(async () => {
    const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
    const root = document.documentElement;
    let still = 0;
    for (let step = 0; step < 400 && still < 5; step++) {
      const before = Math.round(window.scrollY);
      window.scrollBy(0, window.innerHeight * 0.5);
      await wait(120);
      const atBottom = window.scrollY + window.innerHeight >= root.scrollHeight - 2;
      still = atBottom && Math.round(window.scrollY) === before ? still + 1 : 0;
    }
  });
}

/**
 * The reveal targets (`data-reveal`, `data-reveal-item`, `data-giant-letter`) inside `scope`
 * that are not fully shown: opacity below 1 or moved away from their place. `inView` limits
 * the check to the ones on screen.
 */
export function unrevealed(page: Page, scope = 'body', inView = false): Promise<string[]> {
  return page.evaluate(
    ({ scope, inView }) => {
      const out: string[] = [];
      const root = document.querySelector(scope);
      if (!root) return ['no such scope: ' + scope];
      for (const el of root.querySelectorAll<HTMLElement>(
        '[data-reveal], [data-reveal-item], [data-giant-letter]',
      )) {
        const rect = el.getBoundingClientRect();
        if (inView && !(rect.bottom > 0 && rect.top < window.innerHeight && rect.width > 0)) {
          continue;
        }
        const style = getComputedStyle(el);
        const m = new DOMMatrix(style.transform === 'none' ? undefined : style.transform);
        const moved =
          Math.abs(m.e) > 0.5 ||
          Math.abs(m.f) > 0.5 ||
          Math.abs(m.a - 1) > 0.01 ||
          Math.abs(m.d - 1) > 0.01;
        if (Number(style.opacity) < 0.99 || moved) {
          const label = el.tagName.toLowerCase() + '.' + String(el.className).split(' ')[0];
          out.push(`${label} opacity=${style.opacity} transform=${style.transform}`);
        }
      }
      return out;
    },
    { scope, inView },
  );
}

/** True when the page-transition panel is not covering anything (hidden, or off screen). */
export function panelAway(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const panel = document.querySelector('.m-wipe');
    if (!panel) return true;
    const style = getComputedStyle(panel);
    if (style.visibility === 'hidden' || style.display === 'none' || Number(style.opacity) === 0) {
      return true;
    }
    const rect = panel.getBoundingClientRect();
    return rect.top >= window.innerHeight - 1 || rect.bottom <= 1;
  });
}

/** The built HTML of one production page (`url` as returned by `builtPages()`). */
export function builtHtml(url: string): string {
  return fs.readFileSync(path.join(dist, url.replace(/^\//, ''), 'index.html'), 'utf8');
}
