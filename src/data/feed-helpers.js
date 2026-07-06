// feed-helpers.js — pure, dependency-free helpers for consuming the Events Feed.
//
// These are kept separate from useFeed.js / the React components so they can be
// imported and unit-tested by scripts/selftest.mjs without a DOM or a test runner
// (Events Platform build plan §5.4 #9: no test framework — dependency-free .mjs).
//
// Đà Nẵng is UTC+7 year-round (no DST), so 'Asia/Ho_Chi_Minh' / +07:00 is safe to
// pin everywhere. The feed emits ISO strings already carrying +07:00, but we parse
// defensively via Intl so a Z-offset or a different machine TZ can't shift dates.

const ICT = 'Asia/Ho_Chi_Minh';
const WEEKDAY_NUM = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };

// weekdayFromISO(iso) → 1..7 (Mon=1 … Sun=7) for the instant, evaluated in ICT.
// Returns null for falsy/invalid input. Used to drive the today-first carousel order
// and is the midnight-boundary-sensitive function the self-test pins.
export function weekdayFromISO(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const abbr = new Intl.DateTimeFormat('en-US', { timeZone: ICT, weekday: 'short' }).format(d);
  return WEEKDAY_NUM[abbr] || null;
}

// Today's weekday (1..7, Mon=1) in ICT — "today" is where the events happen, so a
// local visitor and a traveller abroad see the same order.
export function vnToday(now = new Date()) {
  const abbr = new Intl.DateTimeFormat('en-US', { timeZone: ICT, weekday: 'short' }).format(now);
  return WEEKDAY_NUM[abbr] || 1;
}

// orderByDay(list) — stable sort so today's weekday leads and the week rolls forward
// (e.g. Tue → Wed → … → Mon). Items carry `day` (1..7); undated items fall to the end
// keeping their relative order. `now` is injectable for deterministic tests.
export function orderByDay(list, now = new Date()) {
  const today = vnToday(now);
  return list
    .map((e, i) => ({ e, i }))
    .sort((a, b) => {
      const ra = a.e.day ? (a.e.day - today + 7) % 7 : 99;
      const rb = b.e.day ? (b.e.day - today + 7) % 7 : 99;
      return ra - rb || a.i - b.i; // stable: preserve input order within a day
    })
    .map((x) => x.e);
}

// pickPoster(posters) — feed → poster4x5 → null. The carousel skips a card when null.
export function pickPoster(posters) {
  if (!posters) return null;
  return posters.feed || posters.poster4x5 || null;
}

// dedupeSeries(events) — collapse multiple instances of one recurring series
// (same non-null seriesId) to the soonest by startsAt; one-offs (seriesId == null)
// always pass through. Input order is otherwise preserved (first-seen wins, then
// replaced only by an earlier instance).
export function dedupeSeries(events) {
  const out = [];
  const seriesIndex = new Map(); // seriesId → index in `out`
  for (const ev of events) {
    const sid = ev.seriesId;
    if (sid == null) {
      out.push(ev);
      continue;
    }
    if (!seriesIndex.has(sid)) {
      seriesIndex.set(sid, out.length);
      out.push(ev);
    } else {
      const idx = seriesIndex.get(sid);
      const existing = out[idx];
      if (toMs(ev.startsAt) < toMs(existing.startsAt)) out[idx] = ev;
    }
  }
  return out;
}

function toMs(iso) {
  const t = iso ? new Date(iso).getTime() : NaN;
  return Number.isNaN(t) ? Infinity : t;
}

// fmtTime(iso) — 'HH:MM' (24h) in ICT. Returns '' for invalid input.
export function fmtTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: ICT, hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(d);
}

// dateKey(iso) — 'YYYY-MM-DD' in ICT, for grouping the agenda by day.
export function dateKey(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  // en-CA gives YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: ICT, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(d);
}

// fmtDayHeading(iso, lang) — a human day heading like "Sat, 28 Jun" (EN) for the
// agenda group header, rendered in ICT. lang is a LANGS code (data/languages.js);
// day headings localize fully even though event titles only exist in EN/VI.
const HEADING_LOCALES = {
  EN: 'en-GB', VN: 'vi-VN', RU: 'ru-RU', UK: 'uk-UA', KO: 'ko-KR', JA: 'ja-JP',
};
export function fmtDayHeading(iso, lang = 'EN') {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const locale = HEADING_LOCALES[lang] || 'en-GB';
  return new Intl.DateTimeFormat(locale, {
    timeZone: ICT, weekday: 'short', day: 'numeric', month: 'short',
  }).format(d);
}

// pickTitle / pickLocName — the feed only carries EN + VI content fields, so
// 'VN' → *_vi and every other language reads the EN field (deliberate: event
// titles/descriptions are authored bilingually; RU/UK/KO/JA get EN content
// with a localized UI around it).
export function pickTitle(ev, lang) {
  if (!ev) return '';
  return (lang === 'VN' ? ev.title_vi : ev.title_en) || ev.title_en || ev.title_vi || '';
}

export function pickDescription(ev, lang) {
  if (!ev) return '';
  return (lang === 'VN' ? ev.description_vi : ev.description_en) || ev.description_en || ev.description_vi || '';
}

export function pickLocName(loc, lang) {
  if (!loc) return '';
  return (lang === 'VN' ? loc.name_vi : loc.name_en) || loc.name_en || loc.name_vi || '';
}
