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
  needsRsvp,
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
import { seriesNext, alsoComingUp } from '../src/data/overlay-related.js';

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

// ── poster: the designed 4:5 or null(skip) — the feed slice is retired ───────
eq('poster is the 4x5', pickPoster({ feed: 'f.jpg', poster4x5: '4x5.jpg' }), '4x5.jpg');
eq('a lone feed slice is no poster', pickPoster({ feed: 'f.jpg', poster4x5: null }), null);
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
  ['BODY DOUBLING: STOP PROCRASTINATING, START TOGETHER', 'tech'],
  ['WALKABOUT PRESENCE – PHASE II: Presentation Skills & Audience Engagement', 'language'],
  ['Journaling for Self Exploration & Acceptance', 'wellness'],
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

// ── RSVP: limited-spot events (feed additive field rsvpCapacity) ─────────────
// non-null = needs an RSVP with a free REALITY account; a MISSING field reads
// exactly like null (the field isn't live everywhere yet), so an ordinary
// event renders as before.
eq('needsRsvp capacity 10', needsRsvp({ rsvpCapacity: 10 }), true);
eq('needsRsvp capacity 0 (non-null)', needsRsvp({ rsvpCapacity: 0 }), true);
eq('needsRsvp null', needsRsvp({ rsvpCapacity: null }), false);
eq('needsRsvp field missing', needsRsvp({ id: 'x' }), false);
eq('needsRsvp numeric string', needsRsvp({ rsvpCapacity: '12' }), true);
eq('needsRsvp junk (true / "" / NaN)', needsRsvp({ rsvpCapacity: true }) || needsRsvp({ rsvpCapacity: '' }) || needsRsvp({ rsvpCapacity: NaN }), false);
eq('needsRsvp no event', needsRsvp(null), false);
// The sentence is Donald's, verbatim in EN; every language carries its own
// sentence, short label and door (no silent English on /vn/ … /ja/).
eq('rsvpRequired EN verbatim', cfStr('EN').rsvpRequired, 'This event requires RSVP with a free REALITY account.');
eq('rsvpRequired VN verbatim', cfStr('VN').rsvpRequired, 'Sự kiện này cần RSVP bằng tài khoản REALITY miễn phí.');
eq('rsvpShort EN', cfStr('EN').rsvpShort, 'RSVP required');
for (const code of ['VN', 'RU', 'UK', 'KO', 'JA']) {
  for (const k of ['rsvpRequired', 'rsvpShort', 'rsvpInApp']) {
    const v = cfStr(code)[k];
    check(`cfStr ${code}.${k} is its own string`, typeof v === 'string' && v.trim() !== '' && v !== cfStr('EN')[k]);
  }
}

// ── event overlay: what it offers next (overlay-related.js, 7.10.26) ─────────
{
  const at = (d, h = 19) => `2026-10-${String(d).padStart(2, '0')}T${String(h).padStart(2, '0')}:30:00+07:00`;
  const talk = (id, d, series = null, title = 'Talk night') => ({ id, seriesId: series, startsAt: at(d), title_en: title, category: 'language' });
  const evs = [
    talk('t7', 7, 'S-talk', 'Vietnam Talk'),
    talk('t14', 14, 'S-talk', 'Vietnam Talk'),
    talk('t21', 21, 'S-talk', 'Vietnam Talk'),
    talk('t28', 28, 'S-talk', 'Vietnam Talk'),
    talk('t31', 31, 'S-talk', 'Vietnam Talk'),
    talk('c8', 8, 'S-coffee', 'Coffee + Conversation'),
    talk('c15', 15, 'S-coffee', 'Coffee + Conversation'),
    talk('x9', 9, null, 'A one-off talk'),
    talk('l10', 10, 'S-lang', 'Language Exchange'),
    talk('l17', 17, 'S-lang', 'Language Exchange'),
    { id: 'q8', seriesId: 'S-quiz', startsAt: at(8), title_en: 'Pub Quiz', category: 'social' },
  ];
  const me = evs[0];
  eq('seriesNext: the next three dates of the series, in order', seriesNext(evs, me).map((e) => e.id).join(','), 't14,t21,t28');
  eq('seriesNext: never the event itself or an earlier date', seriesNext(evs, evs[2]).map((e) => e.id).join(','), 't28,t31');
  eq('seriesNext: a one-off has none', seriesNext(evs, evs[7]).length, 0);
  eq('alsoComingUp: same kind, one per series, soonest first, never its own series',
    alsoComingUp(evs, me).map((e) => e.id).join(','), 'c8,x9,l10');
  eq('alsoComingUp: never another kind', alsoComingUp(evs, me).some((e) => e.category === 'social'), false);
  eq('alsoComingUp: no list for an uncategorised event', alsoComingUp(evs, { id: 'o', startsAt: at(7), title_en: 'Mystery', category: 'other' }).length, 0);
  eq('alsoComingUp: empty feed', alsoComingUp([], me).length, 0);
  for (const code of ['VN', 'RU', 'UK', 'KO', 'JA']) {
    for (const k of ['readMore', 'readLess', 'nextDates', 'moreDates', 'alsoComingUp', 'appKicker', 'appFacts', 'openApp']) {
      const v = cfStr(code)[k];
      check(`cfStr ${code}.${k} is its own string`, typeof v === 'string' && v.trim() !== '' && v !== cfStr('EN')[k]);
    }
    check(`cfStr ${code}.appFacts carries {n}`, cfStr(code).appFacts.includes('{n}'));
  }
  check('cfStr EN.appFacts carries {n}', cfStr('EN').appFacts.includes('{n}'));
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

// ── Poster Studio cloud sync: the decisions (public/studio/cloud-sync.js) ────
// The audit of 28.10.26: a stale draft overwrote the cloud's, edits to a
// template never came down, failed pushes were invisible. The rules that fix
// them are plain functions, imported here exactly as they ship.
{
  const S = await import('../public/studio/cloud-sync.js');
  const H = 3600000, MIN = 60000, T0 = Date.parse('2026-10-28T10:00:00+07:00');
  const row = (id, at) => ({ doc_id: 'tpl:' + id, updated_at: at });

  // planPull — the hub stamps updated_at with ITS clock, so a late push must not
  // read as an edit, and an edit elsewhere must.
  const local = [{ id: 'a', savedAt: T0 }, { id: 'b', savedAt: T0 }, { id: 'c', savedAt: T0 }, { id: 'd', savedAt: T0 }];
  const docs = [
    { doc_id: 'working', updated_at: T0 + 9 * H },   // the draft is not a template
    row('a', T0 + 5 * H),                              // synced at +5h, unchanged since
    row('b', T0 + 6 * H),                              // synced at +5h, the hub moved on: an edit elsewhere
    row('c', T0 + 2 * MIN),                            // no record, landed 2 min after the save: its own push
    row('d', T0 + 26 * H),                             // no record, landed a day later: look once
    row('e', T0 + 1 * H),                              // not on this disk
  ];
  const plan = S.planPull(docs, local, { a: T0 + 5 * H, b: T0 + 5 * H });
  eq('planPull fetches changed / check / missing, newest first', plan.fetch.map((w) => w.id + ':' + w.why).join(' '), 'd:check b:changed e:missing');
  eq('planPull adopts an in-step template with no record', JSON.stringify(plan.adopt), JSON.stringify({ c: T0 + 2 * MIN }));
  eq('planPull: nothing to do when the records match', S.planPull([row('a', T0 + 5 * H)], local, { a: T0 + 5 * H }).fetch.length, 0);
  eq('planPull: a record that is not a number is no record (never a silent skip)', S.planPull([row('d', T0 + 26 * H)], local, { d: { at: T0 } }).fetch.map((w) => w.why).join(), 'check');

  // isNewerCopy — the copy's own stamp decides, never the hub's clock
  check('isNewerCopy: a later save replaces', S.isNewerCopy({ savedAt: T0 }, { savedAt: T0 + H }));
  check('isNewerCopy: an older copy never replaces a newer local one', !S.isNewerCopy({ savedAt: T0 + H }, { savedAt: T0 }));
  check('isNewerCopy: the same save is kept as it is', !S.isNewerCopy({ savedAt: T0 }, { savedAt: T0 }));
  check('isNewerCopy: an archive elsewhere (changedAt) counts as a change', S.isNewerCopy({ savedAt: T0 }, { savedAt: T0, changedAt: T0 + MIN, archived: true }));
  eq('tplStamp = the later of savedAt / changedAt', S.tplStamp({ savedAt: T0, changedAt: T0 + 5 }), T0 + 5);

  // keepLocalPhotos — an edit elsewhere keeps this disk's full-size photos
  const full = 'ref:sha256:' + 'a'.repeat(64), slim = 'data:image/jpeg;base64,SLIM860', fresh = 'data:image/jpeg;base64,NEWPHOTO';
  const mine = { id: 'x', savedAt: T0, doc: { elements: [{ id: 'p1', src: full }, { id: 't1', text: 'Bartender wanted' }] } };
  const theirs = { id: 'x', savedAt: T0 + H, doc: { elements: [{ id: 'p1', src: slim }, { id: 'p2', src: fresh }, { id: 't1', text: 'Bartenders wanted' }] } };
  const k = await S.keepLocalPhotos(mine, theirs, async (r) => (r === full ? slim : r));
  eq('keepLocalPhotos: the 860px cut goes back to the full-size reference', k.tpl.doc.elements[0].src, full);
  eq('keepLocalPhotos: a photo replaced elsewhere comes in as sent', k.tpl.doc.elements[1].src, fresh);
  eq('keepLocalPhotos: the edit itself comes through', k.tpl.doc.elements[2].text, 'Bartenders wanted');
  eq('keepLocalPhotos: counts what it kept', k.kept, 1);
  eq('keepLocalPhotos: a slimOf that throws changes nothing', (await S.keepLocalPhotos(mine, theirs, async () => { throw new Error('x'); })).tpl, theirs);

  // classifyPush — why a push didn't land
  eq('classifyPush: success', S.classifyPush({ ok: true, updatedAt: 1 }), null);
  eq('classifyPush: success (bare true)', S.classifyPush(true), null);
  eq('classifyPush: 413', S.classifyPush({ ok: false, status: 413, tooBig: true, bytes: 6e6 }).why, 'tooBig');
  eq('classifyPush: 401', S.classifyPush({ ok: false, status: 401 }).why, 'signedOut');
  eq('classifyPush: timeout', S.classifyPush({ ok: false, status: 0, timedOut: true }).why, 'timeout');
  eq('classifyPush: never answered', S.classifyPush({ ok: false, status: 0 }).why, 'offline');
  eq('classifyPush: 502', S.classifyPush({ ok: false, status: 502 }).why, 'server');

  // draftIsNewer — savedAt vs savedAt, not "newer than this tab"
  check('draftIsNewer: a draft saved elsewhere BEFORE this tab opened, after the local edit, is offered',
    S.draftIsNewer({ savedAt: T0 + H }, T0 + H, T0));
  check('draftIsNewer: an older cloud draft is not', !S.draftIsNewer({ savedAt: T0 }, T0 + 9 * H, T0 + H));
  check('draftIsNewer: this tab\'s own draft coming back is not', !S.draftIsNewer({ savedAt: T0 }, T0 + 5, T0));
  check('draftIsNewer: an old-build draft (no savedAt) falls back to updated_at', S.draftIsNewer({}, new Date(T0 + H).toISOString(), T0));

  // makeDraftGate — the stale-push guard
  {
    const g = S.makeDraftGate(T0);
    check('gate: the boot doc is not an edit', !g.changed(T0 + 1) && !g.dirty);
    check('gate: nothing goes up before the check has finished', !g.take());
    g.checked();
    check('gate: nothing goes up without an edit (the stale laptop case)', !g.take());
    g.changed(T0 + MIN);
    eq('gate: an edit stamps the draft', g.at, T0 + MIN);
    check('gate: an edit goes up once', g.take() && !g.take());
    g.failed();
    check('gate: a push that failed goes again', g.take());
    g.changed(T0 + 2 * MIN); g.reset();
    check('gate: signed out / in again → held until the next check', !g.take());
    g.checked(); g.keepLocal();
    check('gate: "Load it?" cancelled → the cloud draft is not overwritten', !g.take());
    g.adopt(T0 + H);
    check('gate: loading the cloud draft is not an edit', !g.changed(T0 + H + 1) && !g.take());
    eq('gate: the loaded draft keeps its own stamp', g.at, T0 + H);
    const g2 = S.makeDraftGate(T0 + H); g2.changed(T0 + H); g2.ahead(); g2.checked();
    check('gate: a hub draft older than this one → this one goes up, no edit needed', g2.take());
  }

  // cloudState — the topbar's chip, the worst first
  const signedIn = { signedIn: true, email: 'donald@x', soon: false, mins: 300, lapsed: null };
  eq('cloudState: all well → no chip', S.cloudState(signedIn, { failed: [] }, null), null);
  eq('cloudState: never signed in → no chip', S.cloudState({ signedIn: false, lapsed: null }, { failed: [] }, null), null);
  const lapsedSt = S.cloudState({ signedIn: false, lapsed: { email: 'donald@x', reason: 'expired' } }, { failed: [{ id: 'a', why: 'timeout', name: 'A' }] }, null);
  eq('cloudState: expired sign-in → "Signed out", one click back in', lapsedSt.label + ' / ' + lapsedSt.act, 'Signed out / signin');
  const big = { id: 'b', why: 'tooBig', name: 'Bartender call', bytes: 6200000 };
  eq('cloudState: a failed push beats too-big', S.cloudState(signedIn, { failed: [big, { id: 'a', why: 'server', status: 502, name: 'A' }] }, null).act, 'retry');
  const bigSt = S.cloudState(signedIn, { failed: [big] }, null);
  eq('cloudState: too big names the template', bigSt.label, 'Not in cloud: “Bartender call”');
  check('cloudState: too big offers no retry (it would be refused again)', bigSt.act === null && /6\.2M/.test(bigSt.tip));
  eq('cloudState: a failed draft push → retry', S.cloudState(signedIn, { failed: [] }, { why: 'timeout' }).act, 'retry');
  eq('cloudState: the last 15 minutes', S.cloudState(Object.assign({}, signedIn, { soon: true, mins: 9 }), { failed: [] }, null).label, 'Sign-in ends in 9 min');
}

// ── the shared cloud client: sign-in that runs out (public/studio-shared/cloud.js)
// A browser-less page: window, localStorage and fetch faked just enough. The
// 12-hour token used to expire in silence; now every way it goes is announced.
{
  const store = new Map(), winListeners = {};
  const prevWindow = globalThis.window, prevLS = globalThis.localStorage, prevFetch = globalThis.fetch;
  globalThis.localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
  globalThis.window = {
    location: { search: '', origin: 'https://realitydn.com', hostname: 'realitydn.com' },
    addEventListener: (t, fn) => { (winListeners[t] = winListeners[t] || []).push(fn); },
    removeEventListener: () => {},
  };
  let fetches = 0, respond = () => ({ status: 200, body: '{"doc":null}' });
  globalThis.fetch = async (url, init) => {
    fetches++;
    const r = await respond(url, init);
    return { status: r.status, ok: r.status >= 200 && r.status < 300, text: async () => r.body || '' };
  };
  const tick = () => new Promise((r) => setTimeout(r, 5));
  const KEY = 'reality-hub-token-v1';
  const setTok = (token, msLeft) => store.set(KEY, JSON.stringify({ token, email: 'donald@x', expiresAt: Date.now() + msLeft }));
  try {
    const { RCloud } = await import('../public/studio-shared/cloud.js');
    const heard = [];
    RCloud.onAuth((why) => heard.push(why));

    setTok('t1', 2 * 3600000);
    let a = RCloud.authInfo();
    check('auth: a fresh token is signed in, not ending soon', a.signedIn && !a.soon && a.lapsed === null && a.email === 'donald@x');
    setTok('t1', 10 * 60000);
    check('auth: 10 minutes left → soon', RCloud.authInfo().soon);

    setTok('t1', -1000);
    a = RCloud.authInfo();
    await tick();
    check('auth: an expired token reads signed out', !a.signedIn && !store.has(KEY));
    eq('auth: …and says whose sign-in ran out', a.lapsed && a.lapsed.reason + ':' + a.lapsed.email, 'expired:donald@x');
    check('auth: …and tells the Studio (onAuth)', heard.includes('expired'));

    setTok('t2', 3600000);
    respond = () => ({ status: 401, body: '{"error":"unauthorized"}' });
    await RCloud.getDoc('poster', 'working');
    await tick();
    check('auth: a 401 drops the token', !RCloud.isSignedIn());
    eq('auth: …as "rejected"', RCloud.authInfo().lapsed && RCloud.authInfo().lapsed.reason, 'rejected');
    check('auth: …and tells the Studio', heard.includes('rejected'));

    setTok('t3', 3600000);
    respond = () => { setTok('t4', 3600000); return { status: 401, body: '' }; };   // signed in again mid-request
    await RCloud.getDoc('poster', 'working');
    check('auth: an old request\'s 401 never wipes a newer sign-in', JSON.parse(store.get(KEY)).token === 't4');

    RCloud.signOut();
    eq('auth: a deliberate sign-out is not a lapse', RCloud.authInfo().lapsed, null);

    // another tab read the expired token first and removed it
    const old = JSON.stringify({ token: 't5', email: 'june@x', expiresAt: Date.now() - 1 });
    (winListeners.storage || []).forEach((fn) => fn({ key: KEY, oldValue: old, newValue: null }));
    eq('auth: another tab\'s expiry is this tab\'s too', RCloud.authInfo().lapsed && RCloud.authInfo().lapsed.email, 'june@x');

    // putDoc's failure detail (Poster) vs plain null (Schedule)
    setTok('t6', 3600000);
    fetches = 0;
    const huge = 'x'.repeat(5000001);
    const r1 = await RCloud.putDoc('poster', 'tpl:big', 'Big', huge, 1, { detail: true });
    check('putDoc: over the hub cap → tooBig, and nothing is uploaded', r1 && r1.tooBig && r1.status === 413 && fetches === 0);
    respond = () => ({ status: 502, body: '' });
    eq('putDoc: a failure without detail is still null (Schedule reads that)', await RCloud.putDoc('schedule', 'working', '', '{}', 1), null);
    eq('putDoc: with detail, the status', (await RCloud.putDoc('poster', 'working', '', '{}', 1, { detail: true })).status, 502);
    respond = () => ({ status: 200, body: '{"ok":true,"updatedAt":123}' });
    eq('putDoc: success hands back the hub\'s updatedAt', (await RCloud.putDoc('poster', 'working', '', '{}', 1, { detail: true })).updatedAt, 123);
  } finally {
    globalThis.window = prevWindow; globalThis.localStorage = prevLS; globalThis.fetch = prevFetch;
  }
}

// ── summary ──────────────────────────────────────────────────────────────────
if (failures.length) {
  console.error(`\nselftest: ${failures.length} FAILED, ${passed} passed`);
  process.exit(1);
}
console.log(`selftest: all ${passed} checks passed ✓`);
process.exit(0);
