import React, { useRef } from 'react';
import { createPortal } from 'react-dom';
import { STR } from '../data/translations';
import {
  pickTitle,
  pickQualifier,
  pickDescription,
  pickLocName,
  pickPoster,
  fmtTime,
} from '../data/feed-helpers';
import { fmtDayDate, fmtDM, catLabel, ticketLabel, costLabel } from '../data/cal-feed';
import { categoryOf } from '../data/event-category';
import { LogoBox } from './Ticket';
import useDialog from '../hooks/useDialog';

// EventOverlay — the "collapsible window on top of the page". Clicking an event
// in the feed or the poster carousel opens the event HERE, rendered natively
// from feed data the page already holds, instead of navigating away — the menu
// and the rest of the page stay one Escape/tap behind. The one loud CTA deep-
// links into the app's event page for RSVP/reminders/details.
//
// Night v2 "Cream Tickets" (5.10.26; BOTH themes since round 2): the plate is
// one long cream TICKET in the event's category colour — the header is its
// top bar (date · time / category), the poster sits on riso stripes (no
// poster: stripes + the big d.m date + the logo box — never an empty grey
// box), then the title, the story and ruled When / Where / Entry rows; the
// app door is the red ACTION (cream label). Day and Night differ only at the
// ticket's outer edge (ink by Day, cream at Night) — see index.css TICKETS.
//
// PORTALLED to <body> (a11y pass 23.09.26): every .section is z-index: 1, so
// rendered inside the calendar section the overlay was trapped in that
// section's stacking context and the sticky masthead plus every later
// section painted over it. The modal contract (focus trap, Escape, focus
// return, scroll lock, back-gesture closes) lives in useDialog.

const APP_BASE = 'https://app.realitydn.com';

// Localized weekday — peel the d.m tail off fmtDayDate rather than
// splitting on the first space (VN's weekday is two words: "Thứ 2").
function weekdayOf(iso, lang) {
  const full = fmtDayDate(iso, lang);
  const dm = fmtDM(iso);
  return dm && full.endsWith(dm) ? full.slice(0, -dm.length).trim() : full;
}

export default function EventOverlay({ event, lang = 'EN', onClose }) {
  const open = !!event;
  const plateRef = useRef(null);
  const closeRef = useRef(null);
  const requestClose = useDialog({
    open,
    onClose,
    containerRef: plateRef,
    initialFocusRef: closeRef,
    historyKey: event ? `event:${event.id}` : null,
  });

  if (!open || typeof document === 'undefined') return null;

  const S = STR[lang].eventOverlay;
  const C = STR[lang].cal;
  const title = pickTitle(event, lang) || C.fallbackTitle;
  // Name + qualifier split (hub 0054): the type line under the name; empty =
  // the title renders alone, exactly as before.
  const qualifier = pickQualifier(event, lang);
  const desc = pickDescription(event, lang);
  const loc = pickLocName(event.location, lang);
  const poster = pickPoster(event.posters);
  const cat = categoryOf(event);
  const label = catLabel(cat, lang);
  const start = fmtTime(event.startsAt);
  const end = event.endsAt ? fmtTime(event.endsAt) : '';
  const dateTab = [fmtDayDate(event.startsAt, lang), end ? `${start}–${end}` : start]
    .filter(Boolean)
    .join(' · ');
  const appUrl = `${APP_BASE}/events/${event.id}?utm_source=website&utm_medium=event_overlay`;
  const titleId = `ev-dlg-title-${event.id}`;

  return createPortal(
    <>
      {/* Ink scrim + plate (canon 22.08.26): siblings, so a scrim click closes
          without a stopPropagation dance. No stamp-in on the plate — .dlg
          centres via transform, and stampIn's fill:both would pin over it.
          Geometry lives in index.css (.ev-dlg): the old max-w-2xl (672px) at
          p-4 gutters, 90dvh tall. */}
      <div className="scrim" onClick={requestClose} aria-hidden="true" />
      <div
        ref={plateRef}
        className="plate dlg ev-dlg"
        data-cat={cat}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <div className="plate-h">
          {/* The top bar: date · time left, category right (wraps, never
              truncates). aria-hidden — the rows below say it. */}
          <span className="ev-dlg-bar" aria-hidden="true">
            <span>{dateTab}</span>
            {label && <span className="ev-dlg-cat">{label}</span>}
          </span>
          <button
            ref={closeRef}
            type="button"
            className="plate-x shrink-0"
            onClick={requestClose}
            aria-label={S.close}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M6 6l12 12M6 18L18 6" />
            </svg>
          </button>
        </div>

        {/* One scroller on phones (poster + text together), text-pane-only
            from md — see .ev-dlg-body in index.css. */}
        <div className="ev-dlg-body">
          {poster ? (
            <div className="ev-dlg-poster">
              <img
                src={poster}
                alt={C.posterAlt.replace('{title}', title)}
                loading="eager"
                decoding="async"
              />
            </div>
          ) : (
            <div className="ev-dlg-poster is-plain">
              <div className="cal-noposter" aria-hidden="true">
                <span className="cal-noposter-wd">{weekdayOf(event.startsAt, lang)}</span>
                <span className="cal-noposter-dm">{fmtDM(event.startsAt)}</span>
                <LogoBox className="cal-noposter-logo" />
              </div>
            </div>
          )}

          <div className="plate-b flex-1 min-w-0">
            <div>
              <h3 id={titleId} className="h-section text-2xl md:text-3xl text-ink leading-tight">{title}</h3>
              {qualifier && <p className="type-sub mt-1">{qualifier}</p>}
            </div>

            {desc && (
              <p className="text-sm text-ink/90 font-body whitespace-pre-wrap">{desc}</p>
            )}

            {/* The facts as ruled ticket rows (detail anatomy). Entry prints
                the price, or "Free" — the feed sends cost: null only when the
                event really is free, so the claim is safe to print. */}
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
                <dd>{costLabel(event, lang)}</dd>
              </div>
            </dl>
          </div>
        </div>

        {/* The one loud call, pinned: it used to sit at the bottom of the
            inner scroll (~1500px down on a phone). The red ACTION — cream
            label, ink border inside the ticket. */}
        <div className="plate-f">
          <a
            href={appUrl}
            target="_blank"
            rel="noreferrer"
            className="btn-action px-6 py-3 text-sm"
          >
            {S.openInApp} <span aria-hidden="true">→</span>
          </a>
        </div>
      </div>
    </>,
    document.body
  );
}
