import React from 'react';
import BandField from './BandField';
import HeroPhotos from './HeroPhotos';

export default function Hero({ t }) {
  // "coffee / cocktails / community" → Thin lines + an 800 slam on the last
  // segment, per the Year 2 display pattern (One system, DAY AND AFTER DARK).
  const title = t.use('heroTitle');
  const segments = typeof title === 'string' ? title.split(' / ') : [title];
  const lead = segments.slice(0, -1);
  const slam = segments[segments.length - 1];

  return (
    // The approved blue wayfinding band (roles: blue wayfinds — this is the
    // page's "what/where/when"). .b-wayfind re-declares the fg/bg pair, so
    // everything inside resolves to cream-on-blue (the APCA fill rule,
    // 5.10.26) without local colour patches — ink again while the field is
    // live (stock + yellow blocks under the type).
    // At NIGHT (v2) the band is the ink page instead — majors live in thin
    // strips (ticket bars + prints), not full-bleed fills. The right column is
    // the photo of the front (Donald 5.10.26 — it briefly held a TONIGHT
    // ticket from the feed; the calendar right below does that job), framed
    // as a neutral ticket, a carousel once there are more photos.
    <section className="band b-wayfind section">
      {/* The Press Loop, led by this band's own ink so blue still wayfinds.
          Renders nothing until it decides to run, so the flat blue band
          remains the pre-rendered and reduced-motion state; it sits out at
          Night, where the band is the ink page. */}
      <BandField lead="blue" />
      <div className="hero-grid max-w-7xl mx-auto px-4 py-16 md:py-24 grid grid-cols-12 gap-6 items-center">
        {/* Text content — straight on the field; the band IS the surface. */}
        <div className="col-span-12 md:col-span-6 lg:col-span-5">
          <p className="eyebrow mb-4">
            86 Mai Thúc Lân · Đà Nẵng
          </p>
          <h1 className="hero-h1 text-ink">
            {/* Screen-reader/crawler-only lead so the page's one H1 reads
                "REALITY Đà Nẵng — coffee / cocktails / community" (localized)
                while the visual stays the three-part display line. */}
            <span className="sr-only">{t.use('heroPrefix')} </span>
            {lead.length > 0 && (
              <span className="font-display block">
                {/* NBSP before the trailing slash — a breakable space let the
                    lone "/" wrap onto its own line at 390 (walkthrough 23.08). */}
                {lead.join(' / ')}{' /'}
              </span>
            )}
            {/* The spans are display:block, so this space is invisible — it
                only keeps the H1's text from reading "cocktails /community". */}
            {lead.length > 0 && ' '}
            <span className="font-display-bold block">{slam}</span>
          </h1>
          <p className="hero-lede mt-6 text-ink font-body text-lg leading-relaxed">
            {t.use('heroSub')}
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <a
              href="#events"
              className="btn-primary px-6 py-4 text-sm inline-block"
            >
              {t.use('nav.events')}
            </a>
            <a
              href="#menus"
              className="btn-secondary px-6 py-4 text-sm inline-block"
            >
              {t.use('nav.menus')}
            </a>
          </div>
          {/* No ink strip here — the sticky masthead carries the page's
              strip on every surface now (one mark per surface; the footer
              QR square is its sanctioned partner). */}
        </div>

        <div className="col-span-12 md:col-span-6 lg:col-span-7">
          <HeroPhotos t={t} />
        </div>
      </div>
    </section>
  );
}
