import React, { useState, useRef } from 'react';
import EventProposalForm from './EventProposalForm';
import ArtExhibitionForm from './ArtExhibitionForm';

// REALITY brand red from the chromatic palette.
const ACCENT = '#ED2123';

export default function ProposalSection({ t }) {
  const [activeTab, setActiveTab] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [submittedFlavor, setSubmittedFlavor] = useState(null);
  const tabsRef = useRef(null);

  const scrollToForm = () => {
    // Brief delay lets the expand transition start so the user sees motion,
    // then scroll the tab buttons to the top of the viewport — the opening
    // form content appears directly below them.
    setTimeout(() => {
      tabsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleTabClick = (tab) => {
    if (submittedFlavor) {
      setSubmittedFlavor(null);
      setActiveTab(tab);
      setIsExpanded(true);
      scrollToForm();
      return;
    }
    if (activeTab === tab) {
      setIsExpanded(false);
      setActiveTab(null);
    } else {
      setActiveTab(tab);
      setIsExpanded(true);
      scrollToForm();
    }
  };

  const handleSuccess = (flavor) => {
    setSubmittedFlavor(flavor);
  };

  const resetThanks = () => {
    setSubmittedFlavor(null);
    setActiveTab(null);
    setIsExpanded(false);
  };

  return (
    <section id="proposal" className="section max-w-7xl mx-auto px-4 py-20 md:py-24">
      <div
        className="relative bg-cream p-8 md:p-12"
        style={{
          boxShadow: '0 12px 3px rgba(13, 9, 5, 0.18), 0 28px 56px rgba(13, 9, 5, 0.10)',
        }}
      >
        {/* Accent stripe — anchors the block and pulls the eye. */}
        <div
          className="absolute top-0 left-0 right-0"
          style={{ height: '6px', backgroundColor: ACCENT }}
          aria-hidden="true"
        />

        <p
          className="font-title text-xs md:text-sm tracking-[0.3em] uppercase mb-3"
          style={{ color: ACCENT }}
        >
          {t.use('proposal.eyebrow')}
        </p>
        <h2 className="font-title text-4xl md:text-6xl leading-[0.95] tracking-[0.08em] text-ink">
          {t.use('proposal.title')}
        </h2>
        <p className="mt-4 font-body text-gray-700 text-lg max-w-2xl">
          {t.use('proposal.subtitle')}
        </p>

        {/* Tab buttons */}
        <div ref={tabsRef} className="flex flex-col md:flex-row gap-3 md:gap-4 mt-8 mb-6">
          <button
            onClick={() => handleTabClick('event')}
            className={`flex-1 px-5 py-4 font-title text-sm md:text-base tracking-[0.15em] transition-all ${
              activeTab === 'event' && !submittedFlavor ? 'btn-primary' : 'btn-secondary'
            }`}
          >
            {t.use('proposal.eventTab')}
          </button>
          <button
            onClick={() => handleTabClick('art')}
            className={`flex-1 px-5 py-4 font-title text-sm md:text-base tracking-[0.15em] transition-all ${
              activeTab === 'art' && !submittedFlavor ? 'btn-primary' : 'btn-secondary'
            }`}
          >
            {t.use('proposal.artTab')}
          </button>
        </div>

        {/* Form / thank-you container with smooth collapse */}
        <div
          style={{
            maxHeight: isExpanded || submittedFlavor ? '2400px' : '0',
            opacity: isExpanded || submittedFlavor ? 1 : 0,
            overflow: 'hidden',
            transition: 'max-height 0.4s ease, opacity 0.4s ease',
          }}
        >
          {submittedFlavor ? (
            <ThankYou t={t} onReset={resetThanks} />
          ) : (
            <>
              {activeTab === 'event' && (
                <EventProposalForm t={t} onSuccess={() => handleSuccess('event')} />
              )}
              {activeTab === 'art' && (
                <ArtExhibitionForm t={t} onSuccess={() => handleSuccess('art')} />
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}

// Big inline thank-you panel. Same spot on the page — no navigation.
function ThankYou({ t, onReset }) {
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
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6L9 17l-5-5" />
        </svg>
      </div>
      <h3 className="font-title text-3xl md:text-4xl leading-[1] tracking-[0.08em] text-ink mb-4">
        {t.use('proposal.thanksTitle')}
      </h3>
      <p className="font-body text-gray-700 text-lg max-w-md mx-auto">
        {t.use('proposal.thanksBody')}
      </p>
      <button
        type="button"
        onClick={onReset}
        className="btn-secondary mt-8 px-6 py-3 font-title text-sm tracking-[0.15em]"
      >
        {t.use('proposal.thanksAction')}
      </button>
    </div>
  );
}
