import { useEffect, useState } from 'react';
import { FEED_EVENTS_URL } from '../data/feed';

// useFeed — the single data source for Calendar.jsx and EventsSchema.jsx.
//
// Strategy:
//   1. On mount, fetch the live feed (cross-origin to app.realitydn.com, CORS-allowed),
//      windowed today-7d..today+60d.
//   2. On failure / timeout, fall back to the same-origin build-time snapshot at
//      /feed-snapshot.json (always present in dist/ — committed seed is the floor).
//      This same-origin file is what the Puppeteer prerender resolves, so the static
//      HTML is never blank.
//
// The load is shared at module level: the homepage mounts two consumers (Calendar +
// EventsSchema), and one network fetch serves both. A failed load clears the slot so
// a later mount retries instead of caching the error.
//
// Returns { events, venue, locations, loading, error, stale }. `events` are filtered
// defensively to status === 'published' and endsAt >= now (so a stale snapshot never
// shows finished events). `stale` is true when serving the snapshot (or the snapshot
// itself is marked stale).

const LIVE_TIMEOUT_MS = 6000;

function ymd(date) {
  return date.toISOString().slice(0, 10);
}

function liveUrl() {
  const now = new Date();
  const from = ymd(new Date(now.getTime() - 7 * 86400000));
  const to = ymd(new Date(now.getTime() + 60 * 86400000));
  return `${FEED_EVENTS_URL}?from=${from}&to=${to}`;
}

// Keep only published events that haven't ended yet. endsAt may be null (unknown
// end) — in that case fall back to startsAt so an event without an end time still
// shows on/after its start, and only drops once startsAt is clearly in the past.
function filterEvents(events, now = Date.now()) {
  if (!Array.isArray(events)) return [];
  // A small grace window so an event still shows briefly after it ends.
  const cutoff = now - 3 * 3600 * 1000;
  return events.filter((ev) => {
    if (!ev || ev.status !== 'published') return false;
    const end = ev.endsAt ? Date.parse(ev.endsAt) : ev.startsAt ? Date.parse(ev.startsAt) : NaN;
    if (Number.isNaN(end)) return true; // no usable time → keep (defensive)
    return end >= cutoff;
  });
}

async function fetchFeedDoc() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LIVE_TIMEOUT_MS);
  let liveError = null;
  try {
    const res = await fetch(liveUrl(), {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`feed HTTP ${res.status}`);
    const doc = await res.json();
    if (!doc || !Array.isArray(doc.events)) throw new Error('feed missing events[]');
    return { doc, stale: false };
  } catch (err) {
    liveError = err;
  } finally {
    clearTimeout(timer);
  }
  try {
    const res = await fetch('/feed-snapshot.json', { cache: 'no-cache' });
    if (!res.ok) throw new Error(`snapshot HTTP ${res.status}`);
    const doc = await res.json();
    return { doc, stale: true };
  } catch (snapErr) {
    throw liveError || snapErr;
  }
}

let sharedLoad = null;
function loadFeed() {
  if (!sharedLoad) {
    sharedLoad = fetchFeedDoc();
    sharedLoad.catch(() => {
      sharedLoad = null;
    });
  }
  return sharedLoad;
}

export default function useFeed() {
  const [state, setState] = useState({
    events: [],
    venue: null,
    locations: [],
    loading: true,
    error: null,
    stale: false,
  });

  useEffect(() => {
    let cancelled = false;

    loadFeed()
      .then(({ doc, stale }) => {
        if (cancelled) return;
        setState({
          events: filterEvents(doc.events),
          venue: doc.venue || null,
          locations: Array.isArray(doc.locations) ? doc.locations : [],
          loading: false,
          error: null,
          stale: stale || doc.stale === true,
        });
      })
      .catch((error) => {
        if (cancelled) return;
        setState((s) => ({
          ...s,
          loading: false,
          error,
          stale: true,
        }));
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}

// Exported for the self-test (no DOM needed).
export { filterEvents };
