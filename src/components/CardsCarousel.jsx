import React, { useState, useEffect, useCallback } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import { Icons } from './Icons';

export default function CardsCarousel({ items, renderCard, eyebrow, title }) {
  const [emblaRef, embla] = useEmblaCarousel(
    { 
      align: "start", 
      dragFree: true, 
      loop: false,
      skipSnaps: false,
      containScroll: 'trimSnaps'
    }, 
    [Autoplay({ delay: 4200, stopOnInteraction: true, stopOnMouseEnter: true })]
  );
  
  const [index, setIndex] = useState(0);
  
  const onSelect = useCallback(() => { 
    if (embla) setIndex(embla.selectedScrollSnap()); 
  }, [embla]);
  
  useEffect(() => { 
    if (!embla) return; 
    onSelect(); 
    embla.on("select", onSelect); 
    embla.on("reInit", onSelect); 
    return () => {
      embla.off("select", onSelect);
      embla.off("reInit", onSelect);
    };
  }, [embla, onSelect]);

  return (
    <section className="py-14 md:py-20">
      {(eyebrow || title) && (
        <div className="grid grid-cols-12 gap-6 items-end mb-8">
          <div className="col-span-12 md:col-span-8">
            {eyebrow && (
              <div className="uppercase text-xs md:text-sm tracking-[0.25em] font-mont text-gray-600 mb-2">
                {eyebrow}
              </div>
            )}
            {title && (
              <h2 className="font-space text-3xl md:text-5xl leading-[1] tracking-tight uppercase text-ink">
                {title}
              </h2>
            )}
          </div>
          <div className="col-span-12 md:col-span-4 flex md:justify-end gap-2">
            <button 
              onClick={() => embla?.scrollPrev()} 
              className="px-4 py-2 bg-ink text-cream font-mont rounded transition-all active:scale-95 hover:bg-ink/90 focus:ring-2 focus:ring-offset-2 focus:ring-ink focus:outline-none" 
              aria-label="Previous"
            >
              {Icons.arrow('#FDFBF7', 'left')}
            </button>
            <button 
              onClick={() => embla?.scrollNext()} 
              className="px-4 py-2 bg-ink text-cream font-mont rounded transition-all active:scale-95 hover:bg-ink/90 focus:ring-2 focus:ring-offset-2 focus:ring-ink focus:outline-none" 
              aria-label="Next"
            >
              {Icons.arrow('#FDFBF7', 'right')}
            </button>
          </div>
        </div>
      )}
      
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex gap-6">
          {items.map((item, i) => (
            <article key={i} className="basis-[85%] md:basis-[46%] xl:basis-[30%] shrink-0">
              {renderCard(item)}
            </article>
          ))}
        </div>
      </div>
      
      <div className="flex items-center justify-center gap-2 mt-5" role="tablist">
        {items.map((_, i) => (
          <button
            key={i} 
            className={`h-2.5 w-2.5 rounded-full transition-colors ${
              i === index ? 'bg-ink' : 'bg-gray-400'
            }`}
            onClick={() => embla?.scrollTo(i)}
            role="tab"
            aria-selected={i === index}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>
    </section>
  );
}