import React from 'react';
import DeckCard from '../DeckCard';
import { fill } from '../parts';
import { ROOM_RATES } from '../../../data/room-rates';
import { vnd } from '../../../data/deck/fundraisers';

// The cheapest hourly rate on the rate card, in ₫ (data/room-rates.js holds
// thousands). Shared with the opened card's header.
export function lowestRoomRate() {
  const all = ROOM_RATES.flatMap((r) => Object.values(r.rates)).filter((v) => typeof v === 'number');
  return Math.min(...all) * 1000;
}

// 07 · Host an event — what it costs to host a public community event (0₫),
// and where private room rental starts: the lowest figure on the rate card.
export default function HostFace({ card, no, t }) {
  const S = (k) => t.use(`deck.host.${k}`);
  return (
    <DeckCard card={card} no={no} t={t} meta={fill(S('rooms'), { n: ROOM_RATES.length })}>
      <span className="dk-num">0₫</span>
      <span className="dk-fact dk-x">
        {S('free')} {fill(S('from'), { price: vnd(lowestRoomRate()) })}
      </span>
    </DeckCard>
  );
}
