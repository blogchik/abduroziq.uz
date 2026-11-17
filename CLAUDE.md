# abduroziq.uz

Personal website and blog of Abduroziq Jabborov. Static Astro site in a pnpm + Turborepo
monorepo. Public repository, MIT.

## Read first

1. [docs/DESIGN.md](docs/DESIGN.md): how the site looks, reads and moves.
2. [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): layout of the repo, contracts, ownership.
3. [docs/STACK-NOTES.md](docs/STACK-NOTES.md): verified APIs for the pinned versions.
   The stack is newer than most training data: check STACK-NOTES or current docs
   (Context7) before using an Astro, Tailwind, GSAP or Lenis API from memory.

## Commands (run from the repo root)

| Command | What it does |
|---|---|
| `pnpm install` | install the workspace |
| `pnpm dev` | start the site at http://localhost:4321 (drafts visible) |
| `pnpm build` | production build into `apps/web/dist` |
| `pnpm preview` | serve the production build |
| `pnpm lint` / `pnpm typecheck` / `pnpm format` | quality tools |
| `pnpm check` | format check, image metadata check, lint, typecheck, tests and build; must pass before merging |
| `pnpm test:e2e` | Playwright smoke suite (Chromium, desktop and phone) against the built `apps/web/dist`; run `pnpm build` first, and `pnpm exec playwright install chromium` once. Not part of `pnpm check`; CI runs it after the build |
| `pnpm check:media` | fail on images and videos (in `packages/content`, `apps/web/src/assets`, `apps/web/public`) that carry metadata: EXIF (GPS), XMP, IPTC, PNG text chunks, SVG editor data, local paths; video location, device, creation time |

## Branches

- `dev`: all work happens here. Local development environment.
- `main`: production; a push deploys to https://abduroziq.uz. Updated by merging `dev`, and by
  the content panel, which commits content (`packages/content`) straight to it. Bring those
  commits into `dev` before working on it: `git fetch origin && git merge origin/main`.

## Conventions

- Code, comments, commit messages and docs are in English. Site copy is bilingual
  (English and Uzbek) and lives in `packages/content/`.
- Never duplicate a page per language: one page file renders both locales.
- Colours, type, spacing and motion values come from the design tokens. No raw hex
  values, font sizes or easings in components.
- Shared motion goes through the motion kit and its data attributes. Content must be
  fully visible without JavaScript and under `prefers-reduced-motion`.
- Every page passes its metadata through `BaseLayout` / `Seo`. One `h1` per page.
- No secrets in the repo. Environment files contain public values only.
- This repository is public: commit only information that is already public.
- Add a dependency only when it clearly earns its weight, and say why in the commit.
- Commit messages: imperative mood, a short subject, a body that explains why.

## The content panel

Posts, notes and projects can be edited at https://abduroziq.uz/admin/ (Sveltia CMS, two static
files in `apps/web/public/admin/`). Saving there commits to `main`, and that deploys. Its
`config.yml` mirrors the schemas in `apps/web/src/content.config.ts`: change both together.
See [docs/ADMIN.md](docs/ADMIN.md).

## Adding a post

Create `packages/content/posts/<en|uz>/<slug>.mdx` with the frontmatter described in
ARCHITECTURE.md section 5.1. `draft: true` keeps it out of production. Merge `dev` into
`main` to publish.

## Adding a note

A note is a short post: `kind: note`, `title`, `date` and the text (at most 300 words,
enforced; usually 50 or more) in `packages/content/posts/<en|uz>/<slug>.mdx`. It needs no
description (one in the frontmatter is used as written) and has no cover, heading, rule, table,
image, footnote or component. The build fails with a message naming the file when a note is not
a note. See `packages/content/posts/README.md`.

## Adding a project

Create `packages/content/projects/<slug>/project.yaml` (fields in
`packages/content/projects/README.md` and ARCHITECTURE.md section 5.2), optionally `en.mdx` /
`uz.mdx` for the page text and `media/` for images and videos. The page exists at
`/projects/<slug>/` in both languages; pages and components read projects only through
`apps/web/src/lib/projects.ts`.
