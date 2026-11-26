import { useEffect, useState } from 'react';
import BUILT from 'virtual:fundraisers';
import { FUNDRAISERS_URL, fundraisersView } from '../data/deck/fundraisers';

// useFundraisers — the "Charitable giving" card's data.
//
// The first render, and so the prerendered HTML, is the app's fundraisers
// feed as the BUILD read it (`virtual:fundraisers`, the `reality-fundraisers`
// plugin in vite.config.js), or the stand-in list when the build got no rows
// (data/deck/fundraisers.js). The browser then asks the feed once more, so a
// record changed since the last build shows; when the answer is the same
// record nothing on the page moves. A failed or empty fetch changes nothing.
// One request, shared by the card face and the opened card.
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
  const [view, setView] = useState(() => fundraisersView(null, BUILT));
  useEffect(() => {
    // The static capture makes no request of its own: it shows what the build
    // read (or the stand-ins).
    if (window.__PRERENDER__) return undefined;
    let alive = true;
    load().then((doc) => {
      if (alive && doc) setView(fundraisersView(doc, BUILT));
    });
    return () => { alive = false; };
  }, []);
  return view;
}
