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

// Routes to pre-render — every page × every language prefix (this mirrors
// LANGS in src/data/languages.js; keep the two lists in sync when adding a
// language or a page). The SEO component writes per-route canonical +
// hreflang into <head> before Puppeteer captures.
// /host-guide is still a stub, so noindex is injected at the component level;
// we skip adding it to the sitemap but do pre-render it so links work.
const LANG_PREFIXES = ['', '/vn', '/ru', '/uk', '/ko', '/ja'];
const PAGES = ['', '/event-guidelines', '/host-guide'];
const ROUTES = LANG_PREFIXES.flatMap((prefix) =>
  PAGES.map((page) => prefix + page || '/')
);

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

  // Each route renders in isolation. Previously a single failure threw out of
  // the loop, so every route after it silently never shipped — one slow page
  // could cost the other fourteen.
  const failed = [];

  for (const route of ROUTES) {
    const url = `http://localhost:${PORT}${route}`;
    console.log(`  → Rendering ${route}`);

    // Two attempts. A first-pass timeout is nearly always a slow upstream
    // asset (posters), not a broken page, so the retry gets a longer budget
    // rather than failing the route outright.
    let saved = false;
    for (const [attempt, timeout] of [[1, 20000], [2, 60000]]) {
      const page = await browser.newPage();
      try {
        // The static capture is always Day (cream) — the canonical first
        // impression for crawlers and first paint. Without this, a machine
        // whose headless Chrome reports prefers-color-scheme: dark would bake
        // data-theme="dark" into the shipped HTML. Real visitors still get
        // Night via the inline theme bootstrap (saved preference / OS setting).
        await page.emulateMediaFeatures([
          { name: 'prefers-color-scheme', value: 'light' },
        ]);

        // The capture is a STILL, so ambient motion must not be in it.
        // BandField reads this and declines to mount, leaving the flat
        // coloured band in the shipped HTML — otherwise every band would
        // bake in ~70 <i> elements frozen at whatever random frame the
        // 500ms settle happened to land on.
        await page.evaluateOnNewDocument(() => { window.__PRERENDER__ = true; });

        await page.goto(url, { waitUntil: 'networkidle0', timeout });

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
        saved = true;
      } catch (err) {
        console.warn(`    ! attempt ${attempt} failed after ${timeout}ms — ${err.message}`);
      } finally {
        await page.close().catch(() => {});
      }
      if (saved) break;
    }

    if (!saved) failed.push(route);
  }

  await browser.close();
  server.close();

  if (failed.length) {
    // Loud on purpose. A missing route does NOT 404: public/_redirects has a
    // `/* /index.html 200` catch-all, so an unrendered /vn quietly serves the
    // English homepage with a 200. Nothing alarms, nothing errors — the only
    // symptom is crawlers indexing the wrong language. That silence is why
    // this used to exit 0 and ship a partial site looking perfectly healthy.
    console.error(`\n❌ ${failed.length} of ${ROUTES.length} routes did not pre-render:\n`);
    for (const r of failed) console.error(`     ✗ ${r || '/'}`);
    console.error(
      '\n   These would deploy as the English homepage (200, no 404) and be\n' +
      '   indexed as such. Refusing to ship a partial pre-render.\n' +
      '   Set ALLOW_PARTIAL_PRERENDER=1 to deploy anyway.\n'
    );
    return failed;
  }

  console.log('\n✅ Pre-rendering complete.\n');
  return [];
}

prerender()
  .then((failed) => {
    if (failed.length && !process.env.ALLOW_PARTIAL_PRERENDER) process.exit(1);
  })
  .catch((err) => {
    // Reaching here means the run itself broke (browser/server), not a single
    // route — dist/ has no reliable pre-render at all, so don't ship it.
    console.error('\n❌ Pre-rendering aborted:', err);
    if (!process.env.ALLOW_PARTIAL_PRERENDER) process.exit(1);
  });
