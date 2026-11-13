/**
 * Motion tokens (docs/DESIGN.md 2.4) and the kit's tuning values. The only place where
 * durations and easings are defined; GSAP reads them from here and the kit copies the CSS
 * ones onto its own elements as custom properties (`--m-dur-1`, `--m-ease-out`, ...).
 */

/** Durations in seconds (GSAP units). */
export const dur = {
  1: 0.16,
  2: 0.32,
  3: 0.7,
  4: 1.1,
} as const;

/** Easings as CSS strings, for the kit's CSS transitions. */
export const cssEase = {
  out: 'cubic-bezier(0.16, 1, 0.3, 1)',
  inOut: 'cubic-bezier(0.65, 0, 0.35, 1)',
} as const;

/**
 * GSAP ease names. `out` and `inOut` are registered as custom eases from the cubic-bezier
 * tokens in `ease.ts` (no CustomEase plugin needed); the springs are built-in eases.
 */
export const ease = {
  out: 'motionOut',
  inOut: 'motionInOut',
  spring: 'elastic.out(1, 0.6)',
  springSoft: 'back.out(1.6)',
} as const;

export const reveal = {
  /** Lines, words: offset in % of the line height, rising from behind the mask. */
  maskOffset: 110,
  lineStagger: 0.08,
  wordStagger: 0.03,
  charStagger: 0.035,
  /** Rise and group items: offset in px. */
  rise: 16,
  itemStagger: 0.06,
  /** ScrollTrigger start for reveals. */
  start: 'top 88%',
  /** After this long without the kit, CSS shows everything (keep in sync with motion.css). */
  failsafeMs: 1000,
} as const;

export const cursor = {
  /** Lerp factor per 60fps frame for the dot and the (lagging) ring. */
  dotLerp: 0.22,
  ringLerp: 0.15,
  burstMs: 200,
} as const;

export const smooth = {
  /** Lenis lerp: higher is tighter. 0.1 is the Lenis default and feels floaty. */
  lerp: 0.14,
  wheelMultiplier: 1,
} as const;

export const scroll = {
  /** `data-scrolled` appears after this many pixels. */
  scrolledAfter: 80,
  /** Ignore direction changes smaller than this (px), to avoid flicker. */
  dirThreshold: 4,
} as const;

export const marquee = {
  /** Default speed in px per second. */
  speed: 60,
  /** Scroll velocity (px/s) that adds one times the base speed. */
  velocityPerBoost: 300,
  maxBoost: 8,
  /** How fast the speed eases back, per 60fps frame. */
  easeBack: 0.06,
} as const;

export const desk = {
  liftScale: 1.03,
  /** Degrees of tilt per px/s of horizontal velocity, and its limit. */
  tiltPerVelocity: 0.012,
  maxTilt: 14,
  /** Part of the throw tilt that stays after landing. */
  settleKeep: 0.25,
  maxSettle: 6,
  resetStagger: 0.06,
  entranceStagger: 0.08,
  entranceDrop: 140,
} as const;

export const follower = {
  lag: 0.55,
  tiltPerVelocity: 0.01,
  maxTilt: 8,
} as const;

export const magnetic = {
  strength: 0.25,
} as const;

export const transition = {
  /** The panel covers in half of dur-4 and leaves in the other half. */
  cover: dur[4] / 2,
  leave: dur[4] / 2,
  /** Reveals on the new page start when this much of the leave has run. */
  revealAt: 0.45,
} as const;
