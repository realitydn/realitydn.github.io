import React, { useMemo, useState } from 'react';
import DeckSection from '../DeckSection';
import useBuilding from '../useBuilding';
import { fill, Pulse, isPlainClick } from '../parts';
import Expand from '../Expand';
import Calendar from '../../Calendar';
import EventOverlay from '../../EventOverlay';
import { FLOORS, roomsOf } from '../../../data/deck/building';
import { fmtTime, pickTitle, pickLocName, pickPoster, dateKey } from '../../../data/feed-helpers';
import { fmtDayDate, fmtDM, costLabel, cfStr } from '../../../data/cal-feed';
import { categoryOf, isDealEvent } from '../../../data/event-category';
import { URLS } from '../../../data/translations';

// 01 · What's happening, opened.
//
// SHORT (what you scroll past): the building with the rooms in use lit, and
// the next few events, large: when, the name, the room, the poster. It is
// there to attract, not to brief.
// LONG (the "All events" fold): today's and tomorrow's events as tickets with
// host and price, then the calendar the site has always had (posters with
// their stories, rows, the app door).
//
// Everything is the events feed. A room is ON while an event is running in it
// (data/deck/building.js); the bar is on while we're open; a drinks deal
// belongs to the bar. Tapping a lit room or a ticket opens that event.

// How many events to show large before the fold.
const PICKS = 3;
// How many of tomorrow's events to list in the fold before the calendar takes over.
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
  const CF = cfStr(lang);
  const name = (ev) => pickTitle(ev, lang) || C('fallbackTitle');
  const span = (ev) => `${fmtTime(ev.startsAt)}${ev.endsAt ? ` – ${fmtTime(ev.endsAt)}` : ''}`;

  const open = (e, ev) => {
    if (!isPlainClick(e)) return;
    e.preventDefault();
    setOverlayEvent(ev);
  };

  // Today (anything running now, plus what is still to start today) and
  // tomorrow, soonest first. Days are Đà Nẵng days. `picks` are the next few
  // events of any day, what is running now first; a drinks deal is not one
  // (it has the bar, and its own ticket on the menu).
  const { today, tomorrow, picks, todayKey, tomorrowKey } = useMemo(() => {
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
      picks: sorted
        .filter((ev) => !isDealEvent(ev) && (running.has(ev.id) || Date.parse(ev.startsAt) >= now))
        .slice(0, PICKS),
      todayKey,
      tomorrowKey,
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

  // One of the next few events, large: when, the name, the room, the poster.
  const pick = (ev) => {
    const on = state.nowEvents.some((x) => x.id === ev.id);
    const key = dateKey(ev.startsAt);
    const hour = parseInt(fmtTime(ev.startsAt).slice(0, 2), 10);
    const day = key === todayKey ? (hour >= 17 ? C('tonight') : C('today'))
      : key === tomorrowKey ? C('tomorrow')
        : fmtDayDate(ev.startsAt, lang);
    const img = pickPoster(ev.posters);
    const title = name(ev);
    return (
      <a
        key={ev.id}
        href={eventHref(ev)}
        className="tkt dk-pick"
        data-cat={categoryOf(ev)}
        onClick={(e) => open(e, ev)}
      >
        <span className="dk-pick-b">
          <span className="dk-pick-w">
            {on ? <Pulse /> : null}
            {day} · {on ? span(ev) : fmtTime(ev.startsAt)}
          </span>
          <span className="dk-pick-n">{title}</span>
          <span className="dk-pick-r">{roomName(ev, lang)}</span>
        </span>
        <span className="dk-pick-p">
          {img ? (
            <img src={img} alt={C('posterAlt').replace('{title}', title)} loading="lazy" decoding="async" />
          ) : (
            <span className="dk-pick-np" aria-hidden="true">{fmtDM(ev.startsAt)}</span>
          )}
        </span>
      </a>
    );
  };

  // A room of the building. On the card it says one thing: its name, and
  // what is on in it while something is.
  const room = (code) => {
    const r = state.rooms[code];
    const ev = r.now;
    const inner = (
      <>
        <b>{t.use(`infoHost.pricing.spaces.${code.toLowerCase()}`)}</b>
        {/* No claim about a room until the feed has answered, and none at all
            in the static HTML. */}
        {live && !loading ? (
          ev ? (
            <span className="dk-rm-t">
              {name(ev)}
              <small>{span(ev)}</small>
            </span>
          ) : (
            <span className="sr-only">{S('noEvent')}</span>
          )
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

        <div className="dk-picks">
          <h3 className="dk-label">{CF.upNext}</h3>
          {picks.length ? picks.map(pick) : (
            <p className="dk-small">{loading ? C('loading') : C('empty')}</p>
          )}
        </div>
      </div>

      {/* The long version. Shut, it is one bar; a page loaded on /#events
          arrives with it open (hooks/useHashLanding.js). */}
      <Expand id="events-all" label={S('all')} close={t.use('eventOverlay.close')}>
        <div className="dk-g2 dk-evs-2">
          <div className="dk-evs">
            <h3 className="dk-label">{clock.h >= 17 ? C('tonight') : C('today')}</h3>
            {today.length ? today.map(ticket) : (
              <p className="dk-small">{loading ? C('loading') : S('nothingToday')}</p>
            )}
          </div>
          <div className="dk-evs">
            <h3 className="dk-label">{C('tomorrow')}</h3>
            {tomorrow.length ? tomorrow.slice(0, TOMORROW_MAX).map(ticket) : (
              <p className="dk-small">{loading ? C('loading') : S('nothingTomorrow')}</p>
            )}
          </div>
        </div>
        {/* The calendar as the site has always had it. */}
        <Calendar lang={lang} embedded />
      </Expand>

      <EventOverlay event={overlayEvent} lang={lang} onClose={() => setOverlayEvent(null)} />
    </DeckSection>
  );
}
