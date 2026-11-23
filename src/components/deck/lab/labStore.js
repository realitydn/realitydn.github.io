// labStore.js — what Donald has chosen on the lab page, remembered.
//
//   sel    { building: 'a', menu: 'cur', … }  a card that isn't listed is off
//   night  Day / Night
//   quick  "quick look": every wait divided by three
//   still  behave as under prefers-reduced-motion
//   demo   show the building at the busiest hour in the feed, not right now
//
// Kept in localStorage, so the phone-width frame (an iframe of this same
// page) follows the switches as they are flipped, and so a reload keeps them.
// The picks are also written to the address (?s=01a.04b.09c): a link to the
// lab carries its selection, and a selection in the address wins on load.
import { useSyncExternalStore } from 'react';
import { DECK, cardNo } from '../deck';
import { VARIANTS } from './variants';

const KEY = 'reality-deck-lab';
const DEFAULTS = { sel: {}, night: false, quick: false, still: false, demo: false };

// { building: 'a', held: 'b' } ↔ '01a.04b'
export function encodeSel(sel) {
  return DECK.map((card, i) => (sel[card.key] ? `${cardNo(i)}${sel[card.key]}` : null)).filter(Boolean).join('.');
}
export function decodeSel(str) {
  const out = {};
  String(str || '').split('.').forEach((part) => {
    const m = /^(\d\d)([a-z]+)$/.exec(part);
    const card = m && DECK[Number(m[1]) - 1];
    if (card && (VARIANTS[card.key] || []).some((v) => v.id === m[2])) out[card.key] = m[2];
  });
  return out;
}

function read() {
  let saved = {};
  try {
    saved = JSON.parse(window.localStorage.getItem(KEY) || '{}') || {};
  } catch {
    saved = {};
  }
  return { ...DEFAULTS, ...saved, sel: { ...(saved.sel || {}) } };
}

let state = DEFAULTS;
const listeners = new Set();
let started = false;

function start() {
  if (started || typeof window === 'undefined') return;
  started = true;
  state = read();
  const fromUrl = new URLSearchParams(window.location.search).get('s');
  if (fromUrl !== null) state = { ...state, sel: decodeSel(fromUrl) };
  // another frame of the lab changed something
  window.addEventListener('storage', (e) => {
    if (e.key !== KEY) return;
    state = read();
    listeners.forEach((fn) => fn());
  });
}

export function setLab(patch) {
  start();
  state = { ...state, ...(typeof patch === 'function' ? patch(state) : patch) };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* private mode: the choices last until the tab closes */
  }
  // only the top page owns the address
  if (window.top === window) {
    const url = new URL(window.location.href);
    const s = encodeSel(state.sel);
    if (s) url.searchParams.set('s', s);
    else url.searchParams.delete('s');
    window.history.replaceState(null, '', url);
  }
  listeners.forEach((fn) => fn());
}

export function pick(key, id) {
  setLab((s) => {
    const sel = { ...s.sel };
    if (!id || id === 'off') delete sel[key];
    else sel[key] = id;
    return { sel };
  });
}

const subscribe = (fn) => {
  start();
  listeners.add(fn);
  return () => listeners.delete(fn);
};
const snapshot = () => {
  start();
  return state;
};

export function useLab() {
  return useSyncExternalStore(subscribe, snapshot, () => DEFAULTS);
}
