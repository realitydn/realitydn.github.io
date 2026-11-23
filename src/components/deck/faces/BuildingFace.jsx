import React from 'react';
import DeckCard from '../DeckCard';
import useBuilding from '../useBuilding';
import { fill, Pulse } from '../parts';
import { FLOORS } from '../../../data/deck/building';
import { fmtTime, pickTitle } from '../../../data/feed-helpers';

// 01 · What's happening — a small cutaway of the building. A room with an
// event in it right now is lit red; the line underneath says how many rooms
// are on and what starts next. From the events feed, re-read every minute.
export default function BuildingFace({ card, no, t, lang }) {
  const { state, live, clock, hours } = useBuilding();
  const S = (k) => t.use(`deck.building.${k}`);
  const name = (ev) => pickTitle(ev, lang) || t.use('cal.fallbackTitle');

  const n = state.onCount;
  const status = n === 0 ? S('nothingOn') : n === 1 ? S('roomOn') : fill(S('roomsOn'), { n });
  const next = state.next
    ? fill(S('nextAt'), { title: name(state.next), time: fmtTime(state.next.startsAt) })
    : '';

  return (
    <DeckCard card={card} no={no} t={t} meta={live ? clock.hhmm : null}>
      {/* A picture of the building: the sentence below says the same thing. */}
      <span className="dk-mb" aria-hidden="true">
        {FLOORS.map((floor) => (
          <span
            key={floor.n}
            className="dk-mb-row"
            style={{ gridTemplateColumns: floor.cells.map((c) => `${c.w}fr`).join(' ') }}
          >
            {floor.cells.map((cell, i) => {
              if (cell.sky) return <i key={i} className="sky" />;
              if (cell.bar) {
                return (
                  <i key={i} className={state.deal ? 'deal' : live && hours.open ? 'open' : ''}>
                    {S('bar')}
                  </i>
                );
              }
              const on = state.rooms[cell.room].now;
              return (
                <i key={i} className={on ? 'on' : ''}>
                  {cell.room}
                  {on ? <span className="dk-x"> · {name(on)}</span> : null}
                </i>
              );
            })}
          </span>
        ))}
      </span>
      {/* On the compact (phone) card the lit rooms are the whole message:
          there is no room for the sentence under them. */}
      <span className="dk-fact dk-clamp2 dk-x">
        {live ? (
          <>
            <Pulse off={n === 0} />
            {status}
            {next ? ` · ${next}` : null}
          </>
        ) : (
          t.use('hours')
        )}
      </span>
    </DeckCard>
  );
}
