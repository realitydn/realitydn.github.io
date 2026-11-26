import React from 'react';
import DeckCard from '../DeckCard';
import { useBeat } from '../ambient';
import { fill } from '../parts';
import useFundraisers from '../../../hooks/useFundraisers';
import { vndShort, rowText } from '../../../data/deck/fundraisers';
import { dmy } from '../../../data/deck/event-audit';

// 07 · Charitable giving — the total raised here and the latest fundraiser.
// From the app's fundraisers feed (read at build, and again in the browser);
// with no rows from it, the stand-in list (data/deck/fundraisers.js), which
// carries the owner's exact figures. The total is in whole millions, rounded
// down; the opened card prints it in full.
//
// THE MOTION ("Echo"): two colour plates shoot out from behind the total,
// hold as a misregistered print, and snap back. How often is not set here:
// this face keeps the pace FACES.giving names in src/lib/beat.js (every 8 s).

export default function GivingFace({ card, no, t, lang }) {
  const { rows, totalVnd } = useFundraisers();
  const S = (k) => t.use(`deck.giving.${k}`);
  const last = rows
    .filter((r) => r.heldOn)
    .sort((a, b) => String(b.heldOn).localeCompare(String(a.heldOn)))[0];
  const { beat, ref } = useBeat({ face: 'giving', order: Number(no) });
  const total = vndShort(totalVnd);
  return (
    <DeckCard card={card} no={no} t={t} meta={fill(S('count'), { n: rows.length })}>
      {/* data-t: the two plates are copies of the figure, drawn by CSS */}
      <span ref={ref} key={beat} className={`dk-num dk-echo${beat ? ' dk-echo-go' : ''}`} data-t={total}>
        {total}
      </span>
      {/* the phone card: the figure's word ("raised") */}
      <span className="dk-fact dk-only-compact">{S('short')}</span>
      {last ? (
        <span className="dk-fact dk-x dk-clamp2">
          {fill(S('last'), { title: rowText(last, 'title', lang), date: dmy(String(last.heldOn).slice(0, 10)) })}
        </span>
      ) : null}
    </DeckCard>
  );
}
