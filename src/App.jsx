import React, { useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import ParallaxLayers from "./components/ParallaxLayers";
import Header from "./components/Header";
import Hero from "./components/Hero";
import EventsSection from "./components/EventsSection";
import Calendar from "./components/Calendar";
import InfoSection from "./components/InfoSection";
import ProposalSection from "./components/ProposalSection";
import DarkCTA from "./components/DarkCTA";
import MenuSection from "./components/MenuSection";
import VisitSection from "./components/VisitSection";
import GallerySection from "./components/GallerySection";
import Footer from "./components/Footer";
import SEO from "./components/SEO";
import FAQSchema from "./components/FAQSchema";
import EventGuidelines from "./pages/EventGuidelines";
import HostGuide from "./pages/HostGuide";
import { STR } from "./data/translations";

// Builds the `t` helper from a language code. Same shape as before; callers
// use `t.use('path.to.key')`. Falls back to the key string if the lookup fails.
function makeT(lang) {
  return {
    use: (k) => k.split('.').reduce(
      (a, c) => (a && a[c] !== undefined ? a[c] : k),
      STR[lang]
    )
  };
}

function HomePage({ lang }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const t = makeT(lang);

  const title = lang === 'VN'
    ? 'REALITY — cà phê / cocktail / cộng đồng'
    : 'REALITY — coffee / cocktails / community';
  const description = lang === 'VN'
    ? 'REALITY — cà phê, cocktail và cộng đồng tại 86 Mai Thúc Lân, Đà Nẵng. Sự kiện, nhạc sống, open mic, triển lãm. Mở cửa mỗi ngày 11:00 – 2:00.'
    : 'REALITY — coffee, cocktails, and community at 86 Mai Thúc Lân, Đà Nẵng. Events, live music, open mics, art shows, and the easiest place in the city to make friends. Open daily 11 AM – 2 AM.';

  return (
    <div className="min-h-screen">
      <SEO lang={lang} title={title} description={description} />
      <FAQSchema items={STR[lang].infoItems} />
      {/* Skip link — first focusable element so keyboard users can jump past
          the header. Visually hidden until focused (see .skip-link in CSS). */}
      <a href="#main-content" className="skip-link">
        {lang === 'VN' ? 'Bỏ qua đến nội dung' : 'Skip to content'}
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
          <EventsSection t={t} />
          <Calendar lang={lang} />
          <InfoSection t={t} lang={lang} />
          <ProposalSection t={t} />
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
      {/* English (default, no prefix) */}
      <Route path="/" element={<HomePage lang="EN" />} />
      <Route path="/event-guidelines" element={<EventGuidelinesRoute lang="EN" />} />
      <Route path="/host-guide" element={<HostGuideRoute lang="EN" />} />

      {/* Vietnamese (/vn prefix) */}
      <Route path="/vn" element={<HomePage lang="VN" />} />
      <Route path="/vn/event-guidelines" element={<EventGuidelinesRoute lang="VN" />} />
      <Route path="/vn/host-guide" element={<HostGuideRoute lang="VN" />} />

      {/* Any unknown path → home. */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function EventGuidelinesRoute({ lang }) {
  const t = makeT(lang);
  const title = lang === 'VN'
    ? 'Hướng dẫn sự kiện — REALITY'
    : 'Event Guidelines — REALITY';
  const description = lang === 'VN'
    ? 'Hướng dẫn đề xuất sự kiện tại REALITY — cách hợp tác với chúng tôi, các loại sự kiện chúng tôi tổ chức, và quy trình đề xuất.'
    : 'How to propose an event at REALITY Đà Nẵng — what we look for, the kinds of events we host, and how the submission process works.';
  return (
    <>
      <SEO lang={lang} title={title} description={description} />
      <EventGuidelines lang={lang} t={t} />
    </>
  );
}

function HostGuideRoute({ lang }) {
  const t = makeT(lang);
  const title = lang === 'VN' ? 'Hướng dẫn tổ chức — REALITY' : 'Host Guide — REALITY';
  const description = lang === 'VN'
    ? 'Hướng dẫn tổ chức sự kiện tại REALITY — đang được cập nhật.'
    : 'A guide to hosting well at REALITY Đà Nẵng — coming soon.';
  // Stub page — keep it out of the index until there is real content.
  return (
    <>
      <SEO lang={lang} title={title} description={description} noindex />
      <HostGuide lang={lang} t={t} />
    </>
  );
}
