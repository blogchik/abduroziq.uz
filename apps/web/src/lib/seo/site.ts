import { PUBLIC_ALLOW_INDEXING, PUBLIC_SITE_URL } from 'astro:env/client';
import type { Locale } from '@/i18n';

/** Absolute URL on this site for a site-relative path or URL. */
export function absoluteUrl(href: string): string {
  return new URL(href, PUBLIC_SITE_URL).href;
}

/** True only for the exact string `true` (production). Everything else stays out of search. */
export const indexingAllowed = PUBLIC_ALLOW_INDEXING === 'true';

/** Open Graph locale codes. */
export const ogLocale: Record<Locale, string> = { en: 'en_US', uz: 'uz_UZ' };

/**
 * Stable `@id` URLs of the entities in the JSON-LD graph, so that pages reference the same
 * Person and WebSite instead of redefining them.
 */
export const entityId = {
  person: () => absoluteUrl('/#person'),
  website: () => absoluteUrl('/#website'),
  /** Fragment id of an entity that lives on a page: `onPage(url, "article")`. */
  onPage: (url: string, name: string) => `${url}#${name}`,
};
