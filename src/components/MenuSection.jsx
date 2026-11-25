import React, { useMemo, useState } from 'react';
import { useMenu } from '../data/menu-i18n';
import { URLS, STR, MENU_PDF } from '../data/translations';
import Reveal from './Reveal';
import EventOverlay from './EventOverlay';
import useFeed from '../hooks/useFeed';
import { fmtTime, pickTitle, pickQualifier, needsRsvp } from '../data/feed-helpers';
import { whenKey, fmtDayDate, catLabel, nextDealToday } from '../data/cal-feed';
import { isDealEvent } from '../data/event-category';
import { RsvpStub, openRsvpDoor } from './RsvpNote';
import Expand from './deck/Expand';
import { showTab } from './deck/fold';
import { useWide } from './deck/wide';

// NIGHT v2 ("Cream Tickets", 5.10.26; both themes since round 2): the menu is
// ONE neutral cream ticket with ruled rows. The category tabs, their accent
// swatches and the misregistered echo keep the Day look in both themes (the
// minors are allowed — Donald, 5.10.26 evening): they flip with the tokens.

// The happy-hour ticket — ONLY ON THE DAY (Donald, 5.10.26): shown when the
// feed's next DEAL (isDealEvent, e.g. "Happy Hour: Buy 1 Get 1 Cocktails")
// is today in ICT (nextDealToday), as a yellow-top-bar
// ticket with a yellow print. Nothing is invented: title, day and time come
// from the feed; on any other day it renders nothing.
function DealTicket({ ev, lang, onOpen }) {
  const C = STR[lang].cal;
  const title = pickTitle(ev, lang) || C.fallbackTitle;
  const qualifier = pickQualifier(ev, lang);
  const start = fmtTime(ev.startsAt);
  const end = ev.endsAt ? fmtTime(ev.endsAt) : '';
  const wk = whenKey(ev.startsAt);
  const day = wk ? C[wk] : fmtDayDate(ev.startsAt, lang);
  const href = ev.sourceUrl || `${URLS.APP}/events/${ev.id}`;
  return (
    <a
      href={href}
      className="tkt deal-tkt mb-8"
      onClick={(e) => {
        if (openRsvpDoor(e, ev)) return;
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        onOpen(ev);
      }}
    >
      <span className="tkt-top">
        <span>{catLabel('deal', lang)}</span>
        <span>{[day, start ? (end ? `${start}–${end}` : start) : ''].filter(Boolean).join(' · ')}</span>
      </span>
      <span className="deal-tkt-b">
        <span className="tkt-title">{title}</span>
        {qualifier && <span className="tkt-dim">{qualifier}</span>}
      </span>
      {/* A limited-spot deal (feed rsvpCapacity) carries the RSVP stub like
          every other listing (RsvpNote.jsx). */}
      {needsRsvp(ev) && <RsvpStub lang={lang} />}
    </a>
  );
}

// Accent color per top-level menu category — the printed menu's chapter
// colours (print v2, Donald 27.10.26): Cocktails red, Spirits amber, Beer +
// Wine green, For the Table ink, Zero Proof pink, Café purple.
const CATEGORY_ACCENTS = {
  cocktails: 'var(--red)',
  spirits:   'var(--amber)',
  beerwine:  'var(--green)',
  table:     'var(--fg)', // ink on paper (--ink flips at night; inside a cream card it must not)
  zeroproof: 'var(--pink)',
  cafe:      'var(--purple)',
};

// Cycling palette for section subheaders within each category — majors
// lead, minors trail.
const SECTION_PALETTE = [
  'var(--red)',
  'var(--blue)',
  'var(--yellow)',
  'var(--amber)',
  'var(--green)',
  'var(--purple)',
  'var(--pink)',
];

// `embedded` (the deck home page, 23.11.26): the menu sits inside the opened
// "Our menu" card, which supplies the frame, the heading and the #menus
// anchor. The PDF link, the price note, the deal ticket and every chapter's
// rows are the same; how the chapters are laid out is the deck's (below).
export default function MenuSection({ lang, t, embedded = false }) {
  const Wrap = embedded ? 'div' : 'section';
  // This language only, fields resolved with the EN fallback (menu-i18n.js).
  const MENU = useMenu(lang);
  const [index, setIndex] = useState(0);
  // The deck card on a desktop: the chapters as a board (see `embedded` below).
  const board = useWide('l') && embedded;
  const panelRef = React.useRef(null);

  // Today's drinks deal, if there is one, from the shared feed load (no
  // extra fetch — the calendar's request).
  const { events } = useFeed();
  const deal = useMemo(() => nextDealToday(events, isDealEvent), [events]);
  const [overlayEvent, setOverlayEvent] = useState(null);

  // Category panels differ a lot in height. If the viewport is deep in a
  // tall category when a shorter one is picked, the page would land in
  // whatever follows the menu — re-anchor to the panel top instead.
  // Instant, not smooth: the snap reads as a tab switch, and the content
  // cascade carries the motion. (scroll-behavior:smooth on <html> would
  // otherwise animate it, so it's suspended for the call.)
  const selectCategory = (i) => {
    setIndex(i);
    requestAnimationFrame(() => {
      const el = panelRef.current;
      if (!el) return;
      if (el.getBoundingClientRect().top < 80) {
        const root = document.documentElement;
        const prev = root.style.scrollBehavior;
        root.style.scrollBehavior = 'auto';
        el.scrollIntoView({ block: 'start' });
        root.style.scrollBehavior = prev;
      }
    });
  };

  // WAI-ARIA tabs on BOTH category lists (desktop sidebar, phone strip):
  // roving tabIndex, arrows move + select, Home/End jump. The panels are
  // labelled by the desktop tab (aria-labelledby reads a hidden referent).
  const tabId = (prefix, key) => `menu-${prefix}-tab-${key}`;
  const panelId = (key) => `menu-panel-${key}`;
  const onTabKeys = (e, prefix) => {
    let n = -1;
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') n = (index + 1) % MENU.length;
    else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') n = (index - 1 + MENU.length) % MENU.length;
    else if (e.key === 'Home') n = 0;
    else if (e.key === 'End') n = MENU.length - 1;
    if (n < 0) return;
    e.preventDefault();
    selectCategory(n);
    const el = document.getElementById(tabId(prefix, MENU[n].key));
    if (el) {
      el.focus();
      // the phone strip scrolls sideways — keep the focused tab in view
      el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
  };

  const tabClasses = (active) =>
    `text-left px-4 py-3 border-2 font-title font-bold uppercase tracking-[0.12em] text-xs transition-all flex items-center gap-3 ${
      active
        ? 'bg-ink text-cream border-ink'
        : 'bg-transparent text-ink border-ink/20 hover:border-ink/60'
    }`;

  // Active tab carries a misregistered echo in its category accent —
  // the chip-pop end-state from the motion library.
  const tabStyle = (key, active) =>
    active ? { boxShadow: `5px 6px 0 ${CATEGORY_ACCENTS[key] || 'var(--fg)'}` } : undefined;

  // One chapter's sections and items. The same rows in both layouts.
  const chapter = (cat) => cat.sections.map((section, sIdx) => (
    <div key={sIdx}>
      <h4 className="menu-sec font-title font-bold text-xs md:text-sm tracking-[0.15em] text-gray-600 mb-3 pb-2 border-b border-ink/10 flex items-center gap-2.5">
        <span
          className="inline-block w-3 h-3 shrink-0"
          style={{ backgroundColor: SECTION_PALETTE[sIdx % SECTION_PALETTE.length] }}
          aria-hidden="true"
        />
        {section.label}
      </h4>
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
        {section.items.map((item, idx) => (
          <li key={idx} className="menu-item border-b border-ink/10 pb-2">
            <div className="flex items-baseline justify-between gap-4">
              <span className="menu-item-n font-body font-semibold text-[15px] md:text-base">
                {item.name}
              </span>
              {item.price && (
                <span className="menu-item-p font-body text-ink tabular-nums font-medium shrink-0">
                  {item.price}k
                </span>
              )}
            </div>
            {item.tag && (
              <div className="menu-item-note text-ink/70 text-sm italic mt-1 font-body">
                {item.tag}
              </div>
            )}
            {item.desc && (
              <div className="menu-item-note text-gray-600 text-sm mt-1 font-body">
                {item.desc}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  ));

  // THE DECK (reworked 25.11.26): the chapters ARE the card. The PDF link and
  // today's deal (when there is one) come first, then the six chapters.
  //
  //   PHONE, TABLET   a stack of folds, one per chapter, all shut: nobody
  //                   opens more than they came for.
  //   DESKTOP (L)     the same six as a list down the left, and the chapter
  //                   picked laid out beside it in columns, like a menu
  //                   board. The first chapter is showing on arrival.
  //
  // Either way every chapter is in the DOM, and the static HTML (always the
  // stack of folds) holds all of them. The chapters keep their old ids
  // (#menu-panel-cocktails …): a link to one shows it, fold or tab
  // (deck/fold.js reveal()).
  if (embedded) {
    const note = (
      // Prices print as "150k" (house style); said once, here.
      <p className="dk-small dk-dim dk-menu-note">
        {t.use('menuPriceNote')}{' '}
        <a href={MENU_PDF[lang] || URLS.PDF} target="_blank" rel="noreferrer">{t.use('downloadPdf')}</a>
      </p>
    );
    const count = (cat) => String(cat.sections.reduce((n, s) => n + s.items.length, 0));
    if (board) {
      // Tabs the elements own (fold.js showTab), not React state: the
      // attributes below are the STARTING state and never change here.
      const pick = (e) => {
        const tab = e.target.closest('[role="tab"]');
        if (tab) showTab(tab);
      };
      const keys = (e) => {
        const tabs = Array.from(e.currentTarget.querySelectorAll('[role="tab"]'));
        const at = tabs.indexOf(document.activeElement);
        if (at < 0) return;
        let n = -1;
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') n = (at + 1) % tabs.length;
        else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') n = (at - 1 + tabs.length) % tabs.length;
        else if (e.key === 'Home') n = 0;
        else if (e.key === 'End') n = tabs.length - 1;
        if (n < 0) return;
        e.preventDefault();
        showTab(tabs[n]);
        tabs[n].focus();
      };
      return (
        <div className="menu-embed dk-board text-ink">
          <div className="dk-board-side">
            <div
              className="dk-board-tabs"
              role="tablist"
              aria-label={t.use('menus')}
              aria-orientation="vertical"
              onClick={pick}
              onKeyDown={keys}
            >
              {MENU.map((cat, i) => (
                <button
                  key={cat.key}
                  type="button"
                  id={tabId('deck', cat.key)}
                  role="tab"
                  aria-selected={i === 0 ? 'true' : 'false'}
                  aria-controls={panelId(cat.key)}
                  tabIndex={i === 0 ? 0 : -1}
                  className="dk-tab"
                >
                  <i className="dk-ex-mark" style={{ background: CATEGORY_ACCENTS[cat.key] || 'var(--fg)' }} aria-hidden="true" />
                  <span className="dk-ex-l">{cat.label}</span>
                  <span className="dk-ex-m">{count(cat)}</span>
                </button>
              ))}
            </div>
            {note}
          </div>
          <div className="dk-board-main">
            {deal && <DealTicket ev={deal} lang={lang} onOpen={setOverlayEvent} />}
            {MENU.map((cat, i) => (
              <section
                key={cat.key}
                id={panelId(cat.key)}
                role="tabpanel"
                aria-labelledby={tabId('deck', cat.key)}
                hidden={i !== 0}
                className="menu-panels dk-chapter dk-board-cols"
              >
                {chapter(cat)}
              </section>
            ))}
          </div>
          <EventOverlay event={overlayEvent} lang={lang} onClose={() => setOverlayEvent(null)} />
        </div>
      );
    }
    return (
      <div className="menu-embed text-ink">
        {note}
        {deal && <DealTicket ev={deal} lang={lang} onOpen={setOverlayEvent} />}
        <div className="dk-chapters">
          {MENU.map((cat) => (
            <Expand
              key={cat.key}
              id={panelId(cat.key)}
              sub
              as="h3"
              label={cat.label}
              meta={count(cat)}
              mark={CATEGORY_ACCENTS[cat.key] || 'var(--fg)'}
            >
              <div className="menu-panels dk-chapter space-y-8">{chapter(cat)}</div>
            </Expand>
          ))}
        </div>
        <EventOverlay event={overlayEvent} lang={lang} onClose={() => setOverlayEvent(null)} />
      </div>
    );
  }

  return (
    // A paper band in the canon stack (ink pass 22.08.26): full-bleed field
    // on var(--bg) — theme-aware where the old hardcoded cream ground wasn't
    // guaranteed to be — with the content constrained by the inner max-w
    // wrappers. The 3px separation from DarkCTA above is THIS band's top rule
    // (the .band stack idiom; DarkCTA's own bottom border was removed).
    <Wrap id={embedded ? undefined : 'menus'} className={embedded ? 'menu-embed text-ink' : 'band b-paper section text-ink'}>
      <Reveal stagger className={embedded ? undefined : 'max-w-7xl mx-auto px-4 pt-12'}>
        {!embedded && (
          <div className="eyebrow mb-2" style={{ color: 'var(--blue-text)' }}>
            {t.use('drinkEyebrow')}
          </div>
        )}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          {!embedded && (
            <h2 className="h-section text-3xl md:text-5xl">
              {t.use('menus')}
            </h2>
          )}
          <a
            href={MENU_PDF[lang] || URLS.PDF}
            target="_blank"
            rel="noreferrer"
            className="font-title font-bold text-sm underline underline-offset-4 flex items-center gap-2 hover:opacity-70 transition-opacity"
          >
            {t.use('downloadPdf')}
          </a>
        </div>
        {/* Prices print as "150k" (house style); said once, here. */}
        <p className="mt-3 font-body text-sm text-gray-600">{t.use('menuPriceNote')}</p>
      </Reveal>

      <div className={embedded ? 'mt-6 grid grid-cols-12 gap-6' : 'max-w-7xl mx-auto px-4 mt-6 grid grid-cols-12 gap-6'}>
        {/* Desktop sidebar navigation */}
        <aside className="hidden md:block md:col-span-3 sticky top-24 self-start">
          <nav
            className="flex flex-col gap-2"
            role="tablist"
            aria-label={t.use('menus')}
            aria-orientation="vertical"
            onKeyDown={(e) => onTabKeys(e, 'desktop')}
          >
            {MENU.map((c, i) => (
              <button
                key={c.key}
                type="button"
                id={tabId('desktop', c.key)}
                role="tab"
                aria-selected={i === index}
                aria-controls={panelId(c.key)}
                tabIndex={i === index ? 0 : -1}
                onClick={() => selectCategory(i)}
                className={tabClasses(i === index)}
                style={tabStyle(c.key, i === index)}
              >
                <span
                  className="w-2.5 h-2.5 shrink-0"
                  style={{ backgroundColor: CATEGORY_ACCENTS[c.key] || 'var(--fg)' }}
                  aria-hidden="true"
                />
                {c.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Main content area */}
        <div className="col-span-12 md:col-span-9">
          {deal && <DealTicket ev={deal} lang={lang} onOpen={setOverlayEvent} />}
          {/* Mobile horizontal nav */}
          <div className="md:hidden -mx-2 px-2 mb-4">
            <div
              className="flex gap-2 overflow-x-auto snap-x snap-mandatory py-1 scrollbar-hide"
              role="tablist"
              aria-label={t.use('menus')}
              aria-orientation="horizontal"
              onKeyDown={(e) => onTabKeys(e, 'mobile')}
            >
              {MENU.map((c, i) => (
                <button
                  key={c.key}
                  type="button"
                  id={tabId('mobile', c.key)}
                  role="tab"
                  aria-selected={i === index}
                  aria-controls={panelId(c.key)}
                  tabIndex={i === index ? 0 : -1}
                  onClick={() => selectCategory(i)}
                  className={`snap-start shrink-0 ${tabClasses(i === index)}`}
                  style={tabStyle(c.key, i === index)}
                >
                  <span
                    className="w-2.5 h-2.5 shrink-0"
                    style={{ backgroundColor: CATEGORY_ACCENTS[c.key] || 'var(--fg)' }}
                    aria-hidden="true"
                  />
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Menu panels — natural height; the page is the only scroll.
              All categories stay in the DOM (hidden when inactive) so the
              full menu lands in the pre-rendered HTML for crawlers. The
              active panel's header + section groups lay down in a cascade
              (panel-swap). Rules-on-paper, not a floating card: the old
              card-static shell only existed to give the panel a ground
              against the parallax collage — on a flat paper band a 2px ink
              section rule does the structural work. */}
          <div
            className="menu-panels tkt scroll-mt-24"
            ref={panelRef}
          >
            {MENU.map((cat, i) => (
              <section
                key={cat.key}
                id={panelId(cat.key)}
                hidden={i !== index}
                className={`py-6 md:py-8 space-y-8 ${i === index ? 'panel-swap' : ''}`}
                role="tabpanel"
                aria-labelledby={tabId('desktop', cat.key)}
              >
                <header className="flex items-start gap-3 md:gap-4">
                  <span
                    className="inline-block w-5 h-5 md:w-6 md:h-6 mt-1 md:mt-1.5 shrink-0"
                    style={{
                      backgroundColor: CATEGORY_ACCENTS[cat.key] || 'var(--fg)',
                      border: '2px solid var(--fg)',
                      boxShadow: 'var(--sh-light)',
                    }}
                    aria-hidden="true"
                  />
                  <h3 className="h-section text-2xl md:text-3xl">
                    {cat.label}
                  </h3>
                </header>

                {/* Section groups are direct children so the cascade hits
                    each one in turn */}
                {chapter(cat)}
              </section>
            ))}
          </div>
        </div>
      </div>
      {!embedded && <div className="h-6"/>}
      <EventOverlay event={overlayEvent} lang={lang} onClose={() => setOverlayEvent(null)} />
    </Wrap>
  );
}
