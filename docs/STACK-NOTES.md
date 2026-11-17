# STACK-NOTES (verified 2026-11-12)

Sources: raw docs from `withastro/docs@main` (= Astro 7 docs), `tailwindlabs/tailwindcss.com@main`, `pnpm/pnpm.io@main`, `vercel/turborepo@main` docs, package tarballs/types inspected locally (`npm pack`), `npm view`, developers.cloudflare.com, gsap.com license page. Context7 only indexes Astro up to v6, so it was NOT used for Astro 7 facts. Items marked **Unverified** were not confirmed.

## Pinned versions

| Package                                                        | Version                        | Note                                                                                                                                                   |
| -------------------------------------------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| node                                                           | 24.x (>=24.16 recommended)     | astro needs >=22.23.4; eslint-plugin-astro needs ^22.22.3 / ^24.16.0 / >=26.3.0. Local 24.14 triggers an engines warning for eslint-plugin-astro only. |
| pnpm                                                           | 10.32.x (via `packageManager`) | latest on npm is 12.x; keep 10 and CI must read the same version                                                                                       |
| astro                                                          | 7.4.11                         | Vite 8, Rust compiler, Sätteri md processor                                                                                                            |
| @astrojs/mdx                                                   | 8.1.5                          | peer astro ^7.2.10                                                                                                                                     |
| @astrojs/sitemap                                               | 3.7.4                          |                                                                                                                                                        |
| @astrojs/rss                                                   | 4.0.19                         |                                                                                                                                                        |
| @astrojs/check                                                 | 0.9.12                         | peer `typescript ^5 \|\| ^6` -> **TS 7 NOT supported**                                                                                                 |
| typescript                                                     | **6.0.3** (`~6.0.3`)           | typescript-eslint 8.73.0 peer `<6.1.0`; TS 7.0.2 is the Go port, breaks both                                                                           |
| tailwindcss + @tailwindcss/vite                                | 4.3.5                          | vite peer `^5.2\|\|^6\|\|^7\|\|^8` OK                                                                                                                  |
| gsap                                                           | 3.15.1                         | all plugins incl. SplitText/Draggable/InertiaPlugin ship in the npm package                                                                            |
| lenis                                                          | 1.3.27                         |                                                                                                                                                        |
| turbo                                                          | 2.11.11                        | schema URL is now `https://turborepo.dev/schema.json`                                                                                                  |
| satori                                                         | 0.63.2                         | accepts TTF/OTF/WOFF/WOFF2                                                                                                                             |
| sharp                                                          | ships with astro               | (0.35.x) use for SVG->PNG; `@resvg/resvg-js` 2.6.2 optional                                                                                            |
| wrangler                                                       | 4.161.0                        | engines node >=22.12                                                                                                                                   |
| eslint                                                         | 10.15.0                        |                                                                                                                                                        |
| typescript-eslint                                              | 8.73.0                         |                                                                                                                                                        |
| eslint-plugin-astro                                            | 3.2.1                          | requires eslint >=10; ESM only                                                                                                                         |
| prettier / prettier-plugin-astro / prettier-plugin-tailwindcss | 3.10.1 / 1.1.2 / 0.8.1         |                                                                                                                                                        |
| @lhci/cli                                                      | 0.16.1                         | node >=22.19                                                                                                                                           |
| satteri                                                        | 0.11.7                         | only if writing Sätteri plugins                                                                                                                        |
| @astrojs/markdown-remark                                       | 7.3.8                          | only if switching to unified()                                                                                                                         |

Actions majors (latest release tags on 2026-11-12): `actions/checkout@v7` (7.0.1), `actions/setup-node@v7` (7.1.0), `pnpm/action-setup@v6` (6.1.1), `actions/cache@v6`, `actions/upload-artifact@v7`, `cloudflare/wrangler-action@v4` (4.1.3), `treosh/lighthouse-ci-action@v12` (12.6.2).

---

## 1. Astro 7 project basics

**Facts**

- Min Node `>=22.23.4` (astro, @astrojs/mdx, create-astro). Node 18/20 dropped in v6. Vite 8 + Rolldown, Zod 4, Shiki 4.
- Config file: `astro.config.mjs|js|ts|mts` (`.cjs/.cts` removed in v6). Use `astro.config.ts`.
- Create in workspace without installing/git: `pnpm create astro@latest apps/web -- --template minimal --no-install --no-git --yes` (create-astro 5.3.1 flags: `--template`, `--install/--no-install`, `--git/--no-git`, `--add`, `--no-ai`, `--yes`). Then edit `package.json` by hand and `pnpm install` at root. Hand-writing the minimal files is equally fine.
- TypeScript: `@astrojs/check` peers `^5||^6`; typescript-eslint peers `<6.1.0`. **Pin TypeScript 6.0.x.** `typescript@latest` is 7.0.2 (do not install).
- tsconfig presets exist: `astro/tsconfigs/base | strict | strictest`. `base` = ESNext, Bundler resolution, `verbatimModuleSyntax`, `isolatedModules`, `noEmit`, `allowJs`, `jsx: preserve`, include `${configDir}/.astro/types.d.ts`.
- TS 6 new defaults you must account for: `strict: true`, **`types: []`** (add `"types": ["node"]` for `node:fs` in endpoints; `@types/node` must be installed), `baseUrl` deprecated (use `paths` only), `esModuleInterop` cannot be false.

```jsonc
// apps/web/tsconfig.json
{
  "extends": "astro/tsconfigs/strictest",
  "compilerOptions": {
    "types": ["node"],
    "paths": { "@/*": ["./src/*"] },
  },
}
```

**Breaking vs Astro 5 habits (relevant to us)**

1. Legacy content collections removed: config must be `src/content.config.ts`, every collection needs a `loader` (`glob()`), use `entry.id` (not `slug`), `render(entry)` (not `entry.render()`).
2. `import { z } from 'astro/zod'` (Zod 4). `z` from `astro:content` and `astro:schema` is deprecated. Zod 4: `z.email()`, `z.url()`, `{ error: '...' }` not `{ message }`.
3. `<ViewTransitions />` is gone -> `<ClientRouter />` from `astro:transitions`. `TRANSITION_*` constants and `isTransition*Event` removed; use event name strings.
4. Default Markdown/MDX processor is **Sätteri**, not remark/rehype. `markdown.remarkPlugins/rehypePlugins` need `@astrojs/markdown-remark` installed AND still work, but the new way is `markdown.processor: unified({...})` (see 4).
5. `compressHTML` default changed to `'jsx'`: whitespace between inline elements is stripped like React (`<a>x</a> <b>y</b>` loses the space; write `{" "}`). Set `compressHTML: true` to get old behaviour.
6. Rust compiler is stricter: unclosed non-void tags are errors, invalid nesting (`<div>` in `<p>`) is not auto-fixed.
7. `Astro.glob()` removed -> `import.meta.glob(..., {eager:true})`. `src/fetch.ts` is a reserved filename (advanced routing) unless `fetchFile: null`.
8. `import.meta.env` values are always inlined and never coerced (`"true"` stays a string). Use `astro:env` for typed vars.
9. Markdown heading ids keep trailing hyphens (`picture-`), `<script>/<style>` render in source order, endpoints with extensions must not be requested with trailing slash (`/sitemap.xml`).
10. Default image service: no upscaling, cropping without `fit`, SVG rasterised if `format` set (guard SVGs). `getImage()` on the client throws. `@astrojs/db` removed.
11. i18n: `redirectToDefaultLocale` defaults to `false` (only meaningful with `prefixDefaultLocale: true`). `fonts` API is stable (top-level `fonts`, not `experimental.fonts`). Zod/Shiki majors bumped.

**Gotchas**

- Only the first 100k chars of the v6 upgrade page were read; the last ~10k (route pathname normalization, `getStaticPaths()` number params, content loader schema inference) were not.
- `astro check` needs `@astrojs/check` + `typescript` installed in `apps/web`.

**Source:** docs.astro.build upgrade guides v6/v7 (raw docs), `npm view`, `unpkg astro@7.4.11/tsconfigs/*.json`, TS 6.0 announcement.

## 2. i18n routing

```ts
// astro.config.ts
i18n: {
  locales: ['en', 'uz'],
  defaultLocale: 'en',
  routing: { prefixDefaultLocale: false },   // default; en has no prefix
}
```

**Facts**

- Files: `src/pages/index.astro` -> `/`, `src/pages/uz/index.astro` -> `/uz/`, `src/pages/uz/about.astro` -> `/uz/about/`. The folder name must equal the locale code.
- `Astro.currentLocale` works on static pages (derived from URL; falls back to `defaultLocale`).
- `astro:i18n` exports: `getRelativeLocaleUrl(locale, path?, options?)`, `getAbsoluteLocaleUrl(locale, path?, options?)` (needs `site`), `getRelativeLocaleUrlList()`, `getAbsoluteLocaleUrlList()`, `getPathByLocale(locale)`, `getLocaleByPath(path)`, `redirectToDefaultLocale`, `redirectToFallback`, `notFound`, `middleware`, `requestHasLocale`, `normalizeTheLocale`, `pathHasLocale`, `toCodes`, `toPaths`. URLs honour `trailingSlash`, `build.format`, `site`.
- `fallback: { uz: 'en' }` + `routing.fallbackType: 'redirect' | 'rewrite'` (default redirect) generates pages for any missing `uz` route. **Do not use it**: `rewrite` creates duplicate-content `/uz/...` pages with English text; `redirect` emits redirect stubs. We want only translated pages to exist (+ hreflang only where both exist). **Unverified** exact static output of fallback (docs say only "creates missing page according to fallbackType").
- `routing: 'manual'` disables Astro's i18n middleware (not needed).
- Recommendation: `trailingSlash: 'always'`, `build.format: 'directory'` (default) for stable canonical URLs.

```astro
---
import { getRelativeLocaleUrl } from 'astro:i18n';
const lang = Astro.currentLocale ?? 'en';
const other = lang === 'en' ? 'uz' : 'en';
// swap locale for the same path:
const path = Astro.url.pathname.replace(/^\/uz(?=\/|$)/, '') || '/';
const switchHref = getRelativeLocaleUrl(other, path === '/' ? '' : path);
---
```

**Gotchas:** `getRelativeLocaleUrl('en', 'blog')` -> `/blog/` (no prefix) because of `prefixDefaultLocale:false`; pass paths without leading slash or locale prefix. Dynamic routes in `uz/` need their own `getStaticPaths`.
**Source:** guides/internationalization, reference/modules/astro-i18n, configuration-reference (raw docs).

## 3. Content collections

```ts
// apps/web/src/content.config.ts
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const posts = defineCollection({
  loader: glob({ base: '../../packages/content/posts', pattern: '**/*.{md,mdx}' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string().max(170),
      pubDate: z.coerce.date(),
      updatedDate: z.coerce.date().optional(),
      draft: z.boolean().default(false),
      tags: z.array(z.string()).default([]),
      lang: z.enum(['en', 'uz']),
      cover: image().optional(),
      coverAlt: z.string().optional(),
    }),
});
export const collections = { posts };
```

**Facts**

- Config must be `src/content.config.ts` (root-level `src/`), loaders mandatory. `glob({ pattern, base })`: `base` is "a relative path or URL to the directory from which to resolve the pattern" (relative to project root = `apps/web`, so `../../packages/...` is the idiom). Entry `id` = path minus extension (slugified), e.g. `en/hello-world` if files are in `posts/en/hello-world.mdx`; override with `generateId`.
- `getCollection('posts', ({ data }) => import.meta.env.PROD ? !data.draft : true)`; `getEntry('posts', id)`; `const { Content, headings, remarkPluginFrontmatter } = await render(entry)`; `entry.body` has the raw source (usable for reading time).
- `image()` schema helper: relative frontmatter paths resolve **relative to the content file** (`cover: ./cover.jpg` next to the post) and become ImageMetadata for `<Image>`. `image().refine()` unsupported.
- Routes: `src/pages/blog/[...id].astro` with `getStaticPaths` mapping `post.id`; for `uz`, filter by `data.lang` or by folder prefix in `id`.
- `astro sync` (run by dev/build) generates types in `.astro/`.

**Gotchas / Unverified**

- **Unverified:** `image()` resolution and Vite dev-server file access for files outside the app root (`packages/content`). Vite normally auto-allows the pnpm workspace root; first implementation task must smoke-test one post with a cover image. Fallback: keep post images in `apps/web/src/assets/posts/<slug>/` and reference via `/src/assets/...` import in the page, or symlink.
- Draft filter must also apply to RSS, sitemap (`filter`) and `getStaticPaths` (otherwise drafts get built in prod).
- Tailwind scanning of MDX in `packages/content`: add `@source` (see 11).

**Source:** guides/content-collections, reference/content-loader-reference, guides/images (raw docs).

## 4. Markdown / MDX pipeline

**Facts**

- Default processor Sätteri (Rust, fast): handles GFM, smart punctuation, heading ids, Shiki (via `markdown.shikiConfig`) with no extra packages. Sätteri plugins: `mdastPlugins`, `hastPlugins` via `satteri()` from `@astrojs/markdown-satteri` (bundled dependency of astro). Rehype/remark ecosystem plugins (rehype-autolink-headings, rehype-external-links...) do NOT work with Sätteri; switch to `unified()` from `@astrojs/markdown-remark` (install it) if needed. `@astrojs/mdx` inherits `markdown` config; can override via `mdx({ processor, shikiConfig })`.
- Heading ids are automatic (`github-slugger`). `satteriHeadingIdsPlugin()` / `rehypeHeadingIds` only needed when ordering custom plugins that depend on ids. `render()` returns `headings: {depth, slug, text}[]` for a TOC.
- Recommended: stay on Sätteri; add a small `defineMdastPlugin` for reading time, or just compute from `entry.body` (no plugin):

```ts
// src/lib/reading-time.ts  (processor-agnostic, preferred)
import getReadingTime from 'reading-time';
export const readingMinutes = (body = '') => Math.max(1, Math.ceil(getReadingTime(body).minutes));
```

```ts
// Sätteri mdast alternative (from official recipe) - needs `satteri` + `reading-time`
import getReadingTime from 'reading-time';
import { defineMdastPlugin } from 'satteri';
export const mdastReadingTimePlugin = defineMdastPlugin({
  name: 'mdast-reading-time',
  after(root, context) {
    const rt = getReadingTime(context.textContent(root));
    if (context.data.astro !== undefined) context.data.astro.frontmatter.minutesRead = rt.text;
  },
});
// astro.config: markdown: { processor: satteri({ mdastPlugins: [mdastReadingTimePlugin] }) }
// page: const { remarkPluginFrontmatter } = await render(entry);
```

- Shiki dual theme (config is top-level `markdown.shikiConfig`, MDX inherits):

```ts
markdown: {
  shikiConfig: { themes: { light: 'github-light', dark: 'github-dark' }, wrap: true },
}
```

Default output: light colours inline + `--shiki-dark`, `--shiki-dark-bg` vars. Drive by attribute (docs show media-query version; replace `.shiki` with `.astro-code`):

```css
[data-theme='dark'] .astro-code,
[data-theme='dark'] .astro-code span {
  color: var(--shiki-dark) !important;
  background-color: var(--shiki-dark-bg) !important;
  font-style: var(--shiki-dark-font-style) !important;
  font-weight: var(--shiki-dark-font-weight) !important;
  text-decoration: var(--shiki-dark-text-decoration) !important;
}
```

`defaultColor: false` removes inline default colour (then you must style both themes yourself). CSP + Shiki unsupported.

- MDX component mapping: in the page, `<Content components={{ h2: Heading2, a: Link, pre: Pre, img: Img }} />` (works for collection entries rendered via `render()`), or `export const components = {...}` inside an `.mdx`. Custom components used inside MDX must be imported in the MDX file (or passed through `components`).
- Slugs/links in content: relative links are not rewritten for i18n; use absolute `/uz/...`.

```ts
// astro.config.ts (unified fallback)
import { unified } from '@astrojs/markdown-remark';
markdown: {
  processor: unified({
    rehypePlugins: [rehypeSlug, [rehypeAutolinkHeadings, { behavior: 'wrap' }]],
  });
}
```

**Gotchas:** `markdown.gfm/remarkPlugins/rehypePlugins` top-level options are deprecated in favour of processor options. Recma plugins require unified. **Unverified:** whether Sätteri `hastPlugins` cover external-link `rel="noopener"` (write own plugin if needed).
**Source:** guides/markdown-content, reference/markdown-processors/satteri, recipes/reading-time, guides/syntax-highlighting, guides/integrations-guide/mdx.

## 5. View transitions

**Facts**

- `import { ClientRouter } from 'astro:transitions';` then `<ClientRouter />` in the shared `<head>`. Prefetch defaults on (`hover`) with ClientRouter. Built-in `prefers-reduced-motion` media query disables ALL view-transition animations incl. fallback. `fallback="swap" | "animate" | "none"`.
- Events on `document`, in order: `astro:before-preparation` -> `astro:after-preparation` -> `astro:before-swap` (can customise `event.swap()`, `event.newDocument`) -> `astro:after-swap` (DOM swapped, before paint; history+scroll already updated) -> `astro:page-load` (also fires on first full load). Replace `DOMContentLoaded` with `astro:page-load`.
- Directives: `transition:name="x"`, `transition:animate="fade|slide|none|initial"`, `transition:persist` (or `transition:persist="name"`) to keep an element/island across navigations, `transition:persist-props`. `data-astro-reload` on `<a>` forces full reload. `navigate(url)` from `astro:transitions/client`.
- Script rules: bundled `<script>` (module) runs ONCE per session (never re-executes on later pages); `is:inline` scripts may re-run; `data-astro-rerun` forces re-run. `window` persists, so guard globals.
- Pattern for GSAP/Lenis (idiomatic, composed from the above; not from a doc recipe):

```ts
// src/scripts/motion.ts  (imported once from the layout; module scripts run once)
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
gsap.registerPlugin(ScrollTrigger);

let lenis: Lenis | undefined;
let ctx: gsap.Context | undefined;

function initLenis() {
  if (lenis) return;
  lenis = new Lenis({ anchors: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis!.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}

function initPage() {
  // build per-page animations
  ctx?.revert();
  ctx = gsap.context(() => {
    /* gsap.from(...), SplitText.create(...), ScrollTrigger.create(...) */
  });
  ScrollTrigger.refresh();
}

document.addEventListener('astro:before-swap', () => {
  ctx?.revert();
  ctx = undefined;
}); // cleanup old page
document.addEventListener('astro:after-swap', () =>
  lenis?.scrollTo(0, { immediate: true, force: true }),
);
document.addEventListener('astro:page-load', () => {
  initLenis();
  initPage();
});
```

- Theme flash: set `data-theme` in an `is:inline` script run on first load AND on `astro:after-swap` (docs example). Astro copies `<html>` attributes from the new page on swap, so `data-theme` set only via JS would be lost -> re-apply in `astro:after-swap`. The router restores scroll between the swap and `astro:after-swap`, so anything that changes layout (the `js` class) must be set on `event.newDocument.documentElement` in `astro:before-swap`, or the restored position is off once the layout changes (39px on a phone with Linux fonts).

**Gotchas:** persisted elements keep their DOM so GSAP tweens on them must NOT be reverted in `before-swap`; Draggable instances are killed by `ctx.revert()` only if created inside `gsap.context`. `ScrollTrigger.refresh()` after fonts/images. **Unverified:** interplay of Lenis with the browser's native view-transition snapshot (test visually).
**Source:** guides/view-transitions, reference/modules/astro-transitions (raw docs).

## 6. Fonts

**Facts**

- Astro Fonts API is **stable** since v6 (top-level `fonts` array in config, `<Font />` from `astro:assets`). Downloads + caches fonts at build, self-hosts into `_astro/fonts`, generates optimized fallback metrics (from the LAST entry of `fallbacks`; default `['sans-serif']`; `optimizedFallbacks: false` disables), supports `preload`.
- Providers via `fontProviders.{google,fontsource,bunny,fontshare,adobe,googleicons,npm,local}()` from `astro/config`. Font options: `name`, `cssVariable`, `provider`, `weights` (variable range as string e.g. `"200 800"`), `styles` (default `['normal','italic']`), `subsets` (default `['latin']`), `formats`, `display`, `unicodeRange`, `fallbacks`, `optimizedFallbacks`, `stretch`, `featureSettings`, `variationSettings`, `options`.
- Google provider has `options.experimental.variableAxis` (e.g. `{ slnt: [['-15','0']] }`) and `experimental.glyphs`. **Unverified** that `wdth`/`opsz` are accepted for Bricolage Grotesque through it (type `VariableAxis` not inspected). Uzbek Latin letters oʻ/gʻ use U+02BB/02BC, which are in the Google/Fontsource `latin` subset (confirmed in Fontsource unicode-range).
- Fontsource packages 5.3.0 verified: `@fontsource-variable/bricolage-grotesque/standard.css` = ALL axes (wght 200-800, wdth 75-100%, family name `Bricolage Grotesque Variable`; also `wght.css`, `wdth.css`, `opsz.css`); `@fontsource-variable/newsreader` has `standard.css` + `standard-italic.css` (wght+opsz), `index.css` = wght only; `@fontsource/geist-mono/{400,500,600}.css`; `@fontsource/caveat/{400..700}.css`. All have `latin`, `latin-ext`, etc. subsets with unicode-range (browser downloads only needed ones).

Option A (Astro Fonts API, simple fonts):

```ts
import { defineConfig, fontProviders } from 'astro/config';
fonts: [
  {
    name: 'Geist Mono',
    cssVariable: '--font-mono',
    provider: fontProviders.fontsource(),
    weights: [400, 500],
    styles: ['normal'],
    subsets: ['latin'],
    fallbacks: ['ui-monospace', 'monospace'],
  },
  {
    name: 'Caveat',
    cssVariable: '--font-hand',
    provider: fontProviders.fontsource(),
    weights: [500],
    styles: ['normal'],
    subsets: ['latin'],
    fallbacks: ['cursive'],
  },
  {
    name: 'Newsreader',
    cssVariable: '--font-serif',
    provider: fontProviders.fontsource(),
    weights: ['200 800'],
    styles: ['normal', 'italic'],
    subsets: ['latin'],
    fallbacks: ['Georgia', 'serif'],
  },
];
```

```astro
---
import { Font } from 'astro:assets';
---

<Font cssVariable="--font-serif" preload />
<Font cssVariable="--font-mono" />
```

Option B (**recommended for Bricolage width/opsz axes**, guaranteed axes): Fontsource CSS imports in the global CSS, no Astro Fonts entry:

```css
@import '@fontsource-variable/bricolage-grotesque/standard.css';
@import '@fontsource-variable/newsreader/standard.css';
@import '@fontsource-variable/newsreader/standard-italic.css';
@import '@fontsource/geist-mono/400.css';
@import '@fontsource/caveat/500.css';
@theme inline {
  --font-display: 'Bricolage Grotesque Variable', ui-sans-serif, system-ui, sans-serif;
  --font-serif: 'Newsreader Variable', Georgia, serif;
  --font-mono: 'Geist Mono', ui-monospace, monospace;
  --font-hand: 'Caveat', cursive;
}
/* usage: font-stretch: 85%; font-variation-settings: 'opsz' 48; */
```

Preload manually for the above-the-fold file only (`import url from '@fontsource-variable/bricolage-grotesque/files/bricolage-grotesque-latin-standard-normal.woff2?url'` -> `<link rel="preload" as="font" type="font/woff2" crossorigin>`). Fontsource variable family names end with " Variable". **Unverified:** exact family names for Newsreader/Caveat from the CSS (check `font-family:` line in the css when wiring).

**Gotchas:** Tailwind v4 requires `@theme inline { --font-sans: var(--font-roboto) }` when mapping Astro `cssVariable`s. Clear font cache: `.astro/fonts` (dev), `node_modules/.astro/fonts` (build). Google provider needs network at build. Satori can't use variable axes (default instance only) -> OG images need static fonts (see 10).
**Source:** guides/fonts, reference/font-provider-reference, configuration-reference#fonts, `npm pack @fontsource*`.

## 7. Images

**Facts**

- `import { Image, Picture } from 'astro:assets'`; import local files (`import hero from '../assets/hero.jpg'`) -> ImageMetadata, width/height inferred for files in `src/`.
- Props: `src`, `alt` (required), `width`, `height`, `format`, `quality` (number or `low|mid|high|max`), `densities`, `widths` (+ `sizes`), `priority` (sets `loading=eager decoding=sync fetchpriority=high`), `layout` = `constrained|fixed|full-width|none`, `fit`, `position`. `<Picture>` adds `formats={['avif','webp']}`, `fallbackFormat`, `pictureAttributes`.
- Global defaults: `image: { layout: 'constrained', responsiveStyles: true }` generates srcset/sizes and styles (`responsiveStyles` default false; only applies when layout is set). Default service Sharp, no upscaling.

```astro
---
import { Picture } from 'astro:assets';
import hero from '../assets/hero.jpg';
---

<Picture
  src={hero}
  formats={['avif', 'webp']}
  alt="..."
  widths={[480, 960, 1600]}
  sizes="(min-width:1024px) 960px, 100vw"
  priority
/>
```

**Gotchas:** SVG + `format` set gets rasterised (v6 change); `layout` + `densities` are mutually exclusive; `getImage()` is server-only; remote images need `image.domains/remotePatterns`.
**Source:** reference/modules/astro-assets, guides/images, configuration-reference.

## 8. Env & modes

```ts
import { defineConfig, envField } from 'astro/config';
env: { schema: {
  PUBLIC_SITE_NAME: envField.string({ context: 'client', access: 'public', default: 'Abduroziq' }),
  PUBLIC_PLAUSIBLE_DOMAIN: envField.string({ context: 'client', access: 'public', optional: true }),
} }
// usage: import { PUBLIC_SITE_NAME } from 'astro:env/client';
```

- `client`+`public` vars are bundled client AND server. `client`+`secret` is not allowed. Secrets are validated when anything is imported from `astro:env/server` (pass dummies in CI).
- `.env`, `.env.local`, `.env.[mode]`, `.env.[mode].local` (Vite rules); `astro dev` = mode `development`, `astro build` = `production`, override with `--mode`. `.env` files are NOT loaded inside `astro.config.*` (use `process.env` or Vite `loadEnv`).
- `import.meta.env.{MODE,PROD,DEV,BASE_URL,SITE,SSR}`; `PUBLIC_*` prefix is exposed to client; types for them via `src/env.d.ts` `ImportMetaEnv` interface. Since v6 values are never coerced.
  **Source:** guides/environment-variables, reference/modules/astro-env.

## 9. SEO integrations

```ts
// astro.config.ts
import sitemap from '@astrojs/sitemap';
site: 'https://abduroziq.uz', trailingSlash: 'always',
integrations: [mdx(), sitemap({
  i18n: { defaultLocale: 'en', locales: { en: 'en', uz: 'uz' } },
  filter: (page) => !page.includes('/404') && !page.includes('/drafts/'),
})],
```

- Output `sitemap-index.xml` + `sitemap-0.xml` with `xhtml:link rel=alternate hreflang` entries linking pages that exist in both locales (verified in docs sample). Other options: `customPages`, `serialize(item)`, `changefreq/priority/lastmod` (ignored by Google), `entryLimit`, `xslURL`. Requires `site`.
- `src/pages/robots.txt.ts`:

```ts
import type { APIRoute } from 'astro';
export const GET: APIRoute = ({ site }) =>
  new Response(`User-agent: *\nAllow: /\n\nSitemap: ${new URL('sitemap-index.xml', site).href}\n`);
```

- RSS (`src/pages/rss.xml.ts`, add per-locale feed `src/pages/uz/rss.xml.ts`):

```ts
import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';
export async function GET(context: APIContext) {
  const posts = (
    await getCollection('posts', ({ data }) => !data.draft && data.lang === 'en')
  ).sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
  return rss({
    title: 'Abduroziq',
    description: '...',
    site: context.site!,
    items: posts.map((p) => ({
      title: p.data.title,
      description: p.data.description,
      pubDate: p.data.pubDate,
      link: `/blog/${p.id}/`,
    })),
    customData: '<language>en</language>',
  });
}
```

- Canonical/hreflang: Astro has no built-in head helper. In the layout: `<link rel="canonical" href={new URL(Astro.url.pathname, Astro.site)} />`, `<link rel="alternate" hreflang="en|uz" href=...>` plus `x-default` -> en URL, only when the translation exists (pass `alternates` prop); also `<link rel="sitemap" href="/sitemap-index.xml">`, `<html lang={...}>`, `og:locale`.
  **Gotchas:** `Astro.url` during build reflects `build.format`; use `Astro.site` as base to avoid `localhost`. **Unverified:** `@astrojs/rss` v4.0.19 option list (README not read) beyond `title/description/site/items/customData/stylesheet`.
  **Source:** guides/integrations-guide/sitemap, recipes/rss.

## 10. Static OG images (satori + sharp)

**Facts**

- satori 0.63.2 README: supports **TTF, OTF, WOFF and WOFF2**; **variable fonts render as default instance only** -> ship static weights. Text rendered as `<path>` by default (`embedFont: true`), so the SVG needs no fonts downstream. Satori's own README recommends **sharp** for PNG: `await sharp(Buffer.from(svg)).png().toBuffer()`. sharp already comes with Astro -> no extra native dep. `@resvg/resvg-js` 2.6.2 has no install script (platform binaries are `optionalDependencies`, e.g. `@resvg/resvg-js-win32-x64-msvc`), so it needs no `onlyBuiltDependencies` entry either; only needed if sharp output looks off.
- No React required: pass plain object trees `{ type: 'div', props: { style: {...}, children: [...] } }` (all containers need `display: 'flex'`), or the experimental `@jsxImportSource satori/jsx`.
- Static fonts: `@fontsource/bricolage-grotesque/files/bricolage-grotesque-latin-700-normal.woff` (static packages ship `.woff` and `.woff2`), read via `fs.readFile` from `node_modules` (path resolve with `createRequire`/`import.meta.resolve`) or commit `.woff` into `apps/web/src/assets/og-fonts/`.

```ts
// src/pages/og/[...slug].png.ts
import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection } from 'astro:content';
import satori from 'satori';
import sharp from 'sharp';
import { readFile } from 'node:fs/promises';

const fontBold = await readFile(
  new URL('../../assets/og-fonts/bricolage-700.woff', import.meta.url),
);

export const getStaticPaths: GetStaticPaths = async () =>
  (await getCollection('posts', ({ data }) => !data.draft)).map((p) => ({
    params: { slug: p.id },
    props: { title: p.data.title },
  }));

export const GET: APIRoute = async ({ props }) => {
  const svg = await satori(
    {
      type: 'div',
      props: {
        style: {
          display: 'flex',
          width: '100%',
          height: '100%',
          padding: 64,
          background: '#0b0b0c',
          color: '#fff',
          fontFamily: 'Bricolage',
          fontSize: 64,
        },
        children: props.title,
      },
    },
    {
      width: 1200,
      height: 630,
      fonts: [{ name: 'Bricolage', data: fontBold, weight: 700, style: 'normal' }],
    },
  );
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  return new Response(png, { headers: { 'Content-Type': 'image/png' } });
};
```

**Gotchas**

- Use `new URL('...', import.meta.url)` carefully: in Astro build the endpoint is bundled to `dist/.../chunks`, so relative file reads break. Prefer `path.resolve(process.cwd(), 'src/assets/og-fonts/x.woff')` (cwd = `apps/web` under turbo/pnpm filter) - **safer, use this**.
- Hoist font read to module scope (satori issue #590 perf tip).
- Windows: avoid `file://` URL + `readFile(new URL())` mixing; use `fileURLToPath`/`path.resolve`. pnpm: fontsource files live under `apps/web/node_modules/@fontsource/...` only if listed in `apps/web/package.json`.
- Endpoint filename `og/[...slug].png.ts` yields `/og/<slug>.png`; with `trailingSlash: 'always'` image URLs are exempt (file extensions). Per-locale: include lang in the path.
- Missing glyphs (Uzbek oʻ gʻ U+02BB/02BC) must exist in the OG font file (latin subset includes them; verify visually).
  **Source:** satori README (tarball), resvg package.json, Astro endpoints docs.

## 11. Tailwind CSS 4.3 in Astro

```ts
// astro.config.ts
import tailwindcss from '@tailwindcss/vite';
export default defineConfig({ vite: { plugins: [tailwindcss()] } });
```

```css
/* apps/web/src/styles/global.css  (import once in the layout frontmatter: import '../styles/global.css') */
@import 'tailwindcss';
@source '../../../../packages/ui/src'; /* relative to THIS css file */
@source '../../../../packages/content/posts'; /* MDX class names */
@custom-variant dark (&:where([data-theme=dark], [data-theme=dark] *));

@theme {
  --color-ink: oklch(0.2 0 0);
  --color-paper: oklch(0.98 0.01 90);
  --ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
}
:root {
  --bg: var(--color-paper);
}
[data-theme='dark'] {
  --bg: oklch(0.15 0 0);
}
```

**Facts**

- No `tailwind.config.js`, no `@astrojs/tailwind` (deprecated integration; use the Vite plugin). `@custom-variant dark (&:where([data-theme=dark], [data-theme=dark] *))` is the exact snippet from the Tailwind dark-mode docs.
- `@source "path"` registers extra scan roots (relative to stylesheet); `@source not`, `@source inline("...")` also exist. Automatic detection follows the project root and ignores `.gitignore`d paths.
- `@theme` vars become CSS variables used by utilities; unused ones may be tree-shaken from output (use `@theme static` to always emit). Use `@theme inline` when a token references another variable (e.g. fonts, `var(--font-x)`).
- In `.astro` `<style>` blocks you can use raw `var(--color-ink)` freely (no import needed IF the var is emitted). To use `@apply` / `@variant` / `theme()` there, add `@reference`:

```astro
<style>
  @reference '../styles/global.css'; /* or "tailwindcss" if no customisation */
  .btn {
    @apply rounded-full px-4 py-2 dark:bg-white;
  }
</style>
```

**Gotchas:** every scoped-style block with `@reference` re-processes the stylesheet (build cost); prefer utility classes or plain CSS + vars for animation-heavy components. Prettier tailwind plugin needs `tailwindStylesheet` option pointing to the CSS (v4). Dark attribute must also be set before paint (inline script).
**Source:** tailwindcss.com docs (dark-mode, detecting-classes-in-source-files, functions-and-directives), Astro fonts guide for `@theme inline`.

## 12. GSAP 3.15

**Facts**

- Licensing: gsap.com standard license (effective 2025-04-30, "A Webflow Product"): **all of GSAP including formerly Club plugins (SplitText, MorphSVG, etc.) is free, incl. commercial use.** Restriction: no use in no-code visual animation builders competing with Webflow; no removing notices. npm `license` field points to it. The npm tarball `gsap@3.15.1` contains `SplitText.js`, `Draggable.js`, `InertiaPlugin.js`, `ScrollTrigger.js`, `ScrollSmoother.js`, `Flip.js`, `Observer.js`, `MorphSVGPlugin.js`, `DrawSVGPlugin.js`, etc. (verified by listing) with `.d.ts` in `types/`. Install plain `gsap` (no private registry). Page did not explicitly name ScrollTrigger/Draggable/InertiaPlugin; the tarball + "All of GSAP" statement cover it.
- Imports: `import gsap from 'gsap'; import { ScrollTrigger } from 'gsap/ScrollTrigger'; import { SplitText } from 'gsap/SplitText'; import { Draggable } from 'gsap/Draggable'; import { InertiaPlugin } from 'gsap/InertiaPlugin'; gsap.registerPlugin(ScrollTrigger, SplitText, Draggable, InertiaPlugin);`. `sideEffects:false` -> tree-shakes.
- SplitText (types verified): `SplitText.create(target, vars)` with `type` (required string, e.g. `'lines,words,chars'`), `mask?: 'lines'|'words'|'chars'`, `autoSplit?: boolean` (re-splits on resize/font load), `onSplit?(self)` (return the tween/timeline so it is reverted+re-run on re-split), `onRevert`, `aria?: 'auto'|'hidden'|'none'`, `linesClass/wordsClass/charsClass`, `tag`, `propIndex`, `deepSlice`, `smartWrap`, `specialChars`, `reduceWhiteSpace`, `ignore`, `prepareText`, `wordDelimiter`. Instance: `.lines .words .chars .masks`, `.revert()`, `.split(vars)`, `.kill()` stops autoSplit.

```ts
SplitText.create('.hero-title', {
  type: 'lines,words',
  mask: 'lines',
  autoSplit: true,
  onSplit: (self) =>
    gsap.from(self.lines, { yPercent: 110, duration: 0.9, stagger: 0.08, ease: 'expo.out' }),
});
```

- Draggable throw: `Draggable.create(el, { type: 'x,y', bounds: '.container' /* or {minX,maxX,minY,maxY} or {top,left,width,height} */, inertia: true, edgeResistance: 0.8, onThrowUpdate, onThrowComplete })` - `inertia: true` (or `throwProps`) requires InertiaPlugin registered. `Draggable.create` returns an **array**. `draggable.applyBounds(...)` to update.
- Reduced motion:

```ts
const mm = gsap.matchMedia();
mm.add(
  { reduce: '(prefers-reduced-motion: reduce)', ok: '(prefers-reduced-motion: no-preference)' },
  (c) => {
    const { reduce } = c.conditions!;
    if (reduce) {
      gsap.set('.reveal', { clearProps: 'all' });
      return;
    }
    gsap.from('.reveal', { y: 40, autoAlpha: 0, stagger: 0.1, scrollTrigger: '.reveal' });
    return () => {
      /* optional cleanup */
    };
  },
);
// on navigation: mm.revert()
```

- `gsap.context(fn, scopeEl)`; `ctx.add(fn)`; `ctx.revert()` kills tweens, ScrollTriggers, SplitText and Draggables created inside; `matchMedia` is built on contexts.
  **Gotchas:** SplitText + fonts: with `autoSplit:true` it waits for font loading. Call `ScrollTrigger.refresh()` after layout shifts (view-transition swap). Lenis + ScrollTrigger sync: see 13. `ScrollSmoother` conflicts with Lenis - do not use both.
  **Source:** gsap.com/community/standard-license, `npm pack gsap` (types), npm view.

## 13. Lenis 1.3

```ts
import Lenis from 'lenis';
import 'lenis/dist/lenis.css'; // recommended CSS (export `./dist/*` verified)
const lenis = new Lenis({ anchors: true, lerp: 0.1 /* or duration: 1.2 */, smoothWheel: true });
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((time) => lenis.raf(time * 1000));
gsap.ticker.lagSmoothing(0);
```

**Facts (README + d.ts 1.3.27)**

- Options: `wrapper`, `content`, `eventsTarget`, `lerp` (0.1), `duration` (1.2, ignored when lerp set), `easing`, `orientation`, `gestureOrientation`, `smoothWheel`, `syncTouch`, `syncTouchLerp`, `touchMultiplier`, `wheelMultiplier`, `infinite`, `autoResize` (true), `autoRaf` (false; set true ONLY if you are not driving it from gsap.ticker), `anchors: boolean | ScrollToOptions`, `allowNestedScroll`, `autoToggle`, `overscroll`, `prevent(node)`, `stopInertiaOnNavigate`, `respectReducedMotion` (default true: lerp forced to 1, `scrollTo` becomes instant; `lenis.prefersReducedMotion` readable).
- API: `lenis.stop()`, `lenis.start()` (e.g. while a modal is open), `lenis.scrollTo(target|y, { offset, duration, immediate, force, lock, onComplete })`, `lenis.on('scroll', cb)`, `lenis.resize()`, `lenis.destroy()`, `lenis.scroll`, `lenis.velocity`, `lenis.progress`.
- Opt-out attributes on elements: `data-lenis-prevent` (all), `-wheel`, `-touch`, `-vertical`, `-horizontal`; also `data-lenis-prevent` on modals/overlays and `<textarea>`/scrollable code blocks (`pre`).
- CSS file adds `html.lenis{height:auto}`, `.lenis-stopped{overflow:clip}`, iframe `pointer-events:none` while smooth. Subpath exports: `lenis`, `lenis/react`, `lenis/snap`, `lenis/vue`; css at `lenis/dist/lenis.css`.
- With `<ClientRouter />`: create one instance (module script runs once) and reuse; on navigation `lenis.scrollTo(0,{immediate:true,force:true})` in `astro:after-swap`; only `lenis.destroy()` + `gsap.ticker.remove(fn)` if you tear down fully (e.g. HMR). Keep the ticker callback reference to be able to remove it.
  **Gotchas:** nested scroll containers need `data-lenis-prevent`; `position: fixed` jitter on old Safari; native `scroll-snap` unsupported (use `lenis/snap`); smooth scroll hides native "find in page"/hash-jump unless `anchors:true`.
  **Source:** `npm pack lenis@1.3.27` README/d.ts/css.

## 14. pnpm 10 + Turborepo 2.11

```yaml
# pnpm-workspace.yaml
packages:
  - apps/*
  - packages/*
onlyBuiltDependencies: # pnpm 10.x setting, lives in pnpm-workspace.yaml (supported since 10.5)
  - sharp
  - esbuild
  - '@parcel/watcher' # only if prompted
```

- **pnpm 10.32 = `onlyBuiltDependencies`** (allow-list of packages allowed to run install scripts; others are skipped, `pnpm approve-builds` interactive helper). In pnpm 11+ it is replaced by `allowBuilds: { esbuild: true }` (docs say `onlyBuiltDependencies` removed in v11). `@resvg/resvg-js` has no install script -> no entry needed; `sharp` 0.35 uses prebuilt optional binaries (entry harmless); esbuild/workerd (wrangler) do have postinstalls -> add `esbuild`, `workerd`, `sharp`. **Unverified:** the exact list pnpm will complain about; run `pnpm install` once and add what `pnpm approve-builds` lists.
- Root `package.json`: `"packageManager": "pnpm@10.32.1"` (use the exact version installed: `pnpm -v`), `"engines": { "node": ">=22.23.4" }`, `"private": true`.

```jsonc
// turbo.json
{
  "$schema": "https://turborepo.dev/schema.json",
  "ui": "stream",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "inputs": ["$TURBO_DEFAULT$", ".env*"],
      "outputs": ["dist/**", ".astro/**"],
    },
    "dev": { "cache": false, "persistent": true },
    "check": { "dependsOn": ["^build"], "outputs": [] },
    "lint": { "outputs": [] },
    "typecheck": { "dependsOn": ["^build"], "outputs": [] },
    "format:check": { "outputs": [] },
  },
}
```

- `tasks` (not `pipeline`). `envMode` default `strict`: env vars not declared in `env`/`globalEnv`/`passThroughEnv` are NOT visible to tasks -> declare `PUBLIC_*` and `CLOUDFLARE_*` in `globalEnv` or per-task `env`, else Astro builds without them (and caching ignores changes). Keys: `dependsOn`, `inputs`, `outputs`, `cache`, `persistent`, `env`, `passThroughEnv`, `outputLogs`, `interruptible`, `with`.
- Root scripts: `"dev": "turbo run dev"`, `"build": "turbo run build"`, `"lint": "turbo run lint"`, `"typecheck": "turbo run typecheck"`, `"check": "turbo run check"`, `"format": "prettier --write ."`. Workspace internal deps: `"@repo/content": "workspace:*"`.
  **Gotchas:** `outputs` for Astro is `dist/**` (and `.astro/**` optional). Content in `packages/content` changes must invalidate the web build: add it as a workspace dependency of `apps/web` or add `"inputs": ["$TURBO_DEFAULT$", "../../packages/content/**"]`.
  **Source:** pnpm.io docs (settings/build), turborepo docs (configuration.mdx), npm view.

## 15. Lint / format

```js
// eslint.config.mjs (root)  - ESLint 10 flat config
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import astro from 'eslint-plugin-astro';
export default [
  { ignores: ['**/dist/**', '**/.astro/**', '**/node_modules/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...astro.configs.recommended,
];
```

```jsonc
// .prettierrc
{
  "plugins": ["prettier-plugin-astro", "prettier-plugin-tailwindcss"],
  "overrides": [{ "files": "*.astro", "options": { "parser": "astro" } }],
  "tailwindStylesheet": "./apps/web/src/styles/global.css",
  "singleQuote": true,
  "semi": true,
}
```

- Versions: eslint 10.15.0, typescript-eslint 8.73.0 (supports eslint 10; typescript peer `>=4.8.4 <6.1.0` -> TS 6.0.x), eslint-plugin-astro 3.2.1 (needs eslint>=10, node ^22.22.3/^24.16/>=26.3; uses `astro-eslint-parser` 3.2.0; optional peers typescript-eslint, `eslint-plugin-jsx-a11y` for `astro.configs['jsx-a11y-recommended']`), `@eslint/js` (match eslint 10 major), prettier 3.10.1, prettier-plugin-astro 1.1.2 (node>=22.12), prettier-plugin-tailwindcss 0.8.1 (**must be last** in `plugins`).
  **Gotchas:** plugin docs show `configs.recommended` spread; config names `base | recommended | all | jsx-a11y-*`. **Unverified:** whether `@eslint/js` version tracks eslint 10 (`npm view @eslint/js version` before pinning). `@astrojs/check` and ESLint complement each other (types vs rules).
  **Source:** npm view, eslint-plugin-astro README (unpkg 3.2.1).

## 16. Cloudflare hosting of static `dist/`

**Facts**

- Recommendation: **Workers with static assets** (`wrangler deploy`), not Pages. Cloudflare's migration guide positions Workers as having "a distinctly broader set of features"; no official Pages deprecation found (third-party sources call Pages "maintenance mode" - **Unverified**, treat as direction of travel). Workers static asset requests are free.
- `_headers` and `_redirects` are natively supported in the asset directory (copy from `apps/web/public/`). `_headers` limits: 100 rules, 2000 chars/line, splat `*` and `:placeholder`, `! Header` removes. Headers do not apply to Worker-generated responses.
- 404: must be explicit: `assets.not_found_handling: "404-page"` serves the nearest `404.html` with status 404 (Astro `src/pages/404.astro` -> `dist/404.html`). `html_handling` default `auto-trailing-slash` (files without slash, folder indexes with slash) - matches Astro `trailingSlash:'always'` + directory format.
- Custom domain for apex: zone must be active on Cloudflare (nameservers at Cloudflare; no CNAME may already exist on the hostname). In `wrangler.jsonc` add `routes: [{ "pattern": "abduroziq.uz", "custom_domain": true }, { "pattern": "www.abduroziq.uz", "custom_domain": true }]`; deploy creates DNS record + cert automatically. Redirect `www` -> apex via `_redirects` (`https://www.abduroziq.uz/* https://abduroziq.uz/:splat 301`) - **Unverified** that `_redirects` can match on host (docs say absolute URLs allowed in `_headers`; check Redirects page) otherwise use a Redirect Rule in the dashboard. **Unverified:** whether the `.uz` registrar allows delegating to Cloudflare nameservers (required for the apex custom domain).

```jsonc
// wrangler.jsonc (repo root or apps/web)
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "abduroziq-uz",
  "compatibility_date": "2026-11-12",
  "assets": {
    "directory": "./apps/web/dist",
    "not_found_handling": "404-page",
    "html_handling": "auto-trailing-slash",
  },
  "routes": [{ "pattern": "abduroziq.uz", "custom_domain": true }],
}
```

```yaml
- name: Deploy
  uses: cloudflare/wrangler-action@v4
  with:
    apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
    accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
    command: deploy # default; wrangler-action 4.1.3; also supports workingDirectory, wranglerVersion, environment, preCommands/postCommands, secrets
```

- Token: dashboard -> Account API tokens -> Create token -> custom "Edit Cloudflare Workers" permission, scoped to the one account (and the zone if routes/custom domains are managed). Secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`. If you choose Pages instead: `command: pages deploy apps/web/dist --project-name=abduroziq-uz` (token needs "Cloudflare Pages: Edit"), custom domains there work via CNAME even outside Cloudflare DNS.
  **Gotchas:** deploying assets-only needs no `main`. Build must run before deploy (`needs`/same job). Preview deploys: `wrangler versions upload`. Add `X-Robots-Tag: noindex` on `*.workers.dev` via `_headers` (docs example) to avoid duplicate indexing.
  **Source:** developers.cloudflare.com (static-assets migrate-from-pages, routing/static-site-generation, headers, custom-domains, ci-cd/external-cicd/github-actions), cloudflare/wrangler-action README.

## 17. GitHub Actions

```yaml
name: CI
on: { push: { branches: [main] }, pull_request: {} }
jobs:
  build:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v7
      - uses: pnpm/action-setup@v6 # reads version from package.json "packageManager"
      - uses: actions/setup-node@v7
        with: { node-version: 24, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - uses: actions/cache@v6 # local turbo cache (no remote cache)
        with:
          path: .turbo
          key: turbo-${{ runner.os }}-${{ github.sha }}
          restore-keys: turbo-${{ runner.os }}-
      - run: pnpm turbo run lint typecheck check build
      - uses: actions/upload-artifact@v7
        with: { name: dist, path: apps/web/dist }
```

- Turborepo's own GH Actions page still shows `checkout@v4`/`setup-node@v4` (stale); use the majors in the pinned table. Turbo caches to `./.turbo/cache` by default (`cacheDir` option).
- Lighthouse CI: either `treosh/lighthouse-ci-action@v12` (`urls`, `configPath: ./lighthouserc.json`, `budgetPath`, `uploadArtifacts: true`, `temporaryPublicStorage: true`) or `pnpm dlx @lhci/cli@0.16.1 autorun` with `.lighthouserc.json` `{ "ci": { "collect": { "staticDistDir": "./apps/web/dist", "numberOfRuns": 3 }, "assert": { "preset": "lighthouse:recommended" } } }`. Run it after build in the same workflow (needs Chrome, preinstalled on ubuntu-latest). `@lhci/cli` needs node >=22.19.
- Deploy job: `needs: build`, `if: github.ref == 'refs/heads/main'`, `permissions: { contents: read }`, then wrangler-action step from section 16 (download artifact or rebuild).
  **Source:** GitHub releases API (latest tags), turborepo GH Actions doc, treosh/lighthouse-ci-action README.

---

## Open risks

1. **TypeScript 7.0.2 is `latest` on npm** but `@astrojs/check` (`^5||^6`) and typescript-eslint (`<6.1.0`) reject it: a careless `pnpm add -D typescript` will install 7 and break check/lint. Pin `typescript@~6.0.3` in root devDependencies and add `pnpm.overrides`/`overrides: { typescript: ~6.0.3 }` in `pnpm-workspace.yaml` if needed.
2. **Sätteri is the default markdown processor**: any "add rehype plugin" habit from Astro 5 silently needs `@astrojs/markdown-remark` + `processor: unified()`. Decide once (plan: stay on Sätteri, no rehype ecosystem plugins).
3. **Content outside the app root** (`packages/content`) + `image()` and Tailwind scanning + Vite fs access: unverified; smoke test in the first task.
4. **Node 24.14 locally** < eslint-plugin-astro's `^24.16.0` engine range (warning, may work). Upgrade Node to latest 24.x LTS.
5. **pnpm 12 is `latest`**; devs/CI must stay on 10.32 via `packageManager` (corepack) or `onlyBuiltDependencies` will be rejected in v11+ (`allowBuilds`).
6. **Turbo strict env mode** drops undeclared env vars (PUBLIC_*), causing silent prod/dev differences.
7. **Fontsource variable axes via Astro Fonts API** unverified; prefer direct Fontsource CSS (option B) for Bricolage `wdth`/`opsz`.
8. **Cloudflare**: `.uz` NS delegation to Cloudflare, `_redirects` host matching for www->apex, and Pages "maintenance mode" claims are unverified; workers.dev duplicate-indexing needs `X-Robots-Tag`.
9. **Uzbek glyphs** (oʻ gʻ, U+02BB/02BC) must be verified in every font (display, serif, mono, hand, OG static fonts).
10. **GSAP license** may be amended by Webflow at any time; pin version, record license date (2025-04-30).
11. `compressHTML: 'jsx'` default strips spaces between inline elements - audit templates.
12. `fallback` i18n option intentionally unused to avoid duplicate-content pages.

## Recommended dependency list

**Workspace root** (`package.json` devDependencies; `packageManager: pnpm@10.32.x`):
`turbo@2.11.11`, `typescript@~6.0.3`, `eslint@10.15.0`, `@eslint/js@^10` (verify), `typescript-eslint@8.73.0`, `eslint-plugin-astro@3.2.1`, `prettier@3.10.1`, `prettier-plugin-astro@1.1.2`, `prettier-plugin-tailwindcss@0.8.1`, `@lhci/cli@0.16.1` (optional), `wrangler@4.161.0`.

**apps/web** dependencies:
`astro@7.4.11`, `@astrojs/mdx@8.1.5`, `@astrojs/sitemap@3.7.4`, `@astrojs/rss@4.0.19`, `tailwindcss@4.3.5`, `@tailwindcss/vite@4.3.5`, `gsap@3.15.1`, `lenis@1.3.27`, `satori@0.63.2`, `sharp@0.35.5` (declare explicitly so it resolves from `apps/web`), `reading-time@1.5.0`, `@fontsource-variable/bricolage-grotesque@5.3.0`, `@fontsource-variable/newsreader@5.3.0`, `@fontsource/geist-mono@5.3.0`, `@fontsource/caveat@5.3.0`, `@repo/content@workspace:*` (if the content package exports anything).
devDependencies: `@astrojs/check@0.9.12`, `typescript@~6.0.3`, `@types/node@^24` (not 26; match Node 24), optional `@resvg/resvg-js@2.6.2`, `satteri@0.11.7` (only if mdast plugin), `@astrojs/markdown-remark@7.3.8` (only if `unified()`).

---

## Verified during scaffold (2026-11-12)

Settles the items marked Unverified above that the scaffold touched. Everything below was run on Node 24.14, pnpm 10.32.1, astro 7.4.11.

- **Content outside the app root + `image()` (section 3): works.** `glob({ base: '../../packages/content/posts', pattern: '**/*.mdx' })` loads the posts (ids `en/hello-world`, `uz/salom-dunyo`). A `cover: ../../assets/portrait.jpg` (relative to the post file, resolving into `packages/content/assets/`) becomes `ImageMetadata`; `<Image>` renders through the pipeline in dev (`/_image/?href=/@fs/D:/.../packages/content/assets/portrait.jpg...`, HTTP 200 `image/webp`) and in the build (hashed `/_astro/portrait.*.webp` plus srcset). No `vite.server.fs.allow` change and no symlink needed: Vite already allows the pnpm workspace root.
- **Workspace package as TypeScript source:** `@abduroziq/content` exports `./src/index.ts` (no build step). Astro/Vite compile it directly, including `import x from '../i18n/en/common.json'`; no `vite.ssr.noExternal` needed. `astro check` is clean with `"extends": ["@abduroziq/config/tsconfig.base.json", "astro/tsconfigs/strictest"]` (array `extends` works in TS 6).
- **Tailwind `@source` (section 11):** `@source '../../../../packages/content';` in `apps/web/src/styles/global.css` (path relative to the CSS file) is accepted without error. Not exercised for real yet because no Tailwind class lives in `packages/content` today.
- **Fontsource family names (section 6), exactly as emitted in the built CSS:** `Bricolage Grotesque Variable` (weight `200 800`, `font-stretch: 75% 100%`, all axes from `standard.css`), `Newsreader Variable` (roman and italic, weight `200 800`, from `standard.css` / `standard-italic.css`), `Geist Mono` (400 and 500, static), `Caveat` (500, static). Static OG packages `@fontsource/bricolage-grotesque` and `@fontsource/newsreader` use the plain names `Bricolage Grotesque` / `Newsreader`. The `latin` subset of all four declares `U+2BB-2BC` in its `unicode-range`, so the Uzbek oʻ gʻ letters are covered (glyph shapes still to be checked visually). Vite inlines the tiny Geist Mono subsets as base64 `data:` URLs (default `assetsInlineLimit`); not a problem, but they will not show up as files in `_astro/`.
- **Rest-parameter locale routing with the `i18n` config (section 2): works.** `src/pages/[...locale]/index.astro`, `[...locale]/blog/index.astro`, `[...locale]/blog/[slug].astro`, `[...locale]/blog/tag/[tag].astro` and `[...locale]/rss.xml.ts`, each with `getStaticPaths` returning `{ params: { locale: undefined } }` (en, no prefix) and `{ params: { locale: 'uz' } }`, build to `/index.html`, `/uz/index.html`, `/blog/...`, `/uz/blog/...`, `/rss.xml`, `/uz/rss.xml` next to a top-level `404.astro` and `robots.txt.ts`. In dev an unlisted path such as `/uz/blog/hello-world/` returns 404 with a router warning, which is expected.
- **`loadEnv` in `astro.config.ts` (section 8):** `astro/config` does not export `loadEnv`; `import { loadEnv } from 'vite'` needs `vite` as a direct devDependency of `apps/web` (added: `vite@^8.3.6`, resolves to the same 8.3.8 Astro uses). Mode is derived from `process.argv` (`astro dev` -> `development`, anything else -> `production`, `--mode` honoured). Shell variables beat the `.env` files, and Turborepo forwards them because of `globalEnv`.
- **Dev-only routes:** an inline integration calling `injectRoute({ pattern, entrypoint })` for each `.astro` file under `src/dev-pages/` when `command === 'dev'` works; the routes are absent from `astro build` output. Absolute filesystem paths are accepted as `entrypoint`.
- **`@eslint/js`:** the latest 10.x is `10.0.1` (peer `eslint ^10`), used with `eslint@10.15.0` without warnings. `eslint-plugin-astro` 3.2.1 lints `.astro` files fine on Node 24.14.
- **`onlyBuiltDependencies` actually needed:** only `esbuild` and `workerd` (the latter via `wrangler`). `sharp` 0.35.5 has no install script and pnpm lists nothing under `pnpm approve-builds`.
- **Not verified:** `sitemap` hreflang links for translated posts at different slugs (the integration pairs `/blog/x/` with `/uz/blog/x/` only; a `serialize` hook would be needed), `@astrojs/rss` options beyond the ones used, Lenis with the ClientRouter swap (no Lenis wired yet).
- **Gotcha:** `prettier --write .` rewrites Markdown tables and embedded code in `docs/`; `docs`, `CLAUDE.md` and `LICENSE` are listed in `.prettierignore` for that reason.

## Verified during the hero rebuild (2026-11-13)

- **Fitting the giant name without JavaScript:** the letter widths in `GiantName.astro` are read from the variable font with fontTools (`instancer.instantiateVariableFont(font, {wght, wdth: 100, opsz: 96})`, then `hmtx` advances and `BoundsPen` side bearings). That reproduces the table that was measured in Chromium for weight 500 to within 0.001em, so a new weight needs no browser. Canvas `measureText` is **not** usable for this: its bounding boxes differ from the DOM's at the pinned optical size.
- **Rendering in an embedded or background view:** a view can report `document.visibilityState === 'visible'` and still deliver no animation frames. Then `requestAnimationFrame`, `ResizeObserver` callbacks, CSS transitions and `document.startViewTransition` (so the ClientRouter's swap) all stand still until something forces a frame. Anything that hides content before animating it needs a timer-based way out; the canvas of the hero draws its first frame synchronously for the same reason.
- **Tailwind class names:** `ring` is a Tailwind utility (a box-shadow outline). A component class with that name, even in an `is:global` style block, gets the utility's styles too. Check a new component class name against Tailwind's utilities.
- **Optical size and measures in em:** with `font-optical-sizing: auto` Bricolage Grotesque gets wider as it gets smaller (the same line was 17.0em at 76px and 17.2em at 67px), so a measure in em does not hold a line count across sizes. Pinning the optical size (`font-optical-sizing: none; font-variation-settings: 'opsz' 96`) makes a line the same number of em wide at every size; the hero statement and the giant name rely on that.
