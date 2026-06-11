import React from 'react';
import { Icons } from './Icons';
import Reveal from './Reveal';
import { URLS, STR } from '../data/translations';

export default function VisitSection({ lang, t }) {
  return (
    <section id="visit" className="section max-w-7xl mx-auto px-4 py-16">
      <Reveal stagger className="grid grid-cols-12 gap-6 items-start">
        <div className="col-span-12 md:col-span-5">
          <div className="card-static p-8">
            <h2 className="h-section text-3xl md:text-4xl text-ink">
              {t.use('findUs')}
            </h2>
            <p className="mt-4 font-body text-gray-700 flex items-center gap-2">
              {Icons.pin()} 86 Mai Thúc Lân, Đà Nẵng
            </p>
            <p className="font-body text-gray-700">
              {STR[lang].hours}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a
                className="btn-primary px-5 py-3 text-sm flex items-center gap-2"
                href={URLS.WA}
                target="_blank"
                rel="noreferrer"
                aria-label="Join WhatsApp"
              >
                {Icons.whatsapp()} WhatsApp
              </a>
              <a
                className="btn-secondary px-5 py-3 text-sm flex items-center gap-2"
                href={URLS.IG}
                target="_blank"
                rel="noreferrer"
                aria-label="Follow on Instagram"
              >
                {Icons.instagram()} Instagram
              </a>
              <a
                className="btn-secondary px-5 py-3 text-sm flex items-center gap-2"
                href={URLS.FB}
                target="_blank"
                rel="noreferrer"
                aria-label="Follow on Facebook"
              >
                {Icons.facebook()} Facebook
              </a>
            </div>
          </div>
        </div>
        <div className="col-span-12 md:col-span-7">
          <div className="card-static card-lg overflow-hidden">
            <iframe
              title="Reality — Google Maps"
              src={URLS.MAP}
              className="w-full h-[420px]"
              style={{ border: 0 }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      </Reveal>
    </section>
  );
}
