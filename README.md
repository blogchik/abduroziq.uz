# abduroziq.uz

Personal website and blog of Abduroziq Jabborov, a Product Engineer based in Tashkent.
A static, bilingual (English and Uzbek) site built with Astro 7, MDX and Tailwind CSS 4,
in a pnpm + Turborepo monorepo. Live at https://abduroziq.uz.

## Structure

```
apps/web            @abduroziq/web: the Astro site (pages, layouts, components, motion)
packages/content    @abduroziq/content: profile data, UI strings, posts, images
packages/config     @abduroziq/config: shared TypeScript, ESLint and Prettier config
docs/               DESIGN.md, ARCHITECTURE.md, STACK-NOTES.md
```

Start with [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the layout and contracts,
[docs/DESIGN.md](docs/DESIGN.md) for how the site looks and moves, and
[docs/STACK-NOTES.md](docs/STACK-NOTES.md) for verified APIs of the pinned versions.

## Commands

Requires Node 24 (see `.nvmrc`) and pnpm 10 (`corepack enable` picks the right version).

| Command          | What it does                                                              |
| ---------------- | ------------------------------------------------------------------------- |
| `pnpm install`   | install the workspace                                                     |
| `pnpm dev`       | dev server at http://localhost:4321, drafts visible                       |
| `pnpm build`     | production build into `apps/web/dist`                                     |
| `pnpm preview`   | serve the production build                                                |
| `pnpm lint`      | ESLint                                                                    |
| `pnpm typecheck` | `astro check` and `tsc`                                                   |
| `pnpm format`    | Prettier (`pnpm format:check` only checks)                                |
| `pnpm test`      | unit checks (sitemap parsing, code-theme contrast)                        |
| `pnpm check`     | format check, lint, typecheck, tests and build; must pass before merging  |
| `pnpm test:e2e`  | browser smoke suite on the built site (run `pnpm build` first, see below) |

`pnpm test:e2e` serves `apps/web/dist` and drives Chromium (desktop and phone) through every page,
the motion modes and the page transition. It builds nothing and needs a browser once:
`pnpm exec playwright install chromium`. It is not part of `pnpm check`; CI runs it after the build.

## Branches

- `dev`: all work happens here (local development environment).
- `main`: production. Updated only by merging `dev`; a push deploys to https://abduroziq.uz.

## Adding a post

1. Create `packages/content/posts/<en|uz>/<slug>.mdx`.
2. Fill in the frontmatter (see [ARCHITECTURE.md](docs/ARCHITECTURE.md) section 5.1):
   `title`, `description` (70 to 160 characters), `date`, optional `tags`, `cover`,
   `updated` and `translationKey` (use the same value in both languages to link a post and
   its translation).
3. Keep `draft: true` while writing. Drafts show up in `pnpm dev` and are excluded from
   production builds.
4. Run `pnpm check`, then merge `dev` into `main` to publish.

## Licence

This repository has two licences, depending on the directory:

- **Code** (everything outside `packages/content`): [MIT licence](LICENSE).
- **Content** (everything in `packages/content`: posts, site copy, photos and other images):
  [(c) Jabborov Abduroziq, all rights reserved](packages/content/LICENSE). It is not covered
  by the MIT licence and is published here so the site can be built, not to be reused.
