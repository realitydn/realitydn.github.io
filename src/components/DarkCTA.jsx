import React from 'react';
import { Icons } from './Icons';
import { URLS, STR } from '../data/translations';

export default function DarkCTA({ lang }) {
  return (
    <section className="section bg-ink text-cream py-16">
      <div className="max-w-7xl mx-auto px-4 grid md:grid-cols-12 gap-6 items-center">
        <div className="md:col-span-7">
          <h2 className="font-title text-3xl md:text-5xl leading-[1] tracking-[0.1em]">
            {STR[lang].darkTitle}
          </h2>
          <p className="mt-3 text-gray-300 font-body text-lg">
            {STR[lang].hours}
          </p>
        </div>
        <div className="md:col-span-5 flex flex-wrap gap-3 md:justify-end">
          <a 
            href={URLS.WA} 
            target="_blank" 
            rel="noreferrer" 
            className="px-5 py-3 bg-cream text-ink font-title text-sm tracking-[0.15em] flex items-center gap-2 transition-all hover:translate-y-[-2px]"
            style={{ boxShadow: '0 4px 12px rgba(255,251,242,0.3)' }}
          >
            {Icons.whatsapp('#0d0906')} WhatsApp
          </a>
          <a 
            href={URLS.IG} 
            target="_blank" 
            rel="noreferrer" 
            className="px-5 py-3 border border-cream text-cream font-title text-sm tracking-[0.15em] flex items-center gap-2 hover:bg-cream/10 transition-colors"
          >
            {Icons.instagram('#FFFBF2')} Instagram
          </a>
        </div>
      </div>
    </section>
  );
}
