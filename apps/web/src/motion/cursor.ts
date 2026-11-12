/**
 * Custom cursor (docs/DESIGN.md 3.2). One persistent element for the whole session, moved
 * back into the new <body> after every swap. Enabled only for fine pointers with full
 * motion and without forced colours; the native cursor is hidden only while it is active.
 *
 * States (attribute `data-state` on the root): default, link, open, read, drag, text, hide.
 * Markup can force one with `data-cursor="…"` and change the label with `data-cursor-label`.
 */
import { cursor as cfg } from './config';
import { applyTokenVars, fineMedia, forcedColorsMedia, gsap, prefersReducedMotion } from './core';

type State = 'default' | 'link' | 'open' | 'read' | 'drag' | 'text' | 'hide';

const STATES: readonly State[] = ['default', 'link', 'open', 'read', 'drag', 'text', 'hide'];
const LABELS: Partial<Record<State, string>> = { open: 'Open ↗', read: 'Read', drag: 'Drag' };
const PRESSED_DRAG_LABEL = 'Drop';

const TEXT_FIELDS =
  'textarea, [contenteditable]:not([contenteditable="false"]), input:not([type="button"], [type="submit"], [type="reset"], [type="checkbox"], [type="radio"], [type="range"], [type="color"], [type="file"], [type="image"])';
const CLICKABLE = 'button, [role="button"], [role="link"], summary, label, select, input';
/** Long-form reading text: the native I-beam is more useful there. */
const LONG_FORM =
  '.prose :is(p, li, blockquote, pre, code, figcaption, td, th, dd, dt, h2, h3, h4), [data-cursor-text]';

const html = document.documentElement;

let root: HTMLDivElement | undefined;
let dotEl: HTMLElement;
let ringEl: HTMLElement;
let labelEl: HTMLElement;
let pillEl: HTMLElement;
let burstEl: HTMLElement;

let enabled = false;
let visible = false;
let running = false;
let pressed = false;
let state: State = 'default';
let label = '';

const pointer = { x: -100, y: -100 };
const dot = { x: -100, y: -100 };
const ring = { x: -100, y: -100 };

function build(): HTMLDivElement {
  const el = document.createElement('div');
  el.className = 'm-cursor';
  el.setAttribute('aria-hidden', 'true');
  el.dataset['state'] = 'default';
  el.innerHTML =
    '<div class="m-cursor__ring"><span class="m-cursor__ring-shape"></span><span class="m-cursor__label"></span><span class="m-cursor__pill"></span></div>' +
    '<div class="m-cursor__dot"><span class="m-cursor__dot-shape"></span><span class="m-cursor__burst">' +
    Array.from({ length: 8 }, (_, i) => `<i style="--a:${i * 45}deg"><b></b></i>`).join('') +
    '</span></div>';
  applyTokenVars(el);
  el.style.setProperty('--m-burst', `${cfg.burstMs}ms`);
  dotEl = el.querySelector<HTMLElement>('.m-cursor__dot')!;
  ringEl = el.querySelector<HTMLElement>('.m-cursor__ring')!;
  labelEl = el.querySelector<HTMLElement>('.m-cursor__label')!;
  pillEl = el.querySelector<HTMLElement>('.m-cursor__pill')!;
  burstEl = el.querySelector<HTMLElement>('.m-cursor__burst')!;
  return el;
}

function place(): void {
  dotEl.style.transform = `translate3d(${dot.x}px, ${dot.y}px, 0)`;
  ringEl.style.transform = `translate3d(${ring.x}px, ${ring.y}px, 0)`;
}

function tick(_time: number, deltaTime: number): void {
  // Frame-rate independent lerp: the factors are tuned for 60fps.
  const frames = Math.min(4, deltaTime / (1000 / 60));
  const kDot = 1 - Math.pow(1 - cfg.dotLerp, frames);
  const kRing = 1 - Math.pow(1 - cfg.ringLerp, frames);
  dot.x += (pointer.x - dot.x) * kDot;
  dot.y += (pointer.y - dot.y) * kDot;
  ring.x += (pointer.x - ring.x) * kRing;
  ring.y += (pointer.y - ring.y) * kRing;
  place();
  const settled =
    Math.abs(pointer.x - ring.x) < 0.1 &&
    Math.abs(pointer.y - ring.y) < 0.1 &&
    Math.abs(pointer.x - dot.x) < 0.1 &&
    Math.abs(pointer.y - dot.y) < 0.1;
  if (settled) stop();
}

function start(): void {
  if (running) return;
  running = true;
  gsap.ticker.add(tick);
}

function stop(): void {
  if (!running) return;
  running = false;
  gsap.ticker.remove(tick);
}

function setVisible(next: boolean): void {
  if (!root || visible === next) return;
  visible = next;
  root.toggleAttribute('data-visible', next);
}

function render(): void {
  if (!root) return;
  root.dataset['state'] = state;
  root.toggleAttribute('data-pressed', pressed);
  const text = state === 'drag' && pressed ? PRESSED_DRAG_LABEL : label;
  if (state === 'read') {
    pillEl.textContent = text;
    labelEl.textContent = '';
  } else {
    labelEl.textContent = text;
  }
  root.toggleAttribute('data-label', text !== '' && state !== 'read');
  // Text fields, long-form text and `hide` give the pointer back to the native cursor.
  html.toggleAttribute('data-cursor-native', state === 'text' || state === 'hide');
}

function resolve(target: EventTarget | null): void {
  const el = target instanceof Element ? target : null;
  let next: State = 'default';
  let nextLabel = '';
  const explicit = el?.closest<HTMLElement>('[data-cursor]');
  if (explicit) {
    const value = explicit.dataset['cursor'] as State;
    next = STATES.includes(value) ? value : 'default';
    nextLabel = explicit.dataset['cursorLabel'] ?? LABELS[next] ?? '';
  } else if (el) {
    const anchor = el.closest<HTMLAnchorElement>('a[href]');
    if (el.closest(TEXT_FIELDS)) next = 'text';
    else if (anchor) {
      const external =
        anchor.target === '_blank' ||
        anchor.relList.contains('external') ||
        (anchor.host !== '' && anchor.host !== location.host);
      next = external ? 'open' : 'link';
      nextLabel = external ? (LABELS.open ?? '') : '';
    } else if (el.closest(CLICKABLE)) next = 'link';
    else if (el.closest(LONG_FORM)) next = 'text';
  }
  if (next === state && nextLabel === label) return;
  state = next;
  label = nextLabel;
  render();
}

function burst(): void {
  burstEl.classList.remove('is-active');
  // Restart the CSS animation.
  void burstEl.offsetWidth;
  burstEl.classList.add('is-active');
}

/* ---------------------------------------------------------- event handlers */

function onMove(event: PointerEvent): void {
  if (event.pointerType === 'touch') {
    setVisible(false);
    return;
  }
  pointer.x = event.clientX;
  pointer.y = event.clientY;
  if (!visible) {
    dot.x = ring.x = pointer.x;
    dot.y = ring.y = pointer.y;
    place();
    setVisible(true);
    resolve(event.target);
  }
  start();
}

function onOver(event: PointerEvent): void {
  if (event.pointerType !== 'touch') resolve(event.target);
}

function onDown(event: PointerEvent): void {
  if (event.pointerType === 'touch') return;
  // A press without a preceding move (e.g. after a scroll) still bursts at the pointer.
  onMove(event);
  pressed = true;
  render();
  burst();
}

function onUp(): void {
  if (!pressed) return;
  pressed = false;
  render();
}

function onLeaveWindow(event: MouseEvent): void {
  if (!event.relatedTarget) setVisible(false);
}

function onBlur(): void {
  setVisible(false);
  onUp();
}

/* ----------------------------------------------------------------- public */

function shouldEnable(): boolean {
  return fineMedia.matches && !forcedColorsMedia.matches && !prefersReducedMotion();
}

function enable(): void {
  if (enabled) return;
  enabled = true;
  root ??= build();
  document.body.append(root);
  html.setAttribute('data-cursor-active', '');
  document.addEventListener('pointermove', onMove, { passive: true });
  document.addEventListener('pointerover', onOver, { passive: true });
  document.addEventListener('pointerdown', onDown, { passive: true });
  document.addEventListener('pointerup', onUp, { passive: true });
  document.addEventListener('pointercancel', onUp, { passive: true });
  html.addEventListener('mouseleave', onLeaveWindow);
  window.addEventListener('blur', onBlur);
}

function disable(): void {
  if (!enabled) return;
  enabled = false;
  stop();
  root?.remove();
  visible = false;
  root?.removeAttribute('data-visible');
  html.removeAttribute('data-cursor-active');
  html.removeAttribute('data-cursor-native');
  document.removeEventListener('pointermove', onMove);
  document.removeEventListener('pointerover', onOver);
  document.removeEventListener('pointerdown', onDown);
  document.removeEventListener('pointerup', onUp);
  document.removeEventListener('pointercancel', onUp);
  html.removeEventListener('mouseleave', onLeaveWindow);
  window.removeEventListener('blur', onBlur);
}

/** Turns the cursor on or off for the current conditions. Safe to call on every page. */
export function updateCursor(): void {
  if (shouldEnable()) enable();
  else disable();
}

/**
 * After a swap: the new <body> does not contain the cursor and the <html> attributes were
 * replaced, so both are restored. The state resets until the pointer moves again.
 */
export function restoreCursor(): void {
  if (!enabled || !root) return;
  document.body.append(root);
  html.setAttribute('data-cursor-active', '');
  pressed = false;
  state = 'default';
  label = '';
  render();
}

/** Re-reads the element under the pointer (after a swap the DOM changed under it). */
export function refreshCursorTarget(): void {
  if (!enabled || !visible) return;
  resolve(document.elementFromPoint(pointer.x, pointer.y));
}

let watching = false;
/** Follows changes of the pointer type and forced colours for the rest of the session. */
export function watchCursorConditions(): void {
  if (watching) return;
  watching = true;
  fineMedia.addEventListener('change', updateCursor);
  forcedColorsMedia.addEventListener('change', updateCursor);
}
