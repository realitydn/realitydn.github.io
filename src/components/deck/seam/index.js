import { useEffect } from 'react';
import { createStage } from './stage';
import seam from './seam';
import { isStill } from '../parts';
import { prefersReducedMotion } from '../../../hooks/motion';
import { landingTarget } from '../../../hooks/useHashLanding';

// THE SEAM — the home page's scroll (./seam.js says what it is, ./stage.js
// what it stands on, ./seam.css what it looks like).
//
// It is all added by this file once the page runs. So:
//   - with no JavaScript, and in the prerendered HTML, the page is a plain
//     scroll with every card in its end state;
//   - under prefers-reduced-motion it never starts: the same plain scroll.
//     (If the setting changes while the page is open, it starts or stops.)
//
// TO TURN IT OFF: remove the useSeam() call in App.jsx. Nothing else on the
// page depends on it.

const REDUCE = '(prefers-reduced-motion: reduce)';

export function startSeam() {
  if (typeof window === 'undefined' || isStill() || prefersReducedMotion()) return () => {};
  const stage = createStage(seam);
  if (!stage) return () => {};
  stage.start();

  // On a deep link, land where the hash points once more: starting the seam
  // has moved things since the browser's own jump (and useHashLanding's).
  // Only the hash the page was LOADED on is held like this, and only until
  // the visitor does anything.
  const target = landingTarget(window.location.hash);
  const land = () => {
    if (stage.touched || !target) return;
    const el = document.getElementById(target.id);
    if (!el) return;
    const root = document.documentElement;
    const prev = root.style.scrollBehavior;
    root.style.scrollBehavior = 'auto';
    el.scrollIntoView({ block: 'start' });
    root.style.scrollBehavior = prev;
  };
  land();
  // …and again whenever a height changes (the feed, the fonts, a poster)
  // until the visitor scrolls on their own.
  stage.onMeasure = land;
  const release = () => { stage.touched = true; };
  window.addEventListener('hashchange', release);

  return () => {
    window.removeEventListener('hashchange', release);
    stage.stop();
  };
}

// useSeam — starts the seam on the home page. `dep` restarts it when the page
// is re-rendered for another language (the sections are new elements then).
export default function useSeam(dep) {
  useEffect(() => {
    let stop = startSeam();
    const mq = window.matchMedia ? window.matchMedia(REDUCE) : null;
    const onChange = () => { stop(); stop = startSeam(); };
    if (mq && mq.addEventListener) mq.addEventListener('change', onChange);
    return () => {
      if (mq && mq.removeEventListener) mq.removeEventListener('change', onChange);
      stop();
    };
  }, [dep]);
}
