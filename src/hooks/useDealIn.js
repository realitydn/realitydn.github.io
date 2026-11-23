import { useCallback, useEffect, useRef, useState } from 'react';
import { prefersReducedMotion } from './motion';
import { HANDOFF } from '../components/deck/handoff/mode';

// useDealIn — a card is DEALT onto the page the first time it scrolls into
// view: it arrives small and tilted, straightens, lands with overshoot, and
// its print snaps in on landing (the keyframes are .dk-deal in deck.css).
//
// The same contract as Reveal.jsx, because the same things can go wrong:
//   - the card is ALWAYS in the markup in its end state. Nothing is hidden or
//     shrunk until the moment the animation itself starts, so a visitor with
//     no JavaScript, a crawler and the prerendered HTML all see the finished
//     card, and nothing can be stuck in a pre-animation state;
//   - a card already on screen at load never animates (no jump after a
//     deep-link landing);
//   - reduced motion: never armed;
//   - one shot. A card that has been dealt stays dealt;
//   - when the animation ends the class comes OFF again (`landed`), so the
//     card is back to plain markup: a finished animation that still "fills"
//     leaves an identity transform behind, which would make the card a
//     containing block for anything position:fixed inside it.
//
// Returns [ref, dealing, landed]: put the ref on the card, add the class while
// `dealing` is true, and call `landed` from the card's onAnimationEnd.
export default function useDealIn() {
  const ref = useRef(null);
  const [dealing, setDealing] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return undefined;
    if (window.__PRERENDER__ || prefersReducedMotion()) return undefined;
    // A hand-off under trial (dev server only) replaces the deal.
    if (HANDOFF) return undefined;

    // Already on screen (or above it — a deep link landed lower down): the
    // end state is what's there, leave it.
    if (el.getBoundingClientRect().top < window.innerHeight * 0.92) return undefined;

    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries.find((e) => e.isIntersecting);
        if (!hit) return;
        // Dealt from the bottom of the screen only. A card met while scrolling
        // back UP (after a deep link landed below it) is simply there.
        if (hit.boundingClientRect.top > window.innerHeight * 0.5) setDealing(true);
        io.disconnect();
      },
      // Start a beat before the card's top edge crosses the fold, so the deal
      // is under way as it arrives rather than after it has been seen sitting.
      { rootMargin: '0px 0px 40px 0px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const landed = useCallback((e) => {
    // animationend bubbles: only the card's own animation counts, not one
    // that finished somewhere inside it.
    if (!e || e.target === e.currentTarget) setDealing(false);
  }, []);

  return [ref, dealing, landed];
}
