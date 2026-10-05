import { useEffect, useState } from 'react';

// useNight — true while <html data-theme="dark"> is set (Night v2 "Cream
// Tickets", 5.10.26). For the few places where Night changes STRUCTURE, not
// just paint — since round 2 only the band fields (BandField sits out at
// night; the tickets render in both themes): everything that is only colour
// stays in CSS.
//
// Reads the attribute the pre-paint bootstrap (index.html) already set, so
// the first client render is the right theme; follows ThemeToggle (and any
// other writer) through a MutationObserver. The prerender has no saved theme
// and a light colour-scheme, so the static HTML is always the Day structure.

const isNight = () =>
  typeof document !== 'undefined' &&
  document.documentElement.getAttribute('data-theme') === 'dark';

export default function useNight() {
  const [night, setNight] = useState(isNight);
  useEffect(() => {
    const root = document.documentElement;
    setNight(isNight());
    const mo = new MutationObserver(() => setNight(isNight()));
    mo.observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    return () => mo.disconnect();
  }, []);
  return night;
}
