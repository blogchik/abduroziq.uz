# Motion kit

Shared motion for abduroziq.uz. Markup opts in through data attributes; the kit initialises
on every `astro:page-load` and releases everything it created for a page on
`astro:before-swap`. The contract is docs/ARCHITECTURE.md section 7; the look and timing
come from docs/DESIGN.md (2.4, 3.2, 3.4, 4.2, 4.4, 4.5, 5.3, 7, 8).

Test pages (dev only): `/lab/motion/` and `/lab/motion-2/` (`src/dev-pages/lab/`), with a
switch for `localStorage.motion`.

## Rules for authors

- **Content first.** Write the final, readable markup. Without JavaScript and under
  `data-motion="reduced"` every element shows exactly as written. Do not hide or offset
  content yourself for an entrance: put a `data-reveal` on it.
- **Animated elements belong to the kit.** The kit sets `transform` and `opacity` inline on
  `data-reveal`, `data-reveal-item`, `data-draggable`, `data-magnetic`, the marquee track and
  the follower panel. Put your own transforms (rotation, centring) on a wrapper or a child.
- **One mode per element.** Do not nest `data-reveal` inside another `data-reveal`.
  Text reveals (`lines`, `words`, `chars`) split the text and restore the original markup
  when they finish; do not attach JavaScript to elements inside them.
- **Decoration is hidden from assistive technology.** Desks, follower panels and other
  purely visual parts carry `aria-hidden="true"`; nothing essential lives only there.
  The kit itself adds nothing focusable (its cursor and wipe panel are `aria-hidden`,
  marquee clones are `inert`).
- **Values come from `config.ts`.** Durations and easings (DESIGN 2.4) are defined there
  once. In GSAP use the names `motionOut` and `motionInOut` (registered by the kit) or
  import `dur` / `ease` from `@/motion/config`.

## Attributes

### `data-reveal="lines|words|chars|rise|fade"`

Plays once when the element enters the viewport (`top 88%`); elements already on screen
play as soon as the page is ready (after the page transition). Optional
`data-reveal-delay="0.2"` (seconds).

- `lines`: lines rise from behind a mask, 80ms stagger. `words`: words rise, 30ms stagger.
  `chars`: letters rise, 35ms stagger, `dur-4`. SplitText with `autoSplit` (re-splits on
  resize and font load), reverted when done.
- `chars` with letters already wrapped by a component (`[data-giant-letter]` or
  `[data-char]`, each inside an `overflow: hidden` mask): those spans are animated as they
  are, no SplitText.
- `rise`: opacity and 16px rise. `fade`: opacity only.

```html
<h1 data-reveal="lines">One large serif sentence.</h1>
<p data-reveal="rise" data-reveal-delay="0.3">Supporting line.</p>
```

### `data-reveal-group` + `data-reveal-item`

Items fade and rise 16px with a 60ms stagger, batched as they enter (long lists work).
`data-reveal-delay` on the group applies to every batch.

```html
<ul data-reveal-group>
  <li data-reveal-item>…</li>
  <li data-reveal-item>…</li>
</ul>
```

### `data-cursor="link|open|read|drag|text|hide"` and `data-cursor-label`

The cursor (fine pointers, full motion, no forced colours) picks its state from the
closest `data-cursor`, else automatically: `a[href]` → `link` (`open` with the label
`OPEN ↗` for external links, `target="_blank"` or `rel="external"`), buttons, labels and
selects → `link`, text fields → `text` (native I-beam), long-form text inside `.prose`
(or any `[data-cursor-text]`) → `text`. `drag` shows `DRAG`, and `DROP` while pressed.
`read` is the accent pill. `hide` hides it and shows the native cursor.

```html
<a href="/blog/post/" data-cursor="read">…</a>
<div data-cursor="link" data-cursor-label="Play">…</div>
```

### `data-marquee` + `data-marquee-track`

The track's children are cloned (inert, `aria-hidden`) until the loop is seamless.
`data-marquee-speed` in px per second (default 60; negative runs the other way),
`data-marquee-scroll` makes speed and direction follow the scroll velocity and ease back.
Runs only while on screen; static under reduced motion. The kit sets
`[data-marquee] { overflow: hidden }` and makes the track a `max-content` flex row.

```html
<div data-marquee data-marquee-scroll data-marquee-speed="80">
  <div data-marquee-track><span>What I'm building</span><span aria-hidden="true">+</span></div>
</div>
```

### `data-desk` + `data-draggable`

Objects are absolutely placed by the kit from `data-x`, `data-y` (percent of the desk for
the object's top-left corner, kept inside the desk) and `data-rotate` (degrees). They can
be thrown inside the desk (Draggable + InertiaPlugin, loaded only on pages with a desk),
lift while held (scale and `data-dragging`, use it for the stronger shadow), tilt with
the velocity, settle on landing and come to the front. Double-click on the desk resets
the layout; poses survive resizes. `data-desk-entrance="1.1"` drops the objects in one
after another (the value is a delay in seconds). Interactive children (a button) still
receive clicks when the object was not dragged, never after a drag. Touch drags the
objects (`touch-action: none` is on them only, so the page still scrolls elsewhere).
Reduced motion: plain dragging, no inertia, lift, tilt or entrance.

Without JavaScript the kit's placement does not apply: give the desk a static layout of
its own (or accept the objects in normal flow).

```html
<div data-desk data-desk-entrance="1.1" aria-hidden="true">
  <div
    data-draggable
    data-x="62"
    data-y="12"
    data-rotate="2"
    data-cursor="drag"
    class="data-[dragging]:shadow-…"
  >
    Think beyond limits.
  </div>
</div>
```

### `data-follower-scope` / `data-follower-item` / `data-follower-panel` / `data-follower-for`

While an item is hovered (or focused), the panel follows the pointer with a soft lag and
tilts with its velocity, showing only the child whose `data-follower-for` matches.
The panel is fixed, `pointer-events: none` and hidden by default; it never shows on
coarse pointers or under reduced motion.

```html
<section data-follower-scope>
  <a href="…" data-follower-item="atlas">Atlas</a>
  <div data-follower-panel aria-hidden="true">
    <div data-follower-for="atlas">…ticket…</div>
  </div>
</section>
```

### `data-progress` + `data-progress-target="<selector>"`

Sets `--progress` (0 to 1) on the element while the target scrolls from its top at the
top of the viewport to its bottom at the bottom. `data-progress-start` /
`data-progress-end` take ScrollTrigger positions. Works in both motion modes.

```html
<div data-progress data-progress-target="#article" aria-hidden="true">
  <span style="transform: scaleY(var(--progress, 0))"></span>
</div>
```

### `data-magnetic`

A subtle pull toward the pointer while it is over the element (strength 0.25, or the
attribute value), springing back on leave. Fine pointers, full motion.

```html
<a href="mailto:…" data-magnetic>Say hello</a>
```

## Global behaviour

- **Root state** on `<html>`: `data-scroll-dir="up|down"` and `data-scrolled` (after 80px),
  re-applied after every swap. `data-motion`, `data-theme` and `js` come from BaseLayout.
  While the custom cursor is active the kit adds `data-cursor-active` (native cursor
  hidden) and `data-cursor-native` (native cursor shown again, for text and `hide`).
- **Smooth scroll**: one Lenis instance (lerp 0.14, native wheel speed, native touch),
  loaded only for fine pointers with full motion. Anchors work, back/forward keeps its
  position, new pages start at the top. Use `data-lenis-prevent` on nested scrollers.
  The `site:menu` event (`detail.open`) stops and restarts it.
- **Page transition**: a paper panel with an accent hairline wipes up over the old page,
  the swap happens underneath, the panel leaves, then the new page's entrances run.
  No panel under reduced motion.
- **Failsafe**: prepared (hidden) states live in `motion.css`, scoped to
  `html.js[data-motion='full']`, and a CSS animation shows everything after 2.5s if the
  kit never takes over.

## JavaScript API (`@/motion`)

```ts
onPageEnter(cb: (ctx: { reduced: boolean }) => void | (() => void)): void;
prefersReducedMotion(): boolean; // reads <html data-motion>
splitLines(el: Element): { lines: Element[]; revert(): void }; // masked lines
export { gsap, ScrollTrigger };
```

`onPageEnter` callbacks run on every page load, inside the page's `gsap.context`: tweens,
timelines, ScrollTriggers and splits created in them are reverted automatically when the
page is left, and a returned function runs then too (remove your own listeners there).
A page script runs once per session, so its callback stays registered for the whole
session: **return early when your elements are not on the page.** SplitText is loaded
before callbacks run, so `splitLines` is safe inside them.

```ts
<script>
  import { gsap, onPageEnter, splitLines } from '@/motion';

  onPageEnter(({ reduced }) => {
    const title = document.querySelector('[data-hero-title]');
    if (!title || reduced) return; // not this page, or content stays as written
    const { lines, revert } = splitLines(title);
    gsap.from(lines, {
      yPercent: 110,
      stagger: 0.08,
      duration: 0.7,
      ease: 'motionOut',
      onComplete: revert,
    });
  });
</script>
```

A page timeline runs after its page has loaded (and after SplitText), so an element it
hides was briefly visible before. For above-the-fold choreography prefer the attributes;
if you need a custom one, run it on elements that start below the fold or accept that
the first frame shows the final state.

## Modules

| File                                        | Role                                                               |
| ------------------------------------------- | ------------------------------------------------------------------ |
| `index.ts`                                  | entry, lifecycle wiring, public exports                            |
| `config.ts`                                 | motion tokens and tuning values                                    |
| `core.ts`                                   | GSAP setup, token eases, environment checks, page context and gate |
| `root-state.ts`                             | scroll direction, `data-scrolled`, scroll velocity                 |
| `smooth-scroll.ts`                          | Lenis (lazy)                                                       |
| `cursor.ts`                                 | custom cursor                                                      |
| `reveal.ts`, `split.ts`                     | reveals; SplitText (lazy) and `splitLines`                         |
| `marquee.ts`                                | marquee / tape                                                     |
| `desk.ts`, `desk-drag.ts`                   | desk placement and reset; dragging (lazy chunk)                    |
| `follower.ts`, `progress.ts`, `magnetic.ts` | follower preview, progress, magnetic                               |
| `transition.ts`                             | page transition panel                                              |
| `motion.css`                                | prepared states, cursor, panel, Lenis rules                        |
