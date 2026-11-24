import React from 'react';
import DeckCard from '../../DeckCard';
import { fill, decimal } from '../../parts';
import { AUDIT, dmy } from '../../../../data/deck/event-audit';
import { useBeat } from '../../ambient';
import { Odo, countCols } from '../kit';

// 04 · Events we've held — the face of faces/HeldFace.jsx, plus:
//   a  the count rolls up to its number from one average week below it
//   b  the bars print in left to right
//   c  only the newest bar is stamped again; the count gives one small pop
export default function HeldLab({ card, no, t, lang, v }) {
  const S = (k) => t.use(`deck.held.${k}`);
  const max = Math.max(...AUDIT.trend30);
  const { beat, ref } = useBeat({ on: v !== 'off', every: v === 'a' ? 8 : 4, once: v === 'b', order: Number(no) });
  const total = String(AUDIT.total);
  // One average week of events: the same figure the card prints ("22.6 a week").
  const weekAgo = String(AUDIT.total - Math.round(AUDIT.perWeek));
  const last = AUDIT.trend30.length - 1;

  return (
    <DeckCard card={card} no={no} t={t} meta={fill(S('asOf'), { date: dmy(AUDIT.asOf) })}>
      {v === 'a' ? (
        <Odo className="dk-num" cols={countCols(weekAgo, total)} beat={beat} />
      ) : (
        <span key={v === 'c' ? beat : 0} className={`dk-num${v === 'c' && beat > 0 ? ' dkm-pop-late' : ''}`}>{total}</span>
      )}
      <span ref={ref} className="dk-spark dkm-spark" aria-hidden="true">
        {AUDIT.trend30.map((val, i) => {
          const style = { height: `${Math.max(3, Math.round((val / max) * 100))}%` };
          let cls = '';
          let key = i;
          if (beat > 0 && v === 'b') {
            cls = 'dkm-bar';
            key = `${i}:${beat}`;
            style.animationDelay = `${i * 18}ms`;
          } else if (beat > 0 && v === 'c' && i === last) {
            cls = 'dkm-bar';
            key = `${i}:${beat}`;
          }
          return <i key={key} className={cls} style={style} />;
        })}
      </span>
      <span className="dk-fact dk-x">
        {fill(S('perWeek'), { n: decimal(AUDIT.perWeek, lang) })} · {fill(S('since'), { date: dmy(AUDIT.from) })}
      </span>
    </DeckCard>
  );
}
