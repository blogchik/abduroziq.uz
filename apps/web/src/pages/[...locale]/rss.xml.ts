import rss from '@astrojs/rss';
import type { APIContext, GetStaticPaths } from 'astro';
import { PUBLIC_SITE_URL } from 'astro:env/client';
import { localeParam, localePath, locales, resolveLocale, t } from '@/i18n';
import { getPosts } from '@/lib/posts';

export const getStaticPaths = (() =>
  locales.map((locale) => ({ params: { locale: localeParam(locale) } }))) satisfies GetStaticPaths;

export async function GET(context: APIContext) {
  const locale = resolveLocale(context.params['locale']);
  const posts = await getPosts(locale); // first-class posts of this locale; drafts excluded in production
  return rss({
    title: t(locale, 'seo.rss.title'),
    description: t(locale, 'seo.rss.description'),
    site: new URL(localePath(locale, '/'), context.site ?? PUBLIC_SITE_URL).href, // channel link; item links are absolute paths
    items: posts.map((post) => ({
      title: post.title,
      description: post.description,
      pubDate: post.date,
      link: post.url,
      categories: post.tags,
    })),
    customData: `<language>${locale}</language>`,
  });
}
