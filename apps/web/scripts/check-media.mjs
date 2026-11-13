/**
 * Fails when an image under `packages/content` carries metadata: EXIF (which includes GPS),
 * XMP, IPTC or text chunks in a raster image (tools such as ImageMagick store EXIF, GPS
 * included, as a PNG text chunk), or editor metadata and local paths in an SVG. The
 * repository is public and a photo with its GPS position was committed once by mistake;
 * this keeps it from happening again. Part of `pnpm check` (and so CI).
 *
 *   node apps/web/scripts/check-media.mjs
 *
 * Fix a reported raster file by re-encoding it without metadata, for example
 * `sharp(input).rotate().toFile(output)` (sharp drops metadata unless asked to keep it;
 * `rotate()` bakes the EXIF orientation into the pixels first). Fix an SVG by exporting it
 * without editor data (or deleting the `<metadata>` block and the `sodipodi:` / `inkscape:`
 * attributes by hand).
 */
/* global URL, console, process */
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const contentDir = fileURLToPath(new URL('../../../packages/content/', import.meta.url));
const RASTER = /\.(jpe?g|png|webp|avif|gif|tiff?|heic|heif)$/i;
const SVG = /\.svg$/i;
/** Editor metadata and paths from the author's machine. */
const SVG_LEAKS = [
  [/<metadata[\s/>]/i, 'metadata block'],
  [/\b(sodipodi|inkscape):/i, 'editor attributes'],
  [/[A-Za-z]:[\\/](Users|Documents|Projects)|\/(Users|home)\/[^/"'\s]+\//, 'local path'],
];

const files = readdirSync(contentDir, { recursive: true, encoding: 'utf8' }).filter(
  (file) => (RASTER.test(file) || SVG.test(file)) && !file.split(path.sep).includes('node_modules'),
);

const offenders = [];
for (const file of files) {
  const full = path.join(contentDir, file);
  let found;
  if (SVG.test(file)) {
    const text = readFileSync(full, 'utf8');
    found = SVG_LEAKS.filter(([pattern]) => pattern.test(text)).map(([, name]) => name);
  } else {
    const meta = await sharp(full).metadata();
    found = ['exif', 'xmp', 'iptc', 'comments'].filter((key) =>
      Array.isArray(meta[key]) ? meta[key].length > 0 : Boolean(meta[key]),
    );
  }
  if (found.length > 0)
    offenders.push(`  packages/content/${file.replaceAll('\\', '/')}: ${found.join(', ')}`);
}

if (offenders.length > 0) {
  console.error(
    `Images with metadata (EXIF may hold the GPS position). Strip it before committing:\n${offenders.join('\n')}`,
  );
  process.exit(1);
}
console.log(`check-media: ${files.length} image(s) under packages/content, no metadata.`);
