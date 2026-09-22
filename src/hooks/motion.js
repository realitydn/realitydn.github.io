// motion.js — the reduced-motion question, asked in one place.
//
// CSS already honours prefers-reduced-motion (index.css drops html's
// scroll-behavior: smooth), but a scrollIntoView / scrollTo called with an
// explicit behavior: 'smooth' overrides the stylesheet — so every scripted
// scroll asks here instead of hard-coding the glide.

export function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    !!window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

// 'smooth' for most visitors, 'auto' (an instant jump) under reduced motion.
export function scrollBehavior() {
  return prefersReducedMotion() ? 'auto' : 'smooth';
}
