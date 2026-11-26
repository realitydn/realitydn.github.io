import React from 'react';
import DeckCard from '../../DeckCard';
import { fill } from '../../parts';
import { Icons } from '../../../Icons';
import { WAYS_IN } from '../../faces/ConnectFace';
import { useBeat } from '../../ambient';

// 08 · Get connected — the face of faces/ConnectFace.jsx, plus:
//   a  the four channels are stamped in turn, each kicking a print out behind it
//   b  one channel is pressed and prints solid for a second, the next one next turn
//   c  a small yellow square lands on one channel's icon, like a badge, stays a
//      moment, and goes
export default function ConnectLab({ card, no, t, v }) {
  const { beat, ref } = useBeat({ on: v !== 'off', pace: 'slow', order: Number(no) });
  const turn = beat > 0 ? (beat - 1) % WAYS_IN.length : -1;
  return (
    <DeckCard card={card} no={no} t={t} meta={fill(t.use('deck.connect.ways'), { n: WAYS_IN.length })}>
      <span ref={ref} className="dk-chips dkm-chips">
        {WAYS_IN.map((w, i) => {
          let cls = '';
          let key = w.key;
          let style;
          let ping = null;
          if (beat > 0) {
            if (v === 'a') {
              cls = 'dkm-chip-pop';
              key = `${w.key}:${beat}`;
              style = { animationDelay: `${i * 130}ms` };
            } else if (v === 'b' && i === turn) {
              cls = 'dkm-chip-press';
              key = `${w.key}:${beat}`;
            } else if (v === 'c' && i === turn) {
              cls = 'dkm-chip-pinged';
              key = `${w.key}:${beat}`;
              ping = <i className="dkm-ping" aria-hidden="true" />;
            }
          }
          return (
            <span key={key} className={cls} style={style}>
              <span className="dkm-ico">
                {Icons[w.icon]()}
                {ping}
              </span>
              <span className="dk-x">{w.label || t.use('deck.connect.app')}</span>
            </span>
          );
        })}
      </span>
      <span className="dk-fact dk-x dk-clamp2">{t.use('getApp.blurb')}</span>
    </DeckCard>
  );
}
