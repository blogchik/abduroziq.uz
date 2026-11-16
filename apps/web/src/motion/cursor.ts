/**
 * Custom cursor (docs/DESIGN.md 3.2). One persistent element for the whole session, moved
 * back into the new <body> after every swap. Enabled only for fine pointers with full
 * motion and without forced colours; the native cursor is hidden only while the custom one
 * is shown (`data-cursor-active`, from the first pointer move on).
 *
 * States (attribute `data-state` on the root): default, link, open, read, drag, text, hide.
 * Markup can force one with `data-cursor="…"` and change the label with `data-cursor-label`.
 * The default labels come from `<body data-cursor-labels>` (JSON written by BaseLayout from
 * common.json, so they follow the page's language).
 *
 * Colour (attribute `data-surface` on the root: paper, accent or ink) follows the surface
 * under the pointer: ink on paper, on-accent on the accent fill, paper on ink. The nearest
 * ancestor of the hovered element decides, in this order: an explicit
 * `data-surface="paper|accent|ink"`, the `surface-accent` / `surface-ink` utilities, its own
 * opaque background (or the fill of an SVG shape) compared with the accent and ink tokens.
 * Off for `prefers-contrast: more` as well (the native cursor is kept).
 */
import { cursor as cfg } from './config';
import { applyTokenVars, fineMedia, forcedColorsMedia, gsap, prefersReducedMotion } from './core';

type State = 'default' | 'link' | 'open' | 'read' | 'drag' | 'text' | 'hide';

type Surface = 'paper' | 'accent' | 'ink';
type Labels = { open: string; read: string; drag: string; drop: string };

const STATES: readonly State[] = ['default', 'link', 'open', 'read', 'drag', 'text', 'hide'];
const SURFACES: readonly Surface[] = ['paper', 'accent', 'ink'];
/** English fallback when a page carries no `data-cursor-labels`. */
const DEFAULT_LABELS: Labels = { open: 'Open', read: 'Read', drag: 'Drag', drop: 'Drop' };
/** The cursor label is drawn with the system fallback for the arrow, as before. */
const OPEN_SUFFIX = ' ↗';

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
let surface: Surface = 'paper';
let probes: Record<Surface, HTMLElement>;

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
    '</span></div>' +
    SURFACES.map((name) => `<i class="m-cursor__probe" data-probe="${name}"></i>`).join('');
  applyTokenVars(el);
  el.style.setProperty('--m-burst', `${cfg.burstMs}ms`);
  dotEl = el.querySelector<HTMLElement>('.m-cursor__dot')!;
  ringEl = el.querySelector<HTMLElement>('.m-cursor__ring')!;
  labelEl = el.querySelector<HTMLElement>('.m-cursor__label')!;
  pillEl = el.querySelector<HTMLElement>('.m-cursor__pill')!;
  burstEl = el.querySelector<HTMLElement>('.m-cursor__burst')!;
  probes = Object.fromEntries(
    SURFACES.map((name) => [name, el.querySelector<HTMLElement>(`[data-probe="${name}"]`)!]),
  ) as Record<Surface, HTMLElement>;
  el.dataset['surface'] = 'paper';
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
  // The native cursor goes only when this one is there to replace it.
  html.toggleAttribute('data-cursor-active', next);
}

function render(): void {
  if (!root) return;
  root.dataset['state'] = state;
  root.dataset['surface'] = surface;
  root.toggleAttribute('data-pressed', pressed);
  const text = state === 'drag' && pressed && !customLabel ? labels().drop : label;
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

/* ---------------------------------------------------------------- labels */

let labelsBody: HTMLElement | undefined;
let labelsCache: Labels = DEFAULT_LABELS;

/** The page's labels (BaseLayout writes them per locale); re-read after every swap. */
function labels(): Labels {
  const body = document.body;
  if (body === labelsBody) return labelsCache;
  labelsBody = body;
  labelsCache = DEFAULT_LABELS;
  const raw = body.dataset['cursorLabels'];
  if (raw) {
    try {
      labelsCache = { ...DEFAULT_LABELS, ...(JSON.parse(raw) as Partial<Labels>) };
    } catch {
      // Malformed attribute: keep the English defaults.
    }
  }
  return labelsCache;
}

function defaultLabel(next: State): string {
  const l = labels();
  if (next === 'open') return l.open + OPEN_SUFFIX;
  if (next === 'read') return l.read;
  if (next === 'drag') return l.drag;
  return '';
}

/* --------------------------------------------------------------- surfaces */

type Rgba = [number, number, number, number];

/** Parses a computed colour: `rgb()`, `rgba()` or `color(srgb …)` (what color-mix gives). */
function parseColor(value: string): Rgba | undefined {
  let m = /^rgba?\(([^)]+)\)$/.exec(value);
  if (m?.[1]) {
    const [r = 0, g = 0, b = 0, a = 1] = m[1]
      .split(/[\s,/]+/)
      .filter(Boolean)
      .map(Number);
    return [r, g, b, a];
  }
  m = /^color\(srgb ([^)]+)\)$/.exec(value);
  if (m?.[1]) {
    const [r = 0, g = 0, b = 0, a = 1] = m[1]
      .split(/[\s/]+/)
      .filter(Boolean)
      .map(Number);
    return [r * 255, g * 255, b * 255, a];
  }
  return undefined;
}

function luminance([r, g, b]: Rgba): number {
  const lin = (c: number) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrast(a: Rgba, b: Rgba): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

let refsTheme: string | undefined;
let refs: Record<Surface, Rgba> | undefined;

/** The page's accent, ink and paper as computed colours (they change with the theme). */
function references(): Record<Surface, Rgba> | undefined {
  const theme = html.dataset['theme'] ?? '';
  if (refs && refsTheme === theme) return refs;
  const read = (name: Surface) => parseColor(getComputedStyle(probes[name]).color);
  const paper = read('paper');
  const accent = read('accent');
  const ink = read('ink');
  if (!paper || !accent || !ink) return undefined;
  refsTheme = theme;
  refs = { paper, accent, ink };
  return refs;
}

/** Which surface an opaque colour is: the accent, or whichever of paper / ink it is closer to. */
function classify(color: Rgba): Surface {
  const r = references();
  if (!r) return 'paper';
  const [ar, ag, ab] = r.accent;
  if (Math.abs(color[0] - ar) + Math.abs(color[1] - ag) + Math.abs(color[2] - ab) < 24) {
    return 'accent';
  }
  // The cursor is drawn in ink by default: switch to paper where paper reads better.
  return contrast(r.paper, color) > contrast(r.ink, color) ? 'ink' : 'paper';
}

const SHAPES = 'path, rect, circle, ellipse, polygon, polyline, line';

function surfaceOf(target: Element | null): Surface {
  for (let node = target; node && node !== html; node = node.parentElement) {
    const explicit = node.getAttribute('data-surface');
    if (explicit === 'paper' || explicit === 'accent' || explicit === 'ink') return explicit;
    if (node.classList.contains('surface-accent')) return 'accent';
    if (node.classList.contains('surface-ink')) return 'ink';
    const style = getComputedStyle(node);
    let own: Rgba | undefined;
    if (node instanceof SVGElement) {
      if (node.matches(SHAPES)) own = parseColor(style.fill);
    } else own = parseColor(style.backgroundColor);
    if (own && own[3] >= 0.5) return classify(own);
  }
  return 'paper';
}

/* ------------------------------------------------------------------ state */

/** True while the label comes from `data-cursor-label` (it then also replaces `Drop`). */
let customLabel = false;
/** The element the state was last read from (dropped on a swap: it belongs to the old page). */
let resolved: Element | null = null;

function resolve(target: EventTarget | null): void {
  const el = target instanceof Element ? target : null;
  resolved = el;
  let next: State = 'default';
  let nextLabel = '';
  let custom = false;
  const explicit = el?.closest<HTMLElement>('[data-cursor]');
  if (explicit) {
    const value = explicit.dataset['cursor'] as State;
    next = STATES.includes(value) ? value : 'default';
    custom = explicit.dataset['cursorLabel'] !== undefined;
    nextLabel = explicit.dataset['cursorLabel'] ?? defaultLabel(next);
  } else if (el) {
    const anchor = el.closest<HTMLAnchorElement>('a[href]');
    if (el.closest(TEXT_FIELDS)) next = 'text';
    else if (anchor) {
      const external =
        anchor.target === '_blank' ||
        anchor.relList.contains('external') ||
        (anchor.host !== '' && anchor.host !== location.host);
      next = external ? 'open' : 'link';
      nextLabel = external ? defaultLabel('open') : '';
    } else if (el.closest(CLICKABLE)) next = 'link';
    else if (el.closest(LONG_FORM)) next = 'text';
  }
  const nextSurface = surfaceOf(el);
  if (next === state && nextLabel === label && nextSurface === surface && custom === customLabel)
    return;
  state = next;
  label = nextLabel;
  customLabel = custom;
  surface = nextSurface;
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

const moreContrastMedia = window.matchMedia('(prefers-contrast: more)');

function shouldEnable(): boolean {
  return (
    fineMedia.matches &&
    !forcedColorsMedia.matches &&
    !moreContrastMedia.matches &&
    !prefersReducedMotion()
  );
}

/**
 * The page scrolled under a still pointer: re-read what is under it (once per frame, and
 * only when it is another element).
 */
let scrollFrame = 0;
function onScroll(): void {
  if (!visible || scrollFrame) return;
  scrollFrame = requestAnimationFrame(() => {
    scrollFrame = 0;
    if (!enabled || !visible) return;
    const el = document.elementFromPoint(pointer.x, pointer.y);
    if (el !== resolved) resolve(el);
  });
}

function enable(): void {
  if (enabled) return;
  enabled = true;
  root ??= build();
  document.body.append(root);
  document.addEventListener('pointermove', onMove, { passive: true });
  document.addEventListener('pointerover', onOver, { passive: true });
  document.addEventListener('pointerdown', onDown, { passive: true });
  document.addEventListener('pointerup', onUp, { passive: true });
  document.addEventListener('pointercancel', onUp, { passive: true });
  html.addEventListener('mouseleave', onLeaveWindow);
  window.addEventListener('blur', onBlur);
  window.addEventListener('scroll', onScroll, { passive: true });
}

function disable(): void {
  if (!enabled) return;
  enabled = false;
  stop();
  root?.remove();
  visible = false;
  resolved = null;
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
  window.removeEventListener('scroll', onScroll);
  cancelAnimationFrame(scrollFrame);
  scrollFrame = 0;
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
  html.toggleAttribute('data-cursor-active', visible);
  pressed = false;
  state = 'default';
  label = '';
  customLabel = false;
  surface = 'paper';
  resolved = null;
  render();
}

/**
 * Back to idle (a page restored from the back/forward cache): no press, default state, hidden
 * until the pointer moves again, and the conditions checked anew.
 */
export function resetCursor(): void {
  updateCursor();
  if (!root) return;
  pressed = false;
  state = 'default';
  label = '';
  customLabel = false;
  surface = 'paper';
  resolved = null;
  stop();
  setVisible(false);
  html.removeAttribute('data-cursor-active');
  render();
}

/**
 * How far right of the pointer the cursor draws (the ring, its label or the read pill), in
 * px; 0 while the cursor is off or hidden. The follower panel keeps clear of it.
 */
export function cursorExtent(): number {
  if (!enabled || !visible || !root) return 0;
  if (state === 'read') return pillEl.offsetWidth / 2;
  if (root.hasAttribute('data-label')) return labelEl.offsetLeft + labelEl.offsetWidth;
  return 18;
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
  moreContrastMedia.addEventListener('change', updateCursor);
}
