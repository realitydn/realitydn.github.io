import React, { useState } from "react";
import Header from "./components/Header";
import Hero from "./components/Hero";
import EventsSection from "./components/EventsSectionConfig";
import Calendar from "./components/Calendar";
import InfoSection from "./components/InfoSection";
import DarkCTA from "./components/DarkCTA";
import MenuSection from "./components/MenuSection";
import VisitSection from "./components/VisitSection";
import GallerySection from "./components/GallerySection";
import Footer from "./components/Footer";
import { STR } from "./data/translations";

export default function App() {
  const [lang, setLang] = useState("EN");
  const [mobileOpen, setMobileOpen] = useState(false);
  
  const t = { 
    use: (k) => k.split('.').reduce((a, c) => (a && a[c] !== undefined ? a[c] : k), STR[lang]) 
  };

  return (
    <div className="min-h-screen bg-cream text-ink">
      <Header 
        lang={lang} 
        setLang={setLang} 
        mobileOpen={mobileOpen} 
        setMobileOpen={setMobileOpen} 
        t={t} 
      />
      <Hero t={t} />
      <EventsSection t={t} />
      <Calendar lang={lang} />
      <InfoSection t={t} />
      <DarkCTA lang={lang} />
      <MenuSection lang={lang} t={t} />
      <VisitSection lang={lang} t={t} />
      <GallerySection t={t} />
      <Footer lang={lang} />
    </div>
  );
}