import React, { useMemo, useState } from 'react';
import BandField from './BandField';
import EventOverlay from './EventOverlay';
import { TicketPhoto } from './Ticket';
import { STR, URLS } from '../data/translations';
import useFeed from '../hooks/useFeed';
import { fmtTime, pickTitle, pickQualifier, pickLocName } from '../data/feed-helpers';
import { pickTonight, whenKey, fmtDayDate, catLabel, costLabel } from '../data/cal-feed';
import { categoryOf } from '../data/event-category';

// The hero's right column (Night v2 "Cream Tickets", website screen 13 — in
// BOTH themes since round 2, 5.10.26): a TONIGHT ticket built from the feed —
// the next event to start today, else the next one coming up (pickTonight).
// Top bar in the event's category colour, the poster at its native 4:5 on
// riso stripes (or the logo box), name, one meta line, and the red ACTION,
// which opens the same event overlay the calendar uses. Day sits it on the
// blue band, Night on the ink page. The prerender renders it too: it reads
// the shared feed load, which the static capture resolves (and the shipped
// page's inline seed feeds on the first client render).
function TonightTicket({ ev, lang, onOpen }) {
  const C = STR[lang].cal;
  const cat = categoryOf(ev);
  const title = pickTitle(ev, lang) || C.fallbackTitle;
  const qualifier = pickQualifier(ev, lang);
  const loc = pickLocName(ev.location, lang);
  const start = fmtTime(ev.startsAt);
  const wk = whenKey(ev.startsAt);
  const day = wk ? C[wk] : fmtDayDate(ev.startsAt, lang);
  const meta = [qualifier, loc, costLabel(ev, lang)].filter(Boolean).join(' · ');
  const img = ev.posters?.poster4x5 || ev.posters?.feed || null;
  const href = ev.sourceUrl || `${URLS.APP}/events/${ev.id}`;
  const label = catLabel(cat, lang);
  return (
    <article className="tkt hero-tkt" data-cat={cat}>
      <div className="tkt-top">
        <span>{[day, start].filter(Boolean).join(' · ')}</span>
        {label && <span>{label}</span>}
      </div>
      {/* The hero poster is the page's LCP candidate now (it replaced the
          hero photo): eager + high fetch priority. */}
      <TicketPhoto img={img} alt={C.posterAlt.replace('{title}', title)} className="hero-tkt-photo" priority />
      <div className="hero-tkt-b">
        <div className="min-w-0">
          <h2 className="tkt-title">{title}</h2>
          {meta && <p className="tkt-dim hero-tkt-meta">{meta}</p>}
        </div>
        {/* The one red ACTION: a real link to the event (crawlers, new-tab
            clicks), a plain click opens the overlay — the calendar's
            contract. */}
        <a
          href={href}
          className="btn-action hero-tkt-go px-5 py-3 text-sm"
          onClick={(e) => {
            if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
            e.preventDefault();
            onOpen(ev);
          }}
        >
          {C.details} <span aria-hidden="true">→</span>
        </a>
      </div>
    </article>
  );
}

export default function Hero({ t, lang = 'EN' }) {
  // "coffee / cocktails / community" → Thin lines + an 800 slam on the last
  // segment, per the Year 2 display pattern (One system, DAY AND AFTER DARK).
  const title = t.use('heroTitle');
  const segments = typeof title === 'string' ? title.split(' / ') : [title];
  const lead = segments.slice(0, -1);
  const slam = segments[segments.length - 1];

  // The shared feed load (the same request Calendar uses — no extra fetch)
  // picks tonight's ticket, in both themes.
  const { events } = useFeed();
  const tonight = useMemo(() => pickTonight(events), [events]);
  const [overlayEvent, setOverlayEvent] = useState(null);

  return (
    // The approved blue wayfinding band (roles: blue wayfinds — this is the
    // page's "what/where/when"). .b-wayfind re-declares the fg/bg pair, so
    // everything inside resolves to cream-on-blue (the APCA fill rule,
    // 5.10.26) without local colour patches — ink again while the field is
    // live (stock + yellow blocks under the type).
    // At NIGHT (v2) the band is the ink page instead — majors live in thin
    // strips (ticket bars + prints), not full-bleed fills. The right column is
    // tonight's ticket in both themes (on the blue field by Day).
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
          {tonight ? (
            <TonightTicket ev={tonight} lang={lang} onOpen={setOverlayEvent} />
          ) : (
            /* Nothing left in the feed (or it is still loading without a
               seed): the hero photo stands in, as a neutral ticket. */
            <div className="tkt hero-photo overflow-hidden aspect-[4/5] md:aspect-[5/4] lg:aspect-[4/3]">
              <div className="w-full h-full" style={{ background: 'var(--surface-2)' }}>
                <img
                  src="/images/hero.jpg"
                  alt="Inside REALITY — coffee shop, bar and community space in Đà Nẵng"
                  className="w-full h-full object-cover"
                  /* LCP candidate: eager + high fetch priority so it loads before
                     below-the-fold content. */
                  loading="eager"
                  fetchpriority="high"
                  decoding="async"
                  /* Dimensions are placeholders — the aspect-ratio container
                     controls the final size. Providing any width/height tells
                     the browser to reserve the box and suppresses CLS warnings. */
                  width="1200"
                  height="900"
                  onError={(e) => e.target.style.display = 'none'}
                />
              </div>
            </div>
          )}
        </div>
      </div>
      <EventOverlay event={overlayEvent} lang={lang} onClose={() => setOverlayEvent(null)} />
    </section>
  );
}
