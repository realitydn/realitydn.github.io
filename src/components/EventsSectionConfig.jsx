import React, { useState, useEffect } from 'react';
import CardsCarousel from './CardsCarousel';

// Alternative version that uses a config file
export default function EventsSectionConfig({ t }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch the config file
    fetch('/events-config.json')
      .then(res => res.json())
      .then(config => {
        const eventList = config.events.map((filename, index) => ({
          id: `event-${index + 1}`,
          img: `/images/events/${filename}`,
          alt: `Event poster`
        }));
        setEvents(eventList);
        setLoading(false);
      })
      .catch(err => {
        console.log('No events config found, falling back to numbered files');
        // Fallback to numbered approach
        loadNumberedEvents();
      });
  }, []);

  const loadNumberedEvents = () => {
    // Same as the other approach - check for 1.jpg through 20.jpg
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
    <a 
      href={ev.img}
      target="_blank"
      rel="noreferrer"
      className="block rounded-3xl overflow-hidden bg-ink text-cream shadow-[0_8px_24px_rgba(0,0,0,.2)] hover:shadow-[0_12px_32px_rgba(0,0,0,.3)] transition-shadow duration-300 focus:ring-2 focus:ring-offset-2 focus:ring-ink focus:outline-none"
    >
      <div className="aspect-[4/5] relative">
        <img 
          src={ev.img} 
          alt={ev.alt} 
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>
    </a>
  );

  if (loading) {
    return (
      <section id="events" className="max-w-7xl mx-auto px-4">
        <div className="py-14 md:py-20">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-32 mb-2"></div>
            <div className="h-12 bg-gray-200 rounded w-64"></div>
          </div>
        </div>
      </section>
    );
  }

  if (events.length === 0) {
    return null;
  }

  return (
    <section id="events" className="max-w-7xl mx-auto px-4">
      <CardsCarousel
        items={events}
        eyebrow={t.use('eventsEyebrow')}
        title={t.use('eventsTitle')}
        renderCard={renderEventCard}
      />
    </section>
  );
}