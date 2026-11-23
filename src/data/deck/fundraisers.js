// fundraisers.js — the deck's "Charitable giving" card.
//
// LIVE SOURCE: the app's public fundraisers feed (same contract family as the
// events feed, CORS-allowed for realitydn.com):
//
//   { version, generatedAt, page, totalVnd, count,
//     fundraisers: [{ title, title_vi, heldOn, recipient, amountVnd,
//                     summary, url, image }] }
//
// On 23.11.26 that feed is published but EMPTY (count 0). Until the app has
// rows, the card shows the STAND-IN list below, and says nothing is live. The
// moment the feed returns one or more rows the card uses the feed and this
// list is ignored (hooks/useFundraisers.js) — no code change needed.
//
// STAND-INS — the three nights we know of, exactly as far as we know them.
// `null` means NOT KNOWN: the card prints a marked gap there instead of a
// guess. Do not fill a null from memory; get it from Donald or from the app.
// The two recipients are named in English only: we do not know the
// organisations' own Vietnamese names, so every language prints these.
//   amountVnd    the figure we were given
//   approx       'about'  → printed "≈"   (a rounded figure)
//                'atLeast'→ printed "+"   ("10M₫+": at least this much)
import { FEED_BASE } from '../feed.js';

export const FUNDRAISERS_URL = `${FEED_BASE}/api/feed/v1/fundraisers.json`;

export const FUNDRAISER_STANDINS = [
  {
    title: 'Hội An flood fundraiser',
    title_vi: 'Gây quỹ cho vùng lũ Hội An',
    heldOn: null, // GAP: the date
    recipient: null, // GAP: who it went to
    amountVnd: 52000000,
    approx: 'about',
  },
  {
    title: 'Charaoke',
    title_vi: 'Charaoke',
    heldOn: '2026-09-17',
    recipient: 'Elderly Loving Home',
    amountVnd: 10000000,
    approx: 'atLeast',
  },
  {
    title: 'Charaoke',
    title_vi: 'Charaoke',
    heldOn: '2026-08-20',
    recipient: 'Oncology Hospital Charity Kitchen',
    amountVnd: 10000000,
    approx: 'atLeast',
  },
];

// fundraisersView(doc) → what the card renders, from the feed document when it
// has rows, else from the stand-ins. Pure, so the self-test can pin the switch.
//   { live, rows, totalVnd, totalApprox, page }   page = the app's own list (feed only)
export function fundraisersView(doc) {
  const rows = doc && Array.isArray(doc.fundraisers) ? doc.fundraisers.filter(Boolean) : [];
  if (rows.length) {
    const sum = rows.reduce((n, r) => n + (Number(r.amountVnd) || 0), 0);
    return {
      live: true,
      rows,
      totalVnd: Number(doc.totalVnd) || sum,
      totalApprox: false,
      page: typeof doc.page === 'string' ? doc.page : null,
    };
  }
  return {
    live: false,
    rows: FUNDRAISER_STANDINS,
    totalVnd: FUNDRAISER_STANDINS.reduce((n, r) => n + r.amountVnd, 0),
    // every stand-in figure is rounded or a floor, so the total is "at least"
    totalApprox: true,
    page: null,
  };
}

// House money: 45.000₫ — dot-grouped, ₫ after, no space.
export function vnd(n) {
  const v = Math.round(Number(n) || 0);
  return `${String(v).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}₫`;
}

// A big total on a small card: whole millions, rounded DOWN (never overstate):
// 72400000 → '72M₫'. Below a million it prints in full.
export function vndShort(n) {
  const v = Math.round(Number(n) || 0);
  return v >= 1000000 ? `${Math.floor(v / 1000000)}M₫` : vnd(v);
}

// One row's amount, with the stand-ins' honesty marks.
export function amountLabel(row, short = true) {
  const base = short ? vndShort(row.amountVnd) : vnd(row.amountVnd);
  if (row.approx === 'about') return `≈${base}`;
  if (row.approx === 'atLeast') return `${base}+`;
  return base;
}
