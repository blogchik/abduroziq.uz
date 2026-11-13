import type { APIRoute } from 'astro';
import { PUBLIC_ALLOW_INDEXING, PUBLIC_SITE_URL } from 'astro:env/client';

export const GET: APIRoute = ({ site }) => {
  const body =
    PUBLIC_ALLOW_INDEXING === 'true'
      ? `User-agent: *\nAllow: /\n\nSitemap: ${new URL('sitemap-index.xml', site ?? PUBLIC_SITE_URL).href}\n`
      : 'User-agent: *\nDisallow: /\n';
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
