import React, { useState, useEffect, useCallback } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { MENU } from '../data/menu';
import { URLS } from '../data/translations';

// Accent color per top-level menu category. Mirrors the InfoHostSection
// pattern — every nav item, slide header, and category gets a square of
// signature color so the menu reads as a colored grid, not gray text.
const CATEGORY_ACCENTS = {
  cocktails: '#E72D33', // red
  beerwine:  '#403785', // purple
  coffee:    '#FD9D32', // orange
  tea:       '#00AB4D', // green
  other:     '#0077A3', // blue
};

// Cycling palette used to color section subheaders within each category
// (e.g., Classic / Signature / Seasonal under Cocktails).
const SECTION_PALETTE = [
  '#E72D33', // red
  '#FD9D32', // orange
  '#FFE527', // yellow
  '#00AB4D', // green
  '#00AB8D', // teal
  '#0077A3', // blue
  '#403785', // purple
  '#E92775', // pink
];

export default function MenuSection({ lang, t }) {
  const [viewportRef, embla] = useEmblaCarousel({ 
    align: 'start', 
    dragFree: false, 
    loop: false,
    skipSnaps: false
  });
  const [index, setIndex] = useState(0);
  
  const onSelect = useCallback(() => { 
    if (embla) setIndex(embla.selectedScrollSnap()); 
  }, [embla]);
  
  useEffect(() => { 
    if (!embla) return; 
    onSelect(); 
    embla.on('select', onSelect); 
    embla.on('reInit', onSelect); 
    return () => {
      embla.off('select', onSelect);
      embla.off('reInit', onSelect);
    };
  }, [embla, onSelect]);

  return (
    <section id="menus" className="bg-cream text-ink">
      <div className="max-w-7xl mx-auto px-4 pt-12">
        <div className="uppercase text-xs md:text-sm tracking-[0.25em] font-title text-gray-600 mb-2">
          {t.use('drinkEyebrow')}
        </div>
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <h2 className="font-body text-3xl md:text-5xl leading-[1] tracking-tight uppercase">
            {t.use('menus')}
          </h2>
          <a 
            href={URLS.PDF} 
            target="_blank" 
            rel="noreferrer" 
            className="font-title underline underline-offset-4 flex items-center gap-2 hover:opacity-70 transition-opacity focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ink"
          >
            {t.use('downloadPdf')}
          </a>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 mt-6 grid grid-cols-12 gap-6">
        {/* Desktop sidebar navigation */}
        <aside className="hidden md:block md:col-span-3 sticky top-20 self-start">
          <nav className="flex flex-col gap-2">
            {MENU.map((c, i) => (
              <button
                key={c.key}
                onClick={() => embla?.scrollTo(i)}
                className={`text-left px-4 py-3 rounded-xl border font-title uppercase tracking-[0.15em] text-xs transition-all flex items-center gap-3 ${
                  i === index
                    ? 'bg-ink text-cream border-ink'
                    : 'bg-transparent text-ink border-ink/20 hover:border-ink/50'
                } focus:ring-2 focus:ring-offset-2 focus:ring-ink focus:outline-none`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-sm shrink-0"
                  style={{ backgroundColor: CATEGORY_ACCENTS[c.key] || '#0d0905' }}
                  aria-hidden="true"
                />
                {lang === 'VN' ? c.labelVI : c.labelEN}
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
                  onClick={() => embla?.scrollTo(i)}
                  className={`snap-start shrink-0 px-4 py-3 rounded-xl border font-title uppercase tracking-[0.15em] text-xs transition-all flex items-center gap-3 ${
                    i === index
                      ? 'bg-ink text-cream border-ink'
                      : 'bg-transparent text-ink border-ink/20'
                  } focus:ring-2 focus:ring-offset-2 focus:ring-ink focus:outline-none`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-sm shrink-0"
                    style={{ backgroundColor: CATEGORY_ACCENTS[c.key] || '#0d0905' }}
                    aria-hidden="true"
                  />
                  {lang === 'VN' ? c.labelVI : c.labelEN}
                </button>
              ))}
            </div>
          </div>
          
          {/* Menu carousel */}
          <div className="overflow-hidden rounded-3xl border border-ink/10 bg-white" ref={viewportRef}>
            <div className="flex">
              {MENU.map((cat) => (
                <section key={cat.key} className="basis-full shrink-0 p-6 md:p-10 overflow-y-auto max-h-[70vh]">
                  <header className="mb-6 flex items-start gap-3 md:gap-4">
                    <span
                      className="inline-block w-5 h-5 md:w-6 md:h-6 mt-1 md:mt-1.5 shrink-0"
                      style={{
                        backgroundColor: CATEGORY_ACCENTS[cat.key] || '#0d0905',
                        boxShadow: '0 4px 1px rgba(13, 9, 5, 0.12)',
                      }}
                      aria-hidden="true"
                    />
                    <h3 className="font-body text-2xl md:text-3xl font-bold uppercase leading-tight">
                      {lang === 'VN' ? cat.labelVI : cat.labelEN}
                    </h3>
                  </header>

                  {/* Render sections with subheaders */}
                  <div className="space-y-8">
                    {cat.sections.map((section, sIdx) => (
                      <div key={sIdx}>
                        <h4 className="font-body text-sm md:text-base uppercase tracking-[0.2em] text-gray-600 mb-3 pb-2 border-b border-ink/10 flex items-center gap-2.5">
                          <span
                            className="inline-block w-3 h-3 shrink-0"
                            style={{ backgroundColor: SECTION_PALETTE[sIdx % SECTION_PALETTE.length] }}
                            aria-hidden="true"
                          />
                          {lang === 'VN' ? section.labelVI : section.labelEN}
                        </h4>
                        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 font-title">
                          {section.items.map((item, idx) => (
                            <li key={idx} className="border-b border-ink/10 pb-2">
                              <div className="flex items-baseline justify-between gap-4">
                                <span className="text-[15px] md:text-base font-medium">
                                  {lang === 'VN' ? (item.nameVI || item.nameEN) : item.nameEN}
                                </span>
                                {item.price && (
                                  <span className="text-ink tabular-nums font-medium shrink-0">
                                    {item.price}k
                                  </span>
                                )}
                              </div>
                              {(item.descEN || item.descVI) && (
                                <div className="text-gray-600 text-sm mt-1">
                                  {lang === 'VN' ? (item.descVI || item.descEN) : item.descEN}
                                </div>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="h-6"/>
    </section>
  );
}
