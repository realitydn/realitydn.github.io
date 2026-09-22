/**
 * selftest-schedule.mjs — dependency-free unit checks for the Schedule Studio
 * data layer: the WP9 feed mapping (buildDocFromFeed / ictHHMM / ictDate, weekly
 * inference, the night rollover), the App→Schedule merge (series-keyed
 * presentation, tombstones, dedupe), and the pure editing helpers (Replace,
 * Clone, delete/restore, venue-time "today", autosave failure, and the
 * IndexedDB + localStorage coexistence: newer-wins adoption, both-writes).
 *
 * No test runner is installed in any repo (Events Platform build plan §5.4 #9).
 * schedule-data.jsx is a browser <script> (not a module) and contains JSX
 * elsewhere, so we can't `import` it. Instead we extract ONLY the pure
 * functions' source by name and eval them in a sandbox — this tests the EXACT
 * shipped code with zero duplication. Run with:
 *     node scripts/selftest-schedule.mjs
 * Exits 0 when all checks pass, 1 on any failure.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const src = fs.readFileSync(path.join(__dirname, '..', 'public', 'schedule', 'schedule-data.jsx'), 'utf8');

// Pull each `function NAME(...){ ... }` body out by brace-matching from its start.
function extract(name) {
  const start = src.indexOf('function ' + name + '(');
  if (start < 0) throw new Error('could not find function ' + name);
  let i = src.indexOf('{', start);
  let depth = 0;
  for (; i < src.length; i++) {
    const c = src[i];
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) { i++; break; } }
  }
  return src.slice(start, i);
}

// Build a sandbox exposing the pure functions. They reference LOCATIONS/suid/
// rangeDates via `typeof X!=='undefined'` guards or take them as options, so a
// near-empty sandbox is fine — the tests pass `locations`/`makeId` explicitly.
const FNS = [
  // date helpers the range-clamp / weekly projection depend on
  'dToDate', 'dToISO', 'dAdd', 'dWeekday', 'rangeDates', 'todayIso', 'thisMonday', 'nextMonday',
  'timeKey', 'eventsOn',
  'ictHHMM', 'ictDate', 'feedWindow', 'buildDocFromFeed', 'feedPrefKey', 'mergeFeedIntoDoc', 'applyFeedToDoc',
  'deleteEventFromDoc', 'restoreFeedEvent', 'clearRangeOccurrences', 'cloneToNextPeriod', 'storeDoc',
  'pickNewerDoc', 'writeBothDocs',
];
const code =
  // consts the extracted functions read (mirrors schedule-data.jsx)
  'const NIGHT_ROLLOVER_H = 6;\n' +
  "const SCH_LS = 'reality-schedule-doc-v2';\n" +
  "let _sid = 1; function suid(){ return 'sid' + (_sid++); }\n" +
  FNS.map(extract).join('\n') + '\n' +
  'globalThis.__exports = { ' + FNS.join(', ') + ' };';
const ctx = {};
vm.createContext(ctx);
vm.runInContext(code, ctx);
const X = ctx.__exports;
const { ictHHMM, ictDate, buildDocFromFeed, mergeFeedIntoDoc } = X;

let passed = 0;
const failures = [];
function check(name, cond) { if (cond) passed++; else { failures.push(name); console.error('  ✗ ' + name); } }
function eq(name, actual, expected) {
  check(`${name} (got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)})`, actual === expected);
}

const LOCATIONS = [
  { code: '1L', label: '1st-Floor Lounge' },
  { code: '2L', label: '2nd-Floor Lounge' },
  { code: '2E', label: 'Event Space' },
  { code: '3P', label: '3rd-Floor Patio' },
];

// ── ictHHMM / ictDate: pin +07:00 (Đà Nẵng has no DST) ───────────────────────
eq('ictHHMM reads +07:00 wall time', ictHHMM('2026-07-01T19:00:00+07:00'), '19:00');
eq('ictDate reads +07:00 date', ictDate('2026-07-01T19:00:00+07:00'), '2026-07-01');
// 2026-07-01T00:30+07:00 == 2026-06-30T17:30Z. As ICT it's still 00:30 on Jul 1.
eq('ictHHMM Z→ICT crosses midnight', ictHHMM('2026-06-30T17:30:00Z'), '00:30');
eq('ictDate Z→ICT crosses midnight', ictDate('2026-06-30T17:30:00Z'), '2026-07-01');
eq('ictHHMM null', ictHHMM(null), null);
eq('ictDate garbage', ictDate('nope'), null);

// ── buildDocFromFeed: sample events.json → blankEvent rows ───────────────────
let n = 0;
const stub = () => 'evX' + (++n);
const feed = {
  version: 1,
  events: [
    {
      id: 'evt_quiz', seriesId: 'ser_quiz',
      title_en: 'Pub Quiz Night', title_vi: 'Đêm đố vui',
      startsAt: '2026-07-01T19:00:00+07:00', endsAt: '2026-07-01T21:00:00+07:00',
      location: { code: '2E', name_en: 'Event Space' }, tags: ['quiz', 'weekly'],
    },
    {
      id: 'evt_film', seriesId: null,
      title_en: 'Film Club', title_vi: 'CLB Phim',
      startsAt: '2026-07-02T18:30:00+07:00', endsAt: null,
      location: { code: '3P', name_en: 'Patio' }, tags: ['film'],
    },
    {
      id: 'evt_noloc', seriesId: null,
      title_en: 'Mystery Event', startsAt: '2026-07-03T20:00:00+07:00',
      location: null, tags: [],
    },
  ],
};
const built = buildDocFromFeed(feed, { locations: LOCATIONS, makeId: stub });
eq('maps all 3 events', built.events.length, 3);
eq('no mapping errors', built.errors.length, 0);

const quiz = built.events[0];
eq('title ← title_en', quiz.title, 'Pub Quiz Night');
eq('start ← startsAt HH:MM (+07:00)', quiz.start, '19:00');
eq('end NOT synced from the app (endsAt ignored)', quiz.end, null);
eq('location ← [mapped code]', JSON.stringify(quiz.locations), JSON.stringify(['2E']));
eq('repeat weekly from tag/seriesId', quiz.repeat, 'weekly');
eq('feed id stamped into notionId', quiz.notionId, 'evt_quiz');
eq('id from makeId stub', quiz.id, 'evX1');
// blankEvent-shaped: required keys present with the right defaults
eq('flags default', JSON.stringify(quiz.flags), JSON.stringify({ prereg: false, fee: false }));
eq('emphasis default', quiz.emphasis, 'none');
eq('exceptions default', JSON.stringify(quiz.exceptions), JSON.stringify([]));

const film = built.events[1];
eq('end null when endsAt null', film.end, null);
eq('repeat null for one-off non-weekly', film.repeat, null);
eq('3P maps through', JSON.stringify(film.locations), JSON.stringify(['3P']));

const noloc = built.events[2];
eq('no location → empty locations', JSON.stringify(noloc.locations), JSON.stringify([]));
eq('start defaults preserved (20:00)', noloc.start, '20:00');

// Accepts a bare array too (not just the wrapped doc).
const fromArray = buildDocFromFeed(feed.events, { locations: LOCATIONS, makeId: () => 'z' });
eq('accepts bare events array', fromArray.events.length, 3);

// Unmappable date → recorded as an error, not a crash.
const bad = buildDocFromFeed({ events: [{ id: 'x', title_en: 'No date', startsAt: null }] }, { locations: LOCATIONS });
eq('missing start date → 0 events', bad.events.length, 0);
eq('missing start date → 1 error', bad.errors.length, 1);

// range clamp: an event outside the range is dropped.
const ranged = buildDocFromFeed(feed, { locations: LOCATIONS, makeId: () => 'r', range: { start: '2026-07-01', days: 1 } });
eq('range clamp keeps only in-range', ranged.events.length, 1);

// flags + emphasis map from the feed's tags ($ = fee, * = prereg, featured = banner),
// and $ ALSO auto-sets from a non-blank `cost` field (no tag needed).
const tagged = buildDocFromFeed({ events: [
  { id: 't1', title_en: 'Paid Workshop', startsAt: '2026-07-04T15:00:00+07:00', endsAt: null, location: { code: '2E' }, tags: ['fee', 'prereg'] },
  { id: 't2', title_en: 'Featured Party', startsAt: '2026-07-05T20:00:00+07:00', endsAt: null, location: { code: '2E' }, tags: ['featured'] },
  { id: 't3', title_en: 'Plain', startsAt: '2026-07-06T10:00:00+07:00', endsAt: null, location: { code: '2E' }, tags: [] },
  // the Modern Jive case: a non-blank cost but NO fee tag → still $ (auto)
  { id: 't4', title_en: 'Priced Class', startsAt: '2026-07-07T19:30:00+07:00', endsAt: null, location: { code: '3P' }, tags: [], cost: '100k' },
  // whitespace-only / null cost is treated as free → no $
  { id: 't5', title_en: 'Blank Cost', startsAt: '2026-07-08T19:30:00+07:00', endsAt: null, location: { code: '3P' }, tags: [], cost: '   ' },
  { id: 't6', title_en: 'Null Cost', startsAt: '2026-07-09T19:30:00+07:00', endsAt: null, location: { code: '3P' }, tags: [], cost: null },
] }, { locations: LOCATIONS, makeId: () => 'tg' }).events;
eq('fee tag → flags.fee', tagged[0].flags.fee, true);
eq('prereg tag → flags.prereg', tagged[0].flags.prereg, true);
eq('featured tag → emphasis banner', tagged[1].emphasis, 'banner');
eq('no tags/cost → flags both false', JSON.stringify(tagged[2].flags), JSON.stringify({ prereg: false, fee: false }));
eq('no featured → emphasis none', tagged[2].emphasis, 'none');
eq('non-blank cost → flags.fee (no tag needed)', tagged[3].flags.fee, true);
eq('non-blank cost does not set prereg', tagged[3].flags.prereg, false);
eq('whitespace-only cost → flags.fee false', tagged[4].flags.fee, false);
eq('null cost → flags.fee false', tagged[5].flags.fee, false);

// ── mergeFeedIntoDoc: idempotent App→Schedule sync (the auto-pull-on-open) ────
const existing = [
  // a previously-synced feed row the user dressed up — presentation MUST survive
  { id: 'a', notionId: 'f1', date: '2026-07-01', start: '18:00', end: null, title: 'Old', locations: ['2E'],
    flags: {}, emphasis: 'banner', hide: ['print'], repeat: null, repeatUntil: '2026-08-01', exceptions: [], titleShort: 'O' },
  // a synced row that has VANISHED from the feed (cancelled/out of range) → drops
  { id: 'b', notionId: 'gone', date: '2026-07-04', start: '10:00', end: null, title: 'Cancelled', locations: [],
    flags: {}, emphasis: 'none', hide: [], repeat: null, repeatUntil: null, exceptions: [] },
  // a purely-local row (no notionId) → always kept
  { id: 'c', notionId: null, date: '2026-07-02', start: '12:00', end: null, title: 'Local', locations: [],
    flags: {}, emphasis: 'none', hide: [], repeat: null, repeatUntil: null, exceptions: [] },
];
const freshRows = [
  { id: 'x', notionId: 'f1', date: '2026-07-01', start: '18:30', end: null, title: 'New Title', locations: ['3P'],
    flags: {}, emphasis: 'none', hide: [], repeat: null, repeatUntil: null, exceptions: [] },     // updates f1
  { id: 'y', notionId: 'f2', date: '2026-07-03', start: '20:00', end: null, title: 'Brand New', locations: ['1L'],
    flags: {}, emphasis: 'none', hide: [], repeat: null, repeatUntil: null, exceptions: [] },     // new
  // two weekly instances of the SAME series → must collapse to one (no projection stacking)
  { id: 'w1', notionId: 'wk1', date: '2026-07-01', start: '19:00', end: null, title: 'Quiz', locations: ['2E'],
    flags: {}, emphasis: 'none', hide: [], repeat: 'weekly', repeatUntil: null, exceptions: [] },
  { id: 'w2', notionId: 'wk2', date: '2026-07-08', start: '19:00', end: null, title: 'Quiz', locations: ['2E'],
    flags: {}, emphasis: 'none', hide: [], repeat: 'weekly', repeatUntil: null, exceptions: [] },
];
const m = mergeFeedIntoDoc(existing, freshRows);
eq('merge: added (f2 + 1 collapsed weekly)', m.added, 2);
eq('merge: updated (f1)', m.updated, 1);
eq('merge: removed (gone dropped)', m.removed, 1);
check('merge: changed', m.changed === true);
check('merge: gone row dropped', !m.events.some(e => e.notionId === 'gone'));
check('merge: local-only row kept', m.events.some(e => e.notionId == null && e.title === 'Local'));
check('merge: weekly collapsed to one', m.events.filter(e => e.title === 'Quiz').length === 1);
const f1 = m.events.find(e => e.notionId === 'f1');
eq('merge: core updated from feed (title)', f1.title, 'New Title');
eq('merge: core updated from feed (start)', f1.start, '18:30');
eq('merge: core updated from feed (locations)', JSON.stringify(f1.locations), JSON.stringify(['3P']));
eq('merge: preserves titleShort', f1.titleShort, 'O');
eq('merge: preserves hide', JSON.stringify(f1.hide), JSON.stringify(['print']));
eq('merge: preserves user emphasis', f1.emphasis, 'banner');
eq('merge: preserves repeatUntil cap', f1.repeatUntil, '2026-08-01');
// empty feed never wipes (the caller guards, and a no-change re-run reports changed=false)
const stable = mergeFeedIntoDoc(m.events, freshRows);
check('merge: re-run is a no-op (idempotent)', stable.changed === false);

// dedupe: a purely-local row that DUPLICATES a feed event (date+start+title) is dropped
const dupExisting = [
  { id: 'L', notionId: null, date: '2026-07-01', start: '19:00', end: null, title: 'Pub Quiz', locations: ['2E'], flags: {}, emphasis: 'none', hide: [], repeat: null, repeatUntil: null, exceptions: [] },
  { id: 'K', notionId: null, date: '2026-07-01', start: '12:00', end: null, title: 'Only Local', locations: [], flags: {}, emphasis: 'none', hide: [], repeat: null, repeatUntil: null, exceptions: [] },
];
const dupFresh = [
  { id: 'F', notionId: 'pq', date: '2026-07-01', start: '19:00', end: null, title: 'pub quiz', locations: ['2E'], flags: {}, emphasis: 'none', hide: [], repeat: null, repeatUntil: null, exceptions: [] },
];
const dd = mergeFeedIntoDoc(dupExisting, dupFresh);
eq('dedupe: 1 local duplicate dropped (case-insensitive)', dd.dedup, 1);
check('dedupe: feed copy kept (notionId pq)', dd.events.some(e => e.notionId === 'pq'));
check('dedupe: local dup gone', !dd.events.some(e => e.title === 'Pub Quiz' && e.notionId == null));
check('dedupe: unrelated local kept', dd.events.some(e => e.title === 'Only Local'));
check('dedupe: changed=true', dd.changed === true);

// end is user-owned: a hand-set end (incl. 'late') survives a re-sync whose rows carry end:null
const endExisting = [{ id: 'e1', notionId: 'hh', date: '2026-07-01', start: '17:00', end: '21:00', title: 'Happy Hour', locations: [], flags: {}, emphasis: 'none', hide: [], repeat: null, repeatUntil: null, exceptions: [] }];
const endFresh = [{ id: 'e2', notionId: 'hh', date: '2026-07-01', start: '17:00', end: null, title: 'Happy Hour', locations: [], flags: {}, emphasis: 'none', hide: [], repeat: null, repeatUntil: null, exceptions: [] }];
const em = mergeFeedIntoDoc(endExisting, endFresh);
eq('merge: hand-set end preserved', em.events.find(e => e.notionId === 'hh').end, '21:00');
check('merge: end preservation is not an update', em.updated === 0 && em.changed === false);

// sig includes flags: a feed-side $/* change on a matched row registers as an update
const flagExisting = [{ id: 'g', notionId: 'fe', date: '2026-07-01', start: '19:00', end: null, title: 'X', locations: ['2E'], flags: { fee: false, prereg: false }, emphasis: 'none', hide: [], repeat: null, repeatUntil: null, exceptions: [] }];
const flagFresh = [{ id: 'h', notionId: 'fe', date: '2026-07-01', start: '19:00', end: null, title: 'X', locations: ['2E'], flags: { fee: true, prereg: false }, emphasis: 'none', hide: [], repeat: null, repeatUntil: null, exceptions: [] }];
const fm = mergeFeedIntoDoc(flagExisting, flagFresh);
eq('flag-only change counts as an update', fm.updated, 1);
check('flag-only change applies fee', fm.events.find(e => e.notionId === 'fe').flags.fee === true);

// ── weekly is INFERRED from the series recurring, not from having a seriesId ──
// (live feed 23.09.26: 86/94 instances carry a seriesId, none is tagged weekly,
// and five series had a single instance in three weeks)
const wk = (id, sid, start, title, extra) => Object.assign({ id, seriesId: sid, title_en: title, startsAt: start,
  location: { code: '2E' }, tags: [], status: 'published' }, extra || {});
const inferFeed = { events: [
  wk('q1', 'sQuiz', '2026-09-27T20:00:00+07:00', 'REALITY Pub Quiz'),
  wk('q2', 'sQuiz', '2026-10-04T20:00:00+07:00', 'REALITY Pub Quiz'),
  wk('q3', 'sQuiz', '2026-10-11T20:00:00+07:00', 'REALITY Pub Quiz'),
  wk('o1', 'sOnce', '2026-09-25T16:00:00+07:00', 'Create in Community'),      // a series with ONE instance
  wk('s1', 'sSkip', '2026-09-26T15:00:00+07:00', 'BECOMING YOU'),             // skips next week, back in two
  wk('s2', 'sSkip', '2026-10-10T15:00:00+07:00', 'BECOMING YOU'),
  wk('m1', 'sMove', '2026-09-24T19:00:00+07:00', 'Moved'),                    // next week at a different time
  wk('m2', 'sMove', '2026-10-01T20:00:00+07:00', 'Moved'),
  wk('d1', 'sDraft', '2026-09-23T19:00:00+07:00', 'Draft Thing', { status: 'draft' }),
  wk('c1', 'sCan', '2026-09-23T19:30:00+07:00', 'Cancelled Thing', { status: 'cancelled' }),
] };
const week = { start: '2026-09-21', days: 7 };
const inf = buildDocFromFeed(inferFeed, { locations: LOCATIONS, makeId: () => 'i', range: week }).events;
const byT = t => inf.filter(e => e.title === t);
eq('infer: series back next week at the same time → weekly', byT('REALITY Pub Quiz')[0].repeat, 'weekly');
eq('infer: only the in-range instance becomes a row', byT('REALITY Pub Quiz').length, 1);
eq('infer: a seriesId with ONE instance → one-off', byT('Create in Community')[0].repeat, null);
eq('infer: a series that skips next week → one-off', byT('BECOMING YOU')[0].repeat, null);
eq('infer: next week at a different time → one-off', byT('Moved')[0].repeat, null);
eq('infer: seriesId carried onto the row', byT('REALITY Pub Quiz')[0].seriesId, 'sQuiz');
eq('status: only published instances map', inf.filter(e => /Draft|Cancelled/.test(e.title)).length, 0);
// a 10-day range holding two instances: the first is a one-off, the second
// carries the projection — no day ever shows the series twice
const long = buildDocFromFeed(inferFeed, { locations: LOCATIONS, makeId: () => 'L', range: { start: '2026-09-27', days: 10 } }).events;
const lq = long.filter(e => e.title === 'REALITY Pub Quiz');
eq('long range: both in-range instances are rows', lq.length, 2);
eq('long range: first instance is a one-off', lq.find(e => e.date === '2026-09-27').repeat, null);
eq('long range: last instance carries weekly', lq.find(e => e.date === '2026-10-04').repeat, 'weekly');
eq('long range: 04.10 shows the quiz once', X.eventsOn({ events: lq }, '2026-10-04').length, 1);
eq('long range: 11.10 still projects it', X.eventsOn({ events: lq }, '2026-10-11').length, 1);
eq('feedWindow: range + two weeks (+1 night)', JSON.stringify(X.feedWindow(week)), JSON.stringify({ from: '2026-09-21', to: '2026-10-12' }));
// the feed's full `locations` list wins over the single `location`
const multi = buildDocFromFeed({ events: [{ id: 'bg', seriesId: null, title_en: 'Board Game Night', startsAt: '2026-09-21T19:00:00+07:00',
  location: { code: '1L' }, locations: [{ code: '1L' }, { code: '2L' }, { code: '2E' }, { code: '3P' }, { code: null }], tags: [] }] },
  { locations: LOCATIONS, makeId: () => 'b' }).events[0];
eq('locations: every floor from the feed list', JSON.stringify(multi.locations), JSON.stringify(['1L', '2L', '2E', '3P']));

// ── the venue night: after-midnight starts belong to the night before ─────────
const late = buildDocFromFeed({ events: [
  { id: 'ad', title_en: 'AFTER DARK', startsAt: '2026-10-10T21:00:00+07:00', location: { code: '2E' }, tags: [] },
  { id: 'ap', title_en: 'After-party', startsAt: '2026-10-11T00:30:00+07:00', location: { code: '2E' }, tags: [] },
] }, { locations: LOCATIONS, makeId: () => 'n' }).events;
eq('rollover: 00:30 Sunday is filed under Saturday night', late.find(e => e.title === 'After-party').date, '2026-10-10');
eq('rollover: the start stays the wall time', late.find(e => e.title === 'After-party').start, '00:30');
const night = X.eventsOn({ events: [
  { id: 'a', date: '2026-10-10', start: '00:30', title: 'After-party', hide: [] },
  { id: 'b', date: '2026-10-10', start: '21:00', title: 'AFTER DARK', hide: [] },
  { id: 'c', date: '2026-10-10', start: '11:00', title: 'Brunch', hide: [] },
] }, '2026-10-10').map(e => e.title).join(' > ');
eq('rollover: 00:30 sorts after the late evening', night, 'Brunch > AFTER DARK > After-party');
check('timeKey: 05:59 after 23:00, 06:00 before 07:00', X.timeKey('05:59') > X.timeKey('23:00') && X.timeKey('06:00') < X.timeKey('07:00'));

// ── "today" is the venue's date, whatever the laptop's clock says ─────────────
const t0 = Date.UTC(2026, 8, 20, 18, 30);   // Sun 20.9 18:30Z = Mon 21.9 01:30 in Đà Nẵng
eq('todayIso is the ICT date', X.todayIso(t0), '2026-09-21');
eq('thisMonday in the small hours of an ICT Monday', X.thisMonday(t0), '2026-09-21');
eq('thisMonday from a Sunday', X.thisMonday(Date.UTC(2026, 8, 27, 10)), '2026-09-21');
eq('nextMonday', X.nextMonday(t0), '2026-09-28');

// ── presentation persists across weeks by SERIES (feed ids are per occurrence) ──
let rid = 0;
const row = o => Object.assign({ id: 'r' + (++rid), end: null, titleShort: null, locations: ['2E'], flags: { fee: false, prereg: false },
  emphasis: 'none', hide: [], repeat: 'weekly', repeatUntil: null, exceptions: [] }, o);
const wk1 = [row({ notionId: 'occ-1', seriesId: 'sQ', date: '2026-09-27', start: '20:00', title: 'REALITY Pub Quiz',
  titleShort: 'Pub Quiz', emphasis: 'bold', hide: ['print'], end: '22:30' })];
const wk2fresh = [row({ notionId: 'occ-2', seriesId: 'sQ', date: '2026-10-04', start: '20:00', title: 'REALITY Pub Quiz' })];
const nav = mergeFeedIntoDoc(wk1, wk2fresh, { prefs: {} });
const q2 = nav.events.find(e => e.notionId === 'occ-2');
eq('series: short title follows to next week', q2.titleShort, 'Pub Quiz');
eq('series: emphasis follows', q2.emphasis, 'bold');
eq('series: hidden channels follow', JSON.stringify(q2.hide), JSON.stringify(['print']));
eq('series: hand-set end follows', q2.end, '22:30');
eq('series: one row, not two', nav.events.length, 1);
eq('series: next week is an update, not an add', nav.added, 0);
check('series: prefs keyed by series', !!nav.prefs['s:sQ']);
// the title changes (Film Club's film) → the old shortening must NOT land on it
const film1 = [row({ notionId: 'f-1', seriesId: 'sF', date: '2026-09-25', start: '18:30', title: 'Film Club: Roma (2018)', titleShort: 'Film: Roma', emphasis: 'bold' })];
const film2 = [row({ notionId: 'f-2', seriesId: 'sF', date: '2026-10-02', start: '18:30', title: 'Film Club: Perfect Days' })];
const fm2 = mergeFeedIntoDoc(film1, film2, { prefs: {} }).events[0];
eq('series: short title dropped when the title changes', fm2.titleShort, null);
eq('series: emphasis still follows a retitled week', fm2.emphasis, 'bold');
// a one-off keeps its styling after navigating away and back (prefs memory)
const one = [row({ notionId: 'ws', seriesId: null, repeat: null, date: '2026-09-24', start: '11:30', title: 'Mobile Photography Workshop', titleShort: 'Photo Workshop' })];
const away = mergeFeedIntoDoc(one, [row({ notionId: 'other', seriesId: null, repeat: null, date: '2026-10-01', start: '19:00', title: 'Other' })], { prefs: {} });
check('one-off: row leaves with its week', !away.events.some(e => e.notionId === 'ws'));
const back = mergeFeedIntoDoc(away.events, [row({ notionId: 'ws', seriesId: null, repeat: null, date: '2026-09-24', start: '11:30', title: 'Mobile Photography Workshop' })], { prefs: away.prefs });
eq('one-off: short title back after navigating away and back', back.events[0].titleShort, 'Photo Workshop');
// clearing a presentation choice clears the memory too
const cleared = mergeFeedIntoDoc([Object.assign({}, q2, { titleShort: null })], wk2fresh, { prefs: nav.prefs });
eq('series: a cleared short title stays cleared', cleared.events[0].titleShort, null);

// ── tombstones: a deleted synced event stays deleted ─────────────────────────
const tdoc = { events: [q2,
  row({ id: 'loc', notionId: null, seriesId: null, repeat: null, date: '2026-10-05', start: '12:00', title: 'Local' }),
  row({ id: 'one', notionId: 'occ-x', seriesId: 'sX', repeat: null, date: '2026-10-06', start: '17:00', title: 'Workshop' })],
  feedDeleted: [], feedPrefs: {} };
const td1 = X.deleteEventFromDoc(tdoc, q2.id);
eq('tombstone: a weekly series is tombstoned by series', td1.feedDeleted[0].key, 's:sQ');
const td2 = X.deleteEventFromDoc(td1, 'one');
eq('tombstone: a one-off by its occurrence', td2.feedDeleted[1].key, 'e:occ-x');
const td3 = X.deleteEventFromDoc(td2, 'loc');
eq('tombstone: local rows need none', td3.feedDeleted.length, 2);
const again = X.applyFeedToDoc(td3, [...wk2fresh, row({ notionId: 'occ-x', seriesId: 'sX', repeat: null, date: '2026-10-06', start: '17:00', title: 'Workshop' })]);
eq('tombstone: the next pull does not bring them back', again.doc.events.length, 0);
eq('tombstone: hidden count', again.res.hidden, 2);
const restored = X.applyFeedToDoc(X.restoreFeedEvent(td3, 's:sQ'), wk2fresh);
eq('tombstone: restore lets the series back in', restored.doc.events.length, 1);

// ── the Import dialog's feed pull IS the merge: pressing it twice adds nothing ──
const base = { events: [row({ id: 'L1', notionId: null, seriesId: null, repeat: null, date: '2026-09-22', start: '12:00', title: 'Hand-made' })], feedPrefs: {}, feedDeleted: [] };
const p1 = X.applyFeedToDoc(base, inf).doc;
const p2 = X.applyFeedToDoc(p1, inf);
eq('import twice: the second press changes nothing', p2.res.changed, false);
eq('import twice: row count stable', p2.doc.events.length, p1.events.length);

// ── Replace clears the range without duplicating weekly series ──────────────
const localWeekly = row({ id: 'LW', notionId: null, seriesId: null, repeat: 'weekly', date: '2026-09-06', start: '20:00', title: 'Quiz Night (old)' });
const localOne = row({ id: 'LO', notionId: null, seriesId: null, repeat: null, date: '2026-09-23', start: '13:00', title: 'Typed in' });
const cleared2 = X.clearRangeOccurrences([localWeekly, localOne], week, true);
check('replace: in-range one-off cleared', !cleared2.some(e => e.id === 'LO'));
const lw = cleared2.find(e => e.id === 'LW');
check('replace: weekly series kept (it owns other weeks)', !!lw);
eq('replace: its in-range date becomes a skipped week', JSON.stringify(lw.exceptions), JSON.stringify(['2026-09-27']));
eq('replace: the series still shows the week after', X.eventsOn({ events: cleared2 }, '2026-10-04').length, 1);
const afterReplace = mergeFeedIntoDoc(cleared2, inf).events;
eq('replace: 27.9 shows one quiz, not two', X.eventsOn({ events: afterReplace }, '2026-09-27').filter(e => /quiz/i.test(e.title)).length, 1);
// a hand-made weekly series that duplicates a synced one goes — the synced copy wins
const dupWeekly = row({ id: 'DW', notionId: null, seriesId: null, repeat: 'weekly', date: '2026-09-06', start: '20:00', title: 'REALITY Pub Quiz' });
const dm2 = mergeFeedIntoDoc([dupWeekly], inf);
check('dedupe: local weekly duplicate of a synced series dropped', !dm2.events.some(e => e.id === 'DW'));
eq('dedupe: counted', dm2.dedup, 1);

// ── Clone → next week skips synced one-offs (they'd be ghosts) ──────────────
const cdoc = { range: week, splits: [], days: {}, events: [
  row({ id: 'c1', notionId: 'occ-a', seriesId: 'sA', repeat: null, date: '2026-09-24', start: '11:30', title: 'Synced one-off' }),
  row({ id: 'c2', notionId: null, seriesId: null, repeat: null, date: '2026-09-24', start: '13:00', title: 'Typed one-off' }),
  row({ id: 'c3', notionId: 'occ-q', seriesId: 'sQ', repeat: 'weekly', date: '2026-09-27', start: '20:00', title: 'Quiz' }),
] };
const cl = X.cloneToNextPeriod(cdoc);
eq('clone: range moves a week', cl.range.start, '2026-09-28');
check('clone: synced one-off not cloned', !cl.events.some(e => e.title === 'Synced one-off'));
eq('clone: typed one-off shifts', cl.events.find(e => e.title === 'Typed one-off').date, '2026-10-01');
check('clone: weekly master stays put', cl.events.some(e => e.id === 'c3' && e.date === '2026-09-27'));

// ── an autosave that fails says so (storage shared with Poster + Print) ──────
ctx.localStorage = { setItem() { const e = new Error('quota'); e.name = 'QuotaExceededError'; throw e; } };
eq('storeDoc: full storage → false', X.storeDoc({ events: [] }), false);
ctx.localStorage = { setItem() {} };
eq('storeDoc: a normal write → true', X.storeDoc({ events: [] }), true);

// ── storage coexistence: IndexedDB + the localStorage copy (23.09.26) ────────
// Load adopts whichever copy has the newer savedAt; a tie goes to IndexedDB.
{
  const { pickNewerDoc, writeBothDocs } = X;
  const d = (savedAt, tag) => ({ events: [], savedAt, tag });
  eq('adopt: nothing stored → null', pickNewerDoc(null, null).doc, null);
  eq('adopt: localStorage only (a doc from the old code) → ls', pickNewerDoc(null, d(5, 'L')).from, 'ls');
  eq('adopt: IndexedDB only → idb', pickNewerDoc(d(5, 'I'), null).from, 'idb');
  eq('adopt: an old tab wrote a newer localStorage copy → ls', pickNewerDoc(d(5, 'I'), d(9, 'L')).doc.tag, 'L');
  eq('adopt: IndexedDB newer → idb', pickNewerDoc(d(9, 'I'), d(5, 'L')).doc.tag, 'I');
  eq('adopt: same savedAt (both-writes) → idb', pickNewerDoc(d(7, 'I'), d(7, 'L')).from, 'idb');
  eq('adopt: a copy without savedAt loses to one with it', pickNewerDoc({ events: [], tag: 'I' }, d(1, 'L')).from, 'ls');
  eq('adopt: savedAt as a string still compares as a number', pickNewerDoc(d('20', 'I'), d(3, 'L')).from, 'idb');
  eq('adopt: a record without events is not a doc', pickNewerDoc({ savedAt: 99 }, d(1, 'L')).from, 'ls');
  eq('adopt: junk in localStorage is ignored', pickNewerDoc(d(1, 'I'), 'garbage').from, 'idb');

  // Every save writes BOTH copies — the localStorage one first, synchronously —
  // and counts as saved when either landed.
  const run = async () => {
    const calls = [];
    const doc = d(42, 'X');
    const lsOk = (x) => { calls.push(['ls', x.savedAt]); return true; };
    const lsFull = (x) => { calls.push(['ls', x.savedAt]); return false; };
    const lsThrows = () => { throw new Error('boom'); };
    const idbOk = (x) => { calls.push(['idb', x.savedAt]); return Promise.resolve(); };
    const idbFail = (x) => { calls.push(['idb', x.savedAt]); return Promise.reject(new Error('QuotaExceededError')); };
    const idbThrows = () => { throw new Error('no indexedDB'); };
    let r = await writeBothDocs(doc, lsOk, idbOk);
    eq('both-writes: both copies written', JSON.stringify(calls), JSON.stringify([['ls', 42], ['idb', 42]]));
    check('both-writes: ok when both land', r.ok && r.ls && r.idb);
    r = await writeBothDocs(doc, lsFull, idbOk);
    check('both-writes: localStorage full, IndexedDB took it → saved', r.ok && !r.ls && r.idb);
    r = await writeBothDocs(doc, lsOk, idbFail);
    check('both-writes: IndexedDB refused, localStorage took it → saved', r.ok && r.ls && !r.idb);
    r = await writeBothDocs(doc, lsFull, idbFail);
    check('both-writes: neither landed → NOT SAVED', !r.ok && !r.ls && !r.idb);
    r = await writeBothDocs(doc, lsThrows, idbThrows);
    check('both-writes: writers that throw are failures, not crashes', !r.ok);
    // the round trip the coexistence relies on: what a save wrote, the next load adopts
    let lsBox = null, idbBox = null;
    await writeBothDocs(d(100, 'new'), (x) => { lsBox = JSON.parse(JSON.stringify(x)); return true; },
      (x) => { idbBox = JSON.parse(JSON.stringify(x)); return Promise.resolve(); });
    eq('round trip: after a save both copies agree', pickNewerDoc(idbBox, lsBox).doc.tag, 'new');
    lsBox = d(200, 'old-tab');   // a tab still on the old code saves later, to localStorage only
    eq('round trip: the old tab’s later edit wins the next load', pickNewerDoc(idbBox, lsBox).doc.tag, 'old-tab');
  };
  await run();
}

if (failures.length) {
  console.error(`\nselftest-schedule: ${failures.length} FAILED, ${passed} passed`);
  process.exit(1);
}
console.log(`selftest-schedule: all ${passed} checks passed ✓`);
process.exit(0);
