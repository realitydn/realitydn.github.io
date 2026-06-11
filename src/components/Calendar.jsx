import React from 'react';
import { Icons } from './Icons';
import { URLS, STR } from '../data/translations';

export default function Calendar({ lang }) {
  return (
    <section id="calendar" className="section max-w-7xl mx-auto px-4 py-12">
      <div className="card-static card-lg overflow-hidden">
        <iframe
          title="Reality — Google Calendar"
          src={URLS.CAL}
          className="w-full h-[400px] md:h-[600px] lg:h-[700px] xl:h-[800px]"
          style={{ border: 0 }}
          loading="lazy"
        />
      </div>
      <div className="mt-8 flex flex-col items-center gap-4">
        <a
          href={URLS.WA}
          target="_blank"
          rel="noreferrer"
          className="btn-primary px-6 py-4 text-sm flex items-center gap-3"
        >
          {Icons.whatsapp()}
          {STR[lang].joinWA}
        </a>
        <p className="text-center text-sm text-gray-600 font-body max-w-2xl">
          {STR[lang].waBlurb}
        </p>
      </div>
    </section>
  );
}
