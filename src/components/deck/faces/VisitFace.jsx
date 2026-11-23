import React from 'react';
import DeckCard from '../DeckCard';
import { fill, Pulse, isStill } from '../parts';
import useNow from '../../../hooks/useNow';
import { openNow } from '../../../data/deck/open-hours';

// 09 · Find us — the address, and whether we're open right now (11:00–02:00,
// worked out in Đà Nẵng time: data/deck/open-hours.js).
export default function VisitFace({ card, no, t }) {
  const now = useNow();
  const { open, until } = openNow(now);
  const S = (k) => t.use(`deck.status.${k}`);
  const still = isStill();
  return (
    <DeckCard card={card} no={no} t={t} meta="11:00 – 02:00">
      <span className="dk-t dk-x">86 Mai Thúc Lân, Đà Nẵng</span>
      <span className="dk-fact">
        {still ? (
          t.use('hours')
        ) : (
          <>
            <Pulse off={!open} />
            {open ? S('open') : S('closed')}
            <span className="dk-x"> · {fill(open ? S('till') : S('opens'), { time: until })}</span>
          </>
        )}
        <span className="dk-x dk-block">{t.use('deck.visit.area')}</span>
      </span>
    </DeckCard>
  );
}
