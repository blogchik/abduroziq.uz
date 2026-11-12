import { t, type Locale } from '@/i18n';

/** Collapses whitespace so titles and descriptions never carry stray line breaks. */
export function plainText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/** Shortens `text` to at most `max` characters at a word boundary, adding an ellipsis. */
export function truncate(text: string, max: number): string {
  const clean = plainText(text);
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s,.;:–—-]+$/, '')}…`;
}

/**
 * `<title>` text. Pages get the site suffix from the `seo.site.titleTemplate` string; the
 * home page (whose title already carries the name) and any title that already contains the
 * site name get none.
 */
export function formatTitle(
  locale: Locale,
  title: string,
  opts: { siteName: string; isHome?: boolean },
): string {
  const clean = plainText(title);
  if (opts.isHome || clean.toLowerCase().includes(opts.siteName.toLowerCase())) return clean;
  return t(locale, 'seo.site.titleTemplate', { title: clean, site: opts.siteName });
}

/** Character budgets for titles and descriptions (see docs/SEO.md). */
export const limits = { title: 60, descriptionMin: 70, descriptionMax: 160 } as const;
