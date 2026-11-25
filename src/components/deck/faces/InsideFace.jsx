import React, { useEffect } from 'react';
import DeckCard from '../DeckCard';
import { ambientStill, useBeat, useCompact } from '../ambient';
import { fill } from '../parts';
import { GALLERY } from '../../../data/events';

// 05 · Inside — photos of the space, printed in the card's colour.
//
// THE PHOTOS are small square cuts (320 px, ~20 KB each) of gallery photos,
// in public/images/deck/ — the gallery originals are 100–400 KB, too heavy
// for a thumbnail on the first screen. The first two are what the page opens
// on (and all the static HTML and a reduced-motion visitor ever see); the
// rest are fetched one at a time, a beat before they are needed. To change
// the set, replace the files or edit this list. Keep the count EVEN: the two
// frames then never show the same photo. The opened card has the full gallery.
const PHOTOS = ['b', 'h', 'a', 'k', 'd', 'm', 'e', 'l', 'g', 'i'].map((k) => `/images/deck/inside-${k}.jpg`);

// THE MOTION ("Registration"): one photo is replaced by the next — printed
// in a few pixels out of register, a colour plate showing at its edge, then
// slid into place. The two frames take it in turns (the phone card has one
// frame, so there it is always that one). How often is not set here: this
// face keeps the pace FACES.inside names in src/lib/beat.js (every 6 s).
//
// No two passes are alike: each draws its own mix of
//   WIPES    the side the print pass comes from
//   SLIPS    which way, and how far, it lands out of register (px)
//   PLATES   the colour that shows at the edge until it registers
// and one pass in three lays a second plate between the two.
const WIPES = ['inset(0 100% 0 0)', 'inset(100% 0 0 0)', 'inset(0 0 0 100%)', 'inset(0 0 100% 0)'];
const SLIPS = [[-9, 6], [8, 5], [-6, -7], [9, -5], [0, 8], [-10, 0]];
const PLATES = ['var(--pink)', 'var(--blue)', 'var(--amber)', 'var(--yellow)'];

// A fixed scramble of the pass number, so the mix looks unplanned but is the
// same on every visit (nothing here is random).
function passOf(n) {
  const r = Math.imul(n, 2654435761) >>> 0;
  const plate = (r >>> 7) % PLATES.length;
  const [x, y] = SLIPS[(r >>> 3) % SLIPS.length];
  return {
    style: { '--reg-from': WIPES[r % WIPES.length], '--reg-x': `${x}px`, '--reg-y': `${y}px` },
    plate: PLATES[plate],
    second: (r >>> 11) % 3 === 0 ? PLATES[(plate + 1) % PLATES.length] : null,
  };
}

const at = (i) => PHOTOS[((i % PHOTOS.length) + PHOTOS.length) % PHOTOS.length];

// What frame `slot` shows on a given beat. On the wide card the frames
// alternate: the first changes on odd beats, the second on even ones.
function photoOn(slot, beat, compact) {
  if (compact) return at(slot === 0 ? beat : 1);
  const last = (beat - slot) % 2 === 1 ? beat : beat - 1; // this frame's latest change
  return last <= 0 ? at(slot) : at(last + 1);
}

function Ply({ src, cls = '' }) {
  return (
    <span className={`dk-ply ${cls}`}>
      <img src={src} alt="" width="320" height="320" />
    </span>
  );
}

export default function InsideFace({ card, no, t }) {
  const compact = useCompact();
  const { beat, ref } = useBeat({ face: 'inside', order: Number(no) });
  const changed = beat === 0 ? -1 : compact ? 0 : (beat - 1) % 2;
  const pass = passOf(beat);

  // Have the next two photos in hand before their turn (never in the static
  // capture or under reduced motion, where the first two are all there is).
  useEffect(() => {
    if (ambientStill()) return;
    [1, 2].forEach((ahead) => {
      const img = new Image();
      img.src = photoOn(compact ? 0 : (beat + ahead - 1) % 2, beat + ahead, compact);
    });
  }, [beat, compact]);

  return (
    <DeckCard card={card} no={no} t={t} meta={fill(t.use('deck.inside.photos'), { n: GALLERY.length })}>
      <span ref={ref} className="dk-shots" aria-hidden="true">
        {[0, 1].map((slot) => {
          const now = photoOn(slot, beat, compact);
          const live = slot === changed;
          // the photo this pass prints over stays underneath until it is covered
          const was = live ? photoOn(slot, beat - 1, compact) : null;
          return (
            <span key={slot} className={`dk-shot${slot > 0 ? ' dk-x' : ''}`} style={live ? pass.style : undefined}>
              {was && was !== now ? <Ply key={was} src={was} /> : null}
              {live ? <span key={`p${beat}`} className="dk-plate" style={{ background: pass.plate }} /> : null}
              {live && pass.second ? <span key={`q${beat}`} className="dk-plate dk-plate-2" style={{ background: pass.second }} /> : null}
              <Ply key={now} src={now} cls={live ? 'dk-ply-in' : ''} />
            </span>
          );
        })}
      </span>
      <span className="dk-fact dk-x">{t.use('deck.inside.face')}</span>
    </DeckCard>
  );
}
