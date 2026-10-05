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
// weekdayName(iso, lang) → the weekday for "Every {weekday}" on a wall card
// (option A, 6.10.26): EN "Tue", VN "Thứ 3", and the language's own short
// weekday elsewhere (RU/UK "вт", KO "화", JA "火") — the templates in each
// locale's cal.everyWeekday carry the grammar around it.
const WD_INTL = {};
export function weekdayName(iso, lang = 'EN') {
  const d = instant(iso);
  if (!d) return '';
  const en = FMT_WD.format(d);
  if (lang === 'EN') return en;
  if (lang === 'VN') return WD_VI[en] || en;
  const loc = { RU: 'ru', UK: 'uk', KO: 'ko', JA: 'ja' }[lang];
  if (!loc) return en;
  WD_INTL[loc] = WD_INTL[loc] || new Intl.DateTimeFormat(loc, { weekday: 'short', timeZone: ICT });
  return WD_INTL[loc].format(d).replace(/\.$/, '');
}

// weeklyIds(events) → the ids whose series visibly repeats every 7 days in
// the feed itself — a neighbour in the same series exactly a week before or
// after (±2h, so a one-off time shift doesn't break it). Only those cards
// say "Every Tue": a series id alone doesn't say how often it runs, and a
// fortnightly or monthly night must never claim to be weekly.
export function weeklyIds(events) {
  const bySeries = new Map();
  for (const ev of events || []) {
    if (!ev || !ev.seriesId || !instant(ev.startsAt)) continue;
    if (!bySeries.has(ev.seriesId)) bySeries.set(ev.seriesId, []);
    bySeries.get(ev.seriesId).push(ev);
  }
  const WEEK = 7 * 86400000, SLACK = 2 * 3600000;
  const out = new Set();
  for (const list of bySeries.values()) {
    list.sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
    for (let i = 0; i < list.length; i++) {
      const t = Date.parse(list[i].startsAt);
      const prev = i > 0 ? t - Date.parse(list[i - 1].startsAt) : NaN;
      const next = i < list.length - 1 ? Date.parse(list[i + 1].startsAt) - t : NaN;
      if (Math.abs(prev - WEEK) <= SLACK || Math.abs(next - WEEK) <= SLACK) out.add(list[i].id);
    }
  }
  return out;
}

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

// isTodayICT(iso, now?) → true when the instant falls on today's date in ICT.
export function isTodayICT(iso, now = Date.now()) {
  const d = instant(iso);
  return !!d && FMT_YMD.format(d) === ictDateStr(now, 0);
}

// nextDealToday(events, isDeal, now?) → the menu's deal ticket: the NEXT
// deal event (isDealEvent — a Happy Hour by its title) that hasn't ended —
// shown ONLY when it is today (ICT) (Donald, 5.10.26: "only on the day").
// null otherwise. The predicate is passed in so this module stays free of the
// category table.
export function nextDealToday(events, isDeal, now = Date.now()) {
  const next = (events || [])
    .filter((ev) => ev && instant(ev.startsAt) && isDeal(ev))
    .filter((ev) => Date.parse(ev.endsAt || ev.startsAt) >= now)
    .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt))[0];
  return next && isTodayICT(next.startsAt, now) ? next : null;
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

// ── Ticket labels (Night v2 "Cream Tickets", round 2 — both themes) ─────────
// The category name on a ticket's top bar / meta line, and the key labels of
// the event overlay's ruled rows.
//
// CATEGORY NAMES are Donald's six groups (6.10.26 — pluses, never
// ampersands), EN + VI. A language without its own name falls back to
// ENGLISH, per key — so RU/UK/KO/JA read the EN names until they get theirs
// here (TICKET_STR.RU = { cat: { arts: '…' } } — missing keys still fall back).
// `other` (uncategorised) has no name: the bar/meta line just omits it.
// The names can be long ("WELLNESS + GROWTH"): bars and meta lines
// WRAP, never truncate (index.css .tkt-top).
//
// WHEN / WHERE: the site had no standalone label for either in any language,
// so EN everywhere + VI. ENTRY reuses the site's existing six-language
// "Entry: {cost}" line (CF_STR.entry), minus its cost slot.
// VI written 6.10.26 (Donald: "You're pretty good at Vietnamese, do it").
const TICKET_STR = {
  EN: {
    cat: {
      social: 'Games + Social',
      arts: 'Arts, Film, Music',
      language: 'Talk Events',
      wellness: 'Wellness + Growth',
      tech: 'Tech + Business',
      // not a category — the menu's deal ticket (isDealEvent)
      deal: 'Drinks + Deals',
    },
    when: 'When',
    where: 'Where',
  },
  VN: {
    cat: {
      social: 'Trò chơi + Giao lưu',
      arts: 'Nghệ thuật, Phim, Âm nhạc',
      language: 'Trò chuyện + Thảo luận',
      wellness: 'Sống khoẻ + Phát triển bản thân',
      tech: 'Công nghệ + Kinh doanh',
      deal: 'Đồ uống + Ưu đãi',
    },
    when: 'Thời gian',
    where: 'Địa điểm',
  },
};

// catLabel(cat, lang) → the category's name; '' for `other` / unknown keys.
export function catLabel(cat, lang = 'EN') {
  const own = TICKET_STR[lang] && TICKET_STR[lang].cat;
  return (own && own[cat]) || TICKET_STR.EN.cat[cat] || '';
}

// ticketLabel('when' | 'where' | 'entry', lang) → the overlay row key.
export function ticketLabel(key, lang = 'EN') {
  if (key === 'entry') return cfStr(lang).entry.replace(/\s*[:：]?\s*\{cost\}\s*$/, '');
  const own = TICKET_STR[lang];
  return (own && own[key]) || TICKET_STR.EN[key] || key;
}

// costLabel(ev, lang) — the badge text: the price when the event has one,
// "Free" when it doesn't. cost: null in the feed means a free event ("free
// only when free" — the claim is safe to print).
export function costLabel(ev, lang = 'EN') {
  return (ev && ev.cost) || cfStr(lang).free;
}
