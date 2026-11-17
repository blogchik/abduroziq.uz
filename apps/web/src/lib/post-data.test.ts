/**
 * Checks for the post helpers. Run with `pnpm --filter @abduroziq/web test`.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  NOTE_MAX_WORDS,
  POST_KINDS,
  deriveDescription,
  noteErrorMessage,
  noteProblems,
} from './post-data.ts';

const words = (count: number) => Array.from({ length: count }, (_, i) => `word${i}`).join(' ');

test('a short text is kept whole, without an ellipsis', () => {
  assert.equal(deriveDescription('A short note.'), 'A short note.');
  assert.equal(deriveDescription(undefined), '');
  assert.equal(deriveDescription('  \n\n '), '');
});

test('paragraphs are joined by one space', () => {
  assert.equal(
    deriveDescription('First line\nstill first.\n\n\nSecond.'),
    'First line still first. Second.',
  );
});

test('a long text is cut at a word with an ellipsis and never passes 160 characters', () => {
  const text = Array.from({ length: 60 }, (_, i) => `alpha${i}`).join(' ');
  const result = deriveDescription(text);
  assert.ok(result.length <= 160, `length ${result.length}`);
  assert.ok(result.endsWith('…'));
  assert.ok(text.startsWith(result.slice(0, -1)));
  assert.match(result.slice(0, -1), /alpha\d+$/); // a whole word, not a fragment
  assert.ok(result.length > 140); // and it uses the room it has
});

test('exactly 160 characters is not cut; 161 is', () => {
  const exact = 'a'.repeat(79) + ' ' + 'b'.repeat(80);
  assert.equal(exact.length, 160);
  assert.equal(deriveDescription(exact), exact);
  const over = exact + 'c';
  const cut = deriveDescription(over);
  assert.ok(cut.length <= 160 && cut.endsWith('…'));
});

test('a word that ends right at the limit is kept whole', () => {
  const text = `${'x'.repeat(100)} ${'y'.repeat(58)} tail`; // 159 characters, then " tail"
  assert.equal(deriveDescription(text), `${'x'.repeat(100)} ${'y'.repeat(58)}…`);
});

test('one unbroken word longer than the limit is cut inside it', () => {
  const result = deriveDescription('z'.repeat(400));
  assert.equal(result.length, 160);
  assert.ok(result.endsWith('…'));
});

test('links become their text; backticks and emphasis marks are removed', () => {
  const text =
    'See [the **docs**](https://example.com/a_(b)) and `npm run build` for *more*, __much__ more, and ~~less~~. Footnote.[^1]';
  assert.equal(
    deriveDescription(text),
    'See the docs and npm run build for more, much more, and less. Footnote.',
  );
  assert.equal(
    deriveDescription('An [auto][ref] link ![alt text](pic.png) here.'),
    'An auto link here.',
  );
});

test('apostrophes, hyphens and underscores inside words survive', () => {
  assert.equal(
    deriveDescription("An o'zbek note about server-rendered pages and snake_case names."),
    "An o'zbek note about server-rendered pages and snake_case names.",
  );
  assert.equal(deriveDescription('2 * 3 = 6 and a - b'), '2 * 3 = 6 and a - b');
});

test('a backslash escape and an emphasis mark inside code are literal', () => {
  assert.equal(deriveDescription('Use `a*b*c` and 2 \\* 3 here.'), 'Use a*b*c and 2 * 3 here.');
});

test('list markers are removed and fenced code is skipped', () => {
  const body = [
    'Intro line.',
    '',
    '- first item',
    '* second item',
    '1. numbered item',
    '2) other numbered',
    '',
    '```ts',
    '# not a heading',
    'const secret = 1;',
    '```',
    '',
    'After the code.',
  ].join('\n');
  assert.equal(
    deriveDescription(body),
    'Intro line. first item second item numbered item other numbered After the code.',
  );
  const tilde = 'Before.\n\n~~~\nhidden\n~~~\n\nAfter.';
  assert.equal(deriveDescription(tilde), 'Before. After.');
});

test('headings, quotes, tags and import lines never leave markup behind', () => {
  const body =
    'import Note from "x";\n\n## A heading\n\n> quoted words\n\n<Note label="x">inside</Note> and text.';
  const result = deriveDescription(body);
  assert.equal(result, 'A heading quoted words inside and text.');
  assert.doesNotMatch(result, /[#<>`*[\]]/);
});

test('a plain note has no problems', () => {
  assert.deepEqual(noteProblems('One short paragraph.\n\nAnother, with a [link](/blog/).'), []);
});

test('every allowed construct is accepted', () => {
  const body = [
    'A paragraph with **strong**, *emphasis*, `inline code` and a [link](https://example.com).',
    '',
    '- an item',
    '- another item',
    '',
    '1. first',
    '2. second',
    '',
    '```ts',
    'const x = 1;',
    '```',
  ].join('\n');
  assert.deepEqual(noteProblems(body), []);
});

test('a code block whose content looks like markup is accepted', () => {
  const body = [
    'Before.',
    '',
    '```html',
    '# a heading',
    '> a quote',
    '<Figure src="x" />',
    '| a | b |',
    '|---|---|',
    'import x from "y";',
    '![alt](pic.png)',
    '```',
    '',
    'After, with `<b>` and `# x` and `![i](j)` in code spans.',
  ].join('\n');
  assert.deepEqual(noteProblems(body), []);
  // A longer fence holds a shorter one inside it.
  assert.deepEqual(noteProblems('Text.\n\n````md\n```\n# inside\n```\n````\n'), []);
});

test('each problem is reported once, in readable words', () => {
  const cases: [string, RegExp][] = [
    ['Text.\n\n## A heading\n\nMore text.', /heading/],
    ['Text.\n\nA title\n=====\n', /heading/],
    ['Text.\n\nA title\n---\n', /heading/],
    ['Text.\n\n> a quote', /blockquote/],
    ['Text.\n\n| a | b |\n|---|---|\n| 1 | 2 |', /table/],
    ['Text.\n\n![alt](pic.png)', /image/],
    ['import Note from "x";\n\nText.', /import or export/],
    ['export const a = 1;\n\nText.', /import or export/],
    ['Text.\n\n<Figure src="x" alt="y" />', /tag/],
    ['Text.\n\n<PullQuote>q</PullQuote>', /tag/],
    ['Text with <kbd>K</kbd>.', /tag/],
    ['', /empty/],
    ['  \n\n', /empty/],
    [undefined as unknown as string, /empty/],
    ['```\nonly code\n```', /empty/],
  ];
  for (const [body, pattern] of cases) {
    const problems = noteProblems(body);
    assert.equal(problems.length, 1, `${JSON.stringify(body)} gave ${JSON.stringify(problems)}`);
    assert.match(problems[0] ?? '', pattern);
  }
});

test('repeated constructs are still reported once', () => {
  const body = '## One\n\nText.\n\n## Two\n\n> a\n\n> b\n\n![a](b)\n\n![c](d)';
  const problems = noteProblems(body);
  assert.equal(problems.length, 3);
  assert.equal(new Set(problems).size, 3);
});

test('300 words pass and 301 fail; code blocks do not count', () => {
  assert.equal(NOTE_MAX_WORDS, 300);
  assert.deepEqual(noteProblems(words(300)), []);
  const over = noteProblems(words(301));
  assert.equal(over.length, 1);
  assert.match(over[0] ?? '', /301 words.*at most 300/);
  assert.deepEqual(noteProblems(`${words(300)}\n\n\`\`\`\n${words(500)}\n\`\`\`\n`), []);
});

test('link addresses and list markers are not words', () => {
  const body = `${words(299)} [one](https://example.com/a/very/long/address-with-dashes)`;
  assert.deepEqual(noteProblems(body), []);
  assert.deepEqual(noteProblems(`- ${words(150)}\n- ${words(150)}`), []);
});

test('several problems are all reported', () => {
  const problems = noteProblems(`# Title\n\n> quote\n\n${words(301)}`);
  assert.equal(problems.length, 3);
});

test('the kinds come from one list', () => {
  assert.deepEqual([...POST_KINDS], ['post', 'note']);
});

test('a heading, quote, table or image inside a list item is a problem', () => {
  const cases: [string, RegExp][] = [
    ['- # heading\n- b', /heading/],
    ['1. > quote', /blockquote/],
    ['- > quote', /blockquote/],
    ['- a\n  - b\n    # h', /heading/],
    ['1. - ## deep', /heading/],
    ['- | a | b |\n  |---|---|\n  | 1 | 2 |', /table/],
    ['- ![alt](pic.png)', /image/],
  ];
  for (const [body, pattern] of cases) {
    const problems = noteProblems(body);
    assert.equal(problems.length, 1, `${JSON.stringify(body)} gave ${JSON.stringify(problems)}`);
    assert.match(problems[0] ?? '', pattern);
  }
  assert.deepEqual(noteProblems('- a\n  - b\n    - c\n1. d'), []);
});

test('the description does not leak heading or quote marks from a list item', () => {
  assert.equal(deriveDescription('- # heading\n- b'), 'heading b');
  assert.equal(deriveDescription('1. > quote'), 'quote');
  assert.equal(deriveDescription('- a\n  - b\n    - c'), 'a b c');
});

test('a footnote reference or definition is a problem; link definitions are not', () => {
  assert.deepEqual(noteProblems('Text[^1].\n\n[^1]: The note.'), ['Remove the footnote.']);
  assert.deepEqual(noteProblems('Only a reference[^a] here.'), ['Remove the footnote.']);
  assert.deepEqual(noteProblems('See [a][r].\n\n[r]: https://x.com'), []);
  assert.deepEqual(noteProblems('See [a][r].\n\n[r]: <https://x.com>\n[s]: /blog/'), []);
  assert.deepEqual(noteProblems('A `[^1]` in code is fine.'), []);
});

test('definitions and footnotes never reach the description; [a][r] becomes a', () => {
  assert.equal(deriveDescription('Text[^1].\n\n[^1]: The note.'), 'Text.');
  assert.equal(deriveDescription('See [a][r] and [r].\n\n[r]: https://x.com'), 'See a and r.');
  assert.equal(
    deriveDescription('See [a][r].\n\n[r]: https://x.com\n[s]: /blog/\n\nEnd.'),
    'See a. End.',
  );
  assert.equal(deriveDescription('A [bare] label stays.'), 'A [bare] label stays.');
});

test('import and export only count at the start of a block', () => {
  assert.deepEqual(noteProblems('We will\nimport the data and\nexport it.'), []);
  assert.equal(
    deriveDescription('We will\nimport the data and\nexport it.'),
    'We will import the data and export it.',
  );
  assert.equal(noteProblems('Text.\n\nexport const a = 1;').length, 1);
  assert.equal(noteProblems('Text.\n\nimport x from "y";\nmore').length, 1);
  assert.equal(deriveDescription('Intro.\n\nimport X from "x";\n\nMore.'), 'Intro. More.');
});

test('a backslash-escaped angle bracket or bang is not markup', () => {
  assert.deepEqual(noteProblems('Use Array\\<string> here.'), []);
  assert.deepEqual(noteProblems('Not an image: \\![a](b).'), []);
  assert.equal(deriveDescription('Use Array\\<string> here.'), 'Use Array<string> here.');
  assert.equal(noteProblems('Use Array<string> here.').length, 1); // unescaped it is a tag
});

test('a rule is a problem, a lone dash or equals under text is a heading', () => {
  for (const rule of ['---', '***', '___', '- - -', '* * *']) {
    const problems = noteProblems(`One.\n\n${rule}\n\nTwo.`);
    assert.equal(problems.length, 1, `${rule} gave ${JSON.stringify(problems)}`);
    assert.match(problems[0] ?? '', /rule/);
  }
  for (const underline of ['-', '=', '--', '===']) {
    const problems = noteProblems(`A title\n${underline}\n`);
    assert.equal(problems.length, 1, `${underline} gave ${JSON.stringify(problems)}`);
    assert.match(problems[0] ?? '', /heading/);
  }
  const afterText = noteProblems('Text\n***');
  assert.equal(afterText.length, 1);
  assert.match(afterText[0] ?? '', /rule/);
  assert.deepEqual(noteProblems('- one\n-\n- three'), []); // an empty list item is not a heading
  assert.equal(deriveDescription('One.\n\n---\n\nTwo.'), 'One. Two.');
});

test('a short word before one very long word is cut inside the long word', () => {
  const result = deriveDescription(`See ${'u'.repeat(300)}`);
  assert.equal(result.length, 160);
  assert.ok(result.startsWith('See uuu'));
  assert.ok(result.endsWith('u…'));
});

test('the last space is used when it is past half of the budget', () => {
  const text = `${'a'.repeat(90)} ${'b'.repeat(200)}`;
  assert.equal(deriveDescription(text), `${'a'.repeat(90)}…`);
});

test('basic and numeric entities are decoded', () => {
  assert.equal(
    deriveDescription(
      'Fish &amp; chips &lt;3 &quot;x&quot; it&#39;s &#x27; &#8212; &bogus; &amp;lt;',
    ),
    'Fish & chips <3 "x" it\'s \' — &bogus; &lt;',
  );
});

test('an ordered marker is stripped only where a list item can start', () => {
  assert.equal(deriveDescription('In\n2026. we shipped'), 'In 2026. we shipped');
  assert.equal(deriveDescription('2026. we shipped'), 'we shipped');
  assert.equal(deriveDescription('1. a\n2. b\n10) c'), 'a b c');
  assert.equal(deriveDescription('- a\n  continued\n2. b'), 'a continued b');
  assert.equal(deriveDescription('Intro.\n\n3. first'), 'Intro. first');
});

test('task-list boxes are removed', () => {
  assert.equal(deriveDescription('- [ ] todo\n- [x] done\n- [X] also'), 'todo done also');
  assert.deepEqual(noteProblems('- [ ] todo\n- [x] done'), []);
});

test('a line of three backticks with more backticks after it is inline code, not a fence', () => {
  assert.equal(deriveDescription('```code``` is inline.\n\nNext.'), 'code is inline. Next.');
  assert.deepEqual(noteProblems('```code``` is inline.\n\nNext.'), []);
  // A real fence still hides its content, also when it names a language.
  assert.equal(deriveDescription('Before.\n\n```ts\n# no\n```\n\nAfter.'), 'Before. After.');
});

test('the guard message names the file, lists the problems and says what to do', () => {
  assert.equal(
    noteErrorMessage('packages/content/posts/en/a.mdx', ['Remove the table.', 'Remove the image.']),
    'packages/content/posts/en/a.mdx is marked "kind: note" but cannot be a note. ' +
      'Remove the table. Remove the image. ' +
      'Fix that, or make it a post: drop "kind: note" and add a description.',
  );
});
