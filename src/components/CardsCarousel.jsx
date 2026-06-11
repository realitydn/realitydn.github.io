import React, { useState, useEffect, useCallback } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import { Icons } from './Icons';
import Reveal from './Reveal';

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
    <div className="py-14 md:py-20">
      {(eyebrow || title) && (
        <Reveal stagger className="grid grid-cols-12 gap-6 items-end mb-8">
          <div className="col-span-12 md:col-span-8">
            {eyebrow && (
              <div className="eyebrow mb-2" style={{ color: 'var(--accent)' }}>
                {eyebrow}
              </div>
            )}
            {title && (
              <h2 className="h-section text-3xl md:text-5xl text-ink">
                {title}
              </h2>
            )}
          </div>
          <div className="col-span-12 md:col-span-4 flex md:justify-end gap-2">
            <button
              onClick={() => embla?.scrollPrev()}
              className="btn-primary px-4 py-2"
              aria-label="Previous"
            >
              {Icons.arrow(undefined, 'left')}
            </button>
            <button
              onClick={() => embla?.scrollNext()}
              className="btn-primary px-4 py-2"
              aria-label="Next"
            >
              {Icons.arrow(undefined, 'right')}
            </button>
          </div>
        </Reveal>
      )}

      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex gap-6">
          {items.map((item, i) => (
            <article key={i} className="basis-[85%] md:basis-[46%] xl:basis-[30%] shrink-0 py-1">
              {renderCard(item)}
            </article>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-center gap-2 mt-6" role="tablist">
        {items.map((_, i) => (
          <button
            key={i}
            className={`h-2.5 w-2.5 transition-colors ${
              i === index ? 'bg-ink' : 'bg-ink/20 hover:bg-ink/40'
            }`}
            onClick={() => embla?.scrollTo(i)}
            role="tab"
            aria-selected={i === index}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
