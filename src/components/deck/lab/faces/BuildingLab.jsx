import React, { useContext, useEffect, useMemo, useRef } from 'react';
import DeckCard from '../../DeckCard';
import { fill, Pulse } from '../../parts';
import useFeed from '../../../../hooks/useFeed';
import useNow from '../../../../hooks/useNow';
import { FLOORS, buildingNow } from '../../../../data/deck/building';
import { ictClock, openNow } from '../../../../data/deck/open-hours';
import { isDealEvent } from '../../../../data/event-category';
import { fmtTime, pickTitle } from '../../../../data/feed-helpers';
import { useBeat } from '../../ambient';
import { LabCtx, Odo } from '../kit';

// 01 · What's happening — the face of faces/BuildingFace.jsx, plus:
//   a  one lit room is stamped again in its own colour, a different one each turn
//   b  the lit rooms go dark and print back in, floor by floor from the street up
//   c  on the minute: the clock's changed digits roll, the lit rooms tick once
export default function BuildingLab({ card, no, t, lang, v }) {
  const { demoNow } = useContext(LabCtx);
  const { events } = useFeed();
  const realNow = useNow();
  const now = demoNow || realNow;
  const state = useMemo(() => buildingNow(events, { now, isDeal: isDealEvent }), [events, now]);
  const clock = ictClock(now);
  const hours = openNow(now);
  const S = (k) => t.use(`deck.building.${k}`);
  const name = (ev) => pickTitle(ev, lang) || t.use('cal.fallbackTitle');

  const { beat, ref, bump } = useBeat({ on: v !== 'off', auto: v !== 'c', pace: v === 'b' ? 'slow' : 'mid', order: Number(no) });

  // c: the performance IS the minute turning.
  const lastMinute = useRef(clock.hhmm);
  useEffect(() => {
    if (lastMinute.current === clock.hhmm) return;
    lastMinute.current = clock.hhmm;
    if (v === 'c') bump();
  }, [clock.hhmm]); // eslint-disable-line react-hooks/exhaustive-deps

  const n = state.onCount;
  const status = n === 0 ? S('nothingOn') : n === 1 ? S('roomOn') : fill(S('roomsOn'), { n });
  const next = state.next
    ? fill(S('nextAt'), { title: name(state.next), time: fmtTime(state.next.startsAt) })
    : '';

  // Every cell that is printed in a colour right now, top floor first. With
  // nothing lit, the bar stands in while we are open.
  const cells = FLOORS.flatMap((floor, fi) =>
    floor.cells.map((cell, ci) => {
      const key = `${fi}:${ci}`;
      const onEv = cell.room ? state.rooms[cell.room].now : null;
      const lit = cell.bar ? !!state.deal : !!onEv;
      return { key, fi, ci, cell, onEv, lit };
    })
  );
  let printed = cells.filter((c) => c.lit);
  if (!printed.length && hours.open) printed = cells.filter((c) => c.cell.bar);
  const order = printed.map((c) => c.key);
  const turnOf = beat > 0 && order.length ? order[(beat - 1) % order.length] : null;

  // c: the digits that changed since a minute ago roll over.
  const prev = ictClock(now - 60000).hhmm;
  const clockCols = clock.hhmm.split('').map((ch, i) => (prev[i] !== ch ? [prev[i], ch] : ch));
  const meta = v === 'c' ? <Odo cols={clockCols} beat={beat} dur={520} step={0} /> : clock.hhmm;

  return (
    <DeckCard card={card} no={no} t={t} meta={meta}>
      <span ref={ref} className="dk-mb dkm-mb" aria-hidden="true">
        {FLOORS.map((floor, fi) => (
          <span
            key={floor.n}
            className="dk-mb-row"
            style={{ gridTemplateColumns: floor.cells.map((c) => `${c.w}fr`).join(' ') }}
          >
            {floor.cells.map((cell, ci) => {
              if (cell.sky) return <i key={ci} className="sky" />;
              const c = cells.find((x) => x.key === `${fi}:${ci}`);
              const isPrinted = order.includes(c.key);
              const base = cell.bar ? (state.deal ? 'deal' : hours.open ? 'open' : '') : c.onEv ? 'on' : '';
              // the street floor goes first (b); the top floor first (c)
              const up = (FLOORS.length - 1 - fi) * 170 + ci * 80;
              const down = order.indexOf(c.key) * 110;
              let cls = base;
              let key = c.key;
              let style;
              let cover = null;
              if (beat > 0) {
                if (v === 'a' && turnOf === c.key) {
                  cls += ' dkm-reprint';
                  key = `${c.key}:${beat}`;
                } else if (v === 'b') {
                  key = `${c.key}:${beat}`;
                  style = { animationDelay: `${up}ms` };
                  if (c.lit) cover = <b className="dkm-cover" style={{ animationDelay: `${up}ms` }} />;
                  else cls += ' dkm-tick';
                } else if (v === 'c' && isPrinted) {
                  cls += ' dkm-pop';
                  key = `${c.key}:${beat}`;
                  style = { animationDelay: `${down}ms` };
                }
              }
              return (
                <i key={key} className={cls} style={style}>
                  {cell.bar ? S('bar') : cell.room}
                  {c.onEv ? <span className="dk-x"> · {name(c.onEv)}</span> : null}
                  {cover}
                </i>
              );
            })}
          </span>
        ))}
      </span>
      <span className="dk-fact dk-clamp2 dk-x">
        <Pulse off={n === 0} />
        {status}
        {next ? ` · ${next}` : null}
      </span>
    </DeckCard>
  );
}
