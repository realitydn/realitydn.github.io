import { useEffect, useRef } from 'react';

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

const ALIASES = {
  calendar: 'events',
  schedule: 'events',
  whatson: 'events',
  host: 'info',
  hosting: 'info',
  rules: 'info',
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

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => { go(); });
    }

    return () => {
      cancelAnimationFrame(raf);
      USER_INTENT.forEach((e) => window.removeEventListener(e, release));
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
