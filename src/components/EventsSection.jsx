import React, { useState, useEffect } from 'react';
import CardsCarousel from './CardsCarousel';

// Order posters so today's weekday leads and the week rolls forward
// (Tue → Wed → … → Mon), recomputed each visit. "Today" is Đà Nẵng time
// (Asia/Ho_Chi_Minh) — that's where the events happen — so the order is the same
// for a local visitor and a traveller checking from abroad. `day` is 1–7
// (Mon=1 … Sun=7, from events-config.json); undated posters keep their relative
// order and fall to the end.
const DAY_NUM = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };

function vnToday() {
  const abbr = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Ho_Chi_Minh', weekday: 'short',
  }).format(new Date());
  return DAY_NUM[abbr] || 1;
}

function orderByDay(list) {
  const today = vnToday();
  return list
    .map((e, i) => ({ e, i }))
    .sort((a, b) => {
      const ra = a.e.day ? (a.e.day - today + 7) % 7 : 99;
      const rb = b.e.day ? (b.e.day - today + 7) % 7 : 99;
      return ra - rb || a.i - b.i; // stable: keep manager order within a day
    })
    .map((x) => x.e);
}

export default function EventsSection({ t }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch the config file. Each entry is either:
    //   "a.jpg"                                      — bare filename
    //   { "file": "a.jpg", "alt": "...", "title": "..." }  — richer, preferred
    fetch('/events-config.json')
      .then(res => res.json())
      .then(config => {
        const eventList = config.events.map((entry, index) => {
          const obj = typeof entry === 'string' ? { file: entry } : entry;

          // New format from poster-manager: { slug, webp, jpg, full, alt, title }
          // Legacy format: bare string "a.jpg" or { file: "a.jpg", alt, title }
          const isNew = !!obj.slug;
          const img = isNew
            ? `/images/events/${obj.jpg}`
            : `/images/events/${obj.file}`;
          const webp = isNew ? `/images/events/${obj.webp}` : null;
          const full = isNew ? `/images/events/${obj.full}` : null;

          return {
            id: `event-${index + 1}`,
            img,
            webp,
            full,
            alt: obj.alt || obj.title || 'REALITY event poster — Đà Nẵng',
            title: obj.title || null,
            day: obj.day || null,       // 1–7 (Mon=1) — drives today-first ordering
            accent: obj.accent || null, // palette name, stored for future theming
          };
        });
        setEvents(orderByDay(eventList));
        setLoading(false);
      })
      .catch(err => {
        console.log('No events config found, falling back to numbered files');
        loadNumberedEvents();
      });
  }, []);

  const loadNumberedEvents = () => {
    const checkImages = async () => {
      const checks = await Promise.all(
        Array.from({ length: 20 }, (_, i) => {
          const img = new Image();
          return new Promise((resolve) => {
            img.onload = () => resolve({ 
              id: `event-${i + 1}`,
              img: `/images/events/${i + 1}.jpg`,
              alt: `Event poster ${i + 1}`,
              valid: true 
            });
            img.onerror = () => resolve({ valid: false });
            img.src = `/images/events/${i + 1}.jpg`;
          });
        })
      );
      
      const valid = checks.filter(e => e.valid);
      setEvents(valid);
      setLoading(false);
    };

    checkImages();
  };

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

  if (events.length === 0) {
    return null;
  }

  return (
    <>
      <section id="events" className="section max-w-7xl mx-auto px-4">
        <CardsCarousel
          items={events}
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
