import { getImage } from 'astro:assets';
import { profile } from '@abduroziq/content';
import portrait from '@abduroziq/content/assets/portrait.jpg';
import { localePath, locales, t, type Locale } from '@/i18n';
import { plainText } from './meta';
import { ogImageUrl, type OgTarget } from './og';
import { absoluteUrl, authorName, entityId } from './site';

/** A JSON-LD node. `JsonLd.astro` adds `@context`. */
export type JsonLdNode = Record<string, unknown>;

const reference = (id: string): JsonLdNode => ({ '@id': id });

/** "Jabborov Abduroziq" (surname first, as in the profile) -> given and family name. */
function nameParts() {
  const [family = profile.fullName, ...given] = profile.fullName.split(' ');
  return { givenName: given.join(' ') || profile.name, familyName: family };
}

// The portrait through Astro's image pipeline: a hashed, resized file with an absolute URL.
const personImage = await getImage({ src: portrait, width: 800, height: 800, format: 'jpg' });

/** The author as a reference that also carries name and url, which crawlers expect inline. */
function authorRef(): JsonLdNode {
  return {
    '@type': 'Person',
    '@id': entityId.person(),
    name: authorName,
    url: absoluteUrl('/'),
  };
}

export function personSchema(locale: Locale): JsonLdNode {
  const { givenName, familyName } = nameParts();
  return {
    '@type': 'Person',
    '@id': entityId.person(),
    name: authorName,
    givenName,
    familyName,
    alternateName: [profile.fullName, profile.name],
    url: absoluteUrl('/'),
    image: {
      '@type': 'ImageObject',
      url: absoluteUrl(personImage.src),
      width: 800,
      height: 800,
    },
    jobTitle: profile.role[locale],
    description: profile.support[locale],
    knowsLanguage: [...locales],
    homeLocation: {
      '@type': 'Place',
      name: `${profile.location.city[locale]}, ${profile.location.country[locale]}`,
    },
    address: {
      '@type': 'PostalAddress',
      addressLocality: profile.location.city[locale],
      addressCountry: 'UZ',
    },
    sameAs: profile.socials.map((social) => social.href),
  };
}

export function websiteSchema(locale: Locale): JsonLdNode {
  return {
    '@type': 'WebSite',
    '@id': entityId.website(),
    url: absoluteUrl('/'),
    name: profile.name,
    description: t(locale, 'seo.site.description'),
    inLanguage: [...locales],
    publisher: reference(entityId.person()),
    author: reference(entityId.person()),
  };
}

/**
 * The home page: a ProfilePage whose main entity is the Person. `modified` defaults to the
 * moment of the build, which is when the page was last regenerated.
 */
export function profilePageSchema(locale: Locale, modified: Date = new Date()): JsonLdNode {
  const url = absoluteUrl(localePath(locale, '/'));
  return {
    '@type': 'ProfilePage',
    '@id': entityId.onPage(url, 'profilepage'),
    url,
    name: t(locale, 'seo.home.title'),
    description: t(locale, 'seo.home.description'),
    inLanguage: locale,
    dateModified: modified.toISOString(),
    isPartOf: reference(entityId.website()),
    mainEntity: reference(entityId.person()),
    primaryImageOfPage: {
      '@type': 'ImageObject',
      url: ogImageUrl(locale, { kind: 'home' }),
      width: 1200,
      height: 630,
    },
  };
}

interface PostForSchema {
  title: string;
  description: string;
  date: Date;
  updated?: Date | undefined;
  tags: string[];
  url: string;
}

/** The blog index of a locale, listing its newest posts. */
export function blogSchema(locale: Locale, posts: readonly PostForSchema[] = []): JsonLdNode {
  const url = absoluteUrl(localePath(locale, '/blog/'));
  return {
    '@type': 'Blog',
    '@id': entityId.onPage(url, 'blog'),
    url,
    name: t(locale, 'seo.blog.title'),
    description: t(locale, 'seo.blog.description'),
    inLanguage: locale,
    isPartOf: reference(entityId.website()),
    publisher: reference(entityId.person()),
    author: reference(entityId.person()),
    ...(posts.length > 0
      ? {
          blogPost: posts.slice(0, 10).map((post) => ({
            '@type': 'BlogPosting',
            '@id': entityId.onPage(absoluteUrl(post.url), 'article'),
            headline: post.title,
            url: absoluteUrl(post.url),
            datePublished: post.date.toISOString(),
          })),
        }
      : {}),
  };
}

/** A tag page: a CollectionPage inside the blog. */
export function collectionPageSchema(
  locale: Locale,
  opts: { path: string; name: string; description: string },
): JsonLdNode {
  const url = absoluteUrl(localePath(locale, opts.path));
  return {
    '@type': 'CollectionPage',
    '@id': entityId.onPage(url, 'collection'),
    url,
    name: opts.name,
    description: opts.description,
    inLanguage: locale,
    isPartOf: reference(entityId.onPage(absoluteUrl(localePath(locale, '/blog/')), 'blog')),
  };
}

export { countWords } from '@/lib/body-text';

export function blogPostingSchema(
  post: PostForSchema,
  opts: {
    locale: Locale;
    slug: string;
    wordCount?: number | undefined;
    /** Absolute URL of the post's cover, listed after the generated card. */
    coverImage?: string | undefined;
  },
): JsonLdNode {
  const url = absoluteUrl(post.url);
  const target: OgTarget = { kind: 'post', slug: opts.slug };
  return {
    '@type': 'BlogPosting',
    '@id': entityId.onPage(url, 'article'),
    headline: plainText(post.title),
    description: plainText(post.description),
    image: [ogImageUrl(opts.locale, target), ...(opts.coverImage ? [opts.coverImage] : [])],
    datePublished: post.date.toISOString(),
    dateModified: (post.updated ?? post.date).toISOString(),
    author: authorRef(),
    publisher: authorRef(),
    inLanguage: opts.locale,
    ...(post.tags.length > 0 ? { keywords: post.tags.join(', ') } : {}),
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    url,
    isPartOf: reference(entityId.onPage(absoluteUrl(localePath(opts.locale, '/blog/')), 'blog')),
    ...(opts.wordCount ? { wordCount: opts.wordCount } : {}),
  };
}

export interface Crumb {
  name: string;
  /** Locale-agnostic path ('/blog/') or an absolute URL. */
  path: string;
}

/** Breadcrumb trail. The last crumb is the current page. */
export function breadcrumbSchema(locale: Locale, crumbs: readonly Crumb[]): JsonLdNode {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: plainText(crumb.name),
      item: /^https?:/.test(crumb.path) ? crumb.path : absoluteUrl(localePath(locale, crumb.path)),
    })),
  };
}
