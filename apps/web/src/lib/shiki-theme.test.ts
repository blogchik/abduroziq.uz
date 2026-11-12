/**
 * Contrast of the code theme: every colour a token can get must reach WCAG AA (4.5:1) on the
 * code frame's background (`paper-raised`) in its mode. Run with `pnpm --filter @abduroziq/web test`.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { codeColors, codeThemes } from './shiki-theme.ts';

function luminance(hex: string): number {
  const channel = (offset: number) => {
    const value = Number.parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

function contrast(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (light + 0.05) / (dark + 0.05);
}

for (const mode of ['light', 'dark'] as const) {
  test(`every ${mode} code colour is at least 4.5:1 on paper-raised`, () => {
    const theme = codeThemes[mode];
    const background = codeColors[mode].background;
    assert.equal(theme.colors['editor.background'], background);
    const used = new Set([
      theme.colors['editor.foreground'],
      ...theme.tokenColors.map((rule) => rule.settings.foreground),
    ]);
    for (const color of used) {
      assert.ok(color, 'a rule without a foreground colour');
      const ratio = contrast(color, background);
      assert.ok(ratio >= 4.5, `${mode}: ${color} on ${background} is ${ratio.toFixed(2)}:1`);
    }
  });

  test(`the ${mode} theme uses only the four palette colours`, () => {
    const { ink, inkSoft, accentText } = codeColors[mode];
    const allowed = new Set<string>([ink, inkSoft, accentText]);
    for (const rule of codeThemes[mode].tokenColors) {
      assert.ok(allowed.has(rule.settings.foreground), `${rule.name}: ${rule.settings.foreground}`);
    }
  });
}
