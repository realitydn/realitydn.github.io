import React, { useMemo, useState } from 'react';
import { Icons } from './Icons';
import { URLS, STR } from '../data/translations';
import { FEED_ICS_URL } from '../data/feed';
import useFeed from '../hooks/useFeed';
import EventOverlay from './EventOverlay';
import GetAppStrip from './GetAppStrip';
import { fmtTime, pickTitle, pickLocName } from '../data/feed-helpers';
import { splitFeedSite, dayClassFromISO, fmtDayDate, cfStr, costLabel } from '../data/cal-feed';

// Calendar — the "what's on" feed, wearing the app's calendar look: solid
// day-colour slice bands (imageless), the next-up event as a big hero slice
// with drifting riso echoes, UP NEXT / COMING UP labels that stick while the
// pane scrolls INSIDE itself (the section no longer eats the page). Tapping a
// slice opens the event in the EventOverlay — details + the open-in-app door.
//
// Graceful states (never a blank box):
//   loading                → slice-shaped skeleton
//   error && no events      → static message + WhatsApp CTA + "add to your calendar"
//   no upcoming events      → "Check our socials for what's on"
//   events                  → the feed: hero + slices, today-forward.
//
// This site's language toggle is 'EN' | 'VN' (NOT en/vi); feed-helpers map 'VN' → *_vi.

function WhatsAppCta({ lang }) {
  // Kept verbatim from the original component (URLS.WA, Icons.whatsapp, joinWA/waBlurb).
  return (
    <div className="mt-8 flex flex-col items-center gap-4">
      <a
        href={URLS.WA}
        target="_blank"
        rel="noreferrer"
        className="btn-primary px-6 py-4 text-sm flex items-center gap-3"
      >
        {Icons.whatsapp()}
        {STR[lang].joinWA}
      </a>
      <p className="text-center text-sm text-gray-600 font-body max-w-2xl">
        {STR[lang].waBlurb}
      </p>
    </div>
  );
}

export default function Calendar({ lang }) {
  const { events, loading, error } = useFeed();
  const C = STR[lang].cal;
  const CF = cfStr(lang);
  // The tapped event opens in an overlay ON TOP of the page (EventOverlay) —
  // visitors peek at an event without losing the menu or their scroll position.
  const [overlayEvent, setOverlayEvent] = useState(null);

  // useFeed already filters to published + not-yet-ended; split into the app's
  // shape — soon (today + tomorrow, ICT) and later — both soonest-first.
  const { soon, later } = useMemo(() => splitFeedSite(events || []), [events]);
  const total = soon.length + later.length;

  // One slice band — day-colour plate, info boxes lower-left, cost badge
  // top-right. The hero variant is taller with bigger type.
  const slice = (ev, hero = false) => {
    const title = pickTitle(ev, lang) || 'REALITY event';
    const loc = pickLocName(ev.location, lang);
    const start = fmtTime(ev.startsAt);
    const end = ev.endsAt ? fmtTime(ev.endsAt) : '';
    const meta = [start ? (end ? `${start}–${end}` : start) : '', loc].filter(Boolean).join(' · ');
    return (
      <button
        key={ev.id}
        type="button"
        className={`cal-card ${hero ? 'cal-hero-slice' : 'cal-slice'} ${dayClassFromISO(ev.startsAt)}`}
        onClick={() => setOverlayEvent(ev)}
        aria-label={title}
      >
        <span className="cal-go">{costLabel(ev, lang)}</span>
        <div className="cal-ov">
          <span className="cal-bx cal-bx-d">{fmtDayDate(ev.startsAt, lang)}</span>
          <span className="cal-bx cal-bx-t">{title}</span>
          {meta && <span className="cal-bx cal-bx-m">{meta}</span>}
        </div>
      </button>
    );
  };

  const sliceList = (list) => (
    <div className="flex flex-col gap-3">{list.map((ev) => slice(ev))}</div>
  );

  return (
    <section id="calendar" className="section max-w-7xl mx-auto px-4 py-12">
      {/* The poster carousel is gone (the feed carries the visual weight now);
          its #events anchor lives on so header nav + old links still land here. */}
      <div id="events" aria-hidden="true" style={{ scrollMarginTop: '90px' }} />
      <div className="mb-8">
        <div className="eyebrow mb-2" style={{ color: 'var(--accent)' }}>{C.eyebrow}</div>
        <h2 className="h-section text-3xl md:text-5xl text-ink">{C.title}</h2>
      </div>

      {/* ── Loading skeleton — slice-shaped so nothing jumps on arrival ──── */}
      {loading && (
        <div className="animate-pulse flex flex-col gap-3" aria-hidden="true">
          <div className="h-44 sm:h-52 bg-gray-200" style={{ borderRadius: 0 }} />
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-[86px] bg-gray-200" style={{ borderRadius: 0 }} />
          ))}
          <span className="sr-only">{C.loading}</span>
        </div>
      )}

      {/* ── Error state (no events to show) — message + add-to-calendar ─── */}
      {!loading && error && total === 0 && (
        <div className="card-static card-lg overflow-hidden p-6 md:p-10 text-center">
          <h3 className="h-section text-xl md:text-2xl text-ink mb-3">{C.errorTitle}</h3>
          <p className="text-sm text-gray-600 font-body max-w-2xl mx-auto mb-6">{C.errorBody}</p>
          <a
            href={FEED_ICS_URL}
            className="btn-secondary inline-flex items-center gap-2 px-5 py-3 text-sm"
          >
            {C.addToCalendar}
          </a>
        </div>
      )}

      {/* ── Empty state (loaded, no upcoming events) ───────────────────── */}
      {!loading && !error && total === 0 && (
        <div className="card-static card-lg overflow-hidden p-6 md:p-10 text-center">
          <p className="text-base text-gray-600 font-body max-w-2xl mx-auto">{C.empty}</p>
        </div>
      )}

      {/* ── The feed — hero + slices in a self-scrolling pane ──────────── */}
      {!loading && total > 0 && (
        <>
          <div className="cal-feed-wrap">
            <div className="cal-feed-pane">
              {soon.length > 0 ? (
                <>
                  <div className="cal-label">{CF.upNext}</div>
                  <div className="cal-hero-wrap">{slice(soon[0], true)}</div>
                  {soon.length > 1 && sliceList(soon.slice(1))}
                  {later.length > 0 && (
                    <>
                      <div className="cal-label mt-6">{CF.comingUp}</div>
                      {sliceList(later)}
                    </>
                  )}
                </>
              ) : (
                <>
                  <div className="cal-label">{CF.comingUp}</div>
                  <div className="cal-hero-wrap">{slice(later[0], true)}</div>
                  {later.length > 1 && sliceList(later.slice(1))}
                </>
              )}
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between gap-4 flex-wrap">
            <span className="text-sm font-body text-ink/60">
              {CF.upcomingCount.replace('{n}', String(total))}
            </span>
            <a
              href={FEED_ICS_URL}
              className="text-sm font-body text-ink/80 underline underline-offset-2 hover:opacity-70"
            >
              {C.addToCalendar}
            </a>
          </div>
        </>
      )}

      <GetAppStrip lang={lang} />
      <WhatsAppCta lang={lang} />

      <EventOverlay event={overlayEvent} lang={lang} onClose={() => setOverlayEvent(null)} />
    </section>
  );
}
