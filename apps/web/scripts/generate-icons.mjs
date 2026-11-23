// Generates the icons in public/ from the logo (packages/content/assets/logo.svg). Run when
// the logo or the brand colours change:
//   node apps/web/scripts/generate-icons.mjs   (from the repo root)
// The outputs are committed, so builds never depend on this script.
/* global Buffer, console */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const here = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(here, '../public');
const logoFile = path.resolve(here, '../../../packages/content/assets/logo.svg');

// Keep in sync with src/lib/seo/brand.ts (docs/DESIGN.md section 2.1). The colours of
// public/site.webmanifest are kept there by hand.
const PRIMARY = '#E28413';
const SECONDARY = '#000022';

/** The logo's master square; its paths are read as they are (src/lib/logo.ts does the same). */
const LOGO = 1200;
const paths = [...(await readFile(logoFile, 'utf8')).matchAll(/\sd="([^"]+)"/g)].map((m) => m[1]);
if (paths.length === 0) throw new Error(`${logoFile}: no path data found`);

/**
 * SVG of the logo on a `size` square: the mark takes `scale` of the side, centred, in the
 * primary colour; `background` fills the whole square (none: transparent).
 */
function logoSvg(size, scale, background) {
  const k = (size * scale) / LOGO;
  const offset = (size - size * scale) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${
    background ? `<rect width="${size}" height="${size}" fill="${background}"/>` : ''
  }<g transform="translate(${offset} ${offset}) scale(${k})" fill="${PRIMARY}">${paths
    .map((d) => `<path d="${d}"/>`)
    .join('')}</g></svg>`;
}

const png = (size, scale, background) =>
  sharp(Buffer.from(logoSvg(size, scale, background)), { density: 384 })
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toBuffer();

/** ICO container holding PNG images (supported by every current browser). */
function ico(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = 6 + images.length * 16;
  const entries = images.map(({ size, data }) => {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size, 0);
    entry.writeUInt8(size, 1);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(data.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += data.length;
    return entry;
  });
  return Buffer.concat([header, ...entries, ...images.map((image) => image.data)]);
}

await mkdir(publicDir, { recursive: true });

const files = {
  // Tabs and bookmarks: the mark alone, edge to edge, on a transparent square.
  'icon-32.png': await png(32, 1),
  'icon-192.png': await png(192, 0.84),
  'icon-512.png': await png(512, 0.84),
  // iOS fills transparency with black, so the touch icon sits on the secondary colour.
  'apple-touch-icon.png': await png(180, 0.58, SECONDARY),
  // Maskable: the mark stays inside the central safe circle (radius 40%) whatever the mask.
  'icon-maskable-512.png': await png(512, 0.5, SECONDARY),
  'favicon.ico': ico([
    { size: 16, data: await png(16, 1) },
    { size: 32, data: await png(32, 1) },
  ]),
  'favicon.svg': Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${LOGO} ${LOGO}" fill="${PRIMARY}">${paths
      .map((d) => `<path d="${d}"/>`)
      .join('')}</svg>\n`,
  ),
};

for (const [name, data] of Object.entries(files)) {
  await writeFile(path.join(publicDir, name), data);
  console.log(`public/${name} (${data.length} bytes)`);
}
