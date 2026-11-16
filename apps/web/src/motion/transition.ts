/**
 * Page transition (docs/DESIGN.md 3.4) on Astro's view-transition lifecycle:
 *
 * 1. `astro:before-preparation`: a paper panel with an accent leading hairline wipes up over
 *    the old page; the page fetch waits for it (the loader is wrapped).
 * 2. The swap happens underneath (motion.css switches the default root cross-fade off, so
 *    the browser's snapshots are both "panel").
 * 3. `astro:after-swap`: the panel is moved into the new <body>.
 * 4. `astro:page-load`: the panel leaves upward; part way through it opens the gate and the
 *    new page's entrances run.
 *
 * Rapid clicks re-use the running cover, back/forward goes through the same events, and
 * reduced motion gets no panel. A navigation the router cancels without starting another
 * one (a same-page anchor or Back to a hash entry while the panel covers) has no swap and no
 * page load: the panel leaves when its navigation is aborted.
 *
 * Links the router must not handle (a target with a file extension other than .html, such
 * as the RSS feeds, or `data-astro-reload`) never start the panel: such anchors are marked
 * `data-astro-reload` before the router sees the click, and a navigation to one is ignored
 * at `astro:before-preparation` as well. A page restored from the back/forward cache comes
 * back with the panel, the gate and the cursor reset to idle.
 *
 * The panel's tweens have a watchdog: without animation frames they finish on a timer, so
 * a navigation never hangs on a view that does not paint.
 *
 * Shared-element morphs whose name starts with `post-` get the view-transition class
 * `m-text` (motion.css): the box morphs, the text cross-fades at its natural size.
 */
import { ease, transition as cfg } from './config';
import { applyTokenVars, closeGate, gsap, openGate, prefersReducedMotion } from './core';
import { resetCursor } from './cursor';

interface PreparationEvent extends Event {
  loader: () => Promise<void>;
  to?: URL;
  sourceElement?: Element;
  signal?: AbortSignal;
}

type PanelState = 'idle' | 'covering' | 'covered' | 'leaving';

let panel: HTMLDivElement | undefined;
let panelState: PanelState = 'idle';
let tween: gsap.core.Tween | undefined;
let covering: Promise<void> | undefined;
/** Settles the running cover's promise (a reset must not leave a loader waiting). */
let release: (() => void) | undefined;

function ensurePanel(): HTMLDivElement {
  if (!panel) {
    panel = document.createElement('div');
    panel.className = 'm-wipe';
    panel.setAttribute('aria-hidden', 'true');
    applyTokenVars(panel);
    gsap.set(panel, { y: 0, yPercent: 100, visibility: 'hidden' });
  }
  if (panel.parentElement !== document.body) document.body.append(panel);
  return panel;
}

function cover(): Promise<void> {
  const el = ensurePanel();
  if (panelState === 'covered') return Promise.resolve();
  if (panelState === 'covering' && covering) return covering;
  tween?.kill();
  // From the bottom, or from wherever a leaving panel currently is.
  if (panelState === 'idle') gsap.set(el, { yPercent: 100 });
  gsap.set(el, { visibility: 'visible' });
  panelState = 'covering';
  covering = new Promise<void>((resolve) => {
    release = resolve;
    tween = gsap.to(el, {
      yPercent: 0,
      duration: cfg.cover,
      ease: ease.inOut,
      onComplete() {
        panelState = 'covered';
        covering = undefined;
        resolve();
      },
      onInterrupt: resolve,
    });
    watchdog(tween, cfg.cover);
  });
  return covering;
}

/**
 * Finishes a panel tween when no animation frame has run by the time it should have ended
 * (a view that reports itself visible but paints nothing): a navigation must never wait on
 * frames that do not come.
 */
function watchdog(t: gsap.core.Tween, seconds: number): void {
  const frame = gsap.ticker.frame;
  window.setTimeout(
    () => {
      if (tween === t && gsap.ticker.frame === frame && t.progress() < 1) t.progress(1);
    },
    seconds * 1000 + 250,
  );
}

async function leave(): Promise<void> {
  if (panelState === 'idle' || panelState === 'leaving' || !panel) {
    openGate();
    return;
  }
  if (covering) await covering;
  if (panelState !== 'covered' || !panel) return;
  const el = panel;
  panelState = 'leaving';
  let opened = false;
  tween = gsap.to(el, {
    yPercent: -100,
    duration: cfg.leave,
    ease: ease.inOut,
    onUpdate() {
      if (!opened && this.progress() >= cfg.revealAt) {
        opened = true;
        openGate();
      }
    },
    onComplete() {
      if (!opened) openGate();
      gsap.set(el, { yPercent: 100, visibility: 'hidden' });
      panelState = 'idle';
    },
  });
  watchdog(tween, cfg.leave);
}

/** A path whose last segment has an extension other than .html: a feed, an image, a file. */
function isFile(url: URL): boolean {
  const ext = /\.([a-z0-9]+)$/i.exec(url.pathname)?.[1]?.toLowerCase();
  return ext !== undefined && ext !== 'html' && ext !== 'htm';
}

/** Runs before the router's own click handler (capture phase). */
function onClickCapture(event: MouseEvent): void {
  const anchor = event.target instanceof Element ? event.target.closest('a[href]') : null;
  if (!(anchor instanceof HTMLAnchorElement) || anchor.hasAttribute('data-astro-reload')) return;
  let url: URL;
  try {
    url = new URL(anchor.href, location.href);
  } catch {
    return;
  }
  if (url.origin === location.origin && isFile(url)) anchor.setAttribute('data-astro-reload', '');
}

/** Navigations that started the panel; the last one is the one the panel waits for. */
let navigations = 0;
/** The navigation that reached its swap: from then on `astro:page-load` lets the panel go. */
let swapped = 0;

function onBeforePreparation(event: Event): void {
  if (prefersReducedMotion()) return;
  const prep = event as PreparationEvent;
  if (typeof prep.loader !== 'function') return;
  if (prep.to instanceof URL && isFile(prep.to)) return;
  if (prep.sourceElement?.hasAttribute('data-astro-reload')) return;
  closeGate();
  const load = prep.loader;
  prep.loader = async () => {
    await Promise.all([load(), cover()]);
  };
  // The router cancels this navigation when another one starts. A newer navigation that
  // swaps announces itself in the same task, so a microtask later it has started the panel
  // again; when none did (a same-page anchor or Back to a hash entry of this document: no
  // swap, no page load follows), the panel leaves and the gate opens here.
  const id = ++navigations;
  prep.signal?.addEventListener(
    'abort',
    () => {
      queueMicrotask(() => {
        if (id === navigations && swapped !== id) finishTransition();
      });
    },
    { once: true },
  );
}

function onBeforeSwap(): void {
  swapped = navigations;
}

/** After the swap the new <body> needs the panel (still covering). */
export function restorePanel(): void {
  if (panel && panelState !== 'idle') ensurePanel();
}

/** On page load: let the panel go (or just open the gate when there is none). */
export function finishTransition(): void {
  void leave();
}

/** Puts the panel away at once and opens the gate. */
export function resetPanel(): void {
  tween?.kill();
  tween = undefined;
  covering = undefined;
  release?.();
  release = undefined;
  panelState = 'idle';
  if (panel) gsap.set(panel, { yPercent: 100, visibility: 'hidden' });
  openGate();
}

/** Back/forward cache: the page comes back exactly as it was left, panel included. */
function onPageShow(event: PageTransitionEvent): void {
  if (!event.persisted) return;
  resetPanel();
  resetCursor();
}

const TEXT_MORPH = /^post-/;

/** Gives the `post-*` shared elements of the current document the `m-text` class. */
function markTextMorphs(): void {
  for (const el of document.querySelectorAll<HTMLElement>(
    '[data-astro-transition-scope], [style*="view-transition-name"]',
  )) {
    const name = getComputedStyle(el).getPropertyValue('view-transition-name').trim();
    if (TEXT_MORPH.test(name)) el.style.setProperty('view-transition-class', 'm-text');
  }
}

let installed = false;
export function installTransitions(): void {
  if (installed) return;
  installed = true;
  document.addEventListener('click', onClickCapture, { capture: true });
  document.addEventListener('astro:before-preparation', onBeforePreparation);
  document.addEventListener('astro:before-swap', onBeforeSwap);
  // The old state is captured right after preparation, the new one right after the swap.
  document.addEventListener('astro:after-preparation', markTextMorphs);
  document.addEventListener('astro:after-swap', markTextMorphs);
  window.addEventListener('pageshow', onPageShow);
}
