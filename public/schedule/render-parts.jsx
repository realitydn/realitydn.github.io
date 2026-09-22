/* ============================================================
   REALITY SCHEDULE STUDIO — render · shared pieces
   The shared layout kernel, part 3: the masthead (full + slim), the
   event row, and the day blocks every weekly output is built from —
   Ledger rail, Stack banner, Grid cell — plus the stacks that lay
   them out (carousel day stack, grid area, print/WA column).
   ============================================================ */
import { ThemeCtx, GEOM, gridColsFor, gridGapFor, stackBannerH, gridStripH, gridPad, dayGapFor,
  SHORT_STEP, entryFont, entryLead } from './render-config.jsx';
import { codesText, timeColW, timeTail, fontFor } from './render-fit.jsx';
import { LegendBlock, QRBlock } from './render-footer.jsx';
import { DAY_ABBR as R_DA, dayInfo as r_dayInfo, dShort as r_dshort, eventsOn as r_eventsOn,
  GROT as R_GROT, INK_MARK as R_INK_MARK, MONT as R_MONT, rangeLabel as r_rangeLabel,
  timeLabel as r_timeLabel, dWeekday as r_wd, SchInkMark as RInkMark, Wordmark as RWordmark } from './schedule-data.jsx';

/* masthead — wordmark · label · date stamp · 3px rule */
function HeaderFull({ doc, channel }){
  const T = React.useContext(ThemeCtx);
  const s = GEOM[channel].fs || 1;
  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <div>
          <RWordmark tight height={54*s} color={T.fg} />
          <div style={{ display:'flex', alignItems:'center', gap:14*s, marginTop:12*s }}>
            <div style={{ fontFamily:R_MONT, fontWeight:700, fontSize:15*s, letterSpacing:'.3em',
              color:T.dim, textTransform:'uppercase' }}>ĐÀ NẴNG</div>
            {/* The placed mark: the canon 7×2 short strip on the masthead, bare
                (no ground — the sheet is already stock). ONE placed mark per
                surface, so this is the only one; the square riding the footer
                QR is that footer's own fixture, not a second mark.

                Module is a fraction of the WORDMARK's height, not of the ĐÀ
                NẴNG line beside it. Pinned to the eyebrow's cap height it came
                out 49×14 on a 1080px feed card — technically present, visually
                a speck. The wordmark is what sets the masthead's scale, so the
                mark is measured against that: ~26px tall on the feed, ~30 on a
                story, and it actually reads.

                The FULL 9×2 strip, not the 7×2 short one. The short form is
                the fallback for a squeeze; the masthead has ~950px of row and
                the strip needs 117 of it, so there is no squeeze to fall back
                from. Short stays where space genuinely runs out. */}
            <RInkMark form="strip-h" mode="full"
              m={Math.max(R_INK_MARK.floors.strip, Math.round(54*s*0.24))} />
          </div>
        </div>
        <div style={{ textAlign:'right', display:'flex', flexDirection:'column', alignItems:'flex-end', gap:12*s }}>
          <div style={{ fontFamily:R_MONT, fontWeight:700, fontSize:27*s, letterSpacing:'.14em',
            textTransform:'uppercase', color:T.fg, lineHeight:1 }}>{doc.header.title}</div>
          <div style={{ background:T.paper, border:('2px solid '+T.fg), boxShadow:T.shadowSm,
            padding:(7*s)+'px '+(16*s)+'px', fontFamily:R_MONT, fontWeight:700, fontSize:22*s,
            color:T.fg, fontVariantNumeric:'tabular-nums', letterSpacing:'.04em' }}>{r_rangeLabel(doc.range)}</div>
        </div>
      </div>
      <div style={{ borderTop:'3px solid '+T.fg, marginTop:18*s }} />
    </div>
  );
}
function HeaderSlim({ doc, channel }){
  const T = React.useContext(ThemeCtx);
  const s = GEOM[channel].fs || 1;
  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <RWordmark tight height={34*s} color={T.fg} />
        <div style={{ background:T.paper, border:('2px solid '+T.fg), boxShadow:T.shadowSm,
          padding:(5*s)+'px '+(13*s)+'px', fontFamily:R_MONT, fontWeight:700, fontSize:19*s,
          color:T.fg, fontVariantNumeric:'tabular-nums', letterSpacing:'.04em' }}>{r_rangeLabel(doc.range)}</div>
      </div>
      <div style={{ borderTop:'1.5px solid '+T.fg, marginTop:13*s }} />
    </div>
  );
}

function EventRow({ ev, font, lead, timeW, useShort, dayColor, dayText }){
  const T = React.useContext(ThemeCtx);
  const title = (useShort && ev.titleShort) ? ev.titleShort : ev.title;
  const codes = codesText(ev);
  if(ev.emphasis==='banner'){
    return (
      <div style={{ background:dayColor, color:dayText, boxShadow:T.shadowSm,
        padding:(font*0.34)+'px '+(font*0.6)+'px', margin:(font*0.27)+'px 0',
        display:'flex', alignItems:'baseline', gap:font*0.55 }}>
        <span style={{ fontFamily:R_GROT, fontWeight:500, fontSize:font*0.84, opacity:.85, flex:'none',
          fontVariantNumeric:'tabular-nums' }}>{r_timeLabel(ev)}</span>
        <span style={{ fontFamily:R_MONT, fontWeight:700, fontSize:font*1.0, textTransform:'uppercase',
          letterSpacing:'.045em', lineHeight:1.18 }}>{title}</span>
        {codes ? <span style={{ fontFamily:R_GROT, fontWeight:500, fontSize:font*0.78, opacity:.8, flex:'none' }}>{codes}</span> : null}
      </div>
    );
  }
  const bold = ev.emphasis==='bold';
  const tail = timeTail(ev);
  return (
    <div style={{ display:'flex', alignItems:'baseline', lineHeight:lead }}>
      <span style={{ fontFamily:R_GROT, fontWeight:500, fontSize:font*0.92, width:timeW, flex:'none',
        color:T.fgStrong, fontVariantNumeric:'tabular-nums' }}>{ev.start}</span>
      <span style={{ minWidth:0 }}>
        {tail ? <span style={{ fontFamily:R_GROT, fontWeight:500, fontSize:font*0.92,
          color:T.fgStrong, fontVariantNumeric:'tabular-nums' }}>{tail + ' '}</span> : null}
        <span style={bold
          ? { fontFamily:R_MONT, fontWeight:700, fontSize:font*0.94, textTransform:'uppercase', letterSpacing:'.03em',
              borderBottom:'5px solid '+dayColor, paddingBottom:font*0.1 }
          : { fontFamily:R_GROT, fontWeight:600, fontSize:font }}>{title}</span>
        {codes ? <span style={{ fontFamily:R_GROT, fontWeight:500, fontSize:font*0.88, color:T.dim,
          whiteSpace:'nowrap' }}>{' ' + codes}</span> : null}
      </span>
    </div>
  );
}
function ClosedNote({ note, font, center }){
  const T = React.useContext(ThemeCtx);
  return (
    <div style={{ fontFamily:R_MONT, fontWeight:600, fontSize:font*0.94, letterSpacing:'.06em',
      textTransform:'uppercase', color:T.fg, display:'flex', alignItems:'center', height:'100%',
      justifyContent:center?'center':'flex-start' }}>{note||'CLOSED'}</div>
  );
}

/* ---- LEDGER day group: color block rail + rows ----
   evs/cut are set only when a two-column break falls inside this day: 'head' is
   the part before the break, 'tail' the part carried into the next column. */
function LedgerDay({ doc, date, channel, font, lead, useShort, evs:evsOverride, cut }){
  const T = React.useContext(ThemeCtx);
  const g = GEOM[channel];
  const w = r_wd(date);
  const info = r_dayInfo(doc, date);
  const evs = evsOverride || r_eventsOn(doc, date, channel);
  const tW = timeColW(font);
  const size = g.block;
  return (
    <div style={{ display:'flex', gap:g.blockGap }}>
      <div style={{ width:size, height:size, flex:'none', background:T.dc[w], color:T.dt[w],
        boxShadow:size>100?T.shadow:T.shadowSm, display:'flex', flexDirection:'column',
        justifyContent:'center', paddingLeft:size*0.13, boxSizing:'border-box' }}>
        <div style={{ fontFamily:R_MONT, fontWeight:700, fontSize:size*0.30, lineHeight:1, letterSpacing:'.01em' }}>{R_DA[w]}</div>
        <div style={{ fontFamily:R_MONT, fontWeight:500, fontSize:size*0.18, marginTop:size*0.07 }}>{r_dshort(date)}</div>
        {cut && <div style={{ fontFamily:R_MONT, fontWeight:700, fontSize:size*0.125, letterSpacing:'.1em',
          marginTop:size*0.055, opacity:.82 }}>{cut==='head' ? 'CONT. →' : 'CONT.'}</div>}
      </div>
      <div style={{ flex:1, minWidth:0, display:'flex', flexDirection:'column',
        justifyContent: evs.length<3 && info.status!=='closed' ? 'center' : 'flex-start' }}>
        {info.status==='closed'
          ? <ClosedNote note={info.note} font={font} />
          : evs.map(ev=><EventRow key={ev.id} ev={ev} font={font} lead={lead} timeW={tW} useShort={useShort}
              dayColor={T.dc[w]} dayText={T.dt[w]} />)}
      </div>
    </div>
  );
}

/* ---- STACK day group: full-width color banner + rows beneath ---- */
function StackDay({ doc, date, channel, font, lead, useShort, evs:evsOverride, cut }){
  const T = React.useContext(ThemeCtx);
  const g = GEOM[channel];
  const w = r_wd(date);
  const info = r_dayInfo(doc, date);
  const evs = evsOverride || r_eventsOn(doc, date, channel);
  const tW = timeColW(font);
  const bH = stackBannerH(font);
  return (
    <div>
      <div style={{ height:bH, background:T.dc[w], color:T.dt[w], boxShadow:T.shadowSm,
        display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'0 '+(font*0.7)+'px', boxSizing:'border-box' }}>
        <span style={{ fontFamily:R_MONT, fontWeight:700, fontSize:font*1.18, letterSpacing:'.02em' }}>
          {R_DA[w]}<span style={{ fontWeight:500, marginLeft:font*0.55, fontSize:font*0.92 }}>{r_dshort(date)}</span>
        </span>
        {info.status==='closed'
          ? <span style={{ fontFamily:R_MONT, fontWeight:600, fontSize:font*0.78, letterSpacing:'.08em' }}>{info.note||'CLOSED'}</span>
          : <span style={{ fontFamily:R_MONT, fontWeight:600, fontSize:font*0.72, letterSpacing:'.14em', opacity:.8 }}>
              {cut ? (cut==='head' ? 'CONT. →' : 'CONT.')
                   : (evs.length ? String(evs.length).padStart(2,'0')+' EVENTS' : '')}</span>}
      </div>
      {info.status!=='closed' &&
        <div style={{ paddingTop:font*0.32, paddingLeft:font*0.2 }}>
          {evs.map(ev=><EventRow key={ev.id} ev={ev} font={font} lead={lead} timeW={tW} useShort={useShort}
            dayColor={T.dc[w]} dayText={T.dt[w]} />)}
        </div>}
    </div>
  );
}

/* ---- GRID: bordered day cells, color strip header ---- */
function GridCell({ doc, date, channel, level, onOverflow }){
  const T = React.useContext(ThemeCtx);
  const g = GEOM[channel];
  const w = r_wd(date);
  const info = r_dayInfo(doc, date);
  const evs = r_eventsOn(doc, date, channel);
  const font = fontFor(channel,'grid',level), lead = g.lead[level];
  const tW = timeColW(font);
  const strip = gridStripH(font), pad = gridPad(font);
  const rowsRef = React.useRef(null);
  const [clipped, setClipped] = React.useState(false);
  React.useLayoutEffect(()=>{
    const el = rowsRef.current; if(!el) return;
    const check = ()=>{
      const c = el.scrollHeight > el.clientHeight + 3;
      setClipped(prev=>prev===c?prev:c);
      if(c && onOverflow) onOverflow();
    };
    const raf = requestAnimationFrame(check);
    if(document.fonts && document.fonts.ready) document.fonts.ready.then(()=>requestAnimationFrame(check));
    return ()=>cancelAnimationFrame(raf);
  });
  return (
    <div style={{ border:'2px solid '+T.fg, height:'100%', boxSizing:'border-box', boxShadow:T.shadowSm,
      display:'flex', flexDirection:'column', position:'relative',
      background:T.id==='night'?T.paper:'transparent' }}>
      <div style={{ height:strip, flex:'none', background:T.dc[w], color:T.dt[w], display:'flex',
        alignItems:'center', justifyContent:'space-between', padding:'0 '+(font*0.55)+'px' }}>
        <span style={{ fontFamily:R_MONT, fontWeight:700, fontSize:font*0.95 }}>{R_DA[w]}</span>
        <span style={{ fontFamily:R_MONT, fontWeight:500, fontSize:font*0.78 }}>{r_dshort(date)}</span>
      </div>
      <div ref={rowsRef} style={{ flex:1, minHeight:0, padding:pad, overflow:'hidden' }}>
        {info.status==='closed'
          ? <ClosedNote note={info.note} font={font} center />
          : evs.map(ev=><EventRow key={ev.id} ev={ev} font={font} lead={lead} timeW={tW} useShort={level>=3}
              dayColor={T.dc[w]} dayText={T.dt[w]} />)}
      </div>
      {clipped &&
        <div data-clip="1" style={{ position:'absolute', right:-2, bottom:-2, background:T.fg, color:T.bg,
          fontFamily:R_MONT, fontWeight:700, fontSize:font*0.62, letterSpacing:'.08em',
          padding:(font*0.18)+'px '+(font*0.45)+'px' }}>+ MORE</div>}
    </div>
  );
}
function GridMetaCell({ doc, channel, level, legend }){
  const T = React.useContext(ThemeCtx);
  const font = fontFor(channel,'grid',level);
  return (
    <div style={{ border:'2px solid '+T.fg, height:'100%', boxSizing:'border-box', boxShadow:T.shadowSm,
      padding:gridPad(font)*1.4, display:'flex', flexDirection:'column', justifyContent:'space-between',
      overflow:'hidden', background:T.id==='night'?T.paper:'transparent' }}>
      <LegendBlock legend={legend} font={font*0.82} stacked />
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', gap:10 }}>
        <div>
          <RWordmark tight height={font*1.15} color={T.fg} />
          <div style={{ fontFamily:R_GROT, fontWeight:500, fontSize:font*0.7, color:T.dim, marginTop:6, lineHeight:1.4 }}>
            realitydn.com<br/>86 Mai Thúc Lân, Đà Nẵng</div>
        </div>
        <QRBlock size={font*3.4} align="flex-end" />
      </div>
    </div>
  );
}

function DayStack({ doc, dates, channel, look, sizing, stepDown, gap, evenly }){
  const Day = look==='stack' ? StackDay : LedgerDay;
  return (
    <div style={{ flex:1, minHeight:0, display:'flex', flexDirection:'column',
      justifyContent: evenly===false ? 'flex-start' : 'space-evenly',
      rowGap: look==='stack' ? gap*0.78 : gap }}>
      {dates.map(date=>{
        const want = (sizing && sizing.byDate[date]) ? sizing.byDate[date].step : 0;
        const step = Math.max(0, want - (stepDown||0));
        return <Day key={date} doc={doc} date={date} channel={channel}
          font={entryFont(channel, look, step)} lead={entryLead(channel, step)} useShort={step<=SHORT_STEP} />;
      })}
    </div>
  );
}
function GridArea({ doc, dates, channel, level, legend, withMeta, onOverflow }){
  const cols = gridColsFor(channel);
  const gap = gridGapFor(channel);
  const slots = dates.slice();
  const rowsN = Math.ceil((slots.length + (withMeta?1:0))/cols);
  return (
    <div style={{ flex:1, minHeight:0, display:'grid',
      gridTemplateColumns:'repeat('+cols+',minmax(0,1fr))',
      gridTemplateRows:'repeat('+rowsN+',minmax(0,1fr))', gap }}>
      {slots.map(d=><GridCell key={d} doc={doc} date={d} channel={channel} level={level} onOverflow={onOverflow} />)}
      {withMeta && <GridMetaCell doc={doc} channel={channel} level={level} legend={legend} />}
    </div>
  );
}

function ColumnStack({ doc, segs, channelId, look, level, colW, g }){
  const font = fontFor(channelId, look, level), lead = g.lead[level], useShort = level>=3;
  return (
    <div style={{ width:colW, display:'flex', flexDirection:'column', rowGap:dayGapFor(g, look), minWidth:0 }}>
      {segs.map((s,i)=> look==='stack'
        ? <StackDay key={s.date+'-'+i} doc={doc} date={s.date} evs={s.evs} cut={s.cut} channel={channelId} font={font} lead={lead} useShort={useShort} />
        : <LedgerDay key={s.date+'-'+i} doc={doc} date={s.date} evs={s.evs} cut={s.cut} channel={channelId} font={font} lead={lead} useShort={useShort} />)}
    </div>
  );
}

export { HeaderFull, HeaderSlim, DayStack, GridArea, ColumnStack };
