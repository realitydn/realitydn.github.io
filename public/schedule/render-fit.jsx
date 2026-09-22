/* ============================================================
   REALITY SCHEDULE STUDIO — render · measure and fit
   The shared layout kernel, part 2: estimate first, then MEASURE the
   real DOM and bump density until it fits (type ladder → footer
   ladder). Day measurement, footer estimates, per-day sizing for the
   stacked carousels, the capacity summary, balanced two-column
   splits for print / WhatsApp, and the measured-overflow hooks.
   Contract: never overflow silently, never go below the floor.
   ============================================================ */
import { CHANNELS, channelById, lookOf, GEOM, gridColsFor, gridGapFor, GRID_F, lookF, stackBannerH,
  gridStripH, gridPad, dayGapFor, SHORT_STEP, SIZE_COMFORT, SIZE_BRIM, sizedChannel, ladderLen,
  clampStep, entryFont, entryLead, CAROUSEL_QR } from './render-config.jsx';
import { dayInfo as r_dayInfo, eventsOn as r_eventsOn, partDates as r_partDates,
  rangeDates as r_rangeDates, usedLegend as r_usedLegend } from './schedule-data.jsx';

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
/* evsOverride renders only part of a day — set when a heavy day is continued
   across a two-column break (see bestSplit). null = the whole day. */
function measureDayAt(doc, date, channel, look, font, lead, useShort, rowAreaW, evsOverride){
  const g = GEOM[channel];
  const rowH = font*lead;
  const info = r_dayInfo(doc, date);
  const evs = evsOverride || r_eventsOn(doc, date, channel);
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
function measureDay(doc, date, channel, look, level, rowAreaW, evsOverride){
  const g = GEOM[channel];
  return measureDayAt(doc, date, channel, look, g.font[level]*lookF(look), g.lead[level], level>=3, rowAreaW, evsOverride);
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
  /* wa: single-row footer. denIdx 0 now carries a 62px code + its caption, so
     the row is the code's height rather than the text's. */
  if(channel==='wa') return 18 + (denIdx===0 ? 84 : 36);
  let h = g.footPad || 20;
  let col = 0;                       /* the centred stack's own height */
  if(denIdx===0){
    if(hasLegend) col += Math.max(legend.locations.length, legend.flags.length||1)*28*s + 14;
    if(support) col += 118*s;
    col += 52*s;
  } else if(denIdx===1){
    if(hasLegend) col += 28*s;
    if(support) col += 50*s;
    col += 38*s;
  } else {
    col += (hasLegend?24:0)*s + 28*s;
  }
  /* The QR rides BESIDE that stack, so it only costs height on a footer whose
     stack is shorter than the code — e.g. a week with no legend and the
     support note switched off. max(), not +, is the whole point of putting it
     in the margin. */
  const qs = (CAROUSEL_QR[denIdx]||0) * s;
  const qrH = qs ? qs + 8 + 14*s : 0;
  return h + Math.max(col, qrH);
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
      } else if(geomBox.twoCol){
        /* re-balance at every level: a bigger type may only fit one split, a
           smaller one may fit several — take the evenest that clears the box */
        const cols = bestSplit(doc, channel, look, L, geomBox.colW);
        const colOK = cols.every(col=>!col.length || fitSegments(doc, col, channel, look, L, geomBox.colW) <= availH);
        if(colOK) return { level:L, denIdx:den, fits:true, availH, colsUsed:cols };
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
        { boxH, hasFooter:true, legend, twoCol:true, colW }));
    }
  }
  return out;
}

/* ---- two-column splits for print / WA ---------------------------------------
   A column is a list of SEGMENTS. A segment is a whole day, or — when one heavy
   day is a big share of the week — a slice of one day's events, continued across
   the break with the day block repeated and marked CONT.
   Balancing on MEASURED heights (not event counts) is what makes this honest:
   a banner row, a two-line title and a CLOSED day all cost heights that a count
   can't see, and in Ledger every day owes the block floor whether it holds one
   event or five. */
function seg(date, evs, cut){ return { date, evs:evs||null, cut:cut||null }; }
const MIN_SLICE = 2;        /* never orphan fewer than this many rows either side */
const SLICE_GAIN = 0.08;    /* slice only if it beats the best clean break by 8% of the column */

function fitSegments(doc, segs, channel, look, level, colW){
  const g = GEOM[channel];
  const raw = rowAreaWidth(channel, look, colW);
  const gap = dayGapFor(g, look);
  let total = 0;
  segs.forEach((s,i)=>{
    total += measureDay(doc, s.date, channel, look, level, raw, s.evs) + (i<segs.length-1 ? gap : 0);
  });
  return total;
}
/* every legal break: after day i (clean), or inside day i after k of its events */
function breakPoints(doc, dates, channelId){
  const pts = [];
  for(let i=0;i<dates.length-1;i++) pts.push({ i, k:null });
  dates.forEach((d,i)=>{
    if(r_dayInfo(doc, d).status==='closed') return;      /* a closed day is one row — never sliced */
    const n = r_eventsOn(doc, d, channelId).length;
    for(let k=MIN_SLICE; k<=n-MIN_SLICE; k++) pts.push({ i, k });
  });
  return pts;
}
function segmentsAt(doc, dates, channelId, pt){
  const A = [], B = [];
  dates.forEach((d,i)=>{
    if(pt.k==null){ (i<=pt.i ? A : B).push(seg(d)); return; }
    if(i < pt.i){ A.push(seg(d)); return; }
    if(i > pt.i){ B.push(seg(d)); return; }
    const evs = r_eventsOn(doc, d, channelId);
    A.push(seg(d, evs.slice(0, pt.k), 'head'));
    B.push(seg(d, evs.slice(pt.k), 'tail'));
  });
  return [A, B];
}
/* the break that leaves the two columns most even at this type level */
function bestSplit(doc, channelId, look, level, colW){
  const dates = r_rangeDates(doc.range);
  if(dates.length<=1) return [dates.map(d=>seg(d)), []];
  const tallest = pt=>{
    const cols = segmentsAt(doc, dates, channelId, pt);
    if(!cols[0].length || !cols[1].length) return null;
    return { cols, tall:Math.max(fitSegments(doc, cols[0], channelId, look, level, colW),
                                 fitSegments(doc, cols[1], channelId, look, level, colW)) };
  };
  let clean = null, sliced = null;
  breakPoints(doc, dates, channelId).forEach(pt=>{
    const r = tallest(pt); if(!r) return;
    const slot = pt.k==null ? 'clean' : 'sliced';
    const cur = slot==='clean' ? clean : sliced;
    if(!cur || r.tall < cur.tall){ if(slot==='clean') clean = r; else sliced = r; }
  });
  if(!clean) return sliced ? sliced.cols : [dates.map(d=>seg(d)), []];
  /* a clean day boundary always wins unless slicing is a real improvement */
  const gain = SLICE_GAIN * Math.max(clean.tall, 1);
  return (sliced && sliced.tall < clean.tall - gain) ? sliced.cols : clean.cols;
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

function fontFor(channel, look, level){
  return GEOM[channel].font[level]*lookF(look);
}

export { estW, codesText, timeColW, timeTail, resolveFit, computeStackSizing, computeCapacity,
  bestSplit, useOverflowBump, useFitReport, applyBump, fontFor };
