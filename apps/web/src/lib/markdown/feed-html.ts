import { getContainerRenderer } from '@astrojs/mdx/container-renderer';
import { render } from 'astro:content';
import { loadRenderers } from 'astro:container';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import Figure from '@/components/blog/Figure.astro';
import Img from '@/components/blog/Img.astro';
import Note from '@/components/blog/Note.astro';
import PullQuote from '@/components/blog/PullQuote.astro';
import type { PostEntry } from '@/lib/posts';

/**
 * Full post HTML for the feeds (`content:encoded`). The post is rendered through Astro's
 * container API with a lean mapping: standard elements stay plain (no permalinks, wrappers,
 * arrows or scripts), only the components authors import are kept. The result is cleaned up
 * for readers outside the site: motion and cursor attributes and scoped-style markers are
 * dropped, and every site-relative URL (links, images, footnote anchors) becomes absolute.
 */
const feedComponents = { img: Img, Figure, Note, PullQuote };

let container: Promise<AstroContainer> | undefined;

function getContainer(): Promise<AstroContainer> {
  container ??= (async () =>
    AstroContainer.create({ renderers: await loadRenderers([getContainerRenderer()]) }))();
  return container;
}

/**
 * Removes `<style>` and `<script>` blocks. One pass is not enough for every input: removing
 * the inner block of `<scr<script></script>ipt>` joins a new `<script>`, so the removal
 * repeats until nothing changes.
 */
function removeBlocks(html: string): string {
  let previous: string;
  let current = html;
  do {
    previous = current;
    current = current.replace(/<(style|script)\b[\s\S]*?<\/\1>/gi, '');
  } while (current !== previous);
  return current;
}

/** Makes site-relative URLs absolute and removes attributes that only matter on the site. */
export function cleanFeedHtml(html: string, pageUrl: string): string {
  const origin = new URL(pageUrl).origin;
  return removeBlocks(html)
    .replace(
      /\s(?:data-(?:reveal|astro|cursor|lenis|copy)[\w-]*|transition:[\w-]+)(?:="[^"]*")?/g,
      '',
    )
    .replace(/\shref="(#[^"]*)"/g, (_match, hash: string) => ` href="${pageUrl}${hash}"`)
    .replace(
      /\s(href|src)="(\/(?!\/)[^"]*)"/g,
      (_match, attr: string, path: string) => ` ${attr}="${origin}${path}"`,
    )
    .replace(/\ssrcset="([^"]*)"/g, (_match, set: string) => {
      const absolute = set.replace(/(^|,\s*)(\/(?!\/)[^\s,]+)/g, `$1${origin}$2`);
      return ` srcset="${absolute}"`;
    });
}

export async function renderPostHtml(entry: PostEntry, pageUrl: string): Promise<string> {
  const { Content } = await render(entry);
  const html = await (
    await getContainer()
  ).renderToString(Content, {
    props: { components: feedComponents },
  });
  return cleanFeedHtml(html, pageUrl);
}
