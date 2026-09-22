/* ============================================================
   REALITY SCHEDULE STUDIO — render engine
   Looks (Ledger / Stack / Grid) · Day & Night themes · channel
   frames · auto-fit: estimate first, then MEASURE the real DOM
   and bump density until it fits (type ladder → footer ladder).
   Contract: never overflow silently, never go below the floor.

   This file is the dispatcher and the one import the app reads.
   The engine is a shared layout kernel —
     render-config.jsx     stylings, channels, looks, geometry
     render-fit.jsx        measure / fit, sizing, capacity, splits
     render-parts.jsx      masthead, event row, day blocks
     render-footer.jsx     legend, notes, QR block, carousel footer
   — and one module per output over it:
     render-carousel.jsx   IG/FB feed + Stories
     render-wa.jsx         WhatsApp card
     render-print.jsx      A4 print sheet
     render-daily-kit.jsx  + render-daily.jsx       daily card
     render-cover-kit.jsx  + render-cover.jsx       FB cover
   ============================================================ */
import { CarouselPart } from './render-carousel.jsx';
import { DAILY_VARIANTS, channelById } from './render-config.jsx';
import { CoverCard } from './render-cover.jsx';
import { DailyCard } from './render-daily.jsx';
import { PrintSheet } from './render-print.jsx';
import { WACard } from './render-wa.jsx';
import { partDates as r_partDates } from './schedule-data.jsx';

/* ---- dispatcher: one part of one channel at native size ---- */
function PartCanvas({ doc, channelId, partIndex, dailyDate, dailyVariant, onFitReport }){
  if(channelId==='print') return <PrintSheet doc={doc} onFitReport={onFitReport} />;
  if(channelId==='wa') return <WACard doc={doc} onFitReport={onFitReport} />;
  if(channelId==='daily') return dailyVariant==='cover'
    ? <CoverCard doc={doc} date={dailyDate} onFitReport={onFitReport} />
    : <DailyCard doc={doc} date={dailyDate} variant={dailyVariant} />;
  return <CarouselPart doc={doc} channelId={channelId} partIndex={partIndex||0} onFitReport={onFitReport} />;
}
function partCount(doc, channelId){
  const ch = channelById(channelId);
  if(!ch || ch.kind!=='carousel') return 1;
  return r_partDates(doc).length;
}
function partSize(channelId, dailyVariant){
  if(channelId==='daily') return DAILY_VARIANTS[dailyVariant||'story'];
  const ch = channelById(channelId);
  return { w:ch.w, h:ch.h };
}

export { PartCanvas, partCount, partSize };
export { CHANNELS, DAILY_VARIANTS, channelById, GEOM, LOOKS_LIST, PALETTES } from './render-config.jsx';
export { computeCapacity, bestSplit, resolveFit, computeStackSizing } from './render-fit.jsx';
export { ArrowChip } from './render-footer.jsx';
export { DAILY_CARDS, dailyCardOf, dailySizing } from './render-daily-kit.jsx';
export { COVER_STYLES, COVER_QR, COVER_FOOT_H, coverInfo } from './render-cover-kit.jsx';
