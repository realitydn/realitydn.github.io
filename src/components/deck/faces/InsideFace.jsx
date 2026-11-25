import React, { useEffect, useRef, useState } from 'react';
import DeckCard from '../DeckCard';
import { ambientStill, useBeat, useCompact } from '../ambient';
import { fill } from '../parts';
import { GALLERY } from '../../../data/events';
import { BEAT_MS, FACES, beatsOf } from '../../../lib/beat';

// 05 · Inside — the front of the building in full colour, then photos of the
// space printed in the card's colour.
//
// THE PHOTOS are small square cuts (320 px, 17–25 KB each) in
// public/images/deck/ — the originals are 100–400 KB, too heavy for a
// thumbnail on the first screen.
//
//   FRONT    the shopfront (a cut of public/images/hero.jpg). What the card
//            opens on: frame one on the wide card, the only frame on a phone.
//            Card 05 is the middle of the 3 × 3, so this is the centre of the
//            first screen. It is also the first of the rotation, so it comes
//            round again, in the card's colour.
//   the rest the space, from the gallery. The second photo opens in frame
//            two; the others are fetched one at a time, a beat before they
//            are needed.
//
// Keep the count EVEN: the two frames then never show the same photo. The
// first two are all the static HTML and a reduced-motion visitor ever see, in
// full colour. The opened card has the full gallery.
const FRONT = '/images/deck/front.jpg';
const PHOTOS = [FRONT, ...['h', 'b', 'k', 'd', 'm', 'e', 'l', 'g', 'i'].map((k) => `/images/deck/inside-${k}.jpg`)];

// FULL COLOUR FIRST (Donald, 25.11.26: "start full color, and then after a
// beat or two, get colorized"). The card opens with its photos in their own
// colours, so the shopfront is the most eye-catching thing on the first
// screen. Then the card's colour is printed onto the photos that are already
// there (no photo changes on that turn), and from the turn after that the
// photos rotate, in the card's colour, for good.
//
// FULL_COLOUR_TURNS is how long the colour photos are left alone, in the
// card's own turns (one turn = 6 s: FACES.inside in src/lib/beat.js).
//   1   the colour is printed about 8 s after the page opens
//   2   about 14 s
// A turn counts only if the shopfront has been on screen for most of it. The
// card's very first turn falls 2 s after the page starts to load, when the
// photo has been up for a second or so; that one is not counted.
const FULL_COLOUR_TURNS = 1;

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

// The pass that prints the card's colour onto the full-colour photos: the
// same move, with the card's own colour as the plate. It comes from the
// left, lands down and to the left, then registers. Frame two follows frame
// one by a moment (deck.css: .dk-inking).
const INK_PASS = { '--reg-from': WIPES[0], '--reg-x': '-9px', '--reg-y': '6px' };

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

// What frame `slot` shows on a given step. Step 0 is the opening pair (the
// shopfront, and the second photo); each later step is one change. On the
// wide card the frames alternate: the first changes on odd steps, the second
// on even ones.
function photoOn(slot, step, compact) {
  if (compact) return at(slot === 0 ? step : 1);
  const last = (step - slot) % 2 === 1 ? step : step - 1; // this frame's latest change
  return last <= 0 ? at(slot) : at(last + 1);
}

function Ply({ src, cls = '', onSeen }) {
  return (
    <span className={`dk-ply ${cls}`}>
      <img
        src={src}
        alt=""
        width="320"
        height="320"
        onLoad={onSeen}
        ref={onSeen ? (el) => { if (el && el.complete && el.naturalWidth) onSeen(); } : undefined}
      />
    </span>
  );
}

export default function InsideFace({ card, no, t }) {
  const compact = useCompact();
  const { beat, ref } = useBeat({ face: 'inside', order: Number(no) });

  // When the shopfront was first on screen, and the beat the colour went on
  // (0 = not yet: the photos are still in full colour).
  const seen = useRef(0);
  const markSeen = () => {
    if (!seen.current) seen.current = performance.now();
  };
  const [inked, setInked] = useState(0);
  useEffect(() => {
    if (inked || beat === 0 || !seen.current) return;
    const turn = beatsOf(FACES.inside.pace) * BEAT_MS;
    if (performance.now() - seen.current >= (FULL_COLOUR_TURNS - 0.5) * turn) setInked(beat);
  }, [beat, inked]);

  // -1 full colour · 0 the colour is printed on · 1, 2, 3 … a photo changes
  const step = inked ? beat - inked : -1;
  const inking = step === 0;
  const changed = step < 1 ? -1 : compact ? 0 : (step - 1) % 2;
  const pass = passOf(step);

  // Have the next two photos in hand before their turn (never in the static
  // capture or under reduced motion, where the first two are all there is).
  const from = Math.max(step, 0);
  useEffect(() => {
    if (ambientStill()) return;
    [1, 2].forEach((ahead) => {
      const img = new Image();
      img.src = photoOn(compact ? 0 : (from + ahead - 1) % 2, from + ahead, compact);
    });
  }, [from, compact]);

  return (
    <DeckCard card={card} no={no} t={t} meta={fill(t.use('deck.inside.photos'), { n: GALLERY.length })}>
      <span ref={ref} className="dk-shots" aria-hidden="true">
        {[0, 1].map((slot) => {
          const now = photoOn(slot, from, compact);
          const x = slot > 0 ? ' dk-x' : '';

          // Full colour, and the turn the card's colour is printed over it.
          // (The printed layer keeps the photo's key, so it is the same
          // element the first change later prints over.)
          if (step < 1) {
            return (
              <span key={slot} className={`dk-shot${x}${inking ? ' dk-inking' : ''}`} style={inking ? INK_PASS : undefined}>
                <Ply key={`${now}|full`} src={now} cls="dk-ply-full" onSeen={slot === 0 ? markSeen : undefined} />
                {inking ? <span key="ink" className="dk-plate" /> : null}
                {inking ? <Ply key={now} src={now} cls="dk-ply-in" /> : null}
              </span>
            );
          }

          const live = slot === changed;
          // the photo this pass prints over stays underneath until it is covered
          const was = live ? photoOn(slot, step - 1, compact) : null;
          return (
            <span key={slot} className={`dk-shot${x}`} style={live ? pass.style : undefined}>
              {was && was !== now ? <Ply key={was} src={was} /> : null}
              {live ? <span key={`p${step}`} className="dk-plate" style={{ background: pass.plate }} /> : null}
              {live && pass.second ? <span key={`q${step}`} className="dk-plate dk-plate-2" style={{ background: pass.second }} /> : null}
              <Ply key={now} src={now} cls={live ? 'dk-ply-in' : ''} />
            </span>
          );
        })}
      </span>
      <span className="dk-fact dk-x">{t.use('deck.inside.face')}</span>
    </DeckCard>
  );
}
