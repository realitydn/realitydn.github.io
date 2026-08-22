import React, { useState } from 'react';
import CardsCarousel from './CardsCarousel';
import Reveal from './Reveal';
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
        <Reveal className="mb-2">
          <h2 className="h-section text-3xl md:text-5xl text-ink">
            {t.use('galleryTitle')}
          </h2>
        </Reveal>
        <CardsCarousel
          items={GALLERY}
          renderCard={renderGalleryCard}
        />
      </section>

      {/* Lightbox — .lbx ink plate on the darker scrim (canon 22.08.26). The
          photo is the subject: frame + caption row only, nothing decorative.
          Scrim and plate are siblings, so no stopPropagation is needed. */}
      {lightboxOpen && (
        <>
          <div className="scrim lit" onClick={closeLightbox} aria-hidden="true" />
          <div
            className="plate lbx"
            role="dialog"
            aria-modal="true"
            aria-label={lightboxAlt}
          >
            <div className="lbx-frame">
              <img
                src={lightboxImg}
                alt={lightboxAlt}
                className="w-full h-full object-contain"
              />
            </div>
            <div className="lbx-cap">
              <span className="min-w-0 truncate">{lightboxAlt}</span>
              <button
                className="shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center"
                onClick={closeLightbox}
                aria-label="Close lightbox"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M6 6l12 12M6 18L18 6"/>
                </svg>
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
