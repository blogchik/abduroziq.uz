/**
 * Checks for the content panel (`public/admin/`, docs/ADMIN.md): the files are static and
 * nothing else in the build reads them, so a typo would only show when the panel is opened.
 * Run with `pnpm --filter @abduroziq/web test`.
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
import { locales } from '../../../../packages/content/src/locales.ts';
import { POST_KINDS } from './post-data.ts';

const admin = fileURLToPath(new URL('../../public/admin/', import.meta.url));
const repo = fileURLToPath(new URL('../../../../', import.meta.url));

interface Field {
  name: string;
  widget?: string;
  default?: unknown;
}
interface Collection {
  divider?: boolean;
  name: string;
  folder: string;
  path?: string;
  extension?: string;
  filter?: { field: string; value: unknown };
  fields: Field[];
}
interface Config {
  backend: { name: string; repo: string; branch: string; root_dir: string };
  collections: Collection[];
}

const source = readFileSync(path.join(admin, 'config.yml'), 'utf8');
const config = parse(source) as Config;
const collections = config.collections.filter((collection) => !collection.divider);
const names = (collection: Collection) => collection.fields.map((field) => field.name);

test('the panel script is pinned to one exact version and checked against its hash', () => {
  const html = readFileSync(path.join(admin, 'index.html'), 'utf8');
  const script = /<script\b[^>]*>/.exec(html)?.[0] ?? '';
  const version = /@sveltia\/cms@(\d+\.\d+\.\d+)\/dist\/sveltia-cms\.js"/.exec(script)?.[1];
  assert.ok(version, 'the script URL names an exact version');
  assert.match(script, /integrity="sha384-[A-Za-z0-9+/]{64}"/);
  assert.match(script, /crossorigin="anonymous"/);
  assert.equal(html.match(/<script\b/g)?.length, 1, 'no second script on the page');
  // The editor schema in config.yml describes the same version as the script.
  assert.ok(source.includes(`@sveltia/cms@${version}/schema/sveltia-cms.json`));
});

test('the panel writes to main and sees packages/content only', () => {
  assert.equal(config.backend.name, 'github');
  assert.equal(config.backend.branch, 'main');
  assert.equal(config.backend.root_dir, 'packages/content');
});

test('every collection points at a folder that exists', () => {
  for (const collection of collections) {
    const folder = path.join(repo, config.backend.root_dir, collection.folder);
    assert.ok(existsSync(folder), `${collection.name}: ${collection.folder} does not exist`);
  }
});

test('posts and notes exist for every site language, split by kind', () => {
  for (const locale of locales) {
    for (const kind of POST_KINDS) {
      const collection = collections.find((c) => c.name === `${kind}s-${locale}`);
      assert.ok(collection, `no ${kind}s-${locale} collection`);
      assert.equal(collection.folder, `posts/${locale}`);
      assert.equal(collection.extension, 'mdx');
      assert.equal(collection.filter?.field, 'kind');
      const kindField = collection.fields.find((field) => field.name === 'kind');
      assert.equal(kindField?.widget, 'hidden');
      assert.equal(kindField?.default, kind);
    }
    const text = collections.find((c) => c.name === `project-text-${locale}`);
    assert.equal(text?.path, `{{slug}}/${locale}`);
  }
});

// The same keys, in the same order, as the strict schemas in src/content.config.ts: a key the
// schema does not know fails the build, and a key missing here cannot be edited in the panel.
test('the fields are the keys of the content schemas', () => {
  const post = [
    'kind',
    'title',
    'description',
    'date',
    'updated',
    'tags',
    'draft',
    'cover',
    'coverAlt',
    'translationKey',
    'body',
  ];
  const note = post.filter((name) => name !== 'cover' && name !== 'coverAlt');
  const project = [
    'name',
    'order',
    'year',
    'status',
    'url',
    'repo',
    'role',
    'summary',
    'description',
    'stack',
    'colors',
    'glyph',
    'cover',
    'coverAlt',
    'gallery',
  ];
  for (const collection of collections) {
    if (collection.name.startsWith('posts-')) assert.deepEqual(names(collection), post);
    if (collection.name.startsWith('notes-')) assert.deepEqual(names(collection), note);
    if (collection.name.startsWith('project-text-')) assert.deepEqual(names(collection), ['body']);
  }
  const projects = collections.find((collection) => collection.name === 'projects');
  assert.ok(projects);
  assert.equal(projects.path, '{{slug}}/project');
  assert.deepEqual(names(projects), project);
});
