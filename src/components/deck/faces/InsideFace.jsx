import React, { useEffect, useRef, useState } from 'react';
import DeckCard from '../DeckCard';
import { ambientStill, useBeat } from '../ambient';
import { fill } from '../parts';
import { GALLERY } from '../../../data/events';
import { BEAT_MS, FACES, beatsOf } from '../../../lib/beat';

// 05 · Inside — ONE LARGE PHOTO at a time, filling the card under its header
// (Donald, 25.11.26: "should feature just 1 large photo at a time, taking up
// the majority of the card"). It opens on the front of the building in full
// colour; then photos of the space, printed in the card's colour. The same
// on the wide card and on the phone card.
//
// THE PHOTOS are 4:3 cuts in public/images/deck/, each at two sizes: the
// browser takes the small one on a phone or an ordinary laptop screen and the
// large one on a sharper screen (srcSet below).
//     front.jpg    inside-<k>.jpg      640 × 480, 45–66 KB
//     front-s.jpg  inside-<k>-s.jpg    400 × 300, 23–31 KB
// The originals (public/images/gallery/, 80–400 KB) are too heavy for the
// first screen. The frame is never exactly 4:3 (it is nearly square on a
// tall window, wider on a short one), so a cut keeps what matters in its
// middle: the frame trims the edges.
//
//   front    the shopfront (a cut of public/images/hero.jpg). What the card
//            opens on, and the only photo in the static HTML and for a
//            reduced-motion visitor. Card 05 is the middle of the 3 × 3, so
//            this is the centre of the first screen. It is also the first of
//            the rotation, so it comes round again, in the card's colour.
//   the rest the space, from the gallery. Each is fetched one turn before it
//            is shown, never at load: the first screen pays for one photo.
// The opened card has the full gallery.
const PHOTOS = ['front', ...['h', 'b', 'k', 'd', 'm', 'e', 'l', 'g', 'i'].map((k) => `inside-${k}`)];
const DIR = '/images/deck/';
const small = (name) => `${DIR}${name}-s.jpg`;
const srcSetOf = (name) => `${small(name)} 400w, ${DIR}${name}.jpg 640w`;
// How wide the frame is: a card is at most about 255px wide on a desktop
// (the table stops growing), and just under a third of a phone or tablet.
const SIZES = '(min-width: 1000px) 260px, 31vw';

// FULL COLOUR FIRST (Donald, 25.11.26: "start full color, and then after a
// beat or two, get colorized"). The card opens with its photo in its own
// colours, so the shopfront is the most eye-catching thing on the first
// screen. Then the card's colour is printed onto the photo that is already
// there (the photo does not change on that turn), and from the turn after
// that the photos rotate, in the card's colour, for good.
//
// FULL_COLOUR_TURNS is how long the colour photo is left alone, in the
// card's own turns (one turn = 6 s: FACES.inside in src/lib/beat.js).
//   1   the colour is printed about 8 s after the page opens
//   2   about 14 s
// A turn counts only if the shopfront has been on screen for most of it. The
// card's very first turn falls 2 s after the page starts to load, when the
// photo has been up for a second or so; that one is not counted.
const FULL_COLOUR_TURNS = 1;

// THE MOTION ("Registration"): one photo is replaced by the next — printed
// in a few pixels out of register, a colour plate showing at its edge, then
// slid into place. How often is not set here: this face keeps the pace
// FACES.inside names in src/lib/beat.js (every 6 s).
//
// No two passes are alike: each draws its own mix of
//   WIPES    the side the print pass comes from
//   SLIPS    which way, and how far, it lands out of register (px)
//   PLATES   the colour that shows at the edge until it registers
// and one pass in three lays a second plate between the two.
const WIPES = ['inset(0 100% 0 0)', 'inset(100% 0 0 0)', 'inset(0 0 0 100%)', 'inset(0 0 100% 0)'];
const SLIPS = [[-9, 6], [8, 5], [-6, -7], [9, -5], [0, 8], [-10, 0]];
const PLATES = ['var(--pink)', 'var(--blue)', 'var(--amber)', 'var(--yellow)'];

// The pass that prints the card's colour onto the full-colour photo: the
// same move, with the card's own colour as the plate. It comes from the
// left, lands down and to the left, then registers.
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

function Ply({ name, cls = '', onSeen }) {
  return (
    <span className={`dk-ply ${cls}`}>
      {/* sizes and srcSet come before src, so the browser picks once */}
      <img
        sizes={SIZES}
        srcSet={srcSetOf(name)}
        src={small(name)}
        alt=""
        width="640"
        height="480"
        onLoad={onSeen}
        ref={onSeen ? (el) => { if (el && el.complete && el.naturalWidth) onSeen(); } : undefined}
      />
    </span>
  );
}

export default function InsideFace({ card, no, t }) {
  const { beat, ref } = useBeat({ face: 'inside', order: Number(no) });

  // When the shopfront was first on screen, and the beat the colour went on
  // (0 = not yet: the photo is still in full colour).
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

  // -1 full colour · 0 the colour is printed on · 1, 2, 3 … the photo changes
  const step = inked ? beat - inked : -1;
  const inking = step === 0;
  const now = at(Math.max(step, 0));
  const pass = passOf(step);

  // Have the next photo in hand a turn before it is shown. Not before the
  // colour has gone on (the first screen pays for the shopfront alone), and
  // never in the static capture or under reduced motion.
  useEffect(() => {
    if (ambientStill() || step < 0) return;
    const img = new Image();
    img.sizes = SIZES;
    img.srcset = srcSetOf(at(step + 1));
    img.src = small(at(step + 1));
  }, [step]);

  // What is in the frame, bottom layer first.
  const layers = step < 1 ? [
    // Full colour, and the turn the card's colour is printed over it. (The
    // printed layer keeps the photo's key, so it is the same element the
    // first change later prints over.)
    <Ply key={`${now}|full`} name={now} cls="dk-ply-full" onSeen={markSeen} />,
    inking ? <span key="ink" className="dk-plate" /> : null,
    inking ? <Ply key={now} name={now} cls="dk-ply-in" /> : null,
  ] : [
    // the photo this pass prints over stays underneath until it is covered
    <Ply key={at(step - 1)} name={at(step - 1)} />,
    <span key={`p${step}`} className="dk-plate" style={{ background: pass.plate }} />,
    pass.second ? <span key={`q${step}`} className="dk-plate dk-plate-2" style={{ background: pass.second }} /> : null,
    <Ply key={now} name={now} cls="dk-ply-in" />,
  ];

  return (
    <DeckCard card={card} no={no} t={t} flush meta={fill(t.use('deck.inside.photos'), { n: GALLERY.length })}>
      <span ref={ref} className="dk-pic" aria-hidden="true">
        <span
          className={`dk-shot${inking ? ' dk-inking' : ''}`}
          style={step < 1 ? (inking ? INK_PASS : undefined) : pass.style}
        >
          {layers}
        </span>
      </span>
      {/* the card's one line sits on the photo, on a plate of the card's colour */}
      <span className="dk-fact dk-pic-cap dk-x">{t.use('deck.inside.face')}</span>
    </DeckCard>
  );
}
