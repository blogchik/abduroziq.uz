# Design specification

The single source of truth for how abduroziq.uz looks, reads and moves. Implementation
details (files, APIs, contracts) live in [ARCHITECTURE.md](ARCHITECTURE.md).

## 1. Concept: "Statement & Meeting"

Abduroziq is a product engineer: he designs products and builds them, from Figma to
production, and he works with AI agents every day. The site is a quiet, type-first page (ink
on paper, hairlines, one accent) with exactly three loud ideas:

1. **The statement.** The introduction is one large, plain sentence in the brand sans, in
   two tones. A single living thing sits in it: a small capsule after his name that rolls
   through what he does.
2. **The meeting.** Under it his name runs edge to edge, thin and calm, and in front of the
   name stands one large dotted object: a hand cursor and an arrow cursor about to touch.
   The person and the agent. It is the visual centre of the first screen.
3. **The desk.** A few physical objects that are about him lie next to the About text (and
   on the 404 page) and can be picked up and thrown.

Everything else is disciplined: mono section labels, hairline tables, generous space.
A custom cursor guides the visitor through it.

Principles, in priority order:

- **Minimal is not empty.** Few elements, each one finished. If a thing is not the
  statement, the meeting, the desk, a table row or body text, question whether it should
  exist.
- **One accent.** Orange `#E28413` is the only colour. No second accent, no gradients, no
  glass, no glow, no drop shadows except the lifted desk objects.
- **Motion has weight.** Things rise, settle, get thrown and land. Nothing floats
  aimlessly. The few loops are small and slow (the rolling capsule, the breathing cursors and
  their spark, the tape) and all of them stop with the motion switch.
- **Content first.** Every word is in the HTML and readable with JavaScript off. Motion is
  an enhancement and never delays the first paint of text.
- **Two languages, one design.** English (`/`) and Uzbek (`/uz/`) share every layout. Uzbek
  strings are often longer: nothing may depend on an exact English string width.

## 2. Tokens

### 2.1 Colour

| Token | Light | Dark | Use |
|---|---|---|---|
| `paper` | `#ECEAE5` | `#121110` | page background |
| `paper-raised` | `#F6F4F0` | `#1B1A17` | cards, code blocks, hovered rows |
| `ink` | `#141310` | `#EFECE6` | text, rules at full strength, inverted bands |
| `ink-soft` | `#5C574E` | `#9C968A` | secondary text |
| `rule` | `#D2CEC6` | `#2C2A26` | hairlines |
| `accent` | `#E28413` | `#E28413` | fills: tape, footer, the capsule, the agent's name tag, the spark, cursor burst |
| `accent-text` | `#9C5200` | `#E28413` | accent-coloured text and icons on `paper` |
| `on-accent` | `#141310` | `#141310` | text on an accent fill (always dark ink) |

Rules:

- Accent is a **fill** first. Text on accent is always dark ink (contrast about 6.7:1).
  Accent-coloured text on paper uses `accent-text`, never raw `accent` in light mode.
- An **ink band** is a full-bleed section with `ink` background and `paper` text. Use at
  most one per page (home: none by default; reserved for the 404 page and future use).
- Theme follows the system by default; a toggle stores an explicit choice. The attribute
  is `data-theme="light|dark"` on `<html>`.

### 2.2 Type

| Role | Family | Notes |
|---|---|---|
| Display / UI | **Bricolage Grotesque** (variable: `opsz`, `wght`, `wdth`) | the brand face: body, titles, the hero statement, the name |
| Text serif | **Newsreader** (static cuts, roman + italic, two optical sizes) | article titles and body, pull quotes |
| Mono | **Geist Mono** 400/500 | labels, meta, table data, micro copy |
| Hand | **Caveat** 500 (Latin subset) | desk annotations only, never for UI |

All fonts are self-hosted and subset. Uzbek Latin needs `ʻ` (U+02BB) and `ʼ` (U+02BC) in
addition to Basic Latin: verify each face has them and fall back to `'` typography in copy
if one does not.

Scale (fluid with `clamp()`; values are min at 360px and max at 1440px):

| Style | Family | Size | Line | Tracking | Weight |
|---|---|---|---|---|---|
| `name` | Bricolage, `wdth` 100 | fit to container width (about 17.5vw) | 0.8 | -0.045em | 500, uppercase |
| `name`, thin cut | Bricolage, `wdth` 100 | fit to container width (about 21vw) | 0.8 | -0.02em | 250, uppercase (behind the meeting in the hero) |
| `statement` | Bricolage, `opsz` 96 | 38 → 78px, derived from its measure (4.1) | 1.02 | -0.035em | 500 |
| `display` | Bricolage, `wdth` 75 | 56 → 168px | 0.86 | -0.02em | 400, uppercase (page titles such as WRITING) |
| `numeral` | Bricolage, `wdth` 75 | 44 → 72px | 0.9 | 0 | 300 (date day numbers) |
| `title` | Bricolage | 24 → 40px | 1.08 | -0.02em | 500 |
| `lead` | Bricolage | 22 → 34px | 1.22 | -0.015em | 400 |
| `body` | Bricolage | 16 → 18px | 1.55 | 0 | 400 |
| `article-title` | Newsreader | 34 → 64px | 1.06 | -0.015em | 400 |
| `article-body` | Newsreader, `opsz` auto | 19 → 21px | 1.6 | 0 | 400 |
| `label` | Geist Mono | 11 → 12px | 1.3 | 0.08em | 500, uppercase |
| `micro` | Geist Mono | 9 → 10px | 1.25 | 0.04em | 400, uppercase (the print on a project ticket) |
| `hand` | Caveat | 20 → 26px | 1.1 | 0 | 500 |

### 2.3 Space, grid, shape

- 12-column grid, max content width 1440px, side padding 16px (mobile) / 24px (tablet) /
  40px (desktop), column gap 16 / 24px.
- Section rhythm: 96px (mobile) → 176px (desktop) between sections. Space is the main
  layout tool; do not fill it.
- Hairlines are 1px `rule`. Tables and rows are separated by hairlines only, never boxes.
- Radius: `0` for tape, bands and table rows; `999px` for capsules, chips, name tags and
  the cursor; `10px` for desk cards and code blocks. Nothing else.
- Shadows: only desk objects (`0 1px 0 rgb(0 0 0 / .06), 0 10px 24px -12px rgb(0 0 0 / .35)`,
  stronger while dragged).

### 2.4 Motion tokens

| Token | Value | Use |
|---|---|---|
| `dur-1` | 160ms | hover colour, cursor state |
| `dur-2` | 320ms | row shifts, chips, toggles |
| `dur-3` | 700ms | text reveals, the capsule's pop |
| `dur-4` | 1100ms | giant name, page transition |
| `ease-out` | `cubic-bezier(0.16, 1, 0.3, 1)` | default for entrances |
| `ease-in-out` | `cubic-bezier(0.65, 0, 0.35, 1)` | wipes, page transition |
| `spring` | GSAP `elastic.out(1, 0.6)` / `back.out(1.6)` | the capsule, object drop-in |

## 3. Global chrome

### 3.1 Header

One row, not sticky on the way down; reappears when scrolling up (slides in, `dur-2`).

- Left: an 8px accent dot and `ABDUROZIQ.UZ` in `label` style, links home.
- Right: `BUILDING`, `WRITING` (label style links), a language switch `EN / UZ` (current
  one in ink, the other in `ink-soft`), and a theme toggle drawn as a half-filled circle.
- Mobile: dot + name left; `MENU` label right opens a full-screen paper sheet with the
  links in `display` style, language switch and theme toggle at the bottom.

### 3.2 Custom cursor

Replaces the system cursor on fine pointers only. One small element with states:

| State | Trigger | Shape |
|---|---|---|
| default | anywhere | 10px dot |
| link | `a`, `button`, `[data-cursor="link"]` | 36px ring with the dot in the centre |
| open | external links, `[data-cursor="open"]` | ring plus label `OPEN ↗` |
| read | post rows, project rows, `[data-cursor="read"]` | accent pill with label `READ` (`VIEW` on a project) |
| drag | desk objects, `[data-cursor="drag"]` | ring plus label `DRAG`; `DROP` while held |
| press | mouse down anywhere | eight short rays burst outward and fade (200ms) |
| text | inputs, long-form article text | hidden; the native I-beam shows |

The dot follows the pointer with a short lerp (about 0.22); the ring lags slightly more.
Its colour follows the surface under the pointer: ink on paper, `on-accent` on accent fills,
paper on ink, with a 1px halo in the surface colour so it also reads over photos. (A blend
mode is not used: it turns the cursor blue on the accent.)
It hides when the pointer leaves the window, and is fully disabled (native cursor kept) on
coarse pointers, under `prefers-reduced-motion`, `prefers-contrast: more` and forced colours.

### 3.3 Footer (section `04 — Contact`)

A full-bleed **accent** block, text in `on-accent`:

- Top row: label `04 — CONTACT` left, small `© 2026` right.
- Left: `Say hello` in `lead`, then the e-mail `hello@abduroziq.uz` in `title` size,
  underlined; hover thickens the underline.
- Right: social links as a mono list (GitHub, Telegram, LinkedIn, Instagram), each with `↗`.
- Tagline `Think beyond limits.` in `hand` style, slightly rotated.
- Bottom: the giant **name** again, clipped by the bottom edge, letters rising on scroll.
- A `BACK TO TOP ↑` label link, and next to it a `MOTION: ON / OFF` switch that stops every
  looping or decorative motion on the site (the tape, the capsule, the dots of the meeting,
  pulsing dots, cursor, smooth scrolling, reveals) and remembers the choice.

### 3.4 Page transition

Navigations between pages use view transitions: a paper-coloured panel wipes up from the
bottom with an accent hairline on its leading edge (`dur-4`, `ease-in-out`), the new page
then reveals its own entrance sequence. A post title morphs from its list row into the
article title when the browser supports shared-element transitions. The picture of a project
row is held instead: it stays where it is, above the panel, while the list is wiped away,
then moves and grows into the picture of the project page (`dur-3`, `ease-out`) as the panel
lifts off the rest. Reduced motion: plain cross-fade or none.

## 4. Home page

Section labels follow one pattern: `NN — NAME` in `label` style with a 24px hairline
between the number and the name, the number in `accent-text`.

### 4.1 `00 — Hello` (hero): the statement

The hero gives the visitor two things to look at, in this order: the statement, then the
object (4.2). Nothing else competes with them.

Order, top to bottom:

1. One quiet row: the section label `00 — HELLO` on the left and, opposite it, a single line
   of meta in `label` style and `ink-soft`: the city and its time now, `TASHKENT 16:39 UTC+5`.
   Minutes only, nothing ticks. Without JavaScript the line shows the city and the zone.
2. **The statement**, the page's `h1`: style `statement`, left aligned, in two tones.

   > I'm Abduroziq ◉, a product engineer
   > designing and building products,
   > from Figma to production.
   >
   > Men Abduroziq ◉, product engineerman:
   > mahsulotni Figma'dan production'gacha
   > loyihalayman va quraman.

   Three lines in both languages from tablets up, and the lines break where the sentence
   does: who, what, from where to where. The measure is 17.3em (the longest line is 16.6em),
   and from 1024px up that measure is the whole content width: the type is as large as three
   lines allow, 54px at 1024, 68px at 1280, 78px from 1440 up. Its optical size is pinned,
   so the lines keep their width in em at every size. Phones set it at 38px on six or seven
   balanced lines.

   Two tones: who he is, the name and the role, stays in `ink`; everything after it steps
   back into `ink-soft` (AA on paper in both themes). From tablets up that is exactly the
   first line against the other two, so the eye lands on the name first.

   `◉` is the only living thing in the sentence, **the capsule**: an accent pill with a 1px
   ink border, 1.3em wide and as tall as a capital letter (0.74em, standing just under the
   baseline), so it never changes the height of a line and never parts from the name. It
   rolls through four glyphs drawn like the site's arrow, in the dark ink that sits on the
   accent: design (a selection frame with its handles), code (`</>`), production (a rocket)
   and a smile. Each is held for about two seconds and rolled up and away in half a second
   with a small overshoot, like a counter wheel. The roll is one CSS loop: it runs only with
   full motion and while the hero is on screen; otherwise the pill shows the first glyph. It
   is decoration: the text of the heading is the plain sentence. (His photo appears once, on
   the polaroid in About.)
3. One quiet action, a mono label with a down arrow: `WHAT I'M BUILDING`, to the projects.

Then air (72px on a desktop), and the object.

### 4.2 The meeting

The visual centre of the first screen: full content width, on a stage that is 29% as high as
it is wide, never lower than 160px, never more than 46% of the screen's height, and on a
desktop never past the fold, so that the whole object shares the first screen with the
statement (at 1440x900, 1366x768 and 1280x720 it ends a few pixels above the fold).

- **Behind: the name.** `ABDUROZIQ` in the thin cut of the `name` style, exactly as wide as
  the content box, vertically centred on the stage, in ink at reduced strength (a 48% mix
  with paper in the light theme, 40% in the dark one: a little over 3:1 in both).
- **In front: one dotted object**, drawn on a canvas: two cursors about to touch, the way
  two hands almost touch in the famous fresco. From the left a pointing-hand cursor: a long
  index finger stretched out to the right, the thumb raised above the fist, three folded
  fingers stepping back under it, a cuff. From the right an arrow cursor with its tip
  pointing left and a little down. The tips almost meet a little right of the centre, over
  the name. Both are our own shapes, and together they are 55% of the content width (78% on
  a phone).
  They are not flat icons. Each shape is given a rounded relief (as if inflated), lit from
  the top left, and the resulting tone is reduced to a grid of dots (about 6px apart on a
  desktop, 3.4px on a phone, 1,400 dots at most): an ordered dither thins out the light
  areas and darker tones get larger dots, so the cursors read as sculpture, knuckles
  included. They are solid: every cell also carries a disc in the colour of the page, so the
  name does not show through them. In the dark theme the dots are the light and it still
  comes from the top left.
- A small accent **spark**, a twelve-point starburst that turns slowly, sits at the meeting
  point.
- Two **name tags**, as in a design tool (mono `label` size, `micro` on phones; a pill whose
  corner towards the tip is square): `Abduroziq` in ink above the finger, `AI agent` in
  accent under the arrow's tip. They are small labels of the two cursors, nothing more, and
  they are the point of the picture: the person and the agent, building together.

Behaviour:

- On load the dots fly in from scattered places and assemble, outer parts first, the two
  tips last; then the spark pops and the tags appear.
- Idle, the two cursors breathe by a pixel or two, and every 6.5 seconds they drift
  together until the tips touch and the spark flashes (it swells and throws eight short
  rays).
- Under the pointer the dots are pushed away and spring back; a press sends a ripple through
  all of them. A finger works like the pointer, and a vertical swipe still scrolls the page.
- Reduced motion: the picture is still.

Without JavaScript a static inline SVG of the same composition (the same dot field on a
coarser grid) stands in for the canvas. To assistive technology the whole stage is one image
named by a sentence.

### 4.3 `01 — About`

- Label in the left three columns; content in columns 4–11.
- Two paragraphs in `lead`: key phrases in ink, connecting words in `ink-soft`. The first
  says who he is and what he builds; the second, how he works with AI agents.
- Under them one quiet action: a mono arrow link, `HOW THIS SITE WAS BUILT →`, to the post
  about building the site. It is there only once that post is published (in the other
  language when there is no version in the reader's); the text reads complete without it,
  and the layout does not change when it is absent.
- Below that a small facts table, hairline rows, mono labels left and `body` values right:
  `ROLE`, `BASED IN`, `FOCUS`, `STACK`, `NOW`.
- **The collage** (the desk): next to the paragraphs, in the column under the label, three
  physical objects lie tilted and overlapping, each draggable with inertia inside the
  collage's box. They never cover the text in their resting positions.

| Object | Look | Detail |
|---|---|---|
| Polaroid | light frame, portrait photo, -6° | caption `Tashkent, UZ` in `hand` |
| Sticky note | `paper-raised` square, 5°, over the polaroid's corner | `Think beyond limits.` in `hand` |
| Piala | a flat illustration of an Uzbek tea bowl seen from above | hand note with a drawn arrow: `click to refill` (localised); clicking fills it and releases a little steam; a mono counter `CUPS TODAY: 3` |

While dragged an object lifts (stronger shadow, +3% scale), tilts with its velocity and
comes to rest with a small settle. Double-click resets the collage to its start layout.

Below 1024px the collage is a band of its own under the paragraphs (310px high, at most
23rem wide), still draggable by touch.

The desk is decoration: hidden from assistive technology, and nothing essential is
reachable only through it.

### 4.4 The tape

Between About and Building a strip of accent tape crosses the whole viewport at −4°,
overflowing both edges. It carries `WHAT I'M BUILDING` repeated, in Bricolage 700
uppercase outlined in ink (transparent fill, 1.5px stroke), separated by `+` marks.
It moves continuously and its speed and direction follow scroll velocity. The page
does not scroll horizontally because of it.

### 4.5 `02 — Building`

A table, one project per row, hairlines between rows:

`YEAR` (mono, `ink-soft`) | `PROJECT` (name in `title`, one line of `body` under it) |
`ROLE` (mono) | `STATUS` (dot + mono text: `● LIVE`, `◐ IN DESIGN`, `○ PLANNED`) | `→`.

- Column headers in `label` style above the first hairline.
- Hover / focus on a row: background `paper-raised`, the project name shifts 12px right,
  the arrow nudges 4px right, and a **ticket preview** (240×300 card in the project's two
  colours with its glyph, name, year and a QR-like block) follows the cursor with a soft
  lag and tilts with movement. The `LIVE` dot pulses.
- Every row is one link to the project's own page (`/projects/<slug>/`, same tab).
- Under the table, right-aligned: `ALL PROJECTS →` to `/projects/` (6.2).
- Mobile: each row stacks (year and status on one mono line, then name and description);
  no preview card.

### 4.6 `03 — Writing`

The latest three posts as **post rows** (section 5.1) and a link `ALL POSTS →`.
If there are no published posts yet the section shows one quiet row:
`The first post is being written.`

### 4.7 `04 — Contact`

The footer described in 3.3.

## 5. Blog

### 5.1 Post row (shared by home and blog index)

Hairline above; three areas:

- **Date block** (fixed 96px): weekday in `label`, day of month in `numeral`,
  month and year in `label`.
- **Body**: title in `title`, one-line description in `body` `ink-soft`, then tags as
  outlined mono chips (1px rule border, radius 999px).
- **Arrow** `↗` in `accent-text` at the right.

Hover / focus: the title shifts 12px right, the arrow moves up-right 4px, the day
numeral turns accent, and the cursor becomes `READ`. The whole row is one link.
Posts written in the other language carry a small mono badge (`UZ` / `EN`).

### 5.2 Blog index `/blog`

- Page title `WRITING` in `display`, with a mono subtitle to its right:
  `NOTES ON BUILDING PRODUCTS, DESIGN AND CODE`.
- A row of tag chips (`ALL` first); each tag has its own static page.
- Posts grouped by month: each group starts with a small ink tab (`NOVEMBER 2026`, paper
  text on ink, `label` style) sitting on a 2px ink rule, then the rows.
- Empty state as in 4.6.

### 5.3 Post page `/blog/<slug>`

A classic, calm reading page.

- Centred header: mono line (date · reading time · language), then the title in
  `article-title` (balanced wrapping, max 20ch per line feel), then a small author row
  (round portrait 28px + name in `label`).
- Body column 680px, `article-body`. The first paragraph starts with a **drop cap**
  (Bricolage 700, three lines).
- `h2` headings are numbered automatically: a mono `01` in `accent-text`, a 24px hairline,
  then the heading in `title`. `h3` is `body` size, weight 600.
- Links underlined in `accent-text`. Lists with hanging markers. Footnotes in mono.
- Pull quotes (`<blockquote>`) are set in Newsreader italic `lead` size and, on desktop,
  hang 120px outside the column to the right with a 2px accent rule.
- Images span the column (wide ones may span 920px), with a mono caption.
- Code blocks: Geist Mono 14px on `paper-raised`, 1px rule border, 10px radius, a mono
  language tag top right, horizontal scroll, light and dark syntax themes.
- Desktop only: a thin vertical **progress line** in the left margin that fills with
  accent as the article is read, with the post title rotated 90° next to it in `label`.
- End of article: tags, a `COPY LINK` action, then `MORE ENTRIES` with the previous and
  next post side by side (title in `title`, hairline frame, arrow), then the footer.

## 6. Projects and other pages

The two project pages show the work itself: the pictures, large, and the names. Everything
else on them is quiet.

### 6.1 Project picture (shared by the list and the project page)

Every project has one picture, in the shape of a desktop screenshot (16:10), inside a
**frame**: a 1px border and nothing else. No radius, no shadow, no browser or device drawn
around it. In the light theme the border is `ink`: it disappears into a dark screenshot and
draws a pale one on the paper. In the dark theme it is ink at 30% over paper, enough for a
dark interface not to dissolve into the page.

What stands in the frame is decided from the file itself, not by a field:

| Picture | How it is shown |
|---|---|
| A landscape screenshot (raster, at least 1.25 times as wide as it is high) | fills the frame edge to edge |
| Anything else: a phone screenshot, a square panel, an illustration (every SVG) | **contained**: at a size of its own, centred on a **matte** in the project's background colour, taking at most 84% of the stage in either direction. The stage is 16:10; a wide strip shapes its own stage; on phones a tall picture gets a stage up to 4:5. A screenshot on a matte gets a faint hairline of its own. SVGs are served untouched, so an animated illustration keeps playing |
| No picture yet | **the plate**: the ticket of 4.5 laid on its side. The project's background colour; its glyph in condensed display type in its foreground colour, standing on the bottom edge and about two thirds of the plate high; `NO. 03` and the year in `micro` along the top; a tear-off stub behind a dashed perforation with `ADMIT ONE`, a QR-like block and a barcode. Decorative |

A phone screenshot is therefore never blown up to the full width: on a desktop it stands
about as large as the phone it was taken on.

### 6.2 Projects list `/projects`

- Page title `BUILDING` in `display` with the mono subtitle to its right: the same head as
  the blog index (5.2), so the inner pages open alike.
- Then one row per project, in order, hairlines between the rows. A row gives two things to
  look at, **the name and the picture**:
  - From 1024px: the text in columns 1–5, the picture (6.1) in columns 6–12. The text is as
    tall as the picture. At its top: a mono line with the year and the status (dot + text),
    the name in the `title` style one step up (32 → 56px) with an arrow in `accent-text`
    opposite it, and the one-sentence summary in `body` `ink-soft`. On its bottom edge two
    mono lines: the role in ink, and the first three names of the stack in `ink-soft`
    separated by `/`, then `+N` for the rest.
  - Below 1024px the row stacks: the picture at the full content width, then the same text.
- The whole row is one link to the project page (`/projects/<slug>/`). Hover / focus: the
  name shifts 12px right, the arrow nudges 4px, the cursor becomes the accent pill with
  `VIEW`. The picture does not react. Following a row takes its picture along (3.4).
- The first row shares the first screen with the title; its picture is the page's largest
  paint, loads first and is never revealed. Rows from the third on rise once (7.2).

### 6.3 Project page `/projects/<slug>`

Like the home page, a project opens with a statement and an object.

1. **Head.** `← ALL PROJECTS` in `label`, then the name, the page's `h1`, in the `statement`
   style, and the one-sentence summary in `lead` `ink-soft`. From 1280px the name takes the
   left half and the summary the right half, standing on the same bottom line; below that
   the summary sits under the name.
2. **The cover** in its frame (6.1), at the full content width, directly under the head. It
   is the page's largest paint: loaded first, never revealed.
3. **Facts and text**, side by side from 1024px (facts in columns 1–4, text in columns
   6–12); below that the facts come first.
   - Facts: set like the facts of 4.3, hairline rows with a mono label on the left and the
     value on the right: `YEAR`, `ROLE`, `STATUS` (dot + mono text), `STACK` (every name, as
     one running list). Under the table the links out as mono arrow links: `OPEN THE SITE ↗`,
     `SOURCE CODE ↗`. The column stays in view while a longer text scrolls past.
   - Text: the article typography of the blog (5.3) at its 680px measure: numbered `h2`
     headings, serif body, code blocks. It starts level with the facts.
   - A project without a cover shows its plate at the head of the facts column instead of a
     full-width picture. The page is then one compact sheet, object and facts on the left
     and text on the right, and nothing pretends there is something to show.
4. **Gallery.** Every picture in its frame at the full content width, one under the other,
   40 → 80px apart, each with its caption under it in the mono caption style of the blog's
   figures. Contained pictures stand on their matte (6.1). A video sits in the same frame
   with the browser's own controls and never starts by itself; it follows the picture rules
   by the width and height stated for it (a landscape clip fills the frame, a phone
   recording stands on the matte). Each figure rises once as it is scrolled to.
5. **End.** One link to follow, between two ink hairlines: `NEXT PROJECT` in `label` and the
   next project's name in the `statement` style, an arrow in `accent-text` opposite it
   (hover as in 6.2). Under it, quiet and mono: `← ALL PROJECTS` on the left and
   `← PREVIOUS PROJECT: NAME` on the right. The last project has no next one: there the
   large link is `All projects` under the label `MORE PROJECTS`. Then the footer.

Left out on purpose: browser chrome and device mock-ups around screenshots, a lightbox or
zoom, carousels, tags and filters, hover effects on pictures, a second column of pictures.

### 6.4 Other pages

- **404**: an ink band. Giant `404` in `name` style, the line
  `This page was dragged somewhere else.`, a link home, and three desk objects to throw
  (a sticky note, the piala, and a single dark keycap with the legend `ESC`). From 1024px
  they lie on the band itself, across the digits; below 1440px, where the band is lower,
  the piala and the keycap stay on the digits, clear of the line and the link.
  It is built once per language (`/404.html` and `/uz/404.html`), so a missing Uzbek path
  gets a page that is Uzbek from header to footer.
- **Tag page** `/blog/tag/<tag>`: same as the blog index with the tag as the title.

## 7. Motion

### 7.1 Entrance sequence (home, first load)

Total about 1.5s, starting immediately. The statement is the page's largest paint: it and
the action are simply there from the first frame and are never hidden or moved. Nothing
waits for fonts. Little enters, and it leads the eye from the sentence to the object:

1. 100ms: the capsule pops into the sentence with the spring. The name's letters rise from the
   baseline (35ms stagger, `dur-4`). The dots of the meeting fly in from scattered places
   and assemble (about 1.2s).
2. About 1.05s: the spark pops and flashes, and the two name tags appear.

After a client-side navigation the same sequence waits for the page-transition panel. Where
frames do not come (a hidden tab, a view that is not painting) everything is put in its
final state instead, and the first frame of the canvas is always drawn at once.

### 7.2 On scroll

- Text blocks marked for reveal rise line by line when they enter the viewport, once.
- Table rows and post rows fade and rise 16px, 60ms stagger. Project rows (from the third)
  and the figures of a project's gallery rise the same way, one by one.
- The tape reacts to scroll velocity (4.4). The footer name rises as it enters.
- Smooth scrolling is light: it must not feel floaty and must not hijack the wheel.

### 7.3 Rules

- Animate only `transform`, `opacity`, `clip-path`. No layout-triggering animation. The
  meeting is a canvas: it repaints only itself.
- Everything respects `prefers-reduced-motion: reduce`: no entrance choreography (content
  simply present), no smooth scrolling, no cursor replacement, no tape motion, no
  parallax. Dragging desk objects still works but without inertia.
- No animation may run while its element is off screen.
- Largest-paint candidates (a page's main heading, its first image, the first rows of a
  list) never carry a reveal. Content that is prepared for a reveal is shown by a CSS
  failsafe after 1s if the motion kit has not taken over.
- Budget: home page JavaScript at most about 110KB gzip in total; fonts about 160KB on
  the home page (Bricolage Grotesque keeps all its axes; one mono cut; the hand face for the
  notes of the collage; no serif there); Lighthouse performance 95+ on mobile.

## 8. Accessibility

- Contrast: AA for all text. Never use raw accent for text on paper in light mode.
- Every interactive element has a visible focus ring: 2px `ink` outline with 3px offset
  (2px `on-accent` on accent fills).
- Keyboard: skip link to main content; header menu, language switch and theme toggle
  reachable and operable; rows are single links; desk objects are not focusable.
- The cursor replacement never hides the pointer from users who need the native one
  (coarse pointer, reduced motion, forced colours).
- Language switch links carry `hreflang` and `lang`; each page sets `<html lang>`.

## 9. Do not

- No gradients, glassmorphism, glow, neon, noise textures or 3D.
- No second accent colour, no coloured section backgrounds other than accent and ink.
- No stock photos, no emoji, no icon library: the only icons are `↗ → ↑ +` and simple
  drawn glyphs.
- No carousels, no modals, no cookie banner, no newsletter pop-up.
- No scroll-jacking, no forced preloader, no autoplaying sound.
- No rounded cards around content sections; hairlines only.

## 10. References

Chosen by Abduroziq from the Pinterest research on 2026-11-12 (the hero set on 2026-11-13;
the same day he asked for fewer elements and one focus, which is why some rows take little).
Study them for spirit and specific mechanisms, do not copy layouts or assets.

| Tag | What we take | Pin |
|---|---|---|
| G5 | the hero statement: a strong sans sentence with one small living thing set between the words, and one action. (Its interface mock-ups in the sentence were tried and removed: too many elements.) | https://www.pinterest.com/pin/1145532855388689066/ |
| G4 | nothing at present: its word chips in a pixel face were tried as meta chips and removed with the rest of the hero's extras | https://www.pinterest.com/pin/418905202857811443/ |
| J5 | the starburst, now only as the spark at the meeting point (the starburst letter and the hand-drawn ring were removed) | https://www.pinterest.com/pin/311452130503713124/ |
| K2 | a calm statement, small meta top right, and one large graphic of two hands almost touching, drawn entirely in halftone dots (the meeting) | https://www.pinterest.com/pin/873135446555194011/ |
| K5 | one large thin uppercase word with an object in front of its letters (the thin name behind the cursors) | https://www.pinterest.com/pin/914019686862529481/ |
| M4 | a tilted polaroid with handwriting, used with restraint (the collage in About) | https://www.pinterest.com/pin/806988827623913186/ |
| A1 | diagonal tape, accent footer with the name repeated edge to edge | https://www.pinterest.com/pin/422142165088564609/ |
| B4 | `00 — HELLO` section labels, quiet text-first tone, projects as a hairline table | https://www.pinterest.com/pin/267682771592216706/ |
| D4 | draggable objects with hand-written notes and arrows, one clickable gag (the collage, the 404 page) | https://www.pinterest.com/pin/358106607885884186/ |
| D8 | cursor states: dot, ring, burst | https://www.pinterest.com/pin/324399979416928177/ |
| E4 | date-numbered rows grouped under month tabs, chips, arrows | https://www.pinterest.com/pin/884746289440045350/ |
| E8 | centred serif article header, drop cap, numbered subheads, hanging quotes, vertical side label, prev/next strip | https://www.pinterest.com/pin/815644182552169678/ |
