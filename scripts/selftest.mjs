/**
 * selftest.mjs — dependency-free unit checks for the Events Feed consumer.
 *
 * No test runner is installed in any repo (Events Platform build plan §5.4 #9);
 * we use a plain .mjs script with a tiny assert harness. Run with:
 *     node scripts/selftest.mjs
 * Exits 0 when all checks pass, 1 (with a summary) on any failure — suitable as a
 * pre-commit gate.
 *
 * Covers the WP7 acceptance #6 surface: weekdayFromISO (DST-free ICT + midnight
 * boundary), orderByDay (today-first wraparound), series de-dup (one card per
 * seriesId, soonest wins), and poster fallback (feed → poster4x5 → skip).
 */
import {
  weekdayFromISO,
  orderByDay,
  dedupeSeries,
  pickPoster,
  pickTitle,
  pickLocName,
  fmtTime,
  dateKey,
} from '../src/data/feed-helpers.js';

let passed = 0;
const failures = [];

function check(name, cond) {
  if (cond) {
    passed++;
  } else {
    failures.push(name);
    console.error(`  ✗ ${name}`);
  }
}
function eq(name, actual, expected) {
  check(`${name} (got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)})`, actual === expected);
}

// ── weekdayFromISO: DST-free ICT (UTC+7 year-round) ──────────────────────────
// 2026-06-28 is a Sunday. 19:00 +07:00 is comfortably Sunday in ICT.
eq('weekdayFromISO Sun 19:00 +07', weekdayFromISO('2026-06-28T19:00:00+07:00'), 7);
// 2026-06-29 is a Monday.
eq('weekdayFromISO Mon 10:00 +07', weekdayFromISO('2026-06-29T10:00:00+07:00'), 1);
// Midnight boundary: 2026-06-29T00:30+07:00 is still Monday in ICT, but as UTC it's
// 2026-06-28T17:30Z (Sunday). Evaluated in ICT it must read Monday (=1), proving we
// pin the venue TZ and don't leak the machine/UTC weekday.
eq('weekdayFromISO midnight-boundary ICT', weekdayFromISO('2026-06-29T00:30:00+07:00'), 1);
// Same wall instant expressed as a UTC Z string must yield the same ICT weekday.
eq('weekdayFromISO Z-equivalent', weekdayFromISO('2026-06-28T17:30:00Z'), 1);
// Invalid / empty inputs are tolerated.
eq('weekdayFromISO null', weekdayFromISO(null), null);
eq('weekdayFromISO garbage', weekdayFromISO('not-a-date'), null);

// ── orderByDay: today-first wraparound ───────────────────────────────────────
// Pretend "now" is a Wednesday (day 3). Days should sort Wed(3),Thu(4)...Tue(2),
// undated last.
const wed = new Date('2026-07-01T12:00:00+07:00'); // 2026-07-01 is a Wednesday
const ordered = orderByDay(
  [
    { id: 'mon', day: 1 },
    { id: 'thu', day: 4 },
    { id: 'wed', day: 3 },
    { id: 'tue', day: 2 },
    { id: 'undated', day: null },
  ],
  wed,
).map((x) => x.id);
eq('orderByDay leads with today (Wed)', ordered[0], 'wed');
eq('orderByDay then Thu', ordered[1], 'thu');
eq('orderByDay wraps to Mon before Tue', ordered.indexOf('mon') < ordered.indexOf('tue'), true);
eq('orderByDay undated last', ordered[ordered.length - 1], 'undated');

// Stable within a day: two items on the same day keep input order.
const stable = orderByDay(
  [
    { id: 'a', day: 3 },
    { id: 'b', day: 3 },
  ],
  wed,
).map((x) => x.id);
eq('orderByDay stable same-day order', JSON.stringify(stable), JSON.stringify(['a', 'b']));

// ── series de-dup: one card per seriesId, soonest wins ───────────────────────
const deduped = dedupeSeries([
  { id: 'q-week2', seriesId: 'ser_quiz', startsAt: '2026-07-08T19:00:00+07:00' },
  { id: 'q-week1', seriesId: 'ser_quiz', startsAt: '2026-07-01T19:00:00+07:00' }, // sooner
  { id: 'oneoff-a', seriesId: null, startsAt: '2026-07-02T18:00:00+07:00' },
  { id: 'oneoff-b', seriesId: null, startsAt: '2026-07-03T18:00:00+07:00' },
  { id: 'film-week1', seriesId: 'ser_film', startsAt: '2026-07-04T20:00:00+07:00' },
]);
eq('dedupe collapses series to 4 items', deduped.length, 4);
const quiz = deduped.find((e) => e.seriesId === 'ser_quiz');
eq('dedupe keeps soonest series instance', quiz && quiz.id, 'q-week1');
eq('dedupe keeps both one-offs', deduped.filter((e) => e.seriesId === null).length, 2);
eq('dedupe keeps distinct series', deduped.filter((e) => e.seriesId === 'ser_film').length, 1);

// ── poster fallback: feed → poster4x5 → null(skip) ───────────────────────────
eq('poster prefers feed', pickPoster({ feed: 'f.jpg', poster4x5: '4x5.jpg' }), 'f.jpg');
eq('poster falls back to 4x5', pickPoster({ feed: null, poster4x5: '4x5.jpg' }), '4x5.jpg');
eq('poster null when both absent', pickPoster({ feed: null, poster4x5: null }), null);
eq('poster null when posters missing', pickPoster(null), null);

// ── lang mapping: 'EN' | 'VN' (NOT en/vi) ────────────────────────────────────
const ev = { title_en: 'Pub Quiz', title_vi: 'Đêm Đố Vui' };
eq('pickTitle EN', pickTitle(ev, 'EN'), 'Pub Quiz');
eq('pickTitle VN → _vi', pickTitle(ev, 'VN'), 'Đêm Đố Vui');
eq('pickTitle VN falls back to EN when _vi absent', pickTitle({ title_en: 'Only EN' }, 'VN'), 'Only EN');
const loc = { name_en: 'Event Space', name_vi: 'Không gian sự kiện' };
eq('pickLocName VN → _vi', pickLocName(loc, 'VN'), 'Không gian sự kiện');

// ── time/date formatting in ICT ──────────────────────────────────────────────
eq('fmtTime 19:00 +07', fmtTime('2026-06-28T19:00:00+07:00'), '19:00');
eq('fmtTime crosses midnight Z→ICT', fmtTime('2026-06-28T17:30:00Z'), '00:30');
eq('dateKey ICT day', dateKey('2026-06-29T00:30:00+07:00'), '2026-06-29');

// ── summary ──────────────────────────────────────────────────────────────────
if (failures.length) {
  console.error(`\nselftest: ${failures.length} FAILED, ${passed} passed`);
  process.exit(1);
}
console.log(`selftest: all ${passed} checks passed ✓`);
process.exit(0);
