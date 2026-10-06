// overlay-related — what the event overlay offers NEXT (Donald 7.10.26: the
// popup should "create curiosity and further engagement rather than
// delivering a piece of otherwise disconnected value"). Pure functions over
// the feed the page already holds (useFeed), so they cost no fetch and are
// pinned by scripts/selftest.mjs.
//
//   seriesNext(events, ev)  → the series' following dates ("Every Wed · next")
//   alsoComingUp(events, ev) → more of the same KIND (category), one per
//                              series, soonest first — never this event's own
//                              series (that's the line above)

import { categoryOf } from './event-category.js';

const t = (ev) => Date.parse(ev && ev.startsAt);

export function seriesNext(events, ev, n = 3) {
  if (!ev || !ev.seriesId) return [];
  const from = t(ev);
  return (events || [])
    .filter((x) => x && x.id !== ev.id && x.seriesId === ev.seriesId && t(x) > from)
    .sort((a, b) => t(a) - t(b))
    .slice(0, n);
}

export function alsoComingUp(events, ev, n = 3) {
  if (!ev) return [];
  const cat = categoryOf(ev);
  if (!cat || cat === 'other') return [];
  const seen = new Set();
  const out = [];
  const sorted = (events || [])
    .filter((x) => x && x.id !== ev.id && Number.isFinite(t(x)))
    .sort((a, b) => t(a) - t(b));
  for (const x of sorted) {
    if (ev.seriesId && x.seriesId === ev.seriesId) continue;
    if (categoryOf(x) !== cat) continue;
    const key = x.seriesId || x.id;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(x);
    if (out.length >= n) break;
  }
  return out;
}
