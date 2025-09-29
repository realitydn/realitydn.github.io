import React from 'react';
import CardsCarousel from './CardsCarousel';
import { EVENTS } from '../data/events';

export default function EventsSection({ t }) {
  const renderEventCard = (ev) => (
    <a 
      href={ev.url} 
      className="block rounded-3xl overflow-hidden bg-ink text-cream shadow-event hover:shadow-event-hover transition-shadow focus:ring-2 focus:ring-offset-2 focus:ring-ink focus:outline-none"
    >
      <div className="aspect-[4/5] relative">
        <div className="absolute inset-0 bg-gradient-to-br from-stone-600 to-stone-800">
          {ev.img && (
            <img 
              src={ev.img} 
              alt={ev.alt || ev.title} 
              className="absolute inset-0 w-full h-full object-cover"
              loading="lazy"
            />
          )}
        </div>
        <div className="absolute inset-0 p-6 flex items-end bg-gradient-to-t from-black/80 via-black/20 to-transparent">
          <div className="w-full text-cream">
            <div className="text-[11px] md:text-xs uppercase tracking-[0.25em] font-mont opacity-90">
              {ev.date}
            </div>
            <div className="whitespace-pre-wrap font-space text-2xl md:text-3xl leading-[1] font-bold mt-1">
              {ev.title}
            </div>
            {ev.subtitle && (
              <div className="text-sm md:text-base opacity-90 font-mont mt-2">
                {ev.subtitle}
              </div>
            )}
          </div>
        </div>
      </div>
    </a>
  );

  return (
    <section id="events" className="max-w-7xl mx-auto px-4">
      <CardsCarousel
        items={EVENTS}
        eyebrow={t.use('eventsEyebrow')}
        title={t.use('eventsTitle')}
        renderCard={renderEventCard}
      />
    </section>
  );
}