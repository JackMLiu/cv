// Minimal static file server for local preview and tests (mirrors GitHub Pages under /cv/).
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const port = Number(process.env.PORT || 4173);
const base = '/cv';

const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.pdf': 'application/pdf',
};

createServer(async (req, res) => {
  let path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (path === '/' || path === base) {
    res.writeHead(302, { Location: base + '/' });
    return res.end();
  }
  if (!path.startsWith(base + '/')) {
    res.writeHead(404);
    return res.end('Not found');
  }
  path = path.slice(base.length);
  if (path.endsWith('/')) path += 'index.html';
  const file = normalize(join(root, path));
  // Never serve outside the repo or any dot-folder (e.g. private planning docs).
  if (!file.startsWith(normalize(root)) || path.split('/').some((seg) => seg.startsWith('.'))) {
    res.writeHead(403);
    return res.end();
  }
  try {
    if ((await stat(file)).isDirectory()) throw new Error('dir');
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end('Not found');
  }
}).listen(port, () => console.log(`Serving http://localhost:${port}${base}/`));
