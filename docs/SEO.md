# SEO

How abduroziq.uz is made findable, and how to write a post that ranks. Code lives in
`apps/web/src/components/seo/`, `apps/web/src/lib/seo/` and `apps/web/src/pages/og/`;
page strings in `packages/content/i18n/<locale>/seo.json`.

## What every page emits

`BaseLayout` renders `Seo.astro` in the head. All pages get:

- `<title>` as `Title — Abduroziq` (the home page has no suffix), a meta description, an
  absolute canonical, `robots` (`index, follow, max-image-preview:large` in production,
  `noindex, nofollow` when `PUBLIC_ALLOW_INDEXING` is not `true`, `noindex, follow` when the page sets `noindex`).
  A page can pass `canonical: false` in its `seo` prop to leave out the canonical, `og:url` and
  hreflang entirely (the 404 page does: it is served at any missing URL).
- `hreflang` alternates plus `x-default`, only for languages where the page really exists.
- Open Graph and Twitter `summary_large_image` tags with a generated 1200x630 image, plus
  `og:locale` / `og:locale:alternate`.
- RSS autodiscovery for the current language, a sitemap link, `theme-color` (light and dark),
  icons and the web manifest, and the optional verification metas.

| Page | Type | JSON-LD | OG image |
|---|---|---|---|
| Home `/`, `/uz/` | website | WebSite, Person, ProfilePage | `/og/<locale>/home.png` |
| Blog index | website | Blog, BreadcrumbList | `/og/<locale>/blog.png` |
| Tag page | website | CollectionPage, BreadcrumbList | blog image |
| Post | article | BlogPosting, BreadcrumbList | `/og/<locale>/post/<slug>.png` |
| Projects list `/projects/`, `/uz/projects/` | website | CollectionPage (with an ItemList of the projects), BreadcrumbList | `/og/<locale>/projects.png` |
| Project `/projects/<slug>/` | website | CreativeWork, BreadcrumbList | `/og/<locale>/project/<slug>.png` |
| 404 | website | none | home image, `noindex` |

Entities have stable `@id`s (`/#person`, `/#website`, `<url>#article`, `<url>#blog`,
`<url>#collection`, `<url>#project`), so
pages reference one Person instead of redefining it. Person data comes from `profile` in
`@abduroziq/content`. Articles add `article:published_time`, `modified_time`, `author`, `tag`.

Sitemap (`sitemap-index.xml`, `sitemap-0.xml`): canonical indexable URLs only (no 404, drafts,
dev-only routes). Posts carry `lastmod = updated ?? date`. Translated posts are paired with
hreflang through `translationKey` even when the slugs differ (`lib/seo/sitemap.ts` parses the
frontmatter with the `yaml` package, so comments and block-style lists are fine; `pnpm test`
covers it). Project pages and the projects list exist under the same path in every language, so
the integration pairs them with hreflang by path; they carry no `lastmod`, because nothing in a
project's data dates a change (`year` is the build year, and CI checks out one commit, so git
dates would all read as the latest commit). `robots.txt` is disallow-all unless indexing is on.

Thin pages are kept out until they have something to show (`noindex, follow` and no sitemap
entry): a blog index of a language with no posts at all, and a tag page with fewer than
`MIN_POSTS_PER_TAG` (3, `lib/seo/thresholds.ts`) posts in that language.

Structured data names the author "Abduroziq Jabborov" (as the byline reads) with
`alternateName` "Jabborov Abduroziq"; the Person has the portrait as `image`, the ProfilePage a
`dateModified` (the build time) and a post with a cover lists it after the generated card in
`BlogPosting.image`. A project's `CreativeWork` has `creator` (the Person), `keywords` from its
stack, the generated card plus the cover (when there is one) as `image`, and the live site and
the repository as `sameAs`; its `url` is the project page.

Markdown is rendered with smart punctuation off (`satteri({ features: { smartPunctuation: false } })`
in `astro.config.ts`): a straight `'` stays `'` in post bodies, matching titles, descriptions and
structured data, so one spelling is indexed and searched. Write typographic quotes or dashes
yourself if you want them.

## Writing a post that ranks

- **Title**: 30 to 60 characters, the main phrase first, one clear promise. The site suffix
  adds 12 characters; the build warns above 70 in total. Write the title the way a person
  would search for it (in the post's own language).
- **Description**: 70 to 160 characters (enforced by the content schema). Say what the reader
  gets; do not repeat the title. It is the snippet in Google and Yandex. A note
  (`kind: note`, see below) has none of its own: it is derived from the text.
- **Slug** (file name): short, lowercase, hyphenated, in the post's language
  (`astro-seo-guide.mdx`, `seo-boyicha-qollanma.mdx`). Never rename a published slug.
- **Tags**: 2 to 4 lowercase kebab-case tags, reused across posts. Each tag has its own page.
- **`updated`**: set it when you materially change a published post. It feeds `lastmod`,
  `dateModified` and `article:modified_time`. Do not touch it for typo fixes.
- **`translationKey`**: give the same value to the English and Uzbek versions. It links them
  with hreflang (head and sitemap) and the language switch. Without it each post stands alone.
- **Cover**: optional. Social cards always use the generated image; `coverAlt` describes the
  cover on the page itself (empty means decorative).
- **Body**: one `h1` (the title, rendered by the layout), then `h2` / `h3` in order. Link to
  your other posts, write descriptive link text, add `alt` to every image.
- Use a plain `'` in Uzbek copy (`o'zbek`, `g'oya`): Bricolage Grotesque has no `ʻ` (U+02BB),
  and one spelling is easier to search for.

## Notes

A note is a short post (`kind: note` in the frontmatter, 300 words at most) and is indexed
exactly like one: same `/blog/<slug>/` URL space, same canonical, hreflang, `article` type,
BlogPosting JSON-LD, sitemap entry (`lastmod = updated ?? date`; the sitemap reads only the
frontmatter, so a note without a description is no different there), RSS item and generated
Open Graph card (labelled "Note" / "Qayd" instead of "Writing"). Its description is derived
from the text: the plain text of the body from its start, cut at a word to at most 160
characters, ending in an ellipsis when cut (`deriveDescription` in `lib/post-data.ts`).
Because the text is the snippet, open a note with a sentence that works on its own. The
build-time hint in `Seo.astro` still warns for a description under 70 characters, which for
a derived one means a note shorter than about a dozen words.

## Adding a project that ranks

Same rules as a post, in `packages/content/projects/<slug>/project.yaml` (see the README there):
`description` is 70 to 160 characters in each language (enforced) and is the snippet; `summary`
is the sentence under the title, so the two should not repeat each other word for word. The page
title is the project name plus the site suffix (the list's own title is `seo.projects.title`,
a full phrase, while its `h1` stays the one word of `projects.title`). The slug is the URL in both languages: never
rename a published one. Give every image `alt` in both languages; images must carry no
metadata (`pnpm check` fails otherwise).

## Launch checklist (owner)

1. Deploy to production (`main`); open `https://abduroziq.uz/robots.txt` and check it allows `/`.
2. **Google Search Console**: add the property, choose the HTML tag method, copy the
   `content` value into `PUBLIC_GOOGLE_SITE_VERIFICATION` in `apps/web/.env.production`,
   deploy, click Verify. Then Sitemaps: submit `sitemap-index.xml`.
3. **Yandex Webmaster**: add the site, choose the meta tag method, put the code in
   `PUBLIC_YANDEX_VERIFICATION`, deploy, verify. Indexing > Sitemap files: add
   `https://abduroziq.uz/sitemap-index.xml`. Set the regional link to Uzbekistan.
4. **Bing Webmaster Tools**: add the site (or import from Search Console), meta tag code in
   `PUBLIC_BING_SITE_VERIFICATION`, submit the sitemap.
5. **Analytics (optional)**: create a Cloudflare Web Analytics site and put its token in
   `PUBLIC_ANALYTICS_TOKEN`. Empty means no script.
6. Test one post in the Rich Results Test and a share preview (Telegram, LinkedIn). In Search
   Console use URL Inspection > Request indexing for the home page and each new post.
7. **IndexNow (optional)**: Bing and Yandex accept instant URL pings. Generate a key, host
   `https://abduroziq.uz/<key>.txt` from `public/`, and POST new URLs to
   `https://api.indexnow.org/indexnow`. Google does not use IndexNow.

Verification codes are public values, so committing them is fine.

## Maintenance

- Icons: `node apps/web/scripts/generate-icons.mjs` regenerates the PNG, ICO and SVG icons in
  `public/` from the accent dot (outputs are committed).
- OG layout: `lib/seo/og-image.ts`. Long titles shrink and wrap (checked at 20, 60 and 110
  characters). Colours mirror `docs/DESIGN.md` 2.1 in `lib/seo/brand.ts`.
- Verify production output with `PUBLIC_ALLOW_INDEXING=true pnpm build` and inspect
  `apps/web/dist`; with `PUBLIC_ALLOW_INDEXING=false` every page is `noindex`.
