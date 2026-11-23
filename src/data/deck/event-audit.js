// event-audit.js — the figures on the deck's "Events we've held" card.
//
// NOT LIVE. The app has no public stats endpoint yet, so every number here is
// copied by hand from this repo's own Event Audit page, public/event-report/
// (the "All time" view), and the page says so: the card prints AUDIT.asOf next
// to the count. When the report is regenerated, update this file to match it
// — or, once the app publishes a stats endpoint, replace this file with a
// fetch and drop the "as of".
//
// Where each figure comes from in public/event-report/index.html:
//   total, from, to, weeks, series, perWeek, running, oneOffs
//                 the headline block and its six chips
//   mostRun       the first seven rows of "The roster"
//   byWeekday     the four rows of "The week, as a grid", summed per day
//                 (they add up to `total`)
//   trend30       "The line": events in each trailing thirty days, read off
//                 the chart every 14 days back from `to` (so ±1 on any point);
//                 the peak and its date are printed in the report's legend
export const AUDIT = {
  asOf: '2026-10-03',
  from: '2025-05-26',
  to: '2026-10-03',
  total: 1601,
  weeks: 70.7,
  perWeek: 22.6,
  series: 259,
  running: 45,
  oneOffs: 140,
  mostRun: [
    { name: 'Monday Board Games', runs: 70 },
    { name: 'Chess Club', runs: 63 },
    { name: 'Film Club', runs: 61 },
    { name: 'Coffee + Conversation', runs: 60 },
    { name: 'Create in Community', runs: 59 },
    { name: 'Pub Quiz', runs: 55 },
    { name: 'Karaoke', runs: 53 },
  ],
  // Mon … Sun
  byWeekday: [122, 260, 220, 273, 264, 277, 185],
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

