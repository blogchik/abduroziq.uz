/**
 * The hero's client side: the entrance sequence (DESIGN 7.1) and the live data.
 *
 * Entrance, one timeline:
 *   0.00  section label; the sentence's lines rise from behind their masks (80ms stagger)
 *   0.30  the capsules pop in with the spring (120ms stagger); the supporting line rises
 *   0.50  the name's letters rise from the baseline (35ms stagger, dur-4)
 *   0.90  the label strip wipes in from the left, then its print fades in; the meta bar
 *   1.10  the desk objects drop in (the motion kit's `data-desk-entrance`)
 * The name and the strip join the timeline only when they are on screen at that moment;
 * on a short viewport they start below the fold and play when they are scrolled to.
 *
 * The parts are held back by CSS (Hero.astro) until this module applies their start poses
 * and marks the hero `data-hero-ready`, so nothing flashes; without JavaScript, under
 * reduced motion, or when the CSS failsafe has already shown the page, everything simply
 * stays as written.
 */
import { gsap, onPageEnter, ScrollTrigger, splitLines } from '@/motion';
import { dur, ease, reveal } from '@/motion/config';
// Entrances wait for the page-transition panel. The gate is not part of the kit's public
// exports yet (see the hand-off notes); it is the same function the kit's own reveals use.
import { afterGate } from '@/motion/core';

declare global {
  interface Window {
    /** Defined by the inline script in Hero.astro: paints sky, clock, month and year. */
    __heroNow?: (hero: HTMLElement) => void;
  }
}

let firstLoad = true;

function all(root: ParentNode, selector: string): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(selector));
}

/** Keeps the clock, the month and the sky current; returns the function that stops it. */
function keepTime(hero: HTMLElement): () => void {
  const tick = (): void => window.__heroNow?.(hero);
  tick();
  let interval = 0;
  // Start on the next full second so the display changes when the second does.
  const timeout = window.setTimeout(
    () => {
      tick();
      interval = window.setInterval(tick, 1000);
    },
    1000 - (Date.now() % 1000),
  );
  return () => {
    window.clearTimeout(timeout);
    window.clearInterval(interval);
  };
}

/** Marks the hero while it is off screen, so its CSS loops can pause. */
function watchVisibility(hero: HTMLElement): () => void {
  const observer = new IntersectionObserver(([entry]) => {
    if (entry) hero.toggleAttribute('data-offscreen', !entry.isIntersecting);
  });
  observer.observe(hero);
  return () => observer.disconnect();
}

/**
 * Puts `segment` on the entrance at `at` seconds when `trigger` is on screen; a part that
 * starts below the fold plays when it is scrolled to instead (nothing animates unseen).
 */
function schedule(
  entrance: gsap.core.Timeline,
  segment: gsap.core.Timeline,
  trigger: Element | undefined,
  at: number,
): void {
  if (!trigger) return;
  if (trigger.getBoundingClientRect().top < window.innerHeight * 0.9) {
    entrance.add(segment.paused(false), at);
    return;
  }
  ScrollTrigger.create({
    trigger,
    start: reveal.start,
    once: true,
    onEnter: () => segment.play(),
  });
}

function buildEntrance(hero: HTMLElement): void {
  const sentence = hero.querySelector<HTMLElement>('[data-hero-sentence]');
  const label = all(hero, '[data-hero-part="label"]');
  const support = all(hero, '[data-hero-part="support"]');
  const meta = all(hero, '[data-hero-part="meta"]');
  const name = all(hero, '[data-hero-part="name"]');
  const letters = all(hero, '[data-hero-part="name"] [data-giant-letter]');
  const strip = all(hero, '[data-hero-strip]');
  const print = all(hero, '[data-strip-part]');

  const split = sentence ? splitLines(sentence) : undefined;
  // Queried after the split: these are the nodes that are on screen during the entrance.
  const capsules = sentence ? all(sentence, '[data-capsule]') : [];
  const intro = [...label, ...support];

  gsap.set(split?.lines ?? [], { yPercent: reveal.maskOffset });
  gsap.set(capsules, { scale: 0 });
  gsap.set(letters, { yPercent: reveal.maskOffset });
  gsap.set(strip, { clipPath: 'inset(0% 100% 0% 0%)' });
  gsap.set(print, { opacity: 0 });
  gsap.set([...intro, ...meta], { opacity: 0, y: reveal.rise });
  hero.setAttribute('data-hero-ready', '');

  // Each part goes back to the markup as written when it is done: no inline styles.
  const clear = (targets: HTMLElement[]) => () => gsap.set(targets, { clearProps: 'all' });
  const rise = { opacity: 1, y: 0, duration: dur[3], ease: ease.out };

  const entrance = gsap.timeline({ onComplete: clear(intro) });
  entrance.to(label, rise, 0).to(support, rise, 0.3);
  if (split) {
    entrance
      .to(
        split.lines,
        { yPercent: 0, duration: dur[3], ease: ease.out, stagger: reveal.lineStagger },
        0,
      )
      .to(capsules, { scale: 1, duration: dur[4], ease: ease.spring, stagger: 0.12 }, 0.3)
      // The split is undone as soon as the capsules have settled, so the sentence wraps
      // freely again (the capsules are re-created by the revert, in their final state).
      .call(() => split.revert(), [], 0.3 + 0.12 * Math.max(0, capsules.length - 1) + dur[4]);
  }

  const nameIn = gsap.timeline({ paused: true, onComplete: clear(letters) }).to(letters, {
    yPercent: 0,
    duration: dur[4],
    ease: ease.out,
    stagger: reveal.charStagger,
  });
  schedule(entrance, nameIn, name[0], 0.5);

  const stripIn = gsap
    .timeline({ paused: true, onComplete: clear([...strip, ...print, ...meta]) })
    .to(strip, { clipPath: 'inset(0% 0% 0% 0%)', duration: dur[3], ease: ease.inOut }, 0)
    .to(print, { opacity: 1, duration: dur[2], ease: 'none', stagger: 0.05 }, dur[3] * 0.6)
    .to(meta, rise, 0.3);
  schedule(entrance, stripIn, strip[0], 0.9);
}

onPageEnter(({ reduced }) => {
  const hero = document.querySelector<HTMLElement>('[data-hero]');
  if (!hero) return;

  const stopClock = keepTime(hero);
  const stopWatching = watchVisibility(hero);
  let alive = true;
  const cleanup = (): void => {
    alive = false;
    stopClock();
    stopWatching();
  };

  // Shown as written: reduced motion, a hero already scrolled past (history restore), or
  // a first load so slow that the CSS failsafe has revealed the page before us.
  const late = firstLoad && performance.now() > reveal.failsafeMs - 150;
  firstLoad = false;
  if (reduced || late || hero.getBoundingClientRect().bottom < 0) {
    hero.setAttribute('data-hero-ready', '');
    return cleanup;
  }

  const start = (): void => {
    if (alive) afterGate(() => buildEntrance(hero));
  };
  // Lines are measured, so the sentence's font should be in. It is preloaded; do not wait
  // long for it on a bad connection.
  if (document.fonts.status === 'loaded') start();
  else
    void Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 400))]).then(start);

  return cleanup;
});
