/**
 * Serves `apps/web/dist` over plain HTTP with no dependencies — for checking a production
 * build, and for the tester, who is told to work with plain `node` and no network.
 *
 *   npm run web:build && npm run serve
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, extname, join, normalize, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', 'apps', 'web', 'dist');
const PORT = Number(process.env.PORT ?? 4173);

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.map': 'application/json',
  // Self-hosted typefaces (I-8a). A browser will accept `application/octet-stream` for a
  // `@font-face` source, but the correct type is one line, and a probe that checks the
  // response header should see what the build actually emitted.
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf',
};

createServer(async (req, res) => {
  // normalize + prefix check: a served path may never escape dist/
  const url = new URL(req.url ?? '/', 'http://localhost');
  const rel = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, '');
  let file = join(ROOT, rel);
  if (!file.startsWith(ROOT)) {
    res.writeHead(403).end('forbidden');
    return;
  }
  try {
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
  } catch {
    file = join(ROOT, 'index.html'); // single-page app fallback
  }
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' }).end(body);
  } catch {
    res.writeHead(404).end('not found');
  }
}).listen(PORT, () => console.log(`cairn: http://localhost:${PORT}  (serving apps/web/dist)`));
