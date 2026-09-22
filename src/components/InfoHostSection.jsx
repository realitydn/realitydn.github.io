import React, { useState, useEffect, useRef } from 'react';
import { landingTarget } from '../hooks/useHashLanding';
import { Link } from 'react-router-dom';
import { URLS } from '../data/translations';
import { pathFor } from '../data/languages';
import { ROOM_RATES, RATE_SLOTS } from '../data/room-rates';
import EventProposalForm from './EventProposalForm';
import ArtExhibitionForm from './ArtExhibitionForm';
import Reveal from './Reveal';
import { scrollBehavior } from '../hooks/motion';

// Wrap the public-events cross-references ("How REALITY Can Help with
// Promotion" and "brand guidelines") with links to the full Event Guidelines
// page — the homepage panels don't contain those sections themselves.
function linkifyPhrases(text, links) {
  let parts = [text];
  links.forEach(({ phrase, to }, li) => {
    parts = parts.flatMap((part, pi) => {
      if (typeof part !== 'string') return [part];
      const idx = part.indexOf(phrase);
      if (idx === -1) return [part];
      return [
        part.slice(0, idx),
        <Link
          key={`lnk-${li}-${pi}`}
          to={to}
          className="underline font-semibold hover:opacity-70 transition-opacity"
          style={{ color: 'var(--red-text)' }}
        >
          {phrase}
        </Link>,
        part.slice(idx + phrase.length),
      ];
    });
  });
  return parts.filter((p) => p !== '');
}

// Main panels
const MAIN_PANELS = ['welcome', 'rules', 'host'];

// Sub-panels within the "host" panel
const EVENT_TYPES = ['public', 'private', 'art'];

// Year 2 accents. Top-level nav rides the majors; the event-type sub-nav
// is where the minors play second fiddle.
const NAV_ACCENTS = {
  welcome: 'var(--yellow)',
  rules:   'var(--blue)',
  host:    'var(--red)',    // imperative
};
const EVENT_ACCENTS = {
  public:  'var(--amber)',
  private: 'var(--purple)',
  art:     'var(--pink)',
};

// Bullet/decoration cycle — majors lead, minors trail.
const CHROMATIC = [
  'var(--red)',
  'var(--blue)',
  'var(--yellow)',
  'var(--amber)',
  'var(--green)',
  'var(--pink)',
  'var(--purple)',
];

export default function InfoHostSection({ t, lang }) {
  const ih = (k) => t.use(`infoHost.${k}`);

  // Public-events copy references the branding + promotion sections, which live
  // on the full Event Guidelines page (not in these panels) — link to them.
  // The exact phrases per language live in eventGuidelines.crossRefs (locales/*.js).
  const guidelinesBase = pathFor(lang, '/event-guidelines');
  const publicCrossRefs = [
    { phrase: t.use('eventGuidelines.crossRefs.promote'), to: `${guidelinesBase}#promote` },
    { phrase: t.use('eventGuidelines.crossRefs.branding'), to: `${guidelinesBase}#branding` },
  ];
  const publicRulesItems = ih('publicRules').map((it) =>
    typeof it === 'string' ? linkifyPhrases(it, publicCrossRefs) : it
  );

  const [activeMain, setActiveMain] = useState('welcome');
  const [activeEventType, setActiveEventType] = useState('public');
  // The proposal forms are folded away until asked for — the panel reads as
  // information first, and the page keeps a single scroll. Open state is PER
  // event type and survives tab switches: every panel stays mounted (just
  // hidden), so a half-filled form is still there after a detour to the
  // rules (the "general rules" link sits right above the form) — and each
  // form also keeps a localStorage draft (useProposalForm).
  const [openForms, setOpenForms] = useState({});
  const [submittedFlavor, setSubmittedFlavor] = useState(null);

  const panelRef = useRef(null);
  const formAreaRef = useRef(null);

  const goTo = (panel, eventType) => {
    setActiveMain(panel);
    if (eventType) setActiveEventType(eventType);
    // Panels are natural height, so switching from a tall panel while
    // scrolled deep can leave the viewport stranded below the new, shorter
    // one. If the panel top is no longer on screen, re-anchor to it
    // instantly — the content cascade carries the motion. (Suspend
    // scroll-behavior:smooth so the snap really is a snap.)
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

  // Deep link: /#proposal (the app's "hold an event" button, the Event
  // Guidelines CTA) opens the host panel with the form unfolded; /#host and
  // /#rules pick their panel. The scrolling itself is useHashLanding's job
  // (App.jsx) — it waits for the #proposal element to exist and re-anchors
  // after the calendar feed lands, so this only sets the state.
  useEffect(() => {
    const target = landingTarget(window.location.hash);
    if (!target || !target.panel) return;
    setActiveMain(target.panel);
    if (target.form) setOpenForms((o) => ({ ...o, public: true }));
  }, []);

  const openForm = (type) => {
    setSubmittedFlavor(null);
    setOpenForms((o) => ({ ...o, [type]: true }));
    requestAnimationFrame(() => {
      formAreaRef.current?.scrollIntoView({ block: 'nearest', behavior: scrollBehavior() });
    });
  };

  const handleSuccess = (flavor) => {
    setSubmittedFlavor(flavor);
    requestAnimationFrame(() => {
      formAreaRef.current?.scrollIntoView({ block: 'center', behavior: scrollBehavior() });
    });
  };
  const resetThanks = () => {
    setSubmittedFlavor(null);
  };

  // Nav button label helper
  const navLabel = (panel) => {
    if (panel === 'welcome') return ih('navWelcome');
    if (panel === 'rules') return ih('navRules');
    return ih('navHost');
  };
  const eventLabel = (type) => {
    if (type === 'public') return ih('navPublic');
    if (type === 'private') return ih('navPrivate');
    return ih('navArt');
  };

  // ── Tabs ───────────────────────────────────────────────────────────────
  // WAI-ARIA tabs: one tab stop per list (roving tabIndex), arrows move and
  // select, Home/End jump. Panel ids are fixed; the desktop sidebar and the
  // mobile stack are two renderings of the same lists (only one is ever
  // displayed), told apart by an id prefix.
  const panelId = (key) => `info-panel-${key}`;
  const hostPanelKey = `host-${activeEventType}`;
  const onTabKeys = (e, list, current, select, idOf) => {
    const i = list.indexOf(current);
    let n = -1;
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') n = (i + 1) % list.length;
    else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') n = (i - 1 + list.length) % list.length;
    else if (e.key === 'Home') n = 0;
    else if (e.key === 'End') n = list.length - 1;
    if (n < 0) return;
    e.preventDefault();
    select(list[n]);
    const el = document.getElementById(idOf(list[n]));
    if (el) el.focus();
  };

  const mainTabClasses = (active) =>
    `text-left px-4 py-3 border-2 font-title font-bold uppercase tracking-[0.12em] text-xs transition-all flex items-center gap-3 ${
      active
        ? 'bg-ink text-cream border-ink'
        : 'bg-transparent text-ink border-ink/20 hover:border-ink/60'
    }`;

  // Active tab carries a misregistered echo in its accent — the chip-pop
  // end-state from the motion library.
  const mainTabStyle = (panel, active) =>
    active ? { boxShadow: `5px 6px 0 ${NAV_ACCENTS[panel]}` } : undefined;

  const subTabStyle = (type, active) =>
    active
      ? {
          borderColor: EVENT_ACCENTS[type],
          backgroundColor: `color-mix(in srgb, ${EVENT_ACCENTS[type]} 16%, transparent)`,
          color: 'var(--fg)',
        }
      : {
          borderColor: 'transparent',
          backgroundColor: 'transparent',
          color: 'var(--fg-dim)',
        };

  const mainNav = (idPrefix) => (
    <div
      className="flex flex-col gap-2"
      role="tablist"
      aria-label={ih('sectionTitle')}
      aria-orientation="vertical"
      onKeyDown={(e) =>
        onTabKeys(e, MAIN_PANELS, activeMain, (p) => goTo(p), (p) => `${idPrefix}-tab-${p}`)
      }
    >
      {MAIN_PANELS.map((panel) => (
        <button
          key={panel}
          type="button"
          id={`${idPrefix}-tab-${panel}`}
          role="tab"
          aria-selected={activeMain === panel}
          aria-controls={panelId(panel === 'host' ? hostPanelKey : panel)}
          tabIndex={activeMain === panel ? 0 : -1}
          onClick={() => goTo(panel, panel === 'host' ? activeEventType : undefined)}
          className={mainTabClasses(activeMain === panel)}
          style={mainTabStyle(panel, activeMain === panel)}
        >
          <span
            className="w-2.5 h-2.5 shrink-0"
            style={{ backgroundColor: NAV_ACCENTS[panel] }}
            aria-hidden="true"
          />
          {navLabel(panel)}
        </button>
      ))}
    </div>
  );

  // 12px floor (canon): these were 10px.
  const subNav = (idPrefix, row = false) => (
    <div
      className={row ? 'flex gap-2 mt-2 pl-5 flex-wrap' : 'flex flex-col gap-1.5 mt-1'}
      role="tablist"
      aria-label={t.use('a11y.eventTypes')}
      aria-orientation={row ? 'horizontal' : 'vertical'}
      onKeyDown={(e) =>
        onTabKeys(e, EVENT_TYPES, activeEventType, (tp) => goTo('host', tp), (tp) => `${idPrefix}-sub-${tp}`)
      }
    >
      {EVENT_TYPES.map((type) => (
        <button
          key={type}
          type="button"
          id={`${idPrefix}-sub-${type}`}
          role="tab"
          aria-selected={activeEventType === type}
          aria-controls={panelId(`host-${type}`)}
          tabIndex={activeEventType === type ? 0 : -1}
          onClick={() => goTo('host', type)}
          className="text-left px-4 py-2.5 border-2 font-title font-bold uppercase tracking-[0.12em] text-xs transition-all flex items-center gap-2.5"
          style={subTabStyle(type, activeEventType === type)}
        >
          <span
            className="w-2 h-2 shrink-0"
            style={{ backgroundColor: EVENT_ACCENTS[type] }}
            aria-hidden="true"
          />
          {eventLabel(type)}
        </button>
      ))}
    </div>
  );

  // ---- The proposal area (host panel only) ----
  const formFor = (type) => {
    const flavor = type === 'public' ? 'event' : type === 'private' ? 'event-private' : 'art';
    if (submittedFlavor === flavor) {
      return <ThankYou ih={ih} onReset={resetThanks} />;
    }
    if (!openForms[type]) {
      return (
        <ProposalCTA
          t={t}
          accent={EVENT_ACCENTS[type]}
          label={type === 'art' ? t.use('proposal.artTab') : t.use('proposal.eventTab')}
          onOpen={() => openForm(type)}
        />
      );
    }
    // The private tab reuses the event form with type="private" — it keys
    // its own draft and tags the payload (eventType) for the inbox.
    const form = type === 'art'
      ? <ArtExhibitionForm t={t} lang={lang} onSuccess={() => handleSuccess('art')} />
      : <EventProposalForm t={t} lang={lang} type={type} onSuccess={() => handleSuccess(flavor)} />;
    return <div className="stamp-in">{form}</div>;
  };

  return (
    // A paper band in the canon stack (ink pass 22.08.26): full-bleed field on
    // var(--bg), 3px ink top rule from .band, content constrained by the inner
    // max-w wrappers. The accent squares on tabs/titles stay — they're eyebrow
    // furniture, not parallax décor.
    <section id="info" className="band b-paper section text-ink">
      <Reveal stagger className="max-w-7xl mx-auto px-4 pt-12">
        <div className="eyebrow mb-2" style={{ color: 'var(--blue-text)' }}>
          {ih('sectionEyebrow')}
        </div>
        <h2 className="h-section text-3xl md:text-5xl">
          {ih('sectionTitle')}
        </h2>
      </Reveal>

      <div className="max-w-7xl mx-auto px-4 mt-6 grid grid-cols-12 gap-6">
        {/* Desktop sidebar */}
        <aside className="hidden md:block md:col-span-3 sticky top-24 self-start">
          <nav>
            {mainNav('info-desktop')}
            {activeMain === 'host' && subNav('info-desktop')}
          </nav>
        </aside>

        {/* Main content area */}
        <div className="col-span-12 md:col-span-9">
          {/* Mobile nav — vertical stack */}
          <div className="md:hidden mb-4">
            {mainNav('info-mobile')}
            {activeMain === 'host' && subNav('info-mobile', true)}
          </div>

          {/* Panels — natural height, the page is the only thing that
              scrolls. Every panel stays in the DOM (hidden when inactive)
              so the full info content lands in the pre-rendered HTML.
              Rules-on-paper: the card-static shell existed to ground the
              panel against the parallax collage; on the flat band a 2px
              ink section rule replaces it. */}
          <div
            className="scroll-mt-24"
            ref={panelRef}
            style={{ borderTop: '2px solid var(--fg)' }}
          >
            <Panel id={panelId('welcome')} labelledBy="info-desktop-tab-welcome" active={activeMain === 'welcome'}>
              <PanelTitle accent={NAV_ACCENTS.welcome}>{ih('welcomeTitle')}</PanelTitle>
              <p className="mb-4">{ih('welcomeBody')}</p>
              <ColorList items={ih('welcomeMissions')} />
              <p>
                {ih('welcomeFooter')}{' '}
                <a href={URLS.WA} target="_blank" rel="noreferrer" className="underline hover:opacity-70" style={{ color: 'var(--red-text)' }}>
                  {ih('welcomeWA')}
                </a>{' '}
                {ih('welcomeOr')}{' '}
                <a href={URLS.IG} target="_blank" rel="noreferrer" className="underline hover:opacity-70" style={{ color: 'var(--red-text)' }}>
                  {ih('welcomeIG')}
                </a>{' '}
                {ih('welcomeFBOr')}{' '}
                <a href={URLS.FB} target="_blank" rel="noreferrer" className="underline hover:opacity-70" style={{ color: 'var(--red-text)' }}>
                  {ih('welcomeFB')}
                </a>{' '}
                {ih('welcomePages')}
              </p>
            </Panel>

            <Panel id={panelId('rules')} labelledBy="info-desktop-tab-rules" active={activeMain === 'rules'}>
              <PanelTitle accent={NAV_ACCENTS.rules}>{ih('rulesTitle')}</PanelTitle>
              <ColorList items={ih('rules')} />
            </Panel>

            <Panel id={panelId('host-public')} labelledBy="info-desktop-sub-public" active={activeMain === 'host' && activeEventType === 'public'}>
              <PanelTitle accent={EVENT_ACCENTS.public}>{ih('publicTitle')}</PanelTitle>
              <GeneralRulesLink ih={ih} goTo={goTo} />
              <ColorList items={publicRulesItems} className="mb-6" />
              <div
                id={activeMain === 'host' && activeEventType === 'public' ? 'proposal' : undefined}
                ref={activeEventType === 'public' ? formAreaRef : undefined}
                className="scroll-mt-24 mt-8"
              >
                {formFor('public')}
              </div>
            </Panel>

            <Panel id={panelId('host-private')} labelledBy="info-desktop-sub-private" active={activeMain === 'host' && activeEventType === 'private'}>
              <PanelTitle accent={EVENT_ACCENTS.private}>{ih('privateTitle')}</PanelTitle>
              <GeneralRulesLink ih={ih} goTo={goTo} />
              <ColorList items={ih('privateRules')} className="mb-6" />
              <PricingTable ih={ih} roomLabel={t.use('a11y.room')} />
              <div
                id={activeMain === 'host' && activeEventType === 'private' ? 'proposal' : undefined}
                ref={activeEventType === 'private' ? formAreaRef : undefined}
                className="scroll-mt-24 mt-8"
              >
                {formFor('private')}
              </div>
            </Panel>

            <Panel id={panelId('host-art')} labelledBy="info-desktop-sub-art" active={activeMain === 'host' && activeEventType === 'art'}>
              <PanelTitle accent={EVENT_ACCENTS.art}>{ih('artTitle')}</PanelTitle>
              <GeneralRulesLink ih={ih} goTo={goTo} />
              <p className="mb-3">{ih('artIntro')}</p>
              <p className="mb-4">{ih('artNote')}</p>
              <SectionLabel accent="var(--pink)">{ih('artGuidelinesLabel')}</SectionLabel>
              <ColorList items={ih('artGuidelines')} className="mb-6" />
              <div
                id={activeMain === 'host' && activeEventType === 'art' ? 'proposal' : undefined}
                ref={activeEventType === 'art' ? formAreaRef : undefined}
                className="scroll-mt-24 mt-8"
              >
                {formFor('art')}
              </div>
            </Panel>
          </div>
        </div>
      </div>
      <div className="h-6" />
    </section>
  );
}

// --- Sub-components ---

// One tab panel. Inactive panels stay mounted but hidden so crawlers see
// everything; the active one builds itself — children lay down in a
// 90ms cascade (panel-swap).
// labelledBy points at the desktop tab; the name still resolves when that
// sidebar is display:none (aria-labelledby reads hidden referents).
function Panel({ id, labelledBy, active, children }) {
  return (
    <div
      id={id}
      hidden={!active}
      className="py-6 md:py-8"
      role="tabpanel"
      aria-labelledby={labelledBy}
    >
      <div className={`font-body text-sm md:text-base text-gray-700 leading-relaxed ${active ? 'panel-swap' : ''}`}>
        {children}
      </div>
    </div>
  );
}

function PanelTitle({ children, accent }) {
  return (
    <div className="flex items-start gap-3 md:gap-4 mb-6">
      {accent && (
        <span
          className="inline-block w-5 h-5 md:w-6 md:h-6 mt-1 md:mt-1.5 shrink-0"
          style={{
            backgroundColor: accent,
            border: '2px solid var(--fg)',
            boxShadow: 'var(--sh-light)',
          }}
          aria-hidden="true"
        />
      )}
      <h3 className="h-section text-2xl md:text-3xl text-ink">
        {children}
      </h3>
    </div>
  );
}

// A small uppercase eyebrow label paired with a colored square.
function SectionLabel({ children, accent = 'var(--fg)' }) {
  return (
    <div className="flex items-center gap-2.5 mb-3 mt-6">
      <span
        className="inline-block w-2.5 h-2.5 shrink-0"
        style={{ backgroundColor: accent }}
        aria-hidden="true"
      />
      <p className="font-title font-bold uppercase tracking-[0.15em] text-xs text-gray-600 m-0">
        {children}
      </p>
    </div>
  );
}

// A numbered list that uses a colored square + 2-digit index in place of
// the default decimal marker. Items can be strings or React nodes.
function ColorList({ items, className = '', palette = CHROMATIC, startIndex = 0 }) {
  return (
    <ol className={`space-y-3 ${className}`}>
      {items.map((item, i) => {
        const color = palette[(i + startIndex) % palette.length];
        return (
          <li key={i} className="flex gap-3 items-start">
            <span className="flex items-center gap-2 shrink-0 mt-[3px]">
              <span
                className="inline-block w-3 h-3 shrink-0"
                style={{ backgroundColor: color }}
                aria-hidden="true"
              />
              <span
                className="font-title text-[11px] font-bold tabular-nums text-ink/70"
              >
                {String(i + 1).padStart(2, '0')}
              </span>
            </span>
            <span className="flex-1">{item}</span>
          </li>
        );
      })}
    </ol>
  );
}

// Room rental rate card. Each room and time slot gets its own swatch so the
// table reads as a colored grid rather than a wall of numbers. A real <table>
// (a11y pass 23.09.26): a screen reader announces "Peak, 18:00 – 22:00" with
// every price, which the old grid of divs couldn't. border-spacing keeps the
// grid's 6px gutters.
function PricingTable({ ih, roomLabel }) {
  const slots = [
    { id: 'day',   accent: 'var(--yellow)' },
    { id: 'peak',  accent: 'var(--red)' },
    { id: 'night', accent: 'var(--blue)' },
  ];
  // Text on an accent fill is always literal ink — cream text on yellow
  // would vanish, so these don't ride the theme. Peak (red) takes ink too:
  // cream on the red fill is 4.19:1, ink is 4.59:1.
  const onAccent = { day: '#0d0905', peak: '#0d0905', night: '#0d0905' };
  const rooms = [
    { id: '2e', color: 'var(--pink)' },
    { id: '2l', color: 'var(--purple)' },
    { id: '1l', color: 'var(--green)' },
    { id: '3p', color: 'var(--amber)' },
  ];
  // One source of truth with the FAQ JSON-LD + llms files: data/room-rates.
  const prices = Object.fromEntries(
    ROOM_RATES.map(({ id, rates }) => [id, RATE_SLOTS.map((s) => (rates[s] == null ? null : String(rates[s])))])
  );
  const unit = ih('pricing.unit');
  const unavailable = ih('pricing.unavailable');

  return (
    <div className="my-8">
      <div className="flex items-center gap-2.5 mb-2">
        <span
          className="inline-block w-3.5 h-3.5 shrink-0"
          style={{ backgroundColor: 'var(--red)' }}
          aria-hidden="true"
        />
        <h4 id="pricing-title" className="h-section text-lg md:text-xl m-0">
          {ih('pricing.title')}
        </h4>
      </div>
      <p id="pricing-sub" className="font-body text-xs md:text-sm text-gray-600 mb-4 ml-6">
        {ih('pricing.subtitle')}
      </p>

      {/* Rate grid */}
      <div className="overflow-x-auto -mx-1">
        <div className="inline-block min-w-full align-middle px-1">
          <table
            className="w-full"
            aria-labelledby="pricing-title"
            aria-describedby="pricing-sub"
            style={{ borderCollapse: 'separate', borderSpacing: '6px', minWidth: '404px', tableLayout: 'fixed' }}
          >
            <colgroup>
              <col style={{ width: '31%' }} />
              <col />
              <col />
              <col />
            </colgroup>
            <thead>
              <tr>
                <th scope="col" className="p-0">
                  <span className="sr-only">{roomLabel}</span>
                </th>
                {slots.map((slot) => (
                  <th
                    key={slot.id}
                    scope="col"
                    className="text-center px-2 py-2 align-middle"
                    style={{ backgroundColor: slot.accent, color: onAccent[slot.id] }}
                  >
                    {/* 12px floor (canon): these were 9–10px. */}
                    <span className="block font-title uppercase tracking-[0.1em] text-xs font-bold leading-tight">
                      {ih(`pricing.slotsLabel.${slot.id}`)}
                    </span>
                    <span className="block font-body font-normal text-xs mt-0.5 tabular-nums">
                      {ih(`pricing.slots.${slot.id}`)}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
            {rooms.map((room) => (
              <tr key={room.id}>
                <th scope="row" className="py-2 pr-2 text-left font-normal align-middle">
                  <span className="flex items-center gap-2.5">
                    <span
                      className="inline-block w-3.5 h-3.5 shrink-0"
                      style={{ backgroundColor: room.color }}
                      aria-hidden="true"
                    />
                    <span className="font-body text-sm font-semibold text-ink leading-tight">
                      {ih(`pricing.spaces.${room.id}`)}
                    </span>
                  </span>
                </th>
                {prices[room.id].map((price, i) => (
                  <td
                    key={i}
                    className="py-3 px-2 text-center align-middle"
                    style={{
                      borderTop: `2px solid ${slots[i].accent}`,
                      backgroundColor: 'var(--surface-2)',
                      border: '1px solid var(--hairline)',
                      borderTopWidth: '2px',
                      borderTopColor: slots[i].accent,
                    }}
                  >
                    {/* 12px floor (canon): availability + the price unit are
                        facts you act on; 45%-ink at 10px was the exact pair
                        the fg-faint AA correction outlawed. */}
                    {price === null ? (
                      <span className="font-body text-[12px] uppercase tracking-[0.1em] text-gray-600">
                        {unavailable}
                      </span>
                    ) : (
                      <span className="font-title font-bold text-base md:text-lg text-ink leading-none tabular-nums">
                        {price}
                        <span className="font-body font-normal text-[12px] text-gray-600 ml-0.5">
                          {unit}
                        </span>
                      </span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Fine print */}
      <SectionLabel accent="var(--blue)">{ih('pricing.notesLabel')}</SectionLabel>
      <ul className="space-y-2">
        {ih('pricing.notes').map((note, i) => {
          const palette = ['var(--red)', 'var(--blue)', 'var(--yellow)'];
          const color = palette[i % palette.length];
          return (
            <li key={i} className="flex gap-3 items-start text-sm text-gray-700">
              <span
                className="inline-block w-2 h-2 mt-2 shrink-0"
                style={{ backgroundColor: color }}
                aria-hidden="true"
              />
              <span className="flex-1">{note}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function GeneralRulesLink({ ih, goTo }) {
  return (
    <p className="mb-4">
      {ih('allEventsPrefix')}{' '}
      <button
        type="button"
        onClick={() => goTo('rules')}
        className="underline font-semibold hover:opacity-70 transition-opacity"
        style={{ color: 'var(--red-text)' }}
      >
        {ih('generalRulesLink')}
      </button>
      .
    </p>
  );
}

// The folded-away proposal form, presented as a clear next step. Clicking
// expands the form in place (stamp, don't float) — no inner scrollbars.
// Rules-on-paper (ink pass): the card shell was collage furniture; a 2px
// ink rule marks off the proposal step on the flat band.
function ProposalCTA({ t, accent, label, onOpen }) {
  return (
    <div
      className="pt-6 md:pt-8"
      style={{ borderTop: '2px solid var(--fg)' }}
    >
      <div
        className="eyebrow mb-2"
        style={{ color: 'var(--blue-text)' }}
      >
        {t.use('proposal.title')}
      </div>
      <p className="font-body text-ink/80 mb-5 max-w-xl">
        {t.use('proposal.subtitle')}
      </p>
      <button
        type="button"
        onClick={onOpen}
        className="btn-primary px-6 py-4 text-sm inline-flex items-center gap-3"
      >
        <span
          className="inline-block w-2.5 h-2.5"
          style={{ backgroundColor: accent }}
          aria-hidden="true"
        />
        {label}
      </button>
    </div>
  );
}

// Rules-on-paper like the CTA it replaces — the stamp-in motion carries the
// arrival; the confirmation doesn't need a floating card to read as one.
function ThankYou({ ih, onReset }) {
  return (
    <div
      className="stamp-in pt-8 md:pt-10 pb-4 max-w-2xl text-center"
      style={{ borderTop: '2px solid var(--fg)' }}
      role="status"
      aria-live="polite"
    >
      <div
        className="mx-auto w-14 h-14 bg-ink text-cream flex items-center justify-center mb-6"
        style={{ boxShadow: 'var(--sh-default)' }}
        aria-hidden="true"
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="square"
          strokeLinejoin="miter"
        >
          <path d="M20 6L9 17l-5-5" />
        </svg>
      </div>
      <h3 className="h-section text-3xl md:text-4xl text-ink mb-4">
        {ih('thanksTitle')}
      </h3>
      <p className="font-body text-gray-700 text-lg max-w-md mx-auto">
        {ih('thanksBody')}
      </p>
      <button
        type="button"
        onClick={onReset}
        className="btn-secondary mt-8 px-6 py-3 text-sm"
      >
        {ih('thanksAction')}
      </button>
    </div>
  );
}
