# Design specification

The single source of truth for how abduroziq.uz looks, reads and moves. Implementation
details (files, APIs, contracts) live in [ARCHITECTURE.md](ARCHITECTURE.md).

## 1. Concept: "Statement & Meeting"

Abduroziq is a product engineer: he designs products and builds them, from Figma to
production, and he works with AI agents every day. The site is a quiet, type-first page (ink
on paper, hairlines, one accent) with exactly three loud ideas:

1. **The statement.** The introduction is one large sentence in the brand sans with living
   things inside it: small chips set on the line, a letter that is a turning starburst, a
   word circled by hand.
2. **The meeting.** Under it his name runs edge to edge, thin and calm, and in front of the
   name stands one large dotted graphic: a hand cursor and an arrow cursor about to touch.
   The person and the agent.
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
  aimlessly. The few loops are small and slow (the chips of the statement, the starbursts,
  the breathing cursors, the tape, the clock) and all of them stop with the motion switch.
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
| `accent` | `#E28413` | `#E28413` | fills: tape, footer, name tags, starbursts, the eyes chip, cursor burst |
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
| Pixel | **Geist Pixel** Square (Basic Latin subset) | the meta chips of the hero only |
| Hand | **Caveat** 500 (Latin subset) | desk annotations only, never for UI |

All fonts are self-hosted and subset. Uzbek Latin needs `ʻ` (U+02BB) and `ʼ` (U+02BC) in
addition to Basic Latin: verify each face has them and fall back to `'` typography in copy
if one does not.

Scale (fluid with `clamp()`; values are min at 360px and max at 1440px):

| Style | Family | Size | Line | Tracking | Weight |
|---|---|---|---|---|---|
| `name` | Bricolage, `wdth` 100 | fit to container width (about 17.5vw) | 0.8 | -0.045em | 500, uppercase |
| `name`, thin cut | Bricolage, `wdth` 100 | fit to container width (about 21vw) | 0.8 | -0.02em | 250, uppercase (behind the meeting in the hero) |
| `statement` | Bricolage | 38 → 76px | 1.02 | -0.035em | 500 |
| `display` | Bricolage, `wdth` 75 | 56 → 168px | 0.86 | -0.02em | 400, uppercase (page titles such as WRITING) |
| `numeral` | Bricolage, `wdth` 75 | 44 → 72px | 0.9 | 0 | 300 (date day numbers) |
| `title` | Bricolage | 24 → 40px | 1.08 | -0.02em | 500 |
| `lead` | Bricolage | 22 → 34px | 1.22 | -0.015em | 400 |
| `body` | Bricolage | 16 → 18px | 1.55 | 0 | 400 |
| `article-title` | Newsreader | 34 → 64px | 1.06 | -0.015em | 400 |
| `article-body` | Newsreader, `opsz` auto | 19 → 21px | 1.6 | 0 | 400 |
| `label` | Geist Mono | 11 → 12px | 1.3 | 0.08em | 500, uppercase |
| `micro` | Geist Mono | 9 → 10px | 1.25 | 0.04em | 400, uppercase (the print on a project ticket) |
| `pixel` | Geist Pixel | 12 → 13px | 1 | 0.02em | 400, uppercase (the hero's meta chips only) |
| `hand` | Caveat | 20 → 26px | 1.1 | 0 | 500 |

### 2.3 Space, grid, shape

- 12-column grid, max content width 1440px, side padding 16px (mobile) / 24px (tablet) /
  40px (desktop), column gap 16 / 24px.
- Section rhythm: 96px (mobile) → 176px (desktop) between sections. Space is the main
  layout tool; do not fill it.
- Hairlines are 1px `rule`. Tables and rows are separated by hairlines only, never boxes.
- Radius: `0` for tape, bands, table rows and box chips; `999px` for capsules, pills, name
  tags and the cursor; `10px` for desk cards and code blocks (small drawn frames, such as
  the chips of the statement, use 10px or less in proportion to their size). Nothing else.
- Shadows: only desk objects (`0 1px 0 rgb(0 0 0 / .06), 0 10px 24px -12px rgb(0 0 0 / .35)`,
  stronger while dragged).

### 2.4 Motion tokens

| Token | Value | Use |
|---|---|---|
| `dur-1` | 160ms | hover colour, cursor state |
| `dur-2` | 320ms | row shifts, chips, toggles |
| `dur-3` | 700ms | text reveals, the drawn ring |
| `dur-4` | 1100ms | giant name, page transition |
| `ease-out` | `cubic-bezier(0.16, 1, 0.3, 1)` | default for entrances |
| `ease-in-out` | `cubic-bezier(0.65, 0, 0.35, 1)` | wipes, page transition |
| `spring` | GSAP `elastic.out(1, 0.6)` / `back.out(1.6)` | chips, starburst, object drop-in |

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
| read | post rows, `[data-cursor="read"]` | accent pill with label `READ` |
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
  looping or decorative motion on the site (the tape, the loops in the statement's chips,
  the starbursts, the dots of the meeting, pulsing dots, cursor, smooth scrolling, reveals)
  and remembers the choice.

### 3.4 Page transition

Navigations between pages use view transitions: a paper-coloured panel wipes up from the
bottom with an accent hairline on its leading edge (`dur-4`, `ease-in-out`), the new page
then reveals its own entrance sequence. A post title morphs from its list row into the
article title when the browser supports shared-element transitions. Reduced motion: plain
cross-fade or none.

## 4. Home page

Section labels follow one pattern: `NN — NAME` in `label` style with a 24px hairline
between the number and the name, the number in `accent-text`.

### 4.1 `00 — Hello` (hero): the statement

The hero has two zones with one idea each: the statement, then the meeting (4.2). Nothing
else lives there.

Order, top to bottom:

1. Section label `00 — HELLO`. From tablets up the **meta chips** (below) sit in the same
   row, right aligned; on phones they close the hero, under the meeting.
2. **The statement**, the page's `h1`: style `statement`, left aligned, at most 13.6em wide.
   That is four lines in both languages and about 9 of the 12 columns on a desktop; phones
   take more lines.

   > I'm Abduroziq ◉, a product engineer who designs ▢ interfaces, builds ▢ systems and
   > ships products.
   >
   > Men Abduroziq ◉, product engineerman: ▢ interfeys chizaman, ▢ tizim quraman va
   > mahsulot chiqaraman.

   All of it is ink: no emphasis, no second text colour. The life is inside the sentence:

   - **Chips** (`◉`, `▢`): small drawings set on the line, as tall as a capital letter
     (0.74em, standing just under the baseline) and 1.4 to 1.5em wide. They never change the
     height of a line and never part from the word they touch.
     - Eyes (`◉`): a drawn stand-in for him, two eyes on an accent pill with a 1px ink
       border. They follow the pointer, look around on their own when it rests (and on touch
       screens), blink, and wink when clicked. Without JavaScript they glance at the name
       beside them. (His photo appears once, on the polaroid in About.)
     - Design (first `▢`): a tiny interface frame (`paper-raised`, 1px ink border) with a
       title, two lines of text and a block inside an accent selection box with handles. A
       multiplayer cursor holds the block's corner and resizes it in a slow loop. The
       cursor's accent name tag reads `Abduroziq` and hangs out of the frame; below 768px
       the tag is left out, because it could not be read.
     - Build (second `▢`): a tiny terminal (ink fill, paper text, mono). `$ git push` is
       typed letter by letter, the answer is an accent tick and `live`, then it starts over.
   - **The star letter**: one `o` (in `products`, in `mahsulot`) is drawn as a twelve-point
     accent starburst that turns slowly. The letter itself stays in the markup, unseen, for
     search engines and screen readers.
   - **The ring**: one word (`ships`, `chiqaraman`) is circled by a hand-drawn accent
     ellipse that overshoots its own start, as a pen would.

   The text of the heading is the plain sentence: chips, star and ring are decoration.
3. One supporting line in `body`, `ink-soft`: `From Figma to production, in Tashkent.`
4. Two text actions, each a mono label with a down arrow: `SAY HELLO` (to the contact
   section) and `WHAT I'M BUILDING` (to the Building section).

**Meta chips**: a short row of three small chips of different shapes and tones, 26px high,
in the `pixel` style:

| Chip | Shape | Content |
|---|---|---|
| Availability | outlined pill | a pulsing accent dot and `AVLB NOV.2026`; the month updates itself |
| Tashkent now | square `paper-raised` box | the sky capsule and the live time, `20:47:13 UTC+5` |
| Place | rounded ink chip | `41.2995° N 69.2401° E` |

The sky capsule is a flat sky that is paper-light by day and ink-dark by night according to
the real local time (UTC+5), accent for the half hour around sunrise and sunset, with a small
sun or moon dot placed along its arc and the outline of a skyline. The chips are label
shorthand: assistive technology gets one plain sentence instead.

### 4.2 The meeting

Across the lower part of the first screen, full content width, on a stage that is 26% as
high as it is wide (never lower than 160px):

- **Behind: the name.** `ABDUROZIQ` in the thin cut of the `name` style, exactly as wide as
  the content box, vertically centred on the stage, in ink at reduced strength (a 48% mix
  with paper in the light theme, 40% in the dark one: a little over 3:1 in both).
- **In front: one dotted graphic**, drawn on a canvas: two cursors about to touch, the way
  two hands almost touch in the famous fresco. From the left a pointing-hand cursor with its
  index finger stretched out to the right; from the right an arrow cursor with its tip
  pointing left and a little down. The tips almost meet a little right of the centre, over
  the name. Both are our own shapes.
  They are not flat icons. Each shape is given a rounded relief (as if inflated), lit from
  the top left, and the resulting tone is reduced to a grid of dots (about 6px apart on a
  desktop, 3.4px on a phone, 1,300 dots at most): an ordered dither thins out the light
  areas and darker tones get larger dots, so the cursors read as sculpture, knuckles
  included. They are solid: every cell also carries a disc in the colour of the page, so the
  name does not show through them. In the dark theme the dots are the light and it still
  comes from the top left.
- A small accent **starburst** (the twelve points of the star letter) sits at the meeting
  point.
- Two **name tags**, as in a design tool (mono, a pill whose corner towards the tip is
  square): `Abduroziq` in ink above the finger, `AI agent` in accent under the arrow's tip.
  This is the point of the picture: the person and the agent, building together.

Behaviour:

- On load the dots fly in from scattered places and assemble, outer parts first, the two
  tips last; then the starburst pops and the tags appear.
- Idle, the two cursors breathe by a pixel or two, and every 6.5 seconds they drift
  together until the tips touch and the starburst flashes (it swells and throws eight short
  rays).
- Under the pointer the dots are pushed away and spring back; a press sends a ripple through
  all of them. A finger works like the pointer, and a vertical swipe still scrolls the page.
- Reduced motion: the picture is still.

Without JavaScript a static inline SVG of the same composition (the same dot field on a
coarser grid) stands in for the canvas. To assistive technology the whole stage is one image
named by a sentence.

### 4.3 `01 — About`

- Label in the left three columns; content in columns 4–11.
- One paragraph in `lead`: key phrases in ink, connecting words in `ink-soft`.
- Under it a small facts table, hairline rows, mono labels left and `body` values right:
  `ROLE`, `BASED IN`, `FOCUS`, `STACK`, `NOW`.
- **The collage** (the desk): next to the paragraph, in the column under the label, three
  physical objects lie tilted and overlapping, each draggable with inertia inside the
  collage's box. They never cover the text in their resting positions.

| Object | Look | Detail |
|---|---|---|
| Polaroid | light frame, portrait photo, -6° | caption `Tashkent, UZ` in `hand` |
| Sticky note | `paper-raised` square, 5°, over the polaroid's corner | `Think beyond limits.` in `hand` |
| Piala | a flat illustration of an Uzbek tea bowl seen from above | hand note with a drawn arrow: `click to refill` (localised); clicking fills it and releases a little steam; a mono counter `CUPS TODAY: 3` |

While dragged an object lifts (stronger shadow, +3% scale), tilts with its velocity and
comes to rest with a small settle. Double-click resets the collage to its start layout.

Below 1024px the collage is a band of its own under the paragraph (310px high, at most
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
`ROLE` (mono) | `STATUS` (dot + mono text: `● LIVE`, `◐ IN DESIGN`, `○ PLANNED`) | `↗`.

- Column headers in `label` style above the first hairline.
- Hover / focus on a row: background `paper-raised`, the project name shifts 12px right,
  the arrow rotates 45°, and a **ticket preview** (240×300 card in the project's two
  colours with its glyph, name, year and a QR-like block) follows the cursor with a soft
  lag and tilts with movement. The `LIVE` dot pulses.
- Rows with a URL are links to it; others are not links and show no arrow.
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

## 6. Other pages

- **404**: an ink band. Giant `404` in `name` style, the line
  `This page was dragged somewhere else.`, a link home, and three desk objects to throw
  (a sticky note, the piala, and a single dark keycap with the legend `ESC`).
  It is built once per language (`/404.html` and `/uz/404.html`), so a missing Uzbek path
  gets a page that is Uzbek from header to footer.
- **Tag page** `/blog/tag/<tag>`: same as the blog index with the tag as the title.

## 7. Motion

### 7.1 Entrance sequence (home, first load)

Total about 1.8s, starting immediately. The statement is the page's largest paint: it, the
supporting line and the actions are simply there from the first frame and are never hidden
or moved. Nothing waits for fonts. The entrance is spent on what surrounds them:

1. 100ms: the three chips of the statement pop with the spring, 110ms apart. The name's
   letters rise from the baseline (35ms stagger, `dur-4`). The dots of the meeting fly in
   from scattered places and assemble (about 1.2s).
2. 300ms: the meta chips fade in.
3. 550ms: the ring draws itself around its word (`dur-3`).
4. 950ms: the starburst pops into its letter. At about 1.05s the starburst of the meeting
   pops and flashes, and the two name tags appear.

After a client-side navigation the same sequence waits for the page-transition panel. Where
frames do not come (a hidden tab, a view that is not painting) everything is put in its
final state instead, and the first frame of the canvas is always drawn at once.

### 7.2 On scroll

- Text blocks marked for reveal rise line by line when they enter the viewport, once.
- Table rows and post rows fade and rise 16px, 60ms stagger.
- The tape reacts to scroll velocity (4.4). The footer name rises as it enters.
- Smooth scrolling is light: it must not feel floaty and must not hijack the wheel.

### 7.3 Rules

- Animate only `transform`, `opacity`, `clip-path` (and the dash offset of the drawn ring).
  No layout-triggering animation. The meeting is a canvas: it repaints only itself.
- Everything respects `prefers-reduced-motion: reduce`: no entrance choreography (content
  simply present), no smooth scrolling, no cursor replacement, no tape motion, no
  parallax. Dragging desk objects still works but without inertia.
- No animation may run while its element is off screen.
- Largest-paint candidates (a page's main heading, its first image, the first rows of a
  list) never carry a reveal. Content that is prepared for a reveal is shown by a CSS
  failsafe after 1s if the motion kit has not taken over.
- Budget: home page JavaScript at most about 110KB gzip in total; fonts about 180KB on
  the home page (Bricolage Grotesque keeps all its axes; the serif is not loaded there; the
  pixel face is an 11KB subset); Lighthouse performance 95+ on mobile.

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

Chosen by Abduroziq from the Pinterest research on 2026-11-12 (the hero set on 2026-11-13).
Study them for spirit and specific mechanisms, do not copy layouts or assets.

| Tag | What we take | Pin |
|---|---|---|
| G5 | the hero statement: a strong sans sentence with small interface mock-ups set between the words, each with a multiplayer cursor tag; one supporting line, two actions | https://www.pinterest.com/pin/1145532855388689066/ |
| G4 | words in chips of different shapes, set in a pixel face (the hero's meta chips) | https://www.pinterest.com/pin/418905202857811443/ |
| J5 | a letter `o` replaced by a turning starburst, a word circled by a hand-drawn ellipse | https://www.pinterest.com/pin/311452130503713124/ |
| K2 | a calm statement, small meta top right, and one large graphic of two hands almost touching, drawn entirely in halftone dots (the meeting) | https://www.pinterest.com/pin/873135446555194011/ |
| K5 | one large thin uppercase word with an object in front of its letters (the thin name behind the cursors) | https://www.pinterest.com/pin/914019686862529481/ |
| M4 | a tilted polaroid with scribbles and handwriting, used with restraint (the ring; the collage in About) | https://www.pinterest.com/pin/806988827623913186/ |
| A1 | diagonal tape, accent footer with the name repeated edge to edge | https://www.pinterest.com/pin/422142165088564609/ |
| B4 | `00 — HELLO` section labels, quiet text-first tone, projects as a hairline table | https://www.pinterest.com/pin/267682771592216706/ |
| D4 | draggable objects with hand-written notes and arrows, one clickable gag (the collage, the 404 page) | https://www.pinterest.com/pin/358106607885884186/ |
| D8 | cursor states: dot, ring, burst | https://www.pinterest.com/pin/324399979416928177/ |
| E4 | date-numbered rows grouped under month tabs, chips, arrows | https://www.pinterest.com/pin/884746289440045350/ |
| E8 | centred serif article header, drop cap, numbered subheads, hanging quotes, vertical side label, prev/next strip | https://www.pinterest.com/pin/815644182552169678/ |
