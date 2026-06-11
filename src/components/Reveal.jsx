import React, { useEffect, useRef, useState } from 'react';

/**
 * Reveal — stamps a block in the first time it scrolls into view.
 *
 * Built for the prerender contract: content is ALWAYS in the HTML in its
 * end-state. Blocks already on screen at load never animate (no hydration
 * jump); blocks below the fold get the stamp animation the first time
 * they enter. Reduced motion: never armed.
 *
 * `stagger` plays the block's direct children 90ms apart instead of the
 * whole block at once.
 */
export default function Reveal({ children, className = '', stagger = false }) {
  const ref = useRef(null);
  const [play, setPlay] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    if (window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    // Already (almost) visible at mount — ship the end-state, no animation.
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.95) return;

    // Arm a beat BEFORE the block scrolls on (positive bottom margin extends
    // the observed area below the fold). Visible content must never blink
    // out and re-animate — the stamp plays as the block arrives.
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setPlay(true);
          io.disconnect();
        }
      },
      { rootMargin: '0px 0px 48px 0px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const anim = play ? (stagger ? 'stamp-stagger-go' : 'stamp-go') : '';
  return (
    <div ref={ref} className={`${className} ${anim}`.trim()}>
      {children}
    </div>
  );
}
