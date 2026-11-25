// building.js — the deck's "What's happening" card: which rooms are in use
// right now, worked out from the events feed. Pure and dependency-free so
// scripts/selftest.mjs can pin it without a DOM.
//
// A room is ON when `now` falls between an event's startsAt and endsAt. Rooms
// are the feed's location codes (/api/feed/v1/locations.json): 1L, 2L, 2E, 3P,
// plus "Entire Space", which lights all four. An event can sit in several
// rooms at once (locations[]). An event with no end time is given two hours.
// A drinks deal (Happy Hour) has no room in the feed: it belongs to the bar.

// The cutaway, top floor first. `bar` is not a feed room: it is the bar
// itself, on when REALITY is open (data/deck/open-hours.js). `sky` is the
// empty air beside the rooftop patio.
export const FLOORS = [
  { n: 3, cells: [{ room: '3P', w: 3 }, { sky: true, w: 2 }] },
  { n: 2, cells: [{ room: '2E', w: 3 }, { room: '2L', w: 2 }] },
  { n: 1, cells: [{ room: '1L', w: 2 }, { bar: true, w: 3 }] },
];

export const ROOM_CODES = ['3P', '2E', '2L', '1L'];

// WHAT IS IN A ROOM WHEN NOTHING IS ON IN IT. A free room says what is there
// instead of standing empty: the pool table on the patio, the board games in
// the event space. While an event is running the room shows the event, as
// always.
//
// TO ADD OR CHANGE A LINE: one row per room, keyed by the room's code (the
// ROOM_CODES above). EN is the line; the other languages are the site's own
// codes (VN, RU, UK, KO, JA) and any that is missing shows the English. Keep
// a line to two or three words: it has to fit a room on a phone, and the
// small building on the first screen. A room with no row says nothing.
// (The English lines are placeholders until Donald words them. 1L and 2L
// have no line yet.)
export const ROOM_HAS = {
  '3P': { EN: 'Pool table', VN: 'Bàn bida', RU: 'Бильярдный стол', UK: 'Більярдний стіл', KO: '포켓볼 테이블', JA: 'ビリヤード台' },
  '2E': { EN: 'Board games', VN: 'Board game', RU: 'Настольные игры', UK: 'Настільні ігри', KO: '보드게임', JA: 'ボードゲーム' },
};

// roomHas('3P', 'VN') → 'Bàn bida' · roomHas('1L') → ''
export function roomHas(code, lang = 'EN') {
  const line = ROOM_HAS[code];
  if (!line) return '';
  return line[String(lang).toUpperCase()] || line.EN || '';
}
const ALL = 'Entire Space';
const DEFAULT_LENGTH_MS = 2 * 3600 * 1000;

const ms = (iso) => {
  const t = iso ? Date.parse(iso) : NaN;
  return Number.isNaN(t) ? null : t;
};

export function eventEndMs(ev) {
  const start = ms(ev && ev.startsAt);
  if (start === null) return null;
  const end = ms(ev.endsAt);
  return end !== null && end > start ? end : start + DEFAULT_LENGTH_MS;
}

// The rooms an event occupies, as ROOM_CODES.
export function roomsOf(ev) {
  const list = Array.isArray(ev && ev.locations) && ev.locations.length
    ? ev.locations
    : ev && ev.location ? [ev.location] : [];
  const out = new Set();
  for (const loc of list) {
    const code = loc && loc.code;
    if (code === ALL) ROOM_CODES.forEach((c) => out.add(c));
    else if (ROOM_CODES.includes(code)) out.add(code);
  }
  return [...out];
}

export function isOnNow(ev, now = Date.now()) {
  const start = ms(ev && ev.startsAt);
  const end = eventEndMs(ev);
  return start !== null && end !== null && start <= now && now < end;
}

// buildingNow(events, { now, isDeal }) →
//   { rooms: { '3P': { now: ev|null, next: ev|null }, … },
//     onCount,            how many rooms have an event in them right now
//     nowEvents,          the events running right now (deals excluded), soonest first
//     deal,               the drinks deal running right now, or null
//     next }              the next event to start anywhere (deals excluded), or null
// `next` per room is the next event to start in that room within 18 hours —
// far enough to cover the evening, never tomorrow night.
export function buildingNow(events, { now = Date.now(), isDeal = () => false } = {}) {
  const list = (events || [])
    .filter((ev) => ev && ms(ev.startsAt) !== null)
    .slice()
    .sort((a, b) => ms(a.startsAt) - ms(b.startsAt));
  const programme = list.filter((ev) => !isDeal(ev));
  const rooms = {};
  for (const code of ROOM_CODES) rooms[code] = { now: null, next: null };
  const horizon = now + 18 * 3600 * 1000;

  for (const ev of programme) {
    const start = ms(ev.startsAt);
    for (const code of roomsOf(ev)) {
      const r = rooms[code];
      if (isOnNow(ev, now)) {
        // two events in one room: the one that started LAST is the one on stage
        if (!r.now || ms(r.now.startsAt) <= start) r.now = ev;
      } else if (start > now && start <= horizon && !r.next) {
        r.next = ev;
      }
    }
  }

  const nowEvents = programme.filter((ev) => isOnNow(ev, now));
  return {
    rooms,
    onCount: ROOM_CODES.filter((c) => rooms[c].now).length,
    nowEvents,
    deal: list.find((ev) => isDeal(ev) && isOnNow(ev, now)) || null,
    next: programme.find((ev) => ms(ev.startsAt) > now) || null,
  };
}
