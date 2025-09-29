import React from 'react';
import { Icons } from './Icons';
import { URLS } from '../data/translations';

export default function Header({ lang, setLang, mobileOpen, setMobileOpen, t }) {
  return (
    <header className="sticky top-0 z-40 border-b border-ink/10 bg-cream/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
        {/* Logo */}
        <a href="#top" className="flex items-center" aria-label="REALITY home">
          <img 
            src="/images/reality-logo.png" 
            alt="REALITY" 
            className="h-7 md:h-8 w-auto"
            loading="eager"
          />
        </a>
        
        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center justify-center gap-8 xl:gap-12 font-mont uppercase tracking-[0.2em] text-xs md:text-sm">
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
            className="px-3 py-2 bg-ink text-cream rounded flex items-center gap-2 uppercase tracking-[0.15em] text-xs md:text-[13px] hover:bg-ink/90 transition-colors focus:ring-2 focus:ring-offset-2 focus:ring-ink focus:outline-none"
            aria-label="Join WhatsApp"
          >
            {Icons.whatsapp('#FDFBF7')}
            <span className="hidden sm:inline">WhatsApp</span>
          </a>
          <a 
            href={URLS.IG} 
            target="_blank" 
            rel="noreferrer" 
            className="px-3 py-2 bg-gray-200 text-ink rounded flex items-center gap-2 uppercase tracking-[0.15em] text-xs hover:bg-gray-300 transition-colors focus:ring-2 focus:ring-offset-2 focus:ring-ink focus:outline-none"
            aria-label="Follow on Instagram"
          >
            {Icons.instagram()}
            <span className="hidden xl:inline">Instagram</span>
          </a>
          <a 
            href={URLS.FB} 
            target="_blank" 
            rel="noreferrer" 
            className="px-3 py-2 bg-gray-200 text-ink rounded flex items-center gap-2 uppercase tracking-[0.15em] text-xs hover:bg-gray-300 transition-colors focus:ring-2 focus:ring-offset-2 focus:ring-ink focus:outline-none"
            aria-label="Follow on Facebook"
          >
            {Icons.facebook()}
            <span className="hidden xl:inline">Facebook</span>
          </a>
          <button 
            onClick={() => setLang(lang === 'EN' ? 'VI' : 'EN')} 
            className="px-3 py-2 border border-ink/20 rounded uppercase tracking-[0.15em] text-xs w-[54px] hover:border-ink/40 transition-colors focus:ring-2 focus:ring-offset-2 focus:ring-ink focus:outline-none"
            aria-label="Toggle language"
          >
            {lang === 'EN' ? 'VN' : 'EN'}
          </button>
        </div>
        
        {/* Mobile Actions */}
        <div className="flex md:hidden items-center gap-2">
          <a 
            href={URLS.WA} 
            className="p-2 rounded bg-ink hover:bg-ink/90 transition-colors focus:ring-2 focus:ring-offset-2 focus:ring-ink focus:outline-none" 
            aria-label="WhatsApp"
          >
            {Icons.whatsapp('#FDFBF7')}
          </a>
          <a 
            href={URLS.IG} 
            className="p-2 rounded bg-gray-200 hover:bg-gray-300 transition-colors focus:ring-2 focus:ring-offset-2 focus:ring-ink focus:outline-none" 
            aria-label="Instagram"
          >
            {Icons.instagram()}
          </a>
          <a 
            href={URLS.FB} 
            className="p-2 rounded bg-gray-200 hover:bg-gray-300 transition-colors focus:ring-2 focus:ring-offset-2 focus:ring-ink focus:outline-none" 
            aria-label="Facebook"
          >
            {Icons.facebook()}
          </a>
          <button 
            onClick={() => setLang(lang === 'EN' ? 'VI' : 'EN')} 
            className="px-2 py-2 border border-ink/20 rounded text-xs hover:border-ink/40 transition-colors focus:ring-2 focus:ring-offset-2 focus:ring-ink focus:outline-none" 
            aria-label="Toggle language"
          >
            {lang === 'EN' ? 'VN' : 'EN'}
          </button>
          <button 
            onClick={() => setMobileOpen(v => !v)} 
            className="p-2 border border-ink/20 rounded hover:border-ink/40 transition-colors focus:ring-2 focus:ring-offset-2 focus:ring-ink focus:outline-none" 
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
          >
            {mobileOpen ? Icons.close() : Icons.menu()}
          </button>
        </div>
      </div>
      
      {/* Mobile Navigation */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-ink/10 bg-cream">
          <nav className="max-w-7xl mx-auto px-4 py-3 grid grid-cols-2 gap-3 font-mont uppercase tracking-[0.2em] text-xs">
            <a 
              onClick={() => setMobileOpen(false)} 
              href="#events" 
              className="px-4 py-3 rounded-xl border border-ink/15 hover:bg-ink hover:text-cream transition-colors text-center focus:ring-2 focus:ring-offset-2 focus:ring-ink focus:outline-none"
            >
              {t.use('nav.events')}
            </a>
            <a 
              onClick={() => setMobileOpen(false)} 
              href="#info" 
              className="px-4 py-3 rounded-xl border border-ink/15 hover:bg-ink hover:text-cream transition-colors text-center focus:ring-2 focus:ring-offset-2 focus:ring-ink focus:outline-none"
            >
              {t.use('nav.info')}
            </a>
            <a 
              onClick={() => setMobileOpen(false)} 
              href="#menus" 
              className="px-4 py-3 rounded-xl border border-ink/15 hover:bg-ink hover:text-cream transition-colors text-center focus:ring-2 focus:ring-offset-2 focus:ring-ink focus:outline-none"
            >
              {t.use('nav.menus')}
            </a>
            <a 
              onClick={() => setMobileOpen(false)} 
              href="#visit" 
              className="px-4 py-3 rounded-xl border border-ink/15 hover:bg-ink hover:text-cream transition-colors text-center focus:ring-2 focus:ring-offset-2 focus:ring-ink focus:outline-none"
            >
              {t.use('nav.visit')}
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}