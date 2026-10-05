import React, { useEffect, useState } from 'react';
import { HERO_PHOTOS } from '../data/hero-photos';

// The hero's photo column: the front of the building, framed as a neutral
// ticket (7px print, both themes). With more than one photo in
// data/hero-photos.js it becomes an auto-advancing carousel — a cross-fade
// every HOLD_MS — with the controls WCAG 2.2.2 asks of anything that moves on
// its own for over 5s: a pause button, plus dots to pick a photo. It holds
// still on hover / keyboard focus, while the tab is hidden, and never moves
// under reduced motion (the dots still work). With one photo it renders just
// the photo, no controls — what the page shipped before Night v2.
const HOLD_MS = 6000;

export default function HeroPhotos({ t, photos = HERO_PHOTOS }) {
  const [shown, setShown] = useState(0);
  const [paused, setPaused] = useState(false); // the pause button
  const [held, setHeld] = useState(false); // hover / focus inside
  const many = photos.length > 1;

  useEffect(() => {
    if (!many || paused || held) return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    // Re-armed on every change of `shown`, so a dot pick gets a full hold too.
    const id = window.setTimeout(() => {
      if (document.visibilityState === 'visible') setShown((n) => (n + 1) % photos.length);
    }, HOLD_MS);
    return () => window.clearTimeout(id);
  }, [many, paused, held, shown, photos.length]);

  return (
    <div
      className="tkt hero-photo hero-photos overflow-hidden aspect-[4/5] md:aspect-[5/4] lg:aspect-[4/3]"
      {...(many
        ? {
            role: 'region',
            'aria-roledescription': 'carousel',
            'aria-label': t.use('heroPhotos.label'),
            onMouseEnter: () => setHeld(true),
            onMouseLeave: () => setHeld(false),
            onFocus: () => setHeld(true),
            onBlur: (e) => {
              if (!e.currentTarget.contains(e.relatedTarget)) setHeld(false);
            },
          }
        : {})}
    >
      {photos.map((p, n) => (
        <img
          key={p.src}
          src={p.src}
          alt={p.alt}
          className="hero-photos-img"
          data-on={n === shown ? '' : undefined}
          aria-hidden={n === shown ? undefined : 'true'}
          /* The first photo is the LCP candidate (index.html preloads it):
             eager + high priority. The rest wait their turn. */
          loading={n === 0 ? 'eager' : 'lazy'}
          fetchpriority={n === 0 ? 'high' : undefined}
          decoding="async"
          width={p.width}
          height={p.height}
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
        />
      ))}
      {many && (
        <div className="hero-photos-ctl">
          <button
            type="button"
            className="hero-photos-btn"
            aria-label={t.use(paused ? 'heroPhotos.play' : 'heroPhotos.pause')}
            onClick={() => setPaused((v) => !v)}
          >
            {paused ? (
              <svg viewBox="0 0 10 10" aria-hidden="true"><path d="M2 1l7 4-7 4z" fill="currentColor" /></svg>
            ) : (
              <svg viewBox="0 0 10 10" aria-hidden="true"><path d="M2 1h2v8H2zM6 1h2v8H6z" fill="currentColor" /></svg>
            )}
          </button>
          {photos.map((p, n) => (
            <button
              key={p.src}
              type="button"
              className="hero-photos-dot"
              aria-label={t.use('heroPhotos.photo').replace('{n}', n + 1).replace('{total}', photos.length)}
              aria-current={n === shown ? 'true' : undefined}
              onClick={() => setShown(n)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
