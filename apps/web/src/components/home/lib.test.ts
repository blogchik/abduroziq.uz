/**
 * Checks for the build-time helpers of the home page. Run with
 * `pnpm --filter @abduroziq/web test` (`node --test`, TypeScript stripped by Node).
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ticketColors } from './lib.ts';

function contrast(a: string, b: string): number {
  const lum = (hex: string): number => {
    const v = Number.parseInt(hex.slice(1), 16);
    const [r, g, bl] = [(v >> 16) & 255, (v >> 8) & 255, v & 255].map((c) => {
      const s = c / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (bl ?? 0);
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return ((hi ?? 0) + 0.05) / ((lo ?? 0) + 0.05);
}

test('ticket text reaches 4.5:1 on light, dark and mid-tone backgrounds', () => {
  const backgrounds = ['#ECE8E7', '#0B0B0B', '#18181B', '#E28413', '#808080', '#7A7A7A', '#3D8B6E'];
  const foregrounds = ['#808080', '#DC6008', '#C4B5FD', '#18181B', '#FFFFFF', '#000000'];
  for (const bg of backgrounds) {
    for (const fg of foregrounds) {
      const { text } = ticketColors([bg, fg]);
      assert.ok(contrast(text, bg) >= 4.5, `${text} on ${bg} (from ${fg})`);
    }
  }
});

test('a colour that already reads is kept', () => {
  assert.equal(ticketColors(['#E28413', '#18181B']).text, '#18181b');
  assert.equal(ticketColors(['#18181B', '#E28413']).text, '#e28413');
});
