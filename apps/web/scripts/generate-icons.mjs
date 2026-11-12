// Generates the raster icons in public/ from the brand dot. Run when the logo changes:
//   node apps/web/scripts/generate-icons.mjs   (from the repo root)
// The outputs are committed, so builds never depend on this script.
/* global Buffer, console */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const publicDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public');

// Keep in sync with src/lib/seo/brand.ts (docs/DESIGN.md section 2.1).
const ACCENT = '#E28413';
const PAPER = '#ECEAE5';

/** SVG of the dot. `radius` is a fraction of the canvas; `background` fills the whole square. */
function dotSvg(size, radius, background) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${
    background ? `<rect width="${size}" height="${size}" fill="${background}"/>` : ''
  }<circle cx="${size / 2}" cy="${size / 2}" r="${size * radius}" fill="${ACCENT}"/></svg>`;
}

const png = (size, radius, background) =>
  sharp(Buffer.from(dotSvg(size, radius, background)), { density: 384 })
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
  'icon-32.png': await png(32, 0.34),
  'icon-192.png': await png(192, 0.34),
  'icon-512.png': await png(512, 0.34),
  // iOS fills transparency with black, so the touch icon sits on paper.
  'apple-touch-icon.png': await png(180, 0.3, PAPER),
  // Maskable: the dot stays inside the central 80% safe zone whatever the mask shape.
  'icon-maskable-512.png': await png(512, 0.22, PAPER),
  'favicon.ico': ico([
    { size: 16, data: await png(16, 0.36) },
    { size: 32, data: await png(32, 0.34) },
  ]),
  'favicon.svg': Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><circle cx="16" cy="16" r="11" fill="${ACCENT}"/></svg>\n`,
  ),
};

for (const [name, data] of Object.entries(files)) {
  await writeFile(path.join(publicDir, name), data);
  console.log(`public/${name} (${data.length} bytes)`);
}
