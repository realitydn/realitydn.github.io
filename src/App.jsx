import React, { useState } from "react";
import ParallaxLayers from "./components/ParallaxLayers";
import Header from "./components/Header";
import Hero from "./components/Hero";
import EventsSection from "./components/EventsSection";
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
    <div className="min-h-screen">
      {/* Parallax background layers */}
      <ParallaxLayers />
      
      {/* Main content - Layer 1 (top) */}
      <div className="relative z-10">
        <Header 
          lang={lang} 
          setLang={setLang} 
          mobileOpen={mobileOpen} 
          setMobileOpen={setMobileOpen} 
          t={t} 
        />
        <main>
          <Hero t={t} />
          <EventsSection t={t} />
          <Calendar lang={lang} />
          <InfoSection t={t} />
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
