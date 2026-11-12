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
 * reduced motion gets no panel.
 */
import { ease, transition as cfg } from './config';
import { applyTokenVars, closeGate, gsap, openGate, prefersReducedMotion } from './core';

interface PreparationEvent extends Event {
  loader: () => Promise<void>;
}

type PanelState = 'idle' | 'covering' | 'covered' | 'leaving';

let panel: HTMLDivElement | undefined;
let panelState: PanelState = 'idle';
let tween: gsap.core.Tween | undefined;
let covering: Promise<void> | undefined;

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
  });
  return covering;
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
}

function onBeforePreparation(event: Event): void {
  if (prefersReducedMotion()) return;
  const prep = event as PreparationEvent;
  if (typeof prep.loader !== 'function') return;
  closeGate();
  const load = prep.loader;
  prep.loader = async () => {
    await Promise.all([load(), cover()]);
  };
}

/** After the swap the new <body> needs the panel (still covering). */
export function restorePanel(): void {
  if (panel && panelState !== 'idle') ensurePanel();
}

/** On page load: let the panel go (or just open the gate when there is none). */
export function finishTransition(): void {
  void leave();
}

let installed = false;
export function installTransitions(): void {
  if (installed) return;
  installed = true;
  document.addEventListener('astro:before-preparation', onBeforePreparation);
}
