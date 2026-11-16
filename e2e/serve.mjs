// Static server for the end-to-end suite. It serves the already-built `apps/web/dist` with the
// rules of Cloudflare Workers static assets (wrangler.jsonc): a folder without a trailing slash
// redirects to the slash form, and a path that does not exist answers with the nearest
// `404.html` up the tree and status 404. Range requests are supported (the project videos).
//
//   node e2e/serve.mjs            serves apps/web/dist on port 4173
//   E2E_PORT=4504 E2E_DIST=<dir>  another port or build folder
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(process.env.E2E_DIST ?? path.join(here, '..', 'apps', 'web', 'dist'));
const port = Number(process.env.E2E_PORT ?? 4173);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.xml': 'application/xml',
  '.txt': 'text/plain',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
};

if (!fs.existsSync(path.join(root, 'index.html'))) {
  console.error(`No build found in ${root}. Run "pnpm build" first.`);
  process.exit(1);
}

function send(req, res, file, status = 200) {
  const size = fs.statSync(file).size;
  const headers = {
    'Content-Type': TYPES[path.extname(file).toLowerCase()] ?? 'application/octet-stream',
    'Cache-Control': 'no-store',
    'Accept-Ranges': 'bytes',
  };
  const range = status === 200 && /bytes=(\d*)-(\d*)/.exec(req.headers.range ?? '');
  if (range) {
    const start = range[1] ? Number(range[1]) : 0;
    const end = range[2] ? Number(range[2]) : size - 1;
    res.writeHead(206, {
      ...headers,
      'Content-Range': `bytes ${start}-${end}/${size}`,
      'Content-Length': end - start + 1,
    });
    fs.createReadStream(file, { start, end }).pipe(res);
    return;
  }
  res.writeHead(status, { ...headers, 'Content-Length': size });
  if (req.method === 'HEAD') res.end();
  else fs.createReadStream(file).pipe(res);
}

function handle(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const rel = decodeURIComponent(url.pathname);
  const abs = path.join(root, rel);
  if (!abs.startsWith(root)) {
    res.writeHead(400).end();
    return;
  }
  const stat = fs.existsSync(abs) ? fs.statSync(abs) : null;
  if (stat?.isFile()) return send(req, res, abs);
  if (stat?.isDirectory()) {
    if (!rel.endsWith('/')) {
      res.writeHead(307, { Location: `${rel}/${url.search}` }).end();
      return;
    }
    const index = path.join(abs, 'index.html');
    if (fs.existsSync(index)) return send(req, res, index);
  }
  // The nearest 404.html up the tree.
  let dir = path.dirname(rel.endsWith('/') ? path.join(abs, 'x') : abs);
  while (dir.startsWith(root)) {
    const page = path.join(dir, '404.html');
    if (fs.existsSync(page)) return send(req, res, page, 404);
    if (dir === root) break;
    dir = path.dirname(dir);
  }
  res.writeHead(404).end('not found');
}

http
  .createServer((req, res) => {
    try {
      handle(req, res);
    } catch (error) {
      res.writeHead(500).end(String(error));
    }
  })
  .listen(port, '127.0.0.1', () => console.log(`Serving ${root} at http://127.0.0.1:${port}`));
