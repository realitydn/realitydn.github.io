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
              {t.use('nav.events')}
            </a>
            <a
              href="#menus"
              className="btn-secondary px-6 py-4 font-title text-sm tracking-[0.15em] inline-block"
            >
              {t.use('nav.menus')}
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
              alt="Inside REALITY — coffee shop, bar and community space in Đà Nẵng"
              className="w-full h-full object-cover"
              /* LCP candidate: eager + high fetch priority so it loads before
                 below-the-fold content. Matches a hero <Preload> from the
                 server side once Cloudflare is handling delivery. */
              loading="eager"
              fetchpriority="high"
              decoding="async"
              /* Dimensions are placeholders — the aspect-ratio container
                 controls the final size. Providing any width/height tells
                 the browser to reserve the box and suppresses CLS warnings. */
              width="1200"
              height="900"
              onError={(e) => e.target.style.display = 'none'}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
