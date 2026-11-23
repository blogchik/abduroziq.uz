import source from '@abduroziq/content/assets/logo.svg?raw';

/**
 * The logo (docs/DESIGN.md 2.5): two slanted slabs on a 1200 x 1200 square. The master file
 * is `packages/content/assets/logo.svg` (all rights reserved, like the rest of the content
 * package). Its paths are read from that file at build time, so the header mark and the Open
 * Graph images draw exactly the master; `scripts/generate-icons.mjs` reads the same file for
 * the favicons.
 */
export const LOGO_SIZE = 1200;

/** The `d` attribute of every path in the master file, in order. */
export const logoPaths: string[] = [...source.matchAll(/\sd="([^"]+)"/g)].map((m) => m[1] ?? '');

if (logoPaths.length === 0 || logoPaths.some((d) => d === '')) {
  throw new Error('packages/content/assets/logo.svg: no path data found');
}

/** The logo as a standalone SVG document in one colour. */
export function logoSvg(fill: string): string {
  const paths = logoPaths.map((d) => `<path d="${d}"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${LOGO_SIZE} ${LOGO_SIZE}" fill="${fill}">${paths}</svg>`;
}
