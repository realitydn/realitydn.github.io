import React, { useEffect, useRef, useState } from 'react';
import { STR } from '../data/translations';

const STORAGE_KEY = 'reality-theme';
const THEME_COLORS = { day: '#fffbf1', night: '#0a0703' };
const SETTLE_MS = 750; // a hair past --dur-enter so the crossfade completes

/**
 * ThemeToggle — ONE bordered icon button in the masthead (ink pass 22.08.26).
 * The old DAY|NIGHT segmented control read as branding/metaphor; the icon
 * shows the mode a tap switches TO (moon while light, sun while dark), the
 * accessible name speaks the same target mode.
 *
 * The whole site re-skins from data-theme="dark" on <html>; an inline script
 * in index.html applies any saved choice before first paint. While flipping,
 * <html> briefly carries .theme-settling so every surface crossfades together
 * (the slow settle from the demo pages) instead of snapping.
 *
 * Two instances are mounted (desktop masthead + mobile menu); they stay in
 * sync by watching the data-theme attribute rather than sharing state.
 */

// Inline icons — 2px stroke, square linecaps, per the ink-pass icon spec.
function MoonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter" aria-hidden="true">
      <path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4m11.4-11.4 1.4-1.4" />
    </svg>
  );
}
export default function ThemeToggle({ lang = 'EN', compact = false }) {
  const [night, setNight] = useState(() =>
    typeof document !== 'undefined' &&
    document.documentElement.getAttribute('data-theme') === 'dark'
  );
  const settleTimer = useRef(null);

  // Follow the attribute so the twin toggle (and any other writer) stays
  // in sync without lifted state.
  useEffect(() => {
    const root = document.documentElement;
    const mo = new MutationObserver(() => {
      setNight(root.getAttribute('data-theme') === 'dark');
    });
    mo.observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    return () => mo.disconnect();
  }, []);

  // Follow the OS setting live — but only while the visitor hasn't chosen
  // explicitly. (The pre-paint bootstrap in index.html already applies the
  // OS preference on load; this covers an OS theme change mid-visit.)
  useEffect(() => {
    if (!window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e) => {
      try {
        if (localStorage.getItem(STORAGE_KEY)) return; // explicit choice wins
      } catch (err) { /* storage unavailable — just follow the OS */ }
      apply(e.matches, { store: false });
    };
    if (mq.addEventListener) mq.addEventListener('change', onChange);
    else mq.addListener(onChange);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', onChange);
      else mq.removeListener(onChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const apply = (toNight, { store = true } = {}) => {
    const root = document.documentElement;
    const current = root.getAttribute('data-theme') === 'dark';
    if (toNight === current) return;

    // Stamp, don't blink: let the whole page settle into the other mode.
    const reduce = window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduce) {
      root.classList.add('theme-settling');
      clearTimeout(settleTimer.current);
      settleTimer.current = setTimeout(
        () => root.classList.remove('theme-settling'),
        SETTLE_MS
      );
    }

    if (toNight) root.setAttribute('data-theme', 'dark');
    else root.removeAttribute('data-theme');
    setNight(toNight);

    if (store) {
      try {
        localStorage.setItem(STORAGE_KEY, toNight ? 'dark' : 'light');
      } catch (e) { /* private mode etc. — theme just won't persist */ }
    }
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', toNight ? THEME_COLORS.night : THEME_COLORS.day);
  };

  useEffect(() => () => clearTimeout(settleTimer.current), []);

  const labels = (STR[lang] && STR[lang].theme) || STR.EN.theme;

  // The accessible name speaks the mode a tap switches TO, matching the icon.
  // (The locale catalogues are frozen, so the existing day/night words carry
  // it — "Theme: Night" while light, "Theme: Day" while dark.)
  const label = `${labels.group}: ${night ? labels.day : labels.night}`;

  return (
    <button
      type="button"
      onClick={() => apply(!night)}
      aria-label={label}
      title={label}
      className={`btn-secondary flex items-center justify-center ${
        compact ? 'min-w-[44px] min-h-[44px] p-3' : 'min-w-[48px] min-h-[48px] p-3'
      }`}
    >
      {night ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}
