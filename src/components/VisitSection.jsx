import React from 'react';
import { Icons } from './Icons';
import { URLS, STR } from '../data/translations';

export default function VisitSection({ lang, t }) {
  return (
    <section id="visit" className="max-w-7xl mx-auto px-4 py-16">
      <div className="grid grid-cols-12 gap-6 items-start">
        <div className="col-span-12 md:col-span-5">
          <h2 className="font-space text-3xl md:text-5xl leading-[1] tracking-tight uppercase text-ink">
            {t.use('findUs')}
          </h2>
          <p className="mt-3 font-mont text-gray-700 flex items-center gap-2">
            {Icons.pin()} 86 Mai Thúc Lân, Đà Nẵng
          </p>
          <p className="font-mont text-gray-700">
            {STR[lang].hours}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <div className="relative">
              <a 
                className="relative z-10 inline-flex items-center gap-2 px-5 py-3 bg-ink text-cream rounded-lg font-mont hover:bg-ink/90 transition-colors focus:ring-2 focus:ring-offset-2 focus:ring-ink focus:outline-none" 
                href={URLS.WA} 
                target="_blank" 
                rel="noreferrer"
                aria-label="Join WhatsApp"
              >
                {Icons.whatsapp('#FDFBF7')} WhatsApp
              </a>
              <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-pink-500 via-orange-500 to-cyan-500 opacity-40 blur-xl animate-pulse"></div>
            </div>
            <a 
              className="px-5 py-3 bg-gray-200 text-ink rounded-lg font-mont flex items-center gap-2 hover:bg-gray-300 transition-colors focus:ring-2 focus:ring-offset-2 focus:ring-ink focus:outline-none" 
              href={URLS.IG} 
              target="_blank" 
              rel="noreferrer"
              aria-label="Follow on Instagram"
            >
              {Icons.instagram()} Instagram
            </a>
            <a 
              className="px-5 py-3 bg-gray-200 text-ink rounded-lg font-mont flex items-center gap-2 hover:bg-gray-300 transition-colors focus:ring-2 focus:ring-offset-2 focus:ring-ink focus:outline-none" 
              href={URLS.FB} 
              target="_blank" 
              rel="noreferrer"
              aria-label="Follow on Facebook"
            >
              {Icons.facebook()} Facebook
            </a>
          </div>
        </div>
        <div className="col-span-12 md:col-span-7">
          <div className="rounded-3xl overflow-hidden border border-ink/10 bg-white shadow-lg">
            <iframe 
              title="Reality – Google Maps" 
              src={URLS.MAP} 
              className="w-full h-[420px]" 
              style={{ border: 0 }} 
              loading="lazy" 
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      </div>
    </section>
  );
}