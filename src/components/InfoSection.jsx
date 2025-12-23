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
    <section id="info" className="section max-w-7xl mx-auto px-4 py-16">
      <div className="mb-8">
        <h2 className="font-title text-3xl md:text-5xl leading-[1] tracking-[0.1em] text-ink">
          {t.use('infoTitle')}
        </h2>
      </div>
      <div className="grid grid-cols-12 gap-6">
        {t.use('infoItems').map((item, i) => (
          <div key={i} className="col-span-12 md:col-span-6">
            <div 
              className="card p-6 h-full"
              style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}
            >
              <div className="flex items-start gap-4">
                <span 
                  className="shrink-0 h-12 w-12 bg-ink text-cream grid place-items-center"
                  style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
                >
                  {iconMap[item.icon]("#FFFBF2")}
                </span>
                <div>
                  <h3 className="font-title text-lg md:text-xl leading-tight tracking-[0.05em]">
                    {item.q}
                  </h3>
                  <p className="mt-2 text-gray-700 font-body">
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
