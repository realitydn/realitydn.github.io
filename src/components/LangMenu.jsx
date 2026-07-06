import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LANGS, langByCode, pathFor, stripLangPrefix } from '../data/languages';
import { STR } from '../data/translations';

/**
 * LangMenu — the language switcher, grown from the old EN↔VN toggle into a
 * six-language dropdown. Each item is a real <Link> to the twin route in that
 * language, so the URL stays the source of truth and crawlers see six
 * indexable pages. Native names in the list; the trigger shows the current
 * two-letter label.
 */
export default function LangMenu({ lang, compact = false }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const location = useLocation();
  const base = stripLangPrefix(location.pathname);
  const current = langByCode(lang);
  const menuLabel =
    (STR[lang] && STR[lang].langMenuLabel) || STR.EN.langMenuLabel;

  // Close on route change (a pick navigated), on Escape, on click outside.
  useEffect(() => { setOpen(false); }, [location.pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    const onDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`btn-secondary text-xs flex items-center justify-center gap-1 ${
          compact ? 'px-3 py-3 min-w-[44px] min-h-[44px]' : 'px-3 py-2'
        }`}
        aria-label={menuLabel}
        aria-expanded={open}
        aria-haspopup="true"
      >
        {current.label}
        <svg
          width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"
          className={`transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <path d="M1 3l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="2" />
        </svg>
      </button>

      {open && (
        <nav
          aria-label={menuLabel}
          className="absolute right-0 top-full mt-2 z-50 min-w-[164px] bg-cream border-2 border-ink stamp-in"
          style={{ boxShadow: 'var(--sh-light)' }}
        >
          {LANGS.map((l) => {
            const active = l.code === lang;
            return (
              <Link
                key={l.code}
                to={pathFor(l.code, base)}
                hrefLang={l.iso}
                lang={l.iso}
                aria-current={active ? 'page' : undefined}
                className={`flex items-baseline gap-2 px-4 py-2.5 font-title text-xs tracking-[0.08em] transition-colors ${
                  active ? 'bg-ink text-cream' : 'text-ink hover:bg-ink/5'
                }`}
              >
                <span className="w-6 opacity-60">{l.label}</span>
                <span>{l.native}</span>
              </Link>
            );
          })}
        </nav>
      )}
    </div>
  );
}
