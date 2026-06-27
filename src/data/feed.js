// feed.js — the Events Feed contract endpoints consumed by this site.
//
// The Events Feed is published by the REALITY hub (app.realitydn.com) and is the
// single public source of truth for what's on at REALITY (see the Events Platform
// build plan, §5.2). This site is a pure read-only consumer: useFeed.js fetches
// events.json live (cross-origin, CORS-allowed) and falls back to the build-time
// snapshot at /feed-snapshot.json when the live fetch fails.
//
// FEED_BASE defaults to the production hub and can be overridden at build time
// with VITE_FEED_BASE (e.g. a preview deploy of the hub). This is the only
// import.meta.env use in the repo.
export const FEED_BASE = (
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_FEED_BASE) ||
  'https://app.realitydn.com'
).replace(/\/$/, '');

export const FEED_EVENTS_URL = `${FEED_BASE}/api/feed/v1/events.json`;

// RFC 5545 calendar (Asia/Ho_Chi_Minh) — offered as an "add to your calendar"
// link in the graceful error state, so visitors always have a way to subscribe.
export const FEED_ICS_URL = `${FEED_BASE}/api/feed/v1/events.ics`;
