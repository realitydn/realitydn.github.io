import React, { useEffect, useRef, useState } from 'react';

const STORAGE_KEY = 'reality-theme';
const THEME_COLORS = { day: '#fffbf1', night: '#0a0703' };
const SETTLE_MS = 750; // a hair past --dur-enter so the crossfade completes

/**
 * ThemeToggle — the Day / Night segmented control from the Year 2 masthead.
 *
 * The whole site re-skins from data-theme="dark" on <html>; an inline script
 * in index.html applies any saved choice before first paint. While flipping,
 * <html> briefly carries .theme-settling so every surface crossfades together
 * (the slow settle from the demo pages) instead of snapping.
 *
 * Two instances are mounted (desktop masthead + mobile menu); they stay in
 * sync by watching the data-theme attribute rather than sharing state.
 */
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

  const labels = lang === 'VN'
    ? { group: 'Giao diện', day: 'Ngày', night: 'Đêm' }
    : { group: 'Theme', day: 'Day', night: 'Night' };

  const seg = (active) =>
    `font-title text-[10px] tracking-[0.12em] transition-colors ${
      compact ? 'px-2.5' : 'px-3'
    } flex items-center justify-center ${
      active ? 'bg-ink text-cream' : 'bg-transparent text-ink/60 hover:text-ink'
    }`;

  return (
    <div
      role="group"
      aria-label={labels.group}
      className="flex items-stretch border-2 border-ink bg-cream"
      style={{ boxShadow: 'var(--sh-light)', minHeight: compact ? 36 : 44 }}
    >
      <button
        type="button"
        onClick={() => apply(false)}
        aria-pressed={!night}
        className={seg(!night)}
      >
        {labels.day}
      </button>
      <button
        type="button"
        onClick={() => apply(true)}
        aria-pressed={night}
        className={seg(night)}
      >
        {labels.night}
      </button>
    </div>
  );
}
