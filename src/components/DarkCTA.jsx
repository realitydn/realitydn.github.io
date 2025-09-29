import React from 'react';
import { Icons } from './Icons';
import { URLS, STR } from '../data/translations';

export default function DarkCTA({ lang }) {
  return (
    <section className="bg-ink text-cream py-14">
      <div className="max-w-7xl mx-auto px-4 grid md:grid-cols-12 gap-6 items-center">
        <div className="md:col-span-7">
          <h2 className="font-space text-3xl md:text-5xl leading-[1] tracking-tight uppercase">
            {STR[lang].darkTitle}
          </h2>
          <p className="mt-3 text-gray-300 font-mont text-lg">
            {STR[lang].hours}
          </p>
        </div>
        <div className="md:col-span-5 flex flex-wrap gap-3 md:justify-end">
          <div className="relative">
            <a 
              href={URLS.WA} 
              target="_blank" 
              rel="noreferrer" 
              className="relative z-10 inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-cream text-ink font-mont hover:bg-cream/90 transition-colors focus:ring-2 focus:ring-offset-2 focus:ring-cream focus:ring-offset-ink focus:outline-none"
            >
              {Icons.whatsapp('#111')} WhatsApp
            </a>
            <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-pink-500 via-orange-500 to-cyan-500 opacity-50 blur-xl animate-pulse"></div>
          </div>
          <a 
            href={URLS.IG} 
            target="_blank" 
            rel="noreferrer" 
            className="px-5 py-3 rounded-lg bg-transparent border border-cream text-cream font-mont flex items-center gap-2 hover:bg-cream/10 transition-colors focus:ring-2 focus:ring-offset-2 focus:ring-cream focus:ring-offset-ink focus:outline-none"
          >
            {Icons.instagram('#FDFBF7')} Instagram
          </a>
        </div>
      </div>
    </section>
  );
}