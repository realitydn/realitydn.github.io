/**
 * prerender.mjs — Renders each route in a headless browser after vite build
 * and writes the fully-rendered HTML back into dist/.
 *
 * This means Google (and any crawler) sees real content instead of an empty
 * <div id="root"></div>. For users with JS enabled, React hydrates over the
 * static HTML seamlessly — no visual difference.
 *
 * Requires: npm install -D puppeteer
 * Runs automatically via the prerender plugin in vite.config.js
 */

import { launch } from 'puppeteer';
import { createServer } from 'http';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST = join(__dirname, 'dist');
const PORT = 4173;

// Routes to pre-render — add new routes here as you create them.
// Each EN route has a VN twin under /vn for bilingual SEO. The SEO component
// writes per-route canonical + hreflang into <head> before Puppeteer captures.
// /host-guide is still a stub, so noindex is injected at the component level;
// we skip adding it to the sitemap but do pre-render it so links work.
const ROUTES = [
  '/',
  '/event-guidelines',
  '/host-guide',
  '/vn',
  '/vn/event-guidelines',
  '/vn/host-guide',
];

// Simple static file server for the built dist/
function startServer() {
  const mime = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff2': 'font/woff2',
    '.woff': 'font/woff',
    '.pdf': 'application/pdf',
    '.txt': 'text/plain',
    '.xml': 'application/xml',
  };

  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      let filePath = join(DIST, req.url === '/' ? '/index.html' : req.url);
      // SPA fallback — serve index.html for non-file routes
      if (!existsSync(filePath) || !filePath.includes('.')) {
        filePath = join(DIST, 'index.html');
      }
      try {
        const data = readFileSync(filePath);
        const ext = '.' + filePath.split('.').pop();
        res.writeHead(200, { 'Content-Type': mime[ext] || 'application/octet-stream' });
        res.end(data);
      } catch {
        res.writeHead(404);
        res.end('Not found');
      }
    });
    server.listen(PORT, () => resolve(server));
  });
}

async function prerender() {
  console.log('\n🔍 Pre-rendering routes for SEO...\n');

  const server = await startServer();
  const browser = await launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  for (const route of ROUTES) {
    const page = await browser.newPage();
    const url = `http://localhost:${PORT}${route}`;

    console.log(`  → Rendering ${route}`);
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 15000 });

    // Wait a beat for any React effects to settle
    await new Promise((r) => setTimeout(r, 500));

    const html = await page.content();

    // Write the rendered HTML to the right place in dist/
    const outPath = route === '/'
      ? join(DIST, 'index.html')
      : join(DIST, route, 'index.html');

    const outDir = dirname(outPath);
    if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

    writeFileSync(outPath, html, 'utf-8');
    console.log(`    ✓ Saved ${outPath.replace(DIST, 'dist')}`);

    await page.close();
  }

  await browser.close();
  server.close();
  console.log('\n✅ Pre-rendering complete.\n');
}

prerender().catch((err) => {
  console.error('Pre-rendering failed:', err);
  process.exit(0); // Non-fatal — SPA still works without pre-rendered HTML
});
