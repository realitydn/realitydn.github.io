import React, { useState, useEffect, useCallback, useRef } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { URLS } from '../data/translations';
import EventProposalForm from './EventProposalForm';
import ArtExhibitionForm from './ArtExhibitionForm';

// Main panels in the carousel
const MAIN_PANELS = ['welcome', 'rules', 'host'];

// Sub-panels within the "host" panel — each is its own carousel slide
const EVENT_TYPES = ['public', 'private', 'art'];

// Accent colors from the REALITY palette, one per nav button
const NAV_ACCENTS = {
  welcome: '#00AB4D',  // green
  rules:   '#0077A3',  // blue
  host:    '#E72D33',  // red
};
const EVENT_ACCENTS = {
  public:  '#FD9D32',  // orange
  private: '#403785',  // purple
  art:     '#E92775',  // pink
};

// All slides in order: welcome, rules, public, private, art
// "host" isn't a slide itself — clicking it shows the first event type (public)
function slideIndex(panel, eventType) {
  if (panel === 'welcome') return 0;
  if (panel === 'rules') return 1;
  // host sub-panels start at index 2
  return 2 + EVENT_TYPES.indexOf(eventType || 'public');
}

export default function InfoHostSection({ t, lang }) {
  const ih = (k) => t.use(`infoHost.${k}`);

  const [viewportRef, embla] = useEmblaCarousel({
    align: 'start',
    dragFree: false,
    loop: false,
    skipSnaps: false,
  });

  const [currentSlide, setCurrentSlide] = useState(0);
  const [submittedFlavor, setSubmittedFlavor] = useState(null);

  const onSelect = useCallback(() => {
    if (embla) setCurrentSlide(embla.selectedScrollSnap());
  }, [embla]);

  useEffect(() => {
    if (!embla) return;
    onSelect();
    embla.on('select', onSelect);
    embla.on('reInit', onSelect);
    return () => {
      embla.off('select', onSelect);
      embla.off('reInit', onSelect);
    };
  }, [embla, onSelect]);

  // Derived state from slide index
  const activeMain =
    currentSlide === 0 ? 'welcome' : currentSlide === 1 ? 'rules' : 'host';
  const activeEventType =
    currentSlide >= 2 ? EVENT_TYPES[currentSlide - 2] : 'public';

  const goTo = (panel, eventType) => {
    const idx = slideIndex(panel, eventType);
    embla?.scrollTo(idx);
  };

  const carouselContainerRef = useRef(null);
  const handleSuccess = (flavor) => {
    setSubmittedFlavor(flavor);
    // Reset the active slide's scroll to top so ThankYou is visible
    // instead of blank cream space left over from the form's scroll position.
    requestAnimationFrame(() => {
      const slides = carouselContainerRef.current?.querySelectorAll(':scope > section');
      slides?.forEach((s) => { s.scrollTop = 0; });
    });
  };
  const resetThanks = () => {
    setSubmittedFlavor(null);
    goTo('host', activeEventType);
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

  return (
    <section id="info" className="bg-cream text-ink">
      <div className="max-w-7xl mx-auto px-4 pt-12">
        <div className="uppercase text-xs md:text-sm tracking-[0.25em] font-title text-gray-600 mb-2">
          {ih('sectionEyebrow')}
        </div>
        <h2 className="font-body text-3xl md:text-5xl leading-[1] tracking-tight uppercase">
          {ih('sectionTitle')}
        </h2>
      </div>

      <div className="max-w-7xl mx-auto px-4 mt-6 grid grid-cols-12 gap-6">
        {/* Desktop sidebar */}
        <aside className="hidden md:block md:col-span-3 sticky top-20 self-start">
          <nav className="flex flex-col gap-2">
            {MAIN_PANELS.map((panel) => (
              <button
                key={panel}
                onClick={() =>
                  goTo(panel, panel === 'host' ? activeEventType : undefined)
                }
                className={`text-left px-4 py-3 rounded-xl border font-title uppercase tracking-[0.15em] text-xs transition-all flex items-center gap-3 ${
                  activeMain === panel
                    ? 'bg-ink text-cream border-ink'
                    : 'bg-transparent text-ink border-ink/20 hover:border-ink/50'
                } focus:ring-2 focus:ring-offset-2 focus:ring-ink focus:outline-none`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-sm shrink-0"
                  style={{ backgroundColor: NAV_ACCENTS[panel] }}
                  aria-hidden="true"
                />
                {navLabel(panel)}
              </button>
            ))}

            {/* Event type sub-nav */}
            {activeMain === 'host' && (
              <div className="flex flex-col gap-1.5 mt-1">
                {EVENT_TYPES.map((type) => (
                  <button
                    key={type}
                    onClick={() => goTo('host', type)}
                    className="text-left px-4 py-2.5 rounded-lg border font-title uppercase tracking-[0.12em] text-[10px] transition-all flex items-center gap-2.5 focus:ring-2 focus:ring-offset-2 focus:ring-ink focus:outline-none"
                    style={
                      activeEventType === type
                        ? {
                            backgroundColor: 'rgba(192,57,43,0.08)',
                            borderColor: '#c0392b',
                            color: '#c0392b',
                          }
                        : {
                            backgroundColor: 'transparent',
                            borderColor: 'transparent',
                          }
                    }
                  >
                    <span
                      className="w-2 h-2 rounded-sm shrink-0"
                      style={{ backgroundColor: EVENT_ACCENTS[type] }}
                      aria-hidden="true"
                    />
                    {eventLabel(type)}
                  </button>
                ))}
              </div>
            )}
          </nav>
        </aside>

        {/* Main content area */}
        <div className="col-span-12 md:col-span-9">
          {/* Mobile nav — vertical stack, no swiping */}
          <div className="md:hidden mb-4">
            <div className="flex flex-col gap-2">
              {MAIN_PANELS.map((panel) => (
                <button
                  key={panel}
                  onClick={() =>
                    goTo(panel, panel === 'host' ? activeEventType : undefined)
                  }
                  className={`text-left px-4 py-3 rounded-xl border font-title uppercase tracking-[0.15em] text-xs transition-all flex items-center gap-3 ${
                    activeMain === panel
                      ? 'bg-ink text-cream border-ink'
                      : 'bg-transparent text-ink border-ink/20'
                  } focus:ring-2 focus:ring-offset-2 focus:ring-ink focus:outline-none`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-sm shrink-0"
                    style={{ backgroundColor: NAV_ACCENTS[panel] }}
                    aria-hidden="true"
                  />
                  {navLabel(panel)}
                </button>
              ))}
            </div>
            {/* Mobile event type sub-nav */}
            {activeMain === 'host' && (
              <div className="flex gap-2 mt-2 pl-5">
                {EVENT_TYPES.map((type) => (
                  <button
                    key={type}
                    onClick={() => goTo('host', type)}
                    className="px-3 py-2 rounded-lg border font-title uppercase tracking-[0.12em] text-[10px] transition-all flex items-center gap-2 focus:ring-2 focus:ring-offset-2 focus:ring-ink focus:outline-none"
                    style={
                      activeEventType === type
                        ? {
                            backgroundColor: 'rgba(192,57,43,0.08)',
                            borderColor: '#c0392b',
                            color: '#c0392b',
                          }
                        : {
                            backgroundColor: 'transparent',
                            borderColor: 'transparent',
                            color: '#1a1a1a',
                          }
                    }
                  >
                    <span
                      className="w-2 h-2 rounded-sm shrink-0"
                      style={{ backgroundColor: EVENT_ACCENTS[type] }}
                      aria-hidden="true"
                    />
                    {eventLabel(type)}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Carousel */}
          <div
            className="overflow-hidden rounded-3xl border border-ink/10 bg-white"
            ref={viewportRef}
          >
            <div className="flex" ref={carouselContainerRef}>
              {/* Slide 0: Welcome */}
              <Slide>
                <SlideTitle>{ih('welcomeTitle')}</SlideTitle>
                <p className="mb-4">{ih('welcomeBody')}</p>
                <ol className="list-decimal pl-5 space-y-2 mb-4">
                  {ih('welcomeMissions').map((m, i) => (
                    <li key={i}>{m}</li>
                  ))}
                </ol>
                <p>
                  {ih('welcomeFooter')}{' '}
                  <a
                    href={URLS.WA}
                    target="_blank"
                    rel="noreferrer"
                    className="underline hover:opacity-70"
                    style={{ color: '#c0392b' }}
                  >
                    {ih('welcomeWA')}
                  </a>{' '}
                  {ih('welcomeOr')}{' '}
                  <a
                    href={URLS.IG}
                    target="_blank"
                    rel="noreferrer"
                    className="underline hover:opacity-70"
                    style={{ color: '#c0392b' }}
                  >
                    {ih('welcomeIG')}
                  </a>{' '}
                  {ih('welcomeFBOr')}{' '}
                  <a
                    href={URLS.FB}
                    target="_blank"
                    rel="noreferrer"
                    className="underline hover:opacity-70"
                    style={{ color: '#c0392b' }}
                  >
                    {ih('welcomeFB')}
                  </a>{' '}
                  {ih('welcomePages')}
                </p>
              </Slide>

              {/* Slide 1: Rules */}
              <Slide>
                <SlideTitle>{ih('rulesTitle')}</SlideTitle>
                <ol className="list-decimal pl-5 space-y-3">
                  {ih('rules').map((rule, i) => (
                    <li key={i}>{rule}</li>
                  ))}
                </ol>
              </Slide>

              {/* Slide 2: Public Events */}
              <Slide>
                <SlideTitle>{ih('publicTitle')}</SlideTitle>
                <GeneralRulesLink ih={ih} goTo={goTo} />
                <ol className="list-decimal pl-5 space-y-3 mb-6">
                  {ih('publicRules').map((rule, i) => (
                    <li key={i}>{rule}</li>
                  ))}
                </ol>
                {submittedFlavor === 'event' ? (
                  <ThankYou ih={ih} onReset={resetThanks} />
                ) : (
                  <EventProposalForm t={t} onSuccess={() => handleSuccess('event')} />
                )}
              </Slide>

              {/* Slide 3: Private Events */}
              <Slide>
                <SlideTitle>{ih('privateTitle')}</SlideTitle>
                <GeneralRulesLink ih={ih} goTo={goTo} />
                <ol className="list-decimal pl-5 space-y-3 mb-6">
                  {ih('privateRules').map((rule, i) => (
                    <li key={i}>{rule}</li>
                  ))}
                </ol>
                {submittedFlavor === 'event-private' ? (
                  <ThankYou ih={ih} onReset={resetThanks} />
                ) : (
                  <EventProposalForm t={t} onSuccess={() => handleSuccess('event-private')} />
                )}
              </Slide>

              {/* Slide 4: Art Show */}
              <Slide>
                <SlideTitle>{ih('artTitle')}</SlideTitle>
                <GeneralRulesLink ih={ih} goTo={goTo} />
                <p className="mb-3">{ih('artIntro')}</p>
                <p className="mb-4">{ih('artNote')}</p>
                <p className="font-title uppercase tracking-[0.15em] text-[10px] text-gray-500 mb-2 mt-6">
                  {ih('artGuidelinesLabel')}
                </p>
                <ol className="list-decimal pl-5 space-y-3 mb-6">
                  {ih('artGuidelines').map((g, i) => (
                    <li key={i}>{g}</li>
                  ))}
                </ol>
                {submittedFlavor === 'art' ? (
                  <ThankYou ih={ih} onReset={resetThanks} />
                ) : (
                  <ArtExhibitionForm t={t} onSuccess={() => handleSuccess('art')} />
                )}
              </Slide>
            </div>
          </div>
        </div>
      </div>
      <div className="h-6" />
    </section>
  );
}

// --- Sub-components ---

function Slide({ children }) {
  return (
    <section className="basis-full shrink-0 p-6 md:p-10 overflow-y-auto max-h-[50vh]">
      <div className="font-body text-sm md:text-base text-gray-700 leading-relaxed">
        {children}
      </div>
    </section>
  );
}

function SlideTitle({ children }) {
  return (
    <h3 className="font-body text-2xl md:text-3xl font-bold uppercase leading-tight mb-6">
      {children}
    </h3>
  );
}

function GeneralRulesLink({ ih, goTo }) {
  return (
    <p className="mb-4">
      {ih('allEventsPrefix')}{' '}
      <button
        onClick={() => goTo('rules')}
        className="underline font-semibold hover:opacity-70 transition-opacity"
        style={{ color: '#c0392b' }}
      >
        {ih('generalRulesLink')}
      </button>
      .
    </p>
  );
}

function ThankYou({ ih, onReset }) {
  return (
    <div
      className="card-static p-8 md:p-12 max-w-2xl text-center"
      role="status"
      aria-live="polite"
    >
      <div
        className="mx-auto w-14 h-14 bg-ink text-cream flex items-center justify-center mb-6"
        style={{ boxShadow: '0 8px 2px rgba(13, 9, 5, 0.12)' }}
        aria-hidden="true"
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20 6L9 17l-5-5" />
        </svg>
      </div>
      <h3 className="font-title text-3xl md:text-4xl leading-[1] tracking-[0.08em] text-ink mb-4">
        {ih('thanksTitle')}
      </h3>
      <p className="font-body text-gray-700 text-lg max-w-md mx-auto">
        {ih('thanksBody')}
      </p>
      <button
        type="button"
        onClick={onReset}
        className="btn-secondary mt-8 px-6 py-3 font-title text-sm tracking-[0.15em]"
      >
        {ih('thanksAction')}
      </button>
    </div>
  );
}
