# Font files

Static cuts generated from the Fontsource variable sources by `scripts/build-fonts.py`
(run from `apps/web`; needs `pip install fonttools brotli`). They exist because the
variable Newsreader files are about 130KB per style while the site uses five cuts of
about 22KB each, and Caveat is only used for a few hand-written notes.

| File                                                              | Family in CSS      | Cut                                          |
| ----------------------------------------------------------------- | ------------------ | -------------------------------------------- |
| `newsreader-display-400(.italic).woff2`                           | Newsreader Display | optical size 72, weight 400                  |
| `newsreader-text-400(.italic).woff2`, `newsreader-text-600.woff2` | Newsreader Text    | optical size 20                              |
| `caveat-500.woff2`                                                | Caveat             | Basic Latin subset, no contextual alternates |

Newsreader and Caveat are licensed under the SIL Open Font License 1.1 (see the
`OFL-*.txt` files); the generated files are modified versions under the same licence.
Bricolage Grotesque and Geist Mono are loaded unmodified from their Fontsource packages.
