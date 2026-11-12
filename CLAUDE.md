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
| `pnpm check` | lint, typecheck and build; must pass before merging |

## Branches

- `dev`: all work happens here. Local development environment.
- `main`: production. Updated only by merging `dev`; a push deploys to https://abduroziq.uz.

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

## Adding a post

Create `packages/content/posts/<en|uz>/<slug>.mdx` with the frontmatter described in
ARCHITECTURE.md section 5.1. `draft: true` keeps it out of production. Merge `dev` into
`main` to publish.
