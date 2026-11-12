/**
 * The one list of site languages. Plain TypeScript with no imports, so that
 * `astro.config.ts` (which runs before Astro's virtual modules exist), the sitemap setup and
 * the app all read the same values. To add a language: add it here, then TypeScript points
 * at every place that still needs its strings (`dictionaries`, `profile`, `Localized`).
 */
export const locales = ['en', 'uz'] as const;

export type Locale = (typeof locales)[number];

/** The language served without a URL prefix. */
export const defaultLocale: Locale = 'en';
