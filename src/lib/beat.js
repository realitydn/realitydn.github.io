// beat.js — ONE CLOCK for everything ambient on a page.
//
// Ambient motion that starts whenever it likes reads as noise. Everything
// that moves on its own here starts ON A BEAT of the same clock, so the card
// faces, the Live Pulse squares and the masthead's ink strip land together
// or a whole number of beats apart:
//
//   a beat            BEAT_MS (0.8 s)
//   a card face       performs every 4 or 8 beats, each on its own beat of
//                     the bar (components/deck/ambient.js)
//   the Live Pulse    one swell every 2 beats (deck.css: calc(var(--beat) * 2))
//   the ink strip     a new performance every 4–6 s, started on a beat
//                     (components/InkMotionMark.jsx)
//
// To make the whole page quicker or slower, change BEAT_MS: everything above
// follows. The clock is the page's own timeline (performance.now()), so beat
// number n is at n × BEAT_MS for every script and every CSS animation alike.
export const BEAT_MS = 800;

let beatMs = BEAT_MS;
const subs = new Set();
let timer = 0;
let watching = false;

const now = () => performance.now();

export const beatLength = () => beatMs;

// untilBeat(min, every) → milliseconds from now to the next beat that is at
// least `min` ms away (and, with `every`, a multiple of that many beats).
// For anything that schedules itself: setTimeout(start, untilBeat(5000)).
export function untilBeat(min = 0, every = 1) {
  const step = beatMs * every;
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
  const index = Math.round(now() / beatMs);
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

// The lab's tempo switch (dev only). Also publishes the beat to CSS, where
// the Live Pulse and the longer card animations are measured in beats.
export function setBeatLength(ms) {
  beatMs = ms > 0 ? ms : BEAT_MS;
  if (typeof document !== 'undefined') {
    if (beatMs === BEAT_MS) document.documentElement.style.removeProperty('--beat');
    else document.documentElement.style.setProperty('--beat', `${beatMs}ms`);
  }
  schedule();
}
