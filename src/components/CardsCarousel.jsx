import React, { useState, useEffect, useCallback } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import { Icons } from './Icons';
import Reveal from './Reveal';
import { prefersReducedMotion } from '../hooks/motion';

// Fallback strings for a caller that doesn't pass `t` (the site always does).
const EN = {
  'a11y.prevSlide': 'Previous slide',
  'a11y.nextSlide': 'Next slide',
  'a11y.goToSlide': 'Go to slide {n}',
  'a11y.pauseSlides': 'Pause slideshow',
  'a11y.playSlides': 'Play slideshow',
};

export default function CardsCarousel({ items, renderCard, eyebrow, title, t }) {
  const say = (k) => (t ? t.use(k) : EN[k]);

  // Reduced motion: no autoplay at all (and so no pause control — there is
  // nothing moving to pause). Asked once; the plugin list must stay stable.
  const [autoplay] = useState(() => !prefersReducedMotion());
  const [emblaRef, embla] = useEmblaCarousel(
    {
      align: "start",
      dragFree: true,
      loop: false,
      skipSnaps: false,
      containScroll: 'trimSnaps'
    },
    autoplay ? [Autoplay({ delay: 4200, stopOnInteraction: true, stopOnMouseEnter: true })] : []
  );

  const [index, setIndex] = useState(0);
  // containScroll trims the snap list, so there are usually fewer stops
  // than photos — one dot per STOP, not per item. Items until embla is up.
  const [snaps, setSnaps] = useState(items.length);
  const [playing, setPlaying] = useState(autoplay);

  const onSelect = useCallback(() => {
    if (!embla) return;
    setIndex(embla.selectedScrollSnap());
    setSnaps(embla.scrollSnapList().length);
  }, [embla]);

  useEffect(() => {
    if (!embla) return;
    onSelect();
    embla.on("select", onSelect);
    embla.on("reInit", onSelect);
    const ap = embla.plugins().autoplay;
    const sync = () => setPlaying(!!ap && ap.isPlaying());
    if (ap) {
      sync();
      embla.on('autoplay:play', sync);
      embla.on('autoplay:stop', sync);
    }
    return () => {
      embla.off("select", onSelect);
      embla.off("reInit", onSelect);
      if (ap) {
        embla.off('autoplay:play', sync);
        embla.off('autoplay:stop', sync);
      }
    };
  }, [embla, onSelect]);

  // WCAG 2.2.2: anything that moves on its own for >5s gets a pause.
  const togglePlay = () => {
    const ap = embla && embla.plugins().autoplay;
    if (!ap) return;
    if (ap.isPlaying()) ap.stop();
    else ap.play();
  };

  return (
    <div className="py-14 md:py-20">
      {(eyebrow || title) && (
        <Reveal stagger className="grid grid-cols-12 gap-6 items-end mb-8">
          <div className="col-span-12 md:col-span-8">
            {eyebrow && (
              <div className="eyebrow mb-2" style={{ color: 'var(--blue-text)' }}>
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
              type="button"
              onClick={() => embla?.scrollPrev()}
              className="btn-primary px-4 py-2"
              aria-label={say('a11y.prevSlide')}
            >
              {Icons.arrow(undefined, 'left')}
            </button>
            <button
              type="button"
              onClick={() => embla?.scrollNext()}
              className="btn-primary px-4 py-2"
              aria-label={say('a11y.nextSlide')}
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

      {/* Dots: a 24px (44px from sm) hit area around a 10px square — the
          square is the look, the box is the target. aria-current marks the
          stop in view (these are buttons, not a tablist). */}
      <div className="flex flex-wrap items-center justify-center mt-4">
        {autoplay && (
          <button
            type="button"
            onClick={togglePlay}
            className="min-w-[44px] min-h-[44px] mr-1 flex items-center justify-center text-ink"
            aria-label={playing ? say('a11y.pauseSlides') : say('a11y.playSlides')}
          >
            {playing ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <rect x="5" y="4" width="5" height="16" />
                <rect x="14" y="4" width="5" height="16" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M6 4l14 8-14 8z" />
              </svg>
            )}
          </button>
        )}
        {Array.from({ length: snaps }, (_, i) => (
          <button
            key={i}
            type="button"
            className="group w-6 h-6 sm:w-11 sm:h-11 flex items-center justify-center"
            onClick={() => embla?.scrollTo(i)}
            aria-current={i === index ? 'true' : undefined}
            aria-label={say('a11y.goToSlide').replace('{n}', String(i + 1))}
          >
            <span
              className={`block h-2.5 w-2.5 transition-colors ${
                i === index ? 'bg-ink' : 'bg-ink/20 group-hover:bg-ink/40'
              }`}
              aria-hidden="true"
            />
          </button>
        ))}
      </div>
    </div>
  );
}
