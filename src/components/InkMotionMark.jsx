/* The full ink strip, alive — the masthead's mark (Donald 10.10.26: "the
   website should have full strip"). At rest it is the plain InkMark; every
   25–45s while it's on screen it gives one AMBIENT performance — a score
   drawn at random from the motion lab's library (never the one this visitor
   saw last), that leaves the finished mark and lands back on it.

   The engine is src/lib/ink-motion.js, GENERATED from the app's
   src/lib/ink-motion (reality-app/scripts/gen-website-ink-motion.mjs) and
   loaded as its own chunk only when the first performance is due — nothing
   of it ships in the page's first load. Pieces exist only while moving; the
   resting DOM is the nine-cell grid.

   Never during prerender (navigator.webdriver), never under reduced motion:
   the shipped HTML and the reduced state are the finished mark. The masthead
   clips its wrapper, so only scores that stay within ½ module of the strip
   are eligible (maxOverflow) — whole-module ones, at this size. */

import { useEffect, useRef, useState } from 'react';
import InkMark from './InkMark';

const SITE_PALETTE = {
  R: 'var(--red)', B: 'var(--blue)', Y: 'var(--yellow)', G: 'var(--green)',
  P: 'var(--pink)', A: 'var(--amber)', U: 'var(--purple)', K: '#0d0905', S: 'var(--stock,#fffbf1)',
};
const FIRST = [7000, 5000]; // first performance: 7–12s after the page settles
const EVERY = [25000, 20000]; // then every 25–45s

const later = ([base, spread]) => base + Math.random() * spread;

export default function InkMotionMark({ module: modulePx = 8 }) {
  const host = useRef(null);
  const [live, setLive] = useState(false);

  useEffect(() => {
    const el = host.current;
    if (!el || navigator.webdriver || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    let alive = true;
    let inView = true;
    let timer = 0;
    let player = null;
    const io = 'IntersectionObserver' in window
      ? new IntersectionObserver((es) => { inView = es.some((e) => e.isIntersecting); })
      : null;
    io?.observe(el);

    const perform = async () => {
      if (!alive) return;
      // Off-screen, hidden tab or mobile wrap-away: try again shortly.
      if (!inView || document.visibilityState !== 'visible' || !el.offsetWidth) {
        timer = window.setTimeout(perform, 4000);
        return;
      }
      try {
        const m = await import('../lib/ink-motion.js');
        const v = m.pick('amb', { module: modulePx, lite: m.isLiteDevice(), last: m.lastSeen('amb'), maxOverflow: 0.5 });
        if (!v || !alive) return;
        m.remember('amb', v.id);
        player = new m.InkPlayer(el, v, { module: modulePx, palette: SITE_PALETTE });
        setLive(true);
        await player.once(m.segmentFor(v, 'amb'));
      } catch {
        return; // chunk failed: the static mark stands, no retries
      } finally {
        player?.destroy();
        player = null;
        if (alive) setLive(false);
      }
      if (alive) timer = window.setTimeout(perform, later(EVERY));
    };
    timer = window.setTimeout(perform, later(FIRST));
    return () => {
      alive = false;
      window.clearTimeout(timer);
      io?.disconnect();
      player?.destroy();
    };
  }, [modulePx]);

  return (
    <span ref={host} className="relative inline-flex" aria-hidden="true">
      <InkMark form="strip-h" mode="full" module={modulePx} idle="off" className={live ? 'invisible' : ''} />
    </span>
  );
}
