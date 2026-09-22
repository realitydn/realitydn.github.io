/* ============================================================
   REALITY SCHEDULE STUDIO — render · IG / FB feed and Stories
   One slide of a weekly carousel. Feed (4:5) and Stories (9:16) are
   the same frame over different geometry and safe areas — the
   channel id picks which.
   ============================================================ */
import { themeTokens, ThemeCtx, channelById, lookOf, GEOM, gridColsFor, gridGapFor } from './render-config.jsx';
import { resolveFit, computeStackSizing, useOverflowBump, useFitReport, applyBump } from './render-fit.jsx';
import { SupportNote, MetaLine, ArrowChip, CarouselFooter } from './render-footer.jsx';
import { HeaderFull, HeaderSlim, DayStack, GridArea } from './render-parts.jsx';
import { partDates as r_partDates, rangeDates as r_rangeDates, usedLegend as r_usedLegend } from './schedule-data.jsx';

function CarouselPart({ doc, channelId, partIndex, onFitReport }){
  const ch = channelById(channelId);
  const g = GEOM[channelId];
  const look = lookOf(doc);
  const T = themeTokens(doc.style.theme, ch.printish);
  const parts = r_partDates(doc);
  const dates = parts[partIndex] || [];
  const isFirst = partIndex===0, isFinal = partIndex===parts.length-1;
  const safeT = ch.safeTop||0, safeB = ch.safeBottom||0;
  const contentW = ch.w - g.pad*2;
  const legend = r_usedLegend(doc, r_rangeDates(doc.range), channelId);
  const headH = isFirst ? g.headFullH : g.headSlimH;
  const boxH = ch.h - safeT - safeB - g.pad*2 - headH;
  const sig = JSON.stringify([doc, channelId, partIndex]);
  /* slide chrome shared by both layout paths; body + footer differ per look */
  const shell = (ref, body, footer)=>(
    <ThemeCtx.Provider value={T}>
      <div style={{ width:ch.w, height:ch.h, background:T.bg, color:T.fg, position:'relative', overflow:'hidden',
        boxSizing:'border-box', paddingTop:safeT+g.pad, paddingBottom:safeB+g.pad,
        paddingLeft:g.pad, paddingRight:g.pad, display:'flex', flexDirection:'column' }}>
        <div style={{ height:headH, flex:'none' }}>
          {isFirst ? <HeaderFull doc={doc} channel={channelId} /> : <HeaderSlim doc={doc} channel={channelId} />}
        </div>
        <div ref={ref} style={{ flex:1, minHeight:0, display:'flex', flexDirection:'column', overflow:'hidden' }}>
          {body}
        </div>
        {footer}
        {!ch.noArrows && !isFinal &&
          <div style={{ position:'absolute', right:g.pad, bottom:safeB+g.pad*0.65 }}><ArrowChip dir="fwd" size={84} /></div>}
        {!ch.noArrows && isFinal && parts.length>1 &&
          <div style={{ position:'absolute', left:g.pad, bottom:safeB+g.pad*0.65 }}><ArrowChip dir="back" size={84} /></div>}
      </div>
    </ThemeCtx.Provider>
  );

  if(look==='grid'){
    const est = resolveFit(doc, dates, channelId, 'grid',
      { boxH, hasFooter:isFinal, legend, gridCols:gridColsFor(channelId),
        cellW:(contentW-(gridColsFor(channelId)-1)*gridGapFor(channelId))/gridColsFor(channelId) });
    const floorL = g.font.length-1;
    const maxL = floorL-est.level, maxD = isFinal?2-est.denIdx:0;
    const [contentRef, bump, poke] = useOverflowBump(sig, maxL, maxD);
    const { level, denIdx } = applyBump(est, bump, floorL);
    useFitReport(contentRef, bump, maxL, maxD, level, denIdx, onFitReport);
    const odd = isFinal && dates.length%2===1;
    return shell(contentRef,
      <GridArea doc={doc} dates={dates} channel={channelId} level={level}
        gap={g.dayGap} legend={legend} onOverflow={poke} withMeta={odd} />,
      isFinal && !odd
        ? <CarouselFooter doc={doc} channel={channelId} legend={legend} denIdx={denIdx} />
        : (odd
          ? <div style={{ flex:'none', borderTop:'3px solid '+T.fg, marginTop:g.footPad*0.4, paddingTop:g.footPad*0.6,
              display:'flex', justifyContent:'center' }}>
              {doc.footer.supportNote
                ? <SupportNote plain text={doc.footer.supportText} font={14*(g.fs||1)} maxW={contentW*0.9} />
                : <MetaLine font={15*(g.fs||1)} />}
            </div>
          : null));
  }

  /* stacked (ledger / stack) — per-day sizing; measured backstop trims uniformly */
  const sizing = computeStackSizing(doc, channelId);
  const wantSteps = dates.map(d=> sizing.byDate[d] ? sizing.byDate[d].step : 0);
  const maxL = wantSteps.reduce((a,b)=>Math.max(a,b), 0);
  const boxOver = dates.some(d=> sizing.byDate[d] && sizing.byDate[d].over);
  const maxD = isFinal ? 2 : 0;
  const [contentRef, bump, poke] = useOverflowBump(sig, maxL, maxD);
  const stepDown = Math.min(maxL, bump.l), denIdx = Math.min(2, bump.d);
  const minStep = wantSteps.length ? Math.min.apply(null, wantSteps) : 0;
  const tight = boxOver || (minStep - stepDown) <= 0;
  useFitReport(contentRef, bump, maxL, maxD, tight?3:0, denIdx, onFitReport);
  return shell(contentRef,
    <DayStack doc={doc} dates={dates} channel={channelId} look={look}
      sizing={sizing} stepDown={stepDown} gap={g.dayGap} />,
    isFinal ? <CarouselFooter doc={doc} channel={channelId} legend={legend} denIdx={denIdx} /> : null);
}

export { CarouselPart };
