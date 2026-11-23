// ambient.js — the conductor for motion INSIDE the deck's card faces.
//
// The house model is the ink mark (components/InkMotionMark.jsx): a thing
// rests, performs once, and rests again. A table of cards works the same way,
// with one more rule: ONE CARD AT A TIME. Every animated face on a table asks
// the same conductor for its turn, so two cards never start together, and the
// more cards are animated the longer each one rests:
//
//   1 card animated  → it performs about every 10 s
//   3 cards          → one of them every ~4 s, each about every 12 s
//   9 cards          → one of them every ~4 s, each about every 35 s
//
// A face gets a `beat` (0, then 1, 2, 3 …). Beat 0 is the still: the markup
// as it ships, which is also what a reduced-motion visitor and the static
// HTML keep for good. Each later beat is one performance; a face keys its
// animated element on the beat so the CSS animation plays once and lands
// back on the still.
//
// A card is skipped (and tried again on the next turn) while it is off
// screen, while the tab is hidden, or while the pointer is over it — hover
// and press belong to the card itself.
import { createContext, createElement, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { prefersReducedMotion } from '../../../hooks/motion';

const GAP = [2800, 1800]; // between any two performances on a table: 2.8–4.6 s
const FIRST = [1400, 1200]; // the first one, after the table appears
const REST = 9000; // the least a card rests between its own performances

const between = ([base, spread]) => base + Math.random() * spread;

// Lab-only switches (the lab page sets them; nothing else does).
//   tempo  1 = real timing, 3 = "quick look" (waits divided by three)
//   still  true = behave as under prefers-reduced-motion
const lab = { tempo: 1, still: false };
const tables = new Set(); // the tables that have a card on them right now
export function setLabAmbient({ tempo, still }) {
  if (typeof tempo === 'number') lab.tempo = tempo;
  if (typeof still === 'boolean') lab.still = still;
  tables.forEach((t) => t.wake());
}
export const ambientStill = () => prefersReducedMotion() || lab.still;
// Every card on every table performs now (the lab's own checks use it).
export const playEverything = () => tables.forEach((t) => t.playAll());

export function createTable() {
  const players = new Map(); // id → { el, rest, last, fire, auto }
  let timer = 0;
  let nextId = 1;

  const ready = (p, now) => {
    if (!p.auto || !p.el || !p.inView) return false;
    if (now - p.last < p.rest / lab.tempo) return false;
    const card = p.el.closest('.dk-card') || p.el;
    return !card.matches(':hover');
  };

  const turn = () => {
    timer = 0;
    if (!players.size) return;
    if (!ambientStill() && !document.hidden) {
      const now = Date.now();
      // one of the two that have rested longest goes next (always the very
      // longest would make the table a fixed loop)
      const waiting = [...players.values()].filter((p) => ready(p, now)).sort((a, b) => a.last - b.last);
      const next = waiting[Math.floor(Math.random() * Math.min(2, waiting.length))];
      if (next) {
        next.last = now;
        next.fire();
      }
    }
    timer = window.setTimeout(turn, between(GAP) / lab.tempo);
  };

  const table = {
    add(entry) {
      const id = nextId++;
      // stagger the first round so the cards don't go in list order
      players.set(id, { ...entry, last: Date.now() - Math.random() * REST, inView: true });
      tables.add(table);
      if (!timer) timer = window.setTimeout(turn, between(FIRST) / lab.tempo);
      return id;
    },
    set(id, patch) {
      const p = players.get(id);
      if (p) Object.assign(p, patch);
    },
    remove(id) {
      players.delete(id);
      if (!players.size) {
        window.clearTimeout(timer);
        timer = 0;
        tables.delete(table);
      }
    },
    // Play every card on this table now (the lab's "Play" button).
    playAll() {
      if (ambientStill()) return;
      players.forEach((p) => {
        p.last = Date.now();
        p.fire();
      });
    },
    wake() {
      if (!players.size) return;
      window.clearTimeout(timer);
      timer = window.setTimeout(turn, between(FIRST) / lab.tempo);
    },
  };
  return table;
}

// One conductor for every card that has no <AmbientTable> above it.
let shared = null;
const TableCtx = createContext(null);

// <AmbientTable> — everything inside takes turns with everything else inside.
// `handle` (a ref) receives the table, for a "Play" button.
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

// useBeat({ on, rest, auto }) → { beat, ref, bump }
//   on    false = this face is not animated (the beat stays 0)
//   rest  the least time between this face's own performances (ms)
//   auto  false = the conductor never fires it; the face calls bump() itself
//         when its own data changes (the clock turning a minute)
//   ref   put it on any element inside the card: it is how the conductor
//         knows the card is on screen and not under the pointer
export function useBeat({ on = true, rest = REST, auto = true } = {}) {
  const ctx = useContext(TableCtx);
  const [beat, setBeat] = useState(0);
  const ref = useRef(null);

  useEffect(() => {
    if (!on) {
      setBeat(0);
      return undefined;
    }
    const table = ctx || (shared = shared || createTable());
    // Watch the CARD, not the element: on the compact card the element the
    // ref sits on may be one of the "extras" that are not displayed.
    const el = (ref.current && ref.current.closest('.dk-card')) || ref.current;
    const id = table.add({ el, rest, auto, fire: () => setBeat((n) => n + 1) });
    let io = null;
    if (el && 'IntersectionObserver' in window) {
      io = new IntersectionObserver((es) => table.set(id, { inView: es.some((e) => e.isIntersecting) }));
      io.observe(el);
    }
    return () => {
      io?.disconnect();
      table.remove(id);
    };
  }, [ctx, on, rest, auto]);

  // For a face that performs on its own data (auto: false).
  const bump = () => {
    if (!on || ambientStill() || document.hidden) return;
    setBeat((n) => n + 1);
  };
  return { beat, ref, bump };
}
