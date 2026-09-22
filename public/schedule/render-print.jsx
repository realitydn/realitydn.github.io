/* ============================================================
   REALITY SCHEDULE STUDIO — render · the A4 print sheet
   Landscape A4, always day-on-white, two balanced columns (or the
   4-wide grid), with the wifi + QR footer.
   ============================================================ */
import { themeTokens, ThemeCtx, channelById, lookOf, GEOM, gridColsFor, gridGapFor } from './render-config.jsx';
import { resolveFit, bestSplit, useOverflowBump, useFitReport, applyBump } from './render-fit.jsx';
import { LegendBlock, LegendLine, SupportNote, MetaLine, QRBlock } from './render-footer.jsx';
import { HeaderFull, GridArea, ColumnStack } from './render-parts.jsx';
import { GROT as R_GROT, rangeDates as r_rangeDates, usedLegend as r_usedLegend, Wordmark as RWordmark } from './schedule-data.jsx';

function PrintFooter({ doc, legend, denIdx, T }){
  const wifi = doc.footer.wifi==='off' ? false : true;
  if(denIdx===0) return (
    <div style={{ flex:'none', borderTop:'3px solid '+T.fg, marginTop:8, paddingTop:12,
      display:'flex', alignItems:'center', gap:24 }}>
      <LegendBlock legend={legend} font={11.5} />
      {wifi && <div style={{ fontFamily:R_GROT, fontWeight:500, fontSize:11.5, lineHeight:1.55, color:T.fg }}>
        wifi: {doc.footer.wifiName}<br/>pass: {doc.footer.wifiPass}</div>}
      {doc.footer.supportNote && <SupportNote text={doc.footer.supportText} font={10.5} maxW={290} />}
      <div style={{ flex:1 }} />
      <div style={{ textAlign:'right' }}>
        <RWordmark tight height={22} color={T.fg} />
        <div style={{ fontFamily:R_GROT, fontWeight:500, fontSize:11, color:T.dim, marginTop:6, lineHeight:1.45 }}>
          realitydn.com<br/>86 Mai Thúc Lân, Đà Nẵng</div>
      </div>
      <QRBlock size={86} />
    </div>
  );
  if(denIdx===1) return (
    <div style={{ flex:'none', borderTop:'3px solid '+T.fg, marginTop:6, paddingTop:9,
      display:'flex', alignItems:'center', gap:20 }}>
      <LegendLine legend={legend} font={10.5} />
      {wifi && <div style={{ fontFamily:R_GROT, fontWeight:500, fontSize:10.5, color:T.fg, whiteSpace:'nowrap' }}>
        wifi: {doc.footer.wifiName} · pass: {doc.footer.wifiPass}</div>}
      <div style={{ flex:1 }} />
      <MetaLine font={10.5} />
      <QRBlock size={56} />
    </div>
  );
  return (
    <div style={{ flex:'none', borderTop:'3px solid '+T.fg, marginTop:6, paddingTop:9,
      display:'flex', alignItems:'center', gap:18 }}>
      <LegendLine legend={legend} font={10} />
      <div style={{ flex:1 }} />
      <MetaLine font={10} />
    </div>
  );
}

function PrintSheet({ doc, onFitReport }){
  const ch = channelById('print'), g = GEOM.print;
  const look = lookOf(doc);
  const T = themeTokens('day', true);              /* print is always day-on-white */
  const dates = r_rangeDates(doc.range);
  const contentW = ch.w - g.pad*2;
  const legend = r_usedLegend(doc, dates, 'print');
  const boxH = ch.h - g.pad*2 - g.headH;
  let est, cols = null, colW = 0;
  if(look==='grid'){
    const n = gridColsFor('print');
    est = resolveFit(doc, dates, 'print', 'grid',
      { boxH, hasFooter:true, legend, gridCols:n, cellW:(contentW-(n-1)*gridGapFor('print'))/n });
  } else {
    colW = (contentW - g.colGap)/2;
    est = resolveFit(doc, dates, 'print', look,
      { boxH, hasFooter:true, legend, twoCol:true, colW });
    cols = est.colsUsed || bestSplit(doc, 'print', look, g.font.length-1, colW);
  }
  const sig = JSON.stringify([doc, 'print']);
  const floorL = g.font.length-1;
  const maxL = floorL-est.level, maxD = 2-est.denIdx;
  const [contentRef, bump, poke] = useOverflowBump(sig, maxL, maxD);
  const { level, denIdx } = applyBump(est, bump, floorL);
  useFitReport(contentRef, bump, maxL, maxD, level, denIdx, onFitReport);
  return (
    <ThemeCtx.Provider value={T}>
      <div style={{ width:ch.w, height:ch.h, background:T.bg, color:T.fg, position:'relative', overflow:'hidden',
        boxSizing:'border-box', padding:g.pad, display:'flex', flexDirection:'column' }}>
        <div style={{ height:g.headH, flex:'none' }}>
          <HeaderFull doc={doc} channel="print" />
        </div>
        <div ref={contentRef} style={{ flex:1, minHeight:0, display:'flex', flexDirection:'column', paddingTop:10, overflow:'hidden' }}>
          {look==='grid'
            ? <GridArea doc={doc} dates={dates} channel="print" level={level}
                gap={g.dayGap*0.8} legend={legend} onOverflow={poke}
                withMeta={dates.length%2===1} />
            : <div style={{ flex:1, minHeight:0, display:'flex', gap:g.colGap }}>
                <ColumnStack doc={doc} segs={cols[0]} channelId="print" look={look} level={level} colW={colW} g={g} />
                {cols[1].length ? <ColumnStack doc={doc} segs={cols[1]} channelId="print" look={look} level={level} colW={colW} g={g} /> : null}
              </div>}
        </div>
        <PrintFooter doc={doc} legend={legend} denIdx={look==='grid' && dates.length%2===1 ? Math.max(denIdx,1) : denIdx} T={T} />
      </div>
    </ThemeCtx.Provider>
  );
}

export { PrintSheet };
