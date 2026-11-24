import React, { useContext } from 'react';
import DeckCard from '../../DeckCard';
import { fill, Pulse } from '../../parts';
import { Icons } from '../../../Icons';
import useNow from '../../../../hooks/useNow';
import { OPENS, CLOSES, ictClock, openNow } from '../../../../data/deck/open-hours';
import { useBeat } from '../../ambient';
import { LabCtx } from '../kit';

// 09 · Find us — the face of faces/VisitFace.jsx, plus:
//   a  while we are open, two square rings go out from the open-now marker
//      each turn (closed: nothing moves)
//   b  a map pin sits by the address and drops onto it again each turn
//   c  a strip of the open hours, filled up to now; the current hour is
//      stamped again each turn
//
// The open hours as a list: 11, 12 … 23, 0, 1 (from data/deck/open-hours.js).
const HOURS = [];
for (let h = OPENS; h !== CLOSES; h = (h + 1) % 24) HOURS.push(h);

export default function VisitLab({ card, no, t, v }) {
  const { demoNow } = useContext(LabCtx);
  const realNow = useNow();
  const now = demoNow || realNow;
  const { open, until } = openNow(now);
  const S = (k) => t.use(`deck.status.${k}`);
  const { beat, ref } = useBeat({ on: v !== 'off', every: 4, order: Number(no) });
  const go = beat > 0;
  const nowAt = open ? HOURS.indexOf(ictClock(now).h) : -1;

  return (
    <DeckCard card={card} no={no} t={t} meta="11:00 – 02:00">
      <span className="dk-t dk-x">
        {v === 'b' ? (
          <span key={beat} className={`dkm-pin${go ? ' dkm-pin-go' : ''}`} aria-hidden="true">{Icons.pin()}</span>
        ) : null}
        86 Mai Thúc Lân, Đà Nẵng
      </span>
      {/* the phone card has no address line: the pin stands above the status */}
      {v === 'b' ? (
        <span key={`c${beat}`} className={`dkm-pin dk-only-compact${go ? ' dkm-pin-go' : ''}`} aria-hidden="true">{Icons.pin()}</span>
      ) : null}
      {v === 'c' ? (
        <span className="dkm-hours" aria-hidden="true">
          {HOURS.map((h, i) => {
            const isNow = i === nowAt;
            return (
              <i
                key={isNow ? `${h}:${beat}` : h}
                className={`${i < nowAt ? 'past' : ''}${isNow ? 'now' : ''}${isNow && go ? ' dkm-reprint' : ''}`}
              />
            );
          })}
        </span>
      ) : null}
      <span ref={ref} className="dk-fact">
        <span className="dkm-live">
          <Pulse off={!open} />
          {v === 'a' && open && go ? (
            <>
              <i key={`r1${beat}`} className="dkm-ring" aria-hidden="true" />
              <i key={`r2${beat}`} className="dkm-ring dkm-ring-2" aria-hidden="true" />
            </>
          ) : null}
        </span>
        {open ? S('open') : S('closed')}
        <span className="dk-x"> · {fill(open ? S('till') : S('opens'), { time: until })}</span>
        <span className="dk-x dk-block">{t.use('deck.visit.area')}</span>
      </span>
    </DeckCard>
  );
}
