/**
 * The meeting, live (DESIGN 4.2 and 7.1): the dots of `field.ts` on a canvas.
 *
 *  - Entrance: the dots fly in from scattered places and assemble, outer parts first, the
 *    two tips last; then the starburst pops and the name tags appear.
 *  - Idle: the two cursors breathe, and every few seconds they drift together until the
 *    tips touch and the starburst flashes.
 *  - Pointer (mouse, pen or finger): dots near it are pushed away and spring back; a press
 *    sends a ripple through all of them.
 *
 * The first frame is drawn in the same task that sets the canvas up, never inside
 * `requestAnimationFrame`, so there is a picture under reduced motion, in a background tab
 * and wherever frames are throttled; if the entrance cannot get frames, the dots are simply
 * put in place. After a client-side navigation the entrance waits for the transition panel. Under reduced motion that still picture is all there is. The loop runs only
 * while the stage is on screen and the tab is visible, and the canvas is rebuilt when the
 * stage is resized, the pixel density changes or the theme changes (ink and paper swap, and
 * so does the light).
 */
import { afterGate, onPageEnter } from '@/motion';
import { ARROW, buildField, STRIDE, type Field } from './field';

/** The canvas extends this far above and below the stage, so pushed dots are not cut off. */
const BLEED = 36;
const TAU = Math.PI * 2;

/** Entrance: every dot flies for `FLY` seconds, starting up to `SPREAD` seconds late. */
const FLY = 0.75;
const SPREAD = 0.45;
/** The starburst pops when the last dots land; the tags follow. */
const STAR_AT = SPREAD + FLY - 0.15;
const TAGS_AT = STAR_AT + 0.2;

/** Idle: seconds between two touches, and the shape of one (approach, hold, retreat). */
const TOUCH_EVERY = 6.5;
const APPROACH = 0.6;
const HOLD = 0.18;
const RETREAT = 0.9;

/** Spring that brings a pushed dot home (stiffness, damping), per second. */
const STIFFNESS = 90;
const DAMPING = 11;
/** Pointer: reach in px and strength of the push. */
const PUSH_RADIUS = 86;
const PUSH = 5200;
/** Ripple: speed of the ring in px/s, its width, strength and life in seconds. */
const RIPPLE_SPEED = 560;
const RIPPLE_WIDTH = 70;
const RIPPLE_FORCE = 3600;
const RIPPLE_LIFE = 1.5;

/** Frames that do not come within this long (ms) mean a view that is not painting. */
const WATCHDOG_MS = 450;

const easeOut = (t: number): number => 1 - (1 - t) ** 4;
const easeInOut = (t: number): number => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

/** A repeatable pseudo-random value in [0, 1) for dot `i` (no shared state). */
function noise(i: number, salt: number): number {
  const v = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return v - Math.floor(v);
}

interface Ripple {
  x: number;
  y: number;
  born: number;
}

/** For development and tests: step the simulation without animation frames. */
export interface MeetingDebug {
  field(): Field;
  /** Current position of dot `i`. */
  dot(i: number): { x: number; y: number };
  /** Advances by `ms` in steps of one frame and draws. */
  step(ms: number): void;
  /** Puts the dots back to the start of the entrance (then `step` through it). */
  replay(): void;
  running(): boolean;
}

function setup(root: HTMLElement, reduced: boolean, entrance: boolean): (() => void) | undefined {
  const stage = root.querySelector<HTMLElement>('[data-meeting-stage]');
  const canvas = root.querySelector<HTMLCanvasElement>('canvas');
  const ctx = canvas?.getContext('2d');
  if (!stage || !canvas || !ctx) return undefined;
  const tagHand = root.querySelector<HTMLElement>('[data-meeting-tag="hand"]');
  const tagArrow = root.querySelector<HTMLElement>('[data-meeting-tag="arrow"]');

  let field: Field;
  /** Per dot: offset from its place and velocity (px, px/s). */
  let offset = new Float32Array(0);
  let velocity = new Float32Array(0);
  /** Per dot: where the entrance starts (relative to home) and how late. */
  let scatter = new Float32Array(0);
  let delay = new Float32Array(0);
  let ink = '#000';
  let paper = '#fff';
  let accent = '#000';
  let dpr = 1;

  /** Seconds on the meeting's own clock: it only runs while the loop does. */
  let clock = 0;
  /** Seconds of entrance left to play; 0 when the dots are in place. */
  let entering = entrance ? STAR_AT + 0.6 : 0;
  let enteredAt = 0;
  let nextTouch = TOUCH_EVERY * 0.6;
  let touchAt = -Infinity;
  let flashAt = -Infinity;
  /** Whether any dot is away from its place (so the springs have work to do). */
  let stirred = false;
  const pointer = { x: 0, y: 0, on: false };
  let ripples: Ripple[] = [];
  /** Group offsets of this frame (hand, arrow). */
  const shift = [0, 0, 0, 0];

  let raf = 0;
  let last = 0;
  /** After a client-side navigation the entrance waits for the transition panel to leave. */
  let open = !entrance;
  let onScreen = true;
  let watchdog = 0;
  let resizeTimer = 0;
  let disposed = false;

  function readColours(): boolean {
    const style = getComputedStyle(root);
    if (window.matchMedia('(forced-colors: active)').matches) {
      // The tokens are not remapped in forced colours; the system's own colours are.
      ink = 'CanvasText';
      paper = 'Canvas';
      accent = 'Highlight';
    } else {
      ink = style.getPropertyValue('--ink').trim() || style.color;
      paper = style.getPropertyValue('--paper').trim() || '#fff';
      accent = style.getPropertyValue('--accent').trim() || ink;
    }
    return document.documentElement.dataset['theme'] === 'dark';
  }

  /** Sizes the canvas to the stage and builds the dots for it. */
  function build(): void {
    const width = stage!.clientWidth;
    const height = stage!.clientHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas!.width = Math.round(width * dpr);
    canvas!.height = Math.round((height + BLEED * 2) * dpr);
    const dark = readColours();
    field = buildField(width, height, { dark });

    const n = field.count;
    offset = new Float32Array(n * 2);
    velocity = new Float32Array(n * 2);
    scatter = new Float32Array(n * 2);
    delay = new Float32Array(n);
    const far = Math.max(field.meet.x, width - field.meet.x);
    for (let i = 0; i < n; i++) {
      const angle = noise(i, 1) * TAU;
      const distance = (0.35 + noise(i, 2) * 0.9) * height;
      scatter[i * 2] = Math.cos(angle) * distance * 1.6;
      scatter[i * 2 + 1] = Math.sin(angle) * distance;
      // The parts far from the meeting point land first, the two tips last.
      const away = Math.abs((field.cells[i * STRIDE] ?? 0) - field.meet.x) / far;
      delay[i] = (1 - Math.min(1, away * 2.2)) * SPREAD * 0.8 + noise(i, 3) * SPREAD * 0.2;
    }
    stirred = false;
    ripples = [];

    // The tags sit at the tips (their own transform follows the breathing).
    if (tagHand) {
      tagHand.style.left = `${field.tags.hand.x.toFixed(1)}px`;
      tagHand.style.top = `${field.tags.hand.y.toFixed(1)}px`;
    }
    if (tagArrow) {
      tagArrow.style.left = `${field.tags.arrow.x.toFixed(1)}px`;
      tagArrow.style.top = `${field.tags.arrow.y.toFixed(1)}px`;
    }
  }

  /** How far the cursors have come together at clock time `t` (0 apart, 1 touching). */
  function togetherness(t: number): number {
    const since = t - touchAt;
    if (since < 0) return 0;
    if (since < APPROACH) return easeInOut(since / APPROACH);
    if (since < APPROACH + HOLD) return 1;
    if (since < APPROACH + HOLD + RETREAT)
      return 1 - easeInOut((since - APPROACH - HOLD) / RETREAT);
    return 0;
  }

  /** Moves everything forward by `dt` seconds. */
  function update(dt: number): void {
    clock += dt;
    const n = field.count;

    if (entering > 0) {
      entering = Math.max(0, entering - dt);
      if (clock - enteredAt >= STAR_AT && flashAt === -Infinity) flashAt = clock;
      if (clock - enteredAt >= TAGS_AT) root.setAttribute('data-meeting-tags', '');
      if (entering === 0) nextTouch = clock + TOUCH_EVERY * 0.5;
    } else if (!reduced && clock >= nextTouch) {
      touchAt = clock;
      nextTouch = clock + TOUCH_EVERY;
    }
    // The flash belongs to the moment the tips touch.
    if (touchAt > flashAt && clock - touchAt >= APPROACH) flashAt = clock;

    // Breathing, and the drift towards each other.
    const amp = Math.max(1.2, field.pitch * 0.42);
    const reach = togetherness(clock) * field.reach;
    shift[0] = reach + Math.sin(clock * 0.7) * amp * 0.5;
    shift[1] = Math.sin(clock * 1.15) * amp;
    shift[2] = -reach + Math.sin(clock * 0.6 + 2) * amp * 0.5;
    shift[3] = Math.sin(clock * 0.95 + 1.3) * amp;

    ripples = ripples.filter((ripple) => clock - ripple.born < RIPPLE_LIFE);
    if (!stirred && !pointer.on && ripples.length === 0) return;

    let energy = 0;
    const px = pointer.x;
    const py = pointer.y;
    for (let i = 0; i < n; i++) {
      const group = field.cells[i * STRIDE + 3] === ARROW ? 2 : 0;
      const hx = (field.cells[i * STRIDE] ?? 0) + (shift[group] ?? 0);
      const hy = (field.cells[i * STRIDE + 1] ?? 0) + (shift[group + 1] ?? 0);
      let ox = offset[i * 2] ?? 0;
      let oy = offset[i * 2 + 1] ?? 0;
      let vx = velocity[i * 2] ?? 0;
      let vy = velocity[i * 2 + 1] ?? 0;
      let ax = -STIFFNESS * ox - DAMPING * vx;
      let ay = -STIFFNESS * oy - DAMPING * vy;

      if (pointer.on) {
        const dx = hx + ox - px;
        const dy = hy + oy - py;
        const d = Math.hypot(dx, dy);
        if (d < PUSH_RADIUS) {
          const k = 1 - d / PUSH_RADIUS;
          const inv = 1 / Math.max(d, 0.001);
          ax += dx * inv * k * k * PUSH;
          ay += dy * inv * k * k * PUSH;
        }
      }
      for (const ripple of ripples) {
        const age = clock - ripple.born;
        const dx = hx - ripple.x;
        const dy = hy - ripple.y;
        const d = Math.hypot(dx, dy);
        const band = Math.abs(d - age * RIPPLE_SPEED);
        if (band < RIPPLE_WIDTH) {
          const k = (1 - band / RIPPLE_WIDTH) * (1 - age / RIPPLE_LIFE);
          const inv = 1 / Math.max(d, 0.001);
          ax += dx * inv * k * RIPPLE_FORCE;
          ay += dy * inv * k * RIPPLE_FORCE;
        }
      }

      vx += ax * dt;
      vy += ay * dt;
      ox += vx * dt;
      oy += vy * dt;
      offset[i * 2] = ox;
      offset[i * 2 + 1] = oy;
      velocity[i * 2] = vx;
      velocity[i * 2 + 1] = vy;
      energy = Math.max(energy, Math.abs(ox) + Math.abs(oy) + (Math.abs(vx) + Math.abs(vy)) * 0.05);
    }
    stirred = energy > 0.05;
    if (!stirred) {
      offset.fill(0);
      velocity.fill(0);
    }
  }

  /** Position and size factor of dot `i` right now. */
  function locate(i: number, into: { x: number; y: number; k: number }): void {
    const group = field.cells[i * STRIDE + 3] === ARROW ? 2 : 0;
    let x = (field.cells[i * STRIDE] ?? 0) + (shift[group] ?? 0) + (offset[i * 2] ?? 0);
    let y = (field.cells[i * STRIDE + 1] ?? 0) + (shift[group + 1] ?? 0) + (offset[i * 2 + 1] ?? 0);
    let k = 1;
    if (entering > 0) {
      const t = Math.min(1, Math.max(0, (clock - enteredAt - (delay[i] ?? 0)) / FLY));
      const e = easeOut(t);
      x += (scatter[i * 2] ?? 0) * (1 - e);
      y += (scatter[i * 2 + 1] ?? 0) * (1 - e);
      k = 0.3 + 0.7 * e;
    }
    into.x = x;
    into.y = y;
    into.k = k;
  }

  const at = { x: 0, y: 0, k: 1 };
  /** Per cell: x, y and size factor of the frame being drawn. */
  let spots = new Float32Array(0);

  function draw(): void {
    const c = ctx!;
    c.setTransform(dpr, 0, 0, dpr, 0, BLEED * dpr);
    c.clearRect(0, -BLEED, field.width, field.height + BLEED * 2);

    // The bodies first, in the colour of the page (they hide the name behind them), then
    // the dots. Positions are worked out once per frame.
    const n = field.count;
    if (spots.length < n * 3) spots = new Float32Array(n * 3);
    c.fillStyle = paper;
    c.beginPath();
    for (let i = 0; i < n; i++) {
      locate(i, at);
      spots[i * 3] = at.x;
      spots[i * 3 + 1] = at.y;
      spots[i * 3 + 2] = at.k;
      const r = field.body * at.k * at.k;
      c.moveTo(at.x + r, at.y);
      c.arc(at.x, at.y, r, 0, TAU);
    }
    c.fill();
    c.fillStyle = ink;
    c.beginPath();
    for (let i = 0; i < n; i++) {
      const r = (field.cells[i * STRIDE + 2] ?? 0) * (spots[i * 3 + 2] ?? 1);
      if (r === 0) continue;
      const x = spots[i * 3] ?? 0;
      const y = spots[i * 3 + 1] ?? 0;
      c.moveTo(x + r, y);
      c.arc(x, y, r, 0, TAU);
    }
    c.fill();

    // The starburst: hidden until the dots have landed, turning slowly, flashing on a touch.
    const shown = entering > 0 ? Math.min(1, Math.max(0, (clock - enteredAt - STAR_AT) / 0.3)) : 1;
    if (shown <= 0) return;
    const sinceFlash = clock - flashAt;
    const flash = sinceFlash >= 0 && sinceFlash < 0.7 ? 1 - sinceFlash / 0.7 : 0;
    const pop = 1 - (1 - shown) ** 3;
    const radius = field.star * pop * (1 + 0.55 * flash * flash);
    const turn = reduced ? 0 : clock * 0.35;
    c.fillStyle = accent;
    c.beginPath();
    for (let p = 0; p < 24; p++) {
      const a = turn + (p * Math.PI) / 12;
      const r = p % 2 === 0 ? radius : radius * 0.68;
      const x = field.meet.x + Math.cos(a) * r;
      const y = field.meet.y + Math.sin(a) * r;
      if (p === 0) c.moveTo(x, y);
      else c.lineTo(x, y);
    }
    c.closePath();
    c.fill();
    if (flash > 0) {
      // Eight short rays that fly outwards and fade.
      const out = field.star * (1.7 + (1 - flash) * 1.6);
      c.strokeStyle = accent;
      c.lineWidth = Math.max(1.5, field.star * 0.16);
      c.lineCap = 'round';
      c.globalAlpha = flash;
      c.beginPath();
      for (let p = 0; p < 8; p++) {
        const a = turn + (p * Math.PI) / 4 + Math.PI / 8;
        c.moveTo(field.meet.x + Math.cos(a) * out, field.meet.y + Math.sin(a) * out);
        c.lineTo(
          field.meet.x + Math.cos(a) * (out + field.star * 0.7 * flash),
          field.meet.y + Math.sin(a) * (out + field.star * 0.7 * flash),
        );
      }
      c.stroke();
      c.globalAlpha = 1;
    }
  }

  /** The tags ride on their cursors. */
  function moveTags(): void {
    if (tagHand) {
      tagHand.style.transform = `translate3d(${(shift[0] ?? 0).toFixed(2)}px, ${(shift[1] ?? 0).toFixed(2)}px, 0)`;
    }
    if (tagArrow) {
      tagArrow.style.transform = `translate3d(${(shift[2] ?? 0).toFixed(2)}px, ${(shift[3] ?? 0).toFixed(2)}px, 0)`;
    }
  }

  /** Puts every dot in its place, with nothing moving. */
  function settle(): void {
    entering = 0;
    offset.fill(0);
    velocity.fill(0);
    stirred = false;
    ripples = [];
    shift.fill(0);
    if (flashAt === -Infinity) flashAt = clock - 10;
    root.setAttribute('data-meeting-tags', '');
    moveTags();
    draw();
  }

  function frame(now: number): void {
    raf = 0;
    window.clearTimeout(watchdog);
    watchdog = 0;
    const dt = Math.min(0.05, last ? (now - last) / 1000 : 1 / 60);
    last = now;
    // Two half steps keep the springs steady on slow frames.
    update(dt / 2);
    update(dt / 2);
    moveTags();
    draw();
    schedule();
  }

  function schedule(): void {
    if (disposed || reduced || raf || !open || !onScreen || document.hidden) return;
    raf = requestAnimationFrame(frame);
    // An entrance that gets no frames (a view that is not painting) must not leave the dots
    // scattered: put them in place.
    if (entering > 0 && !watchdog) {
      watchdog = window.setTimeout(() => {
        watchdog = 0;
        if (!disposed && entering > 0) settle();
      }, WATCHDOG_MS);
    }
  }

  function pause(): void {
    cancelAnimationFrame(raf);
    raf = 0;
    last = 0;
    window.clearTimeout(watchdog);
    watchdog = 0;
  }

  /* ----------------------------------------------------------------- events */

  function toStage(event: PointerEvent): void {
    const box = stage!.getBoundingClientRect();
    pointer.x = event.clientX - box.left;
    pointer.y = event.clientY - box.top;
  }

  const onMove = (event: PointerEvent): void => {
    toStage(event);
    pointer.on = true;
    schedule();
  };
  const onLeave = (): void => {
    pointer.on = false;
  };
  const onDown = (event: PointerEvent): void => {
    toStage(event);
    pointer.on = true;
    ripples.push({ x: pointer.x, y: pointer.y, born: clock });
    if (ripples.length > 4) ripples.shift();
    schedule();
  };
  const onUp = (event: PointerEvent): void => {
    // A finger that lifts is gone; a mouse is still there.
    if (event.pointerType !== 'mouse') pointer.on = false;
  };
  const onVisibility = (): void => {
    if (document.hidden) {
      pause();
      // Nobody watches an entrance in a hidden tab.
      if (entering > 0) settle();
    } else schedule();
  };

  const rebuild = (): void => {
    const wasEntering = entering > 0;
    build();
    watchDensity();
    if (wasEntering && !reduced) draw();
    else settle();
    schedule();
  };

  /** The canvas is sized for one pixel density: rebuilt when that changes (zoom, screens). */
  let density: MediaQueryList | undefined;
  function watchDensity(): void {
    density?.removeEventListener('change', rebuild);
    density = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
    density.addEventListener('change', rebuild);
  }

  if (!reduced) {
    stage.addEventListener('pointermove', onMove, { passive: true });
    stage.addEventListener('pointerdown', onDown, { passive: true });
    stage.addEventListener('pointerleave', onLeave, { passive: true });
    stage.addEventListener('pointercancel', onLeave, { passive: true });
    stage.addEventListener('pointerup', onUp, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);
  }

  const resizes = new ResizeObserver(() => {
    if (stage.clientWidth === field.width && stage.clientHeight === field.height) return;
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(rebuild, 80);
  });
  const themes = new MutationObserver(rebuild);
  const views = new IntersectionObserver(([entry]) => {
    onScreen = entry?.isIntersecting ?? true;
    if (onScreen) schedule();
    else pause();
  });

  /* ------------------------------------------------------------------ start */

  build();
  enteredAt = clock;
  // The first frame, now: the scattered dots of the entrance, or the finished picture.
  if (entering > 0 && !document.hidden) draw();
  else settle();
  root.setAttribute('data-meeting-ready', '');
  watchDensity();
  resizes.observe(stage);
  themes.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  views.observe(root);
  if (open) schedule();
  else {
    afterGate(() => {
      open = true;
      schedule();
    });
  }

  if (import.meta.env.DEV) {
    const debug: MeetingDebug = {
      field: () => field,
      dot(i) {
        locate(i, at);
        return { x: at.x, y: at.y };
      },
      step(ms) {
        for (let left = ms; left > 0; left -= 1000 / 60) update(Math.min(left, 1000 / 60) / 1000);
        moveTags();
        draw();
      },
      replay() {
        pause();
        entering = STAR_AT + 0.6;
        enteredAt = clock;
        flashAt = -Infinity;
        root.removeAttribute('data-meeting-tags');
        draw();
      },
      running: () => raf !== 0,
    };
    (root as HTMLElement & { meeting?: MeetingDebug }).meeting = debug;
  }

  return () => {
    disposed = true;
    pause();
    window.clearTimeout(resizeTimer);
    resizes.disconnect();
    density?.removeEventListener('change', rebuild);
    themes.disconnect();
    views.disconnect();
    stage.removeEventListener('pointermove', onMove);
    stage.removeEventListener('pointerdown', onDown);
    stage.removeEventListener('pointerleave', onLeave);
    stage.removeEventListener('pointercancel', onLeave);
    stage.removeEventListener('pointerup', onUp);
    document.removeEventListener('visibilitychange', onVisibility);
    root.removeAttribute('data-meeting-ready');
    root.removeAttribute('data-meeting-tags');
    if (import.meta.env.DEV) delete (root as HTMLElement & { meeting?: MeetingDebug }).meeting;
  };
}

onPageEnter(({ reduced, late }) => {
  const root = document.querySelector<HTMLElement>('[data-meeting]');
  if (!root) return;
  // No entrance when the page is entered again (the motion switch), when the first load was
  // slow enough for the static picture to have shown, or when the stage is scrolled past.
  const entrance = !reduced && !late && root.getBoundingClientRect().bottom > 0;
  return setup(root, reduced, entrance);
});
