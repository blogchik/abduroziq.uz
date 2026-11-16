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
colors: ['#18181B', '#E28413'] # background and foreground: the ticket, the plate, the matte
glyph: Pz # one or two characters drawn on the ticket and the plate
cover: ./media/cover.jpg # optional, relative to this file
coverAlt: # required with a cover
  en: …
  uz: …
gallery: # optional; images and videos in order
  - image: ./media/screen.png
    alt: { en: …, uz: … }
    caption: { en: …, uz: … } # optional
  - video: ./media/demo.mp4 # .mp4 or .webm, inside this folder
    width: 1600 # the video's own size in pixels: required
    height: 1000
    poster: ./media/demo.jpg # optional still shown before playing, same shape as the video
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

The repository is public. Images must carry no metadata: `pnpm check` runs
`apps/web/scripts/check-media.mjs` and fails on any raster image under `packages/content`
(and in the site's `src/assets` and `public` folders) with EXIF (which holds the GPS position), XMP, IPTC or text chunks (where some tools put
EXIF in a PNG), and on any SVG with an editor `<metadata>` block, `sodipodi:` / `inkscape:`
attributes or a path from your machine. Export screenshots without metadata, or strip it
with `sharp(input).rotate().toFile(output)`.

How a picture is shown is decided from the file, not by a field. A landscape screenshot
(export desktop screens at 16:10, for example 2880x1800) fills its frame at the full content
width. A phone screenshot, a square picture and every SVG keep a size of their own on a matte
in the project's background colour (`colors[0]`). A project without a `cover` gets a plate
drawn from `colors` and `glyph` instead. SVGs are served as they are, so an animated one
keeps playing, and the site's motion switch cannot reach inside it: if it loops, include
`<style>@media (prefers-reduced-motion: reduce){*{animation:none!important}}</style>` right
after its opening `<svg>` tag (the two subagent-monitor pictures do).

Keep videos short and small (they are committed and served as files): H.264 `.mp4`, no
sound track unless it matters, and a poster. They are never played automatically.

A video follows the same rules as a picture, by the `width` and `height` you write in the
yaml (read them from the file, for example `ffprobe -v error -show_entries stream=width,height
demo.mp4`; use the displayed size of a rotated phone recording). A landscape clip fills the
frame; a phone recording or a square clip stands at its own size on the matte. The two numbers
also reserve the space, so the page does not jump when the clip starts. Export the poster in
the same shape as the clip.

A video carries metadata too, and a phone recording often has the GPS position in it.
`check-media` reads the boxes of every `.mp4`, `.mov`, `.m4v` and `.webm` file and fails on a
location (3GPP `loci`, `©xyz`), the device make and model, Apple `com.apple.quicktime.*` keys
and any creation time (in a WebM: a `DateUTC`, a title or a tag other than the encoder and
the duration). Strip a reported clip without re-encoding it:
`ffmpeg -i in.mp4 -map_metadata -1 -c copy out.mp4` (for WebM add `-fflags +bitexact`).
