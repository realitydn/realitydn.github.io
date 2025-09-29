import React from 'react';

export default function Hero({ t }) {
  return (
    <section className="max-w-7xl mx-auto px-4 py-16 md:py-20 grid grid-cols-12 gap-6">
      <div className="col-span-12 md:col-span-7">
        <h1 className="font-space text-5xl md:text-7xl xl:text-8xl leading-[0.9] tracking-tight text-ink">
          {t.use('heroTitle')}
        </h1>
        <p className="mt-6 max-w-2xl text-gray-700 font-mont text-lg">
          {t.use('heroSub')}
        </p>
        <div className="mt-8 flex flex-wrap gap-4">
          <div className="relative">
            <a 
              href="#events" 
              className="relative z-10 inline-block px-6 py-4 bg-ink text-cream font-mont rounded-lg transition-all hover:bg-ink/90 active:scale-95 focus:ring-2 focus:ring-offset-2 focus:ring-ink focus:outline-none"
            >
              See Events
            </a>
            <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-pink-500 via-orange-500 to-cyan-500 opacity-40 blur-xl animate-pulse"></div>
          </div>
          <a 
            href="#menus" 
            className="px-6 py-4 bg-gray-200 text-ink font-mont rounded-lg hover:bg-gray-300 transition-all active:scale-95 focus:ring-2 focus:ring-offset-2 focus:ring-ink focus:outline-none"
          >
            View Menus
          </a>
        </div>
      </div>
      <div className="col-span-12 md:col-span-5">
        <div className="rounded-3xl overflow-hidden aspect-[4/5] shadow-2xl">
          <div className="w-full h-full bg-gradient-to-br from-red-600 to-amber-600">
            {/* Hero image - will show gradient if image doesn't load */}
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