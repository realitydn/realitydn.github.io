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
//
// INLINE SEED — window.__FEED__ (a11y/UX pass 23.09.26). main.jsx uses createRoot,
// so the prerendered calendar is thrown away and re-rendered from state; with the
// old `loading: true` start that meant prerendered rows → skeleton → rows (the
// skeleton for up to the 6s live timeout). If the page carries an inline seed, the
// FIRST render already has the events, the skeleton never shows, and the live
// fetch below just refreshes them in place. Contract for whoever injects it
// (prerender.mjs):
//
//   window.__FEED__ = {
//     version, generatedAt,          // passthrough, informational
//     venue,                         // same object as the snapshot's venue
//     locations: [...],              // same as the snapshot's locations
//     events: [...],                 // SAME event objects as feed-snapshot.json /
//                                    // events.json, trimmed to the calendar window:
//                                    // published, endsAt >= build time - 3h,
//                                    // startsAt <= build time + 21d
//                                    // (descriptions + unused fields
//                                    // stripped; the live fetch refills)
//   };
//
// i.e. the snapshot document, trimmed. It must be a plain JSON literal assigned in
// an inline <script> BEFORE the module bundle (JSON.stringify with "<" escaped as
// \u003c so a title can't close the script tag). Absent or malformed → the old
// behaviour (loading skeleton until the fetch settles).
//
// OVERNIGHT TABS: a tab left open (hidden) for more than 15 minutes refetches when
// it becomes visible again, so a phone unlocked the next morning doesn't show last
// night's events. The refetch never flips back to the skeleton.

const LIVE_TIMEOUT_MS = 6000;
const REFRESH_AFTER_HIDDEN_MS = 15 * 60 * 1000;

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
let hiddenAt = null;
function loadFeed() {
  if (!sharedLoad) {
    sharedLoad = fetchFeedDoc();
    sharedLoad.catch(() => {
      sharedLoad = null;
    });
  }
  return sharedLoad;
}

// Hidden long enough to be worth a refetch? Resets the shared slot once, so
// both consumers (Calendar + EventsSchema) share the one new request.
function refreshIfStale() {
  if (hiddenAt === null) return;
  const away = Date.now() - hiddenAt;
  hiddenAt = null;
  if (away >= REFRESH_AFTER_HIDDEN_MS) sharedLoad = null;
}

function toState(doc, stale) {
  return {
    events: filterEvents(doc.events),
    venue: doc.venue || null,
    locations: Array.isArray(doc.locations) ? doc.locations : [],
    loading: false,
    error: null,
    stale: stale || doc.stale === true,
  };
}

// First render: the inline seed when the page carries one (see the contract
// above), else the loading state.
function initialState() {
  const seed = typeof window !== 'undefined' ? window.__FEED__ : null;
  if (seed && Array.isArray(seed.events)) return toState(seed, true);
  return {
    events: [],
    venue: null,
    locations: [],
    loading: true,
    error: null,
    stale: false,
  };
}

export default function useFeed() {
  const [state, setState] = useState(initialState);

  useEffect(() => {
    let cancelled = false;

    const apply = (load) =>
      load
        .then(({ doc, stale }) => {
          if (cancelled) return;
          setState(toState(doc, stale));
        })
        .catch((error) => {
          if (cancelled) return;
          // Keep whatever is showing (seed or an earlier load) — an error only
          // replaces an EMPTY calendar with the error state.
          setState((s) => ({
            ...s,
            loading: false,
            error,
            stale: true,
          }));
        });

    apply(loadFeed());

    const onVisibility = () => {
      if (document.hidden) {
        if (hiddenAt === null) hiddenAt = Date.now();
        return;
      }
      // The first consumer to wake resets the shared slot (if it was away long
      // enough); every consumer then re-reads the shared load — the new request,
      // or the cached doc re-filtered against the current time, so events that
      // ended while the tab slept drop out either way.
      refreshIfStale();
      apply(loadFeed());
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return state;
}

// Exported for the self-test (no DOM needed).
export { filterEvents };
