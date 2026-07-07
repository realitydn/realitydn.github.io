import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Icons } from './Icons';
import Logo from './Logo';
import ThemeToggle from './ThemeToggle';
import LangMenu from './LangMenu';
import { URLS } from '../data/translations';
import { pathFor } from '../data/languages';

export default function Header({ lang, mobileOpen, setMobileOpen, t }) {
  const location = useLocation();
  const path = location.pathname;

  const homeHref = pathFor(lang, '/');

  const onLogoClick = (e) => {
    if (path === homeHref) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <header
      className="sticky top-0 z-40 bg-cream"
      style={{ borderBottom: '3px solid var(--fg)' }}
    >
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
        {/* Logo */}
        <Link to={homeHref} onClick={onLogoClick} className="flex items-center" aria-label="REALITY home">
          <Logo className="h-6 md:h-7 w-auto" color="var(--fg)" />
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center justify-center gap-8 xl:gap-10 font-title font-bold text-xs tracking-[0.12em]">
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
            compact mobile layout with a hamburger. The app is now the site's
            one loud call (red primary, icon + label); the socials ride quietly
            as icon-only buttons so the bar stays uncrowded. */}
        <div className="hidden lg:flex items-center gap-2">
          <a
            href={`${URLS.APP}/?utm_source=website&utm_medium=header`}
            target="_blank"
            rel="noreferrer"
            className="btn-primary px-3.5 py-2 flex items-center gap-2 text-xs"
            aria-label={t.use('getApp.title')}
          >
            {Icons.app()}
            <span>{t.use('getApp.button')}</span>
          </a>
          <a
            href={URLS.WA}
            target="_blank"
            rel="noreferrer"
            className="btn-secondary p-2 flex items-center justify-center"
            aria-label="Join WhatsApp"
          >
            {Icons.whatsapp()}
          </a>
          <a
            href={URLS.IG}
            target="_blank"
            rel="noreferrer"
            className="btn-secondary p-2 flex items-center justify-center"
            aria-label="Follow on Instagram"
          >
            {Icons.instagram()}
          </a>
          <a
            href={URLS.FB}
            target="_blank"
            rel="noreferrer"
            className="btn-secondary p-2 flex items-center justify-center"
            aria-label="Follow on Facebook"
          >
            {Icons.facebook()}
          </a>
          <LangMenu lang={lang} />
          <ThemeToggle lang={lang} />
        </div>

        {/* Mobile + tablet actions — shown below lg. Touch targets are 44px+.
            The app is the primary (red) here too; WhatsApp rides as a quiet
            icon so the community funnel stays one tap away. */}
        <div className="flex lg:hidden items-center gap-1 sm:gap-2">
          <a
            href={`${URLS.APP}/?utm_source=website&utm_medium=header_mobile`}
            target="_blank"
            rel="noreferrer"
            className="btn-primary p-3 min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label={t.use('getApp.title')}
          >
            {Icons.app()}
          </a>
          <a
            href={URLS.WA}
            className="btn-secondary p-3 min-w-[44px] min-h-[44px] hidden sm:flex items-center justify-center"
            aria-label="WhatsApp"
          >
            {Icons.whatsapp()}
          </a>
          <LangMenu lang={lang} compact />
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
        <div id="mobile-nav" className="lg:hidden bg-cream" style={{ borderTop: '2px solid var(--fg)' }}>
          <nav className="max-w-7xl mx-auto px-4 py-3 grid grid-cols-2 gap-3 font-title font-bold text-xs tracking-[0.12em] stamp-stagger">
            {/* The app CTA leads the mobile menu, full-width and loud. */}
            <a
              onClick={() => setMobileOpen(false)}
              href={`${URLS.APP}/?utm_source=website&utm_medium=header_menu`}
              target="_blank"
              rel="noreferrer"
              className="btn-primary col-span-2 px-4 py-3 flex items-center justify-center gap-2"
              style={{ '--ri': 0 }}
            >
              {Icons.app()} {t.use('getApp.title')}
            </a>
            <a
              onClick={() => setMobileOpen(false)}
              href="#events"
              className="btn-secondary px-4 py-3 text-center"
              style={{ '--ri': 0 }}
            >
              {t.use('nav.events')}
            </a>
            <a
              onClick={() => setMobileOpen(false)}
              href="#info"
              className="btn-secondary px-4 py-3 text-center"
              style={{ '--ri': 1 }}
            >
              {t.use('nav.info')}
            </a>
            <a
              onClick={() => setMobileOpen(false)}
              href="#menus"
              className="btn-secondary px-4 py-3 text-center"
              style={{ '--ri': 2 }}
            >
              {t.use('nav.menus')}
            </a>
            <a
              onClick={() => setMobileOpen(false)}
              href="#visit"
              className="btn-secondary px-4 py-3 text-center"
              style={{ '--ri': 3 }}
            >
              {t.use('nav.visit')}
            </a>
            <div className="col-span-2 flex justify-between items-center gap-3 pt-1">
              <a
                href={URLS.FB}
                className="btn-secondary px-4 py-3 flex-1 flex items-center justify-center gap-2"
                aria-label="Facebook"
                style={{ '--ri': 4 }}
              >
                {Icons.facebook()} Facebook
              </a>
              <div style={{ '--ri': 5 }}>
                <ThemeToggle lang={lang} compact />
              </div>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
