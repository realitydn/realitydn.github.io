import React from 'react';
import { Link } from 'react-router-dom';
import Logo from '../components/Logo';

// Numbered list: consistent numeral column + body that wraps cleanly under the
// first word. Supports either plain strings or {lead, body} pairs where the
// lead is emphasized.
function NumberedList({ items }) {
  return (
    <ol className="space-y-3 font-body text-gray-700 leading-relaxed">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3">
          <span className="flex-shrink-0 font-title text-sm tracking-[0.1em] pt-1 w-6 text-ink">
            {i + 1}.
          </span>
          <p className="flex-1">
            {typeof item === 'string' ? (
              item
            ) : (
              <>
                <span className="font-title text-ink tracking-[0.02em]">{item.lead}</span>
                {item.body ? <span>{item.body.startsWith('–') || item.body.startsWith('—') ? '' : ' '}{item.body}</span> : null}
              </>
            )}
          </p>
        </li>
      ))}
    </ol>
  );
}

function BulletList({ items }) {
  return (
    <ul className="space-y-2 font-body text-gray-700 leading-relaxed">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3">
          <span className="flex-shrink-0 text-ink pt-1">•</span>
          <p className="flex-1">{item}</p>
        </li>
      ))}
    </ul>
  );
}

export default function EventGuidelines({ lang, t }) {
  const homeHref = lang === 'VN' ? '/vn' : '/';
  const enHref = '/event-guidelines';
  const vnHref = '/vn/event-guidelines';
  const proposalHref = `${homeHref === '/' ? '' : homeHref}/#proposal`;

  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <header className="border-b border-ink/10 py-4 sticky top-0 z-40 bg-cream">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to={homeHref}
              className="p-2 -ml-2 hover:bg-ink/5 transition-colors inline-flex items-center"
              aria-label={lang === 'VN' ? 'Về trang chủ REALITY' : 'Back to REALITY home'}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </Link>
            <Link to={homeHref} aria-label="REALITY home">
              <Logo />
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <Link
              to={enHref}
              className={`font-title text-sm tracking-[0.15em] ${
                lang === 'EN' ? 'text-ink' : 'text-ink/50 hover:text-ink'
              }`}
              hrefLang="en"
              aria-current={lang === 'EN' ? 'page' : undefined}
            >
              EN
            </Link>
            <Link
              to={vnHref}
              className={`font-title text-sm tracking-[0.15em] ${
                lang === 'VN' ? 'text-ink' : 'text-ink/50 hover:text-ink'
              }`}
              hrefLang="vi"
              aria-current={lang === 'VN' ? 'page' : undefined}
            >
              VN
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="py-12 md:py-16">
        <section className="section max-w-3xl mx-auto px-4 space-y-12">
          {/* Page Title */}
          <div>
            <h1 className="font-title text-4xl md:text-5xl leading-[1] tracking-[0.1em] text-ink mb-4">
              {t.use('eventGuidelines.title')}
            </h1>
            <p className="font-body text-gray-700 text-lg">
              {t.use('eventGuidelines.subtitle')}
            </p>
            <p className="mt-4 font-body text-gray-700">
              {t.use('eventGuidelines.intro')}
            </p>
          </div>

          {/* General Rules */}
          <section>
            <h2 className="font-title text-2xl md:text-3xl leading-tight tracking-[0.1em] text-ink mb-4">
              {t.use('eventGuidelines.generalRulesTitle')}
            </h2>
            <NumberedList items={t.use('eventGuidelines.generalRules')} />
          </section>

          {/* Public Community Events */}
          <section>
            <h2 className="font-title text-2xl md:text-3xl leading-tight tracking-[0.1em] text-ink mb-4">
              {t.use('eventGuidelines.publicEventsTitle')}
            </h2>
            <NumberedList items={t.use('eventGuidelines.publicEvents')} />
          </section>

          {/* Private / For-Profit Events */}
          <section>
            <h2 className="font-title text-2xl md:text-3xl leading-tight tracking-[0.1em] text-ink mb-4">
              {t.use('eventGuidelines.privateEventsTitle')}
            </h2>
            <NumberedList items={t.use('eventGuidelines.privateEvents')} />
          </section>

          {/* Classes */}
          <section>
            <h2 className="font-title text-2xl md:text-3xl leading-tight tracking-[0.1em] text-ink mb-4">
              {t.use('eventGuidelines.classesTitle')}
            </h2>
            <NumberedList items={t.use('eventGuidelines.classes')} />
          </section>

          {/* Branding Guidelines */}
          <section className="space-y-6">
            <div>
              <h2 className="font-title text-2xl md:text-3xl leading-tight tracking-[0.1em] text-ink mb-4">
                {t.use('eventGuidelines.brandingTitle')}
              </h2>
              <p className="font-body text-gray-700 leading-relaxed">
                {t.use('eventGuidelines.brandingIntro')}
              </p>
            </div>
            <div>
              <h3 className="font-title text-lg md:text-xl leading-tight tracking-[0.1em] text-ink mb-3">
                {t.use('eventGuidelines.brandingMaterialsTitle')}
              </h3>
              <NumberedList items={t.use('eventGuidelines.brandingMaterials')} />
            </div>
            <div>
              <h3 className="font-title text-lg md:text-xl leading-tight tracking-[0.1em] text-ink mb-3">
                {t.use('eventGuidelines.brandingSocialsTitle')}
              </h3>
              <NumberedList items={t.use('eventGuidelines.brandingSocials')} />
            </div>
          </section>

          {/* How REALITY Can Help */}
          <section className="space-y-6">
            <div>
              <h2 className="font-title text-2xl md:text-3xl leading-tight tracking-[0.1em] text-ink mb-4">
                {t.use('eventGuidelines.promoteTitle')}
              </h2>
              <p className="font-body text-gray-700 leading-relaxed">
                {t.use('eventGuidelines.promoteIntro')}
              </p>
            </div>
            <div>
              <h3 className="font-title text-lg md:text-xl leading-tight tracking-[0.1em] text-ink mb-3">
                {t.use('eventGuidelines.promoteWeTitle')}
              </h3>
              <BulletList items={t.use('eventGuidelines.promoteWe')} />
            </div>
            <div>
              <h3 className="font-title text-lg md:text-xl leading-tight tracking-[0.1em] text-ink mb-3">
                {t.use('eventGuidelines.promoteYouTitle')}
              </h3>
              <BulletList items={t.use('eventGuidelines.promoteYou')} />
            </div>
          </section>

          {/* Event Checklist / CTA */}
          <section className="mt-16 pt-8 border-t border-ink/10">
            <h2 className="font-title text-2xl md:text-3xl leading-tight tracking-[0.1em] text-ink mb-4">
              {t.use('eventGuidelines.checklistTitle')}
            </h2>
            <p className="font-body text-gray-700 leading-relaxed mb-2">
              {t.use('eventGuidelines.checklistBody')}
            </p>
            <p className="font-body text-gray-700 leading-relaxed mb-6">
              {t.use('eventGuidelines.ctaTitle')}
            </p>
            {/* Plain <a> so the browser performs a full nav + hash-scroll
                on the target page. React Router's <Link> wouldn't scroll. */}
            <a
              href={proposalHref}
              className="btn-primary px-6 py-3 font-title text-sm tracking-[0.15em] inline-block"
            >
              {t.use('eventGuidelines.ctaButton')}
            </a>
          </section>
        </section>
      </main>
    </div>
  );
}
