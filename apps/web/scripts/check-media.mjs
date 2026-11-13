/**
 * Fails when a raster image under `packages/content` carries EXIF (which includes GPS), XMP
 * or IPTC metadata. The repository is public and a photo with its GPS position was committed
 * once by mistake; this keeps it from happening again. Part of `pnpm check` (and so CI).
 *
 *   node apps/web/scripts/check-media.mjs
 *
 * Fix a reported file by re-encoding it without metadata, for example
 * `sharp(input).rotate().toFile(output)` (sharp drops metadata unless asked to keep it;
 * `rotate()` bakes the EXIF orientation into the pixels first).
 */
/* global URL, console, process */
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const contentDir = fileURLToPath(new URL('../../../packages/content/', import.meta.url));
const RASTER = /\.(jpe?g|png|webp|avif|gif|tiff?|heic|heif)$/i;

const files = readdirSync(contentDir, { recursive: true, encoding: 'utf8' }).filter(
  (file) => RASTER.test(file) && !file.split(path.sep).includes('node_modules'),
);

const offenders = [];
for (const file of files) {
  const meta = await sharp(path.join(contentDir, file)).metadata();
  const found = ['exif', 'xmp', 'iptc'].filter((key) => meta[key]);
  if (found.length > 0)
    offenders.push(`  packages/content/${file.replaceAll('\\', '/')}: ${found.join(', ')}`);
}

if (offenders.length > 0) {
  console.error(
    `Images with metadata (EXIF may hold the GPS position). Strip it before committing:\n${offenders.join('\n')}`,
  );
  process.exit(1);
}
console.log(`check-media: ${files.length} image(s) under packages/content, no EXIF, XMP or IPTC.`);
