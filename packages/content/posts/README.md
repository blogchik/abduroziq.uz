# Writing a post

A post is one MDX file: `posts/en/<slug>.mdx` or `posts/uz/<slug>.mdx`. The folder is the
language, the file name is the URL (`/blog/<slug>/` or `/uz/blog/<slug>/`). Never rename a
published slug. `hello-world.mdx` and `salom-dunyo.mdx` are drafts that show every element.

## Frontmatter

```yaml
---
kind: post            # optional: post (default) or note, see "Writing a note"
title: "…"            # 30 to 60 characters, main phrase first
description: "…"      # 70 to 160 characters: the search snippet, do not repeat the title (a post needs one)
date: 2026-11-12      # publication date
updated: 2026-11-20   # only for a real change; feeds lastmod and the page meta line
tags: [design, astro] # 2 to 4, lowercase kebab-case, reused; each tag gets its own page
draft: true           # true keeps the post out of production (visible in `pnpm dev`)
cover: ../../assets/posts/<slug>/cover.jpg   # optional; shown 16:9 under the title
coverAlt: "…"         # alt text of the cover; empty means decorative
translationKey: "…"   # same value on the en and uz versions
---
```

A key not listed here (a typo such as `draf: true`) fails the build.

## Drafts and publishing

`draft: true` posts, their tag pages, feed items and sitemap entries exist only in
development. To publish, set `draft: false` (or remove the line) and merge `dev` into `main`.

## Translations

Give both versions the same `translationKey`. The slugs may differ. Each page then links to the
other (a "Read in Uzbek" link under the date, `hreflang` in the head and the sitemap, the
language switch). A post without a translation stays in its own language; the other language's
blog index still lists it with a language badge.

## Writing

Plain Markdown plus GFM: headings, lists, tables, footnotes (`[^1]`), fenced code. Start with
a paragraph (it gets the drop cap), not a heading; the layout renders the title as the `h1`, so
use `##` and `###` only. Every `##` is numbered automatically. Link to your other posts with
absolute paths (`/uz/blog/<slug>/`) and describe the link in words. Use a plain `'` in Uzbek: smart punctuation is off, so quotes, apostrophes and `--` are
rendered exactly as typed (type `“…”` or `—` yourself when you want them).

External links open in a new tab on their own. Images: put files in
`packages/content/assets/posts/<slug>/` and import them; always write `alt`.

## Components

`Figure`, `Note` and `PullQuote` work in every post without an import.

```mdx
import shot from '../../assets/posts/my-post/shot.jpg';

<Figure src={shot} alt="What the image shows" caption="A mono caption." />
<Figure wide src={shot} alt="…" />           {/* up to 920px on desktop */}

<Note>A quiet aside: a hairline and a mono label. `label="Tip"` renames it.</Note>

<PullQuote cite="Source name">A quote set apart from the text.</PullQuote>
```

A plain `> quote` is also a pull quote (it hangs 120px outside the column on desktop). Use the
`Figure` slot when the caption needs a link: `<Figure …>Caption with a [link](/blog/)</Figure>`.
Code blocks take a language (` ```ts `) and get a tag, light and dark colours and sideways
scroll. Tables scroll inside their own region on small screens.

Remark and rehype plugins do not work in Astro 7; the look of every element is decided in
`apps/web/src/components/blog/` (element mapping in `mdx.ts`) and `apps/web/src/styles/prose.css`.

## Writing a note

A note is a short kind of post: at most 300 words (enforced), usually 50 or more, that take ten
minutes to write. It lives in the
same folder, at the same URL (`/blog/<slug>/`), in the same feed, sitemap and chronology as
the posts; one frontmatter field marks it. Everything above about files, drafts and
translations applies to it too. `hello-note.mdx` and `salom-qayd.mdx` are drafts that
show one.

```mdx
---
kind: note
title: "A 200 says nothing about the bundle in the browser"
date: 2026-11-17
---

Text of the note, one to four short paragraphs.
```

`kind`, `title`, `date` and the text are all it needs. `tags`, `updated`, `draft` and
`translationKey` work as in a post. A note needs no `description`: the search snippet and the
share text are derived from the first words of the text, so open with a sentence that stands
on its own. A `description` you add anyway is used as written (70 to 160 characters). A note
cannot have a `cover`.

In the text you may use paragraphs, emphasis, links, inline code, fenced code blocks, and
ordered and unordered lists. A note cannot be empty, and cannot have a heading, a rule (a line
of `---` or `***`), a blockquote, a table, an image, a footnote, an `import` or `export` line, or
a component or HTML tag (`Figure`, `Note`, `PullQuote`); the same goes for the inside of a list
item. It holds 300 words at most; code blocks do not count.

When the text does not fit those rules, the build fails and names the file and the problem:
shorten it or take the construct out, or make it a post (remove `kind: note` and add a
`description`). A note that is published fails the build; a draft note fails in `pnpm dev` and
on the day it is published, because a production build leaves drafts out before it checks them.
A post without a description fails the build too: only a note may leave it out.
