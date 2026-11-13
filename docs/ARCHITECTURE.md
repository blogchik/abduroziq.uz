# Architecture

How the repository is organised and the contracts between its parts. Visual and motion
decisions live in [DESIGN.md](DESIGN.md); verified library APIs for the pinned versions
live in [STACK-NOTES.md](STACK-NOTES.md). When this file and STACK-NOTES disagree about an
API detail, STACK-NOTES wins and this file gets corrected.

## 1. Stack

| Concern | Choice |
|---|---|
| Site | Astro 7 (static output), MDX |
| Styling | Tailwind CSS 4 (tokens in `@theme`) plus scoped component CSS |
| Motion | GSAP 3.15 (ScrollTrigger, SplitText, Draggable, InertiaPlugin), Lenis |
| Language | TypeScript, strict |
| Workspace | pnpm workspaces + Turborepo |
| Hosting | Cloudflare (static assets), deployed from GitHub Actions |
| Node | 24 (see `.nvmrc`) |

The site is fully static: no server, no database, no runtime secrets.

## 2. Repository layout

```
abduroziq.uz/
├─ apps/
│  └─ web/                       @abduroziq/web: the Astro site
│     ├─ astro.config.ts
│     ├─ .env.development, .env.production   public values only (section 3)
│     ├─ public/                 static files copied as is (favicons, _headers)
│     └─ src/
│        ├─ pages/               routes, one file per route for both locales ([...locale]/ folder)
│        ├─ dev-pages/           development-only routes (styleguide, lab); never built
│        ├─ layouts/             BaseLayout.astro
│        ├─ components/
│        │  ├─ ui/               design-system primitives
│        │  ├─ chrome/           Header, Footer, ThemeToggle, LangSwitch, SkipLink
│        │  ├─ home/             hero (statement, meeting), about, desk, building, writing
│        │  ├─ blog/             index and article pieces, MDX components
│        │  └─ seo/              Seo.astro, JsonLd.astro
│        ├─ motion/              client motion kit (cursor, reveal, marquee, desk, scroll, transitions)
│        ├─ styles/              global.css (tokens), fonts, prose.css
│        ├─ i18n/                locale config, t(), path helpers
│        ├─ lib/                 posts.ts, dates.ts, seo/, markdown/
│        └─ content.config.ts    content collections
├─ packages/
│  ├─ content/                   @abduroziq/content: everything that is words or data
│  │  ├─ posts/en/*.mdx          English posts
│  │  ├─ posts/uz/*.mdx          Uzbek posts
│  │  ├─ assets/                 portrait and post images
│  │  ├─ i18n/<locale>/*.json    UI strings by namespace
│  │  └─ src/                    types.ts, site.ts (profile), projects.ts, index.ts
│  └─ config/                    @abduroziq/config: shared tsconfig, ESLint, Prettier
├─ docs/                         DESIGN.md, ARCHITECTURE.md, STACK-NOTES.md
├─ .github/workflows/            ci.yml, deploy.yml
├─ turbo.json, pnpm-workspace.yaml, package.json
└─ LICENSE, README.md, CLAUDE.md
```

Writing a post touches only `packages/content/posts/`. Changing copy touches only
`packages/content/`. Changing how things look or move touches only `apps/web/`.

## 3. Branches and environments

| Branch | Environment | What happens on push |
|---|---|---|
| `dev` | local development | CI: lint, typecheck, build. No deploy. |
| `main` | production (`https://abduroziq.uz`) | CI, then deploy. Only updated by merging `dev`. |

Environment values are plain files committed to the repo, because nothing in them is
secret: `apps/web/.env.development` and `apps/web/.env.production`.

| Variable | Development | Production | Meaning |
|---|---|---|---|
| `PUBLIC_SITE_URL` | `http://localhost:4321` | `https://abduroziq.uz` | canonical origin |
| `PUBLIC_ALLOW_INDEXING` | `false` | `true` | `false` adds `noindex` and a disallow-all robots.txt |
| `PUBLIC_ANALYTICS_TOKEN` | empty | empty until provided | Cloudflare Web Analytics token; empty means no script |
| `PUBLIC_GOOGLE_SITE_VERIFICATION`, `PUBLIC_YANDEX_VERIFICATION`, `PUBLIC_BING_SITE_VERIFICATION` | empty | empty until provided | search engine ownership codes; a non-empty value is output as a meta tag |

The variables are declared in the `astro:env` schema in `astro.config.ts` (read them with
`import { PUBLIC_SITE_URL } from 'astro:env/client'`); the config itself loads the `.env`
files with Vite's `loadEnv` to set `site`. A variable set in the shell wins over the files
(`PUBLIC_ALLOW_INDEXING=false pnpm build`); Turborepo passes all of them through (`globalEnv`).
Only the exact string `true` enables indexing.

Drafts (`draft: true`) are rendered in development and excluded from production builds.
Deploy credentials exist only as GitHub Actions secrets (`CLOUDFLARE_API_TOKEN`,
`CLOUDFLARE_ACCOUNT_ID`).

## 4. Routing and languages

- Locales: `en` (default, no prefix) and `uz` (prefix `/uz`).
- Each route is a single page file that renders both locales through an optional rest
  parameter: `src/pages/[...locale]/index.astro`, `[...locale]/blog/index.astro`,
  `[...locale]/blog/[slug].astro`, `[...locale]/blog/tag/[tag].astro`,
  `[...locale]/rss.xml.ts`. `getStaticPaths` returns `locale: undefined` for `en` (no
  prefix) and `locale: 'uz'`; use `localeParam(locale)` and `resolveLocale(Astro.params.locale)`.
  This works with Astro's `i18n` config (verified). `404.astro` and `robots.txt.ts` sit
  directly in `pages/` because they exist once. Never duplicate page markup per language.

| Route (en) | Route (uz) | Page |
|---|---|---|
| `/` | `/uz/` | home |
| `/blog/` | `/uz/blog/` | blog index |
| `/blog/tag/<tag>/` | `/uz/blog/tag/<tag>/` | tag page |
| `/blog/<slug>/` | `/uz/blog/<slug>/` | post (only in the language it is written in) |
| `/rss.xml` | `/uz/rss.xml` | feed |
| `/og/...png` | | generated Open Graph images |
| `/robots.txt`, `/sitemap-index.xml`, `/404` | | |
| `/styleguide/`, `/lab/*` | | development only, never built for production |

The development-only routes are `.astro` files under `src/dev-pages/` (`styleguide.astro`
-> `/styleguide/`, `lab/motion.astro` -> `/lab/motion/`). An inline integration in
`astro.config.ts` injects them only when the command is `dev` (new files need a dev server
restart), and the sitemap filter excludes the same paths.

URLs end with a trailing slash. A post exists at one URL, in its own language. The blog
index of a locale lists that locale's posts first-class and also lists posts that exist
only in the other language, marked with a language badge and linking to their own URL.

### i18n contract (`apps/web/src/i18n/index.ts`)

```ts
export const locales = ['en', 'uz'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'en';

export function resolveLocale(param: string | undefined): Locale;
export function localePath(locale: Locale, path: string): string;   // '/blog/' -> '/uz/blog/'
export function alternates(path: string): { locale: Locale; href: string }[]; // absolute URLs
export function t(locale: Locale, key: string, vars?: Record<string, string | number>): string;
```

Extra helpers in the same module: `locales`, `localeParam(locale)` (route parameter for
`[...locale]`: `undefined` for `en`), `stripLocale(path)`, `localeFromPath(path)`.
`localePath` adds a trailing slash unless the path has a file extension (`/rss.xml`).
`{name}` placeholders in strings are filled from `vars`.

`t()` reads `packages/content/i18n/<locale>/<namespace>.json`; the key is
`namespace.dot.path`, for example `t(locale, 'common.nav.writing')`. A missing key throws
in development and falls back to English in production.

Namespaces: `common` (header, footer, accessibility labels), `home`, `blog`, `seo`.

## 5. Content

### 5.1 Posts (`packages/content/posts/<locale>/<slug>.mdx`)

```yaml
---
title: "…"            # required
description: "…"      # required, 70 to 160 characters, used for meta description
date: 2026-11-12      # required, publication date
updated: 2026-11-20   # optional
tags: [design, astro] # lowercase kebab-case
draft: false          # default false
cover: ../../assets/posts/<slug>/cover.jpg   # optional, relative to the post file
coverAlt: "…"         # optional alt text for the cover; empty means decorative
translationKey: "…"   # optional; the same value on the en and uz versions links them
---
```

The locale comes from the folder, the slug from the file name.

### Posts contract (`apps/web/src/lib/posts.ts`)

```ts
export interface PostSummary {
  id: string; slug: string; locale: Locale; url: string;        // url is locale-correct and absolute-path
  title: string; description: string; date: Date; updated?: Date;
  tags: string[]; readingMinutes: number; translationKey?: string;
}
export function getPosts(locale: Locale, opts?: { includeOtherLocale?: boolean }): Promise<PostSummary[]>; // newest first, drafts excluded in production
export function getAllTags(locale: Locale): Promise<{ tag: string; count: number }[]>;
export function getAdjacentPosts(post: PostSummary): Promise<{ prev?: PostSummary; next?: PostSummary }>;
```

`getAdjacentPosts` works within the post's own locale: `prev` is the next older post,
`next` the next newer one. Extra exports: `getPostEntries()` (collection entries, drafts
excluded in production), `toPostSummary(entry)`, `parsePostId(id)`,
`getTranslations(post)` (the same post in the other locale, via `translationKey`) and
`readingMinutes(body)`. `includeOtherLocale` adds posts of the other locale that have no
translation in the requested locale.

### 5.2 Site data (`packages/content/src`)

```ts
export type Locale = 'en' | 'uz';
export type Localized<T = string> = Record<Locale, T>;

// One piece of the hero statement. Joined in order, the `value`s read as the plain sentence.
export type SentencePart =
  | { kind: 'text'; value: string; ring?: boolean }      // words; `ring` circles them by hand
  | { kind: 'chip'; id: 'eyes' | 'design' | 'build' }    // a living drawing set on the line
  | { kind: 'star'; value: string };                     // a letter drawn as the starburst

export interface Profile {
  name: string;                 // "Abduroziq"
  fullName: string;             // "Jabborov Abduroziq"
  email: string;
  role: Localized;
  tagline: string;              // "Think beyond limits."
  location: { city: Localized; country: Localized; lat: number; lon: number; timeZone: string };
  sentence: Localized<SentencePart[]>;
  support: Localized;
  about: Localized<{ text: string; strong?: boolean }[][]>;   // paragraphs of spans
  facts: { id: string; label: Localized; value: Localized }[];
  agentTag: string;             // "AI agent": the name tag of the second cursor in the hero
  desk: { stickyNote: string; polaroidCaption: string; pialaNote: Localized };
  socials: { id: 'github' | 'telegram' | 'linkedin' | 'instagram'; label: string; handle: string; href: string }[];
}

export interface Project {
  id: string; name: string; year: string;
  description: Localized; role: Localized;
  status: 'live' | 'design' | 'planned';
  url?: string;
  colors: [background: string, foreground: string];
  glyph: string;                // one or two characters drawn on the ticket preview
}
```

`@abduroziq/content` exports `profile`, `projects` and the types. Only information that
is already public may go in here.

The statement is written as parts so that the page can set living things inside it and
still output a plain sentence as the text of its `h1`. Spaces live in the text parts: a
chip stays on one line with whatever touches it without a space (`'designs'`, chip,
`' interfaces'` keeps the chip with the verb; `'engineerman: '`, chip, `'interfeys'` keeps
it with the noun). `apps/web/src/components/home/Statement.astro` renders the parts.

## 6. Layout and SEO contracts

### BaseLayout (`apps/web/src/layouts/BaseLayout.astro`)

```ts
interface Props {
  locale: Locale;
  path: string;                 // locale-agnostic path, e.g. '/blog/'
  title: string;
  description: string;
  seo?: Partial<SeoProps>;
  mainClass?: string;
  flush?: boolean;              // the footer sits flush against the page (no top margin)
}
```

It renders `<html lang>`, the head (font preloads, Seo, the root-state script,
`<ClientRouter />`), the skip link, Header, `<main id="main">`, Footer and the motion entry
script. Fonts are declared in `styles/fonts.css`: Bricolage Grotesque and Geist Mono from
their Fontsource packages; Newsreader, Caveat and Geist Pixel as static cuts in
`src/assets/fonts/` (built by `scripts/build-fonts.py`; Geist Pixel comes from the `geist`
package). Preloaded: Bricolage and the mono labels everywhere, the pixel face on the home
page only, the serif on post pages only.

The language switch in the Header keeps the current path, unless `seo.alternates` is given
(translated posts live at different paths); a locale without an equivalent page links to
that locale's home page.

### Seo (`apps/web/src/components/seo/Seo.astro`)

```ts
interface SeoProps {
  locale: Locale; path: string; title: string; description: string;
  type?: 'website' | 'article';
  image?: string;                               // defaults to the generated OG image of the page (chosen from `path`)
  imageAlt?: string;                            // alt of the OG image; defaults to the title
  article?: { publishedTime: Date; modifiedTime?: Date; tags: string[] };
  alternateLocales?: Locale[];                  // defaults to all locales; a post passes only its own unless translated
  alternates?: { locale: Locale; href: string }[]; // explicit alternate URLs (translated posts); wins over alternateLocales
  noindex?: boolean;                            // page-level: emits `noindex, follow`
  canonical?: boolean;                          // `false` omits canonical, og:url and hreflang (the 404 page)
  jsonLd?: object | object[];
}
```

Outputs: title (site suffix from `seo.site.titleTemplate`, none on the home page), description,
canonical, hreflang alternates plus `x-default`, robots, Open Graph (with image size and alt),
article tags, Twitter card, theme-color, author, RSS and sitemap links, favicons and manifest
links, optional verification metas and JSON-LD through `JsonLd.astro` (`@context` added,
output escaped). `Analytics.astro` renders the Cloudflare beacon in production builds only.
Schema helpers live in `apps/web/src/lib/seo/`: `personSchema`, `websiteSchema`,
`profilePageSchema`, `blogSchema`, `collectionPageSchema`, `blogPostingSchema`,
`breadcrumbSchema`, `countWords`, plus `ogImageUrl` (`og.ts`) and the title helpers
(`meta.ts`). Open Graph PNGs are rendered by `pages/og/[...slug].png.ts`; the sitemap setup
(`serialize` and `filter`) is `lib/seo/sitemap.ts`. See [SEO.md](SEO.md).

SEO requirements: one `h1` per page; unique title and description per URL; canonical
always absolute; `lastmod` in the sitemap from `updated ?? date`; every post has a
generated 1200×630 OG image; development and non-production builds are `noindex`.

## 7. Motion contract

The motion kit (`apps/web/src/motion/`) is the only place that talks to GSAP and Lenis for
shared behaviour. Markup opts in through data attributes; the kit initialises on every
page load and after every client-side navigation, and cleans up before the next one.

| Attribute | Behaviour |
|---|---|
| `data-reveal="lines\|words\|chars\|rise\|fade"` | reveal once when entering the viewport; `data-reveal-delay="0.2"` optional |
| `data-reveal-group` + children `data-reveal-item` | staggered rise of the items |
| `data-cursor="link\|open\|read\|drag\|hide"` | cursor state while hovering; `data-cursor-label="…"` overrides the label |
| `data-marquee` + child `data-marquee-track` | endless horizontal loop; `data-marquee-speed`, `data-marquee-scroll` (follow scroll velocity) |
| `data-desk` + children `data-draggable` | throwable objects bounded by the desk; start pose from `data-x`, `data-y` (percent) and `data-rotate` (deg); double-click on the desk resets |
| `data-follower-scope` + `data-follower-item="<id>"` + `data-follower-panel` with `data-follower-for="<id>"` | a panel that follows the cursor while an item is hovered and shows the matching child |
| `data-progress` + `data-progress-target="<selector>"` | sets `--progress` (0 to 1) on the element as the target is scrolled through |
| `data-magnetic` | subtle pull toward the cursor |

Root state on `<html>`:

- Set by the inline script in BaseLayout before first paint and after every swap:
  `data-theme="light|dark"`, `data-motion="full|reduced"` and the class `js`.
  `data-motion` is the single source of truth for reduced motion: it follows
  `prefers-reduced-motion`, and `localStorage.motion = 'reduced' | 'full'` overrides it
  (a testing aid). The kit's `prefersReducedMotion()` reads this attribute.
- Maintained by the kit while the page is used: `data-scroll-dir="up|down"` and
  `data-scrolled` (present after 80px).
- The footer's motion switch stores the choice in `localStorage.motion`, updates
  `data-motion` and dispatches `site:motion`; the kit re-initialises the page in the new
  mode.

Surfaces: an element with `data-surface="paper|accent|ink"` (or the `surface-accent` /
`surface-ink` utilities) tells the cursor which colour to use over it.

Links to files (feeds, images) and links with `data-astro-reload` bypass the client router
and the transition panel. Elements prepared for a reveal are shown by a CSS failsafe after
1s if the kit has not taken over; largest-paint candidates must not carry `data-reveal`.

The kit's own CSS lives in `src/motion/motion.css`, imported by BaseLayout. Rules there
that hide or offset content are scoped to `html.js[data-motion='full']`.

Exports for page-specific choreography:

```ts
// `first`: the document's initial page; `late`: that load was slow, skip entrance choreography.
export function onPageEnter(
  cb: (ctx: { reduced: boolean; first: boolean; late: boolean }) => void | (() => void),
): void; // the returned function runs on leave
export function prefersReducedMotion(): boolean;
export function splitLines(el: Element): { lines: Element[]; revert(): void };
export function afterGate(fn: () => void): void; // runs once the page-transition panel has left
export { dur, ease, cssEase };                   // motion tokens (DESIGN 2.4)
export { gsap, ScrollTrigger };
```

Page code imports from `@/motion` only, never from the kit's internal modules.

The home hero follows the same contract with two page scripts of its own:
`components/home/hero.ts` (live data, the entrance around the statement) and
`components/home/meeting/meeting.ts` (the canvas of the meeting). Both register through
`onPageEnter`, wait for the transition gate, clean up on leave, and read reduced motion from
the page context. The dot field itself (`meeting/field.ts`) is pure geometry without DOM:
the browser builds the canvas dots from it and `Meeting.astro` builds the static SVG that
stands in without JavaScript, at build time.

```ts
// packages/content also exposes its assets:
import portrait from '@abduroziq/content/assets/portrait.jpg';
```

Rules: with JavaScript disabled or `data-motion="reduced"` every element is visible in its
final state. Initial hidden states are applied by the kit, never by static CSS alone.
The cursor replacement and smooth scrolling are off for coarse pointers and reduced motion.

## 8. Module ownership

Each area has one owner; changes outside your area go through its owner or the
orchestrator.

| Area | Paths |
|---|---|
| Workspace and tooling | root config, `packages/config/`, `apps/web/astro.config.*`, `apps/web/package.json` |
| Design system and chrome | `apps/web/src/styles/`, `components/ui/`, `components/chrome/`, `layouts/`, `dev-pages/styleguide.astro`, `i18n/*/common.json` (the i18n JSON files live in `packages/content/i18n/`; `src/i18n/index.ts` is the code) |
| Motion kit | `apps/web/src/motion/`, `dev-pages/lab/motion.astro` |
| Home | `components/home/`, `pages/[...locale]/index.astro`, `i18n/*/home.json` |
| Blog | `components/blog/`, `pages/[...locale]/blog/`, `pages/[...locale]/rss.xml.ts`, `lib/posts.ts`, `lib/markdown/`, `content.config.ts`, `styles/prose.css`, `i18n/*/blog.json`, `packages/content/posts/` |
| SEO | `components/seo/`, `lib/seo/`, `pages/og/`, `pages/robots.txt.ts`, `public/` icons and manifest, `i18n/*/seo.json` |
| Content | `packages/content/src/`, `packages/content/assets/` |
| CI and deploy | `.github/`, `wrangler.*`, `lighthouserc.*`, `apps/web/public/_headers` |

## 9. Quality bars

- `pnpm check` (lint, typecheck, build) passes before anything is merged.
- Lighthouse mobile: performance 95+, accessibility 100, best practices 100, SEO 100.
- No layout shift from fonts or late content (CLS under 0.02).
- Works without JavaScript: all text present, navigation usable.
- Works from 360px to 2560px wide, in light and dark themes, in both languages.
