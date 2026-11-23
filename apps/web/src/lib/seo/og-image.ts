import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { profile } from '@abduroziq/content';
import satori from 'satori';
import sharp from 'sharp';
import type { Locale } from '@/i18n';
import { logoSvg } from '@/lib/logo';
import { seededRandom } from '@/lib/prng';
import { palette } from './brand';
import { OG_HEIGHT, OG_WIDTH } from './og';

/**
 * Open Graph card (1200x630 PNG) in the site's own look: paper background, the logo and a
 * mono label line, the title large in Bricolage Grotesque and an accent label strip with the
 * name, the domain and barcode-like ticks (docs/DESIGN.md sections 2.1, 2.2 and 2.5). No photo.
 *
 * satori renders only the default instance of variable fonts, so the static Fontsource
 * files are used. They are read from the app root that `astro.config.ts` injects as
 * `__WEB_ROOT__` (resolved from the config file, not from the working directory), because the
 * endpoint is bundled and `import.meta.url` no longer points at the source tree
 * (docs/STACK-NOTES.md section 10).
 */

export interface OgCard {
  locale: Locale;
  /** Page title, drawn large. */
  title: string;
  /** Mono label line segments after the domain, e.g. the section and a date. */
  labels: string[];
  /** Optional line under the title (home page). */
  subtitle?: string;
  /** Optional tag list shown in mono under the title (posts). */
  tags?: string[];
  /** Home page: the title is the name, set in the giant uppercase `name` style. */
  hero?: boolean;
}

/** Absolute path of the app (`apps/web`), defined by `vite.define` in astro.config.ts. */
declare const __WEB_ROOT__: string;

const fontFile = (pkg: string, file: string) =>
  readFile(path.resolve(__WEB_ROOT__, 'node_modules/@fontsource', pkg, 'files', file));

// Hoisted: read once per build process, not once per image.
const fontsPromise = Promise.all([
  fontFile('bricolage-grotesque', 'bricolage-grotesque-latin-500-normal.woff'),
  fontFile('bricolage-grotesque', 'bricolage-grotesque-latin-700-normal.woff'),
  fontFile('geist-mono', 'geist-mono-latin-400-normal.woff'),
  fontFile('geist-mono', 'geist-mono-latin-500-normal.woff'),
]).then(([display500, display700, mono400, mono500]) => [
  { name: 'Bricolage', data: display500, weight: 500 as const, style: 'normal' as const },
  { name: 'Bricolage', data: display700, weight: 700 as const, style: 'normal' as const },
  { name: 'Geist Mono', data: mono400, weight: 400 as const, style: 'normal' as const },
  { name: 'Geist Mono', data: mono500, weight: 500 as const, style: 'normal' as const },
]);

const PAD = 64;
const STRIP_HEIGHT = 104;
const LOGO_SIZE = 32;
const LOGO_SRC = `data:image/svg+xml;base64,${Buffer.from(logoSvg(palette.accent)).toString('base64')}`;
const TITLE_WIDTH = OG_WIDTH - PAD * 2 - 16; // a little slack for the rough width estimate

const NARROW = new Set([..."ilj.,:;'`|!ʻʼ’"]);
const MEDIUM = new Set([...'frtI()-[]']);
const WIDE = new Set([...'mwMW']);

/** Rough advance width of a glyph in em, good enough to pick a font size that fits. */
function glyphWidth(char: string): number {
  if (char === ' ') return 0.26;
  if (NARROW.has(char)) return 0.28;
  if (MEDIUM.has(char)) return 0.36;
  if (WIDE.has(char)) return 0.84;
  if (/[A-Z]/.test(char)) return 0.68;
  return 0.56;
}

/** Greedy word wrap with the estimate above; returns the number of lines at `size` px. */
function countLines(text: string, size: number, tracking: number): number {
  let lines = 1;
  let x = 0;
  const space = (glyphWidth(' ') + tracking) * size;
  for (const word of text.split(' ')) {
    const w = [...word].reduce((sum, ch) => sum + (glyphWidth(ch) + tracking) * size, 0);
    if (w > TITLE_WIDTH) return Infinity;
    if (x === 0) x = w;
    else if (x + space + w <= TITLE_WIDTH) x += space + w;
    else {
      lines += 1;
      x = w;
    }
  }
  return lines;
}

/**
 * Largest font size (px) at which the title fits the available block. A title that fits on
 * one line at a slightly smaller size is kept on one line rather than orphaning a word.
 */
function fitTitle(text: string, maxSize: number, maxHeight: number, lineHeight: number) {
  const tracking = -0.03;
  let best = 44;
  let oneLine = 0;
  for (let size = maxSize; size >= 44; size -= 2) {
    const lines = countLines(text, size, tracking);
    if (oneLine === 0 && lines === 1) oneLine = size;
    if (best === 44 && lines * size * lineHeight <= maxHeight) best = size;
  }
  const size = oneLine >= best * 0.78 ? oneLine : best;
  return { size, tracking: size * tracking };
}

/**
 * Bricolage Grotesque has no U+02BB / U+02BC (the Uzbek oʻ gʻ letters) nor curly
 * apostrophes: they would render as a missing-glyph box. Draw the plain apostrophe, which
 * is also what the site copy uses.
 */
const plainApostrophes = (text: string) => text.replace(/[ʻʼ‘’ʹ′]/g, "'");

type Node = { type: string; props: { style?: Record<string, unknown>; children?: unknown } };
const el = (type: string, style: Record<string, unknown>, children?: unknown): Node => ({
  type,
  props: { style: { display: 'flex', ...style }, ...(children === undefined ? {} : { children }) },
});

function barcode(seed: string): Node {
  const rand = seededRandom(seed);
  const widths = [3, 3, 5, 8];
  const bars: Node[] = [];
  for (let i = 0; i < 26; i += 1) {
    const width = widths[Math.floor(rand() * widths.length)] ?? 3;
    bars.push(el('div', { width, height: 54, background: palette.onAccent, marginRight: 5 }));
  }
  return el('div', { alignItems: 'center' }, bars);
}

function tree(card: OgCard): Node {
  const hasExtra = Boolean(card.subtitle ?? card.tags?.length);
  const title = plainApostrophes(card.title);
  const titleText = card.hero ? title.toUpperCase() : title;
  const lineHeight = card.hero ? 0.92 : 1.04;
  const maxHeight = hasExtra ? 250 : 310;
  const fit = fitTitle(titleText, card.hero ? 200 : 124, maxHeight, lineHeight);
  const extra = card.subtitle
    ? el(
        'div',
        { fontFamily: 'Bricolage', fontWeight: 500, fontSize: 38, color: palette.inkSoft },
        card.subtitle,
      )
    : card.tags?.length
      ? el(
          'div',
          { fontFamily: 'Geist Mono', fontWeight: 400, fontSize: 24, color: palette.inkSoft },
          plainApostrophes(card.tags.map((tag) => `#${tag}`).join('   ')),
        )
      : null;

  const label = plainApostrophes(['abduroziq.uz', ...card.labels].join('  /  '));

  return el(
    'div',
    {
      flexDirection: 'column',
      width: OG_WIDTH,
      height: OG_HEIGHT,
      background: palette.paper,
      color: palette.ink,
    },
    [
      el('div', { flexDirection: 'column', flexGrow: 1, padding: `52px ${PAD}px 36px` }, [
        el('div', { alignItems: 'center' }, [
          {
            type: 'img',
            props: {
              src: LOGO_SRC,
              width: LOGO_SIZE,
              height: LOGO_SIZE,
              style: { width: LOGO_SIZE, height: LOGO_SIZE, marginRight: 20 },
            },
          },
          el(
            'div',
            {
              fontFamily: 'Geist Mono',
              fontWeight: 500,
              fontSize: 22,
              letterSpacing: 2,
              textTransform: 'uppercase',
              color: palette.inkSoft,
            },
            label,
          ),
        ]),
        el('div', { height: 2, background: palette.rule, marginTop: 22 }),
        el('div', { flexGrow: 1, flexDirection: 'column', justifyContent: 'center' }, [
          el(
            'div',
            {
              fontFamily: 'Bricolage',
              fontWeight: 500,
              fontSize: fit.size,
              lineHeight,
              letterSpacing: fit.tracking,
              color: palette.ink,
              lineClamp: 4,
              textWrap: 'balance',
            },
            titleText,
          ),
          ...(extra ? [el('div', { marginTop: 22 }, [extra])] : []),
        ]),
      ]),
      el(
        'div',
        {
          height: STRIP_HEIGHT,
          background: palette.accent,
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: `0 ${PAD}px`,
        },
        [
          el(
            'div',
            {
              fontFamily: 'Bricolage',
              fontWeight: 700,
              fontSize: 44,
              letterSpacing: -1.5,
              textTransform: 'uppercase',
              color: palette.onAccent,
            },
            profile.name,
          ),
          el(
            'div',
            {
              fontFamily: 'Geist Mono',
              fontWeight: 500,
              fontSize: 26,
              letterSpacing: 1,
              color: palette.onAccent,
            },
            'abduroziq.uz',
          ),
          barcode(`${card.title}|${card.locale}`),
        ],
      ),
    ],
  );
}

export async function renderOgImage(card: OgCard): Promise<Buffer> {
  const svg = await satori(tree(card) as never, {
    width: OG_WIDTH,
    height: OG_HEIGHT,
    fonts: await fontsPromise,
  });
  return sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();
}
