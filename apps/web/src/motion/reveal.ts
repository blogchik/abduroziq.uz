/**
 * Reveals: `data-reveal="lines|words|chars|rise|fade"` (+ `data-reveal-delay`) and
 * `data-reveal-group` with `data-reveal-item` children. Each element plays once, when it
 * enters the viewport; elements already in view play as soon as the gate opens.
 *
 * Prepared states come from motion.css (scoped to full motion) until the kit marks an
 * element `data-reveal-ready` and takes over with inline styles; `data-revealed` marks the
 * end. Text modes use SplitText with line masks and `autoSplit`, and revert the split
 * when they finish, so the DOM goes back to the author's markup.
 */
import { dur, ease, reveal } from './config';
import { afterGate, currentPage, gsap, inPage, isCurrent, num, ScrollTrigger } from './core';
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

/**
 * Whether to skip the animation and show the element as it is: it was scrolled past
 * already (back/forward restores the scroll position), or the CSS failsafe has shown the
 * page before the kit arrived and the element is on screen.
 */
function showNow(el: Element): boolean {
  const rect = el.getBoundingClientRect();
  if (rect.bottom < 0) return true;
  return lateStart && rect.top < window.innerHeight;
}

/** Plays `play` once, when `el` enters the viewport and the gate is open. */
function whenVisible(el: Element, play: () => void): void {
  ScrollTrigger.create({
    trigger: el,
    start: reveal.start,
    once: true,
    onEnter: () => afterGate(play),
  });
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
  whenVisible(el, () => tween.play());
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
  whenVisible(el, () => tween.play());
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
    current?.play();
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
  ScrollTrigger.batch(hidden, {
    start: reveal.start,
    once: true,
    onEnter: (batch) =>
      afterGate(() => {
        gsap.to(batch, {
          opacity: 1,
          y: 0,
          duration: dur[3],
          ease: ease.out,
          stagger: reveal.itemStagger,
          delay,
          onComplete() {
            gsap.set(batch, { clearProps: 'opacity,transform' });
            for (const item of batch) pending.delete(item as HTMLElement);
            if (pending.size === 0) markDone(group);
          },
        });
      }),
  });
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

  for (const el of document.querySelectorAll<HTMLElement>('[data-reveal]')) {
    if (el.hasAttribute('data-revealed')) continue;
    const mode = modeOf(el);
    if (needsSplit(el)) textEls.push(el);
    else if (mode === 'chars') guarded(el, () => setupPresplit(el));
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
