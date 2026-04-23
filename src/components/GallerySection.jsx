import React, { useState } from 'react';
import CardsCarousel from './CardsCarousel';
import { GALLERY } from '../data/events';

export default function GallerySection({ t }) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImg, setLightboxImg] = useState('');
  const [lightboxAlt, setLightboxAlt] = useState('');

  const openLightbox = (img, alt) => {
    setLightboxImg(img);
    setLightboxAlt(alt || 'REALITY — gallery image');
    setLightboxOpen(true);
    document.body.style.overflow = 'hidden';
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
    setLightboxImg('');
    setLightboxAlt('');
    document.body.style.overflow = '';
  };

  // Close on Escape — small keyboard affordance for the lightbox.
  React.useEffect(() => {
    if (!lightboxOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') closeLightbox(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxOpen]);

  const renderGalleryCard = (img) => (
    <button
      type="button"
      className="card cursor-pointer overflow-hidden block w-full text-left p-0"
      onClick={() => openLightbox(img.src, img.alt)}
      style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }}
      aria-label={img.alt ? `Open gallery image: ${img.alt}` : 'Open gallery image'}
    >
      <div className="aspect-[4/5] relative bg-cream">
        <img
          src={img.src}
          alt={img.alt || 'REALITY — photo from the space'}
          className="w-full h-full object-cover"
          loading="lazy"
          decoding="async"
          width="400"
          height="500"
        />
      </div>
    </button>
  );

  return (
    <>
      <section id="gallery" className="section max-w-7xl mx-auto px-4 pb-6">
        <div className="mb-2">
          <h2 className="font-title text-3xl md:text-5xl leading-[1] tracking-[0.1em] text-ink">
            {t.use('galleryTitle')}
          </h2>
        </div>
        <CardsCarousel
          items={GALLERY}
          renderCard={renderGalleryCard}
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
              alt={lightboxAlt}
              className="w-full h-full object-contain"
            />
          </div>
        </div>
      )}
    </>
  );
}
