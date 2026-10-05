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
  fmtDayHeading,
} from '../src/data/feed-helpers.js';
import {
  dayClassFromISO,
  fmtDM,
  fmtDayDate,
  splitFeedSite,
  cfStr,
  costLabel,
  dmParts,
  whenKey,
  catLabel,
  ticketLabel,
  isTodayICT,
  nextDealToday,
  weekdayName,
  weeklyIds,
} from '../src/data/cal-feed.js';
import { eventCategory, categoryOf, isNeutralCategory, isDealEvent, normalizeCategory } from '../src/data/event-category.js';

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

// ── cal-feed: the feed-widget helpers (day colours, d.m labels, split) ───────
// 2026-06-28 is a Sunday; d.m with NO leading zeros is house style (30.9.26 —
// never month-first, never zero-padded).
eq('dayClassFromISO Sunday', dayClassFromISO('2026-06-28T19:00:00+07:00'), 'd-sun');
// Midnight boundary: Sunday 17:30Z = Monday 00:30 ICT → Monday's green, not Sunday's.
eq('dayClassFromISO midnight-boundary ICT', dayClassFromISO('2026-06-28T17:30:00Z'), 'd-mon');
eq('dayClassFromISO garbage → default', dayClassFromISO('not-a-date'), 'd-thu');
eq('fmtDM d.m unpadded', fmtDM('2026-07-07T20:00:00+07:00'), '7.7');
eq('fmtDM two-digit day', fmtDM('2026-09-30T20:00:00+07:00'), '30.9');
eq('fmtDM two-digit month', fmtDM('2026-10-12T20:00:00+07:00'), '12.10');
// Midnight boundary: 30.6 17:30Z is 1.7 00:30 in ICT — the ICT date, unpadded.
eq('fmtDM midnight-boundary ICT', fmtDM('2026-06-30T17:30:00Z'), '1.7');
eq('fmtDM garbage → empty', fmtDM('not-a-date'), '');
eq('fmtDayDate EN', fmtDayDate('2026-07-07T20:00:00+07:00', 'EN'), 'TUE 7.7');
eq('fmtDayDate VN numeric weekday', fmtDayDate('2026-07-07T20:00:00+07:00', 'VN'), 'Thứ 3 7.7');
eq('fmtDayHeading EN house d.m', fmtDayHeading('2026-06-28T19:00:00+07:00', 'EN'), 'Sun 28.6');
eq('fmtDayHeading unpadded', fmtDayHeading('2026-07-02T19:00:00+07:00', 'EN'), 'Thu 2.7');
// splitFeedSite: with "now" = Wed 2026-07-01 noon ICT, Wed+Thu are soon, Friday
// is later, and soon leads with the next-to-start regardless of input order.
const wedNoon = Date.parse('2026-07-01T12:00:00+07:00');
const split = splitFeedSite(
  [
    { id: 'fri', startsAt: '2026-07-03T19:00:00+07:00' },
    { id: 'thu', startsAt: '2026-07-02T19:00:00+07:00' },
    { id: 'wed', startsAt: '2026-07-01T19:00:00+07:00' },
    { id: 'undated', startsAt: null },
  ],
  wedNoon,
);
eq('splitFeedSite soon = today+tomorrow', split.soon.map((e) => e.id).join(','), 'wed,thu');
eq('splitFeedSite later sorted, undated last', split.later.map((e) => e.id).join(','), 'fri,undated');
// costLabel: a priced event prints its price; cost:null is a free event.
eq('costLabel priced', costLabel({ cost: '100k' }, 'EN'), '100k');
eq('costLabel free EN', costLabel({ cost: null }, 'EN'), 'Free');
eq('costLabel free VN', costLabel({ cost: null }, 'VN'), 'Miễn phí');
eq('cfStr unknown lang falls back to EN', cfStr('DE').upNext, 'Up next');

// ── Night v2 "Cream Tickets": event category — six groups (6.10.26) ────────
// Derived from the EN title (src/data/event-category.js — a port of the hub's
// rule table; the pins below are real series names), unless the feed carries
// a category. social (Games + Social) red · arts (Arts, Film, Music) blue ·
// language (Talk Events) pink · wellness amber · tech/other neutral.
for (const [title, want] of [
  ['REALITY Pub Quiz', 'social'],
  ['Karaoke!', 'arts'],
  ['Happy Hour: Buy 1 Get 1 Cocktails', 'social'],
  ['Philosophy Café', 'language'],
  ['Teen Hangout', 'social'],
  ['Film Club', 'arts'],
  ['AI & Us: Understanding Our Changing World', 'tech'],
  ['Awareness Itself: Intro to Nondual Meditation', 'wellness'],
  ['Storyteller: Learn how great stories are built from the inside out', 'arts'],
  ['Farewell Party for Mai', 'social'],
  ['Weekly Creative Workshop', 'arts'],
  ['BODY DOUBLING: STOP PROCRASTINATING, START TOGETHER', 'wellness'],
  ['Blood on the Clocktower', 'social'],
  ['PowerPoint Karaoke', 'social'],
  ['Hitster: The Music Party Game', 'social'],
  ['No Mic Open Mic: Rooftop Acoustic Jam', 'arts'],
  ['Modern Jive Dancing for Beginners', 'arts'],
  ['Mid-Autumn Festival', 'social'],
  ['Charaoke - Singing to Support the Elderly Loving Home', 'arts'],
  ['ALBUM LISTENING PARTY: DOM VENICE', 'arts'],
  ['Hadestown Proshot Watch Party', 'arts'],
  ['Coffee + Conversation', 'language'],
]) eq(`eventCategory "${title}"`, eventCategory(title), want);
eq('eventCategory empty → other', eventCategory('', ''), 'other');
eq('eventCategory folds accents (nhậu → party → social)', eventCategory('Nhậu Night'), 'social');
eq('categoryOf reads the EN title', categoryOf({ title_en: 'REALITY Pub Quiz', title_vi: 'Đố vui REALITY' }), 'social');
eq('categoryOf prefers a feed category', categoryOf({ category: 'language', title_en: 'Film Club' }), 'language');
eq('categoryOf takes the new keys from the feed', categoryOf({ category: 'wellness', title_en: 'Karaoke!' }), 'wellness');
eq('categoryOf folds an older feed key (music → arts)', categoryOf({ category: 'music', title_en: 'Chess Night' }), 'arts');
eq('categoryOf folds drinks → social', categoryOf({ category: 'drinks', title_en: 'x' }), 'social');
eq('categoryOf ignores an unknown feed category', categoryOf({ category: 'sport', title_en: 'Karaoke!' }), 'arts');
eq('normalizeCategory junk → null', normalizeCategory('Games'), null);
check('tech + other are neutral, arts + language are not',
  isNeutralCategory('tech') && isNeutralCategory('other')
  && !isNeutralCategory('arts') && !isNeutralCategory('language'));
check('isDealEvent: a Happy Hour is a deal, a quiz is not',
  isDealEvent({ title_en: 'Happy Hour: Buy 1 Get 1 Cocktails' }) && !isDealEvent({ title_en: 'REALITY Pub Quiz' }));
eq("catLabel EN (Donald's names, pluses)", catLabel('social', 'EN'), 'Games + Social');
eq('catLabel EN arts', catLabel('arts', 'EN'), 'Arts, Film, Music');
eq('catLabel EN language', catLabel('language', 'EN'), 'Talk Events');
eq('catLabel VN', catLabel('social', 'VN'), 'Trò chơi + Giao lưu');
eq('catLabel RU falls back to EN', catLabel('arts', 'RU'), 'Arts, Film, Music');
eq('catLabel deal (the menu ticket)', catLabel('deal', 'EN'), 'Drinks + Deals');
eq('catLabel other → no label', catLabel('other', 'EN'), '');
eq('catLabel unknown → no label', catLabel('nope', 'VN'), '');
eq('ticketLabel when EN', ticketLabel('when', 'EN'), 'When');
eq('ticketLabel where KO falls back to EN', ticketLabel('where', 'KO'), 'Where');
eq('ticketLabel entry reuses the site line (EN)', ticketLabel('entry', 'EN'), 'Entry');
eq('ticketLabel entry reuses the site line (VN)', ticketLabel('entry', 'VN'), 'Vé vào');
eq('ticketLabel entry reuses the site line (JA)', ticketLabel('entry', 'JA'), '入場料');
// The menu's deal ticket: the NEXT deal (a Happy Hour), only when it is today (ICT).
{
  const hh = (id, s, e) => ({ id, title_en: 'Happy Hour: Buy 1 Get 1 Cocktails', startsAt: s, endsAt: e });
  const quiz = { id: 'quiz', title_en: 'REALITY Pub Quiz', startsAt: '2026-07-01T19:00:00+07:00' };
  const today = hh('today', '2026-07-01T17:00:00+07:00', '2026-07-01T21:00:00+07:00');
  const nextWeek = hh('next', '2026-07-08T17:00:00+07:00', '2026-07-08T21:00:00+07:00');
  eq("nextDealToday: today's happy hour", (nextDealToday([quiz, nextWeek, today], isDealEvent, wedNoon) || {}).id, 'today');
  eq('nextDealToday: next one is another day → none', nextDealToday([quiz, nextWeek], isDealEvent, wedNoon), null);
  eq("nextDealToday: today's has ended → none", nextDealToday([today, nextWeek], isDealEvent, Date.parse('2026-07-01T22:00:00+07:00')), null);
  check('isTodayICT across the ICT midnight', isTodayICT('2026-07-01T16:30:00Z', wedNoon) && !isTodayICT('2026-07-01T17:30:00Z', wedNoon));
}

// ── Night v2 ticket dates + the hero pick ────────────────────────────────────
// The list-ticket date block: the house d.m split, never zero-padded.
eq('dmParts 6.10', JSON.stringify(dmParts('2026-10-06T19:00:00+07:00')), JSON.stringify({ d: '6', m: '10' }));
eq('dmParts garbage', JSON.stringify(dmParts('nope')), JSON.stringify({ d: '', m: '' }));
// whenKey: "now" = Wed 1.7 noon ICT; today splits on 17:00.
eq('whenKey tonight', whenKey('2026-07-01T20:00:00+07:00', wedNoon), 'tonight');
eq('whenKey today (daytime)', whenKey('2026-07-01T14:00:00+07:00', wedNoon), 'today');
eq('whenKey tomorrow', whenKey('2026-07-02T10:00:00+07:00', wedNoon), 'tomorrow');
eq('whenKey later → none', whenKey('2026-07-03T19:00:00+07:00', wedNoon), '');
eq('whenKey ICT midnight boundary', whenKey('2026-07-01T17:30:00Z', wedNoon), 'tomorrow');
// weeklyIds: "Every Tue" only when the feed shows the series a week apart;
// weekdayName speaks each language's own weekday.
{
  const s = (id, seriesId, startsAt) => ({ id, seriesId, startsAt });
  const w = weeklyIds([
    s('w1', 'A', '2026-10-06T12:30:00+07:00'),
    s('w2', 'A', '2026-10-13T12:30:00+07:00'),
    s('f1', 'B', '2026-10-06T19:00:00+07:00'),
    s('f2', 'B', '2026-10-20T19:00:00+07:00'),
    s('m1', 'C', '2026-10-06T19:00:00+07:00'),
    s('x1', null, '2026-10-06T19:00:00+07:00'),
    s('t1', 'D', '2026-10-07T18:00:00+07:00'),
    s('t2', 'D', '2026-10-14T19:30:00+07:00'),
  ]);
  eq('weeklyIds: a 7-day series is weekly', w.has('w1') && w.has('w2'), true);
  eq('weeklyIds: a fortnightly series is not', w.has('f1') || w.has('f2'), false);
  eq('weeklyIds: a lone instance or no series is not', w.has('m1') || w.has('x1'), false);
  eq('weeklyIds: a 90-min time shift still reads weekly', w.has('t1') && w.has('t2'), true);
  eq('weekdayName EN', weekdayName('2026-10-06T12:30:00+07:00', 'EN'), 'Tue');
  eq('weekdayName VN', weekdayName('2026-10-06T12:30:00+07:00', 'VN'), 'Thứ 3');
  eq('weekdayName JA', weekdayName('2026-10-06T12:30:00+07:00', 'JA'), '火');
  eq('weekdayName ICT midnight boundary (Mon 23:30 ICT)', weekdayName('2026-10-05T16:30:00Z', 'EN'), 'Mon');
}

// ── locale parity: every catalogue mirrors locales/en.js ─────────────────────
// Same key paths, same value types, same array lengths — so a string added to
// EN and forgotten elsewhere fails here, not as silent English on /ja/. Loaded
// through the site's own lazy loader (translations.js), which also proves each
// language chunk resolves and none fell back to EN.
{
  const { STR, LANGS, loadAllLocales } = {
    ...(await import('../src/data/translations.js')),
    ...(await import('../src/data/languages.js')),
  };
  await loadAllLocales();
  const shape = (v, p = '', out = []) => {
    if (Array.isArray(v)) { out.push(`${p}[]#${v.length}`); v.forEach((x, i) => shape(x, `${p}[${i}]`, out)); }
    else if (v && typeof v === 'object') for (const k of Object.keys(v)) shape(v[k], `${p}.${k}`, out);
    else out.push(`${p}:${typeof v}`);
    return out;
  };
  const en = new Set(shape(STR.EN));
  for (const { code } of LANGS) {
    if (code === 'EN') continue;
    check(`locale ${code} loaded (not the EN fallback)`, !!STR[code] && STR[code] !== STR.EN);
    const got = new Set(shape(STR[code] || {}));
    const missing = [...en].filter((k) => !got.has(k));
    const extra = [...got].filter((k) => !en.has(k));
    check(`locale ${code} mirrors EN (missing: ${missing.slice(0, 5).join(' ') || '-'}; extra: ${extra.slice(0, 5).join(' ') || '-'})`,
      missing.length === 0 && extra.length === 0);
  }
}

// ── summary ──────────────────────────────────────────────────────────────────
if (failures.length) {
  console.error(`\nselftest: ${failures.length} FAILED, ${passed} passed`);
  process.exit(1);
}
console.log(`selftest: all ${passed} checks passed ✓`);
process.exit(0);
