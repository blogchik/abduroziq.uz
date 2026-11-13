/**
 * Checks for the project helpers. Run with `pnpm --filter @abduroziq/web test`.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  adjacentBySlug,
  mediaKey,
  parseProjectBodyId,
  parseProjectSlug,
  resolveVideo,
  sortByOrder,
} from './project-data.ts';

const locales = ['en', 'uz'] as const;

test('a project slug must be lowercase kebab-case', () => {
  assert.equal(parseProjectSlug('karimov-academy'), 'karimov-academy');
  assert.throws(() => parseProjectSlug('Karimov_Academy'), /kebab-case/);
});

test('a body id gives slug and locale; other file names fail', () => {
  assert.deepEqual(parseProjectBodyId('payzone/uz', locales), { slug: 'payzone', locale: 'uz' });
  assert.throws(() => parseProjectBodyId('payzone/ru', locales), /one of en, uz/);
  assert.throws(() => parseProjectBodyId('payzone/notes/en', locales), /<slug>\/<locale>\.mdx/);
});

test('projects sort by order; a shared order fails', () => {
  const sorted = sortByOrder([
    { slug: 'b', order: 2 },
    { slug: 'a', order: 1 },
  ]);
  assert.deepEqual(
    sorted.map((p) => p.slug),
    ['a', 'b'],
  );
  assert.throws(
    () =>
      sortByOrder([
        { slug: 'a', order: 1 },
        { slug: 'b', order: 1 },
      ]),
    /"a" and "b" share order 1/,
  );
});

test('neighbours by order, without wrap-around', () => {
  const list = [{ slug: 'a' }, { slug: 'b' }, { slug: 'c' }];
  assert.deepEqual(adjacentBySlug(list, 'b'), { prev: { slug: 'a' }, next: { slug: 'c' } });
  assert.deepEqual(adjacentBySlug(list, 'a'), { next: { slug: 'b' } });
  assert.deepEqual(adjacentBySlug(list, 'c'), { prev: { slug: 'b' } });
  assert.deepEqual(adjacentBySlug(list, 'missing'), {});
});

test('media paths resolve inside the project folder only', () => {
  assert.equal(mediaKey('payzone', './media/demo.mp4'), 'payzone/media/demo.mp4');
  assert.equal(mediaKey('payzone', 'media/../media/./demo.mp4'), 'payzone/media/demo.mp4');
  assert.equal(mediaKey('payzone', '.\\media\\demo.mp4'), 'payzone/media/demo.mp4');
  assert.throws(() => mediaKey('payzone', '../tavryn/media/demo.mp4'), /leaves the project/);
});

test('a missing video fails with the project and the path', () => {
  const files = { 'payzone/media/demo.mp4': '/_astro/demo.abc.mp4' };
  assert.equal(resolveVideo('payzone', './media/demo.mp4', files, ['mp4']), '/_astro/demo.abc.mp4');
  assert.throws(
    () => resolveVideo('payzone', './media/other.mp4', files, ['mp4', 'webm']),
    /Project "payzone": video "\.\/media\/other\.mp4" not found .*\.mp4 or \.webm/,
  );
});
