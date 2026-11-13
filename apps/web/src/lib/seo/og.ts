import { stripLocale, type Locale } from '@/i18n';
import { absoluteUrl } from './site';

export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

/** What an Open Graph image shows. `post` carries the post slug (without locale). */
export type OgTarget = { kind: 'home' } | { kind: 'blog' } | { kind: 'post'; slug: string };

/** Site-relative path of the generated PNG: `/og/uz/post/salom-dunyo.png`. */
export function ogImagePath(locale: Locale, target: OgTarget): string {
  const name = target.kind === 'post' ? `post/${target.slug}` : target.kind;
  return `/og/${locale}/${name}.png`;
}

/** Absolute URL of the generated Open Graph image. */
export function ogImageUrl(locale: Locale, target: OgTarget): string {
  return absoluteUrl(ogImagePath(locale, target));
}

/** Which image a locale-agnostic page path gets when the page passes none. */
export function defaultOgTarget(path: string, type: 'website' | 'article'): OgTarget {
  const clean = stripLocale(path);
  const post = /^\/blog\/([^/]+)\/$/.exec(clean);
  if (post?.[1] && post[1] !== 'tag' && type === 'article') return { kind: 'post', slug: post[1] };
  if (clean.startsWith('/blog/')) return { kind: 'blog' };
  return { kind: 'home' };
}
