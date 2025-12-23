import React from 'react';
import { Icons } from './Icons';
import Logo from './Logo';
import { URLS } from '../data/translations';

export default function Header({ lang, setLang, mobileOpen, setMobileOpen, t }) {
  return (
    <header className="sticky top-0 z-40 bg-cream" style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
        {/* Logo */}
        <a href="#top" className="flex items-center" aria-label="REALITY home">
          <Logo className="h-6 md:h-7 w-auto" color="#0d0906" />
        </a>
        
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
        
        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-2">
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
          <button 
            onClick={() => setLang(lang === 'EN' ? 'VI' : 'EN')} 
            className="btn-secondary px-3 py-2 font-title text-xs tracking-[0.15em] w-[54px]"
            aria-label="Toggle language"
          >
            {lang === 'EN' ? 'VN' : 'EN'}
          </button>
        </div>
        
        {/* Mobile Actions */}
        <div className="flex md:hidden items-center gap-2">
          <a 
            href={URLS.WA} 
            className="btn-primary p-2" 
            aria-label="WhatsApp"
          >
            {Icons.whatsapp('#FFFBF2')}
          </a>
          <a 
            href={URLS.IG} 
            className="btn-secondary p-2" 
            aria-label="Instagram"
          >
            {Icons.instagram()}
          </a>
          <a 
            href={URLS.FB} 
            className="btn-secondary p-2" 
            aria-label="Facebook"
          >
            {Icons.facebook()}
          </a>
          <button 
            onClick={() => setLang(lang === 'EN' ? 'VI' : 'EN')} 
            className="btn-secondary px-2 py-2 font-title text-xs" 
            aria-label="Toggle language"
          >
            {lang === 'EN' ? 'VN' : 'EN'}
          </button>
          <button 
            onClick={() => setMobileOpen(v => !v)} 
            className="btn-secondary p-2" 
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
          >
            {mobileOpen ? Icons.close() : Icons.menu()}
          </button>
        </div>
      </div>
      
      {/* Mobile Navigation */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-ink/10 bg-cream">
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
