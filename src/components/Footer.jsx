import React from 'react';
import { Icons } from './Icons';
import { URLS, STR } from '../data/translations';

export default function Footer({ lang }) {
  return (
    <footer className="border-t border-ink/10 mt-10">
      <div className="max-w-7xl mx-auto px-4 py-12 grid grid-cols-12 gap-6">
        <div className="col-span-12 md:col-span-6">
          <img 
            src="/images/reality-logo.png" 
            alt="REALITY" 
            className="h-8 w-auto mb-3"
            loading="lazy"
          />
          <p className="text-gray-700 font-mont">86 Mai Thúc Lân, Đà Nẵng</p>
          <p className="text-gray-700 font-mont">{STR[lang].hours}</p>
        </div>
        <div className="col-span-12 md:col-span-6 md:text-right">
          <div className="uppercase text-xs tracking-[0.25em] text-gray-600 font-mont">
            Stay in touch
          </div>
          <div className="mt-4 flex md:justify-end gap-4 flex-wrap">
            <div className="relative">
              <a 
                href={URLS.WA} 
                target="_blank" 
                rel="noreferrer" 
                className="relative z-10 inline-flex items-center gap-2 px-5 py-3 bg-ink text-cream font-mont rounded hover:bg-ink/90 transition-colors focus:ring-2 focus:ring-offset-2 focus:ring-ink focus:outline-none"
              >
                {Icons.whatsapp('#FDFBF7')} WhatsApp
              </a>
              <div className="absolute inset-0 rounded bg-gradient-to-r from-pink-500 via-orange-500 to-cyan-500 opacity-40 blur-xl animate-pulse"></div>
            </div>
            <a 
              href={URLS.IG} 
              target="_blank" 
              rel="noreferrer" 
              className="px-5 py-3 bg-gray-200 text-ink font-mont rounded hover:bg-gray-300 flex items-center gap-2 transition-colors focus:ring-2 focus:ring-offset-2 focus:ring-ink focus:outline-none"
            >
              {Icons.instagram()} Instagram
            </a>
            <a 
              href={URLS.FB} 
              target="_blank" 
              rel="noreferrer" 
              className="px-5 py-3 bg-gray-200 text-ink font-mont rounded hover:bg-gray-300 flex items-center gap-2 transition-colors focus:ring-2 focus:ring-offset-2 focus:ring-ink focus:outline-none"
            >
              {Icons.facebook()} Facebook
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}