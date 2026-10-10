/* The full ink strip, alive — the masthead's mark (Donald 10.10.26: "the
   website should have full strip"). At rest it is the plain InkMark; every
   ~5s while it's on screen it gives a new AMBIENT performance — a score
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
   are eligible (maxOverflow), drawn at whole modules at this size. `form`
   strip-short-h (phones) draws from the scores written for any width;
   `form="square"` (the footer, beside the QR) from the 14 square scores. */

import { useEffect, useRef } from 'react';
import InkMark from './InkMark';

const SITE_PALETTE = {
  R: 'var(--red)', B: 'var(--blue)', Y: 'var(--yellow)', G: 'var(--green)',
  P: 'var(--pink)', A: 'var(--amber)', U: 'var(--purple)', K: '#0d0905', S: 'transparent', // stock is empty on screen
};
const FIRST = [2500, 1500]; // first performance: 2.5–4s after the page settles
const EVERY = [4000, 2000]; // then a new one every 4–6s (Donald: ~5s)

const later = ([base, spread]) => base + Math.random() * spread;

export default function InkMotionMark({ module: modulePx = 8, form = 'strip-h' }) {
  const width = form === 'strip-short-h' ? 7 : 9;
  const square = form === 'square';
  const host = useRef(null);
  const still = useRef(null);

  useEffect(() => {
    const el = host.current;
    if (!el || navigator.webdriver || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    let alive = true;
    let inView = true;
    let timer = 0;
    let player = null;
    let unsnap = null;
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
        unsnap ??= m.snapToPixels(el);
        const lite = m.isLiteDevice();
        // The footer square sits flush against the QR: nothing may leave it
        // (Drop only falls, so it may). The masthead strip allows half a module.
        const v = m.pick('amb', { module: modulePx, width, square, lite, last: m.lastSeen(square ? 'amb-square' : 'amb'), maxOverflow: square ? 0 : 0.5 });
        if (!v || !alive) return;
        m.remember(square ? 'amb-square' : 'amb', v.id);
        // The player hides/shows the static mark itself, in the same task as
        // the layer goes up/down — no React state, so no blank frame between.
        // Half-cell scores draw at whole modules here (8px: halves would be
        // under the canon floor) — grainFor picks the finest that fits.
        const grain = m.grainFor(v, { module: modulePx, lite }) ?? undefined;
        const seg = m.segmentFor(v, 'amb');
        player = new m.InkPlayer(el, v, { module: modulePx, width, palette: SITE_PALETTE, grain, restAt: m.segEnd(seg), cover: still.current });
        await player.once(seg);
      } catch {
        return; // chunk failed: the static mark stands, no retries
      } finally {
        player?.destroy();
        player = null;
      }
      if (alive) timer = window.setTimeout(perform, later(EVERY));
    };
    timer = window.setTimeout(perform, later(FIRST));
    return () => {
      alive = false;
      window.clearTimeout(timer);
      io?.disconnect();
      unsnap?.();
      player?.destroy();
    };
  }, [modulePx, width, square]);

  return (
    <span ref={host} className="relative inline-flex" aria-hidden="true">
      <span ref={still} className="inline-flex">
        <InkMark form={form} mode="full" module={modulePx} idle="off" />
      </span>
    </span>
  );
}
