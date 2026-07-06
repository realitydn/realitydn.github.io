import React, { useEffect } from 'react';
import { STR } from '../data/translations';
import {
  pickTitle,
  pickDescription,
  pickLocName,
  pickPoster,
  fmtDayHeading,
  fmtTime,
} from '../data/feed-helpers';

// EventOverlay — the "collapsible window on top of the page". Clicking an event
// in the agenda or the poster carousel opens the event HERE, rendered natively
// from feed data the page already holds, instead of navigating away — the menu
// and the rest of the page stay one Escape/tap behind. The one loud CTA deep-
// links into the app's event page for RSVP/reminders/details.
//
// Same scrim + stamped-frame anatomy as the poster lightbox (EventsSection),
// so the two overlays feel like one system.

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
  const title = pickTitle(event, lang) || 'REALITY event';
  const desc = pickDescription(event, lang);
  const loc = pickLocName(event.location, lang);
  const poster = event.posters?.poster4x5 || pickPoster(event.posters);
  const start = fmtTime(event.startsAt);
  const end = event.endsAt ? fmtTime(event.endsAt) : '';
  const when = [fmtDayHeading(event.startsAt, lang), end ? `${start}–${end}` : start]
    .filter(Boolean)
    .join(' · ');
  const appUrl = `${APP_BASE}/events/${event.id}?utm_source=website&utm_medium=event_overlay`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{
        backgroundColor: 'rgb(var(--bg-rgb) / 0.88)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
      }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <button
        className="absolute top-4 right-4 text-ink hover:opacity-70 transition-opacity p-2"
        onClick={onClose}
        aria-label={S.close}
      >
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 6l12 12M6 18L18 6" />
        </svg>
      </button>

      <div
        className="w-full max-w-2xl max-h-[90vh] card-static stamp-in overflow-hidden flex flex-col md:flex-row"
        onClick={(e) => e.stopPropagation()}
      >
        {poster && (
          <div className="md:w-2/5 shrink-0 bg-cream max-h-[40vh] md:max-h-none overflow-hidden">
            <img src={poster} alt={title} className="w-full h-full object-cover" loading="eager" decoding="async" />
          </div>
        )}

        <div className="flex-1 min-w-0 p-5 md:p-6 flex flex-col gap-3 overflow-y-auto">
          <div>
            {when && (
              <p className="eyebrow mb-1" style={{ color: 'var(--accent)' }}>
                {when}
              </p>
            )}
            <h3 className="h-section text-2xl text-ink leading-tight">{title}</h3>
            {loc && <p className="text-sm text-gray-600 font-body mt-1">{loc}</p>}
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
  );
}
