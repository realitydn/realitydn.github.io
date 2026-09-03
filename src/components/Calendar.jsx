import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Icons } from './Icons';
import { URLS, STR } from '../data/translations';
import { FEED_ICS_URL } from '../data/feed';
import useFeed from '../hooks/useFeed';
import EventOverlay from './EventOverlay';
import GetAppStrip from './GetAppStrip';
import { fmtTime, pickTitle, pickQualifier, pickLocName } from '../data/feed-helpers';
import { splitFeedSite, dayClassFromISO, fmtDM, fmtDayDate, cfStr, costLabel } from '../data/cal-feed';

// Calendar — the "what's on" feed, wearing the app's calendar look. Posters
// are spent on the next FIVE events only (Donald, 22.08 — the all-poster feed
// was too busy; the slice bands retired the same day, third pass): five canon
// EVENT CARDS under UP NEXT — the ink pass's .ev-card shape, text beside the
// event's 4:5 poster at its NATIVE aspect (never a cropped slice) — then
// everything after sets as typographic canon rows (.wk/.ev) under COMING UP.
// The labels stick while the pane scrolls INSIDE itself (the section no
// longer eats the page). Tapping a card OR a row opens the event in the
// EventOverlay — details + the open-in-app door.
//
// Graceful states (never a blank box):
//   loading                → card-shaped skeleton
//   error && no events      → static message + WhatsApp CTA + "add to your calendar"
//   no upcoming events      → "Check our socials for what's on"
//   events                  → the feed: five posters + rows, today-forward.
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
      {/* The blurb sits over the section's decorative riso plates — it gets
          its own paper (the printed-box idiom, same as the feed's .cal-bx)
          so the sentence never runs across a colour block. Was live on prod
          crossing the blue plate at ≥1024 (caught 19.08.26 review). */}
      <p
        className="text-center text-sm text-gray-600 font-body max-w-2xl relative z-[1] px-3 py-1"
        style={{ background: 'var(--bg)' }}
      >
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

  // The five-poster cap: soon and later are each soonest-first, and later
  // starts strictly after soon's today+tomorrow window, so concatenating
  // keeps chronological order. The first five wear posters (the wall); the
  // rest set as rows.
  const all = [...soon, ...later];
  const wall = all.slice(0, 5);
  const rest = all.slice(5);

  // Flow mode (touch / narrow — see index.css "The feed has TWO modes"):
  // only the first ROW_CAP rows print; the rest fold behind "Show all N
  // events" so the page keeps scrolling. The pane mode ignores the fold
  // in CSS, so the markup is the same in both and prerender stays honest.
  const ROW_CAP = 6;
  const [rowsOpen, setRowsOpen] = useState(false);
  const comingUpRef = useRef(null);
  const reanchor = useRef(false);
  const folded = rest.length > ROW_CAP;
  const toggleRows = () => {
    reanchor.current = rowsOpen; // folding back up → re-anchor after commit
    setRowsOpen((v) => !v);
  };
  // Folding the list back up while scrolled deep would strand the viewport
  // below the section (the page just lost a few thousand pixels) — once the
  // collapse has committed, snap back to COMING UP if its label has left
  // the top. An effect, not a rAF in the handler: the handler's frame can
  // run before React commits, and then the measurement is of the old page.
  useEffect(() => {
    if (!reanchor.current || rowsOpen) return;
    reanchor.current = false;
    const el = comingUpRef.current;
    if (!el || el.getBoundingClientRect().top >= 0) return;
    const root = document.documentElement;
    const prev = root.style.scrollBehavior;
    root.style.scrollBehavior = 'auto';
    el.scrollIntoView({ block: 'start' });
    root.style.scrollBehavior = prev;
  }, [rowsOpen]);

  // One canon event card — the ink pass's Events-page .ev-card (canon
  // 22.08.26): a day-owned block of TEXT beside the event's 4:5 poster at its
  // native aspect. Day plate + DD.MM lead the text column (same sources as the
  // rows below), the name sets in Montserrat 700 sentence case, the qualifier
  // collapses when absent, and time · room · price ride as one plain meta line
  // (price is TEXT here, same helper as the rows — never a colour block). The
  // designed 4:5 export fills a 4:5 frame, so nothing crops; an event with no
  // poster gets the flat day-colour plate + big DD.MM (.cal-noposter, same as
  // the overlay). The weekday hue carries as plate + spine only — the row
  // language, scaled up. The lead variant is full-width with a bigger poster
  // and the name one step larger; on phones the lead stacks (canon w390:
  // .ev-card → one column) so the text never crushes.
  const card = (ev, lead = false) => {
    const title = pickTitle(ev, lang) || 'REALITY event';
    const qualifier = pickQualifier(ev, lang);
    const loc = pickLocName(ev.location, lang);
    const start = fmtTime(ev.startsAt);
    const end = ev.endsAt ? fmtTime(ev.endsAt) : '';
    const meta = [start ? (end ? `${start}–${end}` : start) : '', loc, costLabel(ev, lang)]
      .filter(Boolean)
      .join(' · ');
    const dm = fmtDM(ev.startsAt);
    // Localized weekday — peel the DD.MM tail off fmtDayDate (the rows' trick).
    const full = fmtDayDate(ev.startsAt, lang);
    const wd = dm && full.endsWith(dm) ? full.slice(0, -dm.length).trim() : full;
    // Poster source: the designed 4:5 export leads (native in a 4:5 frame, no
    // crop); the feed slice is only ever the fallback when no 4:5 exists.
    const img = ev.posters?.poster4x5 || ev.posters?.feed || null;
    return (
      <button
        key={ev.id}
        type="button"
        className={`relative grid w-full cursor-pointer items-start gap-5 py-4 pl-5 pr-1 text-left ${
          lead
            ? 'grid-cols-1 sm:grid-cols-[1fr_220px] md:grid-cols-[1fr_260px]'
            : 'grid-cols-[1fr_160px] sm:grid-cols-[1fr_200px]'
        } ${dayClassFromISO(ev.startsAt)}`}
        style={{ color: 'var(--fg)', borderBottom: '2px solid var(--hairline)', borderRadius: 0 }}
        onClick={() => setOverlayEvent(ev)}
        aria-label={title}
      >
        <span className="day-spine" aria-hidden="true" />
        <span className="flex min-w-0 flex-col items-start gap-2">
          <span className="flex items-center gap-2.5">
            <span className="day-plate">{wd}</span>
            <span className="ev-date">{dm}</span>
          </span>
          <span
            style={{
              fontFamily: 'var(--mont)',
              fontWeight: 700,
              fontSize: lead ? '24px' : '20px',
              lineHeight: 1.2,
              letterSpacing: 'var(--tr-name)',
            }}
          >
            {title}
          </span>
          {qualifier && <span className="ev-qual">{qualifier}</span>}
          {meta && (
            <span className="ev-qual" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {meta}
            </span>
          )}
        </span>
        <span
          className="relative block w-full overflow-hidden"
          style={{
            aspectRatio: '4 / 5',
            border: '2px solid var(--fg)',
            boxShadow: 'var(--sh-default)',
            background: 'var(--day)',
            borderRadius: 0,
          }}
        >
          {img ? (
            <img
              className="absolute inset-0 h-full w-full object-cover"
              src={img}
              alt=""
              loading="lazy"
              decoding="async"
            />
          ) : (
            <span className="cal-noposter absolute inset-0">
              <span className="cal-noposter-wd">{wd}</span>
              <span className="cal-noposter-dm">{dm}</span>
            </span>
          )}
        </span>
      </button>
    );
  };

  // One canon row (index.css "Calendar rows") — past the wall an event is
  // typography: day plate + DD.MM, name (wraps, never truncated) with the
  // qualifier collapsing when absent, time · room · price in tabular meta,
  // one arrow. The weekday hue survives as plate + spine only, and the price
  // rides as TEXT, never a colour block. Same sources as the slices, so all
  // six languages flow through unchanged.
  const row = (ev, i) => {
    const title = pickTitle(ev, lang) || 'REALITY event';
    const qualifier = pickQualifier(ev, lang);
    const loc = pickLocName(ev.location, lang);
    const start = fmtTime(ev.startsAt);
    const dm = fmtDM(ev.startsAt);
    // fmtDayDate prints "<weekday> <DD.MM>" in every language — peel the
    // date off the tail to get the localized weekday (VN's "Thứ 2" included)
    // without opening a second formatter path.
    const full = fmtDayDate(ev.startsAt, lang);
    const wd = dm && full.endsWith(dm) ? full.slice(0, -dm.length).trim() : full;
    return (
      <button
        key={ev.id}
        type="button"
        className={`ev ${dayClassFromISO(ev.startsAt)}${i >= ROW_CAP ? ' ev-extra' : ''}`}
        onClick={() => setOverlayEvent(ev)}
        aria-label={title}
      >
        <span className="day-spine" />
        <span className="ev-when">
          <span className="day-plate">{wd}</span>
          <span className="ev-date">{dm}</span>
        </span>
        <span className="ev-b">
          <span className="ev-n">{title}</span>
          {qualifier && <span className="ev-qual">{qualifier}</span>}
        </span>
        <span className="ev-meta">
          {start && <span className="ev-time">{start}</span>}
          {loc && <span className="ev-room">{loc}</span>}
          <span className="ev-qual">{costLabel(ev, lang)}</span>
        </span>
        <span className="ev-go" aria-hidden="true">→</span>
      </button>
    );
  };

  return (
    <section id="calendar" className="band b-paper section">
      <div className="max-w-7xl mx-auto px-4 py-12">
      {/* The poster carousel is gone (the feed carries the visual weight now);
          its #events anchor lives on so header nav + old links still land here. */}
      <div id="events" aria-hidden="true" style={{ scrollMarginTop: '90px' }} />
      <div className="mb-8">
        {/* Blue literal, not the accent: eyebrows are blue's JOB (canon), and
            the theme-aware accent would flip this pink in Night. */}
        <div className="eyebrow mb-2" style={{ color: 'var(--blue)' }}>{C.eyebrow}</div>
        <h2 className="h-section text-3xl md:text-5xl text-ink">{C.title}</h2>
      </div>

      {/* ── Loading skeleton — card-shaped so nothing jumps on arrival: a
          lead-card ghost (text bars beside a 4:5 block), then two-up card
          ghosts at the smaller poster width. .sk-block re-stamps (never a
          shimmer/opacity pulse) and reads the theme tokens, so the bars hold
          in Day and Night alike. ──── */}
      {loading && (
        <div className="sk-stagger flex flex-col gap-4" aria-hidden="true">
          <div className="grid items-start gap-5 grid-cols-1 sm:grid-cols-[1fr_220px] md:grid-cols-[1fr_260px]">
            <div className="flex flex-col gap-3 pt-1">
              <div className="sk-block h-7 w-28" style={{ borderRadius: 0 }} />
              <div className="sk-block h-6 w-4/5" style={{ borderRadius: 0 }} />
              <div className="sk-block h-4 w-1/2" style={{ borderRadius: 0 }} />
            </div>
            <div className="sk-block w-full" style={{ aspectRatio: '4 / 5', borderRadius: 0 }} />
          </div>
          <div className="grid gap-4 md:grid-cols-2 md:gap-x-6">
            {[0, 1].map((i) => (
              <div key={i} className="grid items-start gap-5 grid-cols-[1fr_160px] sm:grid-cols-[1fr_200px]">
                <div className="flex flex-col gap-3 pt-1">
                  <div className="sk-block h-6 w-24" style={{ borderRadius: 0 }} />
                  <div className="sk-block h-5 w-3/4" style={{ borderRadius: 0 }} />
                  <div className="sk-block h-4 w-1/2" style={{ borderRadius: 0 }} />
                </div>
                <div className="sk-block w-full" style={{ aspectRatio: '4 / 5', borderRadius: 0 }} />
              </div>
            ))}
          </div>
          <span className="sr-only">{C.loading}</span>
        </div>
      )}

      {/* ── Error state (no events to show) — message + add-to-calendar ─── */}
      {!loading && error && total === 0 && (
        <div className="card-static card-lg overflow-hidden p-6 md:p-10 text-center">
          <h3 className="h-section text-xl md:text-2xl text-ink mb-3">{C.errorTitle}</h3>
          <p className="text-sm text-gray-600 font-body max-w-2xl mx-auto mb-6">{C.errorBody}</p>
          {/* INFO role (canon B3b): calendar-subscribe is blue's job. */}
          <a
            href={FEED_ICS_URL}
            className="btn-info inline-flex items-center gap-2 px-5 py-3 text-sm"
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

      {/* ── The feed — five event cards, then rows, in a self-scrolling pane ── */}
      {!loading && total > 0 && (
        <>
          <div className="cal-feed-wrap">
            <div className="cal-feed-pane">
              <div className="cal-label">{CF.upNext}</div>
              {card(wall[0], true)}
              {wall.length > 1 && (
                <div className="grid md:grid-cols-2 md:gap-x-6">
                  {wall.slice(1).map((ev) => card(ev))}
                </div>
              )}
              {rest.length > 0 && (
                <>
                  <div className="cal-label mt-6 scroll-mt-24" ref={comingUpRef}>{CF.comingUp}</div>
                  <div className={`wk${folded ? ' wk-capped' : ''}${rowsOpen ? ' is-open' : ''}`}>
                    {rest.map(row)}
                  </div>
                  {/* Flow-mode fold (CSS hides this in the desktop pane): the
                      count is the point — "Show all 38 events" says how much
                      is on without making the page swallow 38 rows. */}
                  {folded && (
                    <button
                      type="button"
                      className="btn-secondary cal-more text-xs"
                      onClick={toggleRows}
                      aria-expanded={rowsOpen}
                    >
                      {rowsOpen
                        ? CF.showFewer
                        : CF.showAll.replace('{n}', String(total))}
                      <span aria-hidden="true">{rowsOpen ? '↑' : '↓'}</span>
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between gap-4 flex-wrap">
            <span className="text-sm font-body text-ink/60">
              {CF.upcomingCount.replace('{n}', String(total))}
            </span>
            {/* INFO role (canon B3b): calendar-subscribe is blue's job —
                a small blue chip, not a buried grey link. */}
            <a
              href={FEED_ICS_URL}
              className="btn-info inline-flex items-center px-3 py-2 text-xs"
            >
              {C.addToCalendar}
            </a>
          </div>
        </>
      )}

      <GetAppStrip lang={lang} />
      <WhatsAppCta lang={lang} />

      <EventOverlay event={overlayEvent} lang={lang} onClose={() => setOverlayEvent(null)} />
      </div>
    </section>
  );
}
