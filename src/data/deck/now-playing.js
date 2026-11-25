// now-playing.js — what is playing in the bar, for the "What's happening" card.
// Everything about the fetch is in this one file.
//
// THE SLOT IS BUILT; THE SOURCE IS NOT (25.11.26). Nothing in the app reads
// what is playing in the bar yet, so there is no endpoint to ask. Until there
// is, NOW_PLAYING_URL is null: no request is made, and the slot is not on the
// page at all. There is no stand-in and no sample track.
//
// TO SWITCH IT ON, once the app serves the document below, set
//   export const NOW_PLAYING_URL = `${FEED_BASE}/api/feed/v1/now-playing.json`;
// Nothing else needs to change.
//
// THE DOCUMENT THE APP SHOULD SERVE (proposed; public, read-only, no secrets):
//
//   {
//     "version": 1,
//     "generatedAt": "2026-11-25T13:05:12Z",   // when the app last asked Spotify
//     "playing": true,                         // false when paused or stopped
//     "track": {                               // null when playing is false
//       "title": "Harvest Moon",
//       "artists": ["Neil Young"],
//       "album": "Harvest Moon",                              // optional
//       "url": "https://open.spotify.com/track/…",            // optional
//       "art": "https://i.scdn.co/image/…"                    // optional
//     }
//   }
//
//   Nothing playing:  { "version": 1, "generatedAt": "…", "playing": false, "track": null }
//
//   Headers: Access-Control-Allow-Origin for https://realitydn.com (and
//   http://localhost:5173 for development), like the events feed, and
//   Cache-Control: public, max-age=15.
//
// WHAT THE PAGE SHOWS, AND WHEN IT SHOWS NOTHING. A track is shown only when
// all of these hold; in every other case the slot is absent:
//   - the request answered 200 with JSON
//   - playing is exactly true, and the track has a title
//   - generatedAt is within FRESH_MS of this visitor's clock. If the app's
//     poller stalls, the last track must not sit on the page as "playing".
// The page asks again every POLL_MS while the tab is visible.
import { FEED_BASE } from '../feed.js';

export const NOW_PLAYING_URL = null;
// The address the app is asked to serve (see above).
export const NOW_PLAYING_PROPOSED = `${FEED_BASE}/api/feed/v1/now-playing.json`;

export const POLL_MS = 30 * 1000;
export const FRESH_MS = 3 * 60 * 1000;
const TIMEOUT_MS = 6000;

// DEVELOPMENT ONLY: `?nowplaying=<url>` points the slot at a test document,
// so it can be looked at before the app serves the real one. `import.meta.env.DEV`
// is the literal false in a production build, so this is not shipped.
function sourceUrl() {
  if (NOW_PLAYING_URL) return NOW_PLAYING_URL;
  const dev = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV;
  if (!dev || typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get('nowplaying') || null;
}

// nowPlayingView(document, now) → { title, artist, url } or null. Pure, so
// scripts/selftest.mjs can pin every "show nothing" case.
export function nowPlayingView(doc, now = Date.now()) {
  if (!doc || doc.playing !== true || !doc.track || typeof doc.track !== 'object') return null;
  const title = typeof doc.track.title === 'string' ? doc.track.title.trim() : '';
  if (!title) return null;
  const at = Date.parse(doc.generatedAt || '');
  if (Number.isNaN(at) || Math.abs(now - at) > FRESH_MS) return null;
  const artists = Array.isArray(doc.track.artists)
    ? doc.track.artists.filter((a) => typeof a === 'string' && a.trim()).map((a) => a.trim())
    : [];
  // Only ever link out to Spotify itself.
  const url = typeof doc.track.url === 'string' && /^https:\/\/open\.spotify\.com\//.test(doc.track.url)
    ? doc.track.url
    : null;
  return { title, artist: artists.join(', '), url };
}

// fetchNowPlaying() → the document, or null (no source, an error, not JSON).
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

// Is there anywhere to ask? (False today: see the top of this file.)
export const hasNowPlayingSource = () => !!sourceUrl();
