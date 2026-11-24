import { useEffect, useRef } from 'react';
import { reveal, setFold } from '../components/deck/fold';

// useHashLanding — makes a deep link into the homepage actually land there.
//
// The app (and the Event Guidelines page, posters, QR codes…) send people to
// realitydn.com/#proposal, /#events, /#menus and so on. The browser's own
// hash jump is not enough here, for three reasons:
//   1. Some targets only exist after React runs — #proposal is the host
//      panel's form area, and the prerendered HTML shows the welcome panel.
//   2. The calendar feed arrives asynchronously (live fetch, 6s timeout,
//      then the snapshot) and the section changes height when it does, so
//      anything anchored BELOW the schedule drifts after the first jump.
//   3. Fonts settle after first paint and nudge every line height.
// So: resolve the hash to a target, jump as soon as the element exists,
// then re-anchor when the feed settles and when the fonts are ready —
// unless the visitor has already started scrolling, in which case we never
// yank the page from under them.
//
// Aliases keep the outward-facing contract forgiving (the app links
// #proposal; a poster might say #events; a human might type #menu).

// On the deck home page (23.11.26) the Info & Host panels each have a card of
// their own, so #info, #rules and #host are real ids now, not one section:
//   #info  → "First time here?"  (the welcome panel; an alias anchor on it)
//   #rules → the rules, inside "Find us"
//   #host  → "Host an event"
const ALIASES = {
  calendar: 'events',
  schedule: 'events',
  whatson: 'events',
  hosting: 'host',
  propose: 'proposal',
  menu: 'menus',
  food: 'menus',
  drinks: 'menus',
  location: 'visit',
  find: 'visit',
  photos: 'gallery',
};

// Which Info & Host panel a hash wants open (if any), and whether the
// proposal form should be unfolded. InfoHostSection reads this on mount.
const PANELS = {
  info: { panel: 'welcome' },
  host: { panel: 'host' },
  hosting: { panel: 'host' },
  rules: { panel: 'rules' },
  proposal: { panel: 'host', form: true },
  propose: { panel: 'host', form: true },
};

// FOLDS (24.11.26). The long version of several cards sits in a fold
// (components/deck/Expand.jsx). Two rules keep every link landing on something
// the visitor can see:
//   1. A link whose target is a fold, or is inside one, opens it first. That
//      covers #rules (the rules are a fold), a menu chapter
//      (#menu-panel-cocktails opens the menu and that chapter) and anything
//      else that ends up inside a fold later. On load, on a link on the page
//      and on a change of the address bar alike.
//   2. A page LOADED on one of the hashes below also opens the fold named
//      beside it: someone sent to /#menus was sent to the menu, and
//      someone sent to /#events to the calendar. (A link on the page itself,
//      such as the strip, only goes to the card: the card is the short
//      version on purpose, and the fold is the next thing on it.)
// To change rule 2, edit this list. The values are the folds' ids.
const OPENS_ON_LOAD = {
  events: 'events-all',
  menus: 'menu-full',
  info: 'first-more',
};

// landingTarget('#propose?x') → { id: 'proposal', panel: 'host', form: true }
// or null when the hash is empty / not one of ours.
export function landingTarget(hash) {
  if (!hash || hash === '#') return null;
  const raw = decodeURIComponent(hash.replace(/^#/, '')).split('?')[0].trim().toLowerCase();
  if (!raw) return null;
  const id = ALIASES[raw] || raw;
  return { id, ...(PANELS[raw] || {}) };
}

// Instant jump — suspend the document's scroll-behavior: smooth so a landing
// is a landing, not a two-second glide past the whole page.
function jumpTo(el) {
  const root = document.documentElement;
  const prev = root.style.scrollBehavior;
  root.style.scrollBehavior = 'auto';
  el.scrollIntoView({ block: 'start' });
  root.style.scrollBehavior = prev;
}

const USER_INTENT = ['wheel', 'touchstart', 'keydown', 'pointerdown'];

export default function useHashLanding({ settled = true } = {}) {
  // Once the visitor scrolls on their own, every later re-anchor is off.
  const released = useRef(false);
  const target = useRef(null);

  const go = () => {
    if (released.current || !target.current) return false;
    const el = document.getElementById(target.current.id);
    if (!el) return false;
    reveal(el);
    const held = document.getElementById(OPENS_ON_LOAD[target.current.id] || '');
    if (held) setFold(held, true, { animate: false });
    jumpTo(el);
    return true;
  };

  useEffect(() => {
    target.current = landingTarget(window.location.hash);
    if (!target.current) return undefined;

    const release = () => { released.current = true; };
    USER_INTENT.forEach((e) => window.addEventListener(e, release, { passive: true }));

    // Poll a few frames for the element (conditional ids appear after the
    // panel state lands), then stop — ~2s is plenty on a slow phone.
    let tries = 0;
    let raf = 0;
    const tick = () => {
      if (released.current) return;
      if (go() || ++tries > 120) return;
      raf = requestAnimationFrame(tick);
    };
    tick();

    // fonts.ready can settle after the page has unmounted (a route change
    // mid-load) — the flag keeps a late re-anchor from yanking the next page.
    let alive = true;
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => { if (alive) go(); });
    }

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      USER_INTENT.forEach((e) => window.removeEventListener(e, release));
    };
  }, []);

  // Links on the page, and the address bar changing under it (rule 1 above).
  // The click handler runs before the browser's own jump, so the jump is
  // measured against the opened page.
  useEffect(() => {
    const find = (hash) => {
      const t = landingTarget(hash);
      return t ? document.getElementById(t.id) : null;
    };
    const onClick = (e) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = e.target.closest ? e.target.closest('a[href*="#"]') : null;
      if (!a || a.target === '_blank') return;
      let url;
      try { url = new URL(a.href, window.location.href); } catch (err) { return; }
      if (url.origin !== window.location.origin || url.pathname !== window.location.pathname) return;
      const el = find(url.hash);
      if (el) reveal(el);
    };
    const onHash = () => {
      const el = find(window.location.hash);
      if (el && reveal(el)) jumpTo(el);
    };
    document.addEventListener('click', onClick);
    window.addEventListener('hashchange', onHash);
    return () => {
      document.removeEventListener('click', onClick);
      window.removeEventListener('hashchange', onHash);
    };
  }, []);

  // The feed settled (skeleton → cards) — everything below the schedule
  // just moved. Re-anchor once the new layout has painted.
  useEffect(() => {
    if (!settled || !target.current) return undefined;
    const raf = requestAnimationFrame(() => requestAnimationFrame(go));
    return () => cancelAnimationFrame(raf);
  }, [settled]);
}
