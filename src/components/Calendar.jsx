import React from 'react';
import { Icons } from './Icons';
import { URLS, STR } from '../data/translations';

export default function Calendar({ lang }) {
  return (
    <section id="calendar" className="max-w-7xl mx-auto px-4 py-12">
      <div className="rounded-3xl overflow-hidden border border-ink/10 bg-white shadow-lg">
        <iframe 
          title="Reality – Google Calendar" 
          src={URLS.CAL}
          className="w-full h-[400px] md:h-[600px] lg:h-[700px] xl:h-[800px]"
          style={{ border: 0 }}
          loading="lazy"
        />
      </div>
      <div className="mt-6 flex flex-col items-center gap-3">
        <div className="relative">
          <a 
            href={URLS.WA} 
            target="_blank" 
            rel="noreferrer" 
            className="relative z-10 inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-ink text-cream font-mont hover:bg-ink/90 transition-colors focus:ring-2 focus:ring-offset-2 focus:ring-ink focus:outline-none"
          >
            {Icons.whatsapp('#FDFBF7')} 
            {STR[lang].joinWA}
          </a>
          <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-pink-500 via-orange-500 to-cyan-500 opacity-100 blur-xl animate-pulse"></div>
        </div>
        <p className="text-center text-sm text-gray-600 font-mont max-w-2xl">
          {STR[lang].waBlurb}
        </p>
      </div>
    </section>
  );
}