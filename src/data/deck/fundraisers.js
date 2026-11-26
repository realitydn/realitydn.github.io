// fundraisers.js — the deck's "Charitable giving" card.
//
// LIVE SOURCE: the app's public fundraisers feed (same contract family as the
// events feed, CORS-allowed for realitydn.com; fields are only ever added):
//
//   { version, generatedAt, page, totalVnd, count,
//     fundraisers: [{ slug, url, title, title_vi, heldOn, recipient,
//                     recipient_vi, recipientUrl, amountVnd, handedOverOn,
//                     summary, summary_vi, eventUrl, image, hasReceipt }] }
//
// The card reads that feed twice: once when the site is BUILT (the
// `reality-fundraisers` plugin in vite.config.js, so the static HTML already
// carries the app's record) and once in the browser (hooks/useFundraisers.js,
// so a record changed since the last build still shows). The first of those
// that has rows wins; with neither, the card shows the STAND-INS below.
//
// STAND-INS — the three nights held so far, with the owner's own figures
// (26.11.26). They are exact, so nothing on the card is marked as rounded.
// They mirror the feed's row shape and its order (newest first), so the card
// reads the same whichever source it has. `null` means NOT KNOWN: the card
// prints a marked gap there instead of a guess. Do not fill a null, or a
// recipient's Vietnamese name, from memory: get it from the owner or the app.
// Only the first recipient's Vietnamese name is confirmed; the other two are
// printed in English in every language. `summary` is an English placeholder;
// `summary_vi` is finished.
import { FEED_BASE } from '../feed.js';

export const FUNDRAISERS_URL = `${FEED_BASE}/api/feed/v1/fundraisers.json`;

export const FUNDRAISER_STANDINS = [
  {
    title: 'Charaoke',
    title_vi: 'Charaoke',
    heldOn: '2026-09-17',
    recipient: 'Elderly Loving Home – 18 Phan Tứ',
    recipient_vi: null,
    amountVnd: 12277000,
    handedOverOn: null,
    summary: 'It became food, medicines, essential supplies and a personal gift for each of the 25 residents.',
    summary_vi: 'Số tiền đã thành thực phẩm, thuốc men, nhu yếu phẩm và một món quà riêng cho từng cụ trong số 25 cụ sống tại đó.',
  },
  {
    title: 'Charaoke',
    title_vi: 'Charaoke',
    heldOn: '2026-08-20',
    recipient: 'Đà Nẵng Oncology Hospital Charity Kitchen',
    recipient_vi: null,
    // 7.434.000₫ in the box on the night + 2.860.000₫ given afterwards
    amountVnd: 10294000,
    handedOverOn: null,
    summary: '7.434.000₫ in the box on the night and 2.860.000₫ given afterwards. It bought 700 kg of rice for the hospital.',
    summary_vi: '7.434.000₫ trong thùng quyên góp ngay tại đêm diễn và 2.860.000₫ được gửi thêm sau đó. Số tiền đã mua 700 kg gạo cho bệnh viện.',
  },
  {
    title: 'Flood Relief Benefit Party',
    title_vi: 'Tiệc gây quỹ cứu trợ lũ lụt',
    heldOn: '2025-11-15',
    recipient: 'Vietnam Fatherland Front Committee',
    recipient_vi: 'Ủy ban Mặt trận Tổ quốc Việt Nam',
    amountVnd: 50527833,
    handedOverOn: '2025-11-17',
    summary: null,
    summary_vi: null,
  },
];

const rowsOf = (doc) => (doc && Array.isArray(doc.fundraisers) ? doc.fundraisers.filter(Boolean) : []);
const newestFirst = (a, b) => String(b.heldOn || '').localeCompare(String(a.heldOn || ''));

// fundraisersView(doc, built) → what the card renders. `doc` is the feed as
// the browser just read it, `built` the feed as the build read it; the first
// with rows is used, else the stand-ins. Rows come out newest first whatever
// order they arrived in. Pure, so the self-test can pin the switch.
//   { live, rows, totalVnd, page }   page = the app's own list (feed only)
export function fundraisersView(doc, built = null) {
  const from = rowsOf(doc).length ? doc : rowsOf(built).length ? built : null;
  if (from) {
    const rows = rowsOf(from).slice().sort(newestFirst);
    const sum = rows.reduce((n, r) => n + (Number(r.amountVnd) || 0), 0);
    return {
      live: true,
      rows,
      totalVnd: Number(from.totalVnd) || sum,
      page: typeof from.page === 'string' ? from.page : null,
    };
  }
  return {
    live: false,
    rows: FUNDRAISER_STANDINS,
    totalVnd: FUNDRAISER_STANDINS.reduce((n, r) => n + r.amountVnd, 0),
    page: null,
  };
}

// A row's words in the page's language. The feed (and the stand-ins) carry
// English and Vietnamese only, so every other language reads the English.
export function rowText(row, field, lang = 'EN') {
  return (lang === 'VN' && row[`${field}_vi`]) || row[field] || '';
}

// House money: 45.000₫ — dot-grouped, ₫ after, no space.
export function vnd(n) {
  const v = Math.round(Number(n) || 0);
  return `${String(v).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}₫`;
}

// A big total on a small card: whole millions, rounded DOWN (never overstate):
// 73098833 → '73M₫'. Below a million it prints in full. The opened card prints
// every figure in full (vnd).
export function vndShort(n) {
  const v = Math.round(Number(n) || 0);
  return v >= 1000000 ? `${Math.floor(v / 1000000)}M₫` : vnd(v);
}
