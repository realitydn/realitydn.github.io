/* ============================================================
   REALITY SCHEDULE STUDIO — render · the WhatsApp card
   1:1, two balanced columns (or the grid), the tightest channel.
   ============================================================ */
import { themeTokens, ThemeCtx, channelById, lookOf, GEOM, gridGapFor } from './render-config.jsx';
import { resolveFit, bestSplit, useOverflowBump, useFitReport, applyBump } from './render-fit.jsx';
import { LegendLine, MetaLine, QRBlock } from './render-footer.jsx';
import { HeaderFull, GridArea, ColumnStack } from './render-parts.jsx';
import { rangeDates as r_rangeDates, usedLegend as r_usedLegend } from './schedule-data.jsx';

function WACard({ doc, onFitReport }){
  const ch = channelById('wa'), g = GEOM.wa;
  const look = lookOf(doc);
  const T = themeTokens(doc.style.theme);
  const dates = r_rangeDates(doc.range);
  const contentW = ch.w - g.pad*2;
  const legend = r_usedLegend(doc, dates, 'wa');
  const boxH = ch.h - g.pad*2 - g.headH;
  let est, cols = null, colW = 0;
  if(look==='grid'){
    est = resolveFit(doc, dates, 'wa', 'grid',
      { boxH, hasFooter:false, legend, gridCols:2, cellW:(contentW-gridGapFor('wa'))/2, fixedFootH:0 });
  } else {
    colW = (contentW - g.colGap)/2;
    est = resolveFit(doc, dates, 'wa', look,
      { boxH, hasFooter:true, legend, twoCol:true, colW });
    cols = est.colsUsed || bestSplit(doc, 'wa', look, g.font.length-1, colW);
  }
  const sig = JSON.stringify([doc, 'wa']);
  const floorL = g.font.length-1;
  const maxL = floorL-est.level, maxD = look==='grid'?0:2-est.denIdx;
  const [contentRef, bump, poke] = useOverflowBump(sig, maxL, maxD);
  const { level, denIdx } = applyBump(est, bump, floorL);
  useFitReport(contentRef, bump, maxL, maxD, level, denIdx, onFitReport);
  return (
    <ThemeCtx.Provider value={T}>
      <div style={{ width:ch.w, height:ch.h, background:T.bg, color:T.fg, position:'relative', overflow:'hidden',
        boxSizing:'border-box', padding:g.pad, display:'flex', flexDirection:'column' }}>
        <div style={{ height:g.headH, flex:'none' }}>
          <HeaderFull doc={doc} channel="wa" />
        </div>
        <div ref={contentRef} style={{ flex:1, minHeight:0, display:'flex', flexDirection:'column', paddingTop:12, overflow:'hidden' }}>
          {look==='grid'
            ? <GridArea doc={doc} dates={dates} channel="wa" level={level}
                gap={g.dayGap*0.8} legend={legend} onOverflow={poke}
                withMeta={dates.length%2===1} />
            : <div style={{ flex:1, minHeight:0, display:'flex', gap:g.colGap }}>
                <ColumnStack doc={doc} segs={cols[0]} channelId="wa" look={look} level={level} colW={colW} g={g} />
                {cols[1].length ? <ColumnStack doc={doc} segs={cols[1]} channelId="wa" look={look} level={level} colW={colW} g={g} /> : null}
              </div>}
        </div>
        {look!=='grid' &&
          /* The 1:1 card is the tightest channel we have, so its code is the
             smallest one that still scans reliably at arm's length, and it
             drops off entirely at the compact density rather than squeezing
             the two columns above it. */
          (denIdx===0
            ? <div style={{ flex:'none', borderTop:'3px solid '+T.fg, paddingTop:13,
                display:'flex', justifyContent:'space-between', alignItems:'center', gap:20 }}>
                <LegendLine legend={legend} font={15} />
                <MetaLine font={14.5} />
                <QRBlock size={62} />
              </div>
            : <div style={{ flex:'none', borderTop:'3px solid '+T.fg, paddingTop:10,
                display:'flex', justifyContent:'space-between', alignItems:'center', gap:16 }}>
                <LegendLine legend={legend} font={12.5} />
                <MetaLine font={12.5} />
              </div>)}
      </div>
    </ThemeCtx.Provider>
  );
}

export { WACard };
