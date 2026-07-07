import React, { useState } from 'react';
import { MENU } from '../data/menu';
import { URLS } from '../data/translations';
import Reveal from './Reveal';

// Accent color per top-level menu category — Year 2 category-coding with
// the majors on the big three (cocktails / beer & wine / coffee) and the
// minors seasoning the rest per their registers (amber = warm/late,
// green = community/day, purple = after-dark).
const CATEGORY_ACCENTS = {
  cocktails: 'var(--red)',
  spirits:   'var(--amber)',
  beerwine:  'var(--yellow)',
  coffee:    'var(--blue)',
  tea:       'var(--green)',
  other:     'var(--purple)',
};

// Cycling palette for section subheaders within each category — majors
// lead, minors trail.
const SECTION_PALETTE = [
  'var(--red)',
  'var(--blue)',
  'var(--yellow)',
  'var(--amber)',
  'var(--green)',
  'var(--purple)',
  'var(--pink)',
];

// Site language code → menu-data field suffix (the site says VN, the data says
// VI; everything else matches). A missing translation falls back to EN.
const MENU_LANG = { EN: 'EN', VN: 'VI', RU: 'RU', UK: 'UK', KO: 'KO', JA: 'JA' };
const menuText = (obj, field, lang) => obj[field + (MENU_LANG[lang] || 'EN')] || obj[field + 'EN'];

export default function MenuSection({ lang, t }) {
  const [index, setIndex] = useState(0);
  const panelRef = React.useRef(null);

  // Category panels differ a lot in height. If the viewport is deep in a
  // tall category when a shorter one is picked, the page would land in
  // whatever follows the menu — re-anchor to the panel top instead.
  // Instant, not smooth: the snap reads as a tab switch, and the content
  // cascade carries the motion. (scroll-behavior:smooth on <html> would
  // otherwise animate it, so it's suspended for the call.)
  const selectCategory = (i) => {
    setIndex(i);
    requestAnimationFrame(() => {
      const el = panelRef.current;
      if (!el) return;
      if (el.getBoundingClientRect().top < 80) {
        const root = document.documentElement;
        const prev = root.style.scrollBehavior;
        root.style.scrollBehavior = 'auto';
        el.scrollIntoView({ block: 'start' });
        root.style.scrollBehavior = prev;
      }
    });
  };

  const tabClasses = (active) =>
    `text-left px-4 py-3 border-2 font-title font-bold uppercase tracking-[0.12em] text-xs transition-all flex items-center gap-3 ${
      active
        ? 'bg-ink text-cream border-ink'
        : 'bg-transparent text-ink border-ink/20 hover:border-ink/60'
    } focus:outline-none`;

  // Active tab carries a misregistered echo in its category accent —
  // the chip-pop end-state from the motion library.
  const tabStyle = (key, active) =>
    active ? { boxShadow: `5px 6px 0 ${CATEGORY_ACCENTS[key] || 'var(--fg)'}` } : undefined;

  return (
    <section id="menus" className="bg-cream text-ink">
      <Reveal stagger className="max-w-7xl mx-auto px-4 pt-12">
        <div className="eyebrow mb-2" style={{ color: 'var(--accent)' }}>
          {t.use('drinkEyebrow')}
        </div>
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <h2 className="h-section text-3xl md:text-5xl">
            {t.use('menus')}
          </h2>
          <a
            href={URLS.PDF}
            target="_blank"
            rel="noreferrer"
            className="font-title font-bold text-sm underline underline-offset-4 flex items-center gap-2 hover:opacity-70 transition-opacity focus:outline-none"
          >
            {t.use('downloadPdf')}
          </a>
        </div>
      </Reveal>

      <div className="max-w-7xl mx-auto px-4 mt-6 grid grid-cols-12 gap-6">
        {/* Desktop sidebar navigation */}
        <aside className="hidden md:block md:col-span-3 sticky top-24 self-start">
          <nav className="flex flex-col gap-2" role="tablist" aria-label={t.use('menus')}>
            {MENU.map((c, i) => (
              <button
                key={c.key}
                role="tab"
                aria-selected={i === index}
                onClick={() => selectCategory(i)}
                className={tabClasses(i === index)}
                style={tabStyle(c.key, i === index)}
              >
                <span
                  className="w-2.5 h-2.5 shrink-0"
                  style={{ backgroundColor: CATEGORY_ACCENTS[c.key] || 'var(--fg)' }}
                  aria-hidden="true"
                />
                {menuText(c, 'label', lang)}
              </button>
            ))}
          </nav>
        </aside>

        {/* Main content area */}
        <div className="col-span-12 md:col-span-9">
          {/* Mobile horizontal nav */}
          <div className="md:hidden -mx-2 px-2 mb-4">
            <div className="flex gap-2 overflow-x-auto snap-x snap-mandatory py-1 scrollbar-hide">
              {MENU.map((c, i) => (
                <button
                  key={c.key}
                  onClick={() => selectCategory(i)}
                  className={`snap-start shrink-0 ${tabClasses(i === index)}`}
                  style={tabStyle(c.key, i === index)}
                >
                  <span
                    className="w-2.5 h-2.5 shrink-0"
                    style={{ backgroundColor: CATEGORY_ACCENTS[c.key] || 'var(--fg)' }}
                    aria-hidden="true"
                  />
                  {menuText(c, 'label', lang)}
                </button>
              ))}
            </div>
          </div>

          {/* Menu panels — natural height; the page is the only scroll.
              All categories stay in the DOM (hidden when inactive) so the
              full menu lands in the pre-rendered HTML for crawlers. The
              active panel's header + section groups lay down in a cascade
              (panel-swap). */}
          <div className="card-static scroll-mt-24" ref={panelRef}>
            {MENU.map((cat, i) => (
              <section
                key={cat.key}
                hidden={i !== index}
                className={`p-6 md:p-10 space-y-8 ${i === index ? 'panel-swap' : ''}`}
                role="tabpanel"
              >
                <header className="flex items-start gap-3 md:gap-4">
                  <span
                    className="inline-block w-5 h-5 md:w-6 md:h-6 mt-1 md:mt-1.5 shrink-0"
                    style={{
                      backgroundColor: CATEGORY_ACCENTS[cat.key] || 'var(--fg)',
                      border: '2px solid var(--fg)',
                      boxShadow: 'var(--sh-light)',
                    }}
                    aria-hidden="true"
                  />
                  <h3 className="h-section text-2xl md:text-3xl">
                    {menuText(cat, 'label', lang)}
                  </h3>
                </header>

                {/* Section groups are direct children so the cascade hits
                    each one in turn */}
                {cat.sections.map((section, sIdx) => (
                  <div key={sIdx}>
                    <h4 className="font-title font-bold text-xs md:text-sm tracking-[0.15em] text-gray-600 mb-3 pb-2 border-b border-ink/10 flex items-center gap-2.5">
                      <span
                        className="inline-block w-3 h-3 shrink-0"
                        style={{ backgroundColor: SECTION_PALETTE[sIdx % SECTION_PALETTE.length] }}
                        aria-hidden="true"
                      />
                      {menuText(section, 'label', lang)}
                    </h4>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
                      {section.items.map((item, idx) => (
                        <li key={idx} className="border-b border-ink/10 pb-2">
                          <div className="flex items-baseline justify-between gap-4">
                            <span className="font-body font-semibold text-[15px] md:text-base">
                              {menuText(item, 'name', lang)}
                            </span>
                            {item.price && (
                              <span className="font-body text-ink tabular-nums font-medium shrink-0">
                                {item.price}k
                              </span>
                            )}
                          </div>
                          {(item.tagEN || item.tagVI) && (
                            <div className="text-ink/70 text-sm italic mt-1 font-body">
                              {menuText(item, 'tag', lang)}
                            </div>
                          )}
                          {(item.descEN || item.descVI) && (
                            <div className="text-gray-600 text-sm mt-1 font-body">
                              {menuText(item, 'desc', lang)}
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </section>
            ))}
          </div>
        </div>
      </div>
      <div className="h-6"/>
    </section>
  );
}
