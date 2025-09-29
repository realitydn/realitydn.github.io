import React from 'react';
import { Icons } from './Icons';

export default function InfoSection({ t }) {
  const iconMap = {
    people: Icons.people,
    laptop: Icons.laptop,
    smoke: Icons.smoke,
    buy: Icons.buy,
    lightbulb: Icons.lightbulb,
    rules: Icons.rules
  };

  return (
    <section id="info" className="max-w-7xl mx-auto px-4 py-16">
      <div className="mb-8">
        <h2 className="font-space text-3xl md:text-5xl leading-[1] tracking-tight uppercase text-ink">
          {t.use('infoTitle')}
        </h2>
      </div>
      <div className="grid grid-cols-12 gap-6">
        {t.use('infoItems').map((item, i) => (
          <div key={i} className="col-span-12 md:col-span-6">
            <div className="rounded-3xl border border-ink/15 bg-cream p-6 transition-all hover:shadow-lg hover:border-ink/25 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-ink">
              <div className="flex items-start gap-3">
                <span className="shrink-0 h-10 w-10 rounded-xl bg-ink text-cream grid place-items-center">
                  {iconMap[item.icon]("#FDFBF7")}
                </span>
                <div>
                  <h3 className="font-space text-xl md:text-2xl font-bold leading-tight">
                    {item.q}
                  </h3>
                  <p className="mt-2 text-gray-700 font-mont">
                    {item.a}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}