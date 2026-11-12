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
│     ├─ astro.config.*
│     ├─ public/                 static files copied as is (favicons, _headers)
│     └─ src/
│        ├─ pages/               routes, one file per route for both locales
│        ├─ layouts/             BaseLayout.astro
│        ├─ components/
│        │  ├─ ui/               design-system primitives
│        │  ├─ chrome/           Header, Footer, ThemeToggle, LangSwitch, SkipLink
│        │  ├─ home/             hero, desk, about, tape, building, writing
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

Drafts (`draft: true`) are rendered in development and excluded from production builds.
Deploy credentials exist only as GitHub Actions secrets (`CLOUDFLARE_API_TOKEN`,
`CLOUDFLARE_ACCOUNT_ID`).

## 4. Routing and languages

- Locales: `en` (default, no prefix) and `uz` (prefix `/uz`).
- Each route is a single page file that renders both locales (a rest parameter for the
  locale, or the equivalent recommended in STACK-NOTES). Never duplicate page markup per
  language.

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
cover: ../../assets/posts/<slug>/cover.jpg   # optional
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

### 5.2 Site data (`packages/content/src`)

```ts
export type Locale = 'en' | 'uz';
export type Localized<T = string> = Record<Locale, T>;

export type SentencePart =
  | { kind: 'text' | 'em'; value: string }
  | { kind: 'capsule'; id: 'portrait' | 'craft' | 'tashkent' }
  | { kind: 'break' };

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
  labelStrip: { instructions: string; role: string; madeIn: string };  // decorative, English
  desk: { stickyNote: string; polaroidCaption: string; ticket: string; keycap: string; pialaNote: Localized; cursorFlag: string };
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
}
```

It renders `<html lang>`, the head (Seo, fonts, theme bootstrap script), the skip link,
Header, `<main id="main">`, Footer and the motion entry script.

### Seo (`apps/web/src/components/seo/Seo.astro`)

```ts
interface SeoProps {
  locale: Locale; path: string; title: string; description: string;
  type?: 'website' | 'article';
  image?: string;                               // defaults to the generated OG image
  article?: { publishedTime: Date; modifiedTime?: Date; tags: string[] };
  alternateLocales?: Locale[];                  // defaults to all locales; a post passes only its own unless translated
  noindex?: boolean;
  jsonLd?: object | object[];
}
```

Outputs: title, description, canonical, hreflang alternates plus `x-default`, Open Graph,
Twitter card, robots, theme-color, RSS link, JSON-LD. Schema helpers live in
`apps/web/src/lib/seo/` (`personSchema`, `websiteSchema`, `blogPostingSchema`,
`breadcrumbSchema`, `ogImageUrl`).

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

Global state the kit maintains on `<html>`: `data-scroll-dir="up|down"`, `data-scrolled`
(present after 80px), `data-motion="full|reduced"`, and the class `js`.

Exports for page-specific choreography:

```ts
export function onPageEnter(cb: (ctx: { reduced: boolean }) => void | (() => void)): void; // returned function runs on leave
export function prefersReducedMotion(): boolean;
export function splitLines(el: Element): { lines: Element[]; revert(): void };
export { gsap, ScrollTrigger };
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
| Design system and chrome | `apps/web/src/styles/`, `components/ui/`, `components/chrome/`, `layouts/`, `pages/styleguide.astro`, `i18n/*/common.json` |
| Motion kit | `apps/web/src/motion/`, `pages/lab/motion.astro` |
| Home | `components/home/`, the home page file, `i18n/*/home.json` |
| Blog | `components/blog/`, blog page files, feeds, `lib/posts.ts`, `lib/markdown/`, `content.config.ts`, `styles/prose.css`, `i18n/*/blog.json`, `packages/content/posts/` |
| SEO | `components/seo/`, `lib/seo/`, `pages/og/`, `pages/robots.txt.ts`, `public/` icons and manifest, `i18n/*/seo.json` |
| Content | `packages/content/src/`, `packages/content/assets/` |
| CI and deploy | `.github/`, `wrangler.*`, `lighthouserc.*`, `apps/web/public/_headers` |

## 9. Quality bars

- `pnpm check` (lint, typecheck, build) passes before anything is merged.
- Lighthouse mobile: performance 95+, accessibility 100, best practices 100, SEO 100.
- No layout shift from fonts or late content (CLS under 0.02).
- Works without JavaScript: all text present, navigation usable.
- Works from 360px to 2560px wide, in light and dark themes, in both languages.
