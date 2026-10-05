import React, { useMemo, useState } from 'react';
import { Icons } from './Icons';
import { URLS, STR } from '../data/translations';
import { FEED_ICS_URL } from '../data/feed';
import useFeed from '../hooks/useFeed';
import EventOverlay from './EventOverlay';
import GetAppStrip from './GetAppStrip';
import { fmtTime, dateKey, pickTitle, pickQualifier, pickLocName, pickDescription } from '../data/feed-helpers';
import { splitFeedSite, fmtDM, fmtDayDate, cfStr, costLabel, catLabel, dmParts } from '../data/cal-feed';
import { categoryOf } from '../data/event-category';
import { LogoBox } from './Ticket';

// Calendar — the "what's on" feed, wearing the app's calendar look. Posters
// are spent on the next FIVE events only (Donald, 22.08 — the all-poster feed
// was too busy; the slice bands retired the same day, third pass): five canon
// EVENT CARDS under UP NEXT — the ink pass's .ev-card shape, text beside the
// event's 4:5 poster at its NATIVE aspect (never a cropped slice) — then
// everything after sets as typographic canon rows (.wk/.ev) under COMING UP.
// Night v2 "Cream Tickets" (round 2, 5.10.26): in BOTH themes the cards and
// rows are TICKETS — a category top bar / date block replaces the weekday
// plate + spine (the category, src/data/event-category.js, carries the
// colour; the .d-* weekday code stays for posters and print).
// On mouse the pane scrolls INSIDE itself with sticky labels; on touch the
// feed flows with the page and stops at ROW_CAP rows, where the app door
// takes over (index.css, "The feed has TWO modes"). Tapping a card OR a row
// opens the event in the EventOverlay — details + the open-in-app door.
//
// Graceful states (never a blank box):
//   loading                → card-shaped skeleton
//   error && no events      → static message + WhatsApp CTA + "add to your calendar"
//   no upcoming events      → "Check our socials for what's on"
//   events                  → the feed: five posters + rows, today-forward.
//
// This site's language toggle is 'EN' | 'VN' (NOT en/vi); feed-helpers map 'VN' → *_vi.
//
// Cards and rows are real LINKS to the event's page in the app (the feed's
// sourceUrl) — crawlers and middle/ctrl/cmd-clicks get the real page, and a
// plain left click (or Enter) is intercepted to open the overlay instead.

// The app's page for an event: the feed's sourceUrl, else the canonical
// /events/:id path the hub serves.
function eventHref(ev) {
  return ev.sourceUrl || `${URLS.APP}/events/${ev.id}`;
}

// A plain primary click opens the overlay; anything with a modifier (new
// tab / window / download) is left to the browser and follows the link.
function isPlainClick(e) {
  return !e.defaultPrevented && e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;
}

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

  // TONIGHT / TODAY / TOMORROW chips ride the soon split: an event in the
  // soon window is either today (ICT) or tomorrow. Today splits on 17:00 —
  // "Tonight" for the evening programme, "Today" for a daytime class.
  const soonIds = useMemo(() => new Set(soon.map((ev) => ev.id)), [soon]);
  const todayKey = dateKey(new Date().toISOString());
  const whenLabel = (ev) => {
    if (!soonIds.has(ev.id)) return '';
    if (dateKey(ev.startsAt) !== todayKey) return C.tomorrow;
    const hour = parseInt(fmtTime(ev.startsAt).slice(0, 2), 10);
    return hour >= 17 ? C.tonight : C.today;
  };

  const openEvent = (e, ev) => {
    if (!isPlainClick(e)) return;
    e.preventDefault();
    setOverlayEvent(ev);
  };

  // "Skip the calendar" — the desktop pane lists every row (60+ links), so
  // a keyboard visitor gets a way past them to what follows.
  const skipPast = (e) => {
    const target = document.getElementById('cal-after');
    if (!target) return;
    e.preventDefault();
    target.focus();
  };

  // The five-poster cap: soon and later are each soonest-first, and later
  // starts strictly after soon's today+tomorrow window, so concatenating
  // keeps chronological order. The first five wear posters (the wall); the
  // rest set as rows.
  const all = [...soon, ...later];
  const wall = all.slice(0, 5);
  const rest = all.slice(5);

  // Flow mode (touch / narrow — see index.css "The feed has TWO modes"):
  // only the first ROW_CAP rows print; past that the app is the calendar,
  // so the door below replaces them rather than expanding the page. The
  // pane mode ignores the fold in CSS, so the markup is the same in both
  // and prerender stays honest.
  const ROW_CAP = 6;
  const folded = rest.length > ROW_CAP;

  // One event card — the ink pass's Events-page .ev-card (canon 22.08.26) as
  // a cream TICKET: a block of TEXT beside the event's 4:5 poster at its
  // native aspect. The name sets in Montserrat 700 caps, the qualifier
  // collapses when absent, and time · room · price ride as one plain meta
  // line (price is TEXT here, same helper as the rows — never a colour
  // block). The designed 4:5 export fills a 4:5 frame, so nothing crops; an
  // event with no poster gets riso stripes + the big d.m date + the logo box
  // (.cal-noposter, same as the overlay). The lead variant is full-width with
  // a bigger poster and the name one step larger; on phones the lead stacks
  // bar → poster → text so the text never crushes.
  const card = (ev, lead = false) => {
    const title = pickTitle(ev, lang) || C.fallbackTitle;
    const when = whenLabel(ev);
    const qualifier = pickQualifier(ev, lang);
    const loc = pickLocName(ev.location, lang);
    const start = fmtTime(ev.startsAt);
    const end = ev.endsAt ? fmtTime(ev.endsAt) : '';
    const meta = [start ? (end ? `${start}–${end}` : start) : '', loc, costLabel(ev, lang)]
      .filter(Boolean)
      .join(' · ');
    const dm = fmtDM(ev.startsAt);
    // Localized weekday — peel the d.m tail off fmtDayDate (the rows' trick).
    const full = fmtDayDate(ev.startsAt, lang);
    const wd = dm && full.endsWith(dm) ? full.slice(0, -dm.length).trim() : full;
    // Poster source: the designed 4:5 export leads (native in a 4:5 frame, no
    // crop); the feed slice is only ever the fallback when no 4:5 exists.
    const img = ev.posters?.poster4x5 || ev.posters?.feed || null;
    // The card is a TICKET (both themes): the category's top bar (when ·
    // time / category) leads, then the name, the qualifier, one meta line
    // and — on the lead card — the story, beside the poster at its native
    // 4:5. data-cat drives the bar, the print offset and the poster ground
    // (index.css, TICKETS).
    const cat = categoryOf(ev);
    const label = catLabel(cat, lang);
    const desc = lead ? pickDescription(ev, lang) : '';
    return (
      <a
        key={ev.id}
        href={eventHref(ev)}
        className={`cal-card tkt relative grid w-full cursor-pointer items-start text-left ${
          lead
            ? 'cal-card-lead grid-cols-1 sm:grid-cols-[1fr_220px] md:grid-cols-[1fr_260px]'
            : 'grid-cols-[1fr_160px] sm:grid-cols-[1fr_200px]'
        }`}
        data-cat={cat}
        onClick={(e) => openEvent(e, ev)}
      >
        <span className="tkt-top cal-card-top">
          <span>{[when || `${wd} ${dm}`, start].filter(Boolean).join(' · ')}</span>
          {label && <span>{label}</span>}
        </span>
        <span className="cal-card-b flex min-w-0 flex-col items-start">
          <span className="cal-card-n">
            {title}
          </span>
          {qualifier && <span className="ev-qual">{qualifier}</span>}
          {meta && (
            <span className="ev-qual" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {meta}
            </span>
          )}
          {/* The lead ticket carries its story (ticket body copy, clamped). */}
          {lead && desc && <span className="cal-card-desc">{desc}</span>}
        </span>
        <span className="cal-card-p relative block w-full overflow-hidden">
          {img ? (
            <img
              className="absolute inset-0 h-full w-full object-cover"
              src={img}
              alt={C.posterAlt.replace('{title}', title)}
              loading="lazy"
              decoding="async"
            />
          ) : (
            <span className="cal-noposter absolute inset-0" aria-hidden="true">
              <span className="cal-noposter-wd">{wd}</span>
              <span className="cal-noposter-dm">{dm}</span>
              <LogoBox className="cal-noposter-logo" />
            </span>
          )}
        </span>
      </a>
    );
  };

  // One row — past the wall an event is a LIST TICKET: date block + type
  // (name wraps, never truncated; the qualifier collapses when absent), the
  // price riding as TEXT, never a colour block. Same sources as the cards,
  // so all six languages flow through unchanged.
  const row = (ev, i) => {
    const title = pickTitle(ev, lang) || C.fallbackTitle;
    const when = whenLabel(ev);
    const qualifier = pickQualifier(ev, lang);
    const loc = pickLocName(ev.location, lang);
    const start = fmtTime(ev.startsAt);
    const dm = fmtDM(ev.startsAt);
    // fmtDayDate prints "<weekday> <d.m>" in every language — peel the
    // date off the tail to get the localized weekday (VN's "Thứ 2" included)
    // without opening a second formatter path.
    const full = fmtDayDate(ev.startsAt, lang);
    const wd = dm && full.endsWith(dm) ? full.slice(0, -dm.length).trim() : full;
    // The LIST TICKET (both themes): a category date block (weekday + d.m,
    // the day number big), a meta line ("TOMORROW · 19:00 · GAMES + TRIVIA"),
    // the name, the qualifier and room · price. The date block is a picture
    // of the date (aria-hidden), so the date is also said once, sr-only.
    const cat = categoryOf(ev);
    const { d, m } = dmParts(ev.startsAt);
    const sub = [loc, costLabel(ev, lang)].filter(Boolean).join(' · ');
    return (
      <a
        key={ev.id}
        href={eventHref(ev)}
        className={`ev tkt${i >= ROW_CAP ? ' ev-extra' : ''}`}
        data-cat={cat}
        onClick={(e) => openEvent(e, ev)}
      >
        <span className="ev-dblock" aria-hidden="true">
          <span className="ev-dblock-wd">{wd}</span>
          <span className="ev-dblock-d">{d}<small>{m ? `.${m}` : ''}</small></span>
        </span>
        <span className="ev-b">
          <span className="sr-only">{full}</span>
          <span className="ev-mline">
            {[when, start, catLabel(cat, lang)].filter(Boolean).join(' · ')}
          </span>
          <span className="ev-n">{title}</span>
          {qualifier && <span className="ev-qual">{qualifier}</span>}
          {sub && <span className="ev-sub">{sub}</span>}
        </span>
      </a>
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
            the theme-aware accent would flip this pink in Night. The TEXT
            print of blue (--blue-text): bright blue on cream is 2.66:1. */}
        <div className="eyebrow mb-2" style={{ color: 'var(--blue-text)' }}>{C.eyebrow}</div>
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
                <div className="cal-wall grid md:grid-cols-2 md:gap-x-6">
                  {wall.slice(1).map((ev) => card(ev))}
                </div>
              )}
              {rest.length > 0 && (
                <>
                  <div className="cal-label mt-6 scroll-mt-24">{CF.comingUp}</div>
                  <a
                    href="#cal-after"
                    onClick={skipPast}
                    className="btn-secondary sr-only focus:not-sr-only focus:inline-block focus:mb-3 focus:px-3 focus:py-2 text-xs"
                  >
                    {C.skip}
                  </a>
                  <div className={`wk${folded ? ' wk-capped' : ''}`}>
                    {rest.map(row)}
                  </div>
                  {/* Flow-mode door (CSS hides it in the desktop pane, which
                      shows every row itself). The rest of the calendar lives
                      in the app, so the end of the phone list IS the app's
                      front door — the count says how much is behind it. */}
                  {folded && (
                    <a
                      href={`${URLS.APP}/?utm_source=website&utm_medium=schedule_see_all`}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-secondary cal-more text-xs"
                    >
                      {Icons.app()}
                      {/* Label + ↗ in ONE span: on a 375px phone the label
                          wraps, and a sibling arrow strands itself at the
                          far right of the second line. Kept together it
                          follows the last word. */}
                      <span>
                        {CF.seeAllInApp.replace('{n}', String(total))}{' '}
                        <span aria-hidden="true">↗</span>
                      </span>
                    </a>
                  )}
                </>
              )}
            </div>
          </div>
          {/* Skip target (tabIndex -1: focusable by script, not in the tab
              order, no focus plate). */}
          <div id="cal-after" tabIndex={-1} className="mt-3 flex items-center justify-between gap-4 flex-wrap">
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
