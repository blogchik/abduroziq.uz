/**
 * Fails when a committed image or video carries metadata. Part of `pnpm check` (and so CI).
 * The repository is public and a photo with its GPS position was committed once by mistake;
 * this keeps it from happening again. It scans `packages/content` and the two folders of the
 * site that hold files: `apps/web/src/assets` and `apps/web/public`.
 *
 *   node apps/web/scripts/check-media.mjs
 *
 * Images: EXIF (which includes GPS), XMP, IPTC or text chunks in a raster image (tools such
 * as ImageMagick store EXIF, GPS included, as a PNG text chunk), and editor metadata or local
 * paths in an SVG. Fix a raster file by re-encoding it without metadata, for example
 * `sharp(input).rotate().toFile(output)` (sharp drops metadata unless asked to keep it;
 * `rotate()` bakes the EXIF orientation into the pixels first). Fix an SVG by exporting it
 * without editor data (or deleting the `<metadata>` block and the `sodipodi:` / `inkscape:`
 * attributes by hand).
 *
 * Videos (.mp4 .m4v .mov .webm): in an MP4 or MOV the position (a 3GPP `loci` box, a (c)xyz
 * tag, an Apple `com.apple.quicktime.*` key), the device (the make and model tags) and any
 * creation time; in a WebM a `DateUTC`, a title or any tag other than the encoder and the duration. Phones write all of
 * these and the site serves the file byte for byte. The boxes are read here in plain Node, so
 * neither ffprobe nor a dependency is needed. Fix a reported file without re-encoding it:
 * `ffmpeg -i in.mp4 -map_metadata -1 -c copy out.mp4` (for WebM add `-fflags +bitexact`).
 */
/* global URL, console, process, Buffer */
import { closeSync, openSync, readdirSync, readFileSync, readSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = fileURLToPath(new URL('../../../', import.meta.url));
/** Every folder whose files are committed and published, relative to the repository root. */
const SCANNED = ['packages/content', 'apps/web/src/assets', 'apps/web/public'];
const RASTER = /\.(jpe?g|png|webp|avif|gif|tiff?|heic|heif)$/i;
const SVG = /\.svg$/i;
const MP4 = /\.(mp4|m4v|mov)$/i;
const WEBM = /\.webm$/i;
/** Editor metadata and paths from the author's machine. */
const SVG_LEAKS = [
  [/<metadata[\s/>]/i, 'metadata block'],
  [/\b(sodipodi|inkscape):/i, 'editor attributes'],
  [/[A-Za-z]:[\\/](Users|Documents|Projects)|\/(Users|home)\/[^/"'\s]+\//, 'local path'],
];

/* ------------------------------------------------------------------- MP4 / MOV */

/** Boxes that only hold other boxes. */
const MP4_CONTAINERS = new Set(['moov', 'trak', 'mdia', 'udta', 'ilst']);
/** Tags that name the position or the device. The 0xA9 byte opens a QuickTime tag name. */
const MP4_TAGS = new Map([
  ['loci', 'location (3GPP)'],
  ['©xyz', 'location'],
  ['©mak', 'device make'],
  ['©mod', 'device model'],
]);

/** The boxes in `buf` from `start` to `end`: `{ type, body, end }`. */
function* boxes(buf, start, end) {
  let pos = start;
  while (pos + 8 <= end) {
    let size = buf.readUInt32BE(pos);
    const type = buf.toString('latin1', pos + 4, pos + 8);
    let body = pos + 8;
    if (size === 1) {
      size = Number(buf.readBigUInt64BE(pos + 8));
      body = pos + 16;
    } else if (size === 0) size = end - pos;
    if (size < body - pos || pos + size > end) return;
    yield { type, body, end: pos + size };
    pos += size;
  }
}

/** The creation time of `mvhd`, `tkhd` or `mdhd`: version 0 is 32 bits, version 1 is 64. */
const createdAt = (buf, body) =>
  buf.readUInt8(body) === 1 ? buf.readBigUInt64BE(body + 4) : BigInt(buf.readUInt32BE(body + 4));

/** Adds what leaks in the boxes of `buf` between `start` and `end` to `found`. */
function scanBoxes(buf, start, end, found) {
  for (const box of boxes(buf, start, end)) {
    const { type, body } = box;
    if (MP4_TAGS.has(type)) found.add(MP4_TAGS.get(type));
    else if (type === 'mvhd' || type === 'tkhd' || type === 'mdhd') {
      if (box.end - body > 12 && createdAt(buf, body) !== 0n) found.add('creation time');
    } else if (type === 'keys') {
      // Version and flags, an entry count, then entries: size, namespace, key name.
      let pos = body + 8;
      for (let i = 0; i < buf.readUInt32BE(body + 4) && pos + 8 <= box.end; i++) {
        const size = buf.readUInt32BE(pos);
        const key = buf.toString('utf8', pos + 8, pos + size);
        if (key.startsWith('com.apple.quicktime.')) found.add(key);
        if (size < 8) break;
        pos += size;
      }
    } else if (type === 'meta') {
      // A full box in MP4, a plain one in older QuickTime files: it holds `hdlr` first.
      const plain = buf.toString('latin1', body + 4, body + 8) === 'hdlr';
      scanBoxes(buf, plain ? body : body + 4, box.end, found);
    } else if (MP4_CONTAINERS.has(type)) scanBoxes(buf, body, box.end, found);
  }
}

/** The metadata found in an MP4 or MOV file, as names. Only `moov` is read into memory. */
function scanMp4(file) {
  const found = new Set();
  const fd = openSync(file, 'r');
  try {
    const length = statSync(file).size;
    const head = Buffer.alloc(16);
    for (let pos = 0; pos + 8 <= length;) {
      readSync(fd, head, 0, 16, pos);
      let size = head.readUInt32BE(0);
      let body = 8;
      if (size === 1) {
        size = Number(head.readBigUInt64BE(8));
        body = 16;
      } else if (size === 0) size = length - pos;
      if (size < body) break;
      if (head.toString('latin1', 4, 8) === 'moov') {
        const moov = Buffer.alloc(Math.min(size, length - pos));
        readSync(fd, moov, 0, moov.length, pos);
        scanBoxes(moov, body, moov.length, found);
      }
      pos += size;
    }
  } finally {
    closeSync(fd);
  }
  return [...found];
}

/* ------------------------------------------------------------------------ WebM */

const EBML_SEGMENT = 0x18538067;
const EBML_INFO = 0x1549a966;
const EBML_DATE_UTC = 0x4461;
const EBML_TITLE = 0x7ba9;
const EBML_TAGS = 0x1254c367;
const EBML_TAG = 0x7373;
const EBML_SIMPLE_TAG = 0x67c8;
const EBML_TAG_NAME = 0x45a3;

/** The element at `pos`: `{ id, body, end }`; an unknown size runs to `limit`. */
function ebmlElement(buf, pos, limit) {
  if (pos >= limit) return undefined;
  const idLength = Math.clz32(buf[pos]) - 23;
  if (idLength < 1 || idLength > 4 || pos + idLength >= limit) return undefined;
  let id = 0;
  for (let i = 0; i < idLength; i++) id = id * 256 + buf[pos + i];
  const sizeAt = pos + idLength;
  const sizeLength = Math.clz32(buf[sizeAt]) - 23;
  if (sizeLength < 1 || sizeLength > 8 || sizeAt + sizeLength > limit) return undefined;
  let size = buf[sizeAt] & (0xff >> sizeLength);
  let unknown = size === 0xff >> sizeLength;
  for (let i = 1; i < sizeLength; i++) {
    size = size * 256 + buf[sizeAt + i];
    unknown &&= buf[sizeAt + i] === 0xff;
  }
  const body = sizeAt + sizeLength;
  return { id, body, end: unknown ? limit : Math.min(body + size, limit) };
}

function* ebmlChildren(buf, start, end) {
  for (let pos = start; ;) {
    const element = ebmlElement(buf, pos, end);
    if (!element) return;
    yield element;
    pos = element.end;
  }
}

/** Tags every ffmpeg WebM carries and that say nothing about the author. */
const WEBM_TAGS_ALLOWED = new Set(['ENCODER', 'DURATION']);

/** The metadata found in a WebM file: `DateUTC`, a title and the tags other than the encoder. */
function scanWebm(file) {
  const found = new Set();
  const buf = readFileSync(file);
  for (const top of ebmlChildren(buf, 0, buf.length)) {
    if (top.id !== EBML_SEGMENT) continue;
    for (const part of ebmlChildren(buf, top.body, top.end)) {
      if (part.id === EBML_INFO) {
        for (const item of ebmlChildren(buf, part.body, part.end)) {
          if (item.id === EBML_DATE_UTC) found.add('creation time (DateUTC)');
          if (item.id === EBML_TITLE) found.add('title');
        }
      } else if (part.id === EBML_TAGS) {
        for (const tag of ebmlChildren(buf, part.body, part.end)) {
          if (tag.id !== EBML_TAG) continue;
          for (const simple of ebmlChildren(buf, tag.body, tag.end)) {
            if (simple.id !== EBML_SIMPLE_TAG) continue;
            for (const field of ebmlChildren(buf, simple.body, simple.end)) {
              if (field.id !== EBML_TAG_NAME) continue;
              const name = buf.toString('utf8', field.body, field.end);
              if (!WEBM_TAGS_ALLOWED.has(name.toUpperCase())) found.add(`tag ${name}`);
            }
          }
        }
      }
    }
  }
  return [...found];
}

/* ------------------------------------------------------------------------- run */

function kindOf(file) {
  if (SVG.test(file)) return 'svg';
  if (RASTER.test(file)) return 'raster';
  if (MP4.test(file)) return 'mp4';
  if (WEBM.test(file)) return 'webm';
  return undefined;
}

const files = SCANNED.flatMap((folder) =>
  readdirSync(path.join(root, folder), { recursive: true, encoding: 'utf8' })
    .filter((file) => kindOf(file) && !file.split(path.sep).includes('node_modules'))
    .map((file) => path.join(folder, file)),
);

const offenders = [];
let videos = 0;
for (const file of files) {
  const full = path.join(root, file);
  const kind = kindOf(file);
  let found;
  if (kind === 'svg') {
    const text = readFileSync(full, 'utf8');
    found = SVG_LEAKS.filter(([pattern]) => pattern.test(text)).map(([, name]) => name);
  } else if (kind === 'raster') {
    const meta = await sharp(full).metadata();
    found = ['exif', 'xmp', 'iptc', 'comments'].filter((key) =>
      Array.isArray(meta[key]) ? meta[key].length > 0 : Boolean(meta[key]),
    );
  } else {
    videos++;
    found = kind === 'webm' ? scanWebm(full) : scanMp4(full);
  }
  if (found.length > 0) offenders.push(`  ${file.replaceAll('\\', '/')}: ${found.join(', ')}`);
}

if (offenders.length > 0) {
  console.error(
    'Images or videos with metadata (it may hold the GPS position). Strip it before committing:\n' +
      `${offenders.join('\n')}\n` +
      'Images: sharp(input).rotate().toFile(output). ' +
      'Videos: ffmpeg -i in.mp4 -map_metadata -1 -c copy out.mp4 (WebM: add -fflags +bitexact).',
  );
  process.exit(1);
}
console.log(`check-media: ${files.length - videos} image(s) and ${videos} video(s), no metadata.`);
