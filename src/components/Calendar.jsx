import React, { useMemo, useState } from 'react';
import { Icons } from './Icons';
import { URLS, STR } from '../data/translations';
import { FEED_ICS_URL } from '../data/feed';
import useFeed from '../hooks/useFeed';
import EventOverlay from './EventOverlay';
import GetAppStrip from './GetAppStrip';
import {
  dateKey,
  fmtTime,
  fmtDayHeading,
  pickTitle,
  pickLocName,
} from '../data/feed-helpers';

// Calendar — the "what's on" agenda. Replaces the old Google Calendar iframe with
// an on-brand bilingual agenda driven by useFeed() (the REALITY Events Feed). The
// <section id="calendar"> anchor and the WhatsApp CTA block are kept verbatim so
// nav links and the community funnel are unchanged.
//
// Graceful states (never a blank box):
//   loading                → skeleton (mirrors the existing animate-pulse)
//   error && no events      → static message + WhatsApp CTA + "add to your calendar"
//   no upcoming events      → "Check our socials for what's on"
//   events                  → grouped agenda, today-forward, ~30 days / 40 items.
//
// This site's language toggle is 'EN' | 'VN' (NOT en/vi); feed-helpers map 'VN' → *_vi.

const MAX_ITEMS = 40;
const HORIZON_DAYS = 30;

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
  // The tapped event opens in an overlay ON TOP of the page (EventOverlay) —
  // visitors peek at an event without losing the menu or their scroll position.
  const [overlayEvent, setOverlayEvent] = useState(null);

  // Build the grouped, today-forward agenda. useFeed already filters to published +
  // not-yet-ended; here we sort by start, window to the horizon, cap the count, and
  // group by ICT day for the headers.
  const groups = useMemo(() => {
    const now = Date.now();
    const horizon = now + HORIZON_DAYS * 86400000;
    const upcoming = (events || [])
      .filter((ev) => {
        const t = ev.startsAt ? Date.parse(ev.startsAt) : NaN;
        // keep if start is within horizon OR it's already running (end>=now handled upstream)
        return Number.isNaN(t) ? true : t <= horizon;
      })
      .slice()
      .sort((a, b) => Date.parse(a.startsAt || 0) - Date.parse(b.startsAt || 0))
      .slice(0, MAX_ITEMS);

    const byDay = new Map();
    for (const ev of upcoming) {
      const key = dateKey(ev.startsAt) || 'unknown';
      if (!byDay.has(key)) byDay.set(key, { key, heading: fmtDayHeading(ev.startsAt, lang), items: [] });
      byDay.get(key).items.push(ev);
    }
    return Array.from(byDay.values());
  }, [events, lang]);

  return (
    <section id="calendar" className="section max-w-7xl mx-auto px-4 py-12">
      <div className="mb-8">
        <div className="eyebrow mb-2" style={{ color: 'var(--accent)' }}>{C.eyebrow}</div>
        <h2 className="h-section text-3xl md:text-5xl text-ink">{C.title}</h2>
      </div>

      {/* ── Loading skeleton ───────────────────────────────────────────── */}
      {loading && (
        <div className="card-static card-lg overflow-hidden p-6 md:p-8">
          <div className="animate-pulse space-y-6">
            {[0, 1, 2].map((i) => (
              <div key={i}>
                <div className="h-4 bg-gray-200 w-32 mb-3" style={{ borderRadius: 0 }} />
                <div className="h-12 bg-gray-200 w-full mb-2" style={{ borderRadius: 0 }} />
                <div className="h-12 bg-gray-200 w-5/6" style={{ borderRadius: 0 }} />
              </div>
            ))}
          </div>
          <span className="sr-only">{C.loading}</span>
        </div>
      )}

      {/* ── Error state (no events to show) — message + add-to-calendar ─── */}
      {!loading && error && groups.length === 0 && (
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
      {!loading && !error && groups.length === 0 && (
        <div className="card-static card-lg overflow-hidden p-6 md:p-10 text-center">
          <p className="text-base text-gray-600 font-body max-w-2xl mx-auto">{C.empty}</p>
        </div>
      )}

      {/* ── Agenda ─────────────────────────────────────────────────────── */}
      {!loading && groups.length > 0 && (
        <div className="card-static card-lg overflow-hidden">
          <ul className="divide-y divide-ink/10">
            {groups.map((g) => (
              <li key={g.key} className="p-5 md:p-6">
                <div className="eyebrow mb-3 text-ink/70">{g.heading}</div>
                <ul className="space-y-3">
                  {g.items.map((ev) => {
                    const title = pickTitle(ev, lang) || 'REALITY event';
                    const loc = pickLocName(ev.location, lang);
                    const start = fmtTime(ev.startsAt);
                    const end = ev.endsAt ? fmtTime(ev.endsAt) : '';
                    const timeStr = end ? `${start}–${end}` : start;
                    return (
                      <li
                        key={ev.id}
                        className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-4"
                      >
                        <span className="text-sm font-mono tabular-nums text-ink/80 shrink-0 sm:w-28">
                          {timeStr}
                        </span>
                        <span className="flex-1">
                          <span className="text-base md:text-lg text-ink font-body font-medium">
                            <button
                              type="button"
                              onClick={() => setOverlayEvent(ev)}
                              className="text-left hover:opacity-70 transition-opacity underline-offset-2 hover:underline"
                            >
                              {title}
                            </button>
                          </span>
                          {loc && (
                            <span className="block text-sm text-gray-600 font-body mt-0.5">
                              {loc}
                            </span>
                          )}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      )}

      <GetAppStrip lang={lang} />
      <WhatsAppCta lang={lang} />

      <EventOverlay event={overlayEvent} lang={lang} onClose={() => setOverlayEvent(null)} />
    </section>
  );
}
