/**
 * selftest-schedule.mjs — dependency-free unit checks for the WP9 Schedule
 * Studio feed-mapping (buildDocFromFeed / ictHHMM / ictDate).
 *
 * No test runner is installed in any repo (Events Platform build plan §5.4 #9).
 * schedule-data.jsx is a browser <script> (not a module) and contains JSX
 * elsewhere, so we can't `import` it. Instead we extract ONLY the three pure
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

// Build a sandbox exposing the three functions. They reference LOCATIONS/suid/
// rangeDates via `typeof X!=='undefined'` guards, so an empty sandbox is fine —
// the tests pass `locations`/`makeId` explicitly.
const code =
  // date helpers the range-clamp depends on (extracted from the same file)
  extract('dToDate') + '\n' +
  extract('dToISO') + '\n' +
  extract('dAdd') + '\n' +
  extract('rangeDates') + '\n' +
  extract('ictHHMM') + '\n' +
  extract('ictDate') + '\n' +
  extract('buildDocFromFeed') + '\n' +
  'globalThis.__exports = { ictHHMM, ictDate, buildDocFromFeed };';
const ctx = {};
vm.createContext(ctx);
vm.runInContext(code, ctx);
const { ictHHMM, ictDate, buildDocFromFeed } = ctx.__exports;

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
eq('end ← endsAt HH:MM', quiz.end, '21:00');
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

if (failures.length) {
  console.error(`\nselftest-schedule: ${failures.length} FAILED, ${passed} passed`);
  process.exit(1);
}
console.log(`selftest-schedule: all ${passed} checks passed ✓`);
process.exit(0);
