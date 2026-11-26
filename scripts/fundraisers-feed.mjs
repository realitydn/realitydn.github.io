/**
 * fundraisers-feed.mjs — one build-time read of the app's fundraisers feed.
 *
 * Two readers: vite.config.js (the `reality-fundraisers` plugin, which hands
 * the record to the home page's "Charitable giving" card as
 * `virtual:fundraisers`) and scripts/build-seo-files.mjs (the Fundraisers
 * section of llms.txt and llms-full.txt).
 *
 * NEVER fails a build: a slow, failing, malformed or empty feed returns null,
 * and both readers then use the stand-in list in
 * src/data/deck/fundraisers.js. The timeout is short on purpose.
 */
const FEED_BASE = (process.env.VITE_FEED_BASE || 'https://app.realitydn.com').replace(/\/$/, '');
export const FUNDRAISERS_FEED_URL = `${FEED_BASE}/api/feed/v1/fundraisers.json`;
const TIMEOUT_MS = 4000;

// usableRecord(doc) → the part of the feed document the site uses, or null
// when it has no rows the card could print. `version` and `generatedAt` are
// left out so the same record always builds the same bundle.
export function usableRecord(doc) {
  if (!doc || typeof doc !== 'object' || !Array.isArray(doc.fundraisers)) return null;
  const rows = doc.fundraisers.filter(
    (r) => r && typeof r.title === 'string' && r.title.trim() && Number.isFinite(Number(r.amountVnd)),
  );
  if (!rows.length) return null;
  return {
    page: typeof doc.page === 'string' ? doc.page : null,
    totalVnd: Number(doc.totalVnd) || rows.reduce((n, r) => n + Number(r.amountVnd), 0),
    count: rows.length,
    fundraisers: rows,
  };
}

// readFundraisersFeed() → { record, note }. `record` is usableRecord's result
// (null = use the stand-ins); `note` is one line for the build log.
export async function readFundraisersFeed({ url = FUNDRAISERS_FEED_URL, timeoutMs = TIMEOUT_MS, fetchImpl = globalThis.fetch } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchImpl(url, { signal: controller.signal, headers: { Accept: 'application/json' } });
    if (!res.ok) return { record: null, note: `the feed answered HTTP ${res.status}` };
    const record = usableRecord(await res.json());
    return record
      ? { record, note: `${record.count} fundraiser(s) from the app's feed` }
      : { record: null, note: 'the feed has no fundraisers yet' };
  } catch (e) {
    const why = e && e.name === 'AbortError' ? `no answer in ${timeoutMs} ms` : (e && e.message) || String(e);
    return { record: null, note: `the feed could not be read (${why})` };
  } finally {
    clearTimeout(timer);
  }
}
