/* ============================================================
   REALITY SCHEDULE STUDIO — render engine
   Looks (Ledger / Stack / Grid) · Day & Night themes · channel
   frames · auto-fit: estimate first, then MEASURE the real DOM
   and bump density until it fits (type ladder → footer ladder).
   Contract: never overflow silently, never go below the floor.
   ============================================================ */
const { INK:R_INK, CREAM:R_CREAM, WHITE:R_WHITE, MONT:R_MONT, ALT:R_ALT, GROT:R_GROT,
        DAY_COLORS:R_DC, DAY_TEXT:R_DT, DAY_ABBR:R_DA, DAY_FULL:R_DF,
        LOCATIONS:R_LOCS, FLAGS:R_FLAGS, rangeDates:r_rangeDates, rangeLabel:r_rangeLabel,
        dWeekday:r_wd, dShort:r_dshort, eventsOn:r_eventsOn, dayInfo:r_dayInfo,
        timeLabel:r_timeLabel, usedLegend:r_usedLegend, partDates:r_partDates,
        Wordmark:RWordmark, SchQR:RQR } = window;

/* ---- themes — Year 2 tokens, Day (ink on cream) / Night (cream on ink) ---- */
function themeTokens(theme, printish){
  if(theme==='night' && !printish){
    return {
      id:'night', bg:'#0a0703', paper:'#171109', fg:'#fffbf1',
      fgStrong:'rgba(255,251,241,.88)', dim:'rgba(255,251,241,.6)', hairline:'#3a2c1c',
      shadow:'0 8px 2px rgba(255,251,241,.18)', shadowSm:'0 5px 1px rgba(255,251,241,.15)',
      dc:Object.assign({}, R_DC, { 3:'#9a4faa' }), dt:R_DT,   /* Wednesday purple lifts after dark */
    };
  }
  return {
    id:'day', bg: printish ? R_WHITE : R_CREAM, paper:R_CREAM, fg:R_INK,
    fgStrong:'rgba(13,9,5,.85)', dim:'rgba(13,9,5,.58)', hairline:'rgba(13,9,5,.16)',
    shadow:'0 8px 2px rgba(13,9,5,.16)', shadowSm:'0 5px 1px rgba(13,9,5,.14)',
    dc:R_DC, dt:R_DT,
  };
}
const ThemeCtx = React.createContext(themeTokens('day'));
const RED = '#ed2224';

/* ---- channel registry ---- */
const CHANNELS = [
  { id:'feed',    label:'IG / FB',  sub:'4:5 FEED',  w:1080, h:1350, kind:'carousel', px:2 },
  { id:'stories', label:'Stories',  sub:'9:16',      w:1080, h:1920, kind:'carousel', px:2, safeTop:140, safeBottom:160, noArrows:true },
  { id:'wa',      label:'WhatsApp', sub:'1:1 CARD',  w:1080, h:1080, kind:'single',   px:2 },
  { id:'print',   label:'Print',    sub:'A4 PDF',    w:1123, h:794,  kind:'print',    px:3, printish:true },
  { id:'daily',   label:'Daily',    sub:'PER DAY',   w:1080, h:1920, kind:'daily',    px:2 },
];
const DAILY_VARIANTS = { story:{ w:1080, h:1920 }, feed:{ w:1080, h:1350 },
  /* FB Page cover photo — landscape single-day. 851×315 is FB's recommended upload;
     mobile crops the sides, so bleed marks the outer band to keep text out of. */
  cover:{ w:851, h:315, bleed:106 } };
function channelById(id){ return CHANNELS.filter(c=>c.id===id)[0]; }

/* ---- looks ---- */
const LOOKS_LIST = [
  { id:'ledger', l:'Ledger', hint:'day rail · time table' },
  { id:'stack',  l:'Stack',  hint:'full-width day banners' },
  { id:'grid',   l:'Grid',   hint:'modular day cells' },
];
function lookOf(doc){ const k = doc.style && doc.style.look; return (k==='stack'||k==='grid') ? k : 'ledger'; }

/* ---- geometry per channel (base = Ledger; Stack shares; Grid scales down) ---- */
const GEOM = {
  feed:    { pad:66, font:[30,30,28,26], lead:[1.5,1.36,1.34,1.3], block:128, blockGap:32, dayGap:24,
             headFullH:196, headSlimH:120, footPad:26, fs:1 },
  stories: { pad:64, font:[37,37,34,31], lead:[1.55,1.42,1.38,1.32], block:158, blockGap:36, dayGap:34,
             headFullH:236, headSlimH:142, footPad:30, fs:1.18 },
  wa:      { pad:56, font:[23,23,21.5,20,19], lead:[1.42,1.32,1.3,1.26,1.22], block:86, blockGap:22, dayGap:24,
             headH:118, colGap:44, fs:0.78 },
  print:   { pad:46, font:[14.5,14.5,13.5,12.5], lead:[1.42,1.32,1.3,1.26], block:78, blockGap:18, dayGap:20,
             headH:86, colGap:34, fs:0.5, gridCols:4 },   /* landscape page → 4×2 cells */
};
const gridColsFor = ch => GEOM[ch].gridCols || 2;
const gridGapFor = ch => (ch==='print'||ch==='wa') ? GEOM[ch].dayGap*0.8 : GEOM[ch].dayGap;
const GRID_F = 0.82;            /* grid cells run smaller type */
const STACK_F = 0.97;           /* banners cost height; type gives a hair back */
const lookF = look => look==='grid' ? GRID_F : look==='stack' ? STACK_F : 1;
const stackBannerH = f => f*2.05;
const gridStripH  = f => f*1.75;
const gridPad     = f => f*0.55;
const dayGapFor = (g, look) => look==='stack' ? g.dayGap*0.78 : g.dayGap;

/* ---- per-day text sizing (weekly carousels: Stories + Feed, stacked looks) ----
   A wider, taller ladder than the auto-fit type levels so entries can read BIG on
   light days. step 0 = smallest, last = largest. Every day defaults to one uniform
   "comfort" step — the largest that still sits easy in the most-packed day — and the
   editor can nudge the whole week or any single day. The picker is capped to what
   fits, so a bump can never overflow a slide. Grid look + WhatsApp/Print are untouched
   and keep the classic auto-fit ladder. */
const ENTRY_LADDER = {
  stories: { font:[27,30,33,37,41,46,51], lead:[1.30,1.34,1.38,1.42,1.46,1.50,1.54] },
  feed:    { font:[23,26,29,32,36,40,45], lead:[1.28,1.31,1.34,1.37,1.41,1.45,1.50] },
};
const SHORT_STEP = 1;          /* steps ≤ this fall back to short titles when present */
const SIZE_COMFORT = 0.93;     /* the auto default leaves ~7% air → reads "comfortable" */
const SIZE_BRIM    = 0.985;    /* manual bumps may fill a slide right to the brim */
const sizedChannel = ch => ch==='feed' || ch==='stories';
function ladderLen(ch){ return (ENTRY_LADDER[ch] || ENTRY_LADDER.stories).font.length; }
function clampStep(ch, s){ return Math.max(0, Math.min(ladderLen(ch)-1, s|0)); }
function entryFont(ch, look, step){ const L = ENTRY_LADDER[ch] || ENTRY_LADDER.stories; return L.font[clampStep(ch,step)]*lookF(look); }
function entryLead(ch, step){ const L = ENTRY_LADDER[ch] || ENTRY_LADDER.stories; return L.lead[clampStep(ch,step)]; }

/* ---- text width estimates (px) — calibrated against live Space Grotesk ---- */
function estW(text, font, factor){ return String(text||'').length * font * (factor||0.53); }
function codesText(ev){
  let t = (ev.locations||[]).join('/');
  if(ev.flags.prereg) t += (t?' ':'') + '*';
  if(ev.flags.fee) t += (t?' ':'') + '$';
  return t;
}
function timeColW(font){ return Math.ceil(5 * font * 0.68) + Math.round(font*0.5); }
function timeTail(ev){
  if(ev.end==='late') return '- ALL NIGHT';
  if(ev.end) return '- ' + ev.end;
  return null;
}

/* ---- core day measurement (estimate) — font/lead/useShort explicit so both the
   auto-fit type ladder and the per-day size ladder measure through one path ---- */
function measureDayAt(doc, date, channel, look, font, lead, useShort, rowAreaW){
  const g = GEOM[channel];
  const rowH = font*lead;
  const info = r_dayInfo(doc, date);
  const evs = r_eventsOn(doc, date, channel);
  const tW = timeColW(font);
  let rows = 0;
  if(info.status==='closed'){ rows = rowH*1.25; }
  else evs.forEach(ev=>{
    if(ev.emphasis==='banner'){ rows += rowH*1.75 + font*0.55; return; }
    const title = (useShort && ev.titleShort) ? ev.titleShort : ev.title;
    const wf = ev.emphasis==='bold' ? 0.68 : 0.55;
    const tail = timeTail(ev);
    const titleW = rowAreaW - tW
      - (tail ? estW(tail, font*0.92, 0.64)+font*0.4 : 0)
      - (codesText(ev) ? estW(codesText(ev), font, 0.64)+font*0.6 : 0);
    /* 4% margin on the wrap boundary — borderline rows usually fit one line,
       and the rendered DOM is measured anyway (bumps if we guessed wrong) */
    const lines = estW(title, font, wf) > titleW*1.04 ? 2 : 1;
    rows += rowH*lines + (ev.emphasis==='bold' ? font*0.46 : 0);
  });
  if(look==='ledger') return Math.max(rows, g.block);
  if(look==='stack')  return stackBannerH(font) + font*0.32 + rows;
  return gridStripH(font) + gridPad(font)*2 + rows;   /* grid: cell content height */
}
function measureDay(doc, date, channel, look, level, rowAreaW){
  const g = GEOM[channel];
  return measureDayAt(doc, date, channel, look, g.font[level]*lookF(look), g.lead[level], level>=3, rowAreaW);
}
function rowAreaWidth(channel, look, contentW){
  const g = GEOM[channel];
  if(look==='ledger') return contentW - g.block - g.blockGap;
  if(look==='stack')  return contentW - g.block*0.15;
  return contentW - gridPad(g.font[0]*GRID_F)*2 - 4;  /* grid cell inner */
}

/* ---- footer ladder: 0 full · 1 compact · 2 minimal ---- */
const DENSITIES = ['full','compact','minimal'];
function densityIndex(doc){
  const d = doc.footer.density;
  const i = DENSITIES.indexOf(d);
  return d==='auto' || i<0 ? null : i;   /* null = auto */
}
function footerEstimate(doc, channel, legend, denIdx){
  const g = GEOM[channel];
  const s = channel==='stories' ? 1.18 : 1;
  const hasLegend = legend.locations.length || legend.flags.length;
  const support = doc.footer.supportNote;
  /* lean optimistic — the rendered DOM is measured and bumps if this is short */
  if(channel==='wa') return 18 + (denIdx===0 ? 44 : 36);   /* single-row footer */
  let h = g.footPad || 20;
  if(denIdx===0){
    if(hasLegend) h += Math.max(legend.locations.length, legend.flags.length||1)*28*s + 14;
    if(support) h += 118*s;
    h += 52*s;
  } else if(denIdx===1){
    if(hasLegend) h += 28*s;
    if(support) h += 50*s;
    h += 38*s;
  } else {
    h += (hasLegend?24:0)*s + 28*s;
  }
  return h;
}

/* ---- surface fit: ladder levels then footer densities ---- */
function fitStackedDates(doc, dates, channel, look, level, contentW){
  const g = GEOM[channel];
  const raw = rowAreaWidth(channel, look, contentW);
  const gap = dayGapFor(g, look);
  let total = 0;
  dates.forEach((d,i)=>{ total += measureDay(doc, d, channel, look, level, raw) + (i<dates.length-1 ? gap : 0); });
  return total;
}
function fitGridDates(doc, dates, channel, level, cellW, cellH){
  const raw = rowAreaWidth(channel, 'grid', cellW);
  let ok = true, worst = 0;
  dates.forEach(d=>{ const h = measureDay(doc, d, channel, 'grid', level, raw); if(h>cellH) ok=false; if(h>worst) worst=h; });
  return { ok, worst };
}
/* resolve {level, denIdx, fits} for one carousel part or a whole 2-col surface */
function resolveFit(doc, dates, channel, look, geomBox){
  const g = GEOM[channel];
  const denForced = densityIndex(doc);
  const denList = geomBox.hasFooter ? (denForced!=null ? [denForced] : [0,1,2]) : [denForced!=null?denForced:0];
  for(const den of denList){
    const footH = geomBox.hasFooter ? footerEstimate(doc, channel, geomBox.legend, den) : (geomBox.fixedFootH||0);
    const availH = geomBox.boxH - footH;
    for(let L=0; L<g.font.length; L++){
      if(look==='grid'){
        const rowsN = Math.ceil(dates.length/geomBox.gridCols);
        const cellH = (availH - (rowsN-1)*gridGapFor(channel)) / rowsN;
        const r = fitGridDates(doc, dates, channel, L, geomBox.cellW, cellH);
        if(r.ok) return { level:L, denIdx:den, fits:true, availH, cellH };
      } else if(geomBox.colsList){
        for(const cols of geomBox.colsList){
          const colOK = cols.every(col=>!col.length || fitStackedDates(doc, col, channel, look, L, geomBox.colW) <= availH);
          if(colOK) return { level:L, denIdx:den, fits:true, availH, colsUsed:cols };
        }
      } else {
        if(fitStackedDates(doc, dates, channel, look, L, geomBox.boxW) <= availH)
          return { level:L, denIdx:den, fits:true, availH };
      }
    }
  }
  return { level:g.font.length-1, denIdx:denList[denList.length-1], fits:false };
}

/* ---- per-day size resolution (stacked carousels) ---------------------------- */
/* geometry of each carousel slide: height left for days after header + footer */
function partBoxes(doc, channelId){
  const ch = channelById(channelId), g = GEOM[channelId];
  const contentW = ch.w - g.pad*2;
  const legend = r_usedLegend(doc, r_rangeDates(doc.range), channelId);
  const parts = r_partDates(doc);
  return parts.map((dates, pi)=>{
    const isFinal = pi===parts.length-1;
    const headH = pi===0 ? g.headFullH : g.headSlimH;
    const boxH = ch.h - (ch.safeTop||0) - (ch.safeBottom||0) - g.pad*2 - headH;
    const footH = isFinal ? footerEstimate(doc, channelId, legend, 0) : 0;   /* reserve a full footer */
    return { dates, isFinal, contentW, availH: boxH - footH };
  });
}
function dayStepHeight(doc, date, channel, look, step, rowAreaW){
  return measureDayAt(doc, date, channel, look, entryFont(channel,look,step), entryLead(channel,step), step<=SHORT_STEP, rowAreaW);
}
function stackHeight(doc, box, channel, look, steps){
  const g = GEOM[channel], gap = dayGapFor(g, look);
  const raw = rowAreaWidth(channel, look, box.contentW);
  let total = 0;
  box.dates.forEach((d,i)=>{ total += dayStepHeight(doc, d, channel, look, steps[i], raw) + (i<box.dates.length-1 ? gap : 0); });
  return total;
}
/* greedy fit: start every day at its wanted step, then trim the tallest until the
   slide fits — always terminates, and never overflows above the floor */
function resolveBoxSteps(doc, box, channel, look, wantFn){
  const steps = box.dates.map(d=>clampStep(channel, wantFn(d)));
  const limit = box.availH * SIZE_BRIM;
  for(let guard=0; guard<box.dates.length*ladderLen(channel)+4; guard++){
    if(stackHeight(doc, box, channel, look, steps) <= limit) break;
    let mi=-1, mv=-1;
    steps.forEach((s,i)=>{ if(s>mv){ mv=s; mi=i; } });
    if(mv<=0) break;                       /* all at floor and still over → genuine overflow */
    steps[mi] = mv-1;
  }
  const out = {}; box.dates.forEach((d,i)=>out[d]=steps[i]); return out;
}
function uniformFits(doc, box, channel, look, step, margin){
  return stackHeight(doc, box, channel, look, box.dates.map(()=>step)) <= box.availH*margin;
}
/* largest uniform step where every slide fits at the given margin */
function uniformStep(doc, boxes, channel, look, margin){
  for(let s=ladderLen(channel)-1; s>=0; s--){
    if(boxes.every(box=>uniformFits(doc, box, channel, look, s, margin))) return s;
  }
  return 0;
}
/* editor view: resolved step + min/max per day, plus the auto base for this channel */
function computeStackSizing(doc, channelId){
  if(!sizedChannel(channelId) || lookOf(doc)==='grid') return { active:false, byDate:{} };
  const look = lookOf(doc);
  const sz = (doc.sizing && doc.sizing[channelId]) || { base:'auto', perDay:{} };
  const perDay = sz.perDay || {};
  const boxes = partBoxes(doc, channelId);
  const autoBase = uniformStep(doc, boxes, channelId, look, SIZE_COMFORT);
  const uniformMax = uniformStep(doc, boxes, channelId, look, SIZE_BRIM);
  const baseStep = (sz.base==='auto' || sz.base==null) ? autoBase : clampStep(channelId, sz.base);
  const want = d => perDay[d]!=null ? clampStep(channelId, perDay[d]) : baseStep;
  const last = ladderLen(channelId)-1;
  const byDate = {};
  boxes.forEach(box=>{
    const steps = resolveBoxSteps(doc, box, channelId, look, want);
    const over = stackHeight(doc, box, channelId, look, box.dates.map(()=>0)) > box.availH;
    box.dates.forEach(d=>{
      /* per-day ceiling: lift only this day (others at their wanted step) until the
         greedy fit would start clawing it back */
      let max = steps[d];
      for(let t=steps[d]+1; t<=last; t++){
        const r = resolveBoxSteps(doc, box, channelId, look, x=> x===d ? t : want(x));
        if(r[d]===t) max=t; else break;
      }
      byDate[d] = { step:steps[d], min:0, max, auto:autoBase, isAuto: perDay[d]==null,
        over, px: Math.round(entryFont(channelId, look, steps[d])) };
    });
  });
  const hasOverrides = (sz.base!=='auto' && sz.base!=null) || Object.keys(perDay).length>0;
  return { active:true, byDate, base:(sz.base==null?'auto':sz.base), baseStep, autoBase, uniformMax,
    steps:ladderLen(channelId), hasOverrides, look };
}

/* ---- capacity summary for the editor ---- */
function computeCapacity(doc, channelId){
  const chId = channelId==='daily' ? 'feed' : channelId;
  const ch = channelById(chId) || CHANNELS[0];
  const look = lookOf(doc);
  const g = GEOM[ch.id];
  const legend = r_usedLegend(doc, r_rangeDates(doc.range), ch.id);
  const out = { parts:[], byDate:{} };
  /* stacked Stories / Feed run on the per-day size ladder, not the auto-fit levels */
  if(sizedChannel(channelId) && look!=='grid'){
    const sizing = computeStackSizing(doc, channelId);
    r_partDates(doc).forEach(dates=>{
      let over=false, tight=false;
      dates.forEach(d=>{
        const info = sizing.byDate[d] || { step:0, over:false };
        out.byDate[d] = info.over ? 'over' : (info.step===0 ? 'tight' : 'ok');
        if(info.over) over=true;
        if(info.step===0) tight=true;
      });
      out.parts.push({ dates, fits:!over, level: tight?3:0, denIdx:0 });
    });
    return out;
  }
  const mark = (dates, fit)=>{ dates.forEach(d=>{ out.byDate[d] = !fit.fits ? 'over' : (fit.level>=2 ? 'tight' : 'ok'); }); out.parts.push(Object.assign({dates}, fit)); };
  if(ch.kind==='carousel'){
    const parts = r_partDates(doc);
    parts.forEach((dates, pi)=>{
      const isFinal = pi===parts.length-1;
      const headH = pi===0 ? g.headFullH : g.headSlimH;
      const boxH = ch.h - (ch.safeTop||0) - (ch.safeBottom||0) - g.pad*2 - headH;
      const contentW = ch.w - g.pad*2;
      mark(dates, resolveFit(doc, dates, ch.id, look, look==='grid'
        ? { boxH, hasFooter:isFinal, legend, gridCols:2, cellW:(contentW-g.dayGap)/2, fixedFootH:0 }
        : { boxH, boxW:contentW, hasFooter:isFinal, legend, fixedFootH:0 }));
    });
  } else {
    const dates = r_rangeDates(doc.range);
    const contentW = ch.w - g.pad*2;
    const boxH = ch.h - g.pad*2 - g.headH;
    if(look==='grid'){
      const n = gridColsFor(ch.id);
      mark(dates, resolveFit(doc, dates, ch.id, 'grid',
        { boxH, hasFooter:ch.id==='print', legend, gridCols:n,
          cellW:(contentW-(n-1)*gridGapFor(ch.id))/n, fixedFootH: ch.id==='wa' ? 0 : undefined }));
    } else {
      const colW = (contentW - g.colGap)/2;
      mark(dates, resolveFit(doc, dates, ch.id, look,
        { boxH, hasFooter:true, legend, colsList:colVariants(doc, ch.id), colW }));
    }
  }
  return out;
}

/* two-column splits for print / WA: prefer the carousel split, fall back to a
   balanced split when the carousel's heavy side won't fit the column */
function balancedSplit(doc, channelId){
  const dates = r_rangeDates(doc.range);
  if(dates.length<=3) return [dates, []];
  /* pick the boundary that minimises the HEAVIER column (rows + per-day overhead) */
  const w = dates.map(d=>Math.max(1, r_eventsOn(doc, d, channelId).length) + 0.8);
  let best = 0, bestMax = Infinity;
  for(let i=0;i<dates.length-1;i++){
    const left = w.slice(0,i+1).reduce((a,b)=>a+b,0);
    const right = w.slice(i+1).reduce((a,b)=>a+b,0);
    const m = Math.max(left, right);
    if(m < bestMax){ bestMax = m; best = i; }
  }
  return [dates.slice(0,best+1), dates.slice(best+1)];
}
function twoColSplit(doc, channelId){
  const dates = r_rangeDates(doc.range);
  if(dates.length<=3) return [dates, []];
  let idx = -1;
  if(doc.splits.length){ idx = dates.indexOf(doc.splits[0]); }
  if(idx<0 || idx>=dates.length-1) return balancedSplit(doc, channelId);
  return [dates.slice(0,idx+1), dates.slice(idx+1)];
}
function colVariants(doc, channelId){
  const a = twoColSplit(doc, channelId);
  const b = balancedSplit(doc, channelId);
  return (a[0].length===b[0].length) ? [a] : [a, b];
}

/* ---- measured overflow bump: estimate missed → tighten live ---- */
function useOverflowBump(sig, maxL, maxD){
  const [bump, setBump] = React.useState({ l:0, d:0 });
  const ref = React.useRef(null);
  const poke = React.useCallback(()=>{
    setBump(b=>{
      if(b.l < maxL) return { l:b.l+1, d:b.d };
      if(b.d < maxD) return { l:b.l, d:b.d+1 };
      return b;
    });
  }, [maxL, maxD]);
  React.useEffect(()=>{ setBump({ l:0, d:0 }); }, [sig]);
  React.useLayoutEffect(()=>{
    let alive = true;
    function check(){
      if(!alive) return;
      const el = ref.current; if(!el) return;
      if(el.scrollHeight > el.clientHeight + 3) poke();
    }
    const raf = requestAnimationFrame(check);
    if(document.fonts && document.fonts.ready) document.fonts.ready.then(()=>{ requestAnimationFrame(check); });
    return ()=>{ alive=false; cancelAnimationFrame(raf); };
  });
  return [ref, bump, poke];
}
/* report the rendered truth up to the editor's capacity bar */
function useFitReport(ref, bump, maxL, maxD, level, denIdx, onFitReport){
  React.useLayoutEffect(()=>{
    if(!onFitReport) return;
    const raf = requestAnimationFrame(()=>{
      const el = ref.current; if(!el) return;
      const scrollOver = el.scrollHeight > el.clientHeight + 3;
      const cellClip = !!el.querySelector('[data-clip]');
      const exhausted = bump.l>=maxL && bump.d>=maxD;
      onFitReport({ over: (scrollOver || cellClip) && exhausted, level, denIdx });
    });
    return ()=>cancelAnimationFrame(raf);
  });
}
function applyBump(fit, bump, maxLevel){
  return {
    level: Math.min(maxLevel, fit.level + bump.l),
    denIdx: Math.min(2, fit.denIdx + bump.d),
  };
}

/* ============================================================
   SHARED PIECES
   ============================================================ */
function fontFor(channel, look, level){
  return GEOM[channel].font[level]*lookF(look);
}

/* masthead — wordmark · label · date stamp · 3px rule */
function HeaderFull({ doc, channel }){
  const T = React.useContext(ThemeCtx);
  const s = GEOM[channel].fs || 1;
  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <div>
          <RWordmark tight height={54*s} color={T.fg} />
          <div style={{ fontFamily:R_MONT, fontWeight:700, fontSize:15*s, letterSpacing:'.3em',
            color:T.dim, marginTop:12*s, textTransform:'uppercase' }}>ĐÀ NẴNG</div>
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

/* ---- LEDGER day group: color block rail + rows ---- */
function LedgerDay({ doc, date, channel, font, lead, useShort }){
  const T = React.useContext(ThemeCtx);
  const g = GEOM[channel];
  const w = r_wd(date);
  const info = r_dayInfo(doc, date);
  const evs = r_eventsOn(doc, date, channel);
  const tW = timeColW(font);
  const size = g.block;
  return (
    <div style={{ display:'flex', gap:g.blockGap }}>
      <div style={{ width:size, height:size, flex:'none', background:T.dc[w], color:T.dt[w],
        boxShadow:size>100?T.shadow:T.shadowSm, display:'flex', flexDirection:'column',
        justifyContent:'center', paddingLeft:size*0.13, boxSizing:'border-box' }}>
        <div style={{ fontFamily:R_MONT, fontWeight:700, fontSize:size*0.30, lineHeight:1, letterSpacing:'.01em' }}>{R_DA[w]}</div>
        <div style={{ fontFamily:R_MONT, fontWeight:500, fontSize:size*0.18, marginTop:size*0.07 }}>{r_dshort(date)}</div>
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
function StackDay({ doc, date, channel, font, lead, useShort }){
  const T = React.useContext(ThemeCtx);
  const g = GEOM[channel];
  const w = r_wd(date);
  const info = r_dayInfo(doc, date);
  const evs = r_eventsOn(doc, date, channel);
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
              {evs.length ? String(evs.length).padStart(2,'0')+' EVENTS' : ''}</span>}
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
            www.realitydn.com<br/>86 Mai Thúc Lân, Đà Nẵng</div>
        </div>
        <RQR size={font*3.4} dark={R_INK} light={R_CREAM} />
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

/* ---- footer atoms ---- */
function LegendBlock({ legend, font, stacked }){
  const T = React.useContext(ThemeCtx);
  if(!legend.locations.length && !legend.flags.length) return null;
  const item = (k, v, i)=>(
    <div key={i} style={{ fontFamily:R_GROT, fontSize:font, lineHeight:1.55, color:T.fg }}>
      <span style={{ fontWeight:600 }}>{k}</span>
      <span style={{ color:T.dim }}>{' : ' + v}</span>
    </div>
  );
  if(stacked) return (
    <div>{legend.locations.map((l,i)=>item(l.code, l.label, 'l'+i))}
      {legend.flags.map((f,i)=>item(f.glyph, f.label, 'f'+i))}</div>
  );
  return (
    <div style={{ display:'flex', gap:font*2.6 }}>
      <div>{legend.locations.map((l,i)=>item(l.code, l.label, i))}</div>
      <div>{legend.flags.map((f,i)=>item(f.glyph, f.label, i))}</div>
    </div>
  );
}
function LegendLine({ legend, font }){
  const T = React.useContext(ThemeCtx);
  if(!legend.locations.length && !legend.flags.length) return null;
  const bits = legend.locations.map(l=>l.code+' '+l.label)
    .concat(legend.flags.map(f=>f.glyph+' '+f.label.replace('Requires ','').replace('Has ','').replace(' Beyond Purchase','')));
  return (
    <div style={{ fontFamily:R_GROT, fontWeight:500, fontSize:font, color:T.dim, lineHeight:1.5 }}>
      {bits.join('  ·  ')}
    </div>
  );
}
function SupportNote({ text, font, maxW, plain }){
  const T = React.useContext(ThemeCtx);
  if(plain) return (
    <div style={{ fontFamily:R_GROT, fontWeight:500, fontSize:font, lineHeight:1.45, color:T.dim,
      maxWidth:maxW, textAlign:'center' }}>{text}</div>
  );
  return (
    <div style={{ border:'2.5px dashed '+RED, padding:font*0.85, maxWidth:maxW,
      fontFamily:R_GROT, fontWeight:500, fontSize:font, lineHeight:1.5, color:T.fg, textAlign:'center' }}>{text}</div>
  );
}
function MetaLine({ font }){
  const T = React.useContext(ThemeCtx);
  return (
    <div style={{ fontFamily:R_MONT, fontWeight:600, fontSize:font, letterSpacing:'.07em',
      textTransform:'uppercase', color:T.fg }}>
      www.realitydn.com<span style={{ fontWeight:500, opacity:.72 }}>{' · '}86 Mai Thúc Lân, Đà Nẵng</span>
    </div>
  );
}
function ArrowChip({ dir, size }){
  const T = React.useContext(ThemeCtx);
  const fwd = dir==='fwd';
  return (
    <div style={{ width:size, height:size*0.7, background:T.fg, boxShadow:T.shadowSm,
      display:'flex', alignItems:'center', justifyContent:'center', boxSizing:'border-box',
      opacity: fwd ? 1 : 0.92 }}>
      <svg viewBox="0 0 24 24" width={size*0.46} height={size*0.46} style={{ display:'block',
        transform:fwd?'none':'scaleX(-1)' }}>
        <path d="M4 12h15M13 6l6 6-6 6" fill="none" stroke={T.bg} strokeWidth="2.6" />
      </svg>
    </div>
  );
}
/* final-part footer at a given density */
function CarouselFooter({ doc, channel, legend, denIdx }){
  const T = React.useContext(ThemeCtx);
  const g = GEOM[channel];
  const s = g.fs || 1;
  if(denIdx===0) return (
    <div style={{ flex:'none', borderTop:'3px solid '+T.fg, marginTop:g.footPad*0.5, paddingTop:g.footPad,
      display:'flex', flexDirection:'column', gap:20*s, alignItems:'center' }}>
      <LegendBlock legend={legend} font={18*s} />
      {doc.footer.supportNote && <SupportNote text={doc.footer.supportText} font={18*s} maxW={(channelById(channel).w-g.pad*2)*0.8} />}
      <MetaLine font={17*s} />
    </div>
  );
  if(denIdx===1) return (
    <div style={{ flex:'none', borderTop:'3px solid '+T.fg, marginTop:g.footPad*0.4, paddingTop:g.footPad*0.7,
      display:'flex', flexDirection:'column', gap:12*s, alignItems:'center' }}>
      <LegendLine legend={legend} font={15*s} />
      {doc.footer.supportNote && <SupportNote plain text={doc.footer.supportText} font={14*s} maxW={(channelById(channel).w-g.pad*2)*0.9} />}
      <MetaLine font={16*s} />
    </div>
  );
  return (
    <div style={{ flex:'none', borderTop:'3px solid '+T.fg, marginTop:g.footPad*0.4, paddingTop:g.footPad*0.7,
      display:'flex', flexDirection:'column', gap:10*s, alignItems:'center' }}>
      <LegendLine legend={legend} font={14*s} />
      <MetaLine font={15*s} />
    </div>
  );
}

/* ============================================================
   CHANNEL FRAMES
   ============================================================ */
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

function ColumnStack({ doc, dates, channelId, look, level, colW, g }){
  const font = fontFor(channelId, look, level), lead = g.lead[level], useShort = level>=3;
  return (
    <div style={{ width:colW, display:'flex', flexDirection:'column', rowGap:dayGapFor(g, look), minWidth:0 }}>
      {dates.map(date=> look==='stack'
        ? <StackDay key={date} doc={doc} date={date} channel={channelId} font={font} lead={lead} useShort={useShort} />
        : <LedgerDay key={date} doc={doc} date={date} channel={channelId} font={font} lead={lead} useShort={useShort} />)}
    </div>
  );
}

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
          www.realitydn.com<br/>86 Mai Thúc Lân, Đà Nẵng</div>
      </div>
      <RQR size={86} dark={R_INK} light={R_CREAM} />
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
      <RQR size={56} dark={R_INK} light={R_CREAM} />
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
      { boxH, hasFooter:true, legend, colsList:colVariants(doc, 'print'), colW });
    cols = est.colsUsed || twoColSplit(doc, 'print');
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
                <ColumnStack doc={doc} dates={cols[0]} channelId="print" look={look} level={level} colW={colW} g={g} />
                {cols[1].length ? <ColumnStack doc={doc} dates={cols[1]} channelId="print" look={look} level={level} colW={colW} g={g} /> : null}
              </div>}
        </div>
        <PrintFooter doc={doc} legend={legend} denIdx={look==='grid' && dates.length%2===1 ? Math.max(denIdx,1) : denIdx} T={T} />
      </div>
    </ThemeCtx.Provider>
  );
}

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
      { boxH, hasFooter:true, legend, colsList:colVariants(doc, 'wa'), colW });
    cols = est.colsUsed || twoColSplit(doc, 'wa');
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
                <ColumnStack doc={doc} dates={cols[0]} channelId="wa" look={look} level={level} colW={colW} g={g} />
                {cols[1].length ? <ColumnStack doc={doc} dates={cols[1]} channelId="wa" look={look} level={level} colW={colW} g={g} /> : null}
              </div>}
        </div>
        {look!=='grid' &&
          (denIdx===0
            ? <div style={{ flex:'none', borderTop:'3px solid '+T.fg, paddingTop:13,
                display:'flex', justifyContent:'space-between', alignItems:'center', gap:20 }}>
                <LegendLine legend={legend} font={15} />
                <MetaLine font={14.5} />
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

/* ---- daily card ---- */
function DailyCard({ doc, date, variant }){
  const v = DAILY_VARIANTS[variant||'story'];
  const story = (variant||'story')==='story';
  const T = themeTokens(doc.style.theme);
  const w = r_wd(date);
  const info = r_dayInfo(doc, date);
  const evs = r_eventsOn(doc, date, 'daily');
  const pad = story ? 84 : 72;
  const rowsAvail = v.h - pad*2 - (story?420:330) - (story?230:196);
  const lvl = (()=>{ for(let L=0; L<3; L++){
      const font = story ? [34,31,29][L] : [29,27,25][L];
      const rh = font*1.6 + (story?20:14);
      if(evs.length*rh <= rowsAvail) return L;
    } return 2; })();
  const font = story ? [34,31,29][lvl] : [29,27,25][lvl];
  const rowGap = story ? 20 : 14;
  const locLabel = code=>{ const hit = R_LOCS.filter(l=>l.code===code)[0]; return hit ? hit.label : code; };
  const showChips = lvl===0 && evs.length<=7;
  return (
    <ThemeCtx.Provider value={T}>
      <div style={{ width:v.w, height:v.h, background:T.bg, color:T.fg, position:'relative', overflow:'hidden',
        boxSizing:'border-box', padding:pad, display:'flex', flexDirection:'column' }}>
        <div style={{ flex:'none', background:T.dc[w], color:T.dt[w], boxShadow:T.shadow,
          padding:(story?54:40)+'px '+(story?58:48)+'px', marginBottom:story?56:40 }}>
          <div style={{ fontFamily:R_MONT, fontWeight:700, fontSize:story?26:22, letterSpacing:'.22em',
            textTransform:'uppercase', opacity:.92 }}>TODAY AT REALITY</div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginTop:story?18:12 }}>
            <div style={{ fontFamily:R_MONT, fontWeight:700, fontSize:story?108:88, lineHeight:1,
              textTransform:'uppercase', letterSpacing:'.005em' }}>{R_DF[w]}</div>
            <div style={{ fontFamily:R_MONT, fontWeight:500, fontSize:story?54:44, lineHeight:1 }}>{r_dshort(date)}</div>
          </div>
        </div>
        <div style={{ flex:1, minHeight:0, display:'flex', flexDirection:'column',
          justifyContent: evs.length>5 ? 'flex-start' : 'space-evenly', gap:rowGap }}>
          {info.status==='closed'
            ? <div style={{ fontFamily:R_MONT, fontWeight:600, fontSize:story?44:36, letterSpacing:'.06em',
                textTransform:'uppercase', color:T.fg, textAlign:'center' }}>{info.note||'CLOSED'}</div>
            : evs.map((ev,i)=>{
              const banner = ev.emphasis==='banner', bold = ev.emphasis==='bold';
              const bannerBg = T.id==='night' ? T.dc[w] : R_INK;
              const bannerFg = T.id==='night' ? T.dt[w] : R_CREAM;
              return (
                <div key={ev.id} style={{ paddingBottom:rowGap*0.8,
                  borderBottom: i<evs.length-1 ? '1.5px solid '+T.hairline : 'none' }}>
                  <div style={banner
                    ? { background:bannerBg, color:bannerFg, boxShadow:T.shadowSm, padding:(font*0.4)+'px '+(font*0.55)+'px',
                        display:'flex', alignItems:'baseline', gap:font*0.55 }
                    : { display:'flex', alignItems:'baseline', gap:font*0.62 }}>
                    <span style={{ fontFamily:R_GROT, fontWeight:500, fontSize:font*0.9, flex:'none',
                      color:banner?bannerFg:T.fgStrong, fontVariantNumeric:'tabular-nums' }}>{r_timeLabel(ev)}</span>
                    <span style={(banner||bold)
                      ? { fontFamily:R_MONT, fontWeight:700, fontSize:font*0.96, textTransform:'uppercase',
                          letterSpacing:'.035em', lineHeight:1.22,
                          borderBottom: bold ? '6px solid '+T.dc[w] : 'none', paddingBottom: bold ? 6 : 0 }
                      : { fontFamily:R_GROT, fontWeight:600, fontSize:font, lineHeight:1.3 }}>{ev.title}</span>
                    {!showChips && codesText(ev)
                      ? <span style={{ fontFamily:R_GROT, fontWeight:500, fontSize:font*0.82,
                          color:banner?bannerFg:T.dim, whiteSpace:'nowrap', opacity:banner?0.8:1 }}>{codesText(ev)}</span> : null}
                  </div>
                  {showChips && (ev.locations.length || ev.flags.prereg || ev.flags.fee) ?
                    <div style={{ display:'flex', gap:12, marginTop:12, marginLeft:font*0.9*0.6*6.2, flexWrap:'wrap' }}>
                      {ev.locations.map(c=>(
                        <span key={c} style={{ border:'2px solid '+T.fg, padding:'4px 14px',
                          fontFamily:R_GROT, fontWeight:500, fontSize:font*0.56, color:T.fg }}>{locLabel(c)}</span>))}
                      {ev.flags.prereg && <span style={{ fontFamily:R_GROT, fontWeight:600, fontSize:font*0.6, color:T.fg }}>* pre-register</span>}
                      {ev.flags.fee && <span style={{ fontFamily:R_GROT, fontWeight:600, fontSize:font*0.6, color:T.fg }}>$ fee</span>}
                    </div> : null}
                </div>
              );
            })}
        </div>
        <div style={{ flex:'none', borderTop:'3px solid '+T.fg, marginTop:story?40:28, paddingTop:story?34:24,
          display:'flex', justifyContent:'space-between', alignItems:'center', gap:30 }}>
          <div>
            <RWordmark tight height={story?44:38} color={T.fg} />
            <div style={{ fontFamily:R_GROT, fontWeight:500, fontSize:story?22:19, color:T.dim,
              marginTop:12, lineHeight:1.5 }}>86 Mai Thúc Lân, Đà Nẵng · www.realitydn.com</div>
          </div>
          <RQR size={story?128:104} dark={R_INK} light={R_CREAM} />
        </div>
      </div>
    </ThemeCtx.Provider>
  );
}

/* ---- FB Page cover photo — landscape single-day board ----
   Full-bleed day-colour header strip (text kept inside the mobile-safe centre),
   then the day's events in one or two columns, auto-sized to the count. */
function CoverCard({ doc, date }){
  const v = DAILY_VARIANTS.cover;
  const T = themeTokens(doc.style.theme);
  const w = r_wd(date);
  const info = r_dayInfo(doc, date);
  const evs = r_eventsOn(doc, date, 'daily');
  const sidePad = v.bleed + 24;                 /* hold text inside the safe centre */
  const stripH = 78;
  const cols = evs.length>5 ? 2 : 1;
  const perCol = Math.max(1, Math.ceil(evs.length/cols));
  const rowsAvail = v.h - stripH - 18 - 26;
  const FONTS = [28,25,22,20,18,16.5,15];
  let font = FONTS[FONTS.length-1];
  for(const f of FONTS){ if(perCol*(f*1.5+8) <= rowsAvail){ font = f; break; } }
  const useShort = cols===2;
  const colItems = [];
  for(let c=0;c<cols;c++) colItems.push(evs.slice(c*perCol, (c+1)*perCol));
  return (
    <ThemeCtx.Provider value={T}>
      <div style={{ width:v.w, height:v.h, background:T.bg, color:T.fg, position:'relative', overflow:'hidden', boxSizing:'border-box' }}>
        <div style={{ position:'absolute', left:0, right:0, top:0, height:stripH, background:T.dc[w], color:T.dt[w],
          boxShadow:T.shadow, display:'flex', alignItems:'center', justifyContent:'space-between',
          paddingLeft:sidePad, paddingRight:sidePad, boxSizing:'border-box' }}>
          <div>
            <div style={{ fontFamily:R_MONT, fontWeight:700, fontSize:14, letterSpacing:'.22em',
              textTransform:'uppercase', opacity:.92 }}>TODAY AT REALITY</div>
            <div style={{ display:'flex', alignItems:'baseline', gap:16, marginTop:3 }}>
              <span style={{ fontFamily:R_MONT, fontWeight:700, fontSize:40, lineHeight:1,
                textTransform:'uppercase', letterSpacing:'.01em' }}>{R_DF[w]}</span>
              <span style={{ fontFamily:R_MONT, fontWeight:500, fontSize:26, lineHeight:1 }}>{r_dshort(date)}</span>
            </div>
          </div>
          <RWordmark tight height={26} color={T.dt[w]} />
        </div>
        <div style={{ position:'absolute', left:0, right:0, top:stripH, bottom:0,
          paddingLeft:sidePad, paddingRight:sidePad, paddingTop:18, paddingBottom:8, boxSizing:'border-box',
          display:'flex', flexDirection:'column' }}>
          <div style={{ flex:1, minHeight:0, display:'flex', gap:34 }}>
            {info.status==='closed'
              ? <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', textAlign:'center',
                  fontFamily:R_MONT, fontWeight:700, fontSize:38, letterSpacing:'.05em', textTransform:'uppercase', color:T.fg }}>{info.note||'CLOSED'}</div>
              : evs.length===0
                ? <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center',
                    fontFamily:R_MONT, fontWeight:600, fontSize:24, letterSpacing:'.08em', textTransform:'uppercase', color:T.dim }}>Open · come hang out</div>
                : colItems.map((items,ci)=>(
                  <div key={ci} style={{ flex:1, minWidth:0, display:'flex', flexDirection:'column',
                    justifyContent: perCol<=3 ? 'center' : 'space-between', gap:font*0.45 }}>
                    {items.map(ev=>{
                      const emO = ev.emphasis==='bold' || ev.emphasis==='banner';
                      const title = (useShort && ev.titleShort) ? ev.titleShort : ev.title;
                      return (
                        <div key={ev.id} style={{ display:'flex', alignItems:'baseline', gap:font*0.5, minWidth:0,
                          borderLeft: ev.emphasis==='banner' ? ('4px solid '+T.dc[w]) : 'none',
                          paddingLeft: ev.emphasis==='banner' ? font*0.45 : 0 }}>
                          <span style={{ fontFamily:R_GROT, fontWeight:500, fontSize:font*0.86, color:T.fgStrong,
                            flex:'none', fontVariantNumeric:'tabular-nums' }}>{ev.start}</span>
                          <span style={{ minWidth:0, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
                            fontFamily:emO?R_MONT:R_GROT, fontWeight:emO?700:600, fontSize:emO?font*0.95:font,
                            textTransform:emO?'uppercase':'none', letterSpacing:emO?'.02em':'0' }}>{title}</span>
                        </div>
                      );
                    })}
                  </div>
                ))}
          </div>
          <div style={{ flex:'none', marginTop:6, textAlign:'right', fontFamily:R_GROT, fontWeight:500, fontSize:12.5, color:T.dim }}>
            realitydn.com · 86 Mai Thúc Lân, Đà Nẵng</div>
        </div>
      </div>
    </ThemeCtx.Provider>
  );
}

/* ---- dispatcher: one part of one channel at native size ---- */
function PartCanvas({ doc, channelId, partIndex, dailyDate, dailyVariant, onFitReport }){
  if(channelId==='print') return <PrintSheet doc={doc} onFitReport={onFitReport} />;
  if(channelId==='wa') return <WACard doc={doc} onFitReport={onFitReport} />;
  if(channelId==='daily') return dailyVariant==='cover'
    ? <CoverCard doc={doc} date={dailyDate} />
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

Object.assign(window, {
  CHANNELS, DAILY_VARIANTS, channelById, GEOM, LOOKS_LIST,
  computeCapacity, twoColSplit, resolveFit, computeStackSizing,
  PartCanvas, partCount, partSize, ArrowChip,
});
