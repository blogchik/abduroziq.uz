/**
 * Root state maintained while the page is used: `data-scroll-dir="up|down"` and
 * `data-scrolled` (after 80px) on <html>, plus a scroll velocity for the marquee.
 * One passive scroll listener for the whole session. Astro replaces the <html> attributes
 * on every swap, so `applyScrollState` runs again after each one.
 */
import { scroll } from './config';

const root = document.documentElement;
let lastY = window.scrollY;
let anchorY = lastY;
let dir: 'up' | 'down' = 'up';
let lastTime = performance.now();
let lastEvent = 0;
let velocity = 0;

function write(): void {
  const y = window.scrollY;
  if (root.dataset['scrollDir'] !== dir) root.dataset['scrollDir'] = dir;
  const scrolled = y > scroll.scrolledAfter;
  if (scrolled !== root.hasAttribute('data-scrolled'))
    root.toggleAttribute('data-scrolled', scrolled);
}

function onScroll(): void {
  const y = window.scrollY;
  const now = performance.now();
  const dy = y - lastY;
  const dt = Math.max(1, now - lastTime);
  const instant = (dy / dt) * 1000;
  // Light smoothing; a pause longer than 120ms starts from scratch.
  velocity = now - lastEvent > 120 ? instant : velocity * 0.6 + instant * 0.4;
  lastEvent = now;
  lastTime = now;
  lastY = y;
  const moved = y - anchorY;
  if (Math.abs(moved) >= scroll.dirThreshold) {
    dir = moved > 0 ? 'down' : 'up';
    anchorY = y;
  }
  write();
}

/** Scroll velocity in px/s (positive when scrolling down); 0 shortly after scrolling stops. */
export function scrollVelocity(): number {
  return performance.now() - lastEvent > 120 ? 0 : velocity;
}

/** Re-applies the attributes; after a swap the new page starts with the header visible. */
export function applyScrollState(reset = false): void {
  if (reset) {
    dir = 'up';
    lastY = window.scrollY;
    anchorY = lastY;
    velocity = 0;
  }
  write();
}

window.addEventListener('scroll', onScroll, { passive: true });
