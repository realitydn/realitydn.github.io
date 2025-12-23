import React from 'react';

export default function Hero({ t }) {
  return (
    <section className="section max-w-7xl mx-auto px-4 py-16 md:py-24 grid grid-cols-12 gap-6 items-center">
      {/* Text content */}
      <div className="col-span-12 md:col-span-6 lg:col-span-5">
        <div className="card-static p-8 md:p-10">
          <h1 className="font-title text-2xl md:text-3xl xl:text-4xl leading-[1.1] tracking-[0.08em] text-ink">
            {t.use('heroTitle')}
          </h1>
          <p className="mt-6 text-gray-700 font-body text-lg leading-relaxed">
            {t.use('heroSub')}
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <a 
              href="#events" 
              className="btn-primary px-6 py-4 font-title text-sm tracking-[0.15em] inline-block"
            >
              See Events
            </a>
            <a 
              href="#menus" 
              className="btn-secondary px-6 py-4 font-title text-sm tracking-[0.15em] inline-block"
            >
              View Menus
            </a>
          </div>
        </div>
      </div>
      
      {/* Hero image in floating card */}
      <div className="col-span-12 md:col-span-6 lg:col-span-7">
        <div 
          className="card-static overflow-hidden aspect-[4/5] md:aspect-[5/4] lg:aspect-[4/3]"
          style={{ boxShadow: '0 16px 48px rgba(0,0,0,0.2)' }}
        >
          <div className="w-full h-full bg-gradient-to-br from-stone-400 to-stone-600">
            <img 
              src="/images/hero.jpg" 
              alt="REALITY interior" 
              className="w-full h-full object-cover"
              loading="eager"
              onError={(e) => e.target.style.display = 'none'}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
