import React from 'react';
import DeckCard from '../DeckCard';
import { useBeat } from '../ambient';
import { fill } from '../parts';
import useFundraisers from '../../../hooks/useFundraisers';
import { vndShort } from '../../../data/deck/fundraisers';
import { dmy } from '../../../data/deck/event-audit';

// 05 · Charitable giving — the total raised here and the latest fundraiser.
// From the app's fundraisers feed once it has rows; until then the marked
// stand-in list (data/deck/fundraisers.js), whose total prints with a "+"
// because every figure in it is rounded or a floor.
//
// THE MOTION ("Echo"): two colour plates shoot out from behind the total,
// hold as a misregistered print, and snap back — every EVERY beats of the
// page's clock (../ambient.js; 8 beats = 6.4 s).
const EVERY = 8;

export default function GivingFace({ card, no, t, lang }) {
  const { rows, totalVnd, totalApprox } = useFundraisers();
  const S = (k) => t.use(`deck.giving.${k}`);
  const last = rows
    .filter((r) => r.heldOn)
    .sort((a, b) => String(b.heldOn).localeCompare(String(a.heldOn)))[0];
  const title = (r) => (lang === 'VN' && r.title_vi) || r.title;
  const { beat, ref } = useBeat({ every: EVERY, order: Number(no) });
  const total = `${vndShort(totalVnd)}${totalApprox ? '+' : ''}`;
  return (
    <DeckCard card={card} no={no} t={t} meta={fill(S('count'), { n: rows.length })}>
      {/* data-t: the two plates are copies of the figure, drawn by CSS */}
      <span ref={ref} key={beat} className={`dk-num dk-echo${beat ? ' dk-echo-go' : ''}`} data-t={total}>
        {total}
      </span>
      {last ? (
        <span className="dk-fact dk-x dk-clamp2">
          {fill(S('last'), { title: title(last), date: dmy(String(last.heldOn).slice(0, 10)) })}
        </span>
      ) : null}
    </DeckCard>
  );
}
