import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { URLS } from '../data/translations';
import { pathFor } from '../data/languages';
import EventProposalForm from './EventProposalForm';
import ArtExhibitionForm from './ArtExhibitionForm';
import Reveal from './Reveal';

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
          style={{ color: 'var(--red)' }}
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
  // The proposal form is folded away until asked for — the panel reads as
  // information first, and the page keeps a single scroll.
  const [formOpen, setFormOpen] = useState(false);
  const [submittedFlavor, setSubmittedFlavor] = useState(null);

  const panelRef = useRef(null);
  const formAreaRef = useRef(null);

  const goTo = (panel, eventType) => {
    setActiveMain(panel);
    if (eventType) setActiveEventType(eventType);
    if (panel !== 'host' || (eventType && eventType !== activeEventType)) {
      setFormOpen(false);
      setSubmittedFlavor(null);
    }
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

  // Deep link: /#proposal (e.g. from the Event Guidelines CTA) lands on the
  // host panel with the form open.
  useEffect(() => {
    if (window.location.hash === '#proposal') {
      setActiveMain('host');
      setFormOpen(true);
      requestAnimationFrame(() => {
        document.getElementById('proposal')?.scrollIntoView({ block: 'start' });
      });
    }
  }, []);

  const openForm = () => {
    setSubmittedFlavor(null);
    setFormOpen(true);
    requestAnimationFrame(() => {
      formAreaRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });
  };

  const handleSuccess = (flavor) => {
    setSubmittedFlavor(flavor);
    requestAnimationFrame(() => {
      formAreaRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
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

  const mainTabClasses = (active) =>
    `text-left px-4 py-3 border-2 font-title font-bold uppercase tracking-[0.12em] text-xs transition-all flex items-center gap-3 ${
      active
        ? 'bg-ink text-cream border-ink'
        : 'bg-transparent text-ink border-ink/20 hover:border-ink/60'
    } focus:outline-none`;

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

  const MainNav = ({ idPrefix }) => (
    <div className="flex flex-col gap-2" role="tablist" aria-label={ih('sectionTitle')}>
      {MAIN_PANELS.map((panel) => (
        <button
          key={panel}
          id={`${idPrefix}-tab-${panel}`}
          role="tab"
          aria-selected={activeMain === panel}
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

  const SubNav = ({ row = false }) => (
    <div className={row ? 'flex gap-2 mt-2 pl-5 flex-wrap' : 'flex flex-col gap-1.5 mt-1'}>
      {EVENT_TYPES.map((type) => (
        <button
          key={type}
          onClick={() => goTo('host', type)}
          className="text-left px-4 py-2.5 border-2 font-title font-bold uppercase tracking-[0.12em] text-[10px] transition-all flex items-center gap-2.5 focus:outline-none"
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
    if (!formOpen) {
      return (
        <ProposalCTA
          t={t}
          accent={EVENT_ACCENTS[type]}
          label={type === 'art' ? t.use('proposal.artTab') : t.use('proposal.eventTab')}
          onOpen={openForm}
        />
      );
    }
    const form = type === 'art'
      ? <ArtExhibitionForm t={t} onSuccess={() => handleSuccess('art')} />
      : <EventProposalForm t={t} onSuccess={() => handleSuccess(flavor)} />;
    return <div className="stamp-in">{form}</div>;
  };

  return (
    <section id="info" className="bg-cream text-ink">
      <Reveal stagger className="max-w-7xl mx-auto px-4 pt-12">
        <div className="eyebrow mb-2" style={{ color: 'var(--accent)' }}>
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
            <MainNav idPrefix="info-desktop" />
            {activeMain === 'host' && <SubNav />}
          </nav>
        </aside>

        {/* Main content area */}
        <div className="col-span-12 md:col-span-9">
          {/* Mobile nav — vertical stack */}
          <div className="md:hidden mb-4">
            <MainNav idPrefix="info-mobile" />
            {activeMain === 'host' && <SubNav row />}
          </div>

          {/* Panels — natural height, the page is the only thing that
              scrolls. Every panel stays in the DOM (hidden when inactive)
              so the full info content lands in the pre-rendered HTML. */}
          <div className="card-static scroll-mt-24" ref={panelRef}>
            <Panel active={activeMain === 'welcome'}>
              <PanelTitle accent={NAV_ACCENTS.welcome}>{ih('welcomeTitle')}</PanelTitle>
              <p className="mb-4">{ih('welcomeBody')}</p>
              <ColorList items={ih('welcomeMissions')} />
              <p>
                {ih('welcomeFooter')}{' '}
                <a href={URLS.WA} target="_blank" rel="noreferrer" className="underline hover:opacity-70" style={{ color: 'var(--red)' }}>
                  {ih('welcomeWA')}
                </a>{' '}
                {ih('welcomeOr')}{' '}
                <a href={URLS.IG} target="_blank" rel="noreferrer" className="underline hover:opacity-70" style={{ color: 'var(--red)' }}>
                  {ih('welcomeIG')}
                </a>{' '}
                {ih('welcomeFBOr')}{' '}
                <a href={URLS.FB} target="_blank" rel="noreferrer" className="underline hover:opacity-70" style={{ color: 'var(--red)' }}>
                  {ih('welcomeFB')}
                </a>{' '}
                {ih('welcomePages')}
              </p>
            </Panel>

            <Panel active={activeMain === 'rules'}>
              <PanelTitle accent={NAV_ACCENTS.rules}>{ih('rulesTitle')}</PanelTitle>
              <ColorList items={ih('rules')} />
            </Panel>

            <Panel active={activeMain === 'host' && activeEventType === 'public'}>
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

            <Panel active={activeMain === 'host' && activeEventType === 'private'}>
              <PanelTitle accent={EVENT_ACCENTS.private}>{ih('privateTitle')}</PanelTitle>
              <GeneralRulesLink ih={ih} goTo={goTo} />
              <ColorList items={ih('privateRules')} className="mb-6" />
              <PricingTable ih={ih} />
              <div
                id={activeMain === 'host' && activeEventType === 'private' ? 'proposal' : undefined}
                ref={activeEventType === 'private' ? formAreaRef : undefined}
                className="scroll-mt-24 mt-8"
              >
                {formFor('private')}
              </div>
            </Panel>

            <Panel active={activeMain === 'host' && activeEventType === 'art'}>
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
function Panel({ active, children }) {
  return (
    <div
      hidden={!active}
      className="p-6 md:p-10"
      role="tabpanel"
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
      <p className="font-title font-bold uppercase tracking-[0.15em] text-[10px] text-gray-600 m-0">
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
// table reads as a colored grid rather than a wall of numbers.
function PricingTable({ ih }) {
  const slots = [
    { id: 'day',   accent: 'var(--yellow)' },
    { id: 'peak',  accent: 'var(--red)' },
    { id: 'night', accent: 'var(--blue)' },
  ];
  // Text on an accent fill is always literal ink — cream text on yellow
  // would vanish, so these don't ride the theme.
  const onAccent = { day: '#0d0905', peak: '#fffbf1', night: '#0d0905' };
  const rooms = [
    { id: '2e', color: 'var(--pink)' },
    { id: '2l', color: 'var(--purple)' },
    { id: '1l', color: 'var(--green)' },
    { id: '3p', color: 'var(--amber)' },
  ];
  const prices = {
    '2e': ['300', '500', '200'],
    '2l': ['250', '250', '200'],
    '1l': ['200', '200', '150'],
    '3p': ['150', '200', null],
  };
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
        <h4 className="h-section text-lg md:text-xl m-0">
          {ih('pricing.title')}
        </h4>
      </div>
      <p className="font-body text-xs md:text-sm text-gray-600 mb-4 ml-6">
        {ih('pricing.subtitle')}
      </p>

      {/* Rate grid */}
      <div className="overflow-x-auto -mx-1">
        <div className="inline-block min-w-full align-middle px-1">
          <div
            className="grid gap-1.5"
            style={{ gridTemplateColumns: 'minmax(140px, 1.4fr) repeat(3, minmax(80px, 1fr))' }}
          >
            {/* Header row */}
            <div aria-hidden="true" />
            {slots.map((slot) => (
              <div
                key={slot.id}
                className="text-center px-2 py-2"
                style={{ backgroundColor: slot.accent, color: onAccent[slot.id] }}
              >
                <div className="font-title uppercase tracking-[0.1em] text-[9px] md:text-[10px] font-bold leading-tight">
                  {ih(`pricing.slotsLabel.${slot.id}`)}
                </div>
                <div className="font-body text-[10px] md:text-xs mt-0.5 tabular-nums" style={{ opacity: 0.8 }}>
                  {ih(`pricing.slots.${slot.id}`)}
                </div>
              </div>
            ))}

            {/* Body rows */}
            {rooms.map((room) => (
              <React.Fragment key={room.id}>
                <div className="flex items-center gap-2.5 py-2 pr-2">
                  <span
                    className="inline-block w-3.5 h-3.5 shrink-0"
                    style={{ backgroundColor: room.color }}
                    aria-hidden="true"
                  />
                  <span className="font-body text-sm font-semibold text-ink leading-tight">
                    {ih(`pricing.spaces.${room.id}`)}
                  </span>
                </div>
                {prices[room.id].map((price, i) => (
                  <div
                    key={i}
                    className="py-3 px-2 text-center flex flex-col items-center justify-center"
                    style={{
                      borderTop: `2px solid ${slots[i].accent}`,
                      backgroundColor: 'var(--surface-2)',
                      border: '1px solid var(--hairline)',
                      borderTopWidth: '2px',
                      borderTopColor: slots[i].accent,
                    }}
                  >
                    {price === null ? (
                      <span className="font-body text-[10px] uppercase tracking-[0.1em] text-gray-400">
                        {unavailable}
                      </span>
                    ) : (
                      <span className="font-title font-bold text-base md:text-lg text-ink leading-none tabular-nums">
                        {price}
                        <span className="font-body font-normal text-[10px] text-gray-500 ml-0.5">
                          {unit}
                        </span>
                      </span>
                    )}
                  </div>
                ))}
              </React.Fragment>
            ))}
          </div>
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
        onClick={() => goTo('rules')}
        className="underline font-semibold hover:opacity-70 transition-opacity"
        style={{ color: 'var(--red)' }}
      >
        {ih('generalRulesLink')}
      </button>
      .
    </p>
  );
}

// The folded-away proposal form, presented as a clear next step. Clicking
// expands the form in place (stamp, don't float) — no inner scrollbars.
function ProposalCTA({ t, accent, label, onOpen }) {
  return (
    <div
      className="card-static p-6 md:p-8"
      style={{ borderColor: 'var(--fg)' }}
    >
      <div
        className="eyebrow mb-2"
        style={{ color: 'var(--accent)' }}
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

function ThankYou({ ih, onReset }) {
  return (
    <div
      className="card-static stamp-in p-8 md:p-12 max-w-2xl text-center"
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
