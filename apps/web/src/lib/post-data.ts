/**
 * Pure helpers behind `lib/posts.ts`: no `astro:*` imports, so `node --test` can run them
 * (`post-data.test.ts`) and `content.config.ts` can read `POST_KINDS`. Pages and components
 * import `lib/posts.ts`, not this.
 *
 * Why not `bodyText()` (lib/body-text.ts)? It is built to count words, not to be read: it
 * turns every `-` into a space (`server-rendered` becomes two words), leaves link addresses
 * in the text, and its tag pattern would swallow prose such as "a <b and c> d". A meta
 * description and a note's word limit both need the text as a reader sees it.
 */

/** The kinds of entry in the posts collection; the content schema is built from this list. */
export const POST_KINDS = ['post', 'note'] as const;
export type PostKind = (typeof POST_KINDS)[number];

/** A note is short: this many words of prose at most (code blocks do not count). */
export const NOTE_MAX_WORDS = 300;

/** The longest meta description (docs/SEO.md); the same budget as `limits` in `seo/meta.ts`. */
const DESCRIPTION_MAX = 160;

const FENCE = /^\s*(`{3,}|~{3,})/;
const IMPORT_EXPORT = /^(import|export)\s/;
const HEADING = /^#{1,6}(\s|$)/;
const SETEXT_UNDERLINE = /^ {0,3}(=+|-+)\s*$/;
const THEMATIC_BREAK = /^ {0,3}([-*_])(\s*\1){2,}\s*$/;
const TABLE_DELIMITER = /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/;
const BULLET = /^[-*+](?:\s+|$)/;
const ORDERED = /^\d{1,9}[.)](?:\s+|$)/;
const TASK_BOX = /^\[[ xX]\]\s+/;
/** `[label]: destination` (a link definition) or `[^label]: text` (a footnote definition). */
const DEFINITION = /^ {0,3}\[([^\]]+)\]:\s*\S/;
const FOOTNOTE = /\[\^[^\]]+\]/;
const IMAGE = /!\[[^\]]*\](?:\(|\[)/;
const MARKUP_TAG = /<\/?(?:[A-Za-z][^<>]*)?>/;
const INLINE_CODE = /(`+)[\s\S]*?\1/g;
/** A backslash and the punctuation mark it escapes. */
const ESCAPE = /\\[!-/:-@[-`{-~]/g;

/** Marks around the index of a set-aside piece of text while inline Markdown is stripped. */
const KEEP_OPEN = String.fromCharCode(0xe000);
const KEEP_CLOSE = String.fromCharCode(0xe001);
const KEPT = new RegExp(`${KEEP_OPEN}(\\d+)${KEEP_CLOSE}`, 'g');

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };

/** Decodes `&amp; &lt; &gt; &quot; &apos;` and numeric references (`&#39;`, `&#x27;`) in one pass. */
function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (whole, name: string) => {
    if (!name.startsWith('#')) return ENTITIES[name.toLowerCase()] ?? whole;
    const code =
      name[1] === 'x' || name[1] === 'X' ? parseInt(name.slice(2), 16) : Number(name.slice(1));
    try {
      return String.fromCodePoint(code);
    } catch {
      return whole;
    }
  });
}

/** True for an opening fence: a backtick fence may not have a backtick later on its line. */
function opensFence(line: string, fence: string): boolean {
  return fence[0] !== '`' || !line.slice(line.indexOf(fence) + fence.length).includes('`');
}

/** The lines outside fenced code blocks; a block leaves one blank line so paragraphs stay apart. */
function linesOutsideCode(body: string): string[] {
  const lines: string[] = [];
  let open: { char: string; length: number } | undefined;
  for (const line of body.split(/\r?\n/)) {
    const fence = FENCE.exec(line)?.[1];
    if (open) {
      const closes =
        fence !== undefined &&
        fence[0] === open.char &&
        fence.length >= open.length &&
        line.trim() === fence;
      if (closes) {
        open = undefined;
        lines.push('');
      }
    } else if (fence && opensFence(line, fence)) {
      open = { char: fence[0] ?? '`', length: fence.length };
      lines.push('');
    } else {
      lines.push(line);
    }
  }
  return lines;
}

/** A line without its inline code and backslash escapes: what is left can be checked for markup. */
const withoutCodeAndEscapes = (line: string) => line.replace(INLINE_CODE, ' ').replace(ESCAPE, ' ');

/**
 * The block markers at the start of a line: any number of `>` and list markers, with
 * whatever indentation. `orderedOk` says whether an ordered marker counts (a number followed
 * by a dot only starts a list item where one can start).
 */
function stripContainers(
  line: string,
  orderedOk: boolean,
): { rest: string; quote: boolean; listed: boolean; task: boolean } {
  let rest = line.trimStart();
  let quote = false;
  let listed = false;
  let task = false;
  for (;;) {
    if (rest.startsWith('>')) {
      quote = true;
      rest = rest.slice(1).trimStart();
      continue;
    }
    const marker = BULLET.exec(rest) ?? (orderedOk ? ORDERED.exec(rest) : null);
    if (!marker) break;
    rest = rest.slice(marker[0].length).trimStart();
    if (!listed && TASK_BOX.test(rest)) {
      rest = rest.replace(TASK_BOX, '');
      task = true;
    }
    listed = true;
  }
  return { rest, quote, listed, task };
}

/** Inline Markdown to plain text for one paragraph: links to their text, no marks. */
function plainInline(paragraph: string, labels: ReadonlySet<string>): string {
  // Code spans and backslash escapes are set aside first, so a `*` inside them is never
  // read as emphasis, then put back as plain text.
  const kept: string[] = [];
  const keep = (text: string) => `${KEEP_OPEN}${kept.push(text) - 1}${KEEP_CLOSE}`;
  const text = paragraph
    .replace(/(`+)([\s\S]*?)\1/g, (_, __, code: string) => keep(code.trim()))
    .replace(/\\([!-/:-@[-`{-~])/g, (_, char: string) => keep(char))
    .replace(/!\[[^\]]*\](?:\((?:[^()]|\([^()]*\))*\)|\[[^\]]*\])/g, ' ')
    .replace(/\[([^\]]*)\]\((?:[^()]|\([^()]*\))*\)/g, '$1')
    .replace(/\[([^\]]+)\]\[[^\]]*\]/g, '$1')
    .replace(/\[\^[^\]]+\]/g, '')
    .replace(/\[([^\]]+)\](?![([:])/g, (whole, label: string) =>
      labels.has(label.trim().toLowerCase()) ? label : whole,
    )
    .replace(/<\/?(?:[A-Za-z][^<>]*)?>/g, ' ')
    .replace(/~~(?=\S)([\s\S]+?)(?<=\S)~~/g, '$1')
    .replace(/\*{1,3}(?=\S)([\s\S]+?)(?<=\S)\*{1,3}/g, '$1')
    .replace(/(?<![\p{L}\p{N}_])_{1,3}(?=\S)([\s\S]+?)(?<=\S)_{1,3}(?![\p{L}\p{N}_])/gu, '$1');
  return decodeEntities(
    text
      .replace(KEPT, (_, index: string) => kept[Number(index)] ?? '')
      .replace(/\s+/g, ' ')
      .trim(),
  );
}

/** The labels (lower case) of the link definitions in a body: `[a]: url` gives `a`. */
function definitionLabels(lines: readonly string[]): Set<string> {
  const labels = new Set<string>();
  for (const line of lines) {
    const label = DEFINITION.exec(line)?.[1];
    if (label && !label.startsWith('^')) labels.add(label.trim().toLowerCase());
  }
  return labels;
}

/** The prose of a body as plain text: paragraphs joined by one space, code blocks left out. */
function proseText(body: string | undefined): string {
  const lines = linesOutsideCode(body ?? '');
  const labels = definitionLabels(lines);
  const paragraphs: string[] = [];
  let current: string[] = [];
  const flush = () => {
    const text = plainInline(current.join(' '), labels);
    if (text) paragraphs.push(text);
    current = [];
  };

  let blockStart = true; // the line starts a block: it is the first, or follows a blank line
  let afterDefinition = false; // the line before was a definition: another may follow at once
  let inList = false; // a list item has been seen in this block
  for (const raw of lines) {
    if (raw.trim() === '') {
      flush();
      blockStart = true;
      afterDefinition = false;
      inList = false;
      continue;
    }
    const startsBlock = blockStart;
    blockStart = false;

    if ((startsBlock || afterDefinition) && DEFINITION.test(raw)) {
      flush();
      afterDefinition = true;
      continue;
    }
    afterDefinition = false;
    if (
      (startsBlock && IMPORT_EXPORT.test(raw)) ||
      THEMATIC_BREAK.test(raw) ||
      SETEXT_UNDERLINE.test(raw) ||
      (raw.includes('|') && TABLE_DELIMITER.test(raw))
    ) {
      flush();
      continue;
    }

    const { rest, listed } = stripContainers(raw, startsBlock || inList);
    if (listed) inList = true;
    current.push(
      rest
        .replace(/^#{1,6}\s+/, '')
        .replace(/\s+#+\s*$/, '')
        .replace(/\|/g, ' ')
        .trim(),
    );
  }
  flush();
  return paragraphs.join(' ');
}

/**
 * Meta description for an entry that has none: the plain text of the body from its start.
 * Paragraphs are joined by one space and the text is cut at a word boundary to at most 160
 * characters, ending in `…` only when it was cut. Never returns markup.
 */
export function deriveDescription(body: string | undefined): string {
  const text = proseText(body);
  if (text.length <= DESCRIPTION_MAX) return text;

  // Room for the ellipsis. Cutting right before a space keeps the last word whole, but only
  // when that space is past half of the budget: a short word followed by a very long one is
  // cut inside the long one. Never between the halves of a surrogate pair.
  const room = text.slice(0, DESCRIPTION_MAX - 1);
  const space = room.lastIndexOf(' ');
  const cut = /\s/.test(text.charAt(DESCRIPTION_MAX - 1))
    ? room
    : space > DESCRIPTION_MAX / 2
      ? room.slice(0, space)
      : room.replace(/[\uD800-\uDBFF]$/, '');
  return `${cut.replace(/[\s,.;:–—-]+$/, '')}…`;
}

/** Number of words in a text: the pieces that hold a letter or a digit. */
function wordCount(text: string): number {
  return text.split(/\s+/).filter((word) => /[\p{L}\p{N}]/u.test(word)).length;
}

const EMPTY = 'The note is empty: write one to four short paragraphs.';
const HEADING_MESSAGE =
  'Remove the heading: a note has none (a line starting with #, or underlined).';

/** A line of running text: what a `===` or `---` line underneath turns into a heading. */
const isParagraphLine = (line: string) =>
  line.trim() !== '' &&
  !THEMATIC_BREAK.test(line) &&
  !BULLET.test(line.trimStart()) &&
  !ORDERED.test(line.trimStart());

/**
 * Why this body cannot be a note; empty when it can. A note is text only: paragraphs,
 * emphasis, links, inline code, fenced code and lists. Each problem is reported once, in
 * words meant for the author.
 */
export function noteProblems(body: string | undefined): string[] {
  if (!/\S/.test(body ?? '')) return [EMPTY];

  const found = new Set<string>();
  const lines = linesOutsideCode(body ?? '');
  lines.forEach((line, index) => {
    if (line.trim() === '') return;
    const previous = lines[index - 1] ?? '';
    const startsBlock = previous.trim() === '';
    const isDefinition = (startsBlock || DEFINITION.test(previous)) && DEFINITION.test(line);

    const { rest, quote } = stripContainers(line, true);
    const prose = withoutCodeAndEscapes(line);
    const underlines = SETEXT_UNDERLINE.test(line) && isParagraphLine(previous);

    if (HEADING.test(rest) || underlines) found.add(HEADING_MESSAGE);
    if (quote) found.add('Remove the blockquote (a line starting with >).');
    if (THEMATIC_BREAK.test(line) && !underlines) {
      found.add('Remove the rule (a line of --- or ***).');
    }
    if (rest.includes('|') && TABLE_DELIMITER.test(rest)) found.add('Remove the table.');
    if (FOOTNOTE.test(prose)) found.add('Remove the footnote.');
    if (startsBlock && IMPORT_EXPORT.test(line)) found.add('Remove the import or export line.');
    if (isDefinition) return; // a link definition may hold `<url>`; it is not text on the page
    if (IMAGE.test(prose)) found.add('Remove the image.');
    if (MARKUP_TAG.test(prose)) {
      found.add('Remove the JSX or HTML tag (Figure, Note, PullQuote and the like).');
    }
  });

  const problems = [...found];
  const words = wordCount(proseText(body));
  if (words === 0 && problems.length === 0) problems.push(EMPTY);
  if (words > NOTE_MAX_WORDS) {
    problems.push(
      `Shorten the text: it has ${words} words and a note holds at most ${NOTE_MAX_WORDS}.`,
    );
  }
  return problems;
}

/**
 * The error `toPostSummary` throws for a note that is not a note: names the file, lists the
 * problems and says what to do. `file` is the path from the repository root.
 */
export function noteErrorMessage(file: string, problems: readonly string[]): string {
  return (
    `${file} is marked "kind: note" but cannot be a note. ${problems.join(' ')} ` +
    `Fix that, or make it a post: drop "kind: note" and add a description.`
  );
}
