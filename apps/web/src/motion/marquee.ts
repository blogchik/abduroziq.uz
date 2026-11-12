/**
 * Marquee: `data-marquee` with a `data-marquee-track` child loops endlessly. The kit clones
 * the track's children (inert, hidden from assistive technology) until the loop is
 * seamless. `data-marquee-speed` is px per second (negative reverses), `data-marquee-scroll`
 * makes speed and direction follow the scroll velocity and ease back. Runs only while
 * on screen; static under reduced motion.
 */
import { marquee as cfg } from './config';
import { gsap, num, track } from './core';
import { scrollVelocity } from './root-state';

function setup(el: HTMLElement): void {
  const trackEl = el.querySelector<HTMLElement>('[data-marquee-track]');
  if (!trackEl) return;
  const originals = Array.from(trackEl.children) as HTMLElement[];
  if (originals.length === 0) return;

  const speed = num(el.dataset['marqueeSpeed'], cfg.speed);
  const followScroll = el.hasAttribute('data-marquee-scroll');
  const setX = gsap.quickSetter(trackEl, 'x', 'px') as (value: number) => void;

  let clones: HTMLElement[] = [];
  let period = 0;
  let pos = 0;
  let mult = 1;
  let dir = 1;
  let running = false;
  let alive = true;

  function build(): void {
    for (const clone of clones) clone.remove();
    clones = [];
    const first = originals[0];
    const last = originals[originals.length - 1];
    if (!first || !last) return;
    const start = first.offsetLeft;
    const contentWidth = last.offsetLeft + last.offsetWidth - start;
    if (contentWidth <= 0) return;
    // One full copy gives the period; add copies until one period plus the visible width
    // is always covered.
    const copies = Math.max(1, Math.ceil(el.clientWidth / contentWidth) + 1);
    for (let i = 0; i < copies; i++) {
      for (const node of originals) {
        const clone = node.cloneNode(true) as HTMLElement;
        clone.setAttribute('aria-hidden', 'true');
        clone.inert = true;
        trackEl!.append(clone);
        clones.push(clone);
      }
    }
    const firstClone = clones[0];
    period = firstClone ? firstClone.offsetLeft - start : contentWidth;
    pos = gsap.utils.wrap(-period, 0, pos);
    setX(pos);
  }

  function tick(_time: number, deltaTime: number): void {
    if (period <= 0) return;
    const frames = Math.min(4, deltaTime / (1000 / 60));
    let target = 1;
    if (followScroll) {
      const v = scrollVelocity();
      if (v !== 0) dir = v > 0 ? 1 : -1;
      target = dir * (1 + Math.min(cfg.maxBoost, Math.abs(v) / cfg.velocityPerBoost));
    }
    mult += (target - mult) * (1 - Math.pow(1 - cfg.easeBack, frames));
    pos -= (speed * mult * deltaTime) / 1000;
    pos = gsap.utils.wrap(-period, 0, pos);
    setX(pos);
  }

  function run(next: boolean): void {
    if (next === running) return;
    running = next;
    if (next) gsap.ticker.add(tick);
    else gsap.ticker.remove(tick);
  }

  const io = new IntersectionObserver((entries) => {
    run(entries.some((entry) => entry.isIntersecting));
  });
  let frame = 0;
  let lastWidth = el.clientWidth;
  const ro = new ResizeObserver(() => {
    if (el.clientWidth === lastWidth) return;
    lastWidth = el.clientWidth;
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(build);
  });

  build();
  el.setAttribute('data-marquee-ready', '');
  io.observe(el);
  ro.observe(el);
  // Fonts change the width of the text; rebuild once they are in.
  void document.fonts?.ready.then(() => {
    if (alive) build();
  });

  track(() => {
    alive = false;
    run(false);
    io.disconnect();
    ro.disconnect();
    cancelAnimationFrame(frame);
    for (const clone of clones) clone.remove();
    clones = [];
    gsap.set(trackEl, { clearProps: 'transform' });
    el.removeAttribute('data-marquee-ready');
  });
}

export function initMarquees(reduced: boolean): void {
  if (reduced) return;
  for (const el of document.querySelectorAll<HTMLElement>('[data-marquee]')) setup(el);
}
