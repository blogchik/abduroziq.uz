import type { Locale } from '@/i18n';

/** Props of `Seo.astro` (docs/ARCHITECTURE.md section 6). Import this type from here. */
export interface SeoProps {
  locale: Locale;
  /** Locale-agnostic path, for example '/blog/'. */
  path: string;
  /** The page's own title. The site name is appended unless the title already contains it. */
  title: string;
  description: string;
  type?: 'website' | 'article';
  /**
   * Absolute URL or site-relative path. Defaults to the generated Open Graph image of the
   * page (home, blog index or post, chosen from `path`); other pages fall back to the home image.
   */
  image?: string;
  /** Alt text of the Open Graph image. Defaults to the page title. */
  imageAlt?: string;
  article?: { publishedTime: Date; modifiedTime?: Date; tags: string[] };
  /** Defaults to all locales; a post passes only its own unless translated. */
  alternateLocales?: Locale[];
  /**
   * Explicit alternate URLs (site-relative or absolute) per locale. Needed when the other
   * locale lives at a different path, as translated posts do. Wins over `alternateLocales`.
   */
  alternates?: { locale: Locale; href: string }[];
  noindex?: boolean;
  jsonLd?: object | object[];
}
