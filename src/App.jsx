import React, { useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import ParallaxLayers from "./components/ParallaxLayers";
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
import { STR } from "./data/translations";
import { LANGS, pathFor } from "./data/languages";

// Builds the `t` helper from a language code. Callers use `t.use('path.to.key')`.
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

function HomePage({ lang }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const t = makeT(lang);
  const seo = seoOf(lang);

  return (
    <div className="min-h-screen">
      <SEO lang={lang} title={seo.homeTitle} description={seo.homeDescription} />
      <FAQSchema items={[
        { q: t.use('infoHost.welcomeTitle'), a: t.use('infoHost.welcomeBody') },
        { q: t.use('infoHost.rulesTitle'), a: t.use('infoHost.rules')[0] },
        { q: t.use('infoHost.hostTitle'), a: t.use('infoHost.hostIntro') },
      ]} />
      <MenuSchema lang={lang} />
      <EventsSchema lang={lang} />
      {/* Skip link — first focusable element so keyboard users can jump past
          the header. Visually hidden until focused (see .skip-link in CSS). */}
      <a href="#main-content" className="skip-link">
        {t.use('skipLink')}
      </a>
      <ParallaxLayers />
      <div className="relative z-10">
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
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      {/* One route trio per language — EN unprefixed, the rest under their
          prefix (/vn, /ru, /uk, /ko, /ja). See data/languages.js. */}
      {LANGS.map(({ code }) => (
        <React.Fragment key={code}>
          <Route path={pathFor(code, '/')} element={<HomePage lang={code} />} />
          <Route path={pathFor(code, '/event-guidelines')} element={<EventGuidelinesRoute lang={code} />} />
          <Route path={pathFor(code, '/host-guide')} element={<HostGuideRoute lang={code} />} />
        </React.Fragment>
      ))}

      {/* Any unknown path → home. */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function EventGuidelinesRoute({ lang }) {
  const t = makeT(lang);
  const seo = seoOf(lang);
  return (
    <>
      <SEO lang={lang} title={seo.guidelinesTitle} description={seo.guidelinesDescription} />
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
