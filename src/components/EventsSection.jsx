import React, { useState, useEffect, useMemo } from 'react';
import CardsCarousel from './CardsCarousel';
import useFeed from '../hooks/useFeed';
import {
  dedupeSeries,
  pickPoster,
  pickTitle,
  weekdayFromISO,
  orderByDay,
} from '../data/feed-helpers';

// EventsSection — the poster carousel. Sourced from the REALITY Events Feed
// (useFeed) rather than the old public/events-config.json. Recurring series are
// collapsed to their soonest upcoming instance; one-offs always show. Cards are
// ordered today-first (by ICT weekday, mirroring the prior behaviour) but the
// underlying list is built soonest-first so "today" leads with the next real event.
//
// This site's language toggle is 'EN' | 'VN' (NOT en/vi); feed-helpers map 'VN' → *_vi.

export default function EventsSection({ t, lang = 'EN' }) {
  const { events, loading } = useFeed();

  const cards = useMemo(() => {
    // De-dup recurring series (soonest instance), then sort by start ascending so
    // the soonest real event is first; map to the card shape renderEventCard wants,
    // skipping any event with no usable poster (feed → poster4x5 → skip).
    const deduped = dedupeSeries(events || [])
      .slice()
      .sort((a, b) => Date.parse(a.startsAt || 0) - Date.parse(b.startsAt || 0));

    const mapped = deduped
      .map((ev) => {
        const poster = pickPoster(ev.posters);
        if (!poster) return null;
        const title = pickTitle(ev, lang) || null;
        return {
          id: ev.id,
          img: poster,
          webp: null,
          full: ev.posters?.poster4x5 || poster,
          alt: title || 'REALITY event poster — Đà Nẵng',
          title,
          day: weekdayFromISO(ev.startsAt), // 1–7 (Mon=1) for today-first ordering
          startsAt: ev.startsAt,
        };
      })
      .filter(Boolean);

    return orderByDay(mapped);
  }, [events, lang]);

  const renderEventCard = (ev) => (
    <button
      type="button"
      className="card cursor-pointer overflow-hidden block w-full text-left p-0"
      onClick={() => openLightbox(ev.full || ev.img, ev.alt)}
      aria-label={ev.title ? `Open poster: ${ev.title}` : 'Open event poster'}
    >
      <div className="aspect-[4/5] relative bg-cream">
        <picture>
          {ev.webp && <source srcSet={ev.webp} type="image/webp" />}
          <img
            src={ev.img}
            alt={ev.alt}
            title={ev.title || undefined}
            className="w-full h-full object-cover"
            loading="lazy"
            decoding="async"
            width="400"
            height="500"
          />
        </picture>
      </div>
    </button>
  );

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImg, setLightboxImg] = useState('');
  const [lightboxAlt, setLightboxAlt] = useState('');

  const openLightbox = (img, alt) => {
    setLightboxImg(img);
    setLightboxAlt(alt || 'REALITY event poster');
    setLightboxOpen(true);
    document.body.style.overflow = 'hidden';
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
    setLightboxImg('');
    setLightboxAlt('');
    document.body.style.overflow = '';
  };

  // Close on Escape — basic keyboard affordance for the lightbox.
  useEffect(() => {
    if (!lightboxOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') closeLightbox(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxOpen]);

  if (loading) {
    return (
      <section id="events" className="section max-w-7xl mx-auto px-4">
        <div className="py-14 md:py-20">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 w-24 mb-2" style={{ borderRadius: 0 }}></div>
            <div className="h-12 bg-gray-200 w-64" style={{ borderRadius: 0 }}></div>
          </div>
        </div>
      </section>
    );
  }

  if (cards.length === 0) {
    return null;
  }

  return (
    <>
      <section id="events" className="section max-w-7xl mx-auto px-4">
        <CardsCarousel
          items={cards}
          eyebrow={t.use('eventsEyebrow')}
          title={t.use('eventsTitle')}
          renderCard={renderEventCard}
        />
      </section>

      {/* Lightbox Modal — paper scrim, stamped frame */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{
            backgroundColor: 'rgb(var(--bg-rgb) / 0.88)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
          }}
          onClick={closeLightbox}
        >
          <button
            className="absolute top-4 right-4 text-ink hover:opacity-70 transition-opacity p-2"
            onClick={closeLightbox}
            aria-label="Close lightbox"
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M6 18L18 6"/>
            </svg>
          </button>
          <div
            className="max-w-4xl max-h-[90vh] card-static stamp-in overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={lightboxImg}
              alt={lightboxAlt}
              className="w-full h-full object-contain"
            />
          </div>
        </div>
      )}
    </>
  );
}
