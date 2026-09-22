/* ============================================================
   REALITY SCHEDULE STUDIO — render · the FB cover
   The nine cover layouts (five cover-native, four re-cut from the
   daily cards) and CoverCard, which frames whichever is chosen.
   ============================================================ */
import { themeTokens, ThemeCtx, DAILY_VARIANTS } from './render-config.jsx';
import { coverFit, coverFootH, coverPlan, CoverFitCtx, CoverBody, CoverId, CoverIdStacked, CoverFootR,
  CoverPanelFoot, COVER_SIDE, CoverAxis } from './render-cover-kit.jsx';
import { dailyPlate, dailyFitName } from './render-daily-kit.jsx';
import { CREAM as R_CREAM, dayInfo as r_dayInfo, DAY_FULL as R_DF, dShort as r_dshort, GROT as R_GROT,
  INK as R_INK, MONT as R_MONT, dWeekday as r_wd, Wordmark as RWordmark } from './schedule-data.jsx';

/* 1 — Banner: full-bleed colour strip on top, events below */
function CoverBanner({ doc, date, T, w }){
  const v = DAILY_VARIANTS.cover, sp = v.bleed+24, stripH = 78, plan = coverPlan(doc, date, 'banner'), a = plan.a;
  const fit = coverFit(doc, date, a.w, a.h, a.cols);
  return (
    <React.Fragment>
      <div style={{ position:'absolute', left:0, right:0, top:0, height:stripH, background:T.dc[w], color:T.dt[w], boxShadow:T.shadow,
        display:'flex', alignItems:'center', justifyContent:'space-between', paddingLeft:sp, paddingRight:sp, boxSizing:'border-box' }}>
        <CoverId T={T} w={w} date={date} color={T.dt[w]} dayFs={40} kFs={14} />
        <RWordmark tight height={26} color={T.dt[w]} />
      </div>
      <div style={{ position:'absolute', left:0, right:0, top:stripH, bottom:0, paddingLeft:sp, paddingRight:sp, paddingTop:18, paddingBottom:8, boxSizing:'border-box', display:'flex', flexDirection:'column' }}>
        <div style={{ flex:1, minHeight:0, display:'flex' }}><CoverBody doc={doc} date={date} T={T} w={w} fit={fit} /></div>
        <CoverFootR T={T} doc={doc} layout="banner"  tier={plan.tier} />
      </div>
    </React.Fragment>
  );
}
/* 2 — Sidebar: full-height colour panel left, events right */
function CoverSidebar({ doc, date, T, w }){
  const v = DAILY_VARIANTS.cover, panel = 326, padR = v.bleed+24, plan = coverPlan(doc, date, 'sidebar'), a = plan.a;
  const fit = coverFit(doc, date, a.w, a.h, a.cols);
  return (
    <React.Fragment>
      {/* one column, not a centred identity with a block floating under it —
          on a heavy day the block grows and the two collided. */}
      <div style={{ position:'absolute', left:0, top:0, bottom:0, width:panel, background:T.dc[w], color:T.dt[w], boxShadow:T.shadow,
        display:'flex', flexDirection:'column', paddingLeft:v.bleed+18, paddingRight:18,
        paddingTop:20, paddingBottom:16, boxSizing:'border-box' }}>
        <div style={{ flex:1, minHeight:0, display:'flex', alignItems:'center' }}>
          <CoverIdStacked w={w} date={date} color={T.dt[w]} dayFs={30} kFs={12} />
        </div>
        <CoverPanelFoot doc={doc} T={T} w={w} width={panel-(v.bleed+18)-18} />
      </div>
      <div style={{ position:'absolute', left:panel, right:0, top:0, bottom:0, paddingLeft:28, paddingRight:padR, paddingTop:20, paddingBottom:14, boxSizing:'border-box', display:'flex', flexDirection:'column' }}>
        <div style={{ flex:'none', display:'flex', justifyContent:'flex-end' }}><RWordmark tight height={22} color={T.fg} /></div>
        {COVER_SIDE(doc,date,T,w,fit)}
        <CoverFootR T={T} doc={doc} layout="sidebar"  tier={plan.tier} />
      </div>
    </React.Fragment>
  );
}
/* 3 — Slice: a day-colour band skewed across the left, events right */
function CoverSlice({ doc, date, T, w }){
  const v = DAILY_VARIANTS.cover, padR = v.bleed+24, plan = coverPlan(doc, date, 'slice'), a = plan.a;
  const fit = coverFit(doc, date, a.w, a.h, a.cols);
  return (
    <React.Fragment>
      <div style={{ position:'absolute', left:-110, top:-50, bottom:-50, width:530, background:T.dc[w],
        transform:'skewX(-7deg)', transformOrigin:'top left', boxShadow:T.shadow }} />
      <div style={{ position:'absolute', left:v.bleed+8, top:0, bottom:0, width:296, color:T.dt[w],
        display:'flex', flexDirection:'column', paddingTop:20, paddingBottom:18, boxSizing:'border-box' }}>
        <div style={{ flex:1, minHeight:0, display:'flex', alignItems:'center' }}>
          <CoverIdStacked w={w} date={date} color={T.dt[w]} dayFs={37} kFs={12.5} />
        </div>
        <CoverPanelFoot doc={doc} T={T} w={w} width={286} />
      </div>
      <div style={{ position:'absolute', left:430, right:0, top:0, bottom:0, paddingLeft:8, paddingRight:padR, paddingTop:26, paddingBottom:14, boxSizing:'border-box', display:'flex', flexDirection:'column' }}>
        <div style={{ flex:'none', display:'flex', justifyContent:'flex-end' }}><RWordmark tight height={22} color={T.fg} /></div>
        {COVER_SIDE(doc,date,T,w,fit)}
        <CoverFootR T={T} doc={doc} layout="slice"  tier={plan.tier} />
      </div>
    </React.Fragment>
  );
}
/* 4 — Halftone: solid colour block dissolving into a dot field, events right */
function CoverHalftone({ doc, date, T, w }){
  const v = DAILY_VARIANTS.cover, padR = v.bleed+24, solidW = 308, plan = coverPlan(doc, date, 'halftone'), a = plan.a;
  const fit = coverFit(doc, date, a.w, a.h, a.cols);
  const acc = T.dc[w];
  const dots = (size, r) => ({ backgroundImage:'radial-gradient(circle, '+acc+' '+r+'px, transparent '+(r+0.6)+'px)', backgroundSize:size+'px '+size+'px', backgroundPosition:'center' });
  return (
    <React.Fragment>
      <div style={{ position:'absolute', left:0, top:0, bottom:0, width:solidW, background:acc, color:T.dt[w], boxShadow:T.shadowSm,
        display:'flex', flexDirection:'column', paddingLeft:v.bleed+16, paddingRight:14,
        paddingTop:18, paddingBottom:16, boxSizing:'border-box' }}>
        <div style={{ flex:1, minHeight:0, display:'flex', alignItems:'center' }}>
          <CoverIdStacked w={w} date={date} color={T.dt[w]} dayFs={28} kFs={12} />
        </div>
        <CoverPanelFoot doc={doc} T={T} w={w} width={solidW-(v.bleed+16)-14} />
      </div>
      <div style={Object.assign({ position:'absolute', left:solidW, top:0, bottom:0, width:40 }, dots(11,4.2))} />
      <div style={Object.assign({ position:'absolute', left:solidW+40, top:0, bottom:0, width:40 }, dots(15,3.3))} />
      <div style={Object.assign({ position:'absolute', left:solidW+80, top:0, bottom:0, width:42 }, dots(20,2.4))} />
      <div style={{ position:'absolute', left:430, right:0, top:0, bottom:0, paddingLeft:6, paddingRight:padR, paddingTop:26, paddingBottom:14, boxSizing:'border-box', display:'flex', flexDirection:'column' }}>
        <div style={{ flex:'none', display:'flex', justifyContent:'flex-end' }}><RWordmark tight height={22} color={T.fg} /></div>
        {COVER_SIDE(doc,date,T,w,fit)}
        <CoverFootR T={T} doc={doc} layout="halftone"  tier={plan.tier} />
      </div>
    </React.Fragment>
  );
}
/* 5 — Centered: everything on the axis, corner-safe */
function CoverCentered({ doc, date, T, w }){
  const v = DAILY_VARIANTS.cover, sp = v.bleed+24, plan = coverPlan(doc, date, 'centered'), a = plan.a;
  const fit = coverFit(doc, date, a.w, a.h, a.cols);
  return (
    <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
      paddingLeft:sp, paddingRight:sp, paddingTop:plan.tight?10:18, paddingBottom:plan.tight?10:18, boxSizing:'border-box' }}>
      <div style={{ fontFamily:R_MONT, fontWeight:700, fontSize:12, letterSpacing:'.3em', color:T.dim, textTransform:'uppercase' }}>TODAY AT REALITY</div>
      <div style={{ display:'flex', alignItems:'baseline', gap:14, marginTop:4 }}>
        <span style={{ fontFamily:R_MONT, fontWeight:700, fontSize:plan.tight?26:34, textTransform:'uppercase', color:T.fg }}>{R_DF[w]}</span>
        <span style={{ fontFamily:R_MONT, fontWeight:500, fontSize:plan.tight?19:24, color:T.dim }}>{r_dshort(date)}</span>
      </div>
      <div style={{ width:60, height:4, background:T.dc[w], margin:(plan.tight?'6px 0 8px':'9px 0 12px') }} />
      <div style={{ flex:'none', width:a.w, maxHeight:a.h, overflow:'hidden', display:'flex' }}>
        <CoverBody doc={doc} date={date} T={T} w={w} fit={fit} />
      </div>
      {/* Centered was the one cover layout that named neither the site nor the
          address — it ended on the last event. It closes like the rest now,
          centred to match rather than right-aligned. */}
      <div style={{ marginTop:10, textAlign:'center' }}>
        <CoverFootR T={T} doc={doc} centred layout="centered"  tier={plan.tier} />
      </div>
    </div>
  );
}
/* ---- the four daily-card layouts, adapted to the cover ----
   851×315 is a different problem from a 9:16 story: a fifth of the height and
   nearly three times the width, with the outer 106px cropped away on mobile.
   So these are not the story layouts scaled — they are the same STRUCTURAL
   idea re-cut for landscape. Flood keeps its floating slab but lays it wide;
   Misregister moves its plate from a masthead to a band, which is the same
   off-register gesture in the direction this canvas actually has room for;
   Spine keeps a full-height rail, which landscape suits better than portrait
   did; Chrono is the one that gains — a time axis wants width, and here it
   finally gets it. Graphics may bleed to the true edges, text never does. */

/* 6 — Flood: the day colour is the sheet; a bordered slab floats on it.
   The slab stays inside the mobile-safe centre rather than bleeding, because
   a card that reads as a card is the whole point of this one — clipped edges
   would turn it into a background. */
function CoverFlood({ doc, date, T, w }){
  const v = DAILY_VARIANTS.cover, plan = coverPlan(doc, date, 'flood'), a = plan.a;
  const fit = coverFit(doc, date, a.w, a.h, a.cols);
  const dt = T.dt[w], dim = dt===R_CREAM ? 'rgba(255,251,241,.72)' : 'rgba(13,9,5,.62)';
  return (
    <React.Fragment>
      <div style={{ position:'absolute', inset:0, background:T.dc[w] }} />
      <div style={{ position:'absolute', left:v.bleed+12, right:v.bleed+12, top:14, height:66,
        display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <CoverId T={T} w={w} date={date} color={dt} dayFs={38} kFs={12.5} />
        <RWordmark tight height={24} color={dt} />
      </div>
      {/* the slab clears the footer: with a code down there it has to clear the
          code, not just the line, or the two share the same 72px */}
      <div style={{ position:'absolute', left:v.bleed+12, right:v.bleed+12, top:88,
        bottom: 13 + coverFootH('flood', plan.qrOn, plan.tier),
        background:T.bg, border:'2px solid '+T.fg, boxShadow:'0 6px 0 rgba(13,9,5,.28)',
        padding:'14px 18px', boxSizing:'border-box', display:'flex', flexDirection:'column' }}>
        <div style={{ flex:1, minHeight:0, display:'flex' }}>
          <CoverBody doc={doc} date={date} T={T} w={w} fit={fit} />
        </div>
      </div>
      {/* Flood's footer sits on the day colour, not the slab, so it takes the
          shared atom with that ground's own dim rather than the theme's. */}
      {/* The ground here is the DAY COLOUR, not the sheet, and a QR's light
          modules have to stay light on every one of the seven — yellow through
          purple. Handing QRBlock an ink ground makes it draw its own cream tile
          instead of taking the ground for its quiet zone, so the code reads the
          same on Sunday's yellow as on Wednesday's purple. */}
      <div style={{ position:'absolute', left:v.bleed+12, right:v.bleed+12, bottom:7 }}>
        <ThemeCtx.Provider value={Object.assign({}, T, { bg:R_INK })}>
          <CoverFootR T={T} doc={doc} strong={dt} dim={dim} layout="flood"  tier={plan.tier} />
        </ThemeCtx.Provider>
      </div>
    </React.Fragment>
  );
}

/* 7 — Misregister: the house misprint. On a story this is a masthead; here it
   is a band, because 315px of height has none to spare and the offset reads
   just as clearly across the long edge. Offsets are STATIC per canon. */
function CoverMisreg({ doc, date, T, w }){
  const v = DAILY_VARIANTS.cover, sp = v.bleed+24, plan = coverPlan(doc, date, 'misreg'), a = plan.a;
  const fit = coverFit(doc, date, a.w, a.h, a.cols);
  const P = dailyPlate(T);
  const bandH = 96, OX = 26, OY = 20;
  return (
    <React.Fragment>
      {/* colour plate, offset and bleeding off the top and both sides */}
      <div style={{ position:'absolute', left:-20+OX, right:-20-OX, top:-26+OY, height:bandH+26, background:T.dc[w] }} />
      <div style={{ position:'absolute', left:-20, right:-20, top:-26, height:bandH+26, background:P.bg,
        display:'flex', alignItems:'flex-end', justifyContent:'space-between',
        paddingLeft:sp, paddingRight:sp, paddingBottom:12, boxSizing:'border-box' }}>
        <CoverId T={T} w={w} date={date} color={P.fg} dayFs={38} kFs={12.5} />
        <RWordmark tight height={24} color={P.fg} />
      </div>
      <div style={{ position:'absolute', left:0, right:0, top:bandH+OY+14, bottom:0,
        paddingLeft:sp, paddingRight:sp, paddingBottom:8, boxSizing:'border-box',
        display:'flex', flexDirection:'column' }}>
        <div style={{ flex:1, minHeight:0, display:'flex' }}>
          <CoverBody doc={doc} date={date} T={T} w={w} fit={fit} />
        </div>
        <CoverFootR T={T} doc={doc} layout="misreg"  tier={plan.tier} />
      </div>
    </React.Fragment>
  );
}

/* 8 — Spine: a full-height colour rail, day name set vertically. Landscape
   suits this better than portrait — the rail's run is the short edge, so the
   name sits at a size that reads without swallowing the canvas. The rail
   bleeds to the left edge; its type stays inside the safe centre. */
function CoverSpine({ doc, date, T, w }){
  const v = DAILY_VARIANTS.cover, rail = 196, padR = v.bleed+24, plan = coverPlan(doc, date, 'spine'), a = plan.a;
  const fit = coverFit(doc, date, a.w, a.h, a.cols);
  const dt = T.dt[w], dim = dt===R_CREAM ? 'rgba(255,251,241,.72)' : 'rgba(13,9,5,.6)';
  /* the name runs down the SHORT edge, so it is sized against 315, not 851 */
  const vName = dailyFitName(42, R_DF[w], v.h-58);
  return (
    <React.Fragment>
      <div style={{ position:'absolute', left:0, top:0, bottom:0, width:rail, background:T.dc[w],
        boxShadow:T.shadow, display:'flex', alignItems:'center', justifyContent:'flex-end',
        gap:6, paddingRight:16, boxSizing:'border-box' }}>
        <div style={{ writingMode:'vertical-rl', transform:'rotate(180deg)', fontFamily:R_MONT,
          fontWeight:800, fontSize:vName, letterSpacing:'.01em', lineHeight:1,
          textTransform:'uppercase', color:dt }}>{R_DF[w]}</div>
        <div style={{ writingMode:'vertical-rl', transform:'rotate(180deg)', fontFamily:R_GROT,
          fontWeight:500, fontSize:15, color:dim }}>{r_dshort(date)}</div>
      </div>
      <div style={{ position:'absolute', left:rail, right:0, top:0, bottom:0,
        paddingLeft:26, paddingRight:padR, paddingTop:18, paddingBottom:12,
        boxSizing:'border-box', display:'flex', flexDirection:'column' }}>
        <div style={{ flex:'none', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ fontFamily:R_MONT, fontWeight:700, fontSize:12, letterSpacing:'.2em',
            textTransform:'uppercase', color:T.dim }}>TODAY AT REALITY</div>
          <RWordmark tight height={22} color={T.fg} />
        </div>
        <div style={{ flex:'none', height:4, background:T.dc[w], margin:'10px 0 0' }} />
        <div style={{ flex:1, minHeight:0, display:'flex', paddingTop:12 }}>
          <CoverBody doc={doc} date={date} T={T} w={w} fit={fit} />
        </div>
        <CoverFootR T={T} doc={doc} layout="spine"  tier={plan.tier} />
      </div>
    </React.Fragment>
  );
}

/* 9 — Chrono: the colour as the day's time axis. This is the layout the cover
   format actually flatters — an axis wants width, and 851px is the widest
   surface the Studio has. The chip on every row means the card gains colour
   as the day fills rather than losing it. */
function CoverChrono({ doc, date, T, w }){
  const v = DAILY_VARIANTS.cover, sp = v.bleed+24, plan = coverPlan(doc, date, 'chrono'), a = plan.a;
  const fit = coverFit(doc, date, a.w, a.h, a.cols);
  const open = r_dayInfo(doc, date).status!=='closed';
  /* Chrono is the only layout carrying a third structural element — header,
     AXIS, footer — so it is the only one where a code in the footer does not
     simply fit. Rather than clip, it answers the way the daily cards answer a
     heavy day: it steps its own chrome down. The axis is the layout and stays;
     the day name and the gap above the bar give up the pixels. */
  const tight = plan.tight;
  return (
    <React.Fragment>
      <div style={{ position:'absolute', left:0, right:0, top:0, bottom:0,
        paddingLeft:sp, paddingRight:sp, paddingTop:16, paddingBottom:10,
        boxSizing:'border-box', display:'flex', flexDirection:'column' }}>
        <div style={{ flex:'none', display:'flex', alignItems:'flex-end', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'baseline', gap:12 }}>
            <div>
              <div style={{ fontFamily:R_MONT, fontWeight:700, fontSize:12, letterSpacing:'.2em',
                textTransform:'uppercase', color:T.dim }}>TODAY AT REALITY</div>
              <div style={{ fontFamily:R_MONT, fontWeight:800, fontSize:tight?30:38, lineHeight:1,
                textTransform:'uppercase', color:T.fg, marginTop:3 }}>{R_DF[w]}</div>
            </div>
            <span style={{ background:T.dc[w], color:T.dt[w], fontFamily:R_GROT, fontWeight:600,
              fontSize:16, padding:'4px 9px' }}>{r_dshort(date)}</span>
          </div>
          <RWordmark tight height={24} color={T.fg} />
        </div>
        {open && <div style={{ marginTop:tight?6:11 }}>
          <CoverAxis doc={doc} date={date} T={T} w={w} h={tight?16:20} /></div>}
        <div style={{ flex:1, minHeight:0, display:'flex', paddingTop:10 }}>
          <CoverBody doc={doc} date={date} T={T} w={w} fit={fit} chip />
        </div>
        <CoverFootR T={T} doc={doc} layout="chrono"  tier={plan.tier} />
      </div>
    </React.Fragment>
  );
}
const COVER_COMPS = { banner:CoverBanner, sidebar:CoverSidebar, slice:CoverSlice, halftone:CoverHalftone,
                      centered:CoverCentered, flood:CoverFlood, misreg:CoverMisreg, spine:CoverSpine, chrono:CoverChrono };
function CoverCard({ doc, date, onFitReport }){
  const T = themeTokens(doc.style.theme);
  const w = r_wd(date);
  const v = DAILY_VARIANTS.cover;
  const Comp = COVER_COMPS[(doc.cover && doc.cover.layout) || 'banner'] || CoverBanner;
  return (
    <ThemeCtx.Provider value={T}>
      <CoverFitCtx.Provider value={onFitReport||null}>
        <div style={{ width:v.w, height:v.h, background:T.bg, color:T.fg, position:'relative', overflow:'hidden', boxSizing:'border-box' }}>
          <Comp doc={doc} date={date} T={T} w={w} />
        </div>
      </CoverFitCtx.Provider>
    </ThemeCtx.Provider>
  );
}

export { CoverCard };
