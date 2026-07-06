// cal-feed.js — helpers + strings for the calendar feed widget: the app's
// calendar feed (imageless day-colour slices), ported to the website.
//
// Dependency-free like feed-helpers.js so scripts/selftest.mjs can unit-test the
// date math without a DOM. Mirrors the hub's src/lib/event-day.ts: same ICT
// pinning, same weekday→colour map, same "MON 07.07" label shape (DD.MM house
// style — never American month-first).

const ICT = 'Asia/Ho_Chi_Minh';

// Formatters are expensive to build; construct the constants once (the feed can
// render 60+ slices per paint — same lesson as the hub's 1102 hardening).
const FMT_WD = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: ICT });
const FMT_DM = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: '2-digit', timeZone: ICT });
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

// fmtDM(iso) → '07.07' (DD.MM in ICT) — the big date on imageless panes.
export function fmtDM(iso) {
  const d = instant(iso);
  return d ? FMT_DM.format(d).replace('/', '.') : '';
}

// fmtDayDate(iso, lang) → 'MON 07.07' / 'THỨ 2 07.07' — the feed card date box,
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
  },
  VN: {
    upNext: 'Sắp diễn ra',
    comingUp: 'Sắp tới',
    free: 'Miễn phí',
    freeEvent: 'Sự kiện miễn phí',
    entry: 'Vé vào: {cost}',
    upcomingCount: '{n} sự kiện sắp tới',
  },
  RU: {
    upNext: 'Скоро',
    comingUp: 'Далее',
    free: 'Бесплатно',
    freeEvent: 'Вход свободный',
    entry: 'Вход: {cost}',
    upcomingCount: 'Предстоящих событий: {n}',
  },
  UK: {
    upNext: 'Незабаром',
    comingUp: 'Далі',
    free: 'Безкоштовно',
    freeEvent: 'Вхід вільний',
    entry: 'Вхід: {cost}',
    upcomingCount: 'Подій попереду: {n}',
  },
  KO: {
    upNext: '곧 시작',
    comingUp: '예정',
    free: '무료',
    freeEvent: '무료 이벤트',
    entry: '입장료: {cost}',
    upcomingCount: '예정 이벤트 {n}개',
  },
  JA: {
    upNext: 'まもなく',
    comingUp: 'この先',
    free: '無料',
    freeEvent: '無料イベント',
    entry: '入場料: {cost}',
    upcomingCount: '今後のイベント{n}件',
  },
};

export function cfStr(lang = 'EN') {
  return CF_STR[lang] || CF_STR.EN;
}

// costLabel(ev, lang) — the badge text: the price when the event has one,
// "Free" when it doesn't. cost: null in the feed means a free event ("free
// only when free" — the claim is safe to print).
export function costLabel(ev, lang = 'EN') {
  return (ev && ev.cost) || cfStr(lang).free;
}
