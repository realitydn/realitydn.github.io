import React from 'react';
import { Link } from 'react-router-dom';
import Logo from '../components/Logo';

export default function HostGuide({ lang, t }) {
  const homeHref = lang === 'VN' ? '/vn' : '/';
  const enHref = '/host-guide';
  const vnHref = '/vn/host-guide';

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
        <section className="section max-w-3xl mx-auto px-4 text-center">
          {/* Page Title */}
          <h1 className="font-title text-4xl md:text-5xl leading-[1] tracking-[0.1em] text-ink mb-6">
            {t.use('hostGuide.title')}
          </h1>

          {/* Coming Soon Message */}
          <div className="py-12 md:py-20">
            <p className="font-body text-xl text-gray-700 mb-8">
              {t.use('hostGuide.message')}
            </p>
            <Link
              to={homeHref}
              className="btn-primary px-6 py-3 font-title text-sm tracking-[0.15em] inline-block"
            >
              {t.use('hostGuide.backButton')}
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
