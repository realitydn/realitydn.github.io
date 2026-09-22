import React, { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import CardsCarousel from './CardsCarousel';
import Reveal from './Reveal';
import useDialog from '../hooks/useDialog';
import { GALLERY } from '../data/events';

export default function GallerySection({ t }) {
  // One piece of state: the open photo ({ src, alt }) or null.
  const [photo, setPhoto] = useState(null);
  const plateRef = useRef(null);
  const closeRef = useRef(null);
  const fallbackAlt = t.use('a11y.galleryImage');

  // The shared modal contract (focus trap, Escape, focus back to the tapped
  // photo, counted scroll lock, back gesture closes) — see useDialog.
  const requestClose = useDialog({
    open: !!photo,
    onClose: () => setPhoto(null),
    containerRef: plateRef,
    initialFocusRef: closeRef,
    historyKey: photo ? `photo:${photo.src}` : null,
  });

  const renderGalleryCard = (img) => (
    <button
      type="button"
      className="card cursor-pointer overflow-hidden block w-full text-left p-0"
      onClick={() => setPhoto({ src: img.src, alt: img.alt || fallbackAlt })}
      aria-label={img.alt ? `${t.use('a11y.openImage')}: ${img.alt}` : t.use('a11y.openImage')}
    >
      <div className="aspect-[4/5] relative bg-cream">
        <img
          src={img.src}
          alt={img.alt || fallbackAlt}
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
      {/* A paper band in the canon stack (ink pass 22.08.26): the band is
          full-bleed with its 3px ink top rule; the max-w wrapper moved inside
          so the content stays constrained. The grid itself is untouched. */}
      <section id="gallery" className="band b-paper section">
        <div className="max-w-7xl mx-auto px-4 pt-12 pb-6">
          <Reveal className="mb-2">
            <h2 className="h-section text-3xl md:text-5xl text-ink">
              {t.use('galleryTitle')}
            </h2>
          </Reveal>
          <CardsCarousel
            items={GALLERY}
            renderCard={renderGalleryCard}
            t={t}
          />
        </div>
      </section>

      {/* Lightbox — .lbx ink plate on the darker scrim (canon 22.08.26). The
          photo is the subject: frame + caption row only, nothing decorative.
          Scrim and plate are siblings, so no stopPropagation is needed.
          Portalled to <body> so no section's stacking context (.section is
          z-index: 1) can paint over it. */}
      {photo && typeof document !== 'undefined' && createPortal(
        <>
          <div className="scrim lit" onClick={requestClose} aria-hidden="true" />
          <div
            ref={plateRef}
            className="plate lbx"
            role="dialog"
            aria-modal="true"
            aria-label={photo.alt}
            tabIndex={-1}
          >
            <div className="lbx-frame">
              <img
                src={photo.src}
                alt={photo.alt}
                className="w-full h-full object-contain"
              />
            </div>
            <div className="lbx-cap">
              <span className="min-w-0 truncate" aria-hidden="true">{photo.alt}</span>
              <button
                ref={closeRef}
                type="button"
                className="shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center"
                onClick={requestClose}
                aria-label={t.use('a11y.closeImage')}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M6 6l12 12M6 18L18 6"/>
                </svg>
              </button>
            </div>
          </div>
        </>,
        document.body
      )}
    </>
  );
}
