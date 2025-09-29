import React from 'react';
import CardsCarousel from './CardsCarousel';
import { GALLERY } from '../data/events';

export default function GallerySection({ t }) {
  const renderGalleryCard = (img) => (
    <div className="block rounded-3xl overflow-hidden bg-ink text-cream shadow-[0_8px_24px_rgba(0,0,0,.2)] hover:shadow-[0_12px_32px_rgba(0,0,0,.3)] transition-shadow duration-300">
      <div className="aspect-[4/5] relative">
        <img 
          src={img.src} 
          alt={img.alt} 
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>
    </div>
  );

  return (
    <section id="gallery" className="max-w-7xl mx-auto px-4 pb-6">
      <div className="mb-2">
        <h2 className="font-space text-3xl md:text-5xl leading-[1] tracking-tight uppercase text-ink">
          {t.use('galleryTitle')}
        </h2>
      </div>
      <CardsCarousel
        items={GALLERY}
        renderCard={renderGalleryCard}
      />
    </section>
  );
}