# Adding a project

A project is one folder: `projects/<slug>/`. The folder name is the URL in every language
(`/projects/<slug>/` and `/uz/projects/<slug>/`): short, lowercase, hyphenated. Never rename
a published slug. Every project gets a page in both languages, because `project.yaml` holds
both; the long text is optional per language.

```
projects/<slug>/
  project.yaml   every fact, localized strings as { en, uz }
  en.mdx         optional: the English text of the page (body only)
  uz.mdx         optional: the Uzbek text of the page (body only)
  media/         optional: images and short videos
```

## project.yaml

```yaml
name: Payzone
order: 1 # position in every list, ascending; unique
year: '2026' # the current build year, not a launch date (quoted)
status: live # live | design | planned
url: https://payzone.uz # optional: the live address
repo: https://github.com/... # optional: the public repository
role:
  en: Building and running
  uz: Qurish va yuritish
summary: # one sentence, shown in lists and under the title
  en: …
  uz: …
description: # the search snippet, 70 to 160 characters in each language
  en: …
  uz: …
stack: [Next.js, FastAPI] # technology names in display order; [] for none
colors: ['#18181B', '#E28413'] # ticket background and foreground on the home page
glyph: Pz # one or two characters drawn on the ticket
cover: ./media/cover.jpg # optional, relative to this file
coverAlt: # required with a cover
  en: …
  uz: …
gallery: # optional; images and videos in order
  - image: ./media/screen.png
    alt: { en: …, uz: … }
    caption: { en: …, uz: … } # optional
  - video: ./media/demo.mp4 # .mp4 or .webm, inside this folder
    poster: ./media/demo.jpg # optional still shown before playing
    alt: { en: …, uz: … }
    caption: { en: …, uz: … }
```

The build checks every field (`apps/web/src/content.config.ts`) and fails with the field and
the file when something is missing, too long or misspelled. A video path that does not point
at a file in the project's folder fails the build too.

## Text

`en.mdx` and `uz.mdx` are the body of the page, without frontmatter. The page renders the
name as the `h1`, so start with a paragraph and use `##` and `###` only. Everything the post
README says about writing applies here too: plain `'` in Uzbek, absolute links
(`/uz/projects/<slug>/`), `Figure`, `Note` and `PullQuote` without an import (images for a
`Figure` are imported from the folder: `import shot from './media/shot.png';`). Leave a file
out and that language shows the facts, the stack and the media only.

## Media

The repository is public. Images must carry no EXIF (which holds the GPS position), XMP or
IPTC metadata: `pnpm check` runs `apps/web/scripts/check-media.mjs` and fails on any image
under `packages/content` that has some. Export screenshots without metadata, or strip it
with `sharp(input).rotate().toFile(output)`.

Keep videos short and small (they are committed and served as files): H.264 `.mp4`, no
sound track unless it matters, and a poster. They are never played automatically.
