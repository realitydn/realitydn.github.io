import React from 'react';
import DeckCard from '../DeckCard';
import useBuilding from '../useBuilding';
import { fill, Pulse } from '../parts';
import { FLOORS, roomHas } from '../../../data/deck/building';
import { fmtTime, pickTitle, dateKey } from '../../../data/feed-helpers';
import { fmtDM } from '../../../data/cal-feed';

// 01 · What's happening — a small cutaway of the building. A room with an
// event in it right now is lit red; the line underneath says how many rooms
// are on and what starts next. From the events feed, re-read every minute.
// On the wide card a free room says what is in it (the pool table, the board
// games: ROOM_HAS in data/deck/building.js), in a lighter weight than a lit
// room's event.
// The phone card is the same building as blocks, with one short line under
// it, because blocks alone are empty outlines when nothing is on (Donald,
// 25.11.26): how many rooms are on, or when the next event starts.
export default function BuildingFace({ card, no, t, lang }) {
  const { state, loading, live, now, clock, hours } = useBuilding();
  const S = (k) => t.use(`deck.building.${k}`);
  const name = (ev) => pickTitle(ev, lang) || t.use('cal.fallbackTitle');

  const n = state.onCount;
  const status = n === 0 ? S('nothingOn') : n === 1 ? S('roomOn') : fill(S('roomsOn'), { n });
  const next = state.next
    ? fill(S('nextAt'), { title: name(state.next), time: fmtTime(state.next.startsAt) })
    : '';

  // The phone card's line. The next event's time when it is today or
  // tomorrow (Đà Nẵng days), its date when it is further off.
  const soon = state.next && [now, now + 86400000]
    .some((ms) => dateKey(new Date(ms).toISOString()) === dateKey(state.next.startsAt));
  const short = !live || loading ? ''
    : n > 0 ? fill(S('onShort'), { n })
      : state.next ? fill(S('nextShort'), { time: soon ? fmtTime(state.next.startsAt) : fmtDM(state.next.startsAt) })
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
              // nothing is said about a free room until the feed has answered
              const has = !on && live && !loading ? roomHas(cell.room, lang) : '';
              return (
                <i key={i} className={on ? 'on' : ''}>
                  {cell.room}
                  {on ? <span className="dk-x"> · {name(on)}</span> : null}
                  {has ? <span className="dk-x dk-mb-has"> · {has}</span> : null}
                </i>
              );
            })}
          </span>
        ))}
      </span>
      {short ? (
        <span className="dk-fact dk-only-compact">
          {n > 0 ? <Pulse /> : null}
          {short}
        </span>
      ) : null}
      {/* The sentence, on the wide card only: the phone card has the short
          line above instead. */}
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
