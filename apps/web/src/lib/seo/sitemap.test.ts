/**
 * Checks for the sitemap helpers. Run with `pnpm --filter @abduroziq/web test`
 * (`node --test`, TypeScript is stripped by Node, no extra tooling).
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createSitemapSetup, parsePostMeta } from './sitemap.ts';

const post = (frontmatter: string) => `---\n${frontmatter}\n---\n\nBody.\n`;

test('a trailing YAML comment does not break the date', () => {
  const meta = parsePostMeta(
    post(
      'title: "A"\ndate: 2026-11-12  # publication date\ntranslationKey: hello  # pairs en and uz',
    ),
    'en/hello.mdx',
  );
  assert.equal(meta.lastmod.toISOString(), '2026-11-12T00:00:00.000Z');
  assert.equal(meta.translationKey, 'hello');
});

test('updated wins over date for lastmod', () => {
  const meta = parsePostMeta(
    post('date: 2026-11-12\nupdated: 2026-11-20 # real change'),
    'en/a.mdx',
  );
  assert.equal(meta.lastmod.toISOString(), '2026-11-20T00:00:00.000Z');
});

test('block-style and flow-style tags lists are read', () => {
  const block = parsePostMeta(
    post('date: 2026-11-12\ntags:\n  - design\n  - "astro"  # quoted'),
    'en/a.mdx',
  );
  assert.deepEqual(block.tags, ['design', 'astro']);
  const flow = parsePostMeta(post('date: 2026-11-12\ntags: [meta, typography] # two'), 'en/a.mdx');
  assert.deepEqual(flow.tags, ['meta', 'typography']);
});

test('draft: true with a comment is a draft; anything else is published', () => {
  assert.equal(
    parsePostMeta(post('date: 2026-11-12\ndraft: true # keep out'), 'en/a.mdx').draft,
    true,
  );
  assert.equal(
    parsePostMeta(post('date: 2026-11-12\ndraft: false # live'), 'en/a.mdx').draft,
    false,
  );
  assert.equal(parsePostMeta(post('date: 2026-11-12'), 'en/a.mdx').draft, false);
});

test('a missing or invalid date fails loudly, naming the file', () => {
  assert.throws(() => parsePostMeta(post('title: "A"'), 'en/broken.mdx'), /en\/broken\.mdx/);
  assert.throws(() => parsePostMeta(post('date: not-a-date'), 'en/broken.mdx'), /valid "date"/);
});

test('a note without a description still yields its lastmod and its fields', () => {
  const meta = parsePostMeta(
    post('kind: note\ntitle: "A short one"\ndate: 2026-11-17 # a note\ntags: [meta]'),
    'en/short-one.mdx',
  );
  assert.equal(meta.lastmod.toISOString(), '2026-11-17T00:00:00.000Z');
  assert.equal(meta.draft, false);
  assert.deepEqual(meta.tags, ['meta']);
  const updated = parsePostMeta(
    post('kind: note\ndate: 2026-11-17\nupdated: 2026-11-18'),
    'en/short-one.mdx',
  );
  assert.equal(updated.lastmod.toISOString(), '2026-11-18T00:00:00.000Z');
});

const metas = [
  parsePostMeta(
    post('date: 2026-11-12  # publication date\ntags:\n  - meta\ntranslationKey: hi'),
    'en/hello.mdx',
  ),
  parsePostMeta(post('date: 2026-11-13 # c\ntags: [meta]\ntranslationKey: hi'), 'uz/salom.mdx'),
  parsePostMeta(post('date: 2026-11-14\ndraft: true # secret\ntags: [secret]'), 'en/draft.mdx'),
];

const setup = createSitemapSetup({
  siteUrl: 'https://example.com',
  postsDir: '',
  locales: ['en', 'uz'],
  defaultLocale: 'en',
  exclude: [/^\/404\/?$/],
  posts: metas,
});

test('translated posts get lastmod and a hreflang pair across different slugs', () => {
  const item = setup.serialize({ url: 'https://example.com/blog/hello/' });
  assert.equal(item.lastmod, '2026-11-12T00:00:00.000Z');
  assert.deepEqual(item.links, [
    { url: 'https://example.com/blog/hello/', lang: 'en' },
    { url: 'https://example.com/uz/blog/salom/', lang: 'uz' },
    { url: 'https://example.com/blog/hello/', lang: 'x-default' },
  ]);
});

test('drafts are filtered out; published posts and the home page are kept', () => {
  assert.equal(setup.filter('https://example.com/blog/draft/'), false);
  assert.equal(setup.filter('https://example.com/blog/hello/'), true);
  assert.equal(setup.filter('https://example.com/'), true);
  assert.equal(setup.filter('https://example.com/404/'), false);
});

test('a tag page with fewer than 3 posts is left out', () => {
  assert.equal(setup.filter('https://example.com/blog/tag/meta/'), false);
  const many = createSitemapSetup({
    siteUrl: 'https://example.com',
    postsDir: '',
    locales: ['en', 'uz'],
    defaultLocale: 'en',
    exclude: [],
    posts: ['a', 'b', 'c'].map((slug) =>
      parsePostMeta(post('date: 2026-11-12\ntags: [meta]'), `en/${slug}.mdx`),
    ),
  });
  assert.equal(many.filter('https://example.com/blog/tag/meta/'), true);
  assert.equal(many.filter('https://example.com/uz/blog/tag/meta/'), false);
});

test('an empty blog index is left out until the language has a post', () => {
  const none = createSitemapSetup({
    siteUrl: 'https://example.com',
    postsDir: '',
    locales: ['en', 'uz'],
    defaultLocale: 'en',
    exclude: [],
    posts: [],
  });
  assert.equal(none.filter('https://example.com/blog/'), false);
  assert.equal(none.filter('https://example.com/uz/blog/'), false);
  assert.equal(setup.filter('https://example.com/blog/'), true);
  assert.equal(setup.filter('https://example.com/uz/blog/'), true);
});

test('project pages keep their hreflang pair and carry no invented lastmod', () => {
  assert.equal(setup.filter('https://example.com/projects/'), true);
  assert.equal(setup.filter('https://example.com/uz/projects/payzone/'), true);
  const item = setup.serialize({
    url: 'https://example.com/uz/projects/payzone/',
    links: [
      { url: 'https://example.com/projects/payzone/', lang: 'en' },
      { url: 'https://example.com/uz/projects/payzone/', lang: 'uz' },
    ],
  });
  assert.equal(item.lastmod, undefined);
  assert.deepEqual(item.links, [
    { url: 'https://example.com/projects/payzone/', lang: 'en' },
    { url: 'https://example.com/uz/projects/payzone/', lang: 'uz' },
    { url: 'https://example.com/projects/payzone/', lang: 'x-default' },
  ]);
});
