import { useEffect, useState } from 'react';
import { FUNDRAISERS_URL, fundraisersView } from '../data/deck/fundraisers';

// useFundraisers — the "Charitable giving" card's data: the app's fundraisers
// feed when it has rows, else the marked stand-in list
// (data/deck/fundraisers.js). The first render, and so the prerendered HTML,
// is always the stand-ins; a feed with rows replaces them in place. A failed
// or empty fetch changes nothing. One request, shared by the card face and
// the opened card.
const TIMEOUT_MS = 6000;
let shared = null;

function load() {
  if (!shared) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    shared = fetch(FUNDRAISERS_URL, { signal: controller.signal, headers: { Accept: 'application/json' } })
      .then((res) => (res.ok ? res.json() : null))
      .catch(() => null)
      .finally(() => clearTimeout(timer));
  }
  return shared;
}

export default function useFundraisers() {
  const [view, setView] = useState(() => fundraisersView(null));
  useEffect(() => {
    // The static capture stays on the stand-ins: what ships in the HTML never
    // depends on a network call made at build time.
    if (window.__PRERENDER__) return undefined;
    let alive = true;
    load().then((doc) => {
      if (alive && doc) setView(fundraisersView(doc));
    });
    return () => { alive = false; };
  }, []);
  return view;
}
