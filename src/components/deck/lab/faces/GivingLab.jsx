import React from 'react';
import DeckCard from '../../DeckCard';
import { fill } from '../../parts';
import useFundraisers from '../../../../hooks/useFundraisers';
import { vndShort } from '../../../../data/deck/fundraisers';
import { dmy } from '../../../../data/deck/event-audit';
import { useBeat } from '../ambient';
import { PixelHeart, useSteps } from '../kit';

// 05 · Charitable giving — the face of faces/GivingFace.jsx, plus:
//   a  a small red heart by the total, daubed again each turn
//   b  the total adds up fundraiser by fundraiser, each amount stamped in turn
//   c  two colour plates shoot out behind the total, hold, and snap back
const TALLY_MAX = 4; // b: at most this many steps, however long the list gets

export default function GivingLab({ card, no, t, lang, v }) {
  const { rows, totalVnd, totalApprox } = useFundraisers();
  const S = (k) => t.use(`deck.giving.${k}`);
  const last = rows
    .filter((r) => r.heldOn)
    .sort((a, b) => String(b.heldOn).localeCompare(String(a.heldOn)))[0];
  const title = (r) => (lang === 'VN' && r.title_vi) || r.title;
  const { beat, ref } = useBeat({ on: v !== 'off' });

  // b: running totals, oldest first (a fundraiser with no date yet goes
  // first), ending on the card's own total. Long lists show the last few.
  const sums = [];
  rows
    .slice()
    .sort((a, b) => String(a.heldOn || '').localeCompare(String(b.heldOn || '')))
    .reduce((sum, r) => {
      const next = sum + (Number(r.amountVnd) || 0);
      sums.push(next);
      return next;
    }, 0);
  const tally = sums.slice(-TALLY_MAX);
  if (tally.length) tally[tally.length - 1] = totalVnd;
  const step = useSteps(v === 'b' ? beat : 0, Math.max(tally.length, 1), 420);
  const atEnd = step >= tally.length - 1;

  const totalText = `${vndShort(totalVnd)}${totalApprox ? '+' : ''}`;
  let num;
  if (v === 'b' && beat > 0 && tally.length > 1) {
    num = (
      <span ref={ref} key={`${beat}:${step}`} className="dk-num dkm-pop">
        {atEnd ? totalText : vndShort(tally[step])}
      </span>
    );
  } else if (v === 'c') {
    num = (
      <span ref={ref} key={beat} className={`dk-num dkm-echo${beat > 0 ? ' dkm-echo-go' : ''}`} data-t={totalText}>
        {totalText}
      </span>
    );
  } else {
    num = (
      <span ref={ref} className="dk-num">
        {totalText}
        {v === 'a' ? (
          <span key={beat} className={`dkm-heart${beat > 0 ? ' dkm-daub' : ''}`}><PixelHeart /></span>
        ) : null}
      </span>
    );
  }

  return (
    <DeckCard card={card} no={no} t={t} meta={fill(S('count'), { n: rows.length })}>
      {num}
      {last ? (
        <span className="dk-fact dk-x dk-clamp2">
          {fill(S('last'), { title: title(last), date: dmy(String(last.heldOn).slice(0, 10)) })}
        </span>
      ) : null}
    </DeckCard>
  );
}
