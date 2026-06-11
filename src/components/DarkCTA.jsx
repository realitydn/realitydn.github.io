import React from 'react';
import { Icons } from './Icons';
import Reveal from './Reveal';
import { URLS, STR } from '../data/translations';

/**
 * DarkCTA — the "after dark" band. Runs in the Night scope regardless of the
 * page theme: on a Day page it's the dark teaser strip; when the whole site
 * is in Night mode it blends in, separated by its cream rules.
 */
export default function DarkCTA({ lang }) {
  return (
    <section
      className="section scope-night py-16"
      style={{
        backgroundColor: 'var(--bg)',
        color: 'var(--fg)',
        borderTop: '3px solid var(--fg)',
        borderBottom: '3px solid var(--fg)',
      }}
    >
      <Reveal stagger className="max-w-7xl mx-auto px-4 grid md:grid-cols-12 gap-6 items-center">
        <div className="md:col-span-7">
          <h2 className="font-display-bold text-3xl md:text-5xl">
            {STR[lang].darkTitle}
          </h2>
          <p className="mt-3 font-body text-lg" style={{ color: 'var(--fg-dim)' }}>
            {STR[lang].hours}
          </p>
        </div>
        <div className="md:col-span-5 flex flex-wrap gap-3 md:justify-end">
          <a
            href={URLS.WA}
            target="_blank"
            rel="noreferrer"
            className="btn-primary px-5 py-3 text-sm flex items-center gap-2"
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
