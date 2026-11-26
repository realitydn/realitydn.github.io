// event-stats.js — reading the weekly event report's figures for the deck's
// "Events we've held" card. Pure and dependency-free (scripts/selftest.mjs
// imports it in plain Node); the home page gets the result through
// ./event-audit.js.
//
// THE DATA is public/event-report/stats.json. scripts/event-report/build.py
// rebuilds it every week from the calendar, with the Event Audit pages beside
// it, and pushes it to main. Its contract is in
// scripts/event-report/README.md ("stats.json"): fields are only ever added,
// never renamed or removed.
//
// SNAPSHOT is what the home page shows when that file is not there to read
// (this branch can reach main before the report's own build does), or is
// unreadable, or is OLDER than the snapshot. It is one week's stats.json, cut
// down to the fields the card uses: the build of 24.11.26. It is the only
// hand-kept copy of these figures in the site. Nothing needs to update it:
// once stats.json is on main the snapshot is never shown again.
const DAY = 86400000;
const ymdAfter = (ymd, days) => new Date(Date.parse(`${ymd}T00:00:00Z`) + days * DAY).toISOString().slice(0, 10);
// the trailing-30-day counts, one every `stepDays`, as stats.json lists them
const points = (first, stepDays, counts) => counts.map((events, i) => ({ date: ymdAfter(first, i * stepDays), events }));

export const SNAPSHOT = {
  version: 1,
  asOf: '2026-11-24',
  openedOn: '2025-05-26',
  totals: { events: 1853, series: 296, seriesRepeated: 134, oneOffs: 162, weeks: 78.1 },
  last90: [151, 144, 141],
  perWeek90: 33.9,
  seriesRunning: 42,
  debuted30: 18,
  mostRun: [
    { name: 'Monday Board Game Night', runs: 78 },
    { name: 'Chess Night', runs: 71 },
    { name: 'Film Club', runs: 68 },
    { name: 'Coffee + Conversation', runs: 67 },
    { name: 'REALITY Pub Quiz', runs: 63 },
    { name: 'Create in Community', runs: 59 },
    { name: 'Karaoke!', runs: 57 },
  ],
  growth: {
    span: 30,
    stepDays: 14,
    points: points('2025-06-24', 14, [
      25, 41, 56, 58, 55, 57, 62, 70, 74, 75, 82, 84, 81, 81, 79, 83, 108, 115, 99,
      98, 123, 125, 126, 128, 123, 121, 130, 120, 115, 130, 131, 135, 139, 139, 139, 144, 142, 151,
    ]),
    peak: { events: 151, on: '2026-11-24' },
  },
};

const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s));
const isCount = (n) => Number.isFinite(n) && n >= 0;

// Does this look like a stats.json the card can be drawn from? Every field
// the card reads has to be there and be the right kind of thing; anything
// extra is ignored (the report may add fields).
export function usable(stats) {
  if (!stats || typeof stats !== 'object') return false;
  const t = stats.totals;
  const g = stats.growth;
  return Boolean(
    isDate(stats.asOf) && isDate(stats.openedOn)
    && t && isCount(t.events) && t.events > 0 && isCount(t.series) && isCount(t.oneOffs) && isCount(t.weeks)
    && Array.isArray(stats.last90) && stats.last90.length === 3 && stats.last90.every(isCount)
    && isCount(stats.perWeek90) && isCount(stats.seriesRunning) && isCount(stats.debuted30)
    && Array.isArray(stats.mostRun) && stats.mostRun.length > 0
    && stats.mostRun.every((m) => m && typeof m.name === 'string' && m.name && isCount(m.runs))
    && g && isCount(g.stepDays) && g.stepDays > 0
    && Array.isArray(g.points) && g.points.length >= 2 && g.points.every((p) => p && isDate(p.date) && isCount(p.events))
    && g.peak && isCount(g.peak.events) && isDate(g.peak.on)
  );
}

// The file when it can be used and is not older than the snapshot; otherwise
// the snapshot. (The count of events held never goes backwards.)
export function chooseStats(file, snapshot = SNAPSHOT) {
  return usable(file) && file.asOf >= snapshot.asOf ? file : snapshot;
}

// stats.json → the names the card and the section use.
//   total        totals.events          every event since the doors opened
//   from, to     openedOn, asOf         the period counted
//   weeks        totals.weeks
//   series       totals.series          different series, one-offs included
//   oneOffs      totals.oneOffs         of those, the ones that ran only once
//   running      seriesRunning          the regulars: active, and at least monthly
//   last90       last90                 three thirty-day counts, newest first
//   perWeek90    perWeek90              events a week over the last 90 days
//   debuted30    debuted30              series whose first night was in the last 30 days
//   mostRun      mostRun                [{ name, runs }], names as the app has them
//   trend30      growth.points[].events the trailing-30-day count, oldest first
//   trendDates   growth.points[].date   the day each of those counts ends on
//   trendStepDays growth.stepDays
//   trendPeak    growth.peak            { value, on }
export function auditFrom(stats) {
  return {
    asOf: stats.asOf,
    from: stats.openedOn,
    to: stats.asOf,
    total: stats.totals.events,
    weeks: stats.totals.weeks,
    series: stats.totals.series,
    running: stats.seriesRunning,
    oneOffs: stats.totals.oneOffs,
    last90: stats.last90.slice(),
    perWeek90: stats.perWeek90,
    debuted30: stats.debuted30,
    mostRun: stats.mostRun.map((m) => ({ name: m.name, runs: m.runs })),
    trend30: stats.growth.points.map((p) => p.events),
    trendDates: stats.growth.points.map((p) => p.date),
    trendStepDays: stats.growth.stepDays,
    trendPeak: { value: stats.growth.peak.events, on: stats.growth.peak.on },
  };
}

// 'YYYY-MM-DD' → house d.m.yy, no leading zeros ('2026-10-03' → '3.10.26').
export function dmy(ymd) {
  const [y, m, d] = String(ymd || '').split('-').map(Number);
  if (!y || !m || !d) return '';
  return `${d}.${m}.${String(y).slice(2)}`;
}
