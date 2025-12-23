import React, { useState, useEffect, useCallback } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { MENU } from '../data/menu';
import { URLS } from '../data/translations';

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
    <section id="menus" className="section bg-cream text-ink">
      <div className="max-w-7xl mx-auto px-4 pt-12">
        <div className="font-body text-xs md:text-sm tracking-[0.2em] text-gray-600 mb-2 uppercase">
          {t.use('drinkEyebrow')}
        </div>
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <h2 className="font-title text-3xl md:text-5xl leading-[1] tracking-[0.1em]">
            {t.use('menus')}
          </h2>
          <a 
            href={URLS.PDF} 
            target="_blank" 
            rel="noreferrer" 
            className="font-body underline underline-offset-4 flex items-center gap-2 hover:opacity-70 transition-opacity"
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
                className={`text-left px-4 py-3 font-title text-xs tracking-[0.15em] transition-all ${
                  i === index 
                    ? 'bg-ink text-cream' 
                    : 'bg-transparent text-ink border border-ink/20 hover:border-ink/50'
                }`}
                style={{ 
                  borderRadius: 0,
                  boxShadow: i === index ? '0 4px 12px rgba(0,0,0,0.15)' : 'none'
                }}
              >
                {lang === 'VI' ? c.labelVI : c.labelEN}
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
                  className={`snap-start shrink-0 px-4 py-3 font-title text-xs tracking-[0.15em] transition-all ${
                    i === index 
                      ? 'bg-ink text-cream' 
                      : 'bg-transparent text-ink border border-ink/20'
                  }`}
                  style={{ borderRadius: 0 }}
                >
                  {lang === 'VI' ? c.labelVI : c.labelEN}
                </button>
              ))}
            </div>
          </div>
          
          {/* Menu carousel */}
          <div 
            className="overflow-hidden card-static" 
            ref={viewportRef}
            style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}
          >
            <div className="flex">
              {MENU.map((cat) => (
                <section key={cat.key} className="basis-full shrink-0 p-6 md:p-10">
                  <header className="mb-4 md:mb-6">
                    <h3 className="font-title text-2xl md:text-3xl leading-tight tracking-[0.1em]">
                      {lang === 'VI' ? cat.labelVI : cat.labelEN}
                    </h3>
                  </header>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 font-body">
                    {cat.items.map((item, idx) => (
                      <li key={idx} className="border-b border-ink/10 pb-2">
                        <div className="flex items-baseline justify-between gap-4">
                          <span className="text-[15px] md:text-base font-medium">
                            {lang === 'VI' ? (item.nameVI || item.nameEN) : item.nameEN}
                          </span>
                          {item.price && (
                            <span className="text-ink tabular-nums font-medium">
                              {item.price}k
                            </span>
                          )}
                        </div>
                        {(item.descEN || item.descVI) && (
                          <div className="text-gray-600 text-sm mt-1">
                            {lang === 'VI' ? (item.descVI || item.descEN) : item.descEN}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
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
