// event-audit.js — the figures on the deck's "Events we've held" card.
//
// NOT LIVE. The app has no public stats endpoint yet, so every number here is
// copied by hand from this repo's own Event Audit page, public/event-report/,
// and the page says so: the card prints AUDIT.asOf next to the count. When the
// report is regenerated, update this file to match it — or, once the app
// publishes a stats endpoint, replace this file with a fetch and drop the
// "as of".
//
// Where each figure comes from in public/event-report/index.html:
//   total, from, to, weeks, series, running, oneOffs
//                 "All time": the headline block and its six chips
//   mostRun       "All time": the first seven rows of "The roster"
//   trend30       "All time", "The line": events in each trailing thirty days,
//                 read off the chart every 14 days back from `to` (so ±1 on any
//                 point); the peak and its date are printed in the report's legend
//   last90        the last three months, as three thirty-day counts that do
//                 not overlap, newest first. Each is a point of "The line":
//                 the trailing-30-day count on `to`, 30 days before it and 60
//                 days before it. (The chart's points land on whole numbers:
//                 147.0, 137.0, 130.0. The middle one is also printed in the
//                 "Last 30 days" view, as "vs previous 30 days · 137 events".)
//   perWeek90     THE RUNNING THREE-MONTH AVERAGE: the sum of last90 (414
//                 events in the 90 days to `to`) ÷ the weeks in 90 days
//                 (90 / 7) = 32.2. scripts/selftest.mjs checks the sum.
//                 The full-span average the card used to print (1601 events
//                 over 70.7 weeks = 22.6 a week) counted the quiet first
//                 months as much as last month; it is no longer shown here.
//   debuted30     "Last 30 days", "Movement on the roster": the rows under
//                 "Debuted" (series on the calendar for the first time)
//
// The count by day of the week is no longer on the home page (24.11.26). The
// audit page keeps the days: "The week, as a grid" there places every event
// by day and time of day.
export const AUDIT = {
  asOf: '2026-10-03',
  from: '2025-05-26',
  to: '2026-10-03',
  total: 1601,
  weeks: 70.7,
  series: 259,
  running: 45,
  oneOffs: 140,
  last90: [147, 137, 130],
  perWeek90: 32.2,
  debuted30: 18,
  mostRun: [
    { name: 'Monday Board Games', runs: 70 },
    { name: 'Chess Club', runs: 63 },
    { name: 'Film Club', runs: 61 },
    { name: 'Coffee + Conversation', runs: 60 },
    { name: 'Create in Community', runs: 59 },
    { name: 'Pub Quiz', runs: 55 },
    { name: 'Karaoke', runs: 53 },
  ],
  trend30: [
    32, 46, 55, 59, 54, 58, 68, 68, 73, 79, 83, 87, 83, 77, 81, 92, 117, 104,
    97, 117, 126, 128, 127, 131, 129, 128, 116, 120, 132, 132, 138, 139, 143, 147,
  ],
  trendStepDays: 14,
  trendPeak: { value: 147, on: '2026-10-02' },
};

// 'YYYY-MM-DD' → house d.m.yy, no leading zeros ('2026-10-03' → '3.10.26').
export function dmy(ymd) {
  const [y, m, d] = String(ymd || '').split('-').map(Number);
  if (!y || !m || !d) return '';
  return `${d}.${m}.${String(y).slice(2)}`;
}
