import { PUBLIC_SITE_URL } from 'astro:env/client';

const siteHost = new URL(PUBLIC_SITE_URL).host;

/**
 * True for links that leave this site: absolute http(s) URLs to another host and protocol-
 * relative URLs. Site-relative paths, `#anchors`, `mailto:` and `tel:` are not external.
 */
export function isExternalHref(href: string | undefined): boolean {
  if (!href) return false;
  if (!/^(https?:)?\/\//i.test(href)) return false;
  try {
    return new URL(href, PUBLIC_SITE_URL).host !== siteHost;
  } catch {
    return false;
  }
}

export const isMailHref = (href: string | undefined): boolean => /^(mailto|tel):/i.test(href ?? '');
