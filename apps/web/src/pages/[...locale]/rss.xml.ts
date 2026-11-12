import rss from '@astrojs/rss';
import { profile } from '@abduroziq/content';
import type { APIContext, GetStaticPaths } from 'astro';
import { localeParam, localePath, locales, resolveLocale, t } from '@/i18n';
import { renderPostHtml } from '@/lib/markdown/feed-html';
import { getPostEntries, toPostSummary } from '@/lib/posts';
import { absoluteUrl } from '@/lib/seo/site';

export const getStaticPaths = (() =>
  locales.map((locale) => ({ params: { locale: localeParam(locale) } }))) satisfies GetStaticPaths;

/**
 * One feed per language with the full text of every post (`content:encoded`). Only posts
 * written in that language, newest first; drafts are excluded in production because
 * `getPostEntries()` excludes them. Every link is absolute.
 */
export async function GET(context: APIContext) {
  const locale = resolveLocale(context.params['locale']);
  const entries = (await getPostEntries())
    .map((entry) => ({ entry, post: toPostSummary(entry) }))
    .filter(({ post }) => post.locale === locale)
    .sort((a, b) => b.post.date.valueOf() - a.post.date.valueOf());

  const items = await Promise.all(
    entries.map(async ({ entry, post }) => {
      const link = absoluteUrl(post.url);
      return {
        title: post.title,
        description: post.description,
        pubDate: post.date,
        link,
        categories: post.tags,
        content: await renderPostHtml(entry, link),
        customData: `<dc:creator>${profile.fullName.split(' ').reverse().join(' ')}</dc:creator>`,
      };
    }),
  );

  const feedUrl = absoluteUrl(localePath(locale, '/rss.xml'));
  const latest = entries[0]?.post;
  const lastBuild = latest
    ? `<lastBuildDate>${(latest.updated ?? latest.date).toUTCString()}</lastBuildDate>`
    : '';

  return rss({
    title: t(locale, 'seo.rss.title'),
    description: t(locale, 'seo.rss.description'),
    site: absoluteUrl(localePath(locale, '/')),
    items,
    xmlns: {
      atom: 'http://www.w3.org/2005/Atom',
      dc: 'http://purl.org/dc/elements/1.1/',
    },
    customData: [
      `<language>${locale}</language>`,
      lastBuild,
      `<atom:link href="${feedUrl}" rel="self" type="application/rss+xml" />`,
    ].join(''),
  });
}
