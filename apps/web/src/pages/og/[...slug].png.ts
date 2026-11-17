import type { APIRoute, GetStaticPaths } from 'astro';
import { profile } from '@abduroziq/content';
import { locales, t } from '@/i18n';
import { formatDate } from '@/lib/dates';
import { getPostEntries, parsePostId, toPostSummary } from '@/lib/posts';
import { getProjects } from '@/lib/projects';
import { renderOgImage, type OgCard } from '@/lib/seo/og-image';

/**
 * Generated Open Graph images (1200x630 PNG), built once per page at build time:
 *   /og/<locale>/home.png          home page
 *   /og/<locale>/blog.png          blog index (also used by tag pages)
 *   /og/<locale>/post/<slug>.png   one per post, in the post's own language
 *   /og/<locale>/projects.png      projects list
 *   /og/<locale>/project/<slug>.png  one per project, in every language
 * URLs come from `ogImageUrl()` in `lib/seo/og.ts`.
 */
type Props = { card: OgCard };

export const getStaticPaths = (async () => {
  const paths: { params: { slug: string }; props: Props }[] = [];

  for (const locale of locales) {
    paths.push({
      params: { slug: `${locale}/home` },
      props: {
        card: {
          locale,
          title: profile.name,
          hero: true,
          labels: [profile.role[locale]],
          subtitle: `${profile.role[locale]} · ${profile.location.city[locale]}, ${profile.location.country[locale]}`,
        },
      },
    });
    paths.push({
      params: { slug: `${locale}/blog` },
      props: {
        card: {
          locale,
          title: t(locale, 'seo.blog.title'),
          labels: [t(locale, 'common.nav.writing')],
        },
      },
    });
    paths.push({
      params: { slug: `${locale}/projects` },
      props: {
        card: {
          locale,
          title: t(locale, 'projects.title'),
          labels: [t(locale, 'common.nav.building')],
          subtitle: t(locale, 'projects.intro'),
        },
      },
    });
    for (const project of await getProjects(locale)) {
      paths.push({
        params: { slug: `${locale}/project/${project.slug}` },
        props: {
          card: {
            locale,
            title: project.name,
            labels: [t(locale, 'common.nav.building'), project.year],
            subtitle: project.summary,
          },
        },
      });
    }
  }

  for (const entry of await getPostEntries()) {
    const { locale, slug } = parsePostId(entry.id);
    const post = toPostSummary(entry);
    paths.push({
      params: { slug: `${locale}/post/${slug}` },
      props: {
        card: {
          locale,
          title: post.title,
          // A note's card says so where a post's card says "Writing".
          labels: [
            t(locale, post.kind === 'note' ? 'blog.note.label' : 'common.nav.writing'),
            formatDate(post.date, locale),
          ],
          tags: post.tags.slice(0, 4),
        },
      },
    });
  }
  return paths;
}) satisfies GetStaticPaths;

export const GET: APIRoute<Props> = async ({ props }) => {
  const png = await renderOgImage(props.card);
  return new Response(new Uint8Array(png), {
    headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=3600' },
  });
};
