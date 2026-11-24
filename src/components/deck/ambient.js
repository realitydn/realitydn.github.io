// ambient.js — the motion INSIDE the deck's card faces, kept in time.
//
// A face performs once, rests, and performs again (the ink mark's model),
// and every performance starts on a beat of the page's one clock
// (lib/beat.js: a beat is 0.8 s). A face says how often it goes:
//
//   every: 4   once every 4 beats (3.2 s)   — small, quick things
//   every: 8   once every 8 beats (6.4 s)   — anything that takes a second or more
//   once: true one performance when the card first comes on screen, then never
//
// and the table gives each face its own beat of the bar, so they start one
// after another and never all together. With the six faces that move on the
// home page (23.11.26) a bar of eight beats reads:
//
//   beat   0      1       2      3       4      5       6      7
//          menu   photo   hours  giving  menu   photo   hours  host
//
// (04's chart prints once when the page opens and is not on the bar.)
// Change a face's `every` in its own file and the bar re-arranges itself.
//
// A face gets a `beat` number: 0, then 1, 2, 3 … Beat 0 is the still — the
// markup as it ships, which is what the static HTML and a reduced-motion
// visitor keep for good. Each later beat is one performance; the face keys
// its animated element on it, so the CSS animation plays once and lands back
// on the still.
//
// A face sits a beat out while its card is off screen or under the pointer
// (hover and press belong to the card), and nothing runs in a hidden tab.
import { createContext, createElement, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { onBeat } from '../../lib/beat';
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
  const voices = new Map(); // id → { el, order, every, once, auto, fire, born, inView, offset, done }
  let stop = null;
  let nextId = 1;

  // Give each repeating face its own beat: the quick ones first, each on the
  // beat with the least already on it.
  const arrange = () => {
    const list = [...voices.values()].filter((v) => v.auto && !v.once).sort((a, b) => a.every - b.every || a.order - b.order);
    const bar = list.reduce((n, v) => lcm(n, v.every), 1);
    const load = new Array(bar).fill(0);
    list.forEach((v) => {
      let best = 0;
      let least = Infinity;
      for (let o = 0; o < v.every; o++) {
        let sum = 0;
        for (let b = o; b < bar; b += v.every) sum += load[b];
        if (sum < least) {
          least = sum;
          best = o;
        }
      }
      v.offset = best;
      for (let b = best; b < bar; b += v.every) load[b] += 1;
    });
  };

  const free = (v) => {
    if (!v.el || !v.inView) return false;
    const card = v.el.closest('.dk-card') || v.el;
    return !card.matches(':hover');
  };

  const beat = (index) => {
    if (ambientStill()) return;
    if (index % 2 === 0) alignPulses();
    const t = performance.now();
    voices.forEach((v) => {
      if (!v.auto || v.done || t - v.born < SETTLE_MS || !free(v)) return;
      if (v.once) {
        v.done = true;
        v.fire();
      } else if (index % v.every === v.offset) {
        v.fire();
      }
    });
  };

  const table = {
    add(entry) {
      const id = nextId++;
      voices.set(id, { ...entry, born: performance.now(), inView: true, offset: 0 });
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
  };
  return table;
}

// One table for every face that has no <AmbientTable> above it: the home
// page's nine cards.
let shared = null;
const TableCtx = createContext(null);

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

// useBeat({ on, every, once, order, auto }) → { beat, ref, bump }
//   on     false = this face does not move (the beat stays 0)
//   every  how many beats between its performances (4 or 8)
//   once   one performance when the card first comes on screen, then never
//   order  the card's place in the deck (its number): which face gets the
//          earlier beat when two ask for the same pace
//   auto   false = the table never fires it; the face calls bump() itself
//          when its own data changes
//   ref    put it on any element inside the card: it is how the table knows
//          the card is on screen and not under the pointer
export function useBeat({ on = true, every = 4, once = false, order = 0, auto = true } = {}) {
  const ctx = useContext(TableCtx);
  const [beat, setBeat] = useState(0);
  const ref = useRef(null);

  useEffect(() => {
    if (!on || isStill()) {
      setBeat(0);
      return undefined;
    }
    const table = ctx || (shared = shared || createTable());
    // Watch the CARD, not the element: on the compact card the element the
    // ref sits on may be one of the "extras" that are not displayed.
    const el = (ref.current && ref.current.closest('.dk-card')) || ref.current;
    const id = table.add({ el, every, once, order, auto, fire: () => setBeat((n) => n + 1) });
    let io = null;
    if (el && 'IntersectionObserver' in window) {
      io = new IntersectionObserver((es) => table.set(id, { inView: es.some((e) => e.isIntersecting) }));
      io.observe(el);
    }
    return () => {
      io?.disconnect();
      table.remove(id);
    };
  }, [ctx, on, every, once, order, auto]);

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
