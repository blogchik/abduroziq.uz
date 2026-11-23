/**
 * The code-block colour theme: one accent, two modes (docs/DESIGN.md 2.1 and 5.3).
 *
 *   text and identifiers   ink
 *   comments, punctuation  ink-soft (comments in italics)
 *   keywords and tags      accent-text
 *   strings and numbers    ink, weight 500
 *
 * Shiki renders the light theme as inline colours and the dark one as `--shiki-dark*`
 * variables, which `styles/global.css` switches on when `data-theme="dark"` (docs/STACK-NOTES.md
 * section 4). The hex values mirror the tokens in `styles/tokens.css` (`ink`, `ink-soft`,
 * `accent-text`, `paper-raised`) because Shiki cannot read CSS variables; keep them in sync.
 * `shiki-theme.test.ts` checks that every colour is at least 4.5:1 on `paper-raised`.
 *
 * Shiki can only express "bold" as a font style, so strings and numbers are marked bold here
 * and `styles/prose.css` renders that mark as weight 500.
 *
 * Plain TypeScript with no imports: `astro.config.ts` reads it before Astro's modules exist.
 */

export interface CodeColors {
  /** `paper-raised`: the code frame's background. */
  background: string;
  ink: string;
  inkSoft: string;
  accentText: string;
}

export const codeColors = {
  light: { background: '#FFFFFF', ink: '#000022', inkSoft: '#5F5D71', accentText: '#9C5200' },
  dark: { background: '#1B1A17', ink: '#EFECE6', inkSoft: '#9C968A', accentText: '#E28413' },
} as const satisfies Record<'light' | 'dark', CodeColors>;

interface TokenRule {
  name: string;
  scope: string[];
  settings: { foreground: string; fontStyle?: string };
}

/** A Shiki (TextMate) theme for one mode. */
export interface CodeTheme {
  name: string;
  type: 'light' | 'dark';
  colors: Record<string, string>;
  tokenColors: TokenRule[];
}

function createTheme(mode: 'light' | 'dark'): CodeTheme {
  const c = codeColors[mode];
  return {
    name: `abduroziq-${mode}`,
    type: mode,
    colors: {
      'editor.background': c.background,
      'editor.foreground': c.ink,
    },
    tokenColors: [
      {
        name: 'Base text',
        scope: ['source', 'text', 'meta.embedded'],
        settings: { foreground: c.ink },
      },
      {
        name: 'Comments',
        scope: ['comment', 'punctuation.definition.comment'],
        settings: { foreground: c.inkSoft, fontStyle: 'italic' },
      },
      {
        name: 'Punctuation and operators',
        scope: ['punctuation', 'meta.brace', 'keyword.operator'],
        settings: { foreground: c.inkSoft },
      },
      {
        name: 'Keywords and tags',
        scope: [
          'keyword',
          'storage',
          'constant.language',
          'entity.name.tag',
          'support.type.primitive',
          'keyword.operator.new',
          'keyword.operator.expression',
          'keyword.operator.delete',
          'keyword.operator.wordlike',
        ],
        settings: { foreground: c.accentText },
      },
      {
        name: 'Strings and numbers (weight 500, see prose.css)',
        scope: ['string', 'constant.numeric', 'constant.character', 'constant.other.symbol'],
        settings: { foreground: c.ink, fontStyle: 'bold' },
      },
      {
        name: 'Template and string punctuation stay with the string',
        scope: ['punctuation.definition.string'],
        settings: { foreground: c.ink, fontStyle: 'bold' },
      },
    ],
  };
}

export const codeThemes = { light: createTheme('light'), dark: createTheme('dark') };
