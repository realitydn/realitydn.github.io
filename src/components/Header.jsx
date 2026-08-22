import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Icons } from './Icons';
import Logo from './Logo';
import InkMark from './InkMark';
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
      {/* gap-1.5 below sm is a fit lever, not a style call: justify-between
          makes the gap a minimum only, and the row is 412.7px deep at phone
          width (wordmark 146.28 + 7px air + 49px strip + controls 170.4 +
          32px padding) — those 6px of slack are exactly what keep the
          module-7 strip on 412px Androids instead of wrapping it away. */}
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-1.5 sm:gap-3">
        {/* Logo + ink strip — the identity pair the sticky masthead now
            carries on every page (Donald: the strip up here is an
            identifiable thing for us; its partner is the footer QR square).
            One module of air off the wordmark, vertically centred, and it
            must never cost the bar its single line: the wrapper is
            height-pinned to the wordmark with flex-wrap + overflow-hidden,
            so on a phone too narrow for the whole strip it wraps onto a
            clipped second row and sits out — the mark never crops, the
            header never grows. */}
        <div className="flex flex-wrap content-start items-center h-6 md:h-7 overflow-hidden">
          <Link to={homeHref} onClick={onLogoClick} className="flex items-center flex-none" aria-label="REALITY home">
            <Logo className="h-6 md:h-7 w-auto" color="var(--fg)" />
          </Link>
          {/* module 8 with 8px air; phones (below sm) drop to 7 — the short
              strip's 6px floor is never crossed. Two prints, one ever
              visible: InkMark pins --m inline, so a breakpoint can't retune
              a single instance. */}
          <span className="hidden sm:flex items-center flex-none ml-2" aria-hidden="true">
            <InkMark form="strip-short-h" mode="full" module={8} idle="slow" />
          </span>
          <span className="flex sm:hidden items-center flex-none ml-[7px]" aria-hidden="true">
            <InkMark form="strip-short-h" mode="full" module={7} idle="slow" />
          </span>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center justify-center gap-8 xl:gap-10 font-title font-bold text-xs tracking-[0.12em]">
          <a href="#events" className="hover:opacity-70 transition-opacity focus:underline">
            {t.use('nav.events')}
          </a>
          <a href="#info" className="hover:opacity-70 transition-opacity focus:underline">
            {t.use('nav.info')}
          </a>
          <a href="#menus" className="hover:opacity-70 transition-opacity focus:underline">
            {t.use('nav.menus')}
          </a>
          <a href="#visit" className="hover:opacity-70 transition-opacity focus:underline">
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
