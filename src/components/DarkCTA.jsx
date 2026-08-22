import React from 'react';
import { Icons } from './Icons';
import Reveal from './Reveal';
import { URLS, STR } from '../data/translations';

/**
 * DarkCTA — the page's ONE red ACT band (canon 22.08.26: red commands, once
 * per page). The on-red contract in index.css does the colour work: body copy
 * goes ink, the display heading re-creams via reg-far, btn-primary flips to
 * cream-on-red and btn-secondary to an ink outline. The band supplies the
 * top rule; the bottom rule stays inline because what follows is plain paper,
 * not a band.
 */
export default function DarkCTA({ lang }) {
  return (
    // Band separation belongs to the NEXT band's top rule (the .band stack
    // idiom) — no own bottom border, or the seam doubles to 6px.
    <section className="section band b-act py-16">
      <Reveal stagger className="max-w-7xl mx-auto px-4 grid md:grid-cols-12 gap-6 items-center">
        <div className="md:col-span-7">
          <h2 className="font-display-bold reg-far text-3xl md:text-5xl">
            {STR[lang].darkTitle}
          </h2>
          <p className="mt-3 font-body text-lg" style={{ color: 'var(--fg-dim)' }}>
            {STR[lang].hours}
          </p>
        </div>
        <div className="md:col-span-5 flex flex-wrap gap-3 md:justify-end">
          <a
            href={`${URLS.APP}/?utm_source=website&utm_medium=after_dark`}
            target="_blank"
            rel="noreferrer"
            className="btn-primary px-5 py-3 text-sm flex items-center gap-2"
          >
            {Icons.app()} {STR[lang].getApp.button}
          </a>
          <a
            href={URLS.WA}
            target="_blank"
            rel="noreferrer"
            className="btn-secondary px-5 py-3 text-sm flex items-center gap-2"
          >
            {Icons.whatsapp()} WhatsApp
          </a>
          <a
            href={URLS.IG}
            target="_blank"
            rel="noreferrer"
            className="btn-secondary px-5 py-3 text-sm flex items-center gap-2"
          >
            {Icons.instagram()} Instagram
          </a>
        </div>
      </Reveal>
    </section>
  );
}
