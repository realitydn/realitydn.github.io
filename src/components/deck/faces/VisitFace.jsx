import React from 'react';
import DeckCard from '../DeckCard';
import { useBeat } from '../ambient';
import { fill, Pulse, isStill } from '../parts';
import useNow from '../../../hooks/useNow';
import { OPENS, CLOSES, ictClock, openNow } from '../../../data/deck/open-hours';

// 09 · Find us — the address, and whether we're open right now (11:00–02:00,
// worked out in Đà Nẵng time: data/deck/open-hours.js).
//
// THE HOURS STRIP: one cell per open hour — 11, 12 … 23, 0, 1. The hours
// already gone are ink, the hour it is now is red, the hours to come are
// outlines. Closed (and in the static HTML, which never bakes in a "now"):
// fifteen outlines.
//
// THE MOTION: while we are open, the current hour's cell is stamped again.
// How often is not set here: this face keeps the pace FACES.visit names in
// src/lib/beat.js (every 3 s).
const HOURS = [];
for (let h = OPENS; h !== CLOSES; h = (h + 1) % 24) HOURS.push(h);

export default function VisitFace({ card, no, t }) {
  const now = useNow();
  const { open, until } = openNow(now);
  const S = (k) => t.use(`deck.status.${k}`);
  const still = isStill();
  const nowAt = open && !still ? HOURS.indexOf(ictClock(now).h) : -1;
  const { beat, ref } = useBeat({ face: 'visit', on: nowAt >= 0, order: Number(no) });
  return (
    <DeckCard card={card} no={no} t={t} meta="11:00 – 02:00">
      <span className="dk-t dk-x">86 Mai Thúc Lân, Đà Nẵng</span>
      <span ref={ref} className="dk-hours" aria-hidden="true">
        {HOURS.map((h, i) => {
          const isNow = i === nowAt;
          const cls = isNow ? `now${beat ? ' dk-reprint' : ''}` : i < nowAt ? 'past' : undefined;
          // key: the current hour's cell is a new element on each beat, so its stamp plays again
          return <i key={isNow ? `${h}:${beat}` : h} className={cls} />;
        })}
      </span>
      <span className="dk-fact">
        {still ? (
          t.use('hours')
        ) : (
          <>
            <Pulse off={!open} />
            {open ? S('open') : S('closed')}
            <span className="dk-x"> · {fill(open ? S('till') : S('opens'), { time: until })}</span>
            {/* the phone card: the same, on its own line */}
            <span className="dk-only-compact">{fill(open ? S('till') : S('opens'), { time: until })}</span>
          </>
        )}
        <span className="dk-x dk-block">{t.use('deck.visit.area')}</span>
      </span>
    </DeckCard>
  );
}
