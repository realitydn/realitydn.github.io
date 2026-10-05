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
import { dayClassFromISO, fmtDayDate, fmtDM, cfStr, catLabel, nightLabel, costLabel } from '../data/cal-feed';
import { categoryOf } from '../data/event-category';
import { LogoBox } from './Ticket';
import useDialog from '../hooks/useDialog';

// EventOverlay — the "collapsible window on top of the page". Clicking an event
// in the feed or the poster carousel opens the event HERE, rendered natively
// from feed data the page already holds, instead of navigating away — the menu
// and the rest of the page stay one Escape/tap behind. The one loud CTA deep-
// links into the app's event page for RSVP/reminders/details.
//
// Wears the event's weekday colour (the same day→palette map as the feed
// slices): a day-colour date tab stamps the header, and when an event has no
// poster the left pane becomes a day-colour plate with a big d.m date — never an
// empty grey box.
//
// NIGHT v2 ("Cream Tickets", 5.10.26): the plate is a cream TICKET in the
// event's category major — the header becomes its top bar (date · time /
// category), the poster sits on riso stripes, and ruled When / Where / Entry
// rows replace the one-line facts; the app door is the red ACTION. The extra
// pieces are display:none in Day (index.css), so the Day overlay is unchanged.
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
  const CF = cfStr(lang);
  const title = pickTitle(event, lang) || C.fallbackTitle;
  // Name + qualifier split (hub 0054): the type line under the name; empty =
  // the title renders alone, exactly as before.
  const qualifier = pickQualifier(event, lang);
  const desc = pickDescription(event, lang);
  const loc = pickLocName(event.location, lang);
  const poster = event.posters?.poster4x5 || pickPoster(event.posters);
  const dayCls = dayClassFromISO(event.startsAt);
  const cat = categoryOf(event);
  const start = fmtTime(event.startsAt);
  const end = event.endsAt ? fmtTime(event.endsAt) : '';
  const dateTab = [fmtDayDate(event.startsAt, lang), end ? `${start}–${end}` : start]
    .filter(Boolean)
    .join(' · ');
  // "Free event" is a claim, not a slogan — the feed sends cost: null only
  // when the event really is free, so the claim is safe to print.
  const costLine = event.cost ? CF.entry.replace('{cost}', event.cost) : CF.freeEvent;
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
        className={`plate dlg ev-dlg ${dayCls}`}
        data-cat={cat}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <div className="plate-h">
          <span className="plate-t min-w-0 truncate" aria-hidden="true">{title}</span>
          {/* Night top bar: date · time left, category right (the title
              moves into the body). aria-hidden — the rows below say it. */}
          <span className="ev-dlg-bar" aria-hidden="true">
            <span className="min-w-0 truncate">{dateTab}</span>
            <span className="shrink-0">{catLabel(cat, lang)}</span>
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
              {dateTab && <span className="cal-datetab mb-3">{dateTab}</span>}
              <h3 id={titleId} className="h-section text-2xl md:text-3xl text-ink leading-tight mt-3">{title}</h3>
              {qualifier && <p className="type-sub mt-1">{qualifier}</p>}
              <p className="ev-dlg-facts text-sm text-gray-600 font-body mt-1">
                {[loc, costLine].filter(Boolean).join(' · ')}
              </p>
            </div>

            {desc && (
              <p className="text-sm text-ink/90 font-body whitespace-pre-wrap">{desc}</p>
            )}

            {/* Night: the facts as ruled ticket rows (detail anatomy). */}
            <dl className="tkt-rows ev-dlg-rows">
              <div className="tkt-row">
                <dt>{nightLabel('when', lang)}</dt>
                <dd>{dateTab}</dd>
              </div>
              {loc && (
                <div className="tkt-row">
                  <dt>{nightLabel('where', lang)}</dt>
                  <dd>{loc}</dd>
                </div>
              )}
              <div className="tkt-row">
                <dt>{nightLabel('entry', lang)}</dt>
                <dd>{costLabel(event, lang)}</dd>
              </div>
            </dl>
          </div>
        </div>

        {/* The one loud call, pinned: it used to sit at the bottom of the
            inner scroll (~1500px down on a phone). */}
        <div className="plate-f">
          <a
            href={appUrl}
            target="_blank"
            rel="noreferrer"
            className="btn-primary act-night px-6 py-3 text-sm"
          >
            {S.openInApp} <span aria-hidden="true">→</span>
          </a>
        </div>
      </div>
    </>,
    document.body
  );
}
