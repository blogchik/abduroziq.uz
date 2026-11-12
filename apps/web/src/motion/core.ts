/**
 * Shared core of the motion kit: GSAP setup, environment checks and the per-page
 * lifecycle (one `gsap.context` plus a list of cleanups per page, released on leave).
 */
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { cssEase, dur } from './config';

gsap.registerPlugin(ScrollTrigger);

/* ------------------------------------------------------------------ eases */

/** A cubic-bezier easing function (same maths as CSS), so the tokens need no plugin. */
function bezier(x1: number, y1: number, x2: number, y2: number): (t: number) => number {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  const sx = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sy = (t: number) => ((ay * t + by) * t + cy) * t;
  const dx = (t: number) => (3 * ax * t + 2 * bx) * t + cx;
  return (p: number) => {
    if (p <= 0) return 0;
    if (p >= 1) return 1;
    let t = p;
    for (let i = 0; i < 8; i++) {
      const err = sx(t) - p;
      if (Math.abs(err) < 1e-5) break;
      const d = dx(t);
      if (Math.abs(d) < 1e-6) break;
      t -= err / d;
    }
    // Fall back to bisection when Newton's method did not converge.
    if (Math.abs(sx(t) - p) > 1e-4) {
      let lo = 0;
      let hi = 1;
      t = p;
      for (let i = 0; i < 20; i++) {
        if (sx(t) < p) lo = t;
        else hi = t;
        t = (lo + hi) / 2;
      }
    }
    return sy(t);
  };
}

function parseBezier(css: string): [number, number, number, number] {
  const [a = 0, b = 0, c = 1, d = 1] = (css.match(/-?[\d.]+/g) ?? []).map(Number);
  return [a, b, c, d];
}

gsap.registerEase('motionOut', bezier(...parseBezier(cssEase.out)));
gsap.registerEase('motionInOut', bezier(...parseBezier(cssEase.inOut)));

/** CSS custom properties with the motion tokens, for elements the kit creates. */
export function applyTokenVars(el: HTMLElement): void {
  el.style.setProperty('--m-dur-1', `${dur[1]}s`);
  el.style.setProperty('--m-dur-2', `${dur[2]}s`);
  el.style.setProperty('--m-dur-3', `${dur[3]}s`);
  el.style.setProperty('--m-dur-4', `${dur[4]}s`);
  el.style.setProperty('--m-ease-out', cssEase.out);
  el.style.setProperty('--m-ease-in-out', cssEase.inOut);
}

/* ------------------------------------------------------------- environment */

/**
 * True when motion should be reduced. `data-motion` on <html> is the single source of truth:
 * BaseLayout's inline script sets it from `prefers-reduced-motion`, and
 * `localStorage.motion = 'reduced' | 'full'` overrides it for testing.
 */
export function prefersReducedMotion(): boolean {
  if (typeof document === 'undefined') return false;
  const value = document.documentElement.dataset['motion'];
  if (value === 'reduced') return true;
  if (value === 'full') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

const fineQuery = '(hover: hover) and (pointer: fine)';

/** A mouse or trackpad is the primary pointer. */
export function finePointer(): boolean {
  return window.matchMedia(fineQuery).matches;
}

export const fineMedia = window.matchMedia(fineQuery);
export const forcedColorsMedia = window.matchMedia('(forced-colors: active)');

/* --------------------------------------------------------- page lifecycle */

type Cleanup = () => void;

let generation = 0;
let active = false;
let ctx: gsap.Context | undefined;
let cleanups: Cleanup[] = [];

/** Identifies the current page; async work compares it with `isCurrent` before applying. */
export function currentPage(): number {
  return generation;
}

export function isCurrent(page: number): boolean {
  return active && page === generation;
}

/** Starts a new page scope. */
export function beginPage(): number {
  generation += 1;
  active = true;
  ctx = gsap.context(() => {});
  return generation;
}

/** Releases everything created for the current page. */
export function endPage(): void {
  active = false;
  const pending = cleanups;
  cleanups = [];
  for (let i = pending.length - 1; i >= 0; i--) {
    try {
      pending[i]?.();
    } catch (error) {
      console.error('[motion] cleanup failed', error);
    }
  }
  ctx?.revert();
  ctx = undefined;
}

/**
 * Runs `fn` inside the page's `gsap.context`, so tweens, ScrollTriggers, SplitTexts and
 * Draggables it creates are reverted on leave.
 */
export function inPage<T>(fn: () => T): T | undefined {
  if (!ctx || !active) return undefined;
  return ctx.add(fn);
}

/** Registers a function that runs when the page is left. */
export function track(cleanup: Cleanup): void {
  if (active) cleanups.push(cleanup);
  else cleanup();
}

/** `addEventListener` that is removed automatically when the page is left. */
export function listen<K extends keyof HTMLElementEventMap>(
  target: HTMLElement | Document | Window,
  type: K,
  handler: (event: HTMLElementEventMap[K]) => void,
  options?: AddEventListenerOptions,
): void {
  const fn = handler as EventListener;
  target.addEventListener(type, fn, options);
  track(() => target.removeEventListener(type, fn, options));
}

/* ------------------------------------------------------------------- gate */

/**
 * Entrances wait for the gate: open immediately on a first load, opened by the page
 * transition while its panel leaves after a client-side navigation.
 */
let gateOpen = true;
let gateWaiters: Array<() => void> = [];

export function closeGate(): void {
  gateOpen = false;
}

export function openGate(): void {
  gateOpen = true;
  const waiters = gateWaiters;
  gateWaiters = [];
  for (const fn of waiters) fn();
}

/**
 * Calls `fn` (inside the page context) once the gate is open, unless the page has been left
 * by then.
 */
export function afterGate(fn: () => void): void {
  const page = generation;
  if (gateOpen) {
    if (isCurrent(page)) inPage(fn);
    return;
  }
  gateWaiters.push(() => {
    if (isCurrent(page)) inPage(fn);
  });
}

/* ------------------------------------------------------------------ utils */

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function num(value: string | undefined, fallback: number): number {
  if (value === undefined || value.trim() === '') return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export { gsap, ScrollTrigger };
