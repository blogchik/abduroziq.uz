import type { ImageMetadata } from 'astro';

/**
 * How a project picture sits in its frame (DESIGN 6.1), decided from the file itself so the
 * content needs no extra field.
 *
 * A landscape screenshot fills its frame. Everything else (a phone screenshot, a square
 * panel, an illustration) is "contained": it is shown at a size of its own on a matte in the
 * project's background colour, on a stage with a calm shape, instead of being blown up to
 * the full width.
 */

export interface Stage {
  /** Width over height of the stage from tablets up. */
  ratio: number;
  /** The same on phones, where a tall picture needs a taller stage. */
  ratioNarrow: number;
  /** The picture's width as a fraction of the stage's width. */
  fit: number;
  fitNarrow: number;
}

type Shape = Pick<ImageMetadata, 'width' | 'height' | 'format'>;

/** The shape of a desktop screenshot, and of every picture slot in the list. */
export const FRAME_RATIO = 16 / 10;

/** A contained picture takes at most this much of its stage, in each direction. */
const FILL = 0.84;
/** The tallest stage a phone gets (4:5). */
const NARROW_MIN_RATIO = 0.8;
/** Below this width over height a raster picture is not a landscape screenshot. */
const LANDSCAPE_FROM = 1.25;

const round = (value: number): number => Math.round(value * 1000) / 1000;

/** The stage of a contained picture, or `undefined` for one that fills its frame. */
export function stageOf(image: Shape): Stage | undefined {
  const shape = image.width / image.height;
  if (image.format !== 'svg' && shape >= LANDSCAPE_FROM) return undefined;
  // A wide strip gets a stage of its own shape; anything taller stands on the common one.
  const ratio = Math.max(FRAME_RATIO, shape);
  const ratioNarrow = Math.max(NARROW_MIN_RATIO, shape);
  return {
    ratio: round(ratio),
    ratioNarrow: round(ratioNarrow),
    fit: round(Math.min(FILL, (FILL * shape) / ratio)),
    fitNarrow: round(Math.min(FILL, (FILL * shape) / ratioNarrow)),
  };
}

/**
 * The width of the place a picture gets at each breakpoint, widest first: `min` is the
 * viewport width in px from which `width` (a CSS calc expression without the `calc()`)
 * applies. The content box stops growing at 1440px.
 */
export type Area = readonly { min?: number; width: string }[];

/** Phones: the content box. */
const NARROW = { width: '100vw - 32px' } as const;
const TABLET = { min: 768, width: '100vw - 48px' } as const;

/** A picture as wide as the content box (the project page). */
export const PAGE_AREA: Area = [
  { min: 1440, width: '1360px' },
  { min: 1024, width: '100vw - 80px' },
  TABLET,
  NARROW,
];

/** The picture of a list row: seven of the twelve columns from 1024px up. */
export const ROW_AREA: Area = [
  { min: 1440, width: '783px' },
  { min: 1024, width: '58.34vw - 57px' },
  TABLET,
  NARROW,
];

/** The left column of a project page (four columns): the plate of a project without a cover. */
export const ASIDE_AREA: Area = [
  { min: 1440, width: '438px' },
  { min: 1024, width: '33.34vw - 43px' },
  TABLET,
  NARROW,
];

/** `sizes` for a picture in `area`; a contained picture is narrower by its stage's fit. */
export function sizesFor(area: Area, stage?: Stage): string {
  return area
    .map(({ min, width }) => {
      const fit = stage ? (min !== undefined && min >= 768 ? stage.fit : stage.fitNarrow) : 1;
      const length = fit === 1 ? `calc(${width})` : `calc(${fit} * (${width}))`;
      return min === undefined ? length : `(min-width: ${min}px) ${length}`;
    })
    .join(', ');
}

/**
 * Candidate widths for `srcset`: up to the file's own width, which is always the last one.
 * The small steps are close together on purpose: a phone shows a full-width picture at 650
 * to 720 or at about 1000 device pixels, and each step it need not skip saves a fifth of
 * the file on the connection where it matters.
 */
export function widthsFor(image: Shape, contained: boolean): number[] {
  const steps = contained ? [360, 540, 720, 960] : [480, 680, 768, 1080, 1440, 1920, 2400];
  return [...steps.filter((width) => width < image.width), image.width];
}
