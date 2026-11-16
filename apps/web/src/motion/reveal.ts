/**
 * Reveals: `data-reveal="lines|words|chars|rise|fade"` (+ `data-reveal-delay`) and
 * `data-reveal-group` with `data-reveal-item` children. Each element plays once, when it
 * enters the viewport; elements already in view play as soon as the gate opens.
 *
 * Prepared states come from motion.css (scoped to full motion) until the kit marks an
 * element `data-reveal-ready` and takes over with inline styles; `data-revealed` marks the
 * end. Text modes use SplitText with line masks and `autoSplit`, and revert the split
 * when they finish, so the DOM goes back to the author's markup.
 *
 * Nothing the visitor is already looking at stays hidden longer than necessary: an element
 * inside the viewport when the kit initialises starts at once (after the page-transition
 * gate), without waiting for ScrollTrigger. A text reveal there that would have to wait
 * for SplitText or for the fonts rises as a whole instead. Elements above the viewport (a
 * restored scroll position) are shown as they are, also when the position is restored
 * after the kit has started, and so are elements the CSS failsafe has already shown (a kit
 * that arrives after it never hides them again). In a hidden tab animations cannot run (no
 * animation frames), so a reveal that starts there jumps to its end.
 */
import { dur, ease, reveal } from './config';
import { afterGate, currentPage, gsap, inPage, isCurrent, num, ScrollTrigger, track } from './core';
import { getSplitText, loadSplitText } from './split';

type Mode = 'lines' | 'words' | 'chars' | 'rise' | 'fade';

/** Letters already wrapped by a component (the giant name) are animated as they are. */
export const PRESPLIT = '[data-char], [data-giant-letter]';

function modeOf(el: HTMLElement): Mode {
  const value = el.dataset['reveal'];
  return value === 'lines' ||
    value === 'words' ||
    value === 'chars' ||
    value === 'rise' ||
    value === 'fade'
    ? value
    : 'rise';
}

function needsSplit(el: HTMLElement): boolean {
  const mode = modeOf(el);
  return mode === 'lines' || mode === 'words' || (mode === 'chars' && !el.querySelector(PRESPLIT));
}

/** True when the page has text reveals that need SplitText. */
export function pageNeedsSplit(): boolean {
  for (const el of document.querySelectorAll<HTMLElement>('[data-reveal]')) {
    if (needsSplit(el)) return true;
  }
  return false;
}

function markReady(el: Element): void {
  el.setAttribute('data-reveal-ready', '');
}

function markDone(el: Element): void {
  el.setAttribute('data-reveal-ready', '');
  el.setAttribute('data-revealed', '');
}

let lateStart = false;

const FAILSAFE = 'm-failsafe';

function isFailsafe(animation: Animation): boolean {
  return (
    animation instanceof CSSAnimation &&
    animation.animationName === FAILSAFE &&
    animation.playState === 'finished'
  );
}

/** The CSS failsafe (motion.css) has shown prepared elements before the kit arrived. */
export function failsafeFired(): boolean {
  return document.getAnimations().some(isFailsafe);
}

/**
 * Whether to skip the animation and show the element as it is: it is not rendered, it was
 * scrolled past already (back/forward restores the scroll position), the CSS failsafe has
 * shown it before the kit arrived (on screen or not: it must not vanish again), or the page
 * is entered late (a switch of the motion mode) and the element is on screen.
 */
function showNow(el: Element): boolean {
  const rect = el.getBoundingClientRect();
  // Not rendered in this layout (display: none): nothing to play, and a clamped trigger at
  // the top of the page would wait for a scroll.
  if (rect.width + rect.height === 0) return true;
  if (rect.bottom < 0) return true;
  if (el.getAnimations().some(isFailsafe)) return true;
  return lateStart && rect.top < window.innerHeight;
}

/** Inside the viewport right now (any part of it). */
function inView(el: Element): boolean {
  const rect = el.getBoundingClientRect();
  return rect.bottom > 0 && rect.top < window.innerHeight && rect.width + rect.height > 0;
}

/** Entirely above the viewport: scrolled past (a restored scroll position). */
function above(el: Element): boolean {
  return el.getBoundingClientRect().bottom < 0;
}

function hiddenTab(): boolean {
  return document.visibilityState === 'hidden';
}

/**
 * Starts a prepared tween, or completes it at once when it could not be seen anyway. A
 * watchdog completes it too when no animation frame has run by the time it should have
 * ended: some embedded or background views report `visible` but never paint a frame, and
 * the CSS failsafe no longer covers an element the kit has taken over.
 */
function start(tween: gsap.core.Tween | gsap.core.Timeline | undefined, el: Element): void {
  if (!tween) return;
  if (hiddenTab() || above(el)) {
    tween.progress(1);
    return;
  }
  tween.play();
  const frame = gsap.ticker.frame;
  const timer = window.setTimeout(
    () => {
      if (gsap.ticker.frame === frame && tween.progress() < 1) tween.progress(1);
    },
    (tween.totalDuration() + tween.delay()) * 1000 + reveal.failsafeMs,
  );
  track(() => window.clearTimeout(timer));
}

/**
 * Plays `play` once the gate is open: at once for an element already in view, otherwise
 * when it enters the viewport (or is jumped past, which also counts as entering).
 */
function whenVisible(el: Element, play: () => void): void {
  if (inView(el)) {
    afterGate(play);
    return;
  }
  let fired = false;
  const go = () => {
    if (fired) return;
    fired = true;
    afterGate(play);
  };
  // `onLeave` as well: a jump past the whole range (scroll restoration) must still count.
  ScrollTrigger.create({ trigger: el, start: reveal.start, once: true, onEnter: go, onLeave: go });
}

function delayOf(el: HTMLElement): number {
  return num(el.dataset['revealDelay'], 0);
}

function setupSimple(el: HTMLElement, mode: 'rise' | 'fade'): void {
  if (showNow(el)) return markDone(el);
  gsap.set(el, { opacity: 0, y: mode === 'rise' ? reveal.rise : 0 });
  markReady(el);
  const tween = gsap.to(el, {
    opacity: 1,
    y: 0,
    duration: dur[3],
    ease: ease.out,
    delay: delayOf(el),
    paused: true,
    onComplete() {
      gsap.set(el, { clearProps: 'opacity,transform' });
      markDone(el);
    },
  });
  whenVisible(el, () => start(tween, el));
}

function setupPresplit(el: HTMLElement): void {
  const letters = el.querySelectorAll(PRESPLIT);
  if (showNow(el)) return markDone(el);
  gsap.set(letters, { yPercent: reveal.maskOffset });
  markReady(el);
  const tween = gsap.to(letters, {
    yPercent: 0,
    duration: dur[4],
    ease: ease.out,
    stagger: reveal.charStagger,
    delay: delayOf(el),
    paused: true,
    onComplete() {
      gsap.set(letters, { clearProps: 'transform' });
      markDone(el);
    },
  });
  whenVisible(el, () => start(tween, el));
}

function setupSplit(el: HTMLElement, mode: 'lines' | 'words' | 'chars'): void {
  const SplitText = getSplitText();
  if (!SplitText || showNow(el)) return markDone(el);
  const delay = delayOf(el);
  const type = mode === 'lines' ? 'lines' : mode === 'words' ? 'lines,words' : 'lines,words,chars';
  const duration = mode === 'chars' ? dur[4] : dur[3];
  const stagger =
    mode === 'lines'
      ? reveal.lineStagger
      : mode === 'words'
        ? reveal.wordStagger
        : reveal.charStagger;
  let played = false;
  let finished = false;
  let current: gsap.core.Tween | undefined;

  const split = SplitText.create(el, {
    type,
    mask: 'lines',
    linesClass: 'm-line',
    // No aria-label on the element and no aria-hidden pieces (see split.ts).
    aria: 'none',
    autoSplit: true,
    onSplit(self) {
      markReady(el);
      if (finished) return;
      const targets = mode === 'lines' ? self.lines : mode === 'words' ? self.words : self.chars;
      // Returned so that SplitText reverts it and syncs the new one on a re-split.
      current = gsap.fromTo(
        targets,
        { yPercent: reveal.maskOffset },
        {
          yPercent: 0,
          duration,
          ease: ease.out,
          stagger,
          delay,
          paused: !played,
          onComplete: finish,
        },
      );
      return current;
    },
  });

  function finish(): void {
    finished = true;
    split.kill();
    split.revert();
    markDone(el);
  }

  whenVisible(el, () => {
    played = true;
    start(current, el);
  });
}

function setupGroup(group: HTMLElement): void {
  const items = Array.from(group.querySelectorAll<HTMLElement>('[data-reveal-item]'));
  if (items.length === 0) return markDone(group);
  const pending = new Set<HTMLElement>();
  for (const item of items) {
    if (showNow(item)) continue;
    pending.add(item);
  }
  markReady(group);
  if (pending.size === 0) return markDone(group);
  const hidden = [...pending];
  gsap.set(hidden, { opacity: 0, y: reveal.rise });
  const delay = delayOf(group);

  function play(batch: Element[]): void {
    const tween = gsap.to(batch, {
      opacity: 1,
      y: 0,
      duration: dur[3],
      ease: ease.out,
      stagger: reveal.itemStagger,
      delay,
      paused: true,
      onComplete() {
        gsap.set(batch, { clearProps: 'opacity,transform' });
        for (const item of batch) pending.delete(item as HTMLElement);
        if (pending.size === 0) markDone(group);
      },
    });
    const first = batch[0];
    if (first) start(tween, first);
  }

  const now = hidden.filter(inView);
  const later = hidden.filter((item) => !now.includes(item));
  if (now.length > 0) afterGate(() => play(now));
  if (later.length > 0) {
    ScrollTrigger.batch(later, {
      start: reveal.start,
      once: true,
      onEnter: (batch) => afterGate(() => play(batch)),
    });
  }
}

function guarded(el: HTMLElement, fn: () => void): void {
  try {
    fn();
  } catch (error) {
    console.error('[motion] reveal failed', el, error);
    markDone(el);
  }
}

/**
 * Prepares every reveal on the page. `late` is true when the CSS failsafe has already shown
 * the page (a very slow first load): elements on screen then stay as they are.
 */
export function initReveals(reduced: boolean, late: boolean): void {
  if (reduced) return;
  lateStart = late;
  const page = currentPage();
  const textEls: HTMLElement[] = [];

  // A split needs SplitText and the final fonts; on screen there is no time to wait for them.
  const splitNow = getSplitText() !== undefined && document.fonts?.status === 'loaded';

  for (const el of document.querySelectorAll<HTMLElement>('[data-reveal]')) {
    if (el.hasAttribute('data-revealed')) continue;
    const mode = modeOf(el);
    if (needsSplit(el)) {
      // Shown as it is without SplitText (not rendered, scrolled past, shown by the failsafe).
      if (showNow(el)) markDone(el);
      else if (!splitNow && inView(el)) guarded(el, () => setupSimple(el, 'rise'));
      else textEls.push(el);
    } else if (mode === 'chars') guarded(el, () => setupPresplit(el));
    else guarded(el, () => setupSimple(el, mode === 'fade' ? 'fade' : 'rise'));
  }
  for (const group of document.querySelectorAll<HTMLElement>('[data-reveal-group]')) {
    if (!group.hasAttribute('data-revealed')) guarded(group, () => setupGroup(group));
  }

  if (textEls.length === 0) return;
  loadSplitText()
    .then(() => {
      if (!isCurrent(page)) return;
      inPage(() => {
        for (const el of textEls) {
          const mode = modeOf(el) as 'lines' | 'words' | 'chars';
          guarded(el, () => setupSplit(el, mode));
        }
      });
      ScrollTrigger.refresh();
    })
    .catch((error: unknown) => {
      console.error('[motion] SplitText unavailable', error);
      for (const el of textEls) markDone(el);
    });
}
