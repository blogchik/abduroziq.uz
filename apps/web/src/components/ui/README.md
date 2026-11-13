# Design-system primitives

Small, typed, server-rendered components. None ships client JavaScript except
`GiantName` (a tiny fit check after fonts load). Every one is shown in `/styleguide/` (dev).
Tokens and utilities live in `src/styles/` (see the header of each file).

| Component      | Props                                                                                                                                                                                                                                     | Example                                                                                   |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `Container`    | `as?` (`div` `section` `header` `footer` `nav` `article` `aside`), `grid?` (adds the 12-column grid), any HTML attribute                                                                                                                  | `<Container as="section" grid id="about">…</Container>`                                   |
| `SectionLabel` | `number` (number or string, padded to 2 digits), `name`, `as?` (`p` default, `h2`, `h3`, `div`, `span`)                                                                                                                                   | `<SectionLabel as="h2" number={1} name={t(locale, 'home.about.title')} />`                |
| `Tag`          | `label`, `href?` (link when set), `active?` (filled, `aria-current`), `count?` (read out as `design, 3 posts`, localised)                                                                                                                 | `<Tag label="design" href={localePath(locale, '/blog/tag/design/')} count={3} />`         |
| `ArrowLink`    | `href`, `label?` (or slot), `external?` (auto for http/https), `direction?` (`right` `up-right` `up` `down` `left`), `arrowFirst?`, `hreflang?`, `rel?`                                                                                   | `<ArrowLink href={localePath(locale, '/blog/')} label={t(locale, 'home.writing.all')} />` |
| `Arrow`        | `direction?` (`right` `up-right` `up` `down` `left` `down-right`), `label?` (else decorative)                                                                                                                                             | `<Arrow direction="up-right" />`                                                          |
| `StatusDot`    | `status` (`live` `design` `planned`), `label`, `hideLabel?`, `pulse?` (`hover` default for live, `always`, `none`)                                                                                                                        | `<StatusDot status={p.status} label={statusLabel} />`                                     |
| `Barcode`      | `seed`, `bars?` (40), `height?` (CSS length, `1em`), `module?` (px per thin bar, 1.5), `fill?` (stretch to its box)                                                                                                                       | `<Barcode seed="meta-left" bars={90} height="10px" fill />`                               |
| `Capsule`      | `width?` (em, 1.5), `tone?` (`raised` `paper` `ink` `accent`), `label?` (else decorative), `id?`; slot = image or SVG                                                                                                                     | `<Capsule label="Portrait"><Image src={portrait} alt="" /></Capsule>`                     |
| `MonthTab`     | `date`, `locale`, `as?` (`h2` default, `h3`, `div`), `id?`                                                                                                                                                                                | `<MonthTab date={group[0].date} locale={locale} />`                                       |
| `PostRow`      | `post` (`PostSummary`), `locale` (page locale), `headingLevel?` (3), `as?` (`article` default, `li`, `div`), `transitionName?` (`postTransitionName(post)`, `false` to disable), any other HTML attribute on the root (`data-*`, `id`, …) | `<ul>{posts.map((post) => <PostRow post={post} locale={locale} as="li" />)}</ul>`         |
| `Tape`         | `text`, `angle?` (−4), `repeat?` (10), `speed?`, `scroll?` (true)                                                                                                                                                                         | `<Tape text={t(locale, 'home.tape')} />`                                                  |
| `GiantName`    | `text?` (profile name), `as?` (`p` default, `h1`, `h2`, `div`), `reveal?` (→ `data-reveal`), `revealDelay?`, `decorative?` (aria-hidden), `thin?` (the hairline cut: weight 250, looser tracking), any HTML attribute on the root         | `<GiantName as="h1" reveal="chars" />`                                                    |

`Barcode` draws one `<path>` per barcode (not one element per bar). `Tape` marks its strip
`data-surface="accent"` and lets it take the pointer, so the marquee pauses on hover.
`PostRow` names its link by the title and describes it by the date and the description;
below 30rem its date is one mono line above a full-width title.

Chrome: `Footer` takes `flush?` (no section gap above it); BaseLayout passes its own
`flush?` prop through, and the gap is also dropped automatically when <main> ends with a
`surface-ink` band. The footer carries the motion switch (`MOTION: ON / OFF`, WCAG 2.2.2)
and corrects its year on the client.

## Notes for page builders

- **Type**: use the `type-*` utilities (`type-statement`, `type-display`, `type-numeral`,
  `type-title`, `type-lead`, `type-body`, `type-article-title`, `type-article-body`,
  `type-label`, `type-micro`, `type-hand`, `type-name`). Never set font sizes by hand.
- **Layout**: `shell` (or `Container`) for the page box, `grid-12` for columns, `pt-section` /
  `section-y` between sections, `hairline` / `hairline-b` / `hairline-ink` for rules,
  `full-bleed` to break out to the viewport. Spacing tokens: `px-gutter`, `gap-col-gap`.
- **Surfaces**: `surface-accent` (the accent fill: text, labels, rules and focus rings inside
  become on-accent) and `surface-ink` (the ink band: the other theme on ink, at most one
  per page). The cursor colour follows them; other accent or ink fills are recognised from
  their background, and `data-surface="paper|accent|ink"` overrides (motion README).
- **Target size**: `target-24` gives a small mono link a hit area at least 24px tall
  without moving it (padding given back by a negative margin; `--target-pad` for
  decorations drawn from the padding box). Header links, the language switch and
  `ArrowLink` use it.
- **Forced colours**: draw state with borders or `text-decoration`, not backgrounds; where
  a fill is the state (active chip, status dots), switch to system colours under
  `@media (forced-colors: active)` as `Tag` and `StatusDot` do.
- **Stacking**: use the z-index tokens (`--z-header`, `--z-follower`, `--z-skip`,
  `--z-wipe`, `--z-cursor`), never raw numbers.
- **Arrows**: the fonts have no arrow glyphs. Use `Arrow` / `ArrowLink`, never `→ ↗` in text.
- **Spaces**: `compressHTML` removes whitespace between inline elements across line breaks;
  write `{' '}` where a space matters.
- **Alignment**: put mono labels next to display type with `items-baseline` (flex) or compute
  cap-top offsets as the mobile menu does (`Header.astro`).
- **Tape**: place it in a centred container or directly in `main`; it breaks out with
  `calc(50% - 50vw)`, which assumes a centred parent.
- **GiantName**: the word fills the width of its parent exactly; the parent decides the
  width. It fits by a table of letter widths per cut (medium, and `thin` for the home hero);
  a new weight needs its own table (see the component). The `Q` tail adds `0.09em` padding under the line box. Motion hooks:
  `[data-giant]` › `[data-giant-word]` (gets `data-reveal`) › `[data-giant-mask]` ›
  `[data-giant-letter]`.
- **Cursor**: external links get `data-cursor="open"` (ArrowLink does it), post rows
  `data-cursor="read"`; plain links and buttons need nothing.
- **Hover rules**: rows shift text by 12px, arrows nudge 3–4px, durations come from
  `--dur-*` so reduced motion makes them instant.
