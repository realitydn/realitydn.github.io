import React from 'react';
import DeckCard from '../DeckCard';
import { fill } from '../parts';
import { GALLERY } from '../../../data/events';

// 06 · Inside — two photos of the space, printed in the card's colour.
//
// THE PHOTOS are small square cuts (320px, ~20 KB each) of gallery photos, in
// public/images/deck/ — the gallery originals are 100–400 KB, too heavy for a
// thumbnail on the first screen. To change them, replace these files (or add
// more and list them here); the opened card shows the full gallery.
const THUMBS = ['/images/deck/inside-b.jpg', '/images/deck/inside-h.jpg'];

export default function InsideFace({ card, no, t }) {
  return (
    <DeckCard card={card} no={no} t={t} meta={fill(t.use('deck.inside.photos'), { n: GALLERY.length })}>
      <span className="dk-shots" aria-hidden="true">
        {THUMBS.map((src, i) => (
          <span key={src} className={`dk-shot${i > 0 ? ' dk-x' : ''}`}>
            <img src={src} alt="" width="320" height="320" loading="lazy" decoding="async" />
          </span>
        ))}
      </span>
      <span className="dk-fact dk-x">{t.use('deck.inside.lede')}</span>
    </DeckCard>
  );
}
