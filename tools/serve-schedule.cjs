// Zero-dependency static server for the REALITY Schedule Studio.
//
// Same pattern as serve-studio.cjs: the Studio is a fully client-side app
// (React + Babel transpiled in the browser) but must be SERVED over HTTP,
// because Babel fetches the sibling .jsx files via XHR, which file:// blocks.
//
// Canonical home: public/schedule/ — the same files the site deploys to
// realitydn.com/schedule, so the local launcher and the live tool never drift.
//
// Launched by "Schedule Studio.bat". Stop with Ctrl-C or close the window.

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 4502;
const ROOT = path.resolve(__dirname, '..', 'public', 'schedule');
const ENTRY = 'index.html';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  // Babel reads these as text; charset matters for the Vietnamese strings
  // (Đà Nẵng, Mai Thúc Lân, Cẩm Nang…) in the seed week and footers.
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
  console.error('\n  Could not find the Schedule Studio at:\n  ' + ROOT + '\n');
  process.exit(1);
}

const server = http.createServer((req, res) => {
  let rel = decodeURIComponent((req.url || '/').split('?')[0]);
  if (rel === '/') rel = '/' + ENTRY;

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
  console.log('\n  REALITY Schedule Studio');
  console.log('  -----------------------');
  console.log('  Serving:  ' + ROOT);
  console.log('  Open:     http://localhost:' + PORT + '/');
  console.log('\n  Close this window (or Ctrl-C) to stop.\n');
});
