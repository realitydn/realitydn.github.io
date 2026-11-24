import React from 'react';
import DeckCard from '../DeckCard';
import { useBeat } from '../ambient';
import { fill, decimal } from '../parts';
import { AUDIT, dmy } from '../../../data/deck/event-audit';

// 04 · Events we've held — the count, a small chart of how it has grown, and
// the date the count was taken. Not live: the figures are a snapshot
// (data/deck/event-audit.js), so the card says "as of".
//
// THE MOTION ("Chart prints"): the bars print in left to right ONCE, when the
// card first comes on screen, and then the chart is still for good.
const BAR_STEP_MS = 18; // the gap between one bar and the next

export default function HeldFace({ card, no, t, lang }) {
  const S = (k) => t.use(`deck.held.${k}`);
  const max = Math.max(...AUDIT.trend30);
  const { beat, ref } = useBeat({ once: true, order: Number(no) });
  return (
    <DeckCard card={card} no={no} t={t} meta={fill(S('asOf'), { date: dmy(AUDIT.asOf) })}>
      <span className="dk-num">{AUDIT.total}</span>
      <span ref={ref} className="dk-spark" aria-hidden="true">
        {AUDIT.trend30.map((v, i) => {
          const style = { height: `${Math.max(3, Math.round((v / max) * 100))}%` };
          if (beat) style.animationDelay = `${i * BAR_STEP_MS}ms`;
          return <i key={beat ? `in${i}` : i} className={beat ? 'dk-spark-in' : undefined} style={style} />;
        })}
      </span>
      <span className="dk-fact dk-x">
        {fill(S('perWeek'), { n: decimal(AUDIT.perWeek, lang) })} · {fill(S('since'), { date: dmy(AUDIT.from) })}
      </span>
    </DeckCard>
  );
}
