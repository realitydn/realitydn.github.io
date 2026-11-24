import React from 'react';
import DeckCard from '../DeckCard';
import { fill, decimal } from '../parts';
import { AUDIT, dmy } from '../../../data/deck/event-audit';

// 04 · Events we've held — the count, a small chart of how it has grown, and
// the date the count was taken. Not live: the figures are a snapshot
// (data/deck/event-audit.js), so the card says "as of".
export default function HeldFace({ card, no, t, lang }) {
  const S = (k) => t.use(`deck.held.${k}`);
  const max = Math.max(...AUDIT.trend30);
  return (
    <DeckCard card={card} no={no} t={t} meta={fill(S('asOf'), { date: dmy(AUDIT.asOf) })}>
      <span className="dk-num">{AUDIT.total}</span>
      <span className="dk-spark" aria-hidden="true">
        {AUDIT.trend30.map((v, i) => (
          <i key={i} style={{ height: `${Math.max(3, Math.round((v / max) * 100))}%` }} />
        ))}
      </span>
      <span className="dk-fact dk-x">
        {fill(S('perWeek90'), { n: decimal(AUDIT.perWeek90, lang) })}
      </span>
    </DeckCard>
  );
}
