# The content panel

Posts, notes and projects can be written and edited in a browser, on a phone too, without an
editor or Git: https://abduroziq.uz/admin/. The panel is [Sveltia CMS](https://sveltiacms.app/),
a single static page that reads and writes the files of `packages/content` through the GitHub
API. The site stays fully static: there is no server, no database and no secret behind it.

It is two files in `apps/web/public/admin/`:

| File | What it is |
|---|---|
| `index.html` | loads the panel script, pinned to one version and checked against its hash |
| `config.yml` | what the panel can edit: the collections and their fields |

## What it edits

| In the panel | Files |
|---|---|
| Posts (EN), Posts (UZ) | `posts/<locale>/<slug>.mdx` that are not notes |
| Notes (EN), Notes (UZ) | `posts/<locale>/<slug>.mdx` with `kind: note` |
| Project text (EN), Project text (UZ) | `projects/<slug>/en.mdx`, `uz.mdx` |
| Projects | `projects/<slug>/project.yaml` and the pictures in `projects/<slug>/media/` |

A post and its translation are two entries, one per language, linked by the same
`translationKey`, exactly as in the files. Nothing outside `packages/content` shows up
(`root_dir`).

Not in the panel, on purpose: the profile and the About text (`packages/content/src/site.ts`),
the interface strings (`packages/content/i18n/`), video files, and deleting a project or its
text (the text and the facts share one folder and its media, so removing one in the panel
would take the pictures of the other along). Do those in the repository.

## Signing in

The panel asks for a GitHub access token once per browser and keeps it in that browser's local
storage; signing out removes it.

1. Open https://abduroziq.uz/admin/ and choose "Sign In Using Access Token". The dialog links
   to GitHub's token page.
2. Create a fine-grained token: repository access "Only select repositories" ->
   `blogchik/abduroziq.uz`; repository permissions -> Contents: Read and write. Nothing else.
   Give it an expiry date.
3. Paste it into the dialog.

The token can change every file of the repository, which is what publishes the site: treat it
like a password, never put it in a file, and revoke it on GitHub if a device is lost. A
"Sign in with GitHub" button instead of a token needs a small OAuth client (Sveltia CMS
Authenticator on a Cloudflare Worker): set its address as `backend.base_url` and change
`auth_methods` to `[oauth]`.

## Saving is publishing

Saving an entry commits it to `main`. The `CI` workflow then runs `pnpm check`, the Lighthouse
assertions and the end-to-end suite, and publishes only if everything passes (DEPLOY.md), so a
broken entry never reaches the site: the previous version stays up.

- A new entry starts with **Draft** on. A draft is committed but left out of the site. Turn
  Draft off and save to publish.
- A failed run is visible in the repository's Actions tab only; the panel does not show the
  reason. The usual causes are below. Once the two Telegram secrets exist (DEPLOY.md, "Telegram
  notification"), the result of every save also arrives as a Telegram message: published, or
  not published with the step that failed and a link to the run.
- `main` now moves without `dev`. CI fast-forwards `dev` on GitHub to the saved commit when
  `dev` has nothing of its own (DEPLOY.md, `sync-dev`), so `git pull` on `dev` brings it in.
  If `dev` has its own commits, merge by hand before the next piece of work:
  `git fetch origin && git merge origin/main`.

What the checks reject after a save:

- a note that is not a note: more than 300 words, a heading, a quote, a table, an image;
- a `{` or a `}` in the text of a post outside code (MDX reads it as code), or an unclosed tag;
- a description outside 70 to 160 characters (the panel checks this too);
- a project with a cover and no cover alt text, two colours that are not `#RRGGBB`, a gallery
  item that is neither an image nor a video with its width and height.

## What the panel writes

Checked against the real content with Sveltia's test backend: existing posts, a note, a
project and its text come back unchanged except for the points below, and what the panel
writes for a new post and a new project passes the format and media checks and builds.

- **Front matter and YAML** are written in the panel's own style: no quotes unless needed,
  lists one item per line. `translationKey` moves to the first line and is written as `''`
  when empty (the site treats that as no key); a saved post gets an explicit `kind: post`. The
  files are therefore left out of the Prettier check (`.prettierignore`); the schemas in
  `content.config.ts` are what guards them.
- **Text.** The rich text mode rewrites Markdown in one style when a text is saved: `_italic_`,
  `***` for a rule, four spaces for a nested list. `import` lines and the components (`Figure`,
  `Note`, `PullQuote`) are kept exactly as written, but they are shown as plain text, not as
  blocks. To write or change one, switch the field to Markdown ("Edit in Markdown" in the
  toolbar) and type it as in `packages/content/posts/README.md`.
- **Pictures.** Every uploaded raster image is re-encoded as WebP in the browser, at most
  2880 pixels on its long side, and its file name is made URL-safe. Re-encoding drops the EXIF
  block, so the GPS position, the device and the time of a phone photo never reach the
  repository. An SVG is cleaned of editor data. A picture of a post goes to `assets/posts/` and
  is referenced as `../../assets/posts/<file>`; a picture of a project goes to its `media/`
  folder and is referenced as `./media/<file>`.
- **Not converted:** animated GIF, PNG and WebP files are uploaded as they are, and videos are
  not handled at all. `pnpm check:media` still fails the deploy for a file with metadata, but
  by then the commit is public. Strip those by hand and add them outside the panel.

## The script is pinned

The panel script runs with a token that can write to the repository, so `index.html` loads one
exact version from unpkg and the browser refuses it unless it matches the `integrity` hash. It
does not update itself. To move to a newer version (prefer one that has been out for a few
days), compute the hash:

```bash
V=0.265.2; curl -sL "https://unpkg.com/@sveltia/cms@$V/dist/sveltia-cms.js" | openssl dgst -sha384 -binary | openssl base64 -A
```

Put the version in the script URL of `index.html` and in the schema line at the top of
`config.yml`, and the hash, prefixed with `sha384-`, in `integrity`. Sveltia CMS is before 1.0,
so read its release notes for changed options, then try the panel locally before merging.

`/admin/` is served with `X-Robots-Tag: noindex` (`public/_headers`) and is not in the sitemap.

## Changing what can be edited

The fields in `config.yml` mirror the strict schemas in `apps/web/src/content.config.ts`: a key
the schema does not know fails the build, and a key missing from `config.yml` cannot be edited
in the panel. Change both together. `apps/web/src/lib/admin-config.test.ts` (part of
`pnpm check`) fails when the field lists, the folders or the pinned version drift apart.

## Trying it locally

Run `pnpm dev` and open http://localhost:4321/admin/index.html in a Chromium browser (the dev
server does not serve `/admin/` without the file name). "Work with Local Repository" asks for
the repository folder and then edits the files of the working tree directly: no token, no
commits. Review the result with `git diff`.
