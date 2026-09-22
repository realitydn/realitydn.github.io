import React, { Suspense, useEffect, useMemo, useState } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import Header from "./components/Header";
import Hero from "./components/Hero";
import Calendar from "./components/Calendar";
import InfoHostSection from "./components/InfoHostSection";
import DarkCTA from "./components/DarkCTA";
import MenuSection from "./components/MenuSection";
import VisitSection from "./components/VisitSection";
import GallerySection from "./components/GallerySection";
import Footer from "./components/Footer";
import SEO from "./components/SEO";
import FAQSchema from "./components/FAQSchema";
import EventsSchema from "./components/EventsSchema";
import MenuSchema from "./components/MenuSchema";
import HostGuide from "./pages/HostGuide";
import EventGuidelines from "./pages/EventGuidelines";
import NotFound from "./pages/NotFound";
import { STR, useLocale } from "./data/translations";
import { LANGS, langByCode, langFromPath, pathFor, routeFor } from "./data/languages";
import { loadMenu } from "./data/menu-i18n";
import { buildFaq } from "./data/faq";
import useFeed from "./hooks/useFeed";
import useHashLanding from "./hooks/useHashLanding";

// Builds the `t` helper from a language code. Callers use `t.use('path.to.key')`.
// The catalogue must be loaded — every route renders under <Localized>, which
// guarantees it.
// Missing keys fall back to the EN catalogue (the reference copy), then to the
// key string itself — so an incomplete locale shows English, not key paths.
function makeT(lang) {
  const lookup = (root, k) =>
    k.split('.').reduce((a, c) => (a && a[c] !== undefined ? a[c] : undefined), root);
  return {
    use: (k) => {
      const v = lookup(STR[lang], k);
      if (v !== undefined) return v;
      const en = lookup(STR.EN, k);
      return en !== undefined ? en : k;
    },
  };
}

// Per-page SEO strings live in each locale's `seo` block (locales/*.js).
const seoOf = (lang) => STR[lang].seo || STR.EN.seo;

const SITE = 'https://realitydn.com';

function HomePage({ lang }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const t = makeT(lang);
  const seo = seoOf(lang);
  // Memoised per language: FAQSchema re-emits its tag whenever `items`
  // changes identity, so a fresh array every render would churn the <head>.
  const faq = useMemo(() => buildFaq(makeT(lang), lang), [lang]);
  // Deep links (/#proposal from the app, /#events, /#menus…) land where they
  // point, and stay there once the feed has arrived. useFeed here is the
  // same shared load Calendar/EventsSchema use — no extra fetch.
  const { loading: feedLoading } = useFeed();
  useHashLanding({ settled: !feedLoading });

  return (
    <div className="min-h-screen">
      <SEO lang={lang} title={seo.homeTitle} description={seo.homeDescription} />
      <FAQSchema items={faq} />
      <MenuSchema lang={lang} />
      <EventsSchema lang={lang} />
      {/* Skip link — first focusable element so keyboard users can jump past
          the header. Visually hidden until focused (see .skip-link in CSS). */}
      <a href="#main-content" className="skip-link">
        {t.use('skipLink')}
      </a>
      {/* Ink pass (22.08.26): the parallax collage is gone — the page is a
          stack of full-width bands on flat paper (body carries var(--bg)),
          so nothing needs a z-lift over background plates any more. */}
      <Header
        lang={lang}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        t={t}
      />
      <main id="main-content" tabIndex={-1}>
        <Hero t={t} />
        <Calendar lang={lang} />
        <InfoHostSection t={t} lang={lang} />
        <DarkCTA lang={lang} />
        <MenuSection lang={lang} t={t} />
        <VisitSection lang={lang} t={t} />
        <GallerySection t={t} />
      </main>
      <Footer lang={lang} />
    </div>
  );
}

// The render-time gate for a route's language: its catalogue is a lazy chunk
// (data/translations.js), so this suspends until it has landed. On a first
// load it never does — main.jsx awaits the page's language before rendering —
// and a client-side language switch runs in React Router's startTransition,
// which keeps the old page on screen until the new catalogue is in. Home
// routes also need that language's menu chunk (MenuSection/MenuSchema wait on
// it themselves); starting it here fetches both together, not one after the other.
function Localized({ lang, menu = false, children }) {
  if (menu) loadMenu(lang);
  useLocale(lang);
  return children;
}

export default function App() {
  return (
    // fallback={null}: only reachable if a chunk is somehow not preloaded —
    // see Localized above.
    <Suspense fallback={null}>
      <Routes>
        {/* One route trio per language — EN unprefixed, the rest under their
            prefix (/vn, /ru, /uk, /ko, /ja). See data/languages.js. */}
        {LANGS.map(({ code }) => (
          <React.Fragment key={code}>
            <Route path={routeFor(code, '/')} element={<Localized lang={code} menu><HomePage lang={code} /></Localized>} />
            <Route path={routeFor(code, '/event-guidelines')} element={<Localized lang={code}><EventGuidelinesRoute lang={code} /></Localized>} />
            <Route path={routeFor(code, '/host-guide')} element={<Localized lang={code}><HostGuideRoute lang={code} /></Localized>} />
          </React.Fragment>
        ))}

        {/* Any unknown path → a real 404 page (prerendered to dist/404.html,
            which Cloudflare Pages serves with a 404 status). Redirecting to
            home made every typo a soft-404 duplicate of the homepage. */}
        <Route path="*" element={<NotFoundRoute />} />
      </Routes>
    </Suspense>
  );
}

function EventGuidelinesRoute({ lang }) {
  const t = makeT(lang);
  const seo = seoOf(lang);
  return (
    <>
      <SEO lang={lang} title={seo.guidelinesTitle} description={seo.guidelinesDescription} />
      <GuidelinesSchema lang={lang} title={seo.guidelinesTitle} description={seo.guidelinesDescription} />
      <EventGuidelines lang={lang} t={t} />
    </>
  );
}

function HostGuideRoute({ lang }) {
  const t = makeT(lang);
  const seo = seoOf(lang);
  // Stub page — keep it out of the index until there is real content.
  return (
    <>
      <SEO lang={lang} title={seo.hostGuideTitle} description={seo.hostGuideDescription} noindex />
      <HostGuide lang={lang} t={t} />
    </>
  );
}

// WebPage + BreadcrumbList JSON-LD for the Event Guidelines pages (Home ›
// Event Guidelines), same imperative upsert/cleanup pattern as FAQSchema.
function GuidelinesSchema({ lang, title, description, id = 'guidelines-schema' }) {
  useEffect(() => {
    const home = SITE + pathFor(lang, '/');
    const url = SITE + pathFor(lang, '/event-guidelines');
    const schema = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'WebPage',
          '@id': url + '#webpage',
          url,
          name: title,
          description,
          inLanguage: langByCode(lang).iso,
          isPartOf: { '@id': SITE + '/#website' },
          about: { '@id': SITE + '/#business' },
          breadcrumb: { '@id': url + '#breadcrumb' },
        },
        {
          '@type': 'BreadcrumbList',
          '@id': url + '#breadcrumb',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'REALITY', item: home },
            { '@type': 'ListItem', position: 2, name: title, item: url },
          ],
        },
      ],
    };
    let tag = document.getElementById(id);
    if (!tag) {
      tag = document.createElement('script');
      tag.id = id;
      tag.type = 'application/ld+json';
      document.head.appendChild(tag);
    }
    tag.textContent = JSON.stringify(schema).replace(/</g, '\\u003c');
    return () => {
      const existing = document.getElementById(id);
      if (existing) existing.remove();
    };
  }, [lang, title, description, id]);
  return null;
}

// Unknown paths. The language comes from the prefix (/vn/typo → Vietnamese),
// EN otherwise. noindex + no canonical/hreflang via <SEO notFound>.
function NotFoundRoute() {
  const { pathname } = useLocation();
  const lang = langFromPath(pathname);
  useLocale(lang);
  const t = makeT(lang);
  const seo = seoOf(lang);
  return (
    <>
      <SEO lang={lang} title={seo.notFoundTitle || STR.EN.seo.notFoundTitle} notFound />
      <NotFound lang={lang} t={t} />
    </>
  );
}
