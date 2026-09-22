import React from 'react';
import { Link } from 'react-router-dom';
import Logo from '../components/Logo';
import ThemeToggle from '../components/ThemeToggle';
import { LANGS, pathFor } from '../data/languages';

// The 404 page. Prerendered once to dist/404.html (prerender.mjs), which
// Cloudflare Pages serves with a real 404 status for any path that has no
// file — so a typo is a 404, not a soft-404 copy of the homepage. The copy
// localizes by URL prefix once React runs; the baked HTML is English.
// No LangMenu here: it links to this path's twins, which don't exist either,
// so the language list below points at each language's home instead.
export default function NotFound({ lang, t }) {
  const homeHref = pathFor(lang, '/');

  return (
    <div className="min-h-screen bg-cream">
      <header className="py-4 sticky top-0 z-40 bg-cream" style={{ borderBottom: '3px solid var(--fg)' }}>
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between">
          <Link to={homeHref} aria-label={t.use('backHome')}>
            <Logo color="var(--fg)" />
          </Link>
          <ThemeToggle lang={lang} compact />
        </div>
      </header>

      <main className="py-12 md:py-16">
        <section className="section max-w-3xl mx-auto px-4 text-center">
          <p className="eyebrow mb-4">404</p>
          <h1 className="h-section text-4xl md:text-5xl text-ink mb-6">
            {t.use('notFound.title')}
          </h1>
          <p className="font-body text-xl text-gray-700 mb-8">
            {t.use('notFound.body')}
          </p>
          <Link to={homeHref} className="btn-primary px-6 py-3 text-sm inline-block">
            {t.use('backHome')}
          </Link>

          <nav aria-label={t.use('notFound.langs')} className="mt-12">
            <p className="font-title text-xs tracking-[0.08em] text-ink/70 mb-3">
              {t.use('notFound.langs')}
            </p>
            <ul className="flex flex-wrap justify-center gap-x-4 gap-y-2 font-body text-ink">
              {LANGS.map((l) => (
                <li key={l.code}>
                  <Link to={pathFor(l.code, '/')} hrefLang={l.iso} lang={l.iso} className="underline hover:opacity-70">
                    {l.native}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </section>
      </main>
    </div>
  );
}
