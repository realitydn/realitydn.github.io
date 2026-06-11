import React from 'react';

export default function Hero({ t }) {
  // "coffee / cocktails / community" → Thin lines + an 800 slam on the last
  // segment, per the Year 2 display pattern (One system, DAY AND AFTER DARK).
  const title = t.use('heroTitle');
  const segments = typeof title === 'string' ? title.split(' / ') : [title];
  const lead = segments.slice(0, -1);
  const slam = segments[segments.length - 1];

  return (
    <section className="section max-w-7xl mx-auto px-4 py-16 md:py-24 grid grid-cols-12 gap-6 items-center">
      {/* Text content */}
      <div className="col-span-12 md:col-span-6 lg:col-span-5">
        <div className="card-static p-8 md:p-10">
          <p className="eyebrow mb-4" style={{ color: 'var(--accent)' }}>
            86 Mai Thúc Lân · Đà Nẵng
          </p>
          <h1 className="text-ink" style={{ fontSize: 'clamp(32px, 4.5vw, 54px)' }}>
            {lead.length > 0 && (
              <span className="font-display block">
                {lead.join(' / ')}{' /'}
              </span>
            )}
            <span className="font-display-bold block">{slam}</span>
          </h1>
          <p className="mt-6 text-gray-700 font-body text-lg leading-relaxed">
            {t.use('heroSub')}
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <a
              href="#events"
              className="btn-primary px-6 py-4 text-sm inline-block"
            >
              {t.use('nav.events')}
            </a>
            <a
              href="#menus"
              className="btn-secondary px-6 py-4 text-sm inline-block"
            >
              {t.use('nav.menus')}
            </a>
          </div>
        </div>
      </div>

      {/* Hero image in floating card */}
      <div className="col-span-12 md:col-span-6 lg:col-span-7">
        <div
          className="card-static card-lg overflow-hidden aspect-[4/5] md:aspect-[5/4] lg:aspect-[4/3]"
        >
          <div className="w-full h-full" style={{ background: 'var(--surface-2)' }}>
            <img
              src="/images/hero.jpg"
              alt="Inside REALITY — coffee shop, bar and community space in Đà Nẵng"
              className="w-full h-full object-cover"
              /* LCP candidate: eager + high fetch priority so it loads before
                 below-the-fold content. */
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
