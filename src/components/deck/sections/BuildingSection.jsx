import React, { useMemo, useState } from 'react';
import DeckSection from '../DeckSection';
import useBuilding from '../useBuilding';
import NowPlaying from '../NowPlaying';
import { fill, Pulse, isPlainClick } from '../parts';
import { Icons } from '../../Icons';
import EventOverlay from '../../EventOverlay';
import { FLOORS, roomsOf, roomHas } from '../../../data/deck/building';
import { fmtTime, pickTitle, pickLocName, pickPoster, dateKey } from '../../../data/feed-helpers';
import { fmtDayDate, fmtDM, cfStr } from '../../../data/cal-feed';
import { categoryOf, isDealEvent } from '../../../data/event-category';
import { URLS } from '../../../data/translations';

// 01 · What's happening, opened (reworked 25.11.26).
//
//   THE BUILDING     the rooms in use lit, and one line saying the same thing.
//                    A free room says what is in it (the pool table, the
//                    board games): the lines are in data/deck/building.js
//   NOW PLAYING      the track playing in the bar: on the page only when the
//                    now-playing feed says so (../NowPlaying.jsx; no feed yet)
//   COMING UP        the next few events, large: when, the name, the room, the
//                    poster. Three on a phone, four or five on a larger screen
//                    (deck.css block 11 hides the rest)
//   THE WEBAPP       what it is, and the door to it. The full calendar is
//                    there, not here: this card highlights, it does not list.
//
// There is no fold on this card. (Until 25.11.26 an "All events" fold held
// today's and tomorrow's events and the old calendar; Donald: "too meaty a
// section. This should be an intro to our webapp, with a few of the things
// coming up highlighted.")
//
// Everything is the events feed. A room is ON while an event is running in it
// (data/deck/building.js); the bar is on while we're open; a drinks deal
// belongs to the bar. Tapping a lit room or an event opens that event in the
// overlay; the overlay's button goes on to the event's page in the webapp.
// Nothing links INTO the overlay from outside (it has no address of its own).

// The most events ever shown here. How many of them a given screen shows is
// CSS: .dk-pick:nth-child in deck.css.
const PICKS = 5;

const appUrl = (medium) => `${URLS.APP}/?utm_source=website&utm_medium=${medium}`;
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

  // The next few events of any day, what is running now first. Days are
  // Đà Nẵng days. A drinks deal is not one (it has the bar, and its own
  // ticket on the menu).
  const { picks, todayKey, tomorrowKey } = useMemo(() => {
    const running = new Set(state.nowEvents.map((ev) => ev.id));
    return {
      picks: (events || [])
        .filter((ev) => ev && ev.startsAt)
        .slice()
        .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt))
        .filter((ev) => !isDealEvent(ev) && (running.has(ev.id) || Date.parse(ev.startsAt) >= now))
        .slice(0, PICKS),
      todayKey: dateKey(new Date(now).toISOString()),
      tomorrowKey: dateKey(new Date(now + 86400000).toISOString()),
    };
  }, [events, state.nowEvents, now]);

  const n = state.onCount;
  const status = n === 0 ? S('nothingOn') : n === 1 ? S('roomOn') : fill(S('roomsOn'), { n });
  const nextLine = state.next
    ? fill(S('nextAt'), { title: name(state.next), time: fmtTime(state.next.startsAt) })
    : '';
  const dayLabel = fmtDayDate(new Date(now).toISOString(), lang);

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
  // what is on in it while something is. A free room says what is in it,
  // quietly (ROOM_HAS in data/deck/building.js), so the lit rooms still lead.
  const room = (code) => {
    const r = state.rooms[code];
    const ev = r.now;
    const has = roomHas(code, lang);
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
            <>
              <span className="sr-only">{S('noEvent')}</span>
              {has ? <span className="dk-rm-has">{has}</span> : null}
            </>
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
      <div className="dk-now">
        <div className="dk-now-b">
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
                    // the air beside the rooftop patio: an empty cell, no label
                    if (cell.sky) return <span key={i} className="dk-sky" aria-hidden="true" />;
                    if (cell.bar) return bar();
                    return room(cell.room);
                  })}
                </div>
              </div>
            ))}
            <p className="dk-street">86 Mai Thúc Lân · {S('street')}</p>
          </div>
          <NowPlaying t={t} />
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

        {/* The webapp: the full calendar lives there. */}
        <aside className="tkt dk-pad dk-app" style={{ '--print': 'var(--blue)' }}>
          <div>
            <h3 className="dk-name">{S('appTitle')}</h3>
            <p className="dk-small">{S('appBody')}</p>
          </div>
          <a className="btn-info dk-btn" href={appUrl('deck_events')} target="_blank" rel="noreferrer">
            {Icons.app()} {S('appCta')}
          </a>
        </aside>
      </div>

      <EventOverlay event={overlayEvent} lang={lang} onClose={() => setOverlayEvent(null)} />
    </DeckSection>
  );
}
