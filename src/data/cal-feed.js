// cal-feed.js — helpers + strings for the calendar feed widget: the app's
// calendar feed (imageless day-colour slices), ported to the website.
//
// Dependency-free like feed-helpers.js so scripts/selftest.mjs can unit-test the
// date math without a DOM. Mirrors the hub's src/lib/event-day.ts: same ICT
// pinning, same weekday→colour map, same "MON 7.7" label shape (house style,
// 30.9.26: day-first d.m, dot-separated, NO leading zeros — never month-first).

const ICT = 'Asia/Ho_Chi_Minh';

// Formatters are expensive to build; construct the constants once (the feed can
// render 60+ slices per paint — same lesson as the hub's 1102 hardening).
const FMT_WD = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: ICT });
const FMT_DM = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'numeric', timeZone: ICT });
const FMT_YMD = new Intl.DateTimeFormat('en-CA', { timeZone: ICT, year: 'numeric', month: '2-digit', day: '2-digit' });

const WD_CLASS = {
  Sun: 'd-sun', Mon: 'd-mon', Tue: 'd-tue', Wed: 'd-wed', Thu: 'd-thu', Fri: 'd-fri', Sat: 'd-sat',
};

// Vietnamese numeric weekdays (Thứ 2 … Chủ Nhật), keyed by the English short —
// ported from the hub so both surfaces print identical labels.
const WD_VI = {
  Mon: 'Thứ 2', Tue: 'Thứ 3', Wed: 'Thứ 4', Thu: 'Thứ 5', Fri: 'Thứ 6', Sat: 'Thứ 7', Sun: 'CN',
};

function instant(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

// dayClassFromISO(iso) → '.d-thu' etc — the weekday colour class (ICT weekday).
// Defaults to d-thu (pink) like the hub when the date is unusable.
export function dayClassFromISO(iso) {
  const d = instant(iso);
  return d ? WD_CLASS[FMT_WD.format(d)] || 'd-thu' : 'd-thu';
}

// fmtDM(iso) → '7.7' / '30.9' / '12.10' (d.m in ICT, no leading zeros) — the
// big date on imageless panes. Read off formatToParts (not a '/'→'.' swap) so
// the output never depends on a locale's separator or padding, and `+` strips
// any zero an engine pads with anyway.
export function fmtDM(iso) {
  const d = instant(iso);
  if (!d) return '';
  let day = '';
  let month = '';
  for (const p of FMT_DM.formatToParts(d)) {
    if (p.type === 'day') day = p.value;
    else if (p.type === 'month') month = p.value;
  }
  return `${+day}.${+month}`;
}

// fmtDayDate(iso, lang) → 'MON 7.7' / 'Thứ 2 7.7' — the feed card date box,
// exactly the hub's dayDateLabel. Non-EN/VN languages read the EN weekday (the
// three-letter short travels well and keeps the boxes compact).
export function fmtDayDate(iso, lang = 'EN') {
  const d = instant(iso);
  if (!d) return '';
  const en = FMT_WD.format(d);
  const wd = lang === 'VN' ? WD_VI[en] || en : en.toUpperCase();
  return `${wd} ${fmtDM(iso)}`;
}

function ictDateStr(now, plusDays) {
  return FMT_YMD.format(new Date(now + plusDays * 86400000));
}

// dmParts(iso) → { d: '6', m: '10' } — the house d.m split for the Night v2
// list-ticket date block (big day number, small .month). Same source as
// fmtDM, so no leading zeros, ever.
export function dmParts(iso) {
  const dm = fmtDM(iso);
  if (!dm) return { d: '', m: '' };
  const [d, m] = dm.split('.');
  return { d, m };
}

// whenKey(iso, now?) → 'tonight' | 'today' | 'tomorrow' | '' — the soon
// chip, as a key into the cal.* strings. Same split the calendar's chips use:
// today (ICT) splits on 17:00 — "tonight" for the evening programme, "today"
// for a daytime class; tomorrow is tomorrow; anything later has no chip.
const FMT_HOUR = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', hourCycle: 'h23', timeZone: ICT });
export function whenKey(iso, now = Date.now()) {
  const d = instant(iso);
  if (!d) return '';
  const key = FMT_YMD.format(d);
  if (key === ictDateStr(now, 1)) return 'tomorrow';
  if (key !== ictDateStr(now, 0)) return '';
  return parseInt(FMT_HOUR.format(d), 10) >= 17 ? 'tonight' : 'today';
}

// pickTonight(events, now?) → the event the Night hero ticket leads with:
// the NEXT event to start today (ICT); else one still running today (the
// latest-started, so a late set beats the afternoon's leftovers); else the
// next upcoming event on a later day. null when nothing is left.
export function pickTonight(events, now = Date.now()) {
  const list = (events || [])
    .filter((ev) => ev && instant(ev.startsAt))
    .slice()
    .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
  const today = ictDateStr(now, 0);
  const isToday = (ev) => FMT_YMD.format(instant(ev.startsAt)) === today;
  const starts = (ev) => Date.parse(ev.startsAt);
  const ends = (ev) => (instant(ev.endsAt) ? Date.parse(ev.endsAt) : starts(ev) + 2 * 3600 * 1000);
  const next = list.find((ev) => isToday(ev) && starts(ev) >= now);
  if (next) return next;
  const running = list.filter((ev) => isToday(ev) && starts(ev) < now && ends(ev) >= now);
  if (running.length) return running[running.length - 1];
  return list.find((ev) => starts(ev) >= now) || null;
}

// splitFeedSite(events, now?) → { soon, later } — the hub's splitFeed shape:
// soon = events starting today or tomorrow (ICT), later = everything after,
// both sorted by start instant so the next-to-start event leads. useFeed has
// already dropped ended events; undated events fall to the end of `later`.
export function splitFeedSite(events, now = Date.now()) {
  const today = ictDateStr(now, 0);
  const tomorrow = ictDateStr(now, 1);
  const sorted = (events || [])
    .slice()
    .sort((a, b) => {
      const ta = a.startsAt ? Date.parse(a.startsAt) : Infinity;
      const tb = b.startsAt ? Date.parse(b.startsAt) : Infinity;
      return ta - tb;
    });
  const soon = [];
  const later = [];
  for (const ev of sorted) {
    const d = instant(ev.startsAt);
    const key = d ? FMT_YMD.format(d) : '';
    if (key === today || key === tomorrow) soon.push(ev);
    else later.push(ev);
  }
  return { soon, later };
}

// ── Widget strings ──────────────────────────────────────────────────────────
// Self-contained so this module never touches data/translations.js (which may
// be mid-restructure). Covers the site's current + planned language codes;
// anything unknown falls back to EN. {cost}/{n} are template slots.
const CF_STR = {
  EN: {
    upNext: 'Up next',
    comingUp: 'Coming up',
    free: 'Free',
    freeEvent: 'Free event',
    entry: 'Entry: {cost}',
    upcomingCount: '{n} upcoming events',
    // Flow mode (touch / narrow): the rows past the first few fold away and
    // this DOOR takes over — the count carries the scope, the app carries the
    // full calendar. Opens app.realitydn.com, not more rows.
    seeAllInApp: 'See all {n} events in the app',
  },
  VN: {
    upNext: 'Sắp diễn ra',
    comingUp: 'Sắp tới',
    free: 'Miễn phí',
    freeEvent: 'Sự kiện miễn phí',
    entry: 'Vé vào: {cost}',
    upcomingCount: '{n} sự kiện sắp tới',
    seeAllInApp: 'Xem tất cả {n} sự kiện trong ứng dụng',
  },
  RU: {
    upNext: 'Скоро',
    comingUp: 'Далее',
    free: 'Бесплатно',
    freeEvent: 'Вход свободный',
    entry: 'Вход: {cost}',
    upcomingCount: 'Предстоящих событий: {n}',
    seeAllInApp: 'Все события ({n}) — в приложении',
  },
  UK: {
    upNext: 'Незабаром',
    comingUp: 'Далі',
    free: 'Безкоштовно',
    freeEvent: 'Вхід вільний',
    entry: 'Вхід: {cost}',
    upcomingCount: 'Подій попереду: {n}',
    seeAllInApp: 'Усі події ({n}) — у застосунку',
  },
  KO: {
    upNext: '곧 시작',
    comingUp: '예정',
    free: '무료',
    freeEvent: '무료 이벤트',
    entry: '입장료: {cost}',
    upcomingCount: '예정 이벤트 {n}개',
    seeAllInApp: '앱에서 이벤트 {n}개 모두 보기',
  },
  JA: {
    upNext: 'まもなく',
    comingUp: 'この先',
    free: '無料',
    freeEvent: '無料イベント',
    entry: '入場料: {cost}',
    upcomingCount: '今後のイベント{n}件',
    seeAllInApp: 'アプリでイベント{n}件をすべて見る',
  },
};

export function cfStr(lang = 'EN') {
  return CF_STR[lang] || CF_STR.EN;
}

// ── Night v2 ticket labels ──────────────────────────────────────────────────
// The category word on a ticket's top bar / meta line, and the key labels of
// the event overlay's ruled rows. ENGLISH ONLY for now — Donald writes the
// copy (canon: no generated VI/RU/UK/KO/JA), so every other language falls
// back to these per key until its words land here. Add a language as
// NIGHT_STR.VN = { cat: { music: '…', … }, when: '…', … } — missing keys
// still fall back to EN.
const NIGHT_STR = {
  EN: {
    cat: { music: 'Music', party: 'Party', games: 'Games', drinks: 'Drinks', film: 'Film', talk: 'Talk' },
    when: 'When',
    where: 'Where',
    entry: 'Entry',
  },
};

export function catLabel(cat, lang = 'EN') {
  const own = NIGHT_STR[lang] && NIGHT_STR[lang].cat;
  return (own && own[cat]) || NIGHT_STR.EN.cat[cat] || NIGHT_STR.EN.cat.talk;
}

export function nightLabel(key, lang = 'EN') {
  const own = NIGHT_STR[lang];
  return (own && own[key]) || NIGHT_STR.EN[key] || key;
}

// costLabel(ev, lang) — the badge text: the price when the event has one,
// "Free" when it doesn't. cost: null in the feed means a free event ("free
// only when free" — the claim is safe to print).
export function costLabel(ev, lang = 'EN') {
  return (ev && ev.cost) || cfStr(lang).free;
}
