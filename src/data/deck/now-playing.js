// now-playing.js — the song playing in the bar, for the "What's happening"
// card. Everything about the feed is in this one file; the line itself and
// when it asks are in components/deck/NowPlaying.jsx.
//
// THE FEED (live since 26.11.26) is the REALITY app's, public and read-only:
//
//   { "version": 1,
//     "generatedAt": "2026-11-26T00:03:26+07:00",   // when the app last looked
//     "playing": true,
//     "track": { "title": "A New Kind Of Love - Demo",
//                "artists": ["Frou Frou", "Imogen Heap", "Guy Sigsworth"] } }
//
//   Nothing to show:  { …, "playing": false, "track": null }
//
// The page shows the TITLE AND THE ARTISTS, and nothing else: no link, no
// logo, and no word about where the music comes from (Donald, 26.11.26). The
// feed gives no link either.
//
// WHEN THE LINE IS NOT ON THE PAGE. A song is shown only when all of these
// hold; in every other case there is no line at all (no stand-in, no "nothing
// playing"):
//   - the request answered 200 with JSON
//   - playing is exactly true, and the track has a title
//   - generatedAt is within FRESH_MS (3 minutes) of this visitor's clock. If
//     the app stops looking, its last song must not sit on the page as
//     "playing". generatedAt carries an offset ("+07:00"), so it is read as a
//     full ISO time, never as a local one.
// It is never in the static HTML.
//
// HOW OFTEN: every POLL_MS (30 s) while the card is on screen and the tab is
// visible; not at all otherwise. The feed itself is cached for 15 s.
import { FEED_BASE } from '../feed.js';

export const NOW_PLAYING_URL = `${FEED_BASE}/api/feed/v1/now-playing.json`;

export const POLL_MS = 30 * 1000;
export const FRESH_MS = 3 * 60 * 1000;
const TIMEOUT_MS = 6000;

// DEVELOPMENT ONLY: `?nowplaying=<url>` points the line at a test document
// (a long title, many artists, a stale time). `import.meta.env.DEV` is the
// literal false in a production build, so this is not shipped.
function sourceUrl() {
  const dev = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV;
  if (dev && typeof window !== 'undefined') {
    const test = new URLSearchParams(window.location.search).get('nowplaying');
    if (test) return test;
  }
  return NOW_PLAYING_URL;
}

// nowPlayingView(document, now) → { title, artist } or null. Pure, so
// scripts/selftest.mjs can pin every "show nothing" case.
export function nowPlayingView(doc, now = Date.now()) {
  if (!doc || doc.playing !== true || !doc.track || typeof doc.track !== 'object') return null;
  const title = typeof doc.track.title === 'string' ? doc.track.title.trim() : '';
  if (!title) return null;
  const at = typeof doc.generatedAt === 'string' ? Date.parse(doc.generatedAt) : NaN;
  if (Number.isNaN(at) || Math.abs(now - at) > FRESH_MS) return null;
  const artists = Array.isArray(doc.track.artists)
    ? doc.track.artists.filter((a) => typeof a === 'string' && a.trim()).map((a) => a.trim())
    : [];
  return { title, artist: artists.join(', ') };
}

// fetchNowPlaying() → the document, or null (an error, a timeout, not JSON).
export async function fetchNowPlaying() {
  const url = sourceUrl();
  if (!url) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json' }, cache: 'no-store' });
    return res.ok ? await res.json() : null;
  } catch (e) {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
