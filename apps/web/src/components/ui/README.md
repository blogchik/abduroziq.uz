# Design-system primitives

Small, typed, server-rendered components. None ships client JavaScript except
`GiantName` (a tiny fit check after fonts load). Every one is shown in `/styleguide/` (dev).
Tokens and utilities live in `src/styles/` (see the header of each file).

| Component      | Props                                                                                                                                                                       | Example                                                                                   |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `Container`    | `as?` (`div` `section` `header` `footer` `nav` `article` `aside`), `grid?` (adds the 12-column grid), any HTML attribute                                                    | `<Container as="section" grid id="about">…</Container>`                                   |
| `SectionLabel` | `number` (number or string, padded to 2 digits), `name`, `as?` (`p` default, `h2`, `h3`, `div`, `span`)                                                                     | `<SectionLabel as="h2" number={1} name={t(locale, 'home.about.title')} />`                |
| `Tag`          | `label`, `href?` (link when set), `active?` (filled, `aria-current`), `count?`                                                                                              | `<Tag label="design" href={localePath(locale, '/blog/tag/design/')} count={3} />`         |
| `ArrowLink`    | `href`, `label?` (or slot), `external?` (auto for http/https), `direction?` (`right` `up-right` `up` `down` `left`), `arrowFirst?`, `hreflang?`, `rel?`                     | `<ArrowLink href={localePath(locale, '/blog/')} label={t(locale, 'home.writing.all')} />` |
| `Arrow`        | `direction?` (`right` `up-right` `up` `down` `left` `down-right`), `label?` (else decorative)                                                                               | `<Arrow direction="up-right" />`                                                          |
| `StatusDot`    | `status` (`live` `design` `planned`), `label`, `hideLabel?`, `pulse?` (`hover` default for live, `always`, `none`)                                                          | `<StatusDot status={p.status} label={statusLabel} />`                                     |
| `Barcode`      | `seed`, `bars?` (40), `height?` (CSS length, `1em`), `module?` (px per thin bar, 1.5), `fill?` (stretch to its box)                                                         | `<Barcode seed="meta-left" bars={90} height="10px" fill />`                               |
| `Capsule`      | `width?` (em, 1.5), `tone?` (`raised` `paper` `ink` `accent`), `label?` (else decorative), `id?`; slot = image or SVG                                                       | `<Capsule label="Portrait"><Image src={portrait} alt="" /></Capsule>`                     |
| `MonthTab`     | `date`, `locale`, `as?` (`h2` default, `h3`, `div`), `id?`                                                                                                                  | `<MonthTab date={group[0].date} locale={locale} />`                                       |
| `PostRow`      | `post` (`PostSummary`), `locale` (page locale), `headingLevel?` (3), `as?` (`article` default, `li`, `div`), `transitionName?` (`post-<locale>-<slug>`, `false` to disable) | `<ul>{posts.map((post) => <PostRow post={post} locale={locale} as="li" />)}</ul>`         |
| `Tape`         | `text`, `angle?` (−4), `repeat?` (10), `speed?`, `scroll?` (true)                                                                                                           | `<Tape text={t(locale, 'home.tape')} />`                                                  |
| `GiantName`    | `text?` (profile name), `as?` (`p` default, `h1`, `h2`, `div`), `reveal?` (→ `data-reveal`), `revealDelay?`, `decorative?` (aria-hidden), any HTML attribute on the root    | `<GiantName as="h1" reveal="chars" />`                                                    |

## Notes for page builders

- **Type**: use the `type-*` utilities (`type-sentence`, `type-display`, `type-numeral`,
  `type-title`, `type-lead`, `type-body`, `type-article-title`, `type-article-body`,
  `type-label`, `type-micro`, `type-hand`, `type-name`). Never set font sizes by hand.
- **Layout**: `shell` (or `Container`) for the page box, `grid-12` for columns, `pt-section` /
  `section-y` between sections, `hairline` / `hairline-b` / `hairline-ink` for rules,
  `full-bleed` to break out to the viewport. Spacing tokens: `px-gutter`, `gap-col-gap`.
- **Surfaces**: `surface-accent` (the accent fill: text, labels, rules and focus rings inside
  become on-accent) and `surface-ink` (the ink band: the other theme on ink, at most one
  per page).
- **Arrows**: the fonts have no arrow glyphs. Use `Arrow` / `ArrowLink`, never `→ ↗` in text.
- **Spaces**: `compressHTML` removes whitespace between inline elements across line breaks;
  write `{' '}` where a space matters.
- **Alignment**: put mono labels next to display type with `items-baseline` (flex) or compute
  cap-top offsets as the mobile menu does (`Header.astro`).
- **Tape**: place it in a centred container or directly in `main`; it breaks out with
  `calc(50% - 50vw)`, which assumes a centred parent.
- **GiantName**: the word fills the width of its parent exactly; the parent decides the
  width. The `Q` tail adds `0.09em` padding under the line box. Motion hooks:
  `[data-giant]` › `[data-giant-word]` (gets `data-reveal`) › `[data-giant-mask]` ›
  `[data-giant-letter]`.
- **Cursor**: external links get `data-cursor="open"` (ArrowLink does it), post rows
  `data-cursor="read"`; plain links and buttons need nothing.
- **Hover rules**: rows shift text by 12px, arrows nudge 3–4px, durations come from
  `--dur-*` so reduced motion makes them instant.
