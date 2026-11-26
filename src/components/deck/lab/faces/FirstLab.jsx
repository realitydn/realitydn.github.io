import React from 'react';
import DeckCard from '../../DeckCard';
import { fill } from '../../parts';
import { useBeat } from '../../ambient';
import { useSteps } from '../kit';

// 02 · First time here? — the face of faces/FirstFace.jsx, plus:
//   a  the four numbers are daubed in order (phone: the figure counts 1 → 4)
//   b  one step steps forward and settles back, the next step next turn
//   c  each turn ticks off one more step; after the fourth the card clears
export default function FirstLab({ card, no, t, v }) {
  const steps = t.use('deck.first.steps');
  const list = Array.isArray(steps) ? steps : [];
  const count = list.length;
  const { beat, ref } = useBeat({ on: v !== 'off', pace: v === 'a' ? 'slow' : 'mid', order: Number(no) });

  // a (phone): 1, 2, 3 … up to the count, one every 220 ms
  const counting = useSteps(v === 'a' ? beat : 0, count, 220);
  // b: whose turn it is
  const turn = beat > 0 && count ? (beat - 1) % count : -1;
  // c: how many are ticked. A cycle is count + 1 turns: the last one clears.
  const phase = beat > 0 ? beat % (count + 1) : 0;
  const ticked = v === 'c' ? phase : 0;

  let figure = count;
  let figureKey = 'still';
  let figureCls = '';
  if (beat > 0) {
    if (v === 'a') {
      figure = counting + 1;
      figureKey = `a${beat}:${counting}`;
      figureCls = ' dkm-pop';
    } else if (v === 'b') {
      figureKey = `b${beat}`;
      figureCls = ' dkm-press';
    } else if (v === 'c' && ticked) {
      // the ticks so far; the newest one is daubed
      figure = (
        <span className="dkm-ticks">
          {Array.from({ length: ticked }, (_, i) => (
            <i key={i === ticked - 1 ? `new${beat}` : i} className={i === ticked - 1 ? 'dkm-daub' : ''}>✓</i>
          ))}
        </span>
      );
      figureKey = 'ticks';
    } else if (v === 'c') {
      figureKey = `c${beat}`;
      figureCls = ' dkm-pop';
    }
  }

  return (
    <DeckCard card={card} no={no} t={t} meta={fill(t.use('deck.first.count'), { n: count })}>
      <span ref={ref} className="dk-steps dk-x">
        {list.map((s, i) => {
          let rowCls = '';
          let rowKey = i;
          let bCls = '';
          let bStyle;
          let mark = i + 1;
          if (beat > 0) {
            if (v === 'a') {
              bCls = 'dkm-daub';
              bStyle = { animationDelay: `${i * 150}ms` };
              rowKey = `${i}:${beat}`;
            } else if (v === 'b' && i === turn) {
              rowCls = 'dkm-step-go';
              rowKey = `${i}:${beat}`;
            } else if (v === 'c') {
              if (i < ticked) mark = '✓';
              // the one ticked this turn is daubed; on the clearing turn all re-print
              if (i === ticked - 1) {
                bCls = 'dkm-daub';
                rowKey = `${i}:${beat}`;
              } else if (phase === 0) {
                bCls = 'dkm-pop';
                rowKey = `${i}:${beat}`;
              }
            }
          }
          return (
            <span key={rowKey} className={rowCls}>
              <b className={bCls} style={bStyle}>{mark}</b>
              {s.t}
            </span>
          );
        })}
      </span>
      <span key={figureKey} className={`dk-num dk-only-compact dkm-fig${figureCls}`} aria-hidden="true">{figure}</span>
    </DeckCard>
  );
}
