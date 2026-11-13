/**
 * The meeting (DESIGN 4.2) as a field of halftone dots: a pointing-hand cursor reaching
 * from the left and an arrow cursor from the right, their tips almost touching.
 *
 * Both cursors are our own shapes, described as signed distance functions (capsules, rounded
 * boxes, one polygon). The distance to the outline gives every point a height, as if the
 * flat cursor were inflated; the height gives a surface normal, a light from the top left
 * gives a tone, and the tone decides whether a cell of the grid carries a dot (an ordered
 * dither drops the lightest ones) and how large it is. That is what makes the cursors read
 * as sculpture rather than as icons.
 *
 * The cursors are solid: every cell of a body also carries a disc in the colour of the
 * page, so the name they stand in front of does not show through between the dots.
 *
 * Pure geometry, no DOM: the same function builds the dots of the canvas in the browser
 * (`meeting.ts`) and the static SVG that stands in for it without JavaScript
 * (`Meeting.astro`, at build time).
 */

/** Group of a dot: the hand (the person) or the arrow (the agent). */
export const HAND = 0;
export const ARROW = 1;

export interface Field {
  width: number;
  height: number;
  /** Distance between neighbouring cells of the grid, in px. */
  pitch: number;
  /**
   * Per cell of the two bodies: home x, home y, dot radius (0 where the dither leaves the
   * cell empty), group. Every cell also carries a paper-coloured disc of radius `body`:
   * together they make the cursors solid, so the name behind does not show through.
   */
  cells: Float32Array;
  count: number;
  /** How many of the cells carry a dot. */
  dots: number;
  body: number;
  /** Where the tips meet, and the radius of the starburst that sits there. */
  meet: { x: number; y: number };
  star: number;
  /** How far each cursor travels along x until the tips touch. */
  reach: number;
  /** Where the name tags sit: the bottom right corner of the hand's, the top left of the arrow's. */
  tags: { hand: { x: number; y: number }; arrow: { x: number; y: number } };
}

export interface FieldOptions {
  /** Dots are light on a dark page: the light then comes from the other side. */
  dark?: boolean;
  /** Overrides the grid pitch (the static fallback uses a coarser one). */
  pitch?: number;
}

/** Values per cell in `Field.cells`. */
export const STRIDE = 4;

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

/* ------------------------------------------------------------------ shapes */

function capsule(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
  r: number,
): number {
  const dx = bx - ax;
  const dy = by - ay;
  const t = clamp(((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy), 0, 1);
  return Math.hypot(px - ax - dx * t, py - ay - dy * t) - r;
}

function box(
  px: number,
  py: number,
  cx: number,
  cy: number,
  hx: number,
  hy: number,
  r: number,
): number {
  const qx = Math.abs(px - cx) - hx + r;
  const qy = Math.abs(py - cy) - hy + r;
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
}

/** Exact signed distance to a closed polygon (flat list of x, y). */
function polygon(px: number, py: number, v: readonly number[]): number {
  const n = v.length / 2;
  let d = Infinity;
  let inside = false;
  for (let i = 0, j = n - 1; i < n; j = i, i++) {
    const xi = v[i * 2] ?? 0;
    const yi = v[i * 2 + 1] ?? 0;
    const xj = v[j * 2] ?? 0;
    const yj = v[j * 2 + 1] ?? 0;
    const ex = xj - xi;
    const ey = yj - yi;
    const wx = px - xi;
    const wy = py - yi;
    const t = clamp((wx * ex + wy * ey) / (ex * ex + ey * ey), 0, 1);
    d = Math.min(d, Math.hypot(wx - ex * t, wy - ey * t));
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside ? -d : d;
}

/** Union with a soft crease where two parts meet. */
function smin(a: number, b: number, k: number): number {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
}

/**
 * The pointing hand, finger to the right, in units where the finger is about 0.4 thick and
 * its tip is at (2.14, 0): a long index finger, the fist, three folded fingers below it that
 * step back one behind the other, the thumb raised above the fist, and a cuff. Every part
 * keeps its own volume, so the knuckles show in the shading. The finger is half as long
 * again as the fist is deep and the thumb stands clear of it: that is what makes it read as
 * a hand that points, not as a fist.
 */
const HAND_TIP = 2.14;
const HAND_BOUNDS = { x0: -1.7, y0: -0.9, x1: 2.2, y1: 1.3 };
/** Width of the hand from the cuff to the fingertip, in its own units. */
const HAND_SPAN = 3.77;
const HAND_BEVEL = 0.2;

function hand(x: number, y: number): number {
  let d = capsule(x, y, -0.1, 0, 1.95, 0, 0.19);
  d = smin(d, box(x, y, -0.42, 0.5, 0.48, 0.6, 0.26), 0.07);
  d = smin(d, capsule(x, y, -0.2, 0.4, 0.26, 0.4, 0.2), 0.05);
  d = smin(d, capsule(x, y, -0.2, 0.73, 0.16, 0.73, 0.185), 0.05);
  d = smin(d, capsule(x, y, -0.2, 1.02, 0.04, 1.02, 0.165), 0.05);
  d = smin(d, capsule(x, y, -0.66, 0.02, -0.22, -0.6, 0.19), 0.04);
  d = smin(d, box(x, y, -1.27, 0.5, 0.36, 0.47, 0.1), 0.03);
  return d;
}

/**
 * The arrow cursor, tip at the origin, in units of its long edge. The classic outline
 * (tip, heel, notch, tail, wing), turned so that the tip points left and a little down.
 */
const ARROW_OUTLINE = [0, 0, 0, 1, 0.24, 0.78, 0.42, 1.19, 0.585, 1.12, 0.405, 0.71, 0.72, 0.71];
const ARROW_TURN = (-95 * Math.PI) / 180;
const ARROW_ROUND = 0.035;
const ARROW_BEVEL = 0.12;
const ARROW_SHAPE: number[] = [];
for (let i = 0; i < ARROW_OUTLINE.length; i += 2) {
  const x = ARROW_OUTLINE[i] ?? 0;
  const y = ARROW_OUTLINE[i + 1] ?? 0;
  ARROW_SHAPE.push(
    x * Math.cos(ARROW_TURN) - y * Math.sin(ARROW_TURN),
    x * Math.sin(ARROW_TURN) + y * Math.cos(ARROW_TURN),
  );
}
const ARROW_BOUNDS = (() => {
  const xs = ARROW_SHAPE.filter((_, i) => i % 2 === 0);
  const ys = ARROW_SHAPE.filter((_, i) => i % 2 === 1);
  return {
    x0: Math.min(...xs) - 0.1,
    y0: Math.min(...ys) - 0.1,
    x1: Math.max(...xs) + 0.1,
    y1: Math.max(...ys) + 0.1,
  };
})();
function arrow(x: number, y: number): number {
  return polygon(x, y, ARROW_SHAPE) - ARROW_ROUND;
}

/* ------------------------------------------------------------------ layout */

interface Placed {
  group: number;
  sd: (x: number, y: number) => number;
  bounds: { x0: number; y0: number; x1: number; y1: number };
  /** Depth (in shape units) at which the surface becomes flat. */
  bevel: number;
  /** How much of the light the surface gives back: the arrow is the darker of the two. */
  albedo: number;
  /** Shape units to px, rotation, and the world position of the shape's origin. */
  scale: number;
  cos: number;
  sin: number;
  ox: number;
  oy: number;
}

function place(
  shape: Pick<Placed, 'group' | 'sd' | 'bounds' | 'bevel' | 'albedo'>,
  scale: number,
  angle: number,
  /** The shape point (ax, ay) lands on the world point (wx, wy). */
  ax: number,
  ay: number,
  wx: number,
  wy: number,
): Placed {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return {
    ...shape,
    scale,
    cos,
    sin,
    ox: wx - (ax * cos - ay * sin) * scale,
    oy: wy - (ax * sin + ay * cos) * scale,
  };
}

function toWorld(p: Placed, x: number, y: number): { x: number; y: number } {
  return {
    x: p.ox + (x * p.cos - y * p.sin) * p.scale,
    y: p.oy + (x * p.sin + y * p.cos) * p.scale,
  };
}

/** Signed distance of a world point to a placed shape, in shape units. */
function distance(p: Placed, wx: number, wy: number): number {
  const dx = (wx - p.ox) / p.scale;
  const dy = (wy - p.oy) / p.scale;
  return p.sd(dx * p.cos + dy * p.sin, -dx * p.sin + dy * p.cos);
}

/** Height of the inflated surface over a world point, in px. */
function relief(p: Placed, wx: number, wy: number): number {
  const depth = clamp(-distance(p, wx, wy) / p.bevel, 0, 1);
  // A quarter circle: steep at the outline, flat from `bevel` inwards.
  return Math.sqrt(1 - (1 - depth) * (1 - depth)) * p.bevel * p.scale;
}

/** 4x4 ordered-dither thresholds. */
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

/** Light from the top left, a little towards the viewer. */
const LIGHT = { x: -0.48, y: -0.62, z: 0.54 };
const AMBIENT = 0.2;
/** Tones above this always carry a dot; lighter ones are thinned out by the dither. */
const SOLID = 0.42;
/** Dot radius in pitches for the lightest and the darkest tone. */
const R_MIN = 0.19;
const R_MAX = 0.52;
/** How much of a cell must lie inside the outline for it to belong to the body. */
const BODY = 0.3;
/** Radius of a body disc in pitches: neighbours overlap, so the body has no holes. */
const BODY_RADIUS = 0.74;

/**
 * The composition measured in hand units (the finger is about 0.4 units thick): its width
 * and height, and where the meeting point lies inside it. `field.test.ts` keeps them honest.
 */
const SPAN = { width: 6.16, height: 2.86, meetX: 3.96, meetY: 1.35 };
/** The part of the stage height the cursors may fill. */
const FILL = 0.92;

/**
 * Lays the two cursors out on a stage of `width` x `height` px, centred, and returns their
 * dots. The hand is 34% of the width (never smaller than 170px, never more than 52%), unless
 * the stage is too low for that.
 */
export function buildField(width: number, height: number, options: FieldOptions = {}): Field {
  const pitch = options.pitch ?? clamp(width / 215, 3.4, 6.4);
  const handWidth = Math.min(width * 0.52, Math.max(width * 0.34, 170));
  const unit = Math.min(handWidth / HAND_SPAN, (height * FILL) / SPAN.height);
  const star = clamp(unit * 0.125, 6.5, 15);
  const gap = star * 2 + clamp(unit * 0.14, 6, 16);
  const meet = {
    x: width / 2 + (SPAN.meetX - SPAN.width / 2) * unit,
    y: height / 2 + (SPAN.meetY - SPAN.height / 2) * unit,
  };

  const handPlaced = place(
    { group: HAND, sd: hand, bounds: HAND_BOUNDS, bevel: HAND_BEVEL, albedo: 1 },
    unit,
    (-7 * Math.PI) / 180,
    HAND_TIP,
    0,
    meet.x - gap / 2,
    meet.y,
  );
  const arrowPlaced = place(
    { group: ARROW, sd: arrow, bounds: ARROW_BOUNDS, bevel: ARROW_BEVEL, albedo: 0.78 },
    unit * 1.62,
    0,
    -ARROW_ROUND,
    0,
    meet.x + gap / 2,
    meet.y,
  );

  const side = options.dark ? -1 : 1;
  const lightLength = Math.hypot(LIGHT.x, LIGHT.y, LIGHT.z);
  const lx = (LIGHT.x * side) / lightLength;
  const ly = (LIGHT.y * side) / lightLength;
  const lz = LIGHT.z / lightLength;

  const out: number[] = [];
  let dots = 0;
  const e = pitch * 0.5;
  for (const p of [handPlaced, arrowPlaced]) {
    // World bounding box of the turned shape.
    const corners = [
      toWorld(p, p.bounds.x0, p.bounds.y0),
      toWorld(p, p.bounds.x1, p.bounds.y0),
      toWorld(p, p.bounds.x0, p.bounds.y1),
      toWorld(p, p.bounds.x1, p.bounds.y1),
    ];
    const i0 = Math.floor(Math.min(...corners.map((c) => c.x)) / pitch);
    const i1 = Math.ceil(Math.max(...corners.map((c) => c.x)) / pitch);
    const j0 = Math.floor(Math.min(...corners.map((c) => c.y)) / pitch);
    const j1 = Math.ceil(Math.max(...corners.map((c) => c.y)) / pitch);
    for (let j = j0; j <= j1; j++) {
      for (let i = i0; i <= i1; i++) {
        const x = (i + 0.5) * pitch;
        const y = (j + 0.5) * pitch;
        const edge = distance(p, x, y) * p.scale;
        if (edge > pitch * 0.5) continue;
        const coverage = clamp(0.5 - edge / pitch, 0, 1);
        const nx = -(relief(p, x + e, y) - relief(p, x - e, y)) / (2 * e);
        const ny = -(relief(p, x, y + e) - relief(p, x, y - e)) / (2 * e);
        const lit = Math.max(0, (nx * lx + ny * ly + lz) / Math.hypot(nx, ny, 1));
        const tone = (1 - (AMBIENT + (1 - AMBIENT) * lit) * p.albedo) * coverage;
        const threshold = ((BAYER[((j & 3) << 2) | (i & 3)] ?? 0) + 0.5) / 16;
        const dot = tone >= threshold * SOLID;
        // A cell inside the outline belongs to the body even when the dither leaves it empty.
        if (!dot && coverage < BODY) continue;
        out.push(x, y, dot ? pitch * (R_MIN + (R_MAX - R_MIN) * tone) : 0, p.group);
        if (dot) dots += 1;
      }
    }
  }

  // The name tags sit at the two tips, like the tags of multiplayer cursors, on a diagonal
  // through the meeting point: the hand's above its finger (under it are the knuckles), the
  // arrow's under its tip.
  const tagLift = Math.max(unit * 0.36, star + 9);
  const tagGap = Math.max(5, gap * 0.3);
  return {
    width,
    height,
    pitch,
    cells: Float32Array.from(out),
    count: out.length / STRIDE,
    dots,
    body: pitch * BODY_RADIUS,
    meet,
    star,
    reach: gap / 2 - star * 0.35,
    tags: {
      hand: { x: meet.x - tagGap, y: meet.y - tagLift },
      arrow: { x: meet.x + tagGap, y: meet.y + tagLift },
    },
  };
}

/* ------------------------------------------------------------------ static */

/** The starburst of the site: `points` rounded spikes around the origin, as path data. */
export function starPath(radius: number, points = 12, inner = 0.68): string {
  let d = '';
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? radius : radius * inner;
    const a = (i * Math.PI) / points - Math.PI / 2;
    d += `${i === 0 ? 'M' : 'L'}${(Math.cos(a) * r).toFixed(2)} ${(Math.sin(a) * r).toFixed(2)}`;
  }
  return `${d}Z`;
}

export interface StaticPaths {
  /** The two bodies: one thick stroke per run of cells in a row, drawn in the paper colour. */
  body: { width: number; d: string };
  /** The dots: one path per radius step, every dot a tiny stroke with round caps. */
  dots: { width: number; d: string }[];
}

const short = (value: number): string => value.toFixed(1).replace(/\.0$/, '');

/**
 * The field as a handful of SVG paths with round caps, so a few hundred dots cost a few
 * kilobytes of markup.
 */
export function fieldToPaths(field: Field, steps = 5): StaticPaths {
  let min = Infinity;
  let max = 0;
  for (let k = 0; k < field.count; k++) {
    const r = field.cells[k * STRIDE + 2] ?? 0;
    if (r === 0) continue;
    min = Math.min(min, r);
    max = Math.max(max, r);
  }
  const dots = Array.from({ length: steps }, (_, s) => ({
    width: (min + ((s + 0.5) / steps) * (max - min)) * 2,
    d: '',
  }));
  let body = '';
  let run: { x: number; y: number; group: number; length: number } | undefined;
  const close = (): void => {
    if (run) body += `M${short(run.x)} ${short(run.y)}h${short(Math.max(run.length, 0.01))}`;
    run = undefined;
  };
  // Cells are stored shape by shape, row by row, left to right.
  for (let k = 0; k < field.count; k++) {
    const x = field.cells[k * STRIDE] ?? 0;
    const y = field.cells[k * STRIDE + 1] ?? 0;
    const r = field.cells[k * STRIDE + 2] ?? 0;
    const group = field.cells[k * STRIDE + 3] ?? 0;
    const next =
      run &&
      run.group === group &&
      run.y === y &&
      Math.abs(x - (run.x + run.length) - field.pitch) < 0.01;
    if (run && next) run.length += field.pitch;
    else {
      close();
      run = { x, y, group, length: 0 };
    }
    if (r === 0) continue;
    const step = Math.min(steps - 1, Math.floor(((r - min) / (max - min || 1)) * steps));
    const path = dots[step];
    if (path) path.d += `M${short(x)} ${short(y)}h.01`;
  }
  close();
  return {
    body: { width: Number((field.body * 2).toFixed(2)), d: body },
    dots: dots
      .filter((path) => path.d)
      .map((path) => ({ width: Number(path.width.toFixed(2)), d: path.d })),
  };
}
