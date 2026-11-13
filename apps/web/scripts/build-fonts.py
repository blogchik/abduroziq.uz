"""Builds the static font files used by the site from the Fontsource variable sources.

Newsreader ships as a variable font with weight and optical-size axes (about 130KB per
style). The site only uses a handful of cuts, so each one is instantiated as a small
static file. Caveat is used for a few hand-written notes, so it is subset to Basic Latin.

Usage:  python scripts/build-fonts.py   (from apps/web; needs `pip install fonttools brotli`)
"""
import os
import sys

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

web = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else '.')
out = os.path.abspath(sys.argv[2] if len(sys.argv) > 2 else os.path.join(web, 'src', 'assets', 'fonts'))
nm = os.path.join(web, 'node_modules')
os.makedirs(out, exist_ok=True)

roman = os.path.join(nm, '@fontsource-variable', 'newsreader', 'files', 'newsreader-latin-standard-normal.woff2')
italic = os.path.join(nm, '@fontsource-variable', 'newsreader', 'files', 'newsreader-latin-standard-italic.woff2')
caveat = os.path.join(nm, '@fontsource', 'caveat', 'files', 'caveat-latin-500-normal.woff2')

# Display cuts are pinned to the largest optical size (article titles, pull quotes); text
# cuts to a reading size (article body).
INSTANCES = [
    ('newsreader-display-400.woff2', roman, {'opsz': 72, 'wght': 400}),
    ('newsreader-display-400-italic.woff2', italic, {'opsz': 72, 'wght': 400}),
    ('newsreader-text-400.woff2', roman, {'opsz': 20, 'wght': 400}),
    ('newsreader-text-400-italic.woff2', italic, {'opsz': 20, 'wght': 400}),
    ('newsreader-text-600.woff2', roman, {'opsz': 20, 'wght': 600}),
]

for name, src, location in INSTANCES:
    font = TTFont(src)
    axes = {a.axisTag: (a.minValue, a.maxValue) for a in font['fvar'].axes}
    static = instancer.instantiateVariableFont(font, location, inplace=False)
    static.flavor = 'woff2'
    target = os.path.join(out, name)
    static.save(target)
    print(f'{name:40s} {os.path.getsize(target) / 1024:6.1f} KB  axes {axes}')

# Caveat: Basic Latin, typographic quotes and dashes, the Uzbek modifier letters. Contextual
# alternates are dropped (they double the file); kerning and ligatures stay.
unicodes = list(range(0x20, 0x7F)) + [0xA0, 0x2013, 0x2014, 0x2018, 0x2019, 0x201C, 0x201D, 0x2026, 0x02BB, 0x02BC]
options = subset.Options()
options.flavor = 'woff2'
options.layout_features = ['kern', 'mark', 'mkmk', 'liga']
options.notdef_outline = True
font = TTFont(caveat)
subsetter = subset.Subsetter(options)
subsetter.populate(unicodes=unicodes)
subsetter.subset(font)
font.flavor = 'woff2'
target = os.path.join(out, 'caveat-500.woff2')
font.save(target)
print(f"{'caveat-500.woff2':40s} {os.path.getsize(target) / 1024:6.1f} KB")
