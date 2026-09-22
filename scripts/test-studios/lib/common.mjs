// Shared plumbing for the studio test suites: paths, the browser, the
// determinism shims, the offline network policy, the local servers, and the
// in-browser image comparator.
//
// Nothing here writes outside tests/ (goldens, fixtures, out/) or the OS temp
// dir, and nothing talks to the internet except `--record-fonts`.

import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { decodePng, encodePng } from './png.mjs';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
export const TESTS = path.join(ROOT, 'tests');
export const GOLDEN = path.join(TESTS, 'golden');
export const OUT = path.join(TESTS, 'out');
export const FIXTURES = path.join(TESTS, 'fixtures');
export const FONT_CACHE = path.join(FIXTURES, 'fonts');

// Ports reserved for the suites — away from the launchers' 4501-4503, Vite's
// 4173/5173 and the prerender, so a run never collides with a Studio Donald
// has open.
// TEST_PORT_BASE lets two worktrees run the suite side by side (default 4600).
const BASE = Number(process.env.TEST_PORT_BASE) || 4600;
export const PORTS = { harness: BASE, studio: BASE + 1, schedule: BASE + 2, print: BASE + 3 };

// The fixed clock for every page: Monday of the stress week, mid-morning in
// Đà Nẵng. The clock ADVANCES from here with real elapsed time, so debounces
// and timeouts still behave; anything that prints a date sees 08.06.26.
export const FIXED_NOW = '2026-06-08T10:00:00+07:00';
export const TIMEZONE = 'Asia/Ho_Chi_Minh';

export const VIEWPORTS = [
  { width: 1280, height: 800 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
];

export function ensureDir(d) { fs.mkdirSync(d, { recursive: true }); return d; }
export function rel(p) { return path.relative(ROOT, p).split(path.sep).join('/'); }
export function slug(s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------- browser

export async function launchBrowser() {
  const { default: puppeteer } = await import('puppeteer');
  return puppeteer.launch({
    headless: true,
    args: [
      // Pixel determinism. sRGB everywhere (no monitor profile), grayscale AA,
      // no hinting, and no CPU-specific SIMD paths in Skia — the last one is
      // what lets a golden rendered on one machine match another.
      '--force-color-profile=srgb',
      '--disable-lcd-text',
      '--font-render-hinting=none',
      '--disable-skia-runtime-opts',
      '--disable-gpu',
      '--lang=en-US',
      '--hide-scrollbars',
      '--no-first-run',
      '--mute-audio',
      // Needed on GitHub's Ubuntu runners (no user namespaces for the sandbox).
      ...(process.env.CI ? ['--no-sandbox', '--disable-setuid-sandbox'] : []),
    ],
    defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 1 },
  });
}

// Injected before any page script. Math.random becomes a seeded mulberry32
// (the engine's own PRNG), and Date starts at FIXED_NOW.
function determinismShim(seed, fixedNow) {
  let s = seed >>> 0;
  Math.random = function () {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  if (fixedNow) {
    const RealDate = Date;
    const t0 = RealDate.now();
    const base = RealDate.parse(fixedNow);
    const now = () => base + (RealDate.now() - t0);
    class FixedDate extends RealDate {
      constructor(...a) { if (a.length === 0) super(now()); else super(...a); }
      static now() { return now(); }
    }
    FixedDate.parse = RealDate.parse;
    FixedDate.UTC = RealDate.UTC;
    window.Date = FixedDate;
  }
  window.__TEST_STUDIOS__ = true;
}

// Set once by run.mjs from --record-fonts.
export const settings = { recordFonts: false };

/**
 * A page with the determinism shims and the offline network policy on.
 * Returns { page, log } where log collects page errors, console errors and
 * blocked requests for the smoke assertions.
 */
export async function preparePage(browser, { viewport, seed = 0x5EED, fixedNow = FIXED_NOW, recordFonts = settings.recordFonts } = {}) {
  const page = await browser.newPage();
  const log = { pageErrors: [], consoleErrors: [], blocked: [], fontMisses: [] };
  if (viewport) await page.setViewport({ ...viewport, deviceScaleFactor: 1 });
  await page.emulateTimezone(TIMEZONE);
  await page.evaluateOnNewDocument(determinismShim, seed, fixedNow);
  page.on('pageerror', (e) => log.pageErrors.push(String((e && e.stack) || e)));
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const loc = m.location() || {};
    log.consoleErrors.push({ text: m.text(), url: loc.url || '' });
  });
  page.on('dialog', (d) => d.accept().catch(() => {}));
  await page.setRequestInterception(true);
  const ua = recordFonts ? await browser.userAgent() : '';
  page.on('request', (req) => routeRequest(req, log, recordFonts, ua));
  return { page, log };
}

// ---------------------------------------------------------------- network

const LOCAL = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//;
const FONT_HOSTS = /^https:\/\/fonts\.(googleapis|gstatic)\.com\//;

// Font files are keyed without their query: html-to-image's cacheBust
// appends ?<timestamp> to every font it embeds.
function fontCacheName(url) {
  if (url.startsWith('https://fonts.gstatic.com/')) url = url.split('?')[0];
  const h = createHash('sha1').update(url).digest('hex').slice(0, 16);
  return url.startsWith('https://fonts.googleapis.com/') ? h + '.css' : h + '.woff2';
}

function readFontManifest() {
  try { return JSON.parse(fs.readFileSync(path.join(FONT_CACHE, 'manifest.json'), 'utf8')); } catch { return {}; }
}

async function routeRequest(req, log, recordFonts, ua) {
  const url = req.url();
  if (req.isInterceptResolutionHandled()) return;
  if (url.startsWith('data:') || url.startsWith('blob:') || LOCAL.test(url)) return req.continue();
  if (FONT_HOSTS.test(url)) {
    // Google Fonts come from a committed cache, never the network: the CSS a
    // live request returns changes with Google's mood and the browser's UA,
    // and a font that arrives late changes every text raster. Record with
    // --record-fonts (the only network the suites ever touch).
    const file = path.join(FONT_CACHE, fontCacheName(url));
    if (!fs.existsSync(file) && recordFonts) {
      try {
        const r = await fetch(url, { headers: { 'User-Agent': ua || 'Mozilla/5.0' } });
        const buf = Buffer.from(await r.arrayBuffer());
        if (r.ok) {
          ensureDir(FONT_CACHE);
          fs.writeFileSync(file, buf);
          const man = readFontManifest(); man[path.basename(file)] = url;
          // A stylesheet: take every face it lists now, not just the ones
          // today's text happened to need — the browser fetches subsets
          // lazily, per glyph (a new "ẵ" would be a miss next run), and
          // html-to-image fetches every one of them to embed in a capture.
          if (file.endsWith('.css')) {
            const css = buf.toString('utf8');
            const re = /\/\*\s*([a-z-]+)\s*\*\/\s*@font-face\s*{[^}]*?url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/g;
            for (let m; (m = re.exec(css));) {
              const f2 = path.join(FONT_CACHE, fontCacheName(m[2]));
              if (fs.existsSync(f2)) continue;
              const r2 = await fetch(m[2]);
              if (r2.ok) { fs.writeFileSync(f2, Buffer.from(await r2.arrayBuffer())); man[path.basename(f2)] = m[2]; }
            }
          }
          fs.writeFileSync(path.join(FONT_CACHE, 'manifest.json'), JSON.stringify(man, null, 2) + '\n');
        }
      } catch (e) { /* fall through to the miss */ }
    }
    if (fs.existsSync(file)) {
      const isCss = file.endsWith('.css');
      return req.respond({
        status: 200,
        headers: { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' },
        contentType: isCss ? 'text/css; charset=utf-8' : 'font/woff2',
        body: fs.readFileSync(file),
      });
    }
    log.fontMisses.push(url);
    return req.abort('blockedbyclient');
  }
  log.blocked.push(url);
  return req.abort('blockedbyclient');
}

// Console noise that is the test's own doing (the network block) or that the
// studios are allowed to make offline. Everything else is a failure.
export function isIgnorableConsoleError({ text, url }) {
  const t = text || '';
  if (/favicon\.ico/.test(t) || /favicon\.ico/.test(url)) return true;
  if (/ERR_BLOCKED_BY_CLIENT|ERR_FAILED|ERR_INTERNET_DISCONNECTED/.test(t)) return true;
  if (/realitydn\.com/.test(t) || /realitydn\.com/.test(url)) return true;
  if (/CORS policy/.test(t)) return true;
  // fetch() against a blocked host surfaces as "Failed to fetch" in the
  // studios' own feed/cloud error logging.
  if (/Failed to fetch|NetworkError|Load failed/.test(t)) return true;
  return false;
}

// ---------------------------------------------------------------- servers

function portFree(port) {
  return new Promise((resolve) => {
    const s = net.createServer();
    s.once('error', () => resolve(false));
    s.once('listening', () => s.close(() => resolve(true)));
    s.listen(port, '127.0.0.1');
  });
}

async function waitForHttp(url, ms = 15000) {
  const until = Date.now() + ms;
  while (Date.now() < until) {
    const ok = await new Promise((resolve) => {
      const r = http.get(url, (res) => { res.resume(); resolve(res.statusCode < 500); });
      r.on('error', () => resolve(false));
      r.setTimeout(1000, () => { r.destroy(); resolve(false); });
    });
    if (ok) return;
    await sleep(120);
  }
  throw new Error('server did not come up: ' + url);
}

/** Start one of the tools/serve-*.cjs launchers on a test port. */
export async function startStudioServer(name) {
  const script = { studio: 'serve-studio.cjs', print: 'serve-print.cjs', schedule: 'serve-schedule.cjs' }[name];
  const port = PORTS[name];
  if (!(await portFree(port))) throw new Error(`port ${port} (${name}) is already in use — stop whatever holds it and re-run`);
  const child = spawn(process.execPath, [path.join(ROOT, 'tools', script)], {
    cwd: ROOT, env: { ...process.env, PORT: String(port) }, stdio: ['ignore', 'pipe', 'pipe'],
  });
  let stderr = '';
  child.stderr.on('data', (d) => { stderr += d; });
  child.stdout.on('data', () => {});
  try {
    await waitForHttp(`http://127.0.0.1:${port}/`);
  } catch (e) {
    child.kill();
    throw new Error(e.message + (stderr ? '\n' + stderr : ''));
  }
  return { url: `http://localhost:${port}/`, stop: () => new Promise((r) => { child.once('exit', r); child.kill(); setTimeout(r, 1500); }) };
}

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png',
  '.css': 'text/css; charset=utf-8',
};

/**
 * The engine harness server: read-only, and only the few folders the harness
 * needs (the shared engine, the fixtures, the harness page itself).
 */
export async function startHarnessServer() {
  const allow = ['public/studio-shared/', 'tests/fixtures/', 'scripts/test-studios/harness/'];
  const port = PORTS.harness;
  if (!(await portFree(port))) throw new Error(`port ${port} (engine harness) is already in use`);
  const server = http.createServer((req, res) => {
    const p = decodeURIComponent((req.url || '/').split('?')[0]).replace(/^\/+/, '');
    if (!allow.some((a) => p.startsWith(a)) || p.includes('..')) { res.writeHead(404); return res.end(); }
    fs.readFile(path.join(ROOT, p), (err, data) => {
      if (err) { res.writeHead(404); return res.end(); }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      res.end(data);
    });
  });
  await new Promise((r) => server.listen(port, '127.0.0.1', r));
  return { url: `http://localhost:${port}/`, stop: () => new Promise((r) => { server.close(r); server.closeAllConnections(); }) };
}

// ---------------------------------------------------------------- compare

/**
 * Compare two RGBA images ({width,height,data}). A pixel "differs" when any
 * channel is off by more than `tol`; the case passes when at least `minMatch`
 * of the pixels are within it. Returns stats and, when anything differs, a
 * diff image: the actual faded to grey, offending pixels in solid red.
 */
export function compareImages(G, A, { tol = 3, minMatch = 0.995 } = {}) {
  if (G.width !== A.width || G.height !== A.height) {
    return { pass: false, sizeMismatch: true, golden: [G.width, G.height], actual: [A.width, A.height] };
  }
  const n = G.width * G.height, g = G.data, a = A.data;
  const diff = Buffer.alloc(n * 4);
  let over = 0, max = 0, sum = 0;
  for (let i = 0, k = 0; i < n; i++, k += 4) {
    let m = 0;
    for (let c = 0; c < 4; c++) { const d = Math.abs(g[k + c] - a[k + c]); sum += d; if (d > m) m = d; }
    if (m > max) max = m;
    if (m > tol) { over++; diff[k] = 255; diff[k + 1] = 0; diff[k + 2] = 0; diff[k + 3] = 255; }
    else {
      const l = (0.299 * a[k] + 0.587 * a[k + 1] + 0.114 * a[k + 2]) * 0.35 + 166;
      diff[k] = diff[k + 1] = diff[k + 2] = l; diff[k + 3] = 255;
    }
  }
  const match = 1 - over / n;
  return { pass: match >= minMatch, over, match, max, mean: sum / (n * 4), diff: over ? diff : null };
}

/**
 * Check one rendered image ({width,height,data} RGBA) against its golden
 * tests/golden/<suite>/<name>.png. With `update`, (re)write the golden
 * instead — but only when it moved beyond tolerance, so an --update run on a
 * machine that renders a hair differently doesn't churn every file. On
 * failure writes <name>.actual.png / .golden.png / .diff.png to tests/out/<suite>/.
 */
export function checkGolden({ suite, name, image, update, tol, minMatch }) {
  const goldenFile = path.join(GOLDEN, suite, name + '.png');
  const have = fs.existsSync(goldenFile);
  if (update) {
    if (have) {
      const r = compareImages(decodePng(fs.readFileSync(goldenFile)), image, { tol, minMatch });
      if (r.pass) return { name, status: 'kept', ...r, diff: undefined };
    }
    ensureDir(path.dirname(goldenFile));
    fs.writeFileSync(goldenFile, encodePng(image.width, image.height, image.data));
    return { name, status: have ? 'updated' : 'created', pass: true };
  }
  if (!have) {
    writeOut(suite, name + '.actual.png', encodePng(image.width, image.height, image.data));
    return { name, status: 'missing', pass: false };
  }
  const golden = decodePng(fs.readFileSync(goldenFile));
  const r = compareImages(golden, image, { tol, minMatch });
  if (!r.pass) {
    writeOut(suite, name + '.actual.png', encodePng(image.width, image.height, image.data));
    writeOut(suite, name + '.golden.png', fs.readFileSync(goldenFile));
    if (r.diff) writeOut(suite, name + '.diff.png', encodePng(image.width, image.height, r.diff));
  }
  delete r.diff;
  return { name, status: r.pass ? 'pass' : 'fail', ...r };
}

export function writeOut(suite, file, buf) {
  const f = path.join(ensureDir(path.join(OUT, suite)), file);
  fs.writeFileSync(f, buf);
  return f;
}

export function fmtStat(r) {
  if (r.status === 'missing') return 'no golden yet (run with --update)';
  if (r.status === 'created' || r.status === 'updated') return r.status;
  if (r.sizeMismatch) return `size ${r.actual.join('x')} != golden ${r.golden.join('x')}`;
  if (r.match == null) return r.status;
  return `match ${(r.match * 100).toFixed(3)}%  max Δ${r.max}  mean Δ${r.mean.toFixed(3)}`;
}

/** Decode a data: URL (or raw base64) to a Buffer. */
export function dataUrlToBuffer(u) { return Buffer.from(String(u).replace(/^data:[^,]*,/, ''), 'base64'); }

/** A PNG data URL / Buffer → {width,height,data}. */
export function imageFromPng(png) { return decodePng(Buffer.isBuffer(png) ? png : dataUrlToBuffer(png)); }

// ---------------------------------------------------------------- platforms

export const EXACT = { tol: 0, minMatch: 1 };

/**
 * Which tolerance a golden folder gets. Goldens record the OS + Chrome build
 * they were rendered on (tests/golden/<dir>/_platform.json). Checked there,
 * the match must be EXACT — so one moved pixel fails; anywhere else (another
 * OS, another Chrome), or with --loose, the folder's cross-platform `cross`
 * tolerance applies.
 */
export async function tolerancePlan(browser, dir, cross, loose) {
  const here = { os: process.platform, chrome: await browser.version() };
  const file = path.join(GOLDEN, dir, '_platform.json');
  let made = null;
  try { made = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { /* none yet */ }
  const same = !loose && !!made && made.os === here.os && made.chrome === here.chrome;
  const tol = same ? EXACT : cross;
  const note = same
    ? `${dir}: exact (goldens made here: ${here.os}, ${here.chrome})`
    : `${dir}: Δ${cross.tol} on ${+(cross.minMatch * 100).toFixed(3)}% (goldens: ${made ? made.os + ', ' + made.chrome : 'unrecorded'}; here: ${here.os}, ${here.chrome})`;
  return {
    tol, same, note,
    // after an --update: goldens (re)rendered here now belong to this platform
    record(results) {
      if (!made || results.some((r) => r.status === 'created' || r.status === 'updated')) {
        ensureDir(path.dirname(file));
        fs.writeFileSync(file, JSON.stringify(here, null, 2) + '\n');
      }
    },
  };
}
