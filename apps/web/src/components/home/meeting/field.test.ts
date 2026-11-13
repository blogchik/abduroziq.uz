/**
 * Checks for the dot field of the hero's meeting. Run with `pnpm --filter @abduroziq/web test`
 * (`node --test`, TypeScript is stripped by Node, no extra tooling).
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ARROW, buildField, fieldToPaths, HAND, starPath, STRIDE, type Field } from './field.ts';

/** Stage sizes the hero really produces: 26% of the width, never lower than 160px. */
const STAGES: [number, number][] = [
  [328, 160],
  [358, 160],
  [720, 187],
  [944, 245],
  [1200, 312],
  [1360, 354],
];

function bounds(field: Field): { x0: number; y0: number; x1: number; y1: number } {
  const box = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
  for (let k = 0; k < field.count; k++) {
    const x = field.cells[k * STRIDE] ?? 0;
    const y = field.cells[k * STRIDE + 1] ?? 0;
    box.x0 = Math.min(box.x0, x - field.body);
    box.y0 = Math.min(box.y0, y - field.body);
    box.x1 = Math.max(box.x1, x + field.body);
    box.y1 = Math.max(box.y1, y + field.body);
  }
  return box;
}

test('the two cursors fit the stage and are centred in it', () => {
  for (const [width, height] of STAGES) {
    const field = buildField(width, height);
    const box = bounds(field);
    assert.ok(box.x0 >= 0 && box.x1 <= width, `inside ${width}px horizontally`);
    assert.ok(box.y0 >= 0 && box.y1 <= height, `inside ${height}px vertically (${width}px wide)`);
    const slack = Math.max(8, width * 0.012);
    assert.ok(Math.abs((box.x0 + box.x1) / 2 - width / 2) < slack, `centred at ${width}px`);
    assert.ok(Math.abs((box.y0 + box.y1) / 2 - height / 2) < slack, `middle at ${width}px`);
  }
});

test('a few thousand dots at most, and both cursors are there', () => {
  for (const [width, height] of STAGES) {
    const field = buildField(width, height);
    assert.ok(field.count <= 2500, `${field.count} cells at ${width}px`);
    assert.ok(field.dots >= 300 && field.dots <= field.count, `${field.dots} dots at ${width}px`);
    let hand = 0;
    let arrow = 0;
    for (let k = 0; k < field.count; k++) {
      if (field.cells[k * STRIDE + 3] === HAND) hand += 1;
      if (field.cells[k * STRIDE + 3] === ARROW) arrow += 1;
    }
    assert.ok(hand > 100 && arrow > 100 && hand + arrow === field.count);
  }
});

test('the hand ends left of the meeting point, the arrow starts right of it', () => {
  const field = buildField(1360, 354);
  let handRight = -Infinity;
  let arrowLeft = Infinity;
  for (let k = 0; k < field.count; k++) {
    const x = field.cells[k * STRIDE] ?? 0;
    if (field.cells[k * STRIDE + 3] === HAND) handRight = Math.max(handRight, x);
    else arrowLeft = Math.min(arrowLeft, x);
  }
  assert.ok(handRight < field.meet.x && arrowLeft > field.meet.x);
  // The tips almost touch: the gap holds the starburst and little more.
  assert.ok(arrowLeft - handRight < field.star * 5);
  assert.ok(field.reach > 0 && field.reach < (arrowLeft - handRight) / 2 + field.pitch);
});

test('the field is the same every time, and the light changes sides in the dark theme', () => {
  const light = buildField(1200, 312);
  assert.deepEqual(buildField(1200, 312).cells, light.cells);
  const dark = buildField(1200, 312, { dark: true });
  assert.equal(dark.meet.x, light.meet.x);
  assert.notDeepEqual(dark.cells, light.cells);
});

test('the name tags stay on the stage', () => {
  for (const [width, height] of STAGES) {
    const { tags } = buildField(width, height);
    for (const tag of [tags.hand, tags.arrow]) {
      assert.ok(tag.x > 0 && tag.x < width && tag.y > 0 && tag.y < height);
    }
    assert.ok(tags.hand.x < tags.arrow.x && tags.hand.y < tags.arrow.y);
  }
});

test('the static picture is a few short paths', () => {
  const field = buildField(1200, 312, { pitch: 1200 / 112 });
  const paths = fieldToPaths(field);
  assert.ok(paths.dots.length >= 3 && paths.dots.length <= 5);
  assert.match(paths.body.d, /^M[\d.]+ [\d.]+h[\d.]+/);
  const size = paths.body.d.length + paths.dots.reduce((sum, path) => sum + path.d.length, 0);
  assert.ok(size < 8000, `${size} characters of path data`);
  // Every dot is in exactly one of the dot paths.
  const marks = paths.dots.reduce((sum, path) => sum + (path.d.match(/M/g)?.length ?? 0), 0);
  assert.equal(marks, field.dots);
  assert.match(starPath(10), /^M0\.00 -10\.00L.*Z$/);
});
