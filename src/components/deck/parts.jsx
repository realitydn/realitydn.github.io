import React from 'react';

// The small shared pieces of the deck.

// fill('{n} rooms on', { n: 2 }) → '2 rooms on'
export function fill(str, vars = {}) {
  return String(str == null ? '' : str).replace(/\{(\w+)\}/g, (m, k) => (vars[k] == null ? m : String(vars[k])));
}

// The language codes (data/languages.js) → an Intl locale, for numbers.
const LOCALES = { EN: 'en-GB', VN: 'vi-VN', RU: 'ru-RU', UK: 'uk-UA', KO: 'ko-KR', JA: 'ja-JP' };

// 22.6 → '22.6' (EN) · '22,6' (VI, RU, UK). Counts stay plain digits.
export function decimal(n, lang = 'EN') {
  return new Intl.NumberFormat(LOCALES[lang] || 'en-GB', { maximumFractionDigits: 1, useGrouping: false }).format(n);
}

// Live Pulse — the one loop the motion library allows: a small square that
// beats, ahead of anything that is true RIGHT NOW (rooms in use, open now).
// Decorative; the words beside it carry the meaning. Still under reduced motion.
export function Pulse({ off = false }) {
  return <span className={`dk-pulse${off ? ' dk-pulse-off' : ''}`} aria-hidden="true" />;
}

// A MARKED GAP — a fact we do not have yet (a date, a recipient). It prints as
// a dashed tag so nobody mistakes a blank for an answer, and so the open
// facts are easy to find: search the code for <Gap or the page for [data-gap].
// Fill the fact at its source (the data file), and the tag goes away.
export function Gap({ children }) {
  return <span className="dk-gap" data-gap="">{children}</span>;
}

// A plain primary click (no modifier) — the same test the calendar uses to
// decide between "open the overlay" and "let the browser follow the link".
export function isPlainClick(e) {
  return !e.defaultPrevented && e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;
}

// isStill() — true while the page is being captured to static HTML
// (prerender.mjs sets window.__PRERENDER__). Anything that is only true at
// the moment it is read — "open now", which rooms are lit, the clock — must
// not be baked into a file that is served for the next 24 hours: in the
// still, those places state the standing fact (the hours) instead, and the
// live answer replaces it as soon as the page runs.
export function isStill() {
  return typeof window !== 'undefined' && !!window.__PRERENDER__;
}
