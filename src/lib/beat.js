// beat.js — ONE CLOCK, AND THE PACES, for everything ambient on a page.
//
// Ambient motion that starts whenever it likes reads as noise; motion that
// all keeps one pace reads as a machine. So (Donald, 24.11.26: "2 or 3 beats
// for the card animations — say, 3, 6, 8 seconds? Something to give a little
// rhythm and unpredictability"):
//
//   the grid          everything starts ON THE SECOND (BEAT_MS)
//   three paces       a card face performs every 3, 6 or 8 seconds (PACES)
//   who keeps which   FACES, below
//
// 3 and 6 make a steady figure; the 8s drift across it, landing on a
// different part of it each time. The whole pattern only repeats every 24 s
// (the smallest number 3, 6 and 8 all divide), so the first screen has a
// rhythm without an obvious loop.
//
// The other ambient motion keeps the same grid:
//   the Live Pulse    one swell every 2 s (deck.css; deck/ambient.js keeps
//                     every square in phase with this clock)
//   the ink strip     a new performance every 4–6 s, started on the second
//                     (components/InkMotionMark.jsx)
//
// TO CHANGE THE RHYTHM, change the numbers here and nowhere else. Which
// second of its pace each face takes is worked out for you (deck/ambient.js)
// so that as few as possible start together, the heavy ones never.
// The clock is the page's own timeline (performance.now()), so second n is
// at n × BEAT_MS for every script and every CSS animation alike.
export const BEAT_MS = 1000;

// The three paces, in beats (= seconds while BEAT_MS is 1000).
export const PACES = { quick: 3, mid: 6, slow: 8 };

// The faces that move on their own: the pace each keeps and how heavy its
// move is (3 = it changes what the card says, 2 = an accent on a figure,
// 1 = a tick). Two heavy faces are never given the same second.
//   quick  the two that count: the drink list and the clock
//   mid    the photo, the biggest move on the table
//   slow   the two accents on a figure — rare, so they stay accents
// (04's chart is not here: it prints once as the card arrives, off the clock:
// deck/faces/HeldFace.jsx.)
export const FACES = {
  menu: { pace: 'quick', weight: 3 }, //   03 the drink rolls over
  visit: { pace: 'quick', weight: 1 }, //  09 the open hour is stamped again
  inside: { pace: 'mid', weight: 3 }, //   05 a photo re-registers
  giving: { pace: 'slow', weight: 2 }, //  07 the total throws an echo
  host: { pace: 'slow', weight: 2 }, //    06 0₫ gets a highlighter pass
};

let paces = PACES;
let pacesStamp = 0;
const subs = new Set();
let timer = 0;
let watching = false;

const now = () => performance.now();

// How many beats between performances at a pace ('quick' | 'mid' | 'slow').
export const beatsOf = (pace) => paces[pace] || paces.mid;
// Changes whenever the paces do (the dev lab's switch), so a table knows to
// re-arrange itself.
export const pacesVersion = () => pacesStamp;

// untilBeat(min, every) → milliseconds from now to the next beat that is at
// least `min` ms away (and, with `every`, a multiple of that many beats).
// For anything that schedules itself: setTimeout(start, untilBeat(5000)).
export function untilBeat(min = 0, every = 1) {
  const step = BEAT_MS * every;
  const t = now();
  return Math.ceil((t + min) / step) * step - t;
}

function schedule() {
  window.clearTimeout(timer);
  timer = 0;
  if (!subs.size || document.hidden) return;
  // never closer than 20 ms: a timer that fires a hair early must not tick twice
  timer = window.setTimeout(tick, untilBeat(20));
}

function tick() {
  const index = Math.round(now() / BEAT_MS);
  subs.forEach((fn) => fn(index));
  schedule();
}

// onBeat(fn) → fn(beatNumber) on every beat while the tab is visible.
// Returns the unsubscribe. One timer serves every listener.
export function onBeat(fn) {
  if (!watching && typeof document !== 'undefined') {
    watching = true;
    document.addEventListener('visibilitychange', schedule);
  }
  subs.add(fn);
  if (!timer) schedule();
  return () => {
    subs.delete(fn);
    if (!subs.size) {
      window.clearTimeout(timer);
      timer = 0;
    }
  };
}

// The dev lab's switch: try another set of paces on the live page.
// setPaces() with nothing puts PACES back.
export function setPaces(next) {
  const p = next && next.quick > 0 && next.mid > 0 && next.slow > 0 ? next : PACES;
  paces = { quick: Math.round(p.quick), mid: Math.round(p.mid), slow: Math.round(p.slow) };
  pacesStamp += 1;
}
