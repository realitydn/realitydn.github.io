import React, { useMemo, useState } from 'react';
import DeckSection from '../DeckSection';
import useBuilding from '../useBuilding';
import { fill, Pulse, isPlainClick } from '../parts';
import Calendar from '../../Calendar';
import EventOverlay from '../../EventOverlay';
import { FLOORS, roomsOf } from '../../../data/deck/building';
import { fmtTime, pickTitle, pickLocName, dateKey } from '../../../data/feed-helpers';
import { fmtDayDate, costLabel } from '../../../data/cal-feed';
import { categoryOf } from '../../../data/event-category';
import { URLS } from '../../../data/translations';

// 01 · What's happening, opened — the whole building with what is in each
// room right now, today's and tomorrow's events as tickets, then the calendar
// the site has always had (posters, rows, the event overlay, the app door).
//
// Everything is the events feed. A room is ON while an event is running in it
// (data/deck/building.js); the bar is on while we're open; a drinks deal
// belongs to the bar. Tapping a lit room or a ticket opens that event.

// How many of tomorrow's events to list before the calendar takes over.
const TOMORROW_MAX = 5;

const eventHref = (ev) => ev.sourceUrl || `${URLS.APP}/events/${ev.id}`;
// "REALITY, 2nd Floor Event Space" → "2nd Floor Event Space": on REALITY's own
// page the venue name in front of every room is noise. An event the feed
// gives no room (a drinks deal: its location is the venue itself) prints none.
const roomName = (ev, lang) =>
  (roomsOf(ev).length ? pickLocName(ev.location, lang).replace(/^REALITY,\s*/i, '') : '');

export default function BuildingSection({ card, no, t, lang }) {
  const { state, events, loading, now, live, clock, hours } = useBuilding();
  const [overlayEvent, setOverlayEvent] = useState(null);
  const S = (k) => t.use(`deck.building.${k}`);
  const C = (k) => t.use(`cal.${k}`);
  const name = (ev) => pickTitle(ev, lang) || C('fallbackTitle');
  const span = (ev) => `${fmtTime(ev.startsAt)}${ev.endsAt ? ` – ${fmtTime(ev.endsAt)}` : ''}`;

  const open = (e, ev) => {
    if (!isPlainClick(e)) return;
    e.preventDefault();
    setOverlayEvent(ev);
  };

  // Today (anything running now, plus what is still to start today) and
  // tomorrow, soonest first. Days are Đà Nẵng days.
  const { today, tomorrow } = useMemo(() => {
    const todayKey = dateKey(new Date(now).toISOString());
    const tomorrowKey = dateKey(new Date(now + 86400000).toISOString());
    const sorted = (events || [])
      .filter((ev) => ev && ev.startsAt)
      .slice()
      .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
    const running = new Set(state.nowEvents.map((ev) => ev.id));
    return {
      today: sorted.filter((ev) => running.has(ev.id)
        || (dateKey(ev.startsAt) === todayKey && Date.parse(ev.endsAt || ev.startsAt) >= now)),
      tomorrow: sorted.filter((ev) => dateKey(ev.startsAt) === tomorrowKey),
    };
  }, [events, state.nowEvents, now]);

  const n = state.onCount;
  const status = n === 0 ? S('nothingOn') : n === 1 ? S('roomOn') : fill(S('roomsOn'), { n });
  const nextLine = state.next
    ? fill(S('nextAt'), { title: name(state.next), time: fmtTime(state.next.startsAt) })
    : '';
  const dayLabel = fmtDayDate(new Date(now).toISOString(), lang);

  const ticket = (ev) => {
    const on = state.nowEvents.some((x) => x.id === ev.id) || (state.deal && state.deal.id === ev.id);
    const facts = [
      roomName(ev, lang),
      ev.host ? C('hostedBy').replace('{name}', ev.host) : '',
      costLabel(ev, lang),
    ].filter(Boolean).join(' · ');
    return (
      <a
        key={ev.id}
        href={eventHref(ev)}
        className="tkt dk-ev"
        data-cat={categoryOf(ev)}
        onClick={(e) => open(e, ev)}
      >
        <b>
          {on ? <Pulse /> : null}
          {fmtTime(ev.startsAt)}
        </b>
        <span>
          <span className="dk-name">{name(ev)}</span>
          <span className="dk-fact">{facts}</span>
        </span>
      </a>
    );
  };

  const room = (code) => {
    const r = state.rooms[code];
    const ev = r.now;
    const inner = (
      <>
        <b>{t.use(`infoHost.pricing.spaces.${code.toLowerCase()}`)}</b>
        {/* No claim about a room until the feed has answered, and none at all
            in the static HTML. */}
        {live && !loading ? (
          <span className="dk-rm-t">
            {ev ? name(ev) : S('noEvent')}
            {ev ? (
              <small>
                {span(ev)}
                {ev.host ? ` · ${ev.host}` : ''}
              </small>
            ) : null}
            {r.next ? (
              <small className="nx">
                {S('next')} {fmtTime(r.next.startsAt)} · {name(r.next)}
              </small>
            ) : null}
          </span>
        ) : null}
      </>
    );
    return ev ? (
      <a key={code} className="dk-rm on" href={eventHref(ev)} onClick={(e) => open(e, ev)}>{inner}</a>
    ) : (
      <div key={code} className="dk-rm">{inner}</div>
    );
  };

  const bar = () => (
    <div key="bar" className={`dk-rm dk-rm-bar${live && hours.open ? ' open' : ''}`}>
      <b>{S('bar')}</b>
      <span className="dk-rm-t">
        {live ? (
          <>
            {hours.open ? t.use('deck.status.open') : t.use('deck.status.closed')}
            <small>
              {fill(t.use(hours.open ? 'deck.status.till' : 'deck.status.opens'), { time: hours.until })}
            </small>
          </>
        ) : (
          t.use('hours')
        )}
        {state.deal ? (
          <a className="dk-rm-deal" href={eventHref(state.deal)} onClick={(e) => open(e, state.deal)}>
            {span(state.deal)} · {name(state.deal)}
          </a>
        ) : null}
      </span>
    </div>
  );

  return (
    <DeckSection
      card={card}
      no={no}
      t={t}
      live={live ? (
        <>
          <Pulse off={n === 0} />
          {dayLabel} · {clock.hhmm} · {status}
        </>
      ) : t.use('hours')}
    >
      <div className="dk-g2 dk-now">
        <div>
          {/* The building is a picture of the night: an ink block, lit rooms
              in red. The sentence under it says the same thing in words. */}
          <div className="dk-bldg" role="group" aria-label={S('label')}>
            {FLOORS.map((floor) => (
              <div key={floor.n} className="dk-fl">
                <span className="dk-fn" aria-label={fill(S('floor'), { n: floor.n })}>{floor.n}</span>
                <div
                  className="dk-rooms"
                  style={{ gridTemplateColumns: floor.cells.map((c) => `minmax(0, ${c.w}fr)`).join(' ') }}
                >
                  {floor.cells.map((cell, i) => {
                    if (cell.sky) return <span key={i} className="dk-sky">{S('sky')}</span>;
                    if (cell.bar) return bar();
                    return room(cell.room);
                  })}
                </div>
              </div>
            ))}
            <p className="dk-street">86 Mai Thúc Lân · {S('street')}</p>
          </div>
          {live && !loading ? (
            <p className="dk-fact dk-now-line">
              <Pulse off={n === 0} />
              {status}
              {nextLine ? ` · ${nextLine}` : ''}
            </p>
          ) : null}
        </div>

        <div className="dk-evs">
          <h3 className="dk-label">{clock.h >= 17 ? C('tonight') : C('today')}</h3>
          {today.length ? today.map(ticket) : (
            <p className="dk-small">{loading ? C('loading') : S('nothingToday')}</p>
          )}
          <h3 className="dk-label">{C('tomorrow')}</h3>
          {tomorrow.length ? tomorrow.slice(0, TOMORROW_MAX).map(ticket) : (
            <p className="dk-small">{loading ? C('loading') : S('nothingTomorrow')}</p>
          )}
        </div>
      </div>

      {/* The calendar as the site has always had it. */}
      <Calendar lang={lang} embedded />

      <EventOverlay event={overlayEvent} lang={lang} onClose={() => setOverlayEvent(null)} />
    </DeckSection>
  );
}
