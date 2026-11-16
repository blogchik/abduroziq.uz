/**
 * Build-time helpers shared by the home components: a seeded random source, the QR-like
 * block and contrast-safe ticket colours.
 */

/** Tashkent has no daylight saving time: UTC+5 all year. */
export const TASHKENT_UTC_OFFSET = 5;

/** FNV-1a hash of the seed, then mulberry32 (the same generator as `Barcode`). */
function seededRandom(seed: string): () => number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * A QR-like block: three finder patterns and seeded noise, as one SVG path on an
 * `size` x `size` grid. It only looks like a code; it does not scan.
 */
export function qrPath(seed: string, size = 21): string {
  const random = seededRandom(`qr:${seed}`);
  const cells: boolean[][] = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => random() < 0.46),
  );
  const finder = (ox: number, oy: number): void => {
    // 7x7 finder plus the quiet module around it.
    for (let y = -1; y <= 7; y++) {
      for (let x = -1; x <= 7; x++) {
        const cx = ox + x;
        const cy = oy + y;
        const row = cells[cy];
        if (!row || cx < 0 || cx >= size) continue;
        const ring = x === 0 || x === 6 || y === 0 || y === 6;
        const core = x >= 2 && x <= 4 && y >= 2 && y <= 4;
        const inside = x >= 0 && x <= 6 && y >= 0 && y <= 6;
        row[cx] = inside && (ring || core);
      }
    }
  };
  finder(0, 0);
  finder(size - 7, 0);
  finder(0, size - 7);

  // Horizontal runs keep the path short.
  let d = '';
  for (let y = 0; y < size; y++) {
    const row = cells[y] ?? [];
    let x = 0;
    while (x < size) {
      if (!row[x]) {
        x++;
        continue;
      }
      let end = x;
      while (end < size && row[end]) end++;
      d += `M${x} ${y}h${end - x}v1h${x - end}z`;
      x = end;
    }
  }
  return d;
}

type Rgb = [number, number, number];

function parseHex(hex: string): Rgb {
  const clean = hex.replace('#', '');
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean;
  const value = Number.parseInt(full, 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function luminance([r, g, b]: Rgb): number {
  const channel = (v: number): number => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrast(a: Rgb, b: Rgb): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

const toHex = (rgb: Rgb): string =>
  `#${rgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;

/**
 * A project's ticket colours. `fg` is used for the glyph and large shapes; `text` is the
 * same hue pushed away from the background, towards black or white (whichever contrasts more
 * with it), until small text reaches 4.5:1 (AA).
 */
export function ticketColors([bg, fg]: [string, string]): {
  bg: string;
  fg: string;
  text: string;
} {
  const back = parseHex(bg);
  const front = parseHex(fg);
  const black: Rgb = [0, 0, 0];
  const white: Rgb = [255, 255, 255];
  const pole = contrast(black, back) >= contrast(white, back) ? black : white;
  let text = front;
  for (let step = 0; step <= 20 && contrast(text, back) < 4.5; step++) {
    const k = step / 20;
    text = front.map((v, i) => v + ((pole[i] ?? 0) - v) * k) as Rgb;
  }
  return { bg, fg, text: toHex(text) };
}
