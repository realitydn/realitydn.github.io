import React, { useState, useEffect } from 'react';
import CardsCarousel from './CardsCarousel';

export default function EventsSection({ t }) {
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
    <div 
      className="card cursor-pointer overflow-hidden"
      onClick={() => openLightbox(ev.img)}
      style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }}
    >
      <div className="aspect-[4/5] relative bg-cream">
        <img 
          src={ev.img} 
          alt={ev.alt} 
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>
    </div>
  );

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImg, setLightboxImg] = useState('');

  const openLightbox = (img) => {
    setLightboxImg(img);
    setLightboxOpen(true);
    document.body.style.overflow = 'hidden';
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
    setLightboxImg('');
    document.body.style.overflow = '';
  };

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

      {/* Lightbox Modal */}
      {lightboxOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/90"
          onClick={closeLightbox}
        >
          <button
            className="absolute top-4 right-4 text-cream hover:opacity-70 transition-opacity p-2"
            onClick={closeLightbox}
            aria-label="Close lightbox"
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M6 18L18 6"/>
            </svg>
          </button>
          <div 
            className="max-w-4xl max-h-[90vh] card-static overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <img 
              src={lightboxImg} 
              alt="Event poster" 
              className="w-full h-full object-contain"
            />
          </div>
        </div>
      )}
    </>
  );
}
