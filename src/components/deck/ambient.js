// ambient.js — the motion INSIDE the deck's card faces, kept in time.
//
// A face performs once, rests, and performs again (the ink mark's model).
// Every performance starts on the second (lib/beat.js: the page's one clock),
// and each face keeps one of THREE PACES — every 3, 6 or 8 seconds. Which
// face keeps which is the FACES table in lib/beat.js; the numbers are there
// too. Nothing about the rhythm is set in this file or in the faces.
//
// What this file does is give each face its own second of its pace, so they
// don't all go at once: the quick faces are placed first, then each one takes
// the second where the least is already starting, weighted by how heavy the
// moves are. With the faces that move on the home page (24.11.26) that is:
//
//   every 3 s   menu from 0 · open hour from 1
//   every 6 s   photo from 2
//   every 8 s   host from 1 · giving from 5
//
//   second  0     1       2      3     4      5       6     7      8      9     10     11
//           menu  hours   photo  menu  hours  giving  menu  hours  photo  menu  hours  ·
//                 +host                                                   +host
//   second  12    13      14     15    16     17    18    19     20     21    22     23
//           menu  hours   photo  menu  hours  host  menu  hours  photo  menu  hours  ·
//                 +giving                                               +giving
//
// (Of two faces on the same pace and weight, the one earlier in the deck is
// placed first. Until 25.11.26 that was giving, card 05; the cards were then
// reordered and host, now 06, comes before giving, now 07, so the two 8s
// swapped seconds. Nothing else about the rhythm changed.)
//
// 3 and 6 make the steady figure (menu, hours, photo / menu, hours, rest);
// the two 8s drift across it and only come round to the same place every
// 24 s. The menu and the photo — the two big moves — never start together.
// An 8 and a 3 must meet once in 24 s (no arrangement on a 1 s grid avoids
// it), so four times in the 24 s two faces start on the same second.
// (04's chart prints once as the card arrives and is not on this clock.)
// When a face stops (09 has no "now" while we are closed) the rest re-arrange.
//
// A face gets a `beat` number: 0, then 1, 2, 3 … Beat 0 is the still — the
// markup as it ships, which is what the static HTML and a reduced-motion
// visitor keep for good. Each later beat is one performance; the face keys
// its animated element on it, so the CSS animation plays once and lands back
// on the still.
//
// A face sits its turn out while its card is off screen or under the pointer
// (hover and press belong to the card), and nothing runs in a hidden tab.
import { createContext, createElement, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { FACES, beatsOf, onBeat, pacesVersion } from '../../lib/beat';
import { prefersReducedMotion } from '../../hooks/motion';
import { isStill } from './parts';

const SETTLE_MS = 900; // a face's first performance waits for the page to land
const PULSE = 'dk-pulse';

// Dev-lab switch only: behave as under prefers-reduced-motion.
const lab = { still: false };
const tables = new Set(); // the tables with a face on them right now
export function setLabAmbient({ still }) {
  if (typeof still === 'boolean') lab.still = still;
}
export const ambientStill = () => isStill() || prefersReducedMotion() || lab.still;
// Every face on every table performs now (the lab's "Play", and its checks).
export const playEverything = () => tables.forEach((t) => t.playAll());

const gcd = (a, b) => (b ? gcd(b, a % b) : a);
const lcm = (a, b) => (a * b) / gcd(a, b);
const BAR_MAX = 720; // beats: longer than any set of paces worth trying
const HEAVY = 3; // a weight (lib/beat.js FACES) that counts as a big move

// The Live Pulse squares are CSS loops two beats long. Put each one in phase
// with the clock, so every square on the page swells together and on the beat.
function alignPulses() {
  if (!document.getAnimations || !document.timeline) return;
  const t = document.timeline.currentTime;
  if (typeof t !== 'number') return;
  document.getAnimations().forEach((a) => {
    if (a.animationName !== PULSE || typeof a.startTime !== 'number') return;
    const period = Number(a.effect.getComputedTiming().duration);
    if (!period) return;
    const off = ((a.startTime % period) + period) % period;
    if (off > 24 && period - off > 24) a.startTime = Math.floor(t / period) * period;
  });
}

export function createTable() {
  const voices = new Map(); // id → { el, order, pace, weight, once, auto, fire, born, inView, every, offset, done }
  let stop = null;
  let nextId = 1;
  let arranged = -1;

  // Give each repeating face its own second of its pace. Quick faces first,
  // heavy before light; each takes the second where the least weight already
  // starts over the whole bar, and of equal seconds the one furthest from
  // the faces already on the same pace (so two 8s sit 4 s apart, not side
  // by side). No randomness: the same faces always get the same seconds.
  const arrange = () => {
    arranged = pacesVersion();
    voices.forEach((v) => {
      v.every = Math.max(1, beatsOf(v.pace));
    });
    const list = [...voices.values()]
      .filter((v) => v.auto && !v.once)
      .sort((a, b) => a.every - b.every || b.weight - a.weight || a.order - b.order);
    const bar = Math.min(BAR_MAX, list.reduce((n, v) => lcm(n, v.every), 1));
    const load = new Array(bar).fill(0);
    const placed = [];
    list.forEach((v) => {
      let best = 0;
      let least = Infinity;
      let room = -1;
      for (let o = 0; o < v.every; o++) {
        let cost = 0;
        for (let b = o; b < bar; b += v.every) cost += load[b] * v.weight;
        let gap = v.every;
        placed.forEach((p) => {
          if (p.every !== v.every) return;
          const d = Math.abs(p.offset - o);
          gap = Math.min(gap, d, v.every - d);
        });
        if (cost < least || (cost === least && gap > room)) {
          least = cost;
          best = o;
          room = gap;
        }
      }
      v.offset = best;
      for (let b = best; b < bar; b += v.every) load[b] += v.weight;
      placed.push(v);
    });
  };

  const free = (v) => {
    if (!v.el || !v.inView) return false;
    const card = v.el.closest('.dk-card') || v.el;
    return !card.matches(':hover');
  };

  const beat = (index) => {
    if (ambientStill()) return;
    if (arranged !== pacesVersion()) arrange();
    if (index % 2 === 0) alignPulses();
    const t = performance.now();
    const ready = (v) => v.auto && !v.done && t - v.born >= SETTLE_MS && free(v);
    const due = [...voices.values()].filter((v) => !v.once && ready(v) && index % v.every === v.offset);
    const heavy = due.some((v) => v.weight >= HEAVY);
    due.forEach((v) => v.fire());
    // A once-only face (the chart that prints in when the page opens) takes
    // the first second that no big move starts on, so the page does not open
    // with two things at once. It never waits more than three.
    voices.forEach((v) => {
      if (!v.once || !ready(v)) return;
      if (heavy && (v.waited = (v.waited || 0) + 1) <= 3) return;
      v.done = true;
      v.fire();
    });
  };

  const table = {
    add(entry) {
      const id = nextId++;
      voices.set(id, { ...entry, born: performance.now(), inView: true, every: 1, offset: 0 });
      arrange();
      tables.add(table);
      if (!stop) stop = onBeat(beat);
      return id;
    },
    set(id, patch) {
      const v = voices.get(id);
      if (v) Object.assign(v, patch);
    },
    remove(id) {
      if (!voices.delete(id)) return;
      arrange();
      if (!voices.size) {
        stop?.();
        stop = null;
        tables.delete(table);
      }
    },
    playAll() {
      if (ambientStill()) return;
      voices.forEach((v) => v.fire());
    },
    // For checking: who goes when — [{ order, every, offset }]
    bar() {
      if (arranged !== pacesVersion()) arrange();
      return [...voices.values()].filter((v) => v.auto && !v.once).map((v) => ({ order: v.order, every: v.every, offset: v.offset }));
    },
  };
  return table;
}

// One table for every face that has no <AmbientTable> above it: the home
// page's nine cards.
let shared = null;
const TableCtx = createContext(null);
// For checking from the console: the home page's bar.
export const sharedBar = () => (shared ? shared.bar() : []);

// <AmbientTable> — a separate table (the lab shows several at once).
// `handle` (a ref) receives it, for a "Play" button.
export function AmbientTable({ children, handle }) {
  const table = useMemo(() => createTable(), []);
  useEffect(() => {
    if (handle) handle.current = table;
    return () => {
      if (handle && handle.current === table) handle.current = null;
    };
  }, [handle, table]);
  return createElement(TableCtx.Provider, { value: table }, children);
}

// useBeat({ face, on, once, order, auto }) → { beat, ref, bump }
//   face   the card's key ('menu', 'inside' …): its pace and weight are
//          looked up in FACES (lib/beat.js). A face that is not in that
//          table (the lab's unpicked options) passes `pace` and `weight`.
//   on     false = this face does not move (the beat stays 0)
//   once   one performance when the card first comes on screen, then never
//   order  the card's place in the deck (its number): which face is placed
//          first when two ask for the same pace and weight
//   auto   false = the table never fires it; the face calls bump() itself
//          when its own data changes
//   ref    put it on any element inside the card: it is how the table knows
//          the card is on screen and not under the pointer
export function useBeat({ face, on = true, pace, weight, once = false, order = 0, auto = true } = {}) {
  const ctx = useContext(TableCtx);
  const [beat, setBeat] = useState(0);
  const ref = useRef(null);
  const known = (face && FACES[face]) || null;
  const itsPace = pace || (known && known.pace) || 'mid';
  const itsWeight = weight || (known && known.weight) || 2;

  useEffect(() => {
    if (!on || isStill()) {
      setBeat(0);
      return undefined;
    }
    const table = ctx || (shared = shared || createTable());
    // Watch the CARD, not the element: on the compact card the element the
    // ref sits on may be one of the "extras" that are not displayed.
    const el = (ref.current && ref.current.closest('.dk-card')) || ref.current;
    const id = table.add({ el, pace: itsPace, weight: itsWeight, once, order, auto, fire: () => setBeat((n) => n + 1) });
    let io = null;
    if (el && 'IntersectionObserver' in window) {
      io = new IntersectionObserver((es) => table.set(id, { inView: es.some((e) => e.isIntersecting) }));
      io.observe(el);
    }
    return () => {
      io?.disconnect();
      table.remove(id);
    };
  }, [ctx, on, itsPace, itsWeight, once, order, auto]);

  // For a face that performs on its own data (auto: false).
  const bump = () => {
    if (!on || ambientStill() || document.hidden) return;
    setBeat((n) => n + 1);
  };
  return { beat, ref, bump };
}

// True on the compact (phone) card — the same breakpoint as deck.css.
const COMPACT = '(max-width: 760.98px)';
export function useCompact() {
  const [compact, setCompact] = useState(() => typeof window !== 'undefined' && window.matchMedia(COMPACT).matches);
  useEffect(() => {
    const mq = window.matchMedia(COMPACT);
    const on = () => setCompact(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return compact;
}
