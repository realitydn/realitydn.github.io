import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { STR } from '../data/translations';
import {
  pickTitle,
  pickQualifier,
  pickDescription,
  pickLocName,
  pickPoster,
  fmtTime,
  needsRsvp,
} from '../data/feed-helpers';
import { fmtDayDate, fmtDM, catLabel, ticketLabel, costLabel, cfStr, weekdayName, weeklyIds } from '../data/cal-feed';
import { categoryOf } from '../data/event-category';
import { seriesNext, alsoComingUp } from '../data/overlay-related';
import { LogoBox } from './Ticket';
import { RsvpBar } from './RsvpNote';
import useDialog from '../hooks/useDialog';
import useFeed from '../hooks/useFeed';

// EventOverlay — the event, opened ON TOP of the page from a calendar card,
// row or the menu's deal ticket, rendered from feed data the page already
// holds. Redesigned 7.10.26 (Donald: "oddly proportioned, cutting up the
// poster, arrives suddenly … doesn't have a clear explanation of what the app
// is … craft it to create curiosity and further engagement"):
//
//   • The POSTER IS NEVER CROPPED (canon): it sits on the riso stripes at its
//     own shape — its own column from md, centred above the text on a phone.
//   • It ARRIVES: by Day or Night the ticket stamps down and its print snaps
//     in on landing (Stamp In); on a phone it is a bottom SHEET that rises
//     with an overshoot (Sheet Up). The poster prints a beat later, then the
//     details lay down in order. It LEAVES too — every close path (✕,
//     Escape, scrim, back gesture) plays the exit, because the overlay keeps
//     the last event on screen for the exit's length after the parent clears
//     it. Reduced motion: the global contract zeroes it all.
//   • It READS: the name in its own case (never forced caps — canon: names
//     keep their case), the facts before the story, the story folded at a few
//     lines with Read more in place (nothing withheld).
//   • It LEADS ON: the series' next dates and more of the same kind, from the
//     feed (overlay-related.js). Tapping one swaps the ticket's contents in
//     place — the plate stays, the new event lays down — so a visitor keeps
//     browsing. They are real links to the app page for crawlers and
//     modified clicks.
//   • It SAYS WHAT THE APP IS: the door panel — the ink square (Donald
//     7.10.26: "use the ink square instead of the black R block"; aria-hidden,
//     static, the one mark on this surface), the site's own one-line pitch,
//     one fact line, and the one red ACTION.
//
// PORTALLED to <body> (a11y pass 23.09.26): every .section is z-index 1, so a
// child overlay was trapped in its section's stacking context. The modal
// contract (focus trap, Escape, focus return, scroll lock, back gesture)
// lives in useDialog — with ONE stable history key per opening, so swapping
// events inside the overlay never stacks history entries.

const APP_BASE = 'https://app.realitydn.com';
const EXIT_MS = 240;

function reducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Localized weekday — peel the d.m tail off fmtDayDate rather than
// splitting on the first space (VN's weekday is two words: "Thứ 2").
function weekdayOf(iso, lang) {
  const full = fmtDayDate(iso, lang);
  const dm = fmtDM(iso);
  return dm && full.endsWith(dm) ? full.slice(0, -dm.length).trim() : full;
}

function appHref(ev, medium) {
  const base = ev.sourceUrl || `${APP_BASE}/events/${ev.id}`;
  try {
    const u = new URL(base);
    u.searchParams.set('utm_source', 'website');
    u.searchParams.set('utm_medium', medium);
    return u.toString();
  } catch {
    return base;
  }
}

function isPlainClick(e) {
  return !e.defaultPrevented && e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;
}

// The ink square, full mode (canon 6.10.26 — the favicon's mark), drawn at
// integer modules. Decorative: the words beside it carry the meaning.
function InkSquare() {
  return (
    <svg className="ev-door-mark" viewBox="0 0 4 4" shapeRendering="crispEdges" aria-hidden="true" focusable="false">
      <rect fill="#ed2224" x="0" y="0" width="2" height="2" />
      <rect fill="#18a7e0" x="2" y="0" width="2" height="2" />
      <rect fill="#fddf00" x="0" y="2" width="2" height="2" />
      <rect fill="#fffbf1" x="2" y="2" width="1" height="1" />
      <rect fill="#ed1b72" x="3" y="2" width="1" height="1" />
      <rect fill="#6e3179" x="2" y="3" width="1" height="1" />
      <rect fill="#fdb515" x="3" y="3" width="1" height="1" />
    </svg>
  );
}

export default function EventOverlay({ event, lang = 'EN', onClose }) {
  // What's on screen, decided IN RENDER so the plate exists in the same commit
  // that opens it (useDialog focuses into it and traps Tab from that commit):
  //   • the parent's event — or the one the visitor swapped to from inside
  //     (next date / also coming up), remembered against the parent's event;
  //   • after the parent clears it, the last one, for EXIT_MS, so the exit
  //     plays on every close path.
  const [swap, setSwap] = useState(null);
  const [, settle] = useState(0);
  const lastRef = useRef(null);
  const [expanded, setExpanded] = useState(false);
  const [clamped, setClamped] = useState(false);
  const plateRef = useRef(null);
  const closeRef = useRef(null);
  const bodyRef = useRef(null);
  const descRef = useRef(null);
  const nameRef = useRef(null);
  // Set by a swap from inside: the link that was tapped is re-mounted away,
  // so focus moves to the new event's name (and a screen reader reads it).
  const swappedRef = useRef(false);
  const { events } = useFeed();

  const shown = event ? (swap && swap.forId === event.id ? swap.ev : event) : lastRef.current;
  const leaving = !event && !!shown;

  // Remember what's open; once closed, hold it for the exit, then let go.
  useEffect(() => {
    if (event) {
      lastRef.current = shown;
      return undefined;
    }
    if (!lastRef.current) return undefined;
    const timer = setTimeout(() => {
      lastRef.current = null;
      setSwap(null);
      settle((n) => n + 1);
    }, reducedMotion() ? 0 : EXIT_MS);
    return () => clearTimeout(timer);
  });

  const open = !!event;
  const requestClose = useDialog({
    open,
    onClose,
    containerRef: plateRef,
    initialFocusRef: closeRef,
    historyKey: open ? 'event-overlay' : null,
  });

  // A swap (or a new opening) starts folded and at the top.
  useEffect(() => {
    setExpanded(false);
    if (bodyRef.current) bodyRef.current.scrollTop = 0;
    if (swappedRef.current && nameRef.current) nameRef.current.focus({ preventScroll: true });
    swappedRef.current = false;
  }, [shown && shown.id]);

  // Only offer "Read more" when the folded story really is cut.
  useLayoutEffect(() => {
    const el = descRef.current;
    setClamped(!!el && el.scrollHeight > el.clientHeight + 2);
  }, [shown && shown.id, lang]);

  if (!shown || typeof document === 'undefined') return null;

  const ev = shown;
  const S = STR[lang].eventOverlay;
  const C = STR[lang].cal;
  const CF = cfStr(lang);
  const G = STR[lang].getApp;
  const all = events || [];
  const title = pickTitle(ev, lang) || C.fallbackTitle;
  const qualifier = pickQualifier(ev, lang);
  const desc = pickDescription(ev, lang);
  const loc = pickLocName(ev.location, lang);
  const poster = pickPoster(ev.posters);
  const cat = categoryOf(ev);
  const label = catLabel(cat, lang);
  const start = fmtTime(ev.startsAt);
  const end = ev.endsAt ? fmtTime(ev.endsAt) : '';
  const dateTab = [fmtDayDate(ev.startsAt, lang), end ? `${start}–${end}` : start].filter(Boolean).join(' · ');
  const rsvp = needsRsvp(ev);
  const titleId = `ev-dlg-title-${ev.id}`;

  const next = seriesNext(all, ev);
  const weekly = next.length > 0 && weeklyIds(all).has(ev.id);
  const nextLabel = weekly
    ? `${C.everyWeekday.replace('{weekday}', weekdayName(ev.startsAt, lang))} · ${CF.nextDates}`
    : CF.moreDates;
  const also = alsoComingUp(all, ev);
  const upcoming = all.length;

  const swapTo = (e, to) => {
    if (!event || !isPlainClick(e)) return;
    e.preventDefault();
    swappedRef.current = true;
    setSwap({ forId: event.id, ev: to });
  };

  return createPortal(
    <div className={`ev-ov${leaving ? ' is-leaving' : ''}`} aria-hidden={leaving || undefined}>
      {/* Ink scrim + plate (canon): siblings, so a scrim click closes without
          a stopPropagation dance. */}
      <div className="scrim ev-scrim" onClick={requestClose} aria-hidden="true" />
      <div
        ref={plateRef}
        className="plate ev-dlg"
        data-cat={cat}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={rsvp ? `${titleId}-rsvp` : undefined}
        tabIndex={-1}
      >
        <span className="ev-grip" aria-hidden="true" />
        <div className="plate-h">
          {/* The top bar: date · time left, category right (wraps, never
              truncates). aria-hidden — the rows below say it. */}
          <span className="ev-dlg-bar" aria-hidden="true">
            <span>{dateTab}</span>
            {label && <span className="ev-dlg-cat">{label}</span>}
          </span>
          <button ref={closeRef} type="button" className="plate-x shrink-0" onClick={requestClose} aria-label={S.close}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M6 6l12 12M6 18L18 6" />
            </svg>
          </button>
        </div>

        {/* Limited-spot event: the notice pins under the top bar. */}
        {rsvp && <RsvpBar lang={lang} id={`${titleId}-rsvp`} />}

        {/* Keyed by the event: a swap re-mounts the contents, so the poster
            re-prints and the details lay down again — the plate stays. */}
        <div ref={bodyRef} className="ev-dlg-body" key={ev.id}>
          <div className={`ev-dlg-poster${poster ? '' : ' is-plain'}`}>
            {poster ? (
              <img
                src={poster}
                alt={C.posterAlt.replace('{title}', title)}
                loading="eager"
                decoding="async"
              />
            ) : (
              <div className="cal-noposter" aria-hidden="true">
                <span className="cal-noposter-wd">{weekdayOf(ev.startsAt, lang)}</span>
                <span className="cal-noposter-dm">{fmtDM(ev.startsAt)}</span>
                <LogoBox className="cal-noposter-logo" />
              </div>
            )}
          </div>

          <div className="ev-dlg-main">
            <div>
              <h3 id={titleId} ref={nameRef} tabIndex={-1} className="ev-dlg-name">{title}</h3>
              {qualifier && <p className="type-sub mt-1">{qualifier}</p>}
              {ev.host && <p className="type-sub mt-1">{C.hostedBy.replace('{name}', ev.host)}</p>}
            </div>

            {/* The facts as ruled ticket rows, before the story. Entry prints
                the price, or "Free" — cost: null only when it really is. */}
            <dl className="tkt-rows ev-dlg-rows">
              <div className="tkt-row">
                <dt>{ticketLabel('when', lang)}</dt>
                <dd>{dateTab}</dd>
              </div>
              {loc && (
                <div className="tkt-row">
                  <dt>{ticketLabel('where', lang)}</dt>
                  <dd>{loc}</dd>
                </div>
              )}
              <div className="tkt-row">
                <dt>{ticketLabel('entry', lang)}</dt>
                <dd>{costLabel(ev, lang)}</dd>
              </div>
            </dl>

            {desc && (
              <div className="ev-dlg-story">
                <p ref={descRef} className={`ev-dlg-desc${expanded ? ' is-open' : ''}`}>
                  {desc}
                </p>
                {(clamped || expanded) && (
                  <button type="button" className="ev-dlg-more" aria-expanded={expanded} onClick={() => setExpanded((v) => !v)}>
                    {expanded ? CF.readLess : CF.readMore}
                  </button>
                )}
              </div>
            )}

            {next.length > 0 && (
              <div className="ev-dlg-sect">
                <p className="ev-dlg-k">{nextLabel}</p>
                <div className="ev-dlg-dates">
                  {next.map((n) => (
                    <a key={n.id} href={appHref(n, 'event_overlay_next')} className="ev-date" onClick={(e) => swapTo(e, n)}>
                      {fmtDayDate(n.startsAt, lang)}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {also.length > 0 && (
              <div className="ev-dlg-sect">
                <p className="ev-dlg-k">
                  {CF.alsoComingUp}
                  {label ? ` · ${label}` : ''}
                </p>
                <ul className="ev-also">
                  {also.map((a) => (
                    <li key={a.id}>
                      <a href={appHref(a, 'event_overlay_also')} onClick={(e) => swapTo(e, a)} data-cat={categoryOf(a)}>
                        <span className="ev-also-d">{fmtDayDate(a.startsAt, lang)}</span>
                        <span className="ev-also-n">{pickTitle(a, lang)}</span>
                        <span className="ev-also-go" aria-hidden="true">→</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* The door: what the app is, one fact line, the one red ACTION.
            Pinned, so the call is never far down a phone's swipe. */}
        <div className="plate-f ev-door">
          <InkSquare />
          <div className="ev-door-t">
            <p className="ev-door-k">{CF.appKicker}</p>
            <p className="ev-door-l">{G.blurb}</p>
            <p className="ev-door-f">{CF.appFacts.replace('{n}', String(upcoming))}</p>
          </div>
          <a
            href={appHref(ev, 'event_overlay')}
            target="_blank"
            rel="noreferrer"
            className={`btn-action ev-door-go${rsvp ? ' rsvp-cta' : ''}`}
          >
            {rsvp ? CF.rsvpInApp : CF.openApp} <span aria-hidden="true">→</span>
          </a>
        </div>
      </div>
    </div>,
    document.body
  );
}
