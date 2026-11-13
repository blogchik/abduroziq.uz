/**
 * Sitemap helpers. This file runs inside `astro.config.ts`, before Astro's virtual modules
 * exist, so it uses only Node built-ins and the `yaml` package, and never imports `astro:*`
 * or `@/i18n`.
 *
 * It reads the frontmatter of every post file to
 *  - leave drafts out of the sitemap,
 *  - set `lastmod` to `updated ?? date`,
 *  - pair translated posts (same `translationKey`) with hreflang links even though their
 *    slugs differ between languages, which the integration's built-in pairing cannot do,
 *  - leave out pages that are not worth indexing yet: a blog index with nothing on it and
 *    tag pages with fewer than `MIN_POSTS_PER_TAG` posts (those pages carry `noindex` too).
 */
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { parse } from 'yaml';
import { MIN_POSTS_PER_TAG } from './thresholds.ts';

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

export interface PostMeta {
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

function toDate(value: unknown): Date | undefined {
  if (value instanceof Date) return Number.isNaN(value.valueOf()) ? undefined : value;
  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value);
    return Number.isNaN(date.valueOf()) ? undefined : date;
  }
  return undefined;
}

/**
 * Metadata of one post file (`file` is relative to the posts folder: `<locale>/<slug>.mdx`),
 * from its YAML frontmatter. A real YAML parser reads it, so trailing comments, block lists
 * and quoting all work. Throws a message naming the file when the frontmatter is missing or
 * has no valid `date`: a post silently dropping out of the sitemap is worse than a failed build.
 */
export function parsePostMeta(source: string, file: string): PostMeta {
  const [locale, ...rest] = file.replaceAll('\\', '/').split('/');
  if (!locale || rest.length === 0) {
    throw new Error(`Post "${file}" must live in posts/<locale>/<slug>.mdx.`);
  }
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(source);
  if (!match?.[1]) throw new Error(`Post "${file}" has no YAML frontmatter.`);

  let data: Record<string, unknown>;
  try {
    const parsed: unknown = parse(match[1]);
    data = parsed !== null && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
  } catch (error) {
    throw new Error(`Post "${file}" has invalid YAML frontmatter: ${(error as Error).message}`, {
      cause: error,
    });
  }

  const date = toDate(data['date']);
  if (!date) throw new Error(`Post "${file}" needs a valid "date" in its frontmatter.`);
  const updated = toDate(data['updated']);
  const tags = Array.isArray(data['tags'])
    ? data['tags'].map((tag) => String(tag).trim()).filter(Boolean)
    : [];
  const translationKey = data['translationKey'];

  return {
    locale,
    slug: rest.join('/').replace(/\.mdx$/, ''),
    draft: data['draft'] === true,
    lastmod: updated ?? date,
    ...(typeof translationKey === 'string' && translationKey ? { translationKey } : {}),
    tags,
  };
}

function readPosts(postsDir: string): PostMeta[] {
  let files: string[];
  try {
    files = readdirSync(postsDir, { recursive: true, encoding: 'utf8' });
  } catch {
    return [];
  }
  return files
    .filter((file) => file.endsWith('.mdx'))
    .map((file) => parsePostMeta(readFileSync(path.join(postsDir, file), 'utf8'), file));
}

/**
 * Options for `@astrojs/sitemap`: `filter` and `serialize`.
 * `siteUrl` is the canonical origin, `postsDir` the folder holding `<locale>/<slug>.mdx`.
 * `posts` replaces reading the folder (used by `sitemap.test.ts`).
 */
export function createSitemapSetup(opts: {
  siteUrl: string;
  postsDir: string;
  locales: readonly string[];
  defaultLocale: string;
  /** Path patterns that must never be listed (404, dev-only routes, OG images). */
  exclude: RegExp[];
  posts?: PostMeta[];
}): SitemapSetup {
  const { siteUrl, postsDir, locales, defaultLocale, exclude } = opts;
  const origin = new URL(siteUrl).origin;
  const all = opts.posts ?? readPosts(postsDir);
  const published = all.filter((post) => !post.draft);

  const prefix = (locale: string) => (locale === defaultLocale ? '' : `/${locale}`);
  const postPath = (post: PostMeta) => `${prefix(post.locale)}/blog/${post.slug}/`;
  const urlOf = (pathname: string) => `${origin}${pathname}`;
  const localeOf = (pathname: string) =>
    locales.find(
      (l) => l !== defaultLocale && (pathname === `/${l}/` || pathname.startsWith(`/${l}/`)),
    ) ?? defaultLocale;

  const byPath = new Map(published.map((post) => [postPath(post), post]));
  const draftPaths = new Set(all.filter((post) => post.draft).map(postPath));

  const newest = (posts: PostMeta[]) =>
    posts.reduce<Date | undefined>(
      (max, post) => (!max || post.lastmod > max ? post.lastmod : max),
      undefined,
    );

  /** Posts the blog index of `locale` lists: its own plus untranslated ones of other languages. */
  const listedOnIndex = (locale: string): PostMeta[] => {
    const own = published.filter((post) => post.locale === locale);
    const translated = new Set(
      own.flatMap((post) => (post.translationKey ? [post.translationKey] : [])),
    );
    const foreign = published.filter(
      (post) =>
        post.locale !== locale && (!post.translationKey || !translated.has(post.translationKey)),
    );
    return [...own, ...foreign];
  };

  const tagOf = (pathname: string) => /\/blog\/tag\/([^/]+)\/$/.exec(pathname)?.[1];
  const isBlogIndex = (pathname: string) => /^(\/[a-z]{2})?\/blog\/$/.test(pathname);

  const included = (pathname: string): boolean => {
    if (exclude.some((pattern) => pattern.test(pathname)) || draftPaths.has(pathname)) return false;
    const locale = localeOf(pathname);
    if (isBlogIndex(pathname)) return listedOnIndex(locale).length > 0;
    const tag = tagOf(pathname);
    if (tag) {
      const count = published.filter(
        (post) => post.locale === locale && post.tags.includes(tag),
      ).length;
      return count >= MIN_POSTS_PER_TAG;
    }
    return true;
  };

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
      return included(new URL(page).pathname);
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
              (entry, index, list) => list.findIndex((e) => e.locale === entry.locale) === index,
            )
            .map((entry) => ({ locale: entry.locale, pathname: postPath(entry) })),
        );
        return { ...item, lastmod: post.lastmod.toISOString(), links };
      }

      // Home, blog index and tag pages: lastmod is the newest post they list.
      const owner = localeOf(pathname);
      const inLocale = published.filter((entry) => entry.locale === owner);
      const tag = tagOf(pathname);
      const listed = tag
        ? inLocale.filter((entry) => entry.tags.includes(tag))
        : isBlogIndex(pathname)
          ? listedOnIndex(owner)
          : /^(\/[a-z]{2})?\/$/.test(pathname)
            ? inLocale
            : [];
      const lastmod = newest(listed);

      // Alternates that are not in the sitemap (a tag page of the other language with too few
      // posts) must not be advertised either.
      const kept = item.links?.filter((link) => included(new URL(link.url).pathname));
      const fallback = kept?.find((link) => link.lang === defaultLocale);
      const links =
        kept && kept.length > 1 && fallback
          ? [...kept, { url: fallback.url, lang: 'x-default' }]
          : undefined;
      return { ...item, lastmod: lastmod?.toISOString(), links };
    },
  };
}
