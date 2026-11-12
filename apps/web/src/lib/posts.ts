import { getCollection, type CollectionEntry } from 'astro:content';
import getReadingTime from 'reading-time';
import { localePath, locales, type Locale } from '@/i18n';
import { monthKey } from '@/lib/dates';

export interface PostSummary {
  id: string;
  slug: string;
  locale: Locale;
  url: string; // locale-correct, absolute path ("/uz/blog/salom-dunyo/")
  title: string;
  description: string;
  date: Date;
  updated?: Date;
  tags: string[];
  readingMinutes: number;
  translationKey?: string;
}

export type PostEntry = CollectionEntry<'posts'>;

const isLocale = (value: string): value is Locale => (locales as readonly string[]).includes(value);

/** Locale comes from the first folder of the entry id, the slug from the rest. */
export function parsePostId(id: string): { locale: Locale; slug: string } {
  const [folder, ...rest] = id.split('/');
  if (!folder || !isLocale(folder) || rest.length === 0) {
    throw new Error(
      `Post "${id}" must live in posts/<locale>/<slug>.mdx (locale one of ${locales.join(', ')}).`,
    );
  }
  return { locale: folder, slug: rest.join('/') };
}

export function readingMinutes(body: string | undefined): number {
  return Math.max(1, Math.ceil(getReadingTime(body ?? '').minutes));
}

export function toPostSummary(entry: PostEntry): PostSummary {
  const { locale, slug } = parsePostId(entry.id);
  const { title, description, date, updated, tags, translationKey } = entry.data;
  return {
    id: entry.id,
    slug,
    locale,
    url: localePath(locale, `/blog/${slug}/`),
    title,
    description,
    date,
    ...(updated ? { updated } : {}),
    tags,
    readingMinutes: readingMinutes(entry.body),
    ...(translationKey ? { translationKey } : {}),
  };
}

/** Collection entries without drafts in production builds. Drafts are visible in `astro dev`. */
export async function getPostEntries(): Promise<PostEntry[]> {
  return getCollection('posts', ({ data }) => (import.meta.env.PROD ? !data.draft : true));
}

const newestFirst = (a: PostSummary, b: PostSummary) => b.date.valueOf() - a.date.valueOf();

async function getAllSummaries(): Promise<PostSummary[]> {
  return (await getPostEntries()).map(toPostSummary).sort(newestFirst);
}

/**
 * Posts written in `locale`, newest first. With `includeOtherLocale`, posts from the other
 * locale that have no translation in `locale` are added (so a reader is not shown a post twice).
 */
export async function getPosts(
  locale: Locale,
  opts: { includeOtherLocale?: boolean } = {},
): Promise<PostSummary[]> {
  const all = await getAllSummaries();
  const own = all.filter((post) => post.locale === locale);
  if (!opts.includeOtherLocale) return own;

  const translatedKeys = new Set(
    own.flatMap((post) => (post.translationKey ? [post.translationKey] : [])),
  );
  const foreign = all.filter(
    (post) =>
      post.locale !== locale && (!post.translationKey || !translatedKeys.has(post.translationKey)),
  );
  return [...own, ...foreign].sort(newestFirst);
}

/** Tags used by posts written in `locale`, most used first, then alphabetical. */
export async function getAllTags(locale: Locale): Promise<{ tag: string; count: number }[]> {
  const counts = new Map<string, number>();
  for (const post of await getPosts(locale)) {
    for (const tag of post.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  return [...counts]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

/** Neighbours within the post's own locale: `prev` is the next older post, `next` the next newer one. */
export async function getAdjacentPosts(
  post: PostSummary,
): Promise<{ prev?: PostSummary; next?: PostSummary }> {
  const posts = await getPosts(post.locale); // newest first
  const index = posts.findIndex((candidate) => candidate.id === post.id);
  if (index === -1) return {};
  const prev = posts[index + 1];
  const next = posts[index - 1];
  return { ...(prev ? { prev } : {}), ...(next ? { next } : {}) };
}

/** The same post in the other locale(s), linked through `translationKey`. */
export async function getTranslations(post: PostSummary): Promise<PostSummary[]> {
  if (!post.translationKey) return [];
  const all = await getAllSummaries();
  return all.filter(
    (candidate) =>
      candidate.translationKey === post.translationKey && candidate.locale !== post.locale,
  );
}

/**
 * `view-transition-name` shared by the title in a list row and the article title, so the
 * title morphs between them. Must match the default of `PostRow` (components/ui/PostRow.astro).
 */
export function postTransitionName(post: Pick<PostSummary, 'locale' | 'slug'>): string {
  return `post-${post.locale}-${post.slug}`.replace(/[^a-zA-Z0-9-]/g, '-');
}

/** Posts (already sorted newest first) grouped by calendar month, in order. */
export function groupPostsByMonth(
  posts: readonly PostSummary[],
): { key: string; posts: PostSummary[] }[] {
  const groups: { key: string; posts: PostSummary[] }[] = [];
  for (const post of posts) {
    const key = monthKey(post.date);
    const last = groups.at(-1);
    if (last?.key === key) last.posts.push(post);
    else groups.push({ key, posts: [post] });
  }
  return groups;
}
