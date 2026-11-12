/**
 * Sitemap helpers. This file runs inside `astro.config.ts`, before Astro's virtual modules
 * exist, so it uses only Node built-ins and never imports `astro:*` or `@/i18n`.
 *
 * It reads the frontmatter of every post file to
 *  - leave drafts out of the sitemap,
 *  - set `lastmod` to `updated ?? date`,
 *  - pair translated posts (same `translationKey`) with hreflang links even though their
 *    slugs differ between languages, which the integration's built-in pairing cannot do.
 */
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

interface SitemapLink {
  url: string;
  lang: string;
}

interface SitemapItem {
  url: string;
  lastmod?: string | undefined;
  links?: SitemapLink[] | undefined;
  [key: string]: unknown;
}

interface PostMeta {
  locale: string;
  slug: string;
  draft: boolean;
  lastmod: Date;
  translationKey?: string;
  tags: string[];
}

export interface SitemapSetup {
  filter: (page: string) => boolean;
  serialize: (item: SitemapItem) => SitemapItem;
}

/** Reads `key: value` pairs of the YAML frontmatter (flat scalars and `[a, b]` lists only). */
function readFrontmatter(source: string): Record<string, string> {
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(source);
  const data: Record<string, string> = {};
  for (const line of (match?.[1] ?? '').split(/\r?\n/)) {
    const pair = /^([A-Za-z][\w-]*):\s*(.*?)\s*$/.exec(line);
    if (pair?.[1]) data[pair[1]] = (pair[2] ?? '').replace(/^(["'])(.*)\1$/, '$2');
  }
  return data;
}

function readPosts(postsDir: string): PostMeta[] {
  let files: string[];
  try {
    files = readdirSync(postsDir, { recursive: true, encoding: 'utf8' });
  } catch {
    return [];
  }
  const posts: PostMeta[] = [];
  for (const file of files) {
    if (!file.endsWith('.mdx')) continue;
    const [locale, ...rest] = file.replaceAll('\\', '/').split('/');
    if (!locale || rest.length === 0) continue;
    const data = readFrontmatter(readFileSync(path.join(postsDir, file), 'utf8'));
    const date = new Date(data['date'] ?? '');
    if (Number.isNaN(date.valueOf())) continue;
    const updated = data['updated'] ? new Date(data['updated']) : undefined;
    const tags = (/^\[(.*)\]$/.exec(data['tags'] ?? '')?.[1] ?? '')
      .split(',')
      .map((tag) => tag.trim().replace(/^["']|["']$/g, ''))
      .filter(Boolean);
    posts.push({
      locale,
      slug: rest.join('/').replace(/\.mdx$/, ''),
      draft: data['draft'] === 'true',
      lastmod: updated && !Number.isNaN(updated.valueOf()) ? updated : date,
      ...(data['translationKey'] ? { translationKey: data['translationKey'] } : {}),
      tags,
    });
  }
  return posts;
}

/**
 * Options for `@astrojs/sitemap`: `filter` and `serialize`.
 * `siteUrl` is the canonical origin, `postsDir` the folder holding `<locale>/<slug>.mdx`.
 */
export function createSitemapSetup(opts: {
  siteUrl: string;
  postsDir: string;
  locales: readonly string[];
  defaultLocale: string;
  /** Path prefixes and pages that must never be listed (404, dev-only routes, OG images). */
  exclude: RegExp[];
}): SitemapSetup {
  const { siteUrl, postsDir, locales, defaultLocale, exclude } = opts;
  const origin = new URL(siteUrl).origin;
  const published = readPosts(postsDir).filter((post) => !post.draft);

  const prefix = (locale: string) => (locale === defaultLocale ? '' : `/${locale}`);
  const postPath = (post: PostMeta) => `${prefix(post.locale)}/blog/${post.slug}/`;
  const urlOf = (pathname: string) => `${origin}${pathname}`;

  const byPath = new Map(published.map((post) => [postPath(post), post]));
  const draftPaths = new Set(
    readPosts(postsDir)
      .filter((post) => post.draft)
      .map(postPath),
  );

  const newest = (posts: PostMeta[]) =>
    posts.reduce<Date | undefined>(
      (max, post) => (!max || post.lastmod > max ? post.lastmod : max),
      undefined,
    );

  const hreflangLinks = (
    pairs: { locale: string; pathname: string }[],
  ): SitemapLink[] | undefined => {
    if (pairs.length < 2) return undefined;
    const links = pairs.map(({ locale, pathname }) => ({ url: urlOf(pathname), lang: locale }));
    const fallback = pairs.find((pair) => pair.locale === defaultLocale) ?? pairs[0];
    if (fallback) links.push({ url: urlOf(fallback.pathname), lang: 'x-default' });
    return links;
  };

  return {
    filter(page) {
      const { pathname } = new URL(page);
      return !exclude.some((pattern) => pattern.test(pathname)) && !draftPaths.has(pathname);
    },

    serialize(item) {
      const { pathname } = new URL(item.url);
      const post = byPath.get(pathname);

      if (post) {
        const translations = post.translationKey
          ? published.filter(
              (other) =>
                other.translationKey === post.translationKey && other.locale !== post.locale,
            )
          : [];
        // Posts never use the integration's path-based pairing: only translationKey pairs them.
        const links = hreflangLinks(
          [post, ...translations]
            .filter(
              (entry, index, all) => all.findIndex((e) => e.locale === entry.locale) === index,
            )
            .map((entry) => ({ locale: entry.locale, pathname: postPath(entry) })),
        );
        return { ...item, lastmod: post.lastmod.toISOString(), links };
      }

      // Home, blog index and tag pages: lastmod is the newest post they list.
      const locale = locales.find((l) => l !== defaultLocale && pathname.startsWith(`/${l}/`));
      const owner = locale ?? defaultLocale;
      const inLocale = published.filter((entry) => entry.locale === owner);
      const tag = /\/blog\/tag\/([^/]+)\/$/.exec(pathname)?.[1];
      const listed = tag
        ? inLocale.filter((entry) => entry.tags.includes(tag))
        : /^(\/[a-z]{2})?\/(blog\/)?$/.test(pathname)
          ? inLocale
          : [];
      const lastmod = newest(listed);
      const links = item.links;
      const fallback = links?.find((link) => link.lang === defaultLocale);
      return {
        ...item,
        lastmod: lastmod?.toISOString(),
        links: links && fallback ? [...links, { url: fallback.url, lang: 'x-default' }] : links,
      };
    },
  };
}
