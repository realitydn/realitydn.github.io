// Zero-dependency static server for the REALITY Print Studio.
//
// Like the Poster Studio it is a fully client-side app (React, no in-browser
// Babel since 23faf1c) that must be SERVED over HTTP — index.html asks for
// print.bundle.js, which only exists on disk after a build, and the PDF engine
// fetches the vendored font .ttf files, which file:// blocks. This serves
// public/print/, and bundles main.jsx and its imports in memory on every
// request for print.bundle.js (tools/studio-bundle.cjs — the same esbuild
// recipe scripts/build-studios.mjs uses), so there is no build step.
//
// Launched by "Print Studio.bat". Stop with Ctrl-C or by closing the window.

const http = require('http');
const fs = require('fs');
const path = require('path');
const { serveBundle } = require('./studio-bundle.cjs');

// Default 4503 (what "Print Studio.bat" expects). Honour PORT when set so a
// preview server can run on an assigned free port without colliding.
const PORT = process.env.PORT || 4503;
// Canonical home: public/print/ — the same files the site deploys to
// realitydn.com/print, so the local launcher and the live tool never drift.
const ROOT = path.resolve(__dirname, '..', 'public', 'print');
const ENTRY = 'index.html';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  // Raw .jsx is served as text if requested directly; charset matters for the
  // Vietnamese strings (Đà Nẵng, Mai Thúc Lân) in the catalog defaults.
  '.jsx': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  // the vendored brand fonts the PDF exporter embeds
  '.ttf': 'font/ttf',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
};

if (!fs.existsSync(path.join(ROOT, ENTRY))) {
  console.error('\n  Could not find the Print Studio at:\n  ' + ROOT + '\n');
  process.exit(1);
}

// Files the page loads from OUTSIDE its own folder. Deployed, public/ is
// copied verbatim to the site root, so index.html's "../studio-shared/…"
// resolves at the root and just works; locally ROOT containment would 403 it.
// (The shared modules — the control kit, the glyph set — are inside the
// bundle; esbuild reads them straight off disk.)
const SHARED = {
  // The riso press — the pure core and the canvas engine — is one copy shared
  // with Poster Studio (Print used to carry its own white-paper fork).
  '/studio-shared/riso-press.js': path.resolve(__dirname, '..', 'public', 'studio-shared', 'riso-press.js'),
  '/studio-shared/riso-engine.js': path.resolve(__dirname, '..', 'public', 'studio-shared', 'riso-engine.js'),
};

const server = http.createServer((req, res) => {
  let rel = decodeURIComponent((req.url || '/').split('?')[0]);
  if (rel === '/') rel = '/' + ENTRY;

  // Contain to ROOT — no path traversal, except the shared files listed above.
  const shared = SHARED[rel];
  const filePath = shared || path.normalize(path.join(ROOT, rel));
  if (!shared && !filePath.startsWith(ROOT)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  // index.html asks for print.bundle.js; build it from main.jsx on demand so
  // editing a .jsx and hitting refresh is all it takes — no build step. (A
  // stale built bundle on disk is never served in its place.)
  if (serveBundle('print', rel, res)) return;

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      return res.end('Not found');
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
});

server.listen(PORT, () => {
  const url = `http://localhost:${PORT}/${encodeURIComponent(ENTRY)}`;
  console.log('\n  REALITY Print Studio');
  console.log('  --------------------');
  console.log('  Serving:  ' + ROOT);
  console.log('  Open:     ' + url);
  console.log('\n  Close this window (or Ctrl-C) to stop.\n');
});
