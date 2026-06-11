// Zero-dependency static server for the REALITY Poster Studio.
//
// The Studio is a fully client-side app (React + Babel transpiled in the
// browser), but it must be SERVED over HTTP — opening the .html as a file://
// fails because Babel fetches the sibling .jsx files via XHR, which file://
// blocks. This serves public/studio/ so the Studio can load locally.
//
// Launched by "Poster Studio.bat". Stop with Ctrl-C or by closing the window.

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 4501;
// Canonical home: public/studio/ — the same files the site deploys to
// realitydn.com/studio. Serving them here means the local launcher and the
// live tool can never drift apart.
const ROOT = path.resolve(__dirname, '..', 'public', 'studio');
const ENTRY = 'index.html';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  // Babel reads these as text and transpiles them; charset matters for the
  // Vietnamese strings (Đà Nẵng, Mai Thúc Lân) in the catalog defaults.
  '.jsx': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
};

if (!fs.existsSync(path.join(ROOT, ENTRY))) {
  console.error('\n  Could not find the Poster Studio at:\n  ' + ROOT + '\n');
  console.error('  The design-handoff folder is missing. Re-extract');
  console.error('  "REALITY Design System Year 2.zip" into the project root.\n');
  process.exit(1);
}

const server = http.createServer((req, res) => {
  // Decode + strip query, default to the Studio entry page.
  let rel = decodeURIComponent((req.url || '/').split('?')[0]);
  if (rel === '/') rel = '/' + ENTRY;

  // Contain to ROOT — no path traversal out of the design folder.
  const filePath = path.normalize(path.join(ROOT, rel));
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

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
  console.log('\n  REALITY Poster Studio');
  console.log('  ---------------------');
  console.log('  Serving:  ' + ROOT);
  console.log('  Open:     ' + url);
  console.log('\n  Close this window (or Ctrl-C) to stop.\n');
});
