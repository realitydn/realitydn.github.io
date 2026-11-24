import React, { useEffect } from 'react';
import DeckCard from '../../DeckCard';
import { fill } from '../../parts';
import { GALLERY } from '../../../../data/events';
import { useBeat, useCompact } from '../../ambient';

// 06 · Inside — the face of faces/InsideFace.jsx, plus:
//   a  a photo is replaced by another from the gallery: printed in out of
//      register (a pink fringe shows at its edge), then slid into place
//   b  the same two photos, printed again in another ink
//   c  the next gallery photo is dealt onto the old one from the right
// One photo changes per turn; the two take it in turns (the phone card shows
// one photo, so there it is always that one).
//
// LAB ONLY: the incoming photos are the gallery ORIGINALS (100–400 KB each).
// Before a or c goes on the home page they need small square cuts like the
// two the face ships with (public/images/deck/, 320 px, ~20 KB).
const START = ['/images/deck/inside-b.jpg', '/images/deck/inside-h.jpg'];
const REST = GALLERY.map((g) => g.src).filter((src) => !/\/[bh]\.jpg$/.test(src));
const POOLS = [REST.filter((_, i) => i % 2 === 0), REST.filter((_, i) => i % 2 === 1)];
// b: the card's own colour first, then the other inks a print could take.
const INKS = ['var(--kc)', 'var(--pink)', 'var(--blue)', 'var(--amber)'];

const photoAt = (slot, changes) => (changes <= 0 ? START[slot] : POOLS[slot][(changes - 1) % POOLS[slot].length]);
const inkAt = (changes) => INKS[((changes % INKS.length) + INKS.length) % INKS.length];

function Ply({ src, ink, cls = '' }) {
  return (
    <span className={`dkm-ply ${cls}`} style={{ background: ink }}>
      <img src={src} alt="" width="320" height="320" decoding="async" />
    </span>
  );
}

export default function InsideLab({ card, no, t, v }) {
  const compact = useCompact();
  const { beat, ref } = useBeat({ on: v !== 'off', pace: 'mid', weight: 3, order: Number(no) });

  // How many times each of the two photos has changed by this beat, and
  // which one changed on it.
  const changes = compact ? [beat, 0] : [Math.ceil(beat / 2), Math.floor(beat / 2)];
  const changed = beat === 0 ? -1 : compact ? 0 : (beat - 1) % 2;
  const swaps = v === 'a' || v === 'c';

  // Have the next photo in hand before its turn.
  useEffect(() => {
    if (!swaps) return;
    [0, 1].forEach((slot) => {
      const img = new Image();
      img.src = photoAt(slot, changes[slot] + 1);
    });
  }, [swaps, changes[0], changes[1]]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <DeckCard card={card} no={no} t={t} meta={fill(t.use('deck.inside.photos'), { n: GALLERY.length })}>
      <span ref={ref} className="dk-shots" aria-hidden="true">
        {[0, 1].map((slot) => {
          const n = changes[slot];
          const now = { src: swaps ? photoAt(slot, n) : START[slot], ink: v === 'b' ? inkAt(n) : INKS[0] };
          const was = { src: swaps ? photoAt(slot, n - 1) : START[slot], ink: v === 'b' ? inkAt(n - 1) : INKS[0] };
          const live = slot === changed;
          return (
            <span key={slot} className={`dk-shot dkm-shot${slot > 0 ? ' dk-x' : ''}`}>
              {live ? <Ply key={`was${beat}`} src={was.src} ink={was.ink} /> : null}
              {live && v === 'a' ? <span key={`fr${beat}`} className="dkm-fringe" /> : null}
              <Ply key={live ? `now${beat}` : 'rest'} src={now.src} ink={now.ink} cls={live ? `dkm-ply-${v}` : ''} />
            </span>
          );
        })}
      </span>
      <span className="dk-fact dk-x">{t.use('deck.inside.lede')}</span>
    </DeckCard>
  );
}
