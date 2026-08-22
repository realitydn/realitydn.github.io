import React, { useEffect } from 'react';
import { STR } from '../data/translations';
import {
  pickTitle,
  pickQualifier,
  pickDescription,
  pickLocName,
  pickPoster,
  fmtTime,
} from '../data/feed-helpers';
import { dayClassFromISO, fmtDayDate, fmtDM, cfStr } from '../data/cal-feed';

// EventOverlay — the "collapsible window on top of the page". Clicking an event
// in the feed or the poster carousel opens the event HERE, rendered natively
// from feed data the page already holds, instead of navigating away — the menu
// and the rest of the page stay one Escape/tap behind. The one loud CTA deep-
// links into the app's event page for RSVP/reminders/details.
//
// Wears the event's weekday colour (the same day→palette map as the feed
// slices): a day-colour date tab stamps the header, and when an event has no
// poster the left pane becomes a day-colour plate with a big DD.MM — never an
// empty grey box.

const APP_BASE = 'https://app.realitydn.com';

export default function EventOverlay({ event, lang = 'EN', onClose }) {
  const open = !!event;

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  const S = STR[lang].eventOverlay;
  const CF = cfStr(lang);
  const title = pickTitle(event, lang) || 'REALITY event';
  // Name + qualifier split (hub 0054): the type line under the name; empty =
  // the title renders alone, exactly as before.
  const qualifier = pickQualifier(event, lang);
  const desc = pickDescription(event, lang);
  const loc = pickLocName(event.location, lang);
  const poster = event.posters?.poster4x5 || pickPoster(event.posters);
  const dayCls = dayClassFromISO(event.startsAt);
  const start = fmtTime(event.startsAt);
  const end = event.endsAt ? fmtTime(event.endsAt) : '';
  const dateTab = [fmtDayDate(event.startsAt, lang), end ? `${start}–${end}` : start]
    .filter(Boolean)
    .join(' · ');
  // "Free event" is a claim, not a slogan — the feed sends cost: null only
  // when the event really is free, so the claim is safe to print.
  const costLine = event.cost ? CF.entry.replace('{cost}', event.cost) : CF.freeEvent;
  const appUrl = `${APP_BASE}/events/${event.id}?utm_source=website&utm_medium=event_overlay`;

  return (
    <>
      {/* Ink scrim + plate (canon 22.08.26): siblings, so a scrim click closes
          without a stopPropagation dance. No stamp-in on the plate — .dlg
          centres via transform, and stampIn's fill:both would pin over it.
          Width/height are inline: .dlg is 560px, but this window has always
          been max-w-2xl (672px) at p-4 gutters and 90vh — keep that. */}
      <div className="scrim" onClick={onClose} aria-hidden="true" />
      <div
        className={`plate dlg ${dayCls}`}
        style={{ width: 'min(672px, calc(100% - 32px))', maxHeight: '90vh' }}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="plate-h">
          <span className="plate-t min-w-0 truncate">{title}</span>
          <button className="plate-x shrink-0" onClick={onClose} aria-label={S.close}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M6 6l12 12M6 18L18 6" />
            </svg>
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-hidden flex flex-col md:flex-row">
          {poster ? (
            <div className="md:w-2/5 shrink-0 bg-cream max-h-[40vh] md:max-h-none overflow-hidden">
              <img src={poster} alt={title} className="w-full h-full object-cover" loading="eager" decoding="async" />
            </div>
          ) : (
            <div className="md:w-2/5 shrink-0 overflow-hidden">
              <div className="cal-noposter">
                <span className="cal-noposter-wd">{fmtDayDate(event.startsAt, lang).split(' ')[0]}</span>
                <span className="cal-noposter-dm">{fmtDM(event.startsAt)}</span>
              </div>
            </div>
          )}

          <div className="plate-b flex-1 min-w-0">
            <div>
              {dateTab && <span className="cal-datetab mb-3">{dateTab}</span>}
              <h3 className="h-section text-2xl md:text-3xl text-ink leading-tight mt-3">{title}</h3>
              {qualifier && <p className="type-sub mt-1">{qualifier}</p>}
              <p className="text-sm text-gray-600 font-body mt-1">
                {[loc, costLine].filter(Boolean).join(' · ')}
              </p>
            </div>

            {desc && (
              <p className="text-sm text-ink/90 font-body whitespace-pre-wrap flex-1">{desc}</p>
            )}

            <div className="pt-2 mt-auto">
              <a
                href={appUrl}
                target="_blank"
                rel="noreferrer"
                className="btn-primary inline-block px-6 py-3 text-sm"
              >
                {S.openInApp} →
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
