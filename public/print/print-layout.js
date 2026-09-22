/* ============================================================
   REALITY PRINT STUDIO — shared layout: one geometry, two renderers
   ------------------------------------------------------------
   Everything the screen (print-element.jsx) and the vector PDF
   (print-export.jsx) must lay out IDENTICALLY lives here, so the
   screen stays a proof of the file: the halftone dot field, the
   silkscreen stripes, border dashes, the punch grid, the price-list
   split, text measuring / fitting / wrapping on one canvas, the
   browser's own line boxes, the arc text, the coupon stack, blend
   modes, and the riso photo options.
   (Split out of print-data.jsx, Phase 3.)
   ============================================================ */

/* ---- halftone dot field — shared by the screen + PDF renderers so they
   match exactly. The Poster Studio riso-engine halftone adapted to pure
   vector: a dot lattice (optionally rotated to a SCREEN ANGLE — the move that
   makes it read as halftone rather than a texture swatch) whose dot SIZE is
   modulated by a positional ramp (`grad`) standing in for a photo's luminance.
   `ramp` (0..1) sets how hard the size varies. Shapes: circle · square ·
   diamond · ring · plus. Returns dot centres + per-dot diameter. */
function dotFieldLayout(el){
  const W=el.w, H=el.h, base=Math.max(2,el.dot||9), gap=el.gap!=null?el.gap:6, step=base+gap;
  const cx=W/2, cy=H/2, maxR=Math.hypot(cx,cy)||1;
  const grad=el.grad||'none', ramp=el.ramp!=null?Math.max(0,Math.min(1,el.ramp)):0.8;
  const ang=(el.angle||0)*Math.PI/180, ca=Math.cos(ang), sa=Math.sin(ang);
  /* size factor from the chosen ramp (0..1), eased into [1-ramp, 1] */
  function factor(px,py){
    let v;
    switch(grad){
      case 'out':   v=Math.hypot(px-cx,py-cy)/maxR; break;            // small centre → big edge
      case 'in':    v=1-Math.hypot(px-cx,py-cy)/maxR; break;          // big centre → small edge
      case 'down':  v=py/H; break;
      case 'up':    v=1-py/H; break;
      case 'right': v=px/W; break;
      case 'left':  v=1-px/W; break;
      case 'diag':  v=((px/W)+(py/H))/2; break;
      case 'diag2': v=((px/W)+(1-py/H))/2; break;
      case 'wave':  v=0.5+0.5*Math.sin((px/W)*Math.PI*4); break;      // vertical ripples
      case 'bloom': v=0.5+0.5*Math.sin((Math.hypot(px-cx,py-cy)/maxR)*Math.PI*5); break;  // concentric rings
      default: return 1;
    }
    v=v<0?0:v>1?1:v;
    return (1-ramp) + ramp*v;
  }
  /* tile a (rotated) lattice over the box's diagonal extent, keep in-box dots */
  const ext=Math.ceil(Math.hypot(W,H)/step)+2;
  const dots=[]; let n=0;
  for(let r=-ext;r<=ext;r++){ for(let c=-ext;c<=ext;c++){
    const lx=c*step, ly=r*step;
    const px=cx + lx*ca - ly*sa, py=cy + lx*sa + ly*ca;
    if(px<-base || px>W+base || py<-base || py>H+base) continue;
    if(n++>4000) break;
    const d=Math.max(0.35, base*factor(px,py));
    dots.push({ x:px, y:py, d });
  }}
  return { dots, base, step, shape:el.shape||'circle', angle:el.angle||0 };
}

/* ---- silkscreen stripes — colored bars over the box, CLIPPED so diagonals
   stay inside the rectangle. Shared by both renderers (SVG polygons on screen,
   drawSvgPath in the PDF) so they match exactly. dir: h|v|diag|diag2.
   `count` = number of bars · `ratio` = bar width as a fraction of its period.
   (The old code mapped ratio 0.5 → full band → a solid block; this is the fix.) */
function _clipHalf(poly, a, b, c){               // keep a*x+b*y+c >= 0 — Sutherland–Hodgman against one edge
  const out=[], n=poly.length; if(!n) return out;
  for(let i=0;i<n;i++){
    const cur=poly[i], prev=poly[(i+n-1)%n];
    const dCur=a*cur[0]+b*cur[1]+c, dPrev=a*prev[0]+b*prev[1]+c;
    const inCur=dCur>=0, inPrev=dPrev>=0;
    if(inCur!==inPrev){ const t=dPrev/(dPrev-dCur); out.push([prev[0]+t*(cur[0]-prev[0]), prev[1]+t*(cur[1]-prev[1])]); }
    if(inCur) out.push(cur);
  }
  return out;
}
function stripeLayout(el){
  const W=el.w, H=el.h, n=Math.max(1, el.count||8);
  const duty=Math.max(0.05, Math.min(0.95, el.ratio!=null?el.ratio:0.5));
  const dir=el.dir||'diag', bands=[];
  if(dir==='h'){ const period=H/n, on=period*duty; for(let i=0;i<n;i++){ const y=i*period; bands.push([[0,y],[W,y],[W,y+on],[0,y+on]]); } }
  else if(dir==='v'){ const period=W/n, on=period*duty; for(let i=0;i<n;i++){ const x=i*period; bands.push([[x,0],[x+on,0],[x+on,H],[x,H]]); } }
  else {
    const sgn=dir==='diag2'?-1:1;                                  // 'diag' ↗ uses x+y · 'diag2' ↘ uses x−y
    const corners=[[0,0],[W,0],[0,H],[W,H]].map(p=>p[0]+sgn*p[1]);
    const tMin=Math.min.apply(null,corners), tMax=Math.max.apply(null,corners);
    const period=(tMax-tMin)/n, on=period*duty, box=[[0,0],[W,0],[W,H],[0,H]];
    for(let i=0;i<n;i++){
      const lo=tMin+i*period, hi=lo+on;
      let p=_clipHalf(box, 1, sgn, -lo);          // x+sgn*y >= lo
      p=_clipHalf(p, -1, -sgn, hi);               // x+sgn*y <= hi
      if(p.length>=3) bands.push(p);
    }
  }
  return { bands, dir };
}

/* ---- sunburst rays, rules / dividers, shapes, rounded rects and icon
   geometry are ../studio-shared/shapes.js — the one copy Poster Studio draws
   from too, so screen SVG, PDF vector and poster all build IDENTICAL
   geometry (LOCAL coords, y-down). pdf-lib's drawSvgPath consumes the same
   path strings via localPath(). ---- */
/* ---- border style → dash array + cap. Shared by the screen border overlay and
   the PDF stroke so a dashed/dotted/dash-dot box border is WYSIWYG. Both stroke
   the SAME roundedRectPath (shapes.js), so the dash phase lands identically at the corners.
   Values scale with the stroke width so the rhythm holds at any weight. ---- */
function borderDash(pattern, w){
  w=Math.max(0.5, w||1);
  if(pattern==='dashed')  return { dash:[w*2.6, w*1.9], cap:'butt'  };
  if(pattern==='dotted')  return { dash:[0.01,  w*2.0], cap:'round' };
  if(pattern==='dashdot') return { dash:[w*2.8, w*1.7, 0.01, w*1.7], cap:'round' };
  return { dash:null, cap:'butt' };   // solid
}
/* ---- punch card grid — the loyalty-stamp lattice. cols×rows cells, each an
   outlined circle/square/star; optional numbering; optional filled bonus on
   the LAST cell (the "10th one free"). One layout for both renderers. */
function punchLayout(el){
  const cols=Math.max(1, el.cols|0||5), rows=Math.max(1, el.rows|0||2);
  const gap=el.gap!=null?el.gap:8;
  const cw=(el.w-(cols-1)*gap)/cols, ch=(el.h-(rows-1)*gap)/rows;
  const d=Math.max(6, Math.min(cw, ch));
  const ox=(el.w-(cols*cw+(cols-1)*gap))/2, oy=(el.h-(rows*ch+(rows-1)*gap))/2;
  const cells=[]; let n=0;
  for(let r=0;r<rows;r++) for(let c=0;c<cols;c++){
    n++;
    cells.push({ cx:ox+c*(cw+gap)+cw/2, cy:oy+r*(ch+gap)+ch/2, d, n });
  }
  return { cells, d, total:n, stroke:el.stroke!=null?el.stroke:1.5, shape:el.cell||'circle' };
}

/* balanced column split for the price list (reading DOWN each column) */
function listSplit(items, cols){
  items = items||[]; cols = Math.max(1, Math.min(3, cols|0||1));
  if(cols===1) return [items];
  const per = Math.ceil(items.length/cols), out=[];
  for(let i=0;i<cols;i++) out.push(items.slice(i*per, (i+1)*per));
  return out.filter(a=>a.length);
}
/* price-list row sizing — one vocabulary both renderers read */
/* Row rungs come off the print type scale. XXL was added for the A3/A2
   boards, where 20pt is a menu size, not a board-across-the-room size. */
const LIST_ROW_SIZES = { s:11, m:13, l:16, xl:20, xxl:28 };
function listRowFont(el){ return LIST_ROW_SIZES[el.rowSize||'m'] || 13; }

/* ---- shared text measuring (screen + the in-browser PDF export use the same
   canvas, so fitted + arc sizes match). ---- */
let _measCtx=null;
function _measCanvas(){ if(!_measCtx){ const c=document.createElement('canvas'); _measCtx=c.getContext('2d'); } return _measCtx; }
function _cssFam(fam){ return fam==='grot'?"'Space Grotesk'":fam==='alt'?"'Montserrat Alternates'":"'Montserrat'"; }
function measureTextW(str, fam, weight, size, tracking){ const cx=_measCanvas(); cx.font=(weight||700)+' '+size+"px "+_cssFam(fam); const n=Array.from(str||'').length; return cx.measureText(str||'').width + Math.max(0,n-1)*(tracking||0)*size; }
/* shrink `size` until every line fits maxW — the Poster seFitText idea generalised */
function fitTextSize(lines, fam, weight, maxW, startSize, tracking){
  let size=startSize;
  while(size>6){ let ok=true; for(const ln of lines){ if(measureTextW(ln,fam,weight,size,tracking)>maxW){ ok=false; break; } } if(ok) break; size-=1; }
  return size;
}
/* per-glyph placement of `text` along a circle centred in the box. flip=false
   → top arc (reads L→R over the top); flip=true → bottom arc (upright along
   the bottom). deg = upright tangent rotation (screen degrees, y-down). */
function arcTextLayout(text, w, h, opts){
  opts=opts||{}; const fontSize=opts.fontSize||24, tracking=opts.tracking||0, flip=!!opts.flip, fam=opts.fam||'mont', weight=opts.weight||700;
  const chars=Array.from(opts.upper!==false?(text||'').toUpperCase():(text||''));
  const cx=_measCanvas(); cx.font=weight+' '+fontSize+"px "+_cssFam(fam);
  const adv=chars.map(c=> cx.measureText(c).width + tracking*fontSize);
  const total=adv.reduce((a,b)=>a+b,0), ccx=w/2, ccy=h/2;
  const R=Math.max(8, (opts.radius!=null?opts.radius : Math.min(w,h)/2 - fontSize*0.62) + (opts.radiusAdj||0));
  const span=total/R, glyphs=[];
  if(!flip){ let a=-Math.PI/2 - span/2; for(let i=0;i<chars.length;i++){ const da=adv[i]/R, mid=a+da/2; glyphs.push({ch:chars[i], x:ccx+Math.cos(mid)*R, y:ccy+Math.sin(mid)*R, deg:(mid+Math.PI/2)*180/Math.PI}); a+=da; } }
  else { let a=Math.PI/2 + span/2; for(let i=0;i<chars.length;i++){ const da=adv[i]/R, mid=a-da/2; glyphs.push({ch:chars[i], x:ccx+Math.cos(mid)*R, y:ccy+Math.sin(mid)*R, deg:(mid-Math.PI/2)*180/Math.PI}); a-=da; } }
  return { glyphs, R, cx:ccx, cy:ccy, fontSize };
}

/* where the browser actually puts a baseline. Blink rounds a font's ascent and
   descent to whole pixels AT THE USED SIZE and floors the half-leading, so
   metrics sampled at one size and scaled to another land up to a point out —
   Montserrat 700 is 0.97/0.25 em at 100px but a flat 1.0/0.3 at 10px. Nothing
   short of asking the engine reproduces that, so probe a real line box and let
   the PDF draw on the number the browser reports. One hidden layout per
   (face, size, leading), cached once the webfonts are in. */
let _lbHost=null; const _lbCache=new Map();
function _lbProbe(fam, weight, size, lh){
  if(!_lbHost){ _lbHost=document.createElement('div');
    _lbHost.style.cssText='position:fixed;left:-9999px;top:0;visibility:hidden;pointer-events:none';
    document.body.appendChild(_lbHost); }
  const d=document.createElement('div');
  d.style.cssText=`font-family:${_cssFam(fam)};font-weight:${weight};font-size:${size}px;line-height:${lh};white-space:pre`;
  /* a zero-box inline-block sits ON the baseline — its top IS the baseline y */
  const s=document.createElement('span');
  s.style.cssText='display:inline-block;width:0;height:0;vertical-align:baseline';
  d.appendChild(s); d.appendChild(document.createTextNode('Hxg'));
  _lbHost.appendChild(d);
  const dr=d.getBoundingClientRect(), sr=s.getBoundingClientRect();
  const out={ h:dr.height, base:sr.top-dr.top };
  _lbHost.removeChild(d);
  return out;
}
/* leading null = CSS `normal` (whatever the face asks for) */
function lineBox(fam, weight, size, leading){
  const key=fam+'/'+weight+'/'+size+'/'+(leading==null?'n':leading);
  const hit=_lbCache.get(key); if(hit) return hit;
  const lineH = leading!=null ? size*leading : _lbProbe(fam,weight,size,'normal').h;
  const box={ lineH, baseOff:_lbProbe(fam,weight,size,lineH+'px').base };
  if(document.fonts && document.fonts.status==='loaded') _lbCache.set(key,box);
  return box;
}
/* greedy wrap on the shared canvas — screen and PDF break at the same words */
function wrapTextW(text, fam, weight, size, tracking, maxW){
  const out=[];
  (text||'').split('\n').forEach(par=>{
    const words=par.split(/\s+/).filter(w=>w.length);
    if(!words.length){ out.push(''); return; }
    let cur='';
    for(const w of words){ const t=cur?cur+' '+w:w;
      if(!cur || measureTextW(t,fam,weight,size,tracking)<=maxW) cur=t; else { out.push(cur); cur=w; } }
    if(cur) out.push(cur);
  });
  return out;
}

/* ---- coupon stack — ONE layout, read by the screen and by the PDF exporter.
   It used to be computed twice: the screen leaned on flex `space-between`
   while the exporter hard-coded offsets (big at pad+18, terms at h-28). Those
   only ever agreed on a ~150pt-tall coupon; on a short one the PDF printed the
   headline straight through the terms line. Everything is measured here now —
   wraps, block heights, the space-between gaps, every baseline — and both
   sides just draw what they're handed. `big` steps down if the stack would
   overrun the box, so nothing is clipped on screen or spilled past the border
   in the PDF. ---- */
const COUPON_PAD_X = 14, COUPON_PAD_Y = 12;
function couponLayout(el){
  /* the screen box carries a transparent CSS border (border-box), so its
     content starts that far in — the PDF has to inset by the same amount. */
  const surfaced = el.surface && el.surface!=='none';
  const inset = surfaced ? (el.border!=null?el.border:2) : 1.6;
  const padX = COUPON_PAD_X+inset, padY = COUPON_PAD_Y+inset;
  const maxW = Math.max(1, el.w-padX*2), availH = Math.max(0, el.h-padY*2);

  function textBlock(key, str, fam, weight, size, tracking, leading, upper, opacity){
    const t = upper ? (str||'').toUpperCase() : (str||'');
    if(!t) return null;
    const lb = lineBox(fam, weight, size, leading), lines = wrapTextW(t, fam, weight, size, tracking, maxW);
    return { kind:'text', key, lines, fam, weight, size, tracking, opacity, lineH:lb.lineH, left:padX,
             baseOff:lb.baseOff, h:lines.length*lb.lineH };
  }
  function chipBlock(){
    if(!el.code) return null;
    const fam='mont', weight=700, size=10, tracking=0.1, lb=lineBox(fam,weight,size,null);
    return { kind:'chip', key:'code', text:el.code, fam, weight, size, tracking, left:padX,
             w:measureTextW(el.code,fam,weight,size,tracking)+16, h:lb.lineH+6, padX:8, baseOff:3+lb.baseOff };
  }

  /* step the headline down until the stack fits — a coupon printed past its own
     cut line is worse than a smaller headline. Never below the 10pt kicker. */
  const nominal = Math.min(el.w*0.12, 26), floor = 11;
  let bs = nominal, blocks, total;
  for(;;){
    blocks = [
      textBlock('heading', el.heading, 'mont', 700, 10, 0.22, null, true),
      textBlock('big',     el.big,     'mont', 800, bs, 0,    0.95, true),
      textBlock('terms',   el.terms,   'grot', 400, 9,  0,    null, false, 0.8),
      chipBlock()
    ].filter(Boolean);
    total = blocks.reduce((s,b)=>s+b.h, 0);
    if(total<=availH || bs<=floor) break;
    bs = Math.max(floor, bs-1);
  }
  /* space-between: leftover height splits into the gaps, and a stack that still
     overruns packs from the top with no gap — exactly what flexbox does. */
  const gap = blocks.length>1 ? Math.max(0, (availH-total)/(blocks.length-1)) : 0;
  let y = padY;
  blocks.forEach(b=>{ b.top=y; y += b.h+gap; });
  return { blocks, padX, padY, inset, maxW, bigSize:bs };
}

/* ---- blend modes — riso overprint. Shared by screen (mix-blend-mode) + the
   PDF (pdf-lib BlendMode); CSS names map 1:1, the PDF enum is PascalCase. ---- */
const BLEND_MODES=['normal','multiply','screen','overlay','darken','lighten','hard-light'];
function blendCss(b){ return (!b||b==='normal')?null:b; }
function blendPdf(b){ const m={multiply:'Multiply',screen:'Screen',overlay:'Overlay',darken:'Darken',lighten:'Lighten','hard-light':'HardLight'}; return m[b]||null; }

/* ---- riso photo options — map a photo element's props onto the RISO engine's
   render opts. Shared by the screen renderer + the PDF rasteriser so the
   exported image matches the preview exactly. paper is always 'day' (light
   polarity) on the engine's `white` STOCK — Print's true-white paper, which
   used to be a patched fork of the engine and is now just a stock the shared
   press knows; the accent ink follows the doc accent unless overridden. */
function risoOpts(el, docAccent){
  const ink = el.followAccent!==false ? docAccent : (el.ink||'pink');
  return {
    ink, ink2:el.ink2, paper:'day', stock: el.stock||'white',
    contrast:el.contrast, brightness:el.brightness, dot:el.dot, bands:el.bands, threshold:el.threshold,
    angle:el.angle, softness:el.softness, balance:el.balance, shadowTint:el.shadowTint,
    invert:el.invert, spread:el.spread, shape:el.shape, split:el.split, offset:el.offset,
    inkMode:el.inkMode, gradMode:el.gradMode, gradAngle:el.gradAngle, gradA:el.gradA, gradB:el.gradB,
    screenOffset:el.screenOffset, field:el.field, fieldInk:el.fieldInk, fieldStrength:el.fieldStrength,
    dotGain:el.dotGain, jitter:el.jitter, pucker:el.pucker,
    spotLo:el.spotLo, spotHi:el.spotHi, spotSoft:el.spotSoft, spotInvert:el.spotInvert, spotBase:el.spotBase,
    transparent:false, fit:el.fit||'cover', paperFill:null,
    blurUnder:el.blurUnder, blurOver:el.blurOver, grain:el.grain, grainSize:el.grainSize,
    /* the separation press — the dials Print exposes; the rest ride the
       engine's defaults (see riso-press.js DEFAULTS) */
    inks:el.inks, opaque:el.opaque, invertSource:el.invertSource, screen:el.screen, sepShape:el.sepShape,
    pitch:el.pitch, grainPitch:el.grainPitch, levels:el.levels, sepGCR:el.sepGCR, sepBoost:el.sepBoost, tac:el.tac,
    gain:el.gain, linear:el.linear, drift:el.drift, skew:el.skew, stretch:el.stretch, drumStreak:el.drumStreak,
    drumBand:el.drumBand, starve:el.starve, wet:el.wet, pull:el.pull, pressRun:el.pressRun,
    proofPlate:el.proofPlate, proofGrey:el.proofGrey, saturation:el.saturation, sep:el.sep
  };
}

export {
  dotFieldLayout, stripeLayout, borderDash, punchLayout, listSplit, LIST_ROW_SIZES, listRowFont,
  measureTextW, fitTextSize, arcTextLayout, lineBox, wrapTextW, couponLayout,
  BLEND_MODES, blendCss, blendPdf, risoOpts,
};
