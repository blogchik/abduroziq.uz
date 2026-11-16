import assert from 'node:assert/strict';
import { test } from 'node:test';
import { bodyText, countWords } from './body-text.ts';

const post = [
  'import Note from "@/components/blog/Note.astro";',
  'export const meta = { a: 1 };',
  '',
  '# A heading',
  '',
  'Two **bold** words, a [link](https://example.com) and `inline`.',
  '',
  '```ts',
  'const hidden = "should not count";',
  '```',
  '',
  '<Note tone="soft">Inside a tag</Note>',
  '',
  "O\u02BBzbek matn: 3 ta so'z - va 2025.",
].join('\n');

test('code, import lines and JSX tags are not words', () => {
  const text = bodyText(post);
  assert.ok(!text.includes('hidden'));
  assert.ok(!text.includes('import'));
  assert.ok(!text.includes('tone'));
  assert.ok(text.includes('Inside a tag'));
});

test('words are counted across lines, with Unicode letters and digits', () => {
  // Per block: the heading (2), the paragraph with a link (9: the link's address counts as
  // two), the JSX tag's text (3) and the Uzbek line (6; the hyphen is not a word).
  assert.equal(countWords(post), 2 + 9 + 3 + 6);
});

test('no words gives undefined', () => {
  assert.equal(countWords(undefined), undefined);
  assert.equal(countWords('```\ncode only\n```'), undefined);
  assert.equal(countWords('# - * ---'), undefined);
});
