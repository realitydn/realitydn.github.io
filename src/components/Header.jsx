import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Icons } from './Icons';
import Logo from './Logo';
import { URLS } from '../data/translations';

export default function Header({ lang, mobileOpen, setMobileOpen, t }) {
  const location = useLocation();
  const path = location.pathname;

  // Precompute the twin path in the other language. /foo ↔ /vn/foo, / ↔ /vn.
  const otherLangPath = lang === 'VN'
    ? (path === '/vn' ? '/' : path.replace(/^\/vn/, '') || '/')
    : (path === '/' ? '/vn' : `/vn${path}`);

  const onLogoClick = (e) => {
    const home = lang === 'VN' ? '/vn' : '/';
    if (path === home) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const homeHref = lang === 'VN' ? '/vn' : '/';

  return (
    <header className="sticky top-0 z-40 bg-cream" style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
        {/* Logo */}
        <Link to={homeHref} onClick={onLogoClick} className="flex items-center" aria-label="REALITY home">
          <Logo className="h-6 md:h-7 w-auto" color="#0d0906" />
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center justify-center gap-8 xl:gap-12 font-title text-xs md:text-sm tracking-[0.2em]">
          <a href="#events" className="hover:opacity-70 transition-opacity focus:underline focus:outline-none">
            {t.use('nav.events')}
          </a>
          <a href="#info" className="hover:opacity-70 transition-opacity focus:underline focus:outline-none">
            {t.use('nav.info')}
          </a>
          <a href="#menus" className="hover:opacity-70 transition-opacity focus:underline focus:outline-none">
            {t.use('nav.menus')}
          </a>
          <a href="#visit" className="hover:opacity-70 transition-opacity focus:underline focus:outline-none">
            {t.use('nav.visit')}
          </a>
        </nav>

        {/* Desktop Actions — only at lg+ so the md (tablet) viewport uses the
            compact mobile layout with a hamburger. Previously these showed at
            md which left tablet users with no way to open the nav. */}
        <div className="hidden lg:flex items-center gap-2">
          <a
            href={URLS.WA}
            target="_blank"
            rel="noreferrer"
            className="btn-primary px-3 py-2 flex items-center gap-2 font-title text-xs tracking-[0.15em]"
            aria-label="Join WhatsApp"
          >
            {Icons.whatsapp('#FFFBF2')}
            <span className="hidden sm:inline">WhatsApp</span>
          </a>
          <a
            href={URLS.IG}
            target="_blank"
            rel="noreferrer"
            className="btn-secondary px-3 py-2 flex items-center gap-2 font-title text-xs tracking-[0.15em]"
            aria-label="Follow on Instagram"
          >
            {Icons.instagram()}
            <span className="hidden xl:inline">Instagram</span>
          </a>
          <a
            href={URLS.FB}
            target="_blank"
            rel="noreferrer"
            className="btn-secondary px-3 py-2 flex items-center gap-2 font-title text-xs tracking-[0.15em]"
            aria-label="Follow on Facebook"
          >
            {Icons.facebook()}
            <span className="hidden xl:inline">Facebook</span>
          </a>
          {/* Language toggle — navigates to the twin route so the URL is the
              source of truth for language. Crawlers see two indexable pages. */}
          <Link
            to={otherLangPath}
            className="btn-secondary px-3 py-2 font-title text-xs tracking-[0.15em] w-[54px] text-center"
            aria-label={lang === 'EN' ? 'Xem bằng tiếng Việt' : 'View in English'}
            hrefLang={lang === 'EN' ? 'vi' : 'en'}
          >
            {lang === 'EN' ? 'VN' : 'EN'}
          </Link>
        </div>

        {/* Mobile + tablet actions — shown below lg. Touch targets are 44px+
            (p-3 with 22px icons = 46x46), meeting HIG / Material recs. */}
        <div className="flex lg:hidden items-center gap-1 sm:gap-2">
          <a
            href={URLS.WA}
            className="btn-primary p-3 min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="WhatsApp"
          >
            {Icons.whatsapp('#FFFBF2')}
          </a>
          <a
            href={URLS.IG}
            className="btn-secondary p-3 min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Instagram"
          >
            {Icons.instagram()}
          </a>
          <a
            href={URLS.FB}
            className="btn-secondary p-3 min-w-[44px] min-h-[44px] hidden sm:flex items-center justify-center"
            aria-label="Facebook"
          >
            {Icons.facebook()}
          </a>
          <Link
            to={otherLangPath}
            className="btn-secondary px-3 py-3 min-w-[44px] min-h-[44px] flex items-center justify-center font-title text-xs"
            aria-label={lang === 'EN' ? 'Xem bằng tiếng Việt' : 'View in English'}
            hrefLang={lang === 'EN' ? 'vi' : 'en'}
          >
            {lang === 'EN' ? 'VN' : 'EN'}
          </Link>
          <button
            onClick={() => setMobileOpen(v => !v)}
            className="btn-secondary p-3 min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav"
          >
            {mobileOpen ? Icons.close() : Icons.menu()}
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {mobileOpen && (
        <div id="mobile-nav" className="lg:hidden border-t border-ink/10 bg-cream">
          <nav className="max-w-7xl mx-auto px-4 py-3 grid grid-cols-2 gap-3 font-title text-xs tracking-[0.2em]">
            <a
              onClick={() => setMobileOpen(false)}
              href="#events"
              className="btn-secondary px-4 py-3 text-center"
            >
              {t.use('nav.events')}
            </a>
            <a
              onClick={() => setMobileOpen(false)}
              href="#info"
              className="btn-secondary px-4 py-3 text-center"
            >
              {t.use('nav.info')}
            </a>
            <a
              onClick={() => setMobileOpen(false)}
              href="#menus"
              className="btn-secondary px-4 py-3 text-center"
            >
              {t.use('nav.menus')}
            </a>
            <a
              onClick={() => setMobileOpen(false)}
              href="#visit"
              className="btn-secondary px-4 py-3 text-center"
            >
              {t.use('nav.visit')}
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}
