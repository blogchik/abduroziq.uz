/**
 * Motion kit entry. STUB: it keeps the public contract of docs/ARCHITECTURE.md section 7
 * (class `js`, `data-motion`, `onPageEnter`, `prefersReducedMotion`, `splitLines`, `gsap`,
 * `ScrollTrigger`) without any animation. The motion owner replaces the internals and must
 * keep these exports.
 *
 * This module is bundled once and never re-executes during client-side navigation, so all
 * per-page work hangs off the `astro:*` events.
 */
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

type Cleanup = () => void;
type PageEnterCallback = (ctx: { reduced: boolean }) => void | Cleanup;

const REDUCED_QUERY = '(prefers-reduced-motion: reduce)';

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia(REDUCED_QUERY).matches;
}

/** Astro replaces the <html> attributes on every swap, so the global state is re-applied. */
function applyRootState(): void {
  const root = document.documentElement;
  root.classList.add('js');
  root.dataset['motion'] = prefersReducedMotion() ? 'reduced' : 'full';
}

const callbacks = new Set<PageEnterCallback>();
let cleanups: Cleanup[] = [];
let active = false;

function run(cb: PageEnterCallback): void {
  const cleanup = cb({ reduced: prefersReducedMotion() });
  if (typeof cleanup === 'function') cleanups.push(cleanup);
}

/**
 * Runs `cb` on every page load (first load and after each client-side navigation).
 * A function returned from `cb` runs before the next navigation swaps the page.
 */
export function onPageEnter(cb: PageEnterCallback): void {
  callbacks.add(cb);
  if (active) run(cb);
}

function enter(): void {
  if (active) return;
  active = true;
  applyRootState();
  for (const cb of callbacks) run(cb);
}

function leave(): void {
  const pending = cleanups;
  cleanups = [];
  active = false;
  for (const cleanup of pending) cleanup();
}

/** Splits an element into lines. Stub: the element itself is the single "line". */
export function splitLines(el: Element): { lines: Element[]; revert(): void } {
  return { lines: [el], revert() {} };
}

document.addEventListener('astro:page-load', enter);
document.addEventListener('astro:before-swap', leave);
document.addEventListener('astro:after-swap', applyRootState);

applyRootState();
// The first `astro:page-load` can fire before or after this module runs; `enter` is idempotent.
if (document.readyState !== 'loading') enter();
else document.addEventListener('DOMContentLoaded', enter, { once: true });

export { gsap, ScrollTrigger };
