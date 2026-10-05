/* ============================================================
   REALITY SCHEDULE STUDIO — render · FB cover kit
   The cover fit (wrap-aware stack, size ladder), the footer planner
   (what gives way first), each layout’s event-area rectangle, and
   the atoms every layout shares: the measured event list, the day
   identity, the footer / panel CTA and the time axis — plus the
   Tickets style's own stack (the cream tickets, or one ruled ticket).
   ============================================================ */
import { ThemeCtx, DAILY_VARIANTS, ticketTokens } from './render-config.jsx';
import { DAILY_OPEN_MIN, DAILY_CLOSE_MIN, dailyMinutes } from './render-daily-kit.jsx';
import { estW } from './render-fit.jsx';
import { QRBlock } from './render-footer.jsx';
import { CREAM as R_CREAM, dayInfo as r_dayInfo, DAY_FULL as R_DF, dShort as r_dshort,
  eventsOn as r_eventsOn, GROT as R_GROT, INK as R_INK, MONT as R_MONT, QR_CTA as R_QR_CTA } from './schedule-data.jsx';

/* ---- FB Page cover photo — landscape single-day board ----
   Full-bleed day-colour header strip (text kept inside the mobile-safe centre),
   then the day's events in one or two columns. Titles WRAP to two lines by default
   so nothing is cropped; the auto-fit shrinks type to suit the day. doc.cover lets
   the editor bias the size, force the column count, or switch title handling. */
const COVER_LAD = [14,15,16,17,18,19,20,22,24,26,29,32,36];
/* How the list splits and how tall it stands at a given size. Split out of
   coverFit so the PLANNER below can ask "what does the schedule need?" using the
   same arithmetic the fitter uses to answer "what size fits?" — one measurement,
   so the two can never disagree. */
function coverStack(doc, date, areaW, maxCols, layout){
  /* Tickets measures its own furniture (edges, stubs, the print) — below */
  if(layout==='tickets') return coverTicketStack(doc, date, areaW, maxCols, coverTicketsRuled(doc, date));
  const evs = r_eventsOn(doc, date, 'daily');
  const cfg = doc.cover || {};
  const titles = (cfg.titles==='crop' || cfg.titles==='short') ? cfg.titles : 'wrap';
  const useShort = titles==='short';
  const n = evs.length;
  let cols = (cfg.cols===1 || cfg.cols===2) ? cfg.cols : (areaW>=520 && n>5 ? 2 : 1);
  cols = Math.max(1, Math.min(cols, maxCols||2, Math.max(1, n)));
  const colGap = 30, colW = cols===2 ? (areaW-colGap)/2 : areaW;
  const perCol = Math.max(1, Math.ceil(n/cols));
  const colItems = []; for(let c=0;c<cols;c++) colItems.push(evs.slice(c*perCol, (c+1)*perCol));
  function lineCount(ev, f){
    if(titles==='crop') return 1;
    const t = (useShort && ev.titleShort) ? ev.titleShort : ev.title;
    const wf = (ev.emphasis==='bold' || ev.emphasis==='banner') ? 0.6 : 0.55;
    const timeW = String(ev.start||'').length * f*0.86 * 0.62;
    const bannerPad = ev.emphasis==='banner' ? f*0.45+4 : 0;
    const tW = Math.max(22, colW - timeW - f*0.5 - bannerPad);
    return estW(t, f, wf) > tW ? 2 : 1;
  }
  function colHeight(items, f){ const lh=f*1.3, gap=f*0.5; let h=0;
    items.forEach((ev,i)=>{ h += lh*lineCount(ev,f) + (i<items.length-1?gap:0); }); return h; }
  return { cols, colGap, titles, useShort, colItems,
    /* the tallest column at size f — what the schedule needs */
    at: f => Math.max.apply(null, colItems.map(it=>colHeight(it,f)).concat([0])) };
}
/* event-area sizing for an arbitrary rectangle — wrap-aware, honours doc.cover.
   `layout` matters only to Tickets, whose stack is measured differently. */
function coverFit(doc, date, areaW, areaH, maxCols, layout){
  const cfg = doc.cover || {};
  /* A stack that can say a name would be CUT (Tickets — its names wrap in a
     narrow column beside the stub, or crop on one line) also has to keep
     every name whole: the size steps down until none is. When no size on the
     ladder manages that, height alone decides, as it does everywhere else. */
  const wholeOf = st => !!st.ok && COVER_LAD.some(f=> st.ok(f) && st.at(f) <= areaH);
  /* the largest ladder step at which a stack fits areaH×m, or -1 */
  const top = (st, m) => {
    const whole = wholeOf(st);
    for(let i=COVER_LAD.length-1;i>=0;i--){
      const f = COVER_LAD[i];
      if(st.at(f) <= areaH*m && (!whole || st.ok(f))) return i;
    }
    return -1;
  };
  let st = coverStack(doc, date, areaW, maxCols, layout);
  /* Tickets on auto columns offers each count. A count that keeps every
     name whole beats one that cuts them; then the one that sets the bigger
     type; then FEWER columns — a name on one line reads best, and a single
     column fills the height a two-column grid leaves as air; then more room
     to grow, then the shorter stack at the floor. */
  if(st.cands){
    const score = c => [wholeOf(c) ? 1 : 0, top(c, 0.94), -c.cols, top(c, 1.0), -c.at(COVER_LAD[0])];
    const better = (a, b) => { for(let i=0;i<a.length;i++){ if(a[i]!==b[i]) return a[i] > b[i]; } return false; };
    st = st.cands.reduce((best, c)=> better(score(c), score(best)) ? c : best);
  }
  const { cols, colGap, titles, useShort, colItems } = st;
  const baseIdx = Math.max(0, top(st, 0.94)), maxIdx = Math.max(0, top(st, 1.0));
  const off = Math.max(-5, Math.min(5, cfg.sizeOffset|0));
  const idx = Math.max(0, Math.min(baseIdx + off, Math.max(maxIdx, 0)));
  return { cols, colGap, titles, useShort, colItems, font:COVER_LAD[idx],
    px:Math.round(COVER_LAD[idx]), isAuto: off===0, ruled:st.ruled, perCol:st.perCol };
}
/* ---- TICKETS on the cover (Donald 6.10.26) ----
   The daily card's Tickets re-cut for 851×315. Each event is a cream ticket:
   the time in a day-colour stub, the name in Montserrat caps, the palette's
   ink as the 2px edge, the day colour as a hard offset PRINT. They sit in a
   grid read DOWN each column, rows aligned across, so a heavy row doesn't
   stagger its neighbour. Past COVER_TICKETS_MAX events the day is ONE ruled
   ticket instead — a day-colour bar, a hairline row per event — the same
   switch DailyTickets makes, at cover scale (six is two columns of three).
   The switch is also FIT-aware: if separate tickets cannot stand at the
   ladder's floor even with the leanest footer (one forced column, say), the
   day is ruled rather than clipped. Inside a ticket it is always the Day
   ink-on-cream tokens (ticketTokens), so it reads on every palette. */
const COVER_TICKETS_MAX = 6;
const CTK = {
  edge:   2,
  print:  f => Math.max(4, Math.round(f*0.24)),
  stub:   f => Math.round(f*3.1),                          /* the time stub's width */
  padY:   f => Math.round(f*0.3),
  padX:   f => Math.round(f*0.45),
  gap:    f => Math.max(Math.round(f*0.55), CTK.print(f)+5),   /* the print hangs into it */
  colGap: f => Math.max(18, CTK.print(f)+14),
  name:   0.86,                                            /* a ticket's name: caps at this share of f */
  rowName:0.8,                                             /* a ruled row's name */
  adv:    0.72,                                            /* Montserrat 700 caps, per letter per em, tracking in (measured ≤.72 on the stress week's words) */
  space:  0.31,                                            /* …and its word space */
  lead:   1.16,
  bar:    f => Math.round(f*1.3),                          /* the ruled ticket's bar */
  rowPadY:f => Math.max(2, Math.round(f*0.2)),
  timeCol:f => Math.round(f*2.6),
  hair:   1.5,
  ul:     f => Math.max(3, Math.round(f*0.12)),            /* bold: the day-colour underline… */
  ulPad:  f => Math.round(f*0.08),                         /* …and its air */
};
/* Columns: a forced 1 or 2 is honoured; AUTO offers every count the area
   allows as candidates, and coverFit keeps the best — whole names first, then
   the bigger type. Names beside a stub wrap early, so two columns are not
   automatically the roomier choice the way they are for a bare list. `at`
   (what the planner and the ruled switch ask) is the best candidate's. */
function coverTicketStack(doc, date, areaW, maxCols, ruled){
  const cfg = doc.cover || {};
  const n = r_eventsOn(doc, date, 'daily').length;
  const lim = Math.max(1, Math.min(maxCols||2, n));
  if(cfg.cols===1 || cfg.cols===2) return coverTicketStackAt(doc, date, areaW, Math.min(cfg.cols, lim), ruled);
  const cands = []; for(let c=1;c<=lim;c++) cands.push(coverTicketStackAt(doc, date, areaW, c, ruled));
  if(cands.length===1) return cands[0];
  return Object.assign({}, cands[0], { cands, ok:undefined,
    at: f => Math.min.apply(null, cands.map(s=>s.at(f))) });
}
function coverTicketStackAt(doc, date, areaW, cols, ruled){
  const evs = r_eventsOn(doc, date, 'daily');
  const cfg = doc.cover || {};
  const titles = (cfg.titles==='crop' || cfg.titles==='short') ? cfg.titles : 'wrap';
  const useShort = titles==='short';
  const n = evs.length;
  const perCol = Math.max(1, Math.ceil(n/cols));
  const colItems = []; for(let c=0;c<cols;c++) colItems.push(evs.slice(c*perCol, (c+1)*perCol));
  const titleOf = ev => (useShort && ev.titleShort) ? ev.titleShort : ev.title;
  /* Lines a name takes at type size s in width tw — a greedy WORD wrap on
     estimated widths, because caps words are long and can't share a line: a
     per-character estimate called TALK CIRCLE: PLAYFULNESS + ATTRACTION two
     lines at a width where it sets three. A word wider than the line counts
     as cut; so, under Crop, does a name wider than its one line. */
  function lines(t, s, tw){
    const words = String(t||'').split(/\s+/).filter(Boolean);
    if(titles==='crop')
      return { n:1, cut: words.reduce((w, wd, i)=> w + wd.length*s*CTK.adv + (i ? s*CTK.space : 0), 0) > tw };
    let k = 1, cur = 0, cut = false;
    words.forEach(wd=>{
      const ww = wd.length * s * CTK.adv;
      if(ww > tw) cut = true;
      if(!cur) cur = ww;
      else if(cur + s*CTK.space + ww <= tw) cur += s*CTK.space + ww;
      else { k++; cur = ww; }
    });
    return { n:k, cut: cut || k > 2 };
  }
  /* At size f: the stack's height (names clamp at two lines, as every cover
     list does, plus a bold underline) and whether any name would be CUT —
     wrapped past two lines, or past its one line under Crop. Rows are as tall
     as their tallest ticket: the grid aligns them across the columns. */
  function measure(f){
    if(!n) return { h:0, cut:false };
    const pr = CTK.print(f), e = CTK.edge;
    let tw, k, base, fixed;
    if(ruled){
      tw = (areaW - pr - 2*e)/cols - 2*CTK.padX(f) - CTK.timeCol(f) - f*0.4 - CTK.hair;
      k = CTK.rowName; base = 2*CTK.rowPadY(f);
      fixed = pr + 2*e + CTK.bar(f) + (perCol-1)*CTK.hair;
    } else {
      const colW = (areaW - pr - (cols-1)*CTK.colGap(f))/cols;
      tw = colW - 2*e - CTK.stub(f) - 2*CTK.padX(f);
      k = CTK.name; base = 2*e + 2*CTK.padY(f);
      fixed = pr + (perCol-1)*CTK.gap(f);
    }
    tw = Math.max(20, tw);
    let h = fixed, cut = false;
    for(let r=0;r<perCol;r++){
      let m = 0;
      colItems.forEach(it=>{ const ev = it[r]; if(!ev) return;
        const L = lines(titleOf(ev), f*k, tw); if(L.cut) cut = true;
        m = Math.max(m, base + Math.min(2, L.n)*f*k*CTK.lead + (ev.emphasis==='bold' ? CTK.ul(f)+CTK.ulPad(f) : 0)); });
      h += m;
    }
    return { h, cut };
  }
  return { cols, colGap:null, titles, useShort, colItems, perCol, ruled:!!ruled,
    at: f => measure(f).h, ok: f => !measure(f).cut };
}
/* Tickets or one ruled ticket — by count first (DailyTickets' switch), then
   by whether separate tickets could stand at the floor at all. A property of
   the DAY, not of the footer tier, so the planner can't flip it mid-search. */
function coverTicketsRuled(doc, date){
  const n = r_eventsOn(doc, date, 'daily').length;
  if(n > COVER_TICKETS_MAX) return true;
  const a = coverArea('tickets', coverQrOn(doc), 'none', true);
  return coverTicketStack(doc, date, a.w, a.cols, false).at(COVER_LAD[0]) > a.h;
}
/* cover stylings + their event-area rectangle (shared by render + the editor) */
/* The first five are cover-native arrangements; the last five are the daily
   card's layouts re-cut for landscape, so a document can carry one visual idea
   across the story, the feed and the page cover. Names match DAILY_CARDS on
   purpose — Spine means the same thing on both surfaces. data-model.jsx keeps
   a copy of the ids (COVER_LAYOUT_IDS) to normalise documents without the
   render engine; add a style there too. */
const COVER_STYLES = [
  { id:'banner',   name:'Banner' },
  { id:'sidebar',  name:'Sidebar' },
  { id:'slice',    name:'Slice' },
  { id:'halftone', name:'Halftone' },
  { id:'centered', name:'Centered' },
  { id:'flood',    name:'Flood' },
  { id:'misreg',   name:'Misreg' },
  { id:'spine',    name:'Spine' },
  { id:'chrono',   name:'Chrono' },
  { id:'tickets',  name:'Tickets' },
];
/* The cover's optional code. 72px is the floor at which a 25-module QR still
   reads off a screen at FB's ~820px render — below that it is decoration, and
   decoration is not worth a quarter of 315px. It is OFF by default for exactly
   that reason: the cover's job is the WORDS (nobody scans the phone they are
   holding), and the code costs the events list real height. On, it is a
   deliberate choice for the desktop-and-projector case.

   Where the code rides in the footer, the footer's declared height simply
   becomes the code's, and every budget below subtracts that — so turning it on
   steps the type down rather than running the list through the address. */
/* Two sizes, because the two homes cost different things. In a colour panel the
   code is free — nothing else wants that space — so it takes the comfortable
   72px. In a footer every pixel is bought from the events list, and measuring
   showed 72 there clips a FIVE-event day; 56 costs 22px instead of 38 and still
   reads off a desktop screen, which is the case the code is on for. */
const COVER_QR_PANEL = 72, COVER_QR = 56;
/* The footer is a DECLARED height, not whatever the text happens to occupy.
   It was the latter, and that is what broke: the CTA is longer than the bare
   host it replaced, so in the narrow right-hand column of Slice and Halftone it
   wrapped to a second line, and the events — which had no clip — simply painted
   over it. Two fixed nowrap lines, one known number, and every budget below
   subtracts exactly that. */
const COVER_FOOT_H = 34;
/* Sidebar, Slice and Halftone each carry a wide colour panel with dead space in
   it, and each has the NARROWEST event column of the nine. Spending 72px of
   their footer on a code is taking height from the one part that needs it while
   room sits unused a few hundred pixels to the left — so on those three the
   code goes in the panel and the list pays nothing. */
/* Measuring the real containers settled where the code belongs. Put in the
   footer it costs the list 38px — enough to clip a FIVE-event day on Flood,
   Misregister and Chrono, and five events is an ordinary Tuesday. But every
   layout already stands its wordmark in a band or a panel with room beside it,
   and the poster ticket has always set wordmark, address and code as one block.
   So the code rides with the wordmark, where seven of the nine layouts have the
   space already and it costs their list nothing.

   Centered is the exception by construction — everything on the axis, no band
   to put it in — so there the footer carries it and pays the 38px. */
const COVER_QR_WITH_MARK = { sidebar:1, slice:1, halftone:1 };
function coverQrOn(doc){ return !!(doc && doc.cover && doc.cover.qr); }
function coverQrInPanel(layout){ return !!COVER_QR_WITH_MARK[layout]; }
/* PRIORITY, in order: the schedule · one piece of branding · the notes.
   A schedule with its last rows sliced off fails at the one job the card has,
   and a card that fails at its job is worse for the brand than a missing
   address line. So the footer is no longer a fixed reservation the list has to
   work around — it is the first thing to give way, and it gives way in this
   order: the code, then the address, then the offer. The wordmark never goes;
   it lives in a header band or a colour panel on every layout and costs the
   list nothing, so there is always branding on the card. */
const COVER_FOOT_TIERS = ['full','compact','line','none'];
function coverFootH(layout, qrOn, tier){
  if(coverQrInPanel(layout)) return 0;          /* the panel carries it all */
  switch(tier){
    case 'none':    return 0;
    case 'line':    return 18;                  /* the offer alone */
    case 'compact': return COVER_FOOT_H;        /* offer + address, no code */
    default:        return qrOn ? COVER_QR : COVER_FOOT_H;
  }
}
/* Richest footer this day can afford without the schedule losing a row. The
   schedule is measured at the legibility floor: if it cannot fit even there,
   no footer tier will save it and the leanest is chosen so the list keeps
   every pixel there is. */
function coverPlan(doc, date, layout){
  const qrOn = coverQrOn(doc);
  /* Order of sacrifice. A smaller day name loses nothing — the word is still
     there — so the card's own chrome gives way one step before any note is
     dropped. Only Chrono and Centered have a tighter setting; for the rest the
     tight option is identical to the loose one and the list simply falls
     through to the footer ladder. */
  const opts = [ ['full',false], ['full',true], ['compact',true], ['line',true], ['none',true] ];
  for(let i=0;i<opts.length;i++){
    const tier = opts[i][0], tight = opts[i][1];
    const a = coverArea(layout, qrOn, tier, tight);
    if(coverStack(doc, date, a.w, a.cols, layout).at(COVER_LAD[0]) <= a.h)
      return { tier, tight, a, qrOn };
  }
  const last = opts[opts.length-1];
  return { tier:last[0], tight:last[1], a:coverArea(layout, qrOn, last[0], last[1]), qrOn };
}
/* Every height below is now derived the same way — canvas, minus the chrome
   above the list, minus the footer's declared height, minus the bottom pad —
   rather than a magic number carrying an unstated footer allowance. */
function coverArea(layout, qrOn, tier, tight){
  const v = DAILY_VARIANTS.cover, sp = v.bleed + 24, f = coverFootH(layout, qrOn, tier||'full');
  const g = tight ? 1 : 0;
  switch(layout){
    case 'sidebar':  return { w:v.w-326-28-sp,          h:v.h-20-22-8-14-f,       cols:1 };
    case 'centered': return { w:430,                    h:190-f+(g?31:0),         cols:1 };
    case 'slice':    return { w:v.w-430-8-sp,           h:v.h-26-22-8-14-f,       cols:1 };
    case 'halftone': return { w:v.w-430-6-sp,           h:v.h-26-22-8-14-f,       cols:1 };
    /* the slab sits inside the safe centre and carries its own border+padding */
    case 'flood':    return { w:v.w-(v.bleed+12)*2-36,  h:v.h-88-13-32-f,         cols:2 };
    case 'misreg':   return { w:v.w-sp*2,               h:v.h-130-8-f,            cols:2 };
    case 'spine':    return { w:v.w-196-26-(v.bleed+24),h:v.h-18-16-14-12-12-f,   cols:2 };
    /* Chrono is the one layout whose header is SHORTER than the code (Banner's
       strip is 78, Misreg's band 96 — the code disappears inside those). Its
       header row grows to the code's height, so the list gives that back. */
    /* Header heights here are the MEASURED ones, not the sum of their parts —
       the date chip and the wordmark make the row taller than the day name
       alone suggests, and a planner working from the wrong number picks a
       footer the list cannot actually afford. */
    case 'chrono':   return { w:v.w-sp*2,
                              h:v.h-16-(g?62:70)-(g?6:11)-(g?35:39)-10-10-f, cols:2 };
    /* Tickets: the flat day band (72, 62 tight), the body's 12 above and 8
       below, and the footer's own 6px margin — the print is inside the grid */
    case 'tickets':  return { w:v.w-sp*2,               h:v.h-(g?62:72)-12-8-6-f, cols:2 };
    default:         return { w:v.w-sp*2,               h:v.h-78-18-8-f,          cols:2 };
  }
}
function coverInfo(doc, date){
  const layout = (doc.cover && doc.cover.layout) || 'banner';
  const plan = coverPlan(doc, date, layout);
  const fit = coverFit(doc, date, plan.a.w, plan.a.h, plan.a.cols, layout);
  return { px:fit.px, isAuto:fit.isAuto, layout, cols:fit.cols, footTier:plan.tier };
}
const COVER_ADDR = 'realitydn.com · 86 Mai Thúc Lân, Đà Nẵng';
const COVER_ADDR_ONLY = '86 Mai Thúc Lân, Đà Nẵng';
/* The cover reports its capacity the way every other surface does — by
   MEASURING the rendered DOM, not by trusting the estimate. The estimate is
   deliberately conservative about wrapping, which made it call Sidebar and
   Flood over-capacity on days that fit exactly; a warning wrong two times in
   nine is one the user learns to ignore. Context rather than a prop so the
   report does not have to be threaded through all nine layouts. */
const CoverFitCtx = React.createContext(null);
function CoverEvents({ fit, T, w, justify, chip }){
  const f = fit.font;
  const report = React.useContext(CoverFitCtx);
  const boxRef = React.useRef(null);
  React.useLayoutEffect(()=>{
    if(!report || !boxRef.current) return;
    const box = boxRef.current;
    let need = 0;
    for(let i=0;i<box.children.length;i++) need = Math.max(need, box.children[i].scrollHeight);
    report({ over: need > box.clientHeight + 1, level:0, denIdx:0 });
  });
  return (
    /* overflow:hidden is the backstop the contract needs: the ladder has a
       legibility floor, so on a heavy enough day the estimate can still come up
       short — and when it does the honest failure is a clipped last row, not a
       row printed across the address. */
    <div ref={boxRef} style={{ flex:1, minHeight:0, display:'flex', gap:fit.colGap, width:'100%',
      height:'100%', overflow:'hidden' }}>
      {fit.colItems.map((items,ci)=>(
        <div key={ci} style={{ flex:1, minWidth:0, display:'flex', flexDirection:'column',
          justifyContent: justify || (items.length<=3 ? 'center' : 'space-between'), gap:f*0.5 }}>
          {items.map(ev=>{
            const emO = ev.emphasis==='bold' || ev.emphasis==='banner';
            const title = (fit.useShort && ev.titleShort) ? ev.titleShort : ev.title;
            const tStyle = { minWidth:0, flex:1, fontFamily:emO?R_MONT:R_GROT, fontWeight:emO?700:600,
              fontSize:emO?f*0.95:f, textTransform:emO?'uppercase':'none', letterSpacing:emO?'.02em':'0' };
            if(fit.titles==='crop') Object.assign(tStyle, { whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' });
            else Object.assign(tStyle, { lineHeight:1.16, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' });
            return (
              <div key={ev.id} style={{ display:'flex', alignItems:chip?'flex-start':'baseline', gap:f*0.5, minWidth:0,
                borderLeft: ev.emphasis==='banner' ? ('4px solid '+T.dc[w]) : 'none', paddingLeft: ev.emphasis==='banner' ? f*0.45 : 0 }}>
                <span style={chip
                  ? { fontFamily:R_GROT, fontWeight:600, fontSize:f*0.8, background:T.dc[w], color:T.dt[w],
                      padding:(f*0.13)+'px '+(f*0.32)+'px', flex:'none', lineHeight:1.18, fontVariantNumeric:'tabular-nums' }
                  : { fontFamily:R_GROT, fontWeight:500, fontSize:f*0.86, color:T.fgStrong, flex:'none', fontVariantNumeric:'tabular-nums' }}>{ev.start}</span>
                <span style={tStyle}>{title}</span>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
/* The Tickets style's event area — the cream tickets, or one ruled ticket
   (coverTicketStack decides and measures; this draws exactly that). Text
   inside is Day ink on cream whatever the palette; the stub and the bar take
   the day colour with its own text (the APCA rule, T.dt); a banner night
   fills its ticket — or its row — with the day colour; bold underlines the
   name in it. Reports its measured fit like CoverEvents. */
function CoverTicketEvents({ fit, T, w }){
  const f = fit.font, K = ticketTokens(T), dc = T.dc[w], dt = T.dt[w];
  const pr = CTK.print(f), e = CTK.edge, cols = fit.cols, perCol = fit.perCol || 1;
  const evs = [].concat.apply([], fit.colItems);
  const report = React.useContext(CoverFitCtx);
  const boxRef = React.useRef(null), rowsRef = React.useRef(null);
  React.useLayoutEffect(()=>{
    if(!report || !boxRef.current) return;
    let over;
    if(fit.ruled){ const r = rowsRef.current; over = !!r && r.scrollHeight > r.clientHeight + 1; }
    else {
      /* measured from the tickets themselves: the grid centres them, so an
         overflow spills both ways and scrollHeight would see only half */
      const box = boxRef.current, kids = box.children;
      let top = Infinity, bot = 0;
      for(let i=0;i<kids.length;i++){ top = Math.min(top, kids[i].offsetTop); bot = Math.max(bot, kids[i].offsetTop + kids[i].offsetHeight); }
      over = kids.length > 0 && (bot - top) + pr > box.clientHeight + 1;
    }
    report({ over, level:0, denIdx:0 });
  });
  const title = ev => (fit.useShort && ev.titleShort) ? ev.titleShort : ev.title;
  /* A name. Wrapped names are a flex column whose words are an ANONYMOUS
     item: the export (html-to-image) pins every element's height at its live
     value, so a name that wraps to two lines on screen but sets on one in the
     capture — a hair's difference in width — sat at the top of a two-line
     box. An anonymous box has no height to pin, so the line stays centred.
     Two lines at most: the fit keeps names whole, this is only the backstop
     (it clips, top-anchored). Crop is one line with an ellipsis. */
  const name = (ev, k)=>{
    const s = f*k, bold = ev.emphasis==='bold';
    const st = { minWidth:0, fontFamily:R_MONT, fontWeight:700, fontSize:s, textTransform:'uppercase',
      letterSpacing:'.03em', lineHeight:CTK.lead,
      borderBottom: bold ? CTK.ul(f)+'px solid '+dc : 'none', paddingBottom: bold ? CTK.ulPad(f) : 0 };
    if(fit.titles==='crop') return <div style={Object.assign(st, { maxWidth:'100%', whiteSpace:'nowrap',
      overflow:'hidden', textOverflow:'ellipsis' })}>{title(ev)}</div>;
    return <div style={Object.assign(st, { display:'flex', flexDirection:'column', justifyContent:'safe center',
      overflow:'hidden', maxHeight:2*s*CTK.lead + 0.5 })}>{title(ev)}</div>;
  };
  const time = { fontFamily:R_MONT, fontWeight:700, fontVariantNumeric:'tabular-nums', whiteSpace:'nowrap' };
  if(fit.ruled) return (
    <div ref={boxRef} style={{ flex:1, minHeight:0, width:'100%', height:'100%', boxSizing:'border-box',
      paddingRight:pr, paddingBottom:pr, display:'flex' }}>
      <div style={{ flex:1, minWidth:0, display:'flex', flexDirection:'column', background:K.bg, color:K.fg,
        border:e+'px solid '+K.edge, boxShadow:pr+'px '+pr+'px 0 '+dc }}>
        <div style={{ flex:'none', height:CTK.bar(f), background:dc, color:dt, display:'flex', alignItems:'center',
          justifyContent:'space-between', padding:'0 '+CTK.padX(f)+'px', fontFamily:R_MONT, fontWeight:700,
          fontSize:Math.max(10, Math.round(f*0.62)), letterSpacing:'.1em', whiteSpace:'nowrap' }}>
          <span>{evs.length} EVENTS</span><span>86 MAI THÚC LÂN</span>
        </div>
        <div ref={rowsRef} style={{ flex:1, minHeight:0, overflow:'hidden', display:'grid',
          gridTemplateColumns:'repeat('+cols+', minmax(0,1fr))', gridTemplateRows:'repeat('+perCol+', 1fr)',
          gridAutoFlow:'column' }}>
          {evs.map((ev,i)=>{
            const banner = ev.emphasis==='banner', r = i % perCol, c = Math.floor(i / perCol);
            return (
              <div key={ev.id} style={{ display:'flex', alignItems:'center', gap:f*0.4, minWidth:0,
                padding:CTK.rowPadY(f)+'px '+CTK.padX(f)+'px',
                borderTop: r ? CTK.hair+'px solid '+K.hairline : 'none',
                borderLeft: c ? CTK.hair+'px solid '+K.hairline : 'none',
                background: banner ? dc : 'transparent', color: banner ? dt : K.fg }}>
                <span style={Object.assign({ flex:'none', width:CTK.timeCol(f), fontSize:f*0.74 }, time)}>{ev.start}</span>
                {name(ev, CTK.rowName)}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
  return (
    /* `safe center`: a day that overflows starts at the top and clips at the
       bottom, like every other cover list — never off both edges */
    <div ref={boxRef} style={{ flex:1, minHeight:0, width:'100%', height:'100%', overflow:'hidden', position:'relative',
      boxSizing:'border-box', paddingRight:pr, paddingBottom:pr, display:'grid',
      gridTemplateColumns:'repeat('+cols+', minmax(0,1fr))', gridTemplateRows:'repeat('+perCol+', auto)',
      gridAutoFlow:'column', columnGap:CTK.colGap(f), rowGap:CTK.gap(f), alignContent:'safe center' }}>
      {evs.map(ev=>{
        const banner = ev.emphasis==='banner';
        return (
          <div key={ev.id} style={{ display:'flex', minWidth:0, background: banner ? dc : K.bg, color: banner ? dt : K.fg,
            border:e+'px solid '+K.edge, boxShadow:pr+'px '+pr+'px 0 '+dc }}>
            <div style={Object.assign({ flex:'none', width:CTK.stub(f), display:'flex', alignItems:'center',
              justifyContent:'center', fontSize:f*0.78, background: banner ? K.fg : dc, color: banner ? K.bg : dt }, time)}>{ev.start}</div>
            {/* the name centred in its half of the ticket; flex-start, so a
                bold underline hugs the words rather than the whole width */}
            <div style={{ flex:1, minWidth:0, display:'flex', flexDirection:'column', justifyContent:'center',
              alignItems:'flex-start', padding:CTK.padY(f)+'px '+CTK.padX(f)+'px' }}>
              {name(ev, CTK.name)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
function CoverBody({ doc, date, T, w, fit, justify, chip, tickets }){
  const info = r_dayInfo(doc, date);
  const report = React.useContext(CoverFitCtx);
  const quiet = info.status==='closed' || fit.colItems.every(c=>!c.length);
  React.useLayoutEffect(()=>{ if(report && quiet) report({ over:false, level:0, denIdx:0 }); });
  if(info.status==='closed') return <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', textAlign:'center',
    fontFamily:R_MONT, fontWeight:700, fontSize:36, letterSpacing:'.05em', textTransform:'uppercase', color:T.fg }}>{info.note||'CLOSED'}</div>;
  if(fit.colItems.every(c=>!c.length)) return <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center',
    fontFamily:R_MONT, fontWeight:600, fontSize:22, letterSpacing:'.08em', textTransform:'uppercase', color:T.dim }}>Open · come hang out</div>;
  if(tickets) return <CoverTicketEvents fit={fit} T={T} w={w} />;
  return <CoverEvents fit={fit} T={T} w={w} justify={justify} chip={chip} />;
}
function CoverId({ T, w, date, color, dayFs, kFs }){
  return (
    <div>
      <div style={{ fontFamily:R_MONT, fontWeight:700, fontSize:kFs||13, letterSpacing:'.2em', textTransform:'uppercase', opacity:.92, color }}>TODAY AT REALITY</div>
      <div style={{ display:'flex', alignItems:'baseline', gap:14, marginTop:4 }}>
        <span style={{ fontFamily:R_MONT, fontWeight:700, fontSize:dayFs||38, lineHeight:.98, textTransform:'uppercase', color }}>{R_DF[w]}</span>
        <span style={{ fontFamily:R_MONT, fontWeight:500, fontSize:Math.round((dayFs||38)*0.62), lineHeight:1, color }}>{r_dshort(date)}</span>
      </div>
    </div>
  );
}
function CoverIdStacked({ w, date, color, dayFs, kFs }){   /* weekday on its own line — fits narrow panels */
  return (
    <div>
      <div style={{ fontFamily:R_MONT, fontWeight:700, fontSize:kFs||12, letterSpacing:'.2em', textTransform:'uppercase', opacity:.92, color }}>TODAY AT REALITY</div>
      <div style={{ fontFamily:R_MONT, fontWeight:800, fontSize:dayFs||30, lineHeight:1, textTransform:'uppercase', marginTop:6, color }}>{R_DF[w]}</div>
      <div style={{ fontFamily:R_MONT, fontWeight:500, fontSize:Math.round((dayFs||30)*0.62), marginTop:5, color }}>{r_dshort(date)}</div>
    </div>
  );
}
/* The cover's call to action. Every layout ends on this row, so this is the one
   place the app gets named — the cover used to close on `realitydn.com` or the
   address and never mentioned where the schedule actually lives.

   The offer is set in --fg at weight 600 and the address trails it dim: on a
   surface this short the eye gets one line, and the half of it worth reading is
   the destination. `doc.cover.qr` adds the code beside it (see COVER_QR). */
function CoverFootR({ T, doc, text, strong, dim, centred, layout, tier }){
  const t = tier || 'full';
  if(t==='none' || coverQrInPanel(layout)) return null;
  const qr = coverQrOn(doc) && t==='full';
  const muted = dim || T.dim;
  const lead = strong || T.fg;
  const line = (
    <div style={{ fontFamily:R_GROT, fontSize:12, lineHeight:1.4,
      textAlign: centred ? 'center' : (qr ? 'left' : 'right') }}>
      <div style={{ fontWeight:600, color:lead, whiteSpace:'nowrap' }}>{text || R_QR_CTA}</div>
      {t!=='line' &&
        <div style={{ fontWeight:500, color:muted, whiteSpace:'nowrap' }}>{COVER_ADDR_ONLY}</div>}
    </div>
  );
  if(!qr) return (
    <div style={{ flex:'none', height:coverFootH(layout, false, t), marginTop:6,
      display:'flex', flexDirection:'column', justifyContent:'flex-end',
      alignItems: centred ? 'center' : 'flex-end' }}>{line}</div>
  );
  return (
    <div style={{ flex:'none', height:COVER_QR, marginTop:6, display:'flex',
      alignItems: centred ? 'center' : 'flex-end',
      justifyContent: centred ? 'center' : 'space-between', gap:16 }}>
      <div style={{ minWidth:0 }}>{line}</div>
      <QRBlock size={COVER_QR} label={false} />
    </div>
  );
}
/* Sidebar, Slice and Halftone hand the WHOLE block to their colour panel — code,
   offer and address — so none of it is bought from the narrowest event column on
   the board. Wrapping is allowed here: a panel has vertical room to spare, which
   is the whole reason the notes were moved into it. */
function CoverPanelFoot({ doc, T, w, width }){
  const dt = T.dt[w];
  const dim = dt===R_CREAM ? 'rgba(255,251,241,.72)' : 'rgba(13,9,5,.62)';
  return (
    <div style={{ width:width, display:'flex', flexDirection:'column', gap:9 }}>
      {coverQrOn(doc) &&
        <ThemeCtx.Provider value={Object.assign({}, T, { bg:R_INK })}>
          <QRBlock size={COVER_QR_PANEL} label={false} align="flex-start" />
        </ThemeCtx.Provider>}
      <div style={{ fontFamily:R_GROT, fontSize:12, lineHeight:1.35 }}>
        <div style={{ fontWeight:600, color:dt }}>{R_QR_CTA}</div>
        <div style={{ fontWeight:500, color:dim, marginTop:2 }}>{COVER_ADDR_ONLY}</div>
      </div>
    </div>
  );
}
const COVER_SIDE = (doc,date,T,w,fit,padR) => (
  <div style={{ flex:1, minHeight:0, display:'flex', paddingTop:8 }}><CoverBody doc={doc} date={date} T={T} w={w} fit={fit} /></div>
);

/* The day's span as a bar, with a notch at every start. Shared by the cover's
   Chrono; the story version draws its own at story scale. */
function CoverAxis({ doc, date, T, w, h }){
  const evs = r_eventsOn(doc, date, 'daily');
  const barH = h || 22;
  const at = ev=>{
    const m = Math.max(DAILY_OPEN_MIN, Math.min(DAILY_CLOSE_MIN, dailyMinutes(ev.start)));
    return (m - DAILY_OPEN_MIN) / (DAILY_CLOSE_MIN - DAILY_OPEN_MIN);
  };
  const ticks = [['11:00',0],['15:00',4/15],['19:00',8/15],['23:00',12/15],['02:00',1]];
  return (
    <div style={{ flex:'none' }}>
      <div style={{ position:'relative', height:barH, background:T.dc[w] }}>
        {evs.map(ev=>(
          <div key={ev.id} style={{ position:'absolute', left:'calc('+(at(ev)*100)+'% - '+(at(ev)*3)+'px)',
            top:0, bottom:0, width:3, background:T.fg }} />
        ))}
      </div>
      <div style={{ position:'relative', height:14, marginTop:5 }}>
        {ticks.map(t=>(
          <div key={t[0]} style={{ position:'absolute', left:(t[1]*100)+'%',
            transform:'translateX('+(t[1]===0?'0':t[1]===1?'-100%':'-50%')+')',
            fontFamily:R_GROT, fontWeight:500, fontSize:11, color:T.dim,
            fontVariantNumeric:'tabular-nums' }}>{t[0]}</div>
        ))}
      </div>
    </div>
  );
}

export { coverFit, COVER_STYLES, COVER_QR, COVER_FOOT_H, coverFootH, coverPlan, coverInfo, CoverFitCtx,
  CoverBody, CoverId, CoverIdStacked, CoverFootR, CoverPanelFoot, COVER_SIDE, CoverAxis };
