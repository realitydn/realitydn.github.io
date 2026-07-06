/**
 * fetch-feed.mjs — build-time Events Feed snapshot.
 *
 * Runs as `prebuild` (before `vite build`). Fetches a windowed slice of the live
 * Events Feed (today-7d .. today+60d) and writes it to public/feed-snapshot.json,
 * which ships in dist/ and is therefore same-origin + crawlable. The Puppeteer
 * prerender (prerender.mjs) serves dist/ over http and waits networkidle0+500ms,
 * so useFeed.js's same-origin fallback resolves during the static capture and the
 * agenda + JSON-LD bake into the prerendered HTML — good SEO with no live call.
 *
 * GUARDRAIL #1: this script must NEVER fail the build. Everything is wrapped in
 * try/catch and we `process.exit(0)` on ANY error. If `prebuild` exits non-zero,
 * the whole deploy fails. A transient feed outage must not blank the live site.
 *
 * SNAPSHOT FLOOR: public/feed-snapshot.json is committed non-empty (a real seed).
 * On a successful fetch we overwrite it. On failure we leave the existing snapshot
 * untouched (the committed seed or a prior good snapshot is the floor) — we only
 * write {"events":[],"stale":true} when NO snapshot exists at all, so the file is
 * always present for the same-origin fallback.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT = join(ROOT, 'public', 'feed-snapshot.json');

const FEED_BASE = (process.env.VITE_FEED_BASE || 'https://app.realitydn.com').replace(/\/$/, '');
const TIMEOUT_MS = 12000;

// YYYY-MM-DD in UTC (the feed's ?from/?to are date-only; exact TZ is not load-bearing
// for a -7d..+60d window).
function ymd(date) {
  return date.toISOString().slice(0, 10);
}

function hasUsableExistingSnapshot() {
  try {
    if (!existsSync(OUT)) return false;
    const parsed = JSON.parse(readFileSync(OUT, 'utf-8'));
    // A committed seed or a prior good fetch has real events; don't clobber it.
    return Array.isArray(parsed.events) && parsed.events.length > 0;
  } catch {
    return false;
  }
}

async function main() {
  const now = new Date();
  const from = ymd(new Date(now.getTime() - 7 * 86400000));
  const to = ymd(new Date(now.getTime() + 60 * 86400000));
  const url = `${FEED_BASE}/api/feed/v1/events.json?from=${from}&to=${to}`;

  console.log(`[fetch-feed] GET ${url}`);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let doc = null;
  try {
    const res = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    doc = await res.json();
    if (!doc || !Array.isArray(doc.events)) throw new Error('feed missing events[]');
  } finally {
    clearTimeout(timer);
  }

  // Only overwrite when the fetch actually returned events. An empty live feed
  // (the platform mid-migration) must NOT replace the committed seed — that would
  // be an SEO regression (blank prerender).
  if (doc.events.length === 0 && hasUsableExistingSnapshot()) {
    console.warn('[fetch-feed] live feed is empty; keeping existing non-empty snapshot.');
    return;
  }

  if (!existsSync(dirname(OUT))) mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(doc), 'utf-8');
  console.log(`[fetch-feed] wrote ${OUT} (${doc.events.length} events)`);
}

try {
  await main();
} catch (err) {
  console.warn(`[fetch-feed] WARNING: snapshot fetch failed (non-fatal): ${err && err.message ? err.message : err}`);
  // Leave any existing snapshot as the floor. Only write an empty stale marker
  // when there is no snapshot at all, so the same-origin fallback always 200s.
  try {
    if (!existsSync(OUT)) {
      if (!existsSync(dirname(OUT))) mkdirSync(dirname(OUT), { recursive: true });
      writeFileSync(OUT, JSON.stringify({ events: [], stale: true }), 'utf-8');
      console.warn('[fetch-feed] no prior snapshot — wrote empty stale placeholder.');
    } else {
      console.warn('[fetch-feed] keeping existing snapshot as the floor.');
    }
  } catch (e2) {
    console.warn(`[fetch-feed] could not write placeholder (ignored): ${e2 && e2.message}`);
  }
}

// GUARDRAIL #1: always succeed.
process.exit(0);
