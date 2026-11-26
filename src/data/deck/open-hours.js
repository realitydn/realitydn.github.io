// open-hours.js — "open now", worked out in the venue's own time zone.
//
// REALITY is open every day 11:00 – 02:00 (the same hours as the
// LocalBusiness JSON-LD in index.html and the `hours` locale string). Đà Nẵng
// is UTC+7 all year, so the answer is the same for a visitor anywhere.
export const OPENS = 11; // 11:00
export const CLOSES = 2; // 02:00, the next morning

const FMT = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
});

// The wall clock in Đà Nẵng: { h, m, hhmm }.
export function ictClock(now = Date.now()) {
  let h = 0;
  let m = 0;
  for (const p of FMT.formatToParts(new Date(now))) {
    if (p.type === 'hour') h = Number(p.value);
    else if (p.type === 'minute') m = Number(p.value);
  }
  const pad = (n) => String(n).padStart(2, '0');
  return { h, m, hhmm: `${pad(h)}:${pad(m)}` };
}

const hh = (n) => `${String(n).padStart(2, '0')}:00`;

// openNow(now) → { open, until } — `until` is the next change: closing time
// while open ('02:00'), opening time while closed ('11:00').
export function openNow(now = Date.now()) {
  const { h } = ictClock(now);
  const open = h >= OPENS || h < CLOSES;
  return { open, until: open ? hh(CLOSES) : hh(OPENS) };
}
