import React from 'react';
import DeckCard from '../../DeckCard';
import { fill } from '../../parts';
import { ROOM_RATES } from '../../../../data/room-rates';
import { vnd } from '../../../../data/deck/fundraisers';
import { lowestRoomRate } from '../../faces/HostFace';
import { useBeat } from '../../ambient';
import { Odo } from '../kit';

// 07 · Host an event — the face of faces/HostFace.jsx, plus:
//   a  the figure rolls down 3, 2, 1 and lands on 0₫ with a pop
//   b  0₫ is lifted and stamped back down; a yellow print snaps in under it
//      on landing, then goes
//   c  a yellow plate is pulled across behind 0₫, holds, and is pulled off
const REEL = [['3', '2', '1', '0'], '₫'];

export default function HostLab({ card, no, t, v }) {
  const S = (k) => t.use(`deck.host.${k}`);
  const { beat, ref } = useBeat({ on: v !== 'off', every: 8, order: Number(no) });
  const go = beat > 0;

  let num;
  if (v === 'a') {
    num = <Odo className="dk-num" cols={REEL} beat={beat} dur={820} />;
  } else if (v === 'b') {
    num = <span key={beat} className={`dk-num dkm-stamp${go ? ' dkm-stamp-go' : ''}`} data-t="0₫">0₫</span>;
  } else if (v === 'c') {
    num = (
      <span className="dk-num">
        <span key={beat} className={`dkm-hl${go ? ' dkm-hl-go' : ''}`}>0₫</span>
      </span>
    );
  } else {
    num = <span className="dk-num">0₫</span>;
  }

  return (
    <DeckCard card={card} no={no} t={t} meta={fill(S('rooms'), { n: ROOM_RATES.length })}>
      {num}
      <span ref={ref} className="dk-fact dk-x">
        {S('free')} {fill(S('from'), { price: vnd(lowestRoomRate()) })}
      </span>
    </DeckCard>
  );
}
