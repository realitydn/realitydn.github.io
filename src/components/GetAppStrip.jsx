import React from 'react';
import { STR } from '../data/translations';

// GetAppStrip — the "get the reality app" links directly under the events
// widget. One card, one CTA; UTM-tagged so we can see which surface converts.

export default function GetAppStrip({ lang = 'EN' }) {
  const S = STR[lang].getApp;
  return (
    <div className="mt-6 card-static p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <p className="font-title font-bold text-sm uppercase tracking-wide text-ink">{S.title}</p>
        <p className="text-sm text-gray-600 font-body mt-1">{S.blurb}</p>
      </div>
      <a
        href="https://app.realitydn.com/?utm_source=website&utm_medium=get_app_strip"
        target="_blank"
        rel="noreferrer"
        className="btn-primary px-6 py-3 text-sm shrink-0 text-center"
      >
        {S.cta}
      </a>
    </div>
  );
}
