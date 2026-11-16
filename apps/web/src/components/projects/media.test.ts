/**
 * Checks for the picture frame helpers. Run with `pnpm --filter @abduroziq/web test`.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PAGE_AREA, sizesFor, stageOf, widthsFor } from './media.ts';

const desktop = { width: 2880, height: 1800, format: 'webp' } as const;
const phone = { width: 1170, height: 2532, format: 'webp' } as const;
const panel = { width: 480, height: 472, format: 'svg' } as const;
const strip = { width: 640, height: 228, format: 'svg' } as const;

test('a landscape screenshot fills its frame', () => {
  assert.equal(stageOf(desktop), undefined);
});

test('a phone screenshot stands on the common stage, at most 84% of its height', () => {
  const stage = stageOf(phone);
  assert.ok(stage);
  assert.equal(stage.ratio, 1.6);
  assert.equal(stage.ratioNarrow, 0.8);
  // Height taken = fit * stage ratio / picture ratio.
  const shape = phone.width / phone.height;
  assert.ok(Math.abs((stage.fit * stage.ratio) / shape - 0.84) < 0.01);
  assert.ok(Math.abs((stage.fitNarrow * stage.ratioNarrow) / shape - 0.84) < 0.01);
});

test('an illustration is contained whatever its shape; a wide one shapes its own stage', () => {
  assert.equal(stageOf(panel)?.ratio, 1.6);
  const wide = stageOf(strip);
  assert.ok(wide);
  assert.equal(wide.ratio, 2.807);
  assert.equal(wide.fit, 0.84);
  assert.equal(wide.fitNarrow, 0.84);
});

test('sizes follow the area, and shrink with the fit of a contained picture', () => {
  assert.equal(
    sizesFor(PAGE_AREA),
    '(min-width: 1440px) calc(1360px), (min-width: 1024px) calc(100vw - 80px), (min-width: 768px) calc(100vw - 48px), calc(100vw - 32px)',
  );
  const sizes = sizesFor(PAGE_AREA, stageOf(phone));
  assert.match(sizes, /^\(min-width: 1440px\) calc\(0\.243 \* \(1360px\)\)/);
  assert.match(sizes, /, calc\(0\.485 \* \(100vw - 32px\)\)$/);
});

test('srcset widths never exceed the file and always end with it', () => {
  assert.deepEqual(widthsFor(desktop, false), [480, 680, 768, 1080, 1440, 1920, 2400, 2880]);
  assert.deepEqual(widthsFor(phone, true), [360, 540, 720, 960, 1170]);
  assert.deepEqual(widthsFor({ width: 600, height: 400, format: 'png' }, false), [480, 600]);
});

test('a video is shaped by its stated size: landscape fills, a phone recording is contained', () => {
  assert.equal(stageOf({ width: 1600, height: 1000 }), undefined);
  assert.equal(stageOf({ width: 1920, height: 1080 }), undefined);
  const stage = stageOf({ width: 540, height: 1170 });
  assert.ok(stage);
  assert.equal(stage.ratioNarrow, 0.8);
});
