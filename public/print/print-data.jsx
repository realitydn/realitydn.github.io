/* ============================================================
   REALITY PRINT STUDIO — shared data + utilities
   Printed materials around the bar: info/wayfinding signs, QR
   standees, happy-hour & specials, price tags, coupons/vouchers.
   A8 → A1, true-white paper, CMYK-aware, vector PDF out.

   Forked from the Poster Studio but with three deliberate
   departures:
     • the working unit is the PDF POINT (pt), so layout maps 1:1
       into the exported vector PDF (just a y-flip + bleed offset);
     • there is no day/night THEME — print has no night mode, the
       paper is true white (#fff / CMYK 0,0,0,0);
     • each document is ONE A-size (not a master reflowed to many),
       with a Resize control that rescales the layout in place.

   Exports to window: PALETTE, PALETTE_CMYK, INK, WHITE, ACCENTS,
   SIZES, SIZE_ORDER, GANG, PT_PER_MM, sizeDims, TYPE_SCALE, FACES,
   faceFor, CATALOG, DEFAULTS, makeElement, uid, slugify,
   contrastInk, surfaceStyle, resolveInk, buildQR, TEMPLATES,
   TEMPLATE_GROUPS, buildTemplate
   ============================================================ */

/* ---- brand palette (LOCKED) — screen RGB ---- */
const PALETTE = {
  blue:'#18a7e0', green:'#43b02a', yellow:'#fddf00',
  amber:'#fdb515', purple:'#6e3179', pink:'#ed1b72', red:'#ed2224'
};
/* Canonical CMYK build of each locked accent [c,m,y,k] 0..1. The browser
   renders the RGB hex above; the PDF is filled with THESE, so saturated
   hues (blue, green, yellow) don't blow out on a coated press. Seeded from
   a coated-stock reading — tune against a test print and they propagate. */
const PALETTE_CMYK = {
  blue:  [0.78, 0.18, 0.00, 0.00],
  green: [0.72, 0.00, 0.95, 0.00],
  yellow:[0.00, 0.07, 1.00, 0.00],
  amber: [0.00, 0.32, 0.95, 0.00],
  purple:[0.62, 0.88, 0.00, 0.10],
  pink:  [0.00, 0.92, 0.22, 0.00],
  red:   [0.00, 0.92, 0.88, 0.00],
};
const ACCENTS = ['blue','green','yellow','amber','purple','pink','red'];

/* Ink = the text/line black. On screen a hair off pure so it sits kindly on
   white; in the PDF it is K-ONLY (CMYK 0,0,0,1) so type rides the black plate
   alone — one ink, crisp registration, no colour fringing on small text.
   White = the paper; in print it is "no ink" (0,0,0,0), never a fill. */
const INK   = { rgb:'#111111', cmyk:[0,0,0,1] };
const WHITE = { rgb:'#ffffff', cmyk:[0,0,0,0] };

/* ---- A-series, portrait base, exact ISO millimetres ---- */
const PT_PER_MM = 72 / 25.4;                 // 2.834645…  (1pt = 1/72")
const SIZES = {
  a8:{ mm:[52,74],   label:'A8', sub:'COUPON' },
  a7:{ mm:[74,105],  label:'A7', sub:'TAG' },
  a6:{ mm:[105,148], label:'A6', sub:'CARD' },
  a5:{ mm:[148,210], label:'A5', sub:'SIGN' },
  a4:{ mm:[210,297], label:'A4', sub:'SIGN' },
  a3:{ mm:[297,420], label:'A3', sub:'POSTER' },
  a2:{ mm:[420,594], label:'A2', sub:'POSTER' },
  a1:{ mm:[594,841], label:'A1', sub:'STANDEE' },
  /* square die-cut sticker stock — the trim is square; the visible shape
     (circle / rounded / squircle) is the `sticker` element drawn inside.
     Not in GANG (a die-cut printer gangs + cuts them); for DIY sheets use a
     small A-size + "Gang on A4". */
  st50: { mm:[50,50],   label:'S50',  sub:'STICKER' },
  st75: { mm:[75,75],   label:'S75',  sub:'STICKER' },
  st100:{ mm:[100,100], label:'S100', sub:'STICKER' },
};
const SIZE_ORDER = ['a8','a7','a6','a5','a4','a3','a2','a1','st50','st75','st100'];

/* Physical + working dims for a size at an orientation. Working canvas unit
   IS the point, so wpt/hpt are both the on-screen artboard size and the PDF
   page (trim) size. */
function sizeDims(size, orient){
  const s = SIZES[size] || SIZES.a5;
  let [wmm, hmm] = s.mm;
  if(orient === 'landscape'){ const t = wmm; wmm = hmm; hmm = t; }
  return { wmm, hmm, wpt: wmm*PT_PER_MM, hpt: hmm*PT_PER_MM };
}

/* Gang smaller pieces onto one A4 sheet for bulk runs (coupons, tags). Each
   entry: how the A-size tiles A4, and the orientation of the cell — A-paper
   halves with a 90° flip each step, so the cell orientation alternates. The
   piece is stamped (rotated if its own orientation differs) into every cell;
   cut guides ride the grid lines for the guillotine. */
const GANG = {
  a5:{ cols:1, rows:2, cell:'landscape', per:2  },
  a6:{ cols:2, rows:2, cell:'portrait',  per:4  },
  a7:{ cols:2, rows:4, cell:'landscape', per:8  },
  a8:{ cols:4, rows:4, cell:'portrait',  per:16 },
};

/* ---- type scale (pt) — sizes snap to these ---- */
const TYPE_SCALE = [7,8,9,10,11,12,14,16,18,21,24,28,33,39,46,54,64,76,90,108,128];
function snapToScale(v){ let b=TYPE_SCALE[0], d=Infinity; for(const s of TYPE_SCALE){ const dd=Math.abs(s-v); if(dd<d){ d=dd; b=s; } } return b; }
function scaleStep(v, dir){ let i=TYPE_SCALE.indexOf(snapToScale(v)); i=Math.max(0,Math.min(TYPE_SCALE.length-1,i+dir)); return TYPE_SCALE[i]; }

/* ---- font faces — one TTF per (family, weight). The export engine fetches
   + embeds (subset) these; the screen uses the same families via Google
   Fonts (index.html). ---- */
const FACES = {
  'mont-100':    { file:'fonts/montserrat-100.ttf',     css:"'Montserrat',sans-serif",            fam:'mont', weight:100 },
  'mont-500':    { file:'fonts/montserrat-500.ttf',     css:"'Montserrat',sans-serif",            fam:'mont', weight:500 },
  'mont-700':    { file:'fonts/montserrat-700.ttf',     css:"'Montserrat',sans-serif",            fam:'mont', weight:700 },
  'mont-800':    { file:'fonts/montserrat-800.ttf',     css:"'Montserrat',sans-serif",            fam:'mont', weight:800 },
  'mont-alt-600':{ file:'fonts/montserrat-alt-600.ttf', css:"'Montserrat Alternates',sans-serif", fam:'alt',  weight:600 },
  'grot-400':    { file:'fonts/space-grotesk-400.ttf',  css:"'Space Grotesk',sans-serif",         fam:'grot', weight:400 },
  'grot-500':    { file:'fonts/space-grotesk-500.ttf',  css:"'Space Grotesk',sans-serif",         fam:'grot', weight:500 },
};
/* Nearest embedded face for a family + desired weight. */
function faceFor(fam, weight){
  if(fam==='alt') return 'mont-alt-600';
  if(fam==='grot') return weight>=500 ? 'grot-500' : 'grot-400';
  // mont — Thin (100) is the Year 2 display weight for big category headers
  if(weight<=200) return 'mont-100';
  if(weight>=800) return 'mont-800';
  if(weight>=650) return 'mont-700';
  return 'mont-500';
}

/* ---- colour resolution (screen) ---- */
function contrastInk(hex){
  if(typeof hex!=='string' || hex[0]!=='#' || hex.length<7) return INK.rgb;
  const r=parseInt(hex.slice(1,3),16)/255, g=parseInt(hex.slice(3,5),16)/255, b=parseInt(hex.slice(5,7),16)/255;
  const L=0.2126*r+0.7152*g+0.0722*b;
  return L<0.55 ? WHITE.rgb : INK.rgb;
}
/* An element's ink choice → screen hex. 'ink'/'white' literal; an accent name
   → its hex; 'auto' → the supplied fallback (surface contrast or doc accent). */
function resolveInk(key, fallback){
  if(key==='auto' || key==null) return fallback;
  if(key==='ink') return INK.rgb;
  if(key==='white') return WHITE.rgb;
  if(ACCENTS.indexOf(key)>=0) return PALETTE[key];
  return fallback;
}
/* Surface → concrete box style (screen). Flat only — no scrim/blur on paper. */
function surfaceStyle(surface, accentHex){
  const bw = 1.6;
  switch(surface){
    case 'solid':   return { background:INK.rgb,   color:WHITE.rgb,            border:`${bw}px solid ${INK.rgb}` };
    case 'paper':   return { background:WHITE.rgb, color:INK.rgb,             border:`${bw}px solid ${INK.rgb}` };
    case 'accent':  return { background:accentHex, color:contrastInk(accentHex), border:`${bw}px solid ${accentHex}` };
    case 'outline': return { background:'transparent', color:INK.rgb,         border:`${bw}px solid ${INK.rgb}` };
    default:        return { background:'transparent', color:INK.rgb,         border:`${bw}px solid transparent` };
  }
}

/* REALITY wordmark as one combined vector path (the 7 letter subpaths of the
   site Logo, joined). drawn by the PDF exporter via drawSvgPath; the screen
   uses the inline <svg> in print-element.jsx. Same glyph outlines. */
const WORDMARK_PATH = [
  'M73.4,63.7V13.3h20.7c4.5,0,8.3.7,11.5,2.1,3.2,1.4,5.7,3.5,7.4,6.2,1.7,2.7,2.6,5.9,2.6,9.6s-.9,6.9-2.6,9.5c-1.7,2.6-4.2,4.7-7.4,6.1-3.2,1.4-7,2.2-11.5,2.2h-15.5l4.1-4.2v18.9h-9.4ZM82.7,45.9l-4.1-4.5h15c4.1,0,7.2-.9,9.3-2.7,2.1-1.8,3.1-4.2,3.1-7.4s-1-5.6-3.1-7.4c-2.1-1.8-5.2-2.6-9.3-2.6h-15l4.1-4.6v29.2ZM106.3,63.7l-12.7-18.3h10l12.8,18.3h-10.1Z',
  'M142.6,55.8h28.4v7.9h-37.8V13.3h36.8v7.9h-27.4v34.6ZM141.8,34.3h25.1v7.7h-25.1v-7.7Z',
  'M188.2,63.7v-27.9c0-5,.9-9.3,2.8-12.7s4.5-6.1,7.8-7.8c3.4-1.8,7.2-2.6,11.7-2.6s8.4.9,11.8,2.6c3.4,1.8,6,4.4,7.8,7.8,1.8,3.5,2.8,7.7,2.8,12.7v27.9h-9.3v-28.8c0-4.8-1.2-8.3-3.6-10.6-2.4-2.3-5.6-3.5-9.5-3.5s-7.2,1.2-9.5,3.5c-2.4,2.3-3.6,5.9-3.6,10.6v28.8h-9.2ZM194.1,50.7v-7.8h32.8v7.8h-32.8Z',
  'M253.3,63.7V13.3h9.4v42.5h26.4v7.9h-35.7Z',
  'M299.8,21.2v-7.9h27.9v7.9h-27.9ZM299.8,63.7v-7.9h27.9v7.9h-27.9ZM309,62.6V14.3h9.4v48.3h-9.4Z',
  'M354.8,63.7V21.2h-16.7v-7.9h42.8v7.9h-16.7v42.5h-9.4Z',
  'M415.7,71.4c-4.2,0-8.1-.6-11.5-1.9-3.5-1.2-6.4-3-8.7-5.2l3.8-7.2c2.3,2,4.7,3.5,7.5,4.5,2.7,1,5.7,1.5,9,1.5s7.8-1.2,10.2-3.5c2.3-2.4,3.5-6,3.5-10.9v-9.8l2.7,1.2c-1.6,3.9-4,6.7-7,8.5-3,1.8-6.6,2.7-10.6,2.7-6.3,0-11.3-1.8-14.8-5.4-3.5-3.6-5.3-8.9-5.3-15.7V13.3h9.4v16.5c0,4.5,1.1,7.9,3.3,10.1,2.2,2.2,5.1,3.3,8.8,3.3s7.2-1.2,9.7-3.5c2.5-2.3,3.7-6,3.7-10.9v-15.6h9.4v35c0,5.1-.9,9.3-2.8,12.7s-4.5,6-7.9,7.7c-3.4,1.8-7.5,2.7-12.2,2.7Z'
].join(' ');

/* mandatory brand strings (style guide §11) — always full diacritics */
const ADDR = '86 Mai Thúc Lân · Đà Nẵng';
const SITE = 'www.realitydn.com';

/* Misregistration partners — the second silkscreen layer (--accent-2). An
   element's "echo" ghost is drawn offset in its partner colour, the riso
   overprint move. Lifted from the poster riso-engine PARTNER map. */
const PARTNER = { pink:'blue', red:'blue', amber:'purple', yellow:'pink', blue:'pink', green:'purple', purple:'amber' };
function partnerOf(accent){ return PARTNER[accent] || 'blue'; }

/* Flat straight-down shadow — the lifted-edge plane (style guide §05).
   On the white sheet it prints as a soft K tint. {dy, k} per step. */
const LIFT = { none:null, light:{dy:4,k:0.08}, default:{dy:8,k:0.12}, heavy:{dy:12,k:0.18} };

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

/* ---- sunburst rays — `n` filled wedges within a centred disc, half-slice
   gaps between them give the classic ray pop. Pure vector; both renderers
   build the same triangles so screen + PDF match. */
function burstRays(W,H,rays,spinDeg){
  const n=Math.max(3, rays|0), R=Math.min(W,H)/2*1.06, cx=W/2, cy=H/2;
  const spin=(spinDeg||0)*Math.PI/180, slice=Math.PI*2/n;
  const wedges=[];
  for(let i=0;i<n;i++){
    const a0=spin+i*slice, a1=a0+slice/2;           // lit half of each slice
    wedges.push({ cx, cy,
      p0:[cx+Math.cos(a0)*R, cy+Math.sin(a0)*R],
      p1:[cx+Math.cos(a1)*R, cy+Math.sin(a1)*R] });
  }
  return { wedges, cx, cy, R };
}

/* ---- shared vector geometry — used by BOTH renderers so shapes/beds match
   exactly. Paths are SVG path strings in LOCAL, y-DOWN element coords (0..w,
   0..h); pdf-lib's drawSvgPath consumes the same string via localPath(). ---- */
function roundedRectPath(ox,oy,w,h,r){
  r=Math.max(0,Math.min(r, Math.min(w,h)/2));
  if(r<=0) return `M ${ox} ${oy} L ${ox+w} ${oy} L ${ox+w} ${oy+h} L ${ox} ${oy+h} Z`;
  const x=ox,y=oy;
  return `M ${x+r} ${y} L ${x+w-r} ${y} Q ${x+w} ${y} ${x+w} ${y+r} `
       + `L ${x+w} ${y+h-r} Q ${x+w} ${y+h} ${x+w-r} ${y+h} `
       + `L ${x+r} ${y+h} Q ${x} ${y+h} ${x} ${y+h-r} `
       + `L ${x} ${y+r} Q ${x} ${y} ${x+r} ${y} Z`;
}
function _poly(pts){ return 'M '+pts.map(p=>p[0].toFixed(2)+' '+p[1].toFixed(2)).join(' L ')+' Z'; }
function _regPoly(cx,cy,r,n,startDeg){ const p=[]; for(let i=0;i<n;i++){ const a=(startDeg+i*360/n)*Math.PI/180; p.push([cx+Math.cos(a)*r, cy+Math.sin(a)*r]); } return _poly(p); }
function _star(cx,cy,R,n,inner,startDeg){ const p=[]; for(let i=0;i<n*2;i++){ const r=i%2?R*inner:R, a=(startDeg+i*180/n)*Math.PI/180; p.push([cx+Math.cos(a)*r, cy+Math.sin(a)*r]); } return _poly(p); }
function _scalePath(d,w,h){ let i=0; return d.replace(/-?\d*\.?\d+/g, m=> ((i++%2)===0 ? parseFloat(m)*w : parseFloat(m)*h).toFixed(2) ); }
/* kind → path for a w×h box. circle/ellipse return null (renderers draw an
   ellipse). Polygons inscribe in the short-side circle (stay regular); box
   shapes fill the rectangle. */
const SHAPE_KINDS=['circle','rounded','squircle','rect','pill','triangle','diamond','pentagon','hexagon','octagon','star5','star6','chevron','cross','banner','shield','arch','heart','blob'];
function shapePath(kind, w, h){
  const cx=w/2, cy=h/2, R=Math.min(w,h)/2;
  switch(kind){
    case 'circle': case 'ellipse': return null;
    case 'rect':     return _poly([[0,0],[w,0],[w,h],[0,h]]);
    case 'rounded':  return roundedRectPath(0,0,w,h,Math.min(w,h)*0.18);
    case 'squircle': return roundedRectPath(0,0,w,h,Math.min(w,h)*0.32);
    case 'pill':     return roundedRectPath(0,0,w,h,Math.min(w,h)/2);
    case 'triangle': return _poly([[cx,0],[w,h],[0,h]]);
    case 'diamond':  return _poly([[cx,0],[w,cy],[cx,h],[0,cy]]);
    case 'pentagon': return _regPoly(cx,cy,R,5,-90);
    case 'hexagon':  return _regPoly(cx,cy,R,6,-90);
    case 'octagon':  return _regPoly(cx,cy,R,8,-67.5);
    case 'star5':    return _star(cx,cy,R,5,0.42,-90);
    case 'star6':    return _star(cx,cy,R,6,0.5,-90);
    case 'chevron':  return _poly([[0,0],[w*0.62,0],[w,cy],[w*0.62,h],[0,h],[w*0.34,cy]]);
    case 'cross':    { const ax=w*0.33, ay=h*0.33; return _poly([[ax,0],[w-ax,0],[w-ax,ay],[w,ay],[w,h-ay],[w-ax,h-ay],[w-ax,h],[ax,h],[ax,h-ay],[0,h-ay],[0,ay],[ax,ay]]); }
    case 'banner':   { const d=Math.min(w*0.12,h*0.5); return _poly([[0,0],[w,0],[w-d,cy],[w,h],[0,h],[d,cy]]); }
    case 'shield':   return `M 0 0 L ${w} 0 L ${w} ${(h*0.52).toFixed(2)} Q ${w} ${(h*0.92).toFixed(2)} ${cx} ${h} Q 0 ${(h*0.92).toFixed(2)} 0 ${(h*0.52).toFixed(2)} Z`;
    case 'arch':     { const a=Math.min(w/2,h*0.7).toFixed(2); return `M 0 ${h} L 0 ${a} Q 0 0 ${cx} 0 Q ${w} 0 ${w} ${a} L ${w} ${h} Z`; }
    case 'heart':    return _scalePath('M 0.5 0.95 C 0.0 0.62 0.05 0.16 0.32 0.16 C 0.44 0.16 0.5 0.30 0.5 0.36 C 0.5 0.30 0.56 0.16 0.68 0.16 C 0.95 0.16 1.0 0.62 0.5 0.95 Z', w, h);
    case 'blob':     return _scalePath('M 0.50 0.03 C 0.80 0.0 1.0 0.24 0.97 0.52 C 0.94 0.80 0.80 1.0 0.50 0.97 C 0.18 1.0 0.03 0.78 0.05 0.50 C 0.0 0.20 0.20 0.05 0.50 0.03 Z', w, h);
    default:         return _poly([[0,0],[w,0],[w,h],[0,h]]);
  }
}

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

/* ---- blend modes — riso overprint. Shared by screen (mix-blend-mode) + the
   PDF (pdf-lib BlendMode); CSS names map 1:1, the PDF enum is PascalCase. ---- */
const BLEND_MODES=['normal','multiply','screen','overlay','darken','lighten','hard-light'];
function blendCss(b){ return (!b||b==='normal')?null:b; }
function blendPdf(b){ const m={multiply:'Multiply',screen:'Screen',overlay:'Overlay',darken:'Darken',lighten:'Lighten','hard-light':'HardLight'}; return m[b]||null; }

/* ---- riso photo options — map a photo element's props onto the RISO engine's
   render opts. Shared by the screen renderer + the PDF rasteriser so the
   exported image matches the preview exactly. paper is always 'day' (Print's
   true-white paper); the accent ink follows the doc accent unless overridden. */
function risoOpts(el, docAccent){
  const ink = el.followAccent!==false ? docAccent : (el.ink||'pink');
  return {
    ink, ink2:el.ink2, paper:'day',
    contrast:el.contrast, brightness:el.brightness, dot:el.dot, bands:el.bands, threshold:el.threshold,
    angle:el.angle, softness:el.softness, balance:el.balance, shadowTint:el.shadowTint,
    invert:el.invert, spread:el.spread, shape:el.shape, split:el.split, offset:el.offset,
    inkMode:el.inkMode, gradMode:el.gradMode, gradAngle:el.gradAngle, gradA:el.gradA, gradB:el.gradB,
    screenOffset:el.screenOffset, field:el.field, fieldInk:el.fieldInk, fieldStrength:el.fieldStrength,
    dotGain:el.dotGain, jitter:el.jitter, pucker:el.pucker,
    spotLo:el.spotLo, spotHi:el.spotHi, spotSoft:el.spotSoft, spotInvert:el.spotInvert, spotBase:el.spotBase,
    transparent:false, fit:el.fit||'cover', paperFill:null,
    blurUnder:el.blurUnder, blurOver:el.blurOver, grain:el.grain, grainSize:el.grainSize
  };
}

let _id = 1;
function uid(){ return 'p'+(_id++)+'_'+Math.random().toString(36).slice(2,6); }

/* Name → filename slug. Vietnamese-safe (đ/Đ mapped by hand). */
function slugify(s){
  return (s||'').replace(/đ/g,'d').replace(/Đ/g,'D')
    .normalize('NFD').replace(new RegExp('[\\u0300-\\u036f]','g'),'')
    .toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-+|-+$)/g,'');
}

/* ---- QR — encode any text to a module matrix (vector squares in the PDF).
   Uses the vendored qrcode-generator. EC level M, auto type. Returns a square
   matrix of 0/1, or null. ---- */
function buildQR(text, ecl){
  try{
    const q = window.qrcode(0, ecl||'M');
    q.addData(text||'https://realitydn.com');
    q.make();
    const n = q.getModuleCount();
    const m = [];
    for(let r=0;r<n;r++){ const row=[]; for(let c=0;c<n;c++) row.push(q.isDark(r,c)?1:0); m.push(row); }
    return m;
  }catch(e){ return null; }
}

/* ============================================================
   PARTS CATALOG — draggable components (pt sizing tuned for ~A5)
   ============================================================ */
const CATALOG = [
  { group:'Type', items:[
    { type:'headline', label:'Headline',  hint:'The big slam' },
    { type:'numeral',  label:'Display №',  hint:'Huge thin number' },
    { type:'bignum',   label:'Big value', hint:'Time · price · heavy' },
    { type:'kicker',   label:'Kicker',    hint:'Small wide label' },
    { type:'body',     label:'Body text', hint:'Readable copy' },
    { type:'arctext',  label:'Arc text',  hint:'Curved around a rim' },
  ]},
  { group:'Lists · QR', items:[
    { type:'pricelist',label:'Price list', hint:'Label + price rows' },
    { type:'qr',       label:'QR standee', hint:'Scan to any link' },
    { type:'coupon',   label:'Coupon',     hint:'Voucher with code', wide:true },
  ]},
  { group:'Image', items:[
    { type:'image',    label:'Image',       hint:'Photo + riso effects', wide:true },
  ]},
  { group:'Blocks · texture', items:[
    { type:'block',    label:'Colour block', hint:'Flat field / band' },
    { type:'slab',     label:'Angle slab',   hint:'Geometric blocking' },
    { type:'stripes',  label:'Stripes',      hint:'Silkscreen band' },
    { type:'dotfield', label:'Halftone',     hint:'Dots · shapes · ramp' },
    { type:'rule',     label:'Rule',         hint:'Divider line' },
  ]},
  { group:'Shapes · die-cut', items:[
    { type:'shape',    label:'Shape',        hint:'Polygon / star / blob…' },
    { type:'sticker',  label:'Sticker bed',  hint:'Die-cut shape + keyline' },
    { type:'burst',    label:'Sunburst',     hint:'Radiating rays' },
  ]},
  { group:'Marks · brand', items:[
    { type:'footer',   label:'REALITY footer', hint:'Mark · address · QR', wide:true },
    { type:'wordmark', label:'REALITY mark',   hint:'The wordmark, vector' },
    { type:'badge',    label:'Badge',          hint:'Rotated chip' },
    { type:'seal',     label:'Seal',           hint:'Round stamp' },
    { type:'marquee',  label:'Marquee',        hint:'Repeating strip', wide:true },
    { type:'arrow',    label:'Arrow',          hint:'Wayfinding' },
    { type:'contact',  label:'Contact',        hint:'Address · hours' },
  ]},
];

/* Cross-cutting treatments (Year 2 DNA), read by both renderers:
     lift  : 'none'|'light'|'default'|'heavy'  → straight-down plane shadow
     echo  : false | true                       → misregistration ghost…
     echoAccent : 'auto'(partner) | accent name → …in this colour
     echoDx/echoDy : ghost offset (pt)
     border: ink border width on surfaced boxes (pt) */
const DEFAULTS = {
  headline:  { w:320, h:96,  props:{ text:'HEADLINE', fam:'mont', weight:800, fontSize:46, align:'left', surface:'none', ink:'auto', fill:'pink', tracking:0.00, leading:0.92, upper:true, border:2, lift:'none', echo:false, echoAccent:'auto', echoDx:4, echoDy:4 } },
  numeral:   { w:200, h:160, props:{ text:'01', fam:'mont', weight:100, fontSize:128, align:'center', surface:'none', ink:'auto', fill:'pink', tracking:0.02, leading:0.88, upper:true, lift:'none', echo:false, echoAccent:'auto', echoDx:5, echoDy:5 } },
  bignum:    { w:220, h:120, props:{ text:'4–7', fam:'mont', weight:800, fontSize:90, align:'center', surface:'none', ink:'auto', fill:'pink', tracking:0, leading:0.9, upper:true, lift:'none', echo:false, echoAccent:'auto', echoDx:4, echoDy:4 } },
  kicker:    { w:240, h:24,  props:{ text:'EYEBROW LABEL', fam:'mont', weight:700, fontSize:11, align:'left', surface:'none', ink:'pink', fill:'pink', tracking:0.22, leading:1.1, upper:true } },
  body:      { w:300, h:80,  props:{ text:'Readable body copy goes here. Keep it short and bold.', fam:'grot', weight:400, fontSize:13, align:'left', surface:'none', ink:'auto', fill:'pink', tracking:0, leading:1.34, upper:false } },
  pricelist: { w:280, h:150, props:{ heading:'HAPPY HOUR', items:[{l:'House pour',p:'50k'},{l:'Draft beer',p:'45k'},{l:'Highball',p:'65k'}], fam:'mont', surface:'none', ink:'ink', fill:'pink', dotLeader:true, border:2, lift:'none' } },
  qr:        { w:170, h:210, props:{ data:'https://realitydn.com', caption:'SCAN THE MENU', ecl:'M', surface:'none', ink:'ink', fill:'pink', quiet:true, border:2, lift:'none' } },
  coupon:    { w:300, h:150, props:{ heading:'VOUCHER', big:'1 FREE COFFEE', terms:'One per guest · dine-in', code:'REALITY-000', fam:'mont', surface:'outline', ink:'ink', fill:'pink' } },
  block:     { w:240, h:120, props:{ fill:'pink', radius:0, border:0, lift:'none', echo:false, echoAccent:'auto', echoDx:8, echoDy:8, blend:'normal' } },
  slab:      { w:320, h:150, props:{ fill:'blue', angle:-12, lift:'none', echo:false, echoAccent:'auto', echoDx:9, echoDy:9, blend:'normal' } },
  stripes:   { w:320, h:90,  props:{ fill:'red', bg:'white', dir:'diag', count:8, ratio:0.5, blend:'normal' } },
  dotfield:  { w:200, h:170, props:{ fill:'amber', dot:9, gap:6, bg:'white', shape:'circle', grad:'out', ramp:0.8, angle:0, blend:'normal' } },
  /* raster photo + riso effects (the only non-vector element) — pixels live in
     IndexedDB via [[print-store]]; `imgId` references them, the doc stays small.
     Mirrors Poster Studio's `photo`: full RISO treatment set + finish passes +
     in-frame pan/zoom. Exports as an embedded RGB raster at size-aware DPI. */
  image:     { w:300, h:220, props:{ imgId:null, treatment:'none', followAccent:true, ink:'pink', ink2:null,
               contrast:1.1, brightness:0, dot:9, bands:4, threshold:0.52, softness:0.12, angle:15, balance:0.5, shadowTint:0.18,
               invert:false, spread:1.25, shape:'circle', split:0.16, offset:13, inkMode:'single', gradMode:'tone', gradAngle:90, gradA:null, gradB:null, screenOffset:30,
               field:'paper', fieldInk:null, fieldStrength:0.12, dotGain:1, jitter:0, pucker:0.35,
               spotLo:0.35, spotHi:0.65, spotSoft:0.08, spotInvert:false, spotBase:'duotone',
               blurUnder:0, blurOver:0, grain:0, grainSize:2,
               fit:'cover', imgScale:1, imgX:0, imgY:0, imgRot:0, frame:false, frameW:3, lift:'none', blend:'normal' } },
  rule:      { w:260, h:10,  props:{ fill:'ink', weight:3, style:'solid' } },
  footer:    { w:540, h:74,  props:{ site:SITE, addr:ADDR, qrData:'https://realitydn.com', showQR:true, surface:'none', rule:true, ink:'ink' } },
  wordmark:  { w:240, h:42,  props:{ ink:'ink' } },
  badge:     { w:120, h:120, props:{ top:'EVERY', big:'WED', sub:'ALL YEAR', surface:'accent', fill:'amber', rot:-5, border:2, lift:'default' } },
  seal:      { w:130, h:130, props:{ top:'REALITY · ĐÀ NẴNG', big:'★', sub:'SINCE 2024', fill:'ink', ink:'ink', rot:-6 } },
  marquee:   { w:440, h:40,  props:{ text:'REALITY', sep:'★', surface:'solid', fill:'pink', ink:'auto', fontSize:15 } },
  arrow:     { w:170, h:100, props:{ dir:'right', label:'TOILETS', fam:'mont', fontSize:18, ink:'ink', fill:'pink', surface:'none' } },
  contact:   { w:320, h:54,  props:{ site:SITE, addr:ADDR, fam:'mont', fontSize:11, ink:'ink', fill:'pink', surface:'none', align:'left' } },
  /* die-cut bed: the shaped white/accent ground a sticker sits on, with a
     contrasting keyline ring (the cut edge). shape: circle|rounded|squircle|rect.
     radius = corner radius as a fraction of the short side (rounded/squircle). */
  sticker:   { w:220, h:220, props:{ shape:'circle', fill:'white', ring:'ink', ringW:4, radius:0.22, lift:'none', echo:false, echoAccent:'auto', echoDx:7, echoDy:7, blend:'normal' } },
  /* radiating wedges within a centred disc; spin via the rotate handle. */
  burst:     { w:220, h:220, props:{ fill:'amber', rays:16, hub:0.0, hubFill:'white', blend:'normal' } },
  /* flexible vector shape — polygon/star/blob/etc. with an optional keyline
     stroke (so it doubles as a non-rectangular die-cut bed). */
  shape:     { w:200, h:200, props:{ kind:'hexagon', fill:'blue', stroke:0, strokeColor:'ink', lift:'none', echo:false, echoAccent:'auto', echoDx:7, echoDy:7, blend:'normal' } },
  /* text set on a circular arc — the round-sticker rim treatment. */
  arctext:   { w:240, h:240, props:{ text:'REALITY · ĐÀ NẴNG', fam:'mont', weight:700, fontSize:24, tracking:0.08, fill:'ink', flip:false, radiusAdj:0, upper:true } },
};

function makeElement(type, x, y){
  const d = DEFAULTS[type] || DEFAULTS.headline;
  const base = { id:uid(), type, x, y, w:d.w, h:d.h, rot:(d.props.rot||0) };
  return Object.assign(base, JSON.parse(JSON.stringify(d.props)));
}

/* ============================================================
   TEMPLATES — starting layouts, one per material category, each
   authored at its natural size. Pick one to fill the artboard.
   els entries are terse {type,x,y,w,h,p}; coords in pt.
   ============================================================ */
const TEMPLATE_GROUPS = ['Stickers', 'QR standee', 'Wayfinding', 'Specials', 'Merch', 'Tags & coupons'];
const TEMPLATES = [
  /* ---- Stickers (die-cut) — square stock; bold full-colour beds, die-cut
     shapes (hexagon/shield/star/banner/arch/blob/heart/pill), riso overprint
     blends, arc-text rims, auto-fit + vertical type. ---- */
  { id:"stk-stamp-classic", name:"Stamp — classic", group:"Stickers", size:"st100", orient:"portrait", accent:"red", els:[
    {"type":"sticker","x":8,"y":8,"w":268,"h":268,"p":{"shape":"circle","fill":"white","ring":"red","ringW":8,"lift":"default"}},
    {"type":"arctext","x":28,"y":28,"w":228,"h":228,"p":{"text":"REALITY · BAR · CAFÉ","fill":"red","fontSize":22,"tracking":0.06}},
    {"type":"arctext","x":28,"y":28,"w":228,"h":228,"p":{"text":"ĐÀ NẴNG · SINCE 2024","fill":"red","fontSize":18,"tracking":0.06,"flip":true}},
    {"type":"wordmark","x":66,"y":112,"w":152,"h":36,"p":{"ink":"ink"}},
    {"type":"shape","x":122,"y":162,"w":38,"h":38,"p":{"kind":"star5","fill":"red"}}
  ]},
  { id:"stk-logo-bold", name:"Logo round — bold", group:"Stickers", size:"st75", orient:"portrait", accent:"pink", els:[
    {"type":"sticker","x":6,"y":6,"w":200,"h":200,"p":{"shape":"circle","fill":"pink","ring":"ink","ringW":6,"lift":"default"}},
    {"type":"arctext","x":18,"y":18,"w":177,"h":177,"p":{"text":"BAR · CAFÉ · COMMUNITY","fill":"white","fontSize":12,"tracking":0.04,"radiusAdj":4}},
    {"type":"arctext","x":18,"y":18,"w":177,"h":177,"p":{"text":"ĐÀ NẴNG · EST 2024","fill":"white","fontSize":12,"tracking":0.04,"flip":true,"radiusAdj":4}},
    {"type":"wordmark","x":33,"y":92,"w":148,"h":32,"p":{"ink":"white"}}
  ]},
  { id:"stk-hexagon", name:"Hexagon badge", group:"Stickers", size:"st75", orient:"portrait", accent:"blue", els:[
    {"type":"shape","x":6,"y":6,"w":200,"h":200,"p":{"kind":"hexagon","fill":"blue","stroke":5,"strokeColor":"ink","lift":"default"}},
    {"type":"kicker","x":40,"y":74,"w":120,"h":12,"p":{"text":"ĐÀ NẴNG","ink":"white","align":"center","tracking":0.3,"fontSize":9}},
    {"type":"wordmark","x":43,"y":92,"w":114,"h":26,"p":{"ink":"white"}},
    {"type":"kicker","x":40,"y":126,"w":120,"h":12,"p":{"text":"EST. 2024","ink":"white","align":"center","tracking":0.3,"fontSize":9}}
  ]},
  { id:"stk-shield", name:"Shield crest", group:"Stickers", size:"st75", orient:"portrait", accent:"purple", els:[
    {"type":"shape","x":6,"y":6,"w":200,"h":200,"p":{"kind":"shield","fill":"purple","stroke":5,"strokeColor":"ink","lift":"default"}},
    {"type":"kicker","x":30,"y":48,"w":140,"h":12,"p":{"text":"ĐÀ NẴNG · EST 2024","ink":"white","align":"center","tracking":0.16,"fontSize":9}},
    {"type":"wordmark","x":40,"y":72,"w":120,"h":28,"p":{"ink":"white"}},
    {"type":"shape","x":96,"y":118,"w":22,"h":22,"p":{"kind":"star5","fill":"amber"}}
  ]},
  { id:"stk-arch-film", name:"Film Club — arch", group:"Stickers", size:"st75", orient:"portrait", accent:"purple", els:[
    {"type":"shape","x":6,"y":6,"w":200,"h":200,"p":{"kind":"arch","fill":"purple","stroke":4,"strokeColor":"ink","lift":"default"}},
    {"type":"kicker","x":30,"y":46,"w":140,"h":12,"p":{"text":"EVERY WEDNESDAY","ink":"white","align":"center","tracking":0.2,"fontSize":9}},
    {"type":"headline","x":24,"y":66,"w":166,"h":82,"p":{"text":"FILM\nCLUB","fontSize":44,"weight":800,"ink":"white","align":"center","leading":0.9}},
    {"type":"kicker","x":20,"y":160,"w":170,"h":12,"p":{"text":"REALITY · ĐÀ NẴNG","ink":"white","align":"center","tracking":0.16,"fontSize":8}}
  ]},
  { id:"stk-blob-vibes", name:"Blob — good vibes", group:"Stickers", size:"st75", orient:"portrait", accent:"green", els:[
    {"type":"shape","x":6,"y":6,"w":200,"h":200,"p":{"kind":"blob","fill":"green","lift":"default"}},
    {"type":"headline","x":34,"y":56,"w":132,"h":88,"p":{"text":"GOOD\nVIBES","weight":800,"ink":"white","align":"center","leading":0.9,"fit":true,"fontSize":44}},
    {"type":"wordmark","x":58,"y":152,"w":96,"h":18,"p":{"ink":"white"}}
  ]},
  { id:"stk-heart-danang", name:"Heart — Đà Nẵng", group:"Stickers", size:"st75", orient:"portrait", accent:"red", els:[
    {"type":"shape","x":10,"y":12,"w":193,"h":186,"p":{"kind":"heart","fill":"red","lift":"default"}},
    {"type":"headline","x":44,"y":70,"w":125,"h":60,"p":{"text":"ĐÀ\nNẴNG","fontSize":28,"weight":800,"ink":"white","align":"center","leading":0.94}}
  ]},
  { id:"stk-overprint", name:"Overprint circles", group:"Stickers", size:"st75", orient:"portrait", accent:"pink", els:[
    {"type":"sticker","x":4,"y":4,"w":205,"h":205,"p":{"shape":"squircle","fill":"white","ring":"ink","ringW":3,"radius":0.28,"lift":"default"}},
    {"type":"shape","x":26,"y":28,"w":112,"h":112,"p":{"kind":"circle","fill":"pink"}},
    {"type":"shape","x":73,"y":28,"w":112,"h":112,"p":{"kind":"circle","fill":"blue","blend":"multiply"}},
    {"type":"wordmark","x":33,"y":158,"w":148,"h":28,"p":{"ink":"ink"}},
    {"type":"kicker","x":20,"y":192,"w":173,"h":12,"p":{"text":"ĐÀ NẴNG · EST 2024","ink":"ink","align":"center","tracking":0.2,"fontSize":8}}
  ]},
  { id:"stk-big-open", name:"Big OPEN — black", group:"Stickers", size:"st75", orient:"portrait", accent:"red", els:[
    {"type":"sticker","x":6,"y":6,"w":200,"h":200,"p":{"shape":"squircle","fill":"ink","ring":"ink","ringW":0,"radius":0.3,"lift":"default"}},
    {"type":"headline","x":22,"y":54,"w":166,"h":74,"p":{"text":"OPEN","weight":800,"ink":"white","align":"center","fit":true,"fontSize":80}},
    {"type":"arctext","x":18,"y":18,"w":177,"h":177,"p":{"text":"REALITY · ĐÀ NẴNG","fill":"white","fontSize":11,"tracking":0.05,"flip":true,"radiusAdj":2}}
  ]},
  { id:"stk-halftone-square", name:"Halftone squircle", group:"Stickers", size:"st75", orient:"portrait", accent:"purple", els:[
    {"type":"sticker","x":6,"y":6,"w":200,"h":200,"p":{"shape":"squircle","fill":"purple","ring":"ink","ringW":4,"radius":0.3,"lift":"default"}},
    {"type":"dotfield","x":26,"y":26,"w":160,"h":160,"p":{"fill":"white","dot":10,"gap":7,"bg":"none","shape":"diamond","grad":"out"}},
    {"type":"block","x":18,"y":80,"w":176,"h":54,"p":{"fill":"purple","radius":4}},
    {"type":"wordmark","x":36,"y":94,"w":140,"h":26,"p":{"ink":"white"}}
  ]},
  { id:"stk-coffee-square", name:"Coffee squircle", group:"Stickers", size:"st75", orient:"portrait", accent:"green", els:[
    {"type":"sticker","x":6,"y":6,"w":200,"h":200,"p":{"shape":"squircle","fill":"white","ring":"green","ringW":5,"radius":0.32,"lift":"default"}},
    {"type":"headline","x":22,"y":44,"w":170,"h":100,"p":{"text":"GOOD\nCOFFEE","fontSize":40,"weight":800,"ink":"ink","align":"center","leading":0.9,"echo":true,"echoAccent":"green"}},
    {"type":"kicker","x":22,"y":150,"w":170,"h":14,"p":{"text":"ROASTED IN ĐÀ NẴNG","ink":"green","align":"center","tracking":0.16,"fontSize":9}}
  ]},
  { id:"stk-qr-round", name:"QR round — scan", group:"Stickers", size:"st75", orient:"portrait", accent:"blue", els:[
    {"type":"sticker","x":6,"y":6,"w":200,"h":200,"p":{"shape":"circle","fill":"white","ring":"blue","ringW":5,"lift":"default"}},
    {"type":"kicker","x":34,"y":40,"w":146,"h":14,"p":{"text":"SCAN ME","ink":"blue","align":"center","tracking":0.3,"fontSize":11}},
    {"type":"qr","x":61,"y":62,"w":92,"h":92,"p":{"data":"https://realitydn.com","caption":"","quiet":true}},
    {"type":"wordmark","x":56,"y":162,"w":100,"h":20,"p":{"ink":"ink"}}
  ]},
  { id:"stk-vertical-bar", name:"Vertical — BAR", group:"Stickers", size:"a7", orient:"portrait", accent:"red", els:[
    {"type":"sticker","x":6,"y":6,"w":198,"h":286,"p":{"shape":"rounded","fill":"ink","ring":"ink","ringW":0,"radius":0.1,"lift":"default"}},
    {"type":"headline","x":64,"y":34,"w":82,"h":170,"p":{"text":"BAR","weight":800,"ink":"white","align":"center","orient":"v","fontSize":56}},
    {"type":"wordmark","x":52,"y":230,"w":106,"h":22,"p":{"ink":"white"}}
  ]},
  { id:"qr-menu-thin01", name:"Menu — thin 01", group:"QR standee", size:"a6", orient:"portrait", accent:"pink", els:[
    {"type":"numeral","x":22,"y":18,"w":130,"h":110,"p":{"text":"01","fontSize":96,"ink":"pink","align":"left","echo":true}},
    {"type":"kicker","x":150,"y":52,"w":126,"h":20,"p":{"text":"THE MENU","ink":"pink","align":"right","tracking":0.24}},
    {"type":"headline","x":140,"y":70,"w":136,"h":56,"p":{"text":"SCAN\nTO ORDER","fontSize":21,"align":"right","weight":800,"leading":0.94}},
    {"type":"qr","x":74,"y":142,"w":150,"h":150,"p":{"data":"https://realitydn.com/menu","caption":"","quiet":true}},
    {"type":"body","x":30,"y":300,"w":238,"h":40,"p":{"text":"Đồ uống & đồ ăn. Point your camera at the code.","align":"center","fontSize":11}},
    {"type":"footer","x":24,"y":350,"w":250,"h":60,"p":{"showQR":false}}
  ]},
  { id:"qr-wifi-slab", name:"WiFi slab", group:"QR standee", size:"a6", orient:"portrait", accent:"blue", els:[
    {"type":"slab","x":0,"y":0,"w":298,"h":150,"p":{"fill":"blue","angle":-10,"echo":true}},
    {"type":"kicker","x":24,"y":38,"w":250,"h":20,"p":{"text":"REALITY · ĐÀ NẴNG","ink":"white","align":"center","tracking":0.22}},
    {"type":"headline","x":24,"y":60,"w":250,"h":64,"p":{"text":"FREE WIFI","fontSize":44,"align":"center","weight":800,"ink":"white"}},
    {"type":"qr","x":79,"y":172,"w":140,"h":140,"p":{"data":"WIFI:T:WPA;S:REALITY;P:welcome123;;","caption":"","quiet":true}},
    {"type":"pricelist","x":44,"y":324,"w":210,"h":56,"p":{"heading":"","items":[{"l":"Network","p":"REALITY"},{"l":"Pass","p":"welcome123"}],"dotLeader":false}},
    {"type":"contact","x":24,"y":388,"w":250,"h":28,"p":{"align":"center"}}
  ]},
  { id:"qr-insta-pink", name:"Follow on Instagram", group:"QR standee", size:"a6", orient:"portrait", accent:"pink", els:[
    {"type":"block","x":0,"y":0,"w":298,"h":420,"p":{"fill":"pink"}},
    {"type":"kicker","x":24,"y":36,"w":250,"h":20,"p":{"text":"@REALITYDN","ink":"white","align":"center","tracking":0.26}},
    {"type":"headline","x":24,"y":58,"w":250,"h":88,"p":{"text":"FOLLOW\nALONG","fontSize":40,"align":"center","weight":800,"ink":"white","leading":0.9}},
    {"type":"qr","x":69,"y":164,"w":160,"h":160,"p":{"data":"https://instagram.com/realitydn","caption":"","quiet":true}},
    {"type":"body","x":30,"y":332,"w":238,"h":36,"p":{"text":"Events, film nights & what's pouring this week.","align":"center","fontSize":11,"ink":"white"}},
    {"type":"wordmark","x":99,"y":380,"w":100,"h":26,"p":{"ink":"ink"}}
  ]},
  { id:"qr-review-stamp", name:"Google review", group:"QR standee", size:"a6", orient:"portrait", accent:"amber", els:[
    {"type":"headline","x":24,"y":40,"w":250,"h":96,"p":{"text":"LIKED\nYOUR VISIT?","fontSize":33,"align":"center","weight":800,"leading":0.92}},
    {"type":"body","x":30,"y":134,"w":238,"h":36,"p":{"text":"Leave us a review on Google. It really helps.","align":"center","fontSize":12}},
    {"type":"qr","x":74,"y":180,"w":150,"h":150,"p":{"data":"https://g.page/r/realitydn/review","caption":"","quiet":true}},
    {"type":"seal","x":188,"y":28,"w":88,"h":88,"p":{"top":"5 STARS","big":"★","sub":"THANK YOU","fill":"amber","ink":"amber","rot":-8}},
    {"type":"footer","x":24,"y":348,"w":250,"h":60,"p":{"showQR":false}}
  ]},
  { id:"qr-pay-vietqr", name:"Pay by QR", group:"QR standee", size:"a6", orient:"portrait", accent:"green", els:[
    {"type":"stripes","x":0,"y":0,"w":298,"h":84,"p":{"fill":"green","bg":"white","dir":"v","count":9,"ratio":0.5}},
    {"type":"kicker","x":24,"y":100,"w":250,"h":20,"p":{"text":"THANH TOÁN","ink":"green","align":"center","tracking":0.24}},
    {"type":"headline","x":24,"y":120,"w":250,"h":56,"p":{"text":"SCAN TO PAY","fontSize":32,"align":"center","weight":800,"ink":"green"}},
    {"type":"qr","x":79,"y":190,"w":140,"h":140,"p":{"data":"https://realitydn.com/pay","caption":"","quiet":true}},
    {"type":"body","x":30,"y":338,"w":238,"h":32,"p":{"text":"VietQR · MoMo · ZaloPay. Show staff if it fails.","align":"center","fontSize":11}},
    {"type":"contact","x":24,"y":384,"w":250,"h":28,"p":{"align":"center"}}
  ]},
  { id:"qr-event-signup", name:"Event signup", group:"QR standee", size:"a5", orient:"portrait", accent:"purple", els:[
    {"type":"slab","x":0,"y":0,"w":420,"h":210,"p":{"fill":"purple","angle":-12,"echo":true}},
    {"type":"kicker","x":36,"y":56,"w":348,"h":22,"p":{"text":"FILM CLUB · EVERY WEDNESDAY","ink":"white","align":"left","tracking":0.2}},
    {"type":"headline","x":36,"y":80,"w":360,"h":110,"p":{"text":"RESERVE\nYOUR SEAT","fontSize":52,"align":"left","weight":800,"ink":"white","leading":0.9}},
    {"type":"qr","x":240,"y":250,"w":150,"h":150,"p":{"data":"https://realitydn.com/events","caption":"","quiet":true}},
    {"type":"numeral","x":36,"y":250,"w":180,"h":150,"p":{"text":"20:00","fontSize":64,"ink":"purple","align":"left","echo":true}},
    {"type":"body","x":36,"y":420,"w":348,"h":56,"p":{"text":"Free entry, limited seats. Scan to add your name to the list — we'll hold a spot.","align":"left","fontSize":14,"leading":1.34}},
    {"type":"footer","x":36,"y":526,"w":348,"h":64,"p":{}}
  ]},
  { id:"qr-feedback-dot", name:"Feedback dotfield", group:"QR standee", size:"a6", orient:"portrait", accent:"red", els:[
    {"type":"dotfield","x":0,"y":0,"w":298,"h":130,"p":{"fill":"red","dot":10,"gap":7,"bg":"white"}},
    {"type":"headline","x":24,"y":36,"w":250,"h":72,"p":{"text":"TELL US\nHOW WE DID","fontSize":28,"align":"center","weight":800,"ink":"red","leading":0.94}},
    {"type":"qr","x":79,"y":156,"w":140,"h":140,"p":{"data":"https://realitydn.com/feedback","caption":"","quiet":true}},
    {"type":"body","x":30,"y":304,"w":238,"h":36,"p":{"text":"Two minutes, anonymous, read by the whole team.","align":"center","fontSize":11}},
    {"type":"footer","x":24,"y":350,"w":250,"h":60,"p":{"showQR":false}}
  ]},
  { id:"qr-tip-jar", name:"Tip the team", group:"QR standee", size:"a7", orient:"portrait", accent:"yellow", els:[
    {"type":"block","x":0,"y":0,"w":210,"h":70,"p":{"fill":"yellow"}},
    {"type":"headline","x":14,"y":18,"w":182,"h":40,"p":{"text":"TIP JAR","fontSize":28,"align":"center","weight":800,"ink":"ink"}},
    {"type":"qr","x":32,"y":84,"w":146,"h":146,"p":{"data":"https://realitydn.com/tip","caption":"","quiet":true}},
    {"type":"body","x":14,"y":236,"w":182,"h":30,"p":{"text":"100% to the bar & kitchen crew.","align":"center","fontSize":10}},
    {"type":"contact","x":14,"y":270,"w":182,"h":24,"p":{"align":"center"}}
  ]},
  { id:"qr-loyalty-badge", name:"Loyalty card", group:"QR standee", size:"a6", orient:"portrait", accent:"amber", els:[
    {"type":"kicker","x":24,"y":36,"w":250,"h":20,"p":{"text":"TENTH ONE'S ON US","ink":"amber","align":"center","tracking":0.22}},
    {"type":"headline","x":24,"y":56,"w":250,"h":88,"p":{"text":"COFFEE\nLOYALTY","fontSize":38,"align":"center","weight":800,"leading":0.9}},
    {"type":"qr","x":74,"y":158,"w":150,"h":150,"p":{"data":"https://realitydn.com/loyalty","caption":"","quiet":true}},
    {"type":"badge","x":188,"y":24,"w":92,"h":92,"p":{"top":"BUY 9","big":"+1","sub":"FREE","surface":"accent","fill":"amber","rot":-8,"lift":"default"}},
    {"type":"body","x":30,"y":318,"w":238,"h":30,"p":{"text":"Scan each visit. Stamp lives on your phone.","align":"center","fontSize":11}},
    {"type":"footer","x":24,"y":352,"w":250,"h":58,"p":{"showQR":false}}
  ]},
  { id:"qr-table-order", name:"Order from your table", group:"QR standee", size:"a5", orient:"portrait", accent:"blue", els:[
    {"type":"numeral","x":30,"y":30,"w":200,"h":150,"p":{"text":"04","fontSize":120,"ink":"blue","align":"left","echo":true}},
    {"type":"kicker","x":230,"y":70,"w":160,"h":20,"p":{"text":"TABLE","ink":"blue","align":"right","tracking":0.26}},
    {"type":"headline","x":200,"y":92,"w":190,"h":80,"p":{"text":"ORDER\nFROM HERE","fontSize":26,"align":"right","weight":800,"leading":0.94}},
    {"type":"rule","x":36,"y":200,"w":348,"h":6,"p":{"weight":3,"fill":"blue"}},
    {"type":"qr","x":130,"y":232,"w":160,"h":160,"p":{"data":"https://realitydn.com/order?table=04","caption":"","quiet":true}},
    {"type":"body","x":36,"y":410,"w":348,"h":56,"p":{"text":"Scan, order, pay — we bring it over. No app, no account, no waiting at the bar.","align":"center","fontSize":14,"leading":1.34}},
    {"type":"footer","x":36,"y":526,"w":348,"h":64,"p":{}}
  ]},
  { id:"qr-zalo-cool", name:"Join us on Zalo", group:"QR standee", size:"a6", orient:"portrait", accent:"blue", els:[
    {"type":"slab","x":0,"y":270,"w":298,"h":160,"p":{"fill":"blue","angle":8}},
    {"type":"kicker","x":24,"y":36,"w":250,"h":20,"p":{"text":"REALITY ZALO","ink":"blue","align":"center","tracking":0.24}},
    {"type":"headline","x":24,"y":56,"w":250,"h":56,"p":{"text":"STAY IN\nTHE LOOP","fontSize":26,"align":"center","weight":800,"leading":0.92}},
    {"type":"qr","x":74,"y":116,"w":150,"h":150,"p":{"data":"https://zalo.me/realitydn","caption":"","quiet":true}},
    {"type":"body","x":30,"y":300,"w":238,"h":36,"p":{"text":"Bookings, last-minute events & specials — straight to your chat.","align":"center","fontSize":11,"ink":"white"}},
    {"type":"contact","x":24,"y":384,"w":250,"h":28,"p":{"align":"center"}}
  ]},
  { id:"qr-fullmenu-a4", name:"Full menu — A4", group:"QR standee", size:"a4", orient:"portrait", accent:"red", els:[
    {"type":"block","x":0,"y":0,"w":595,"h":300,"p":{"fill":"red","echo":true}},
    {"type":"kicker","x":44,"y":60,"w":400,"h":24,"p":{"text":"BAR · KITCHEN · COFFEE","ink":"white","align":"left","tracking":0.22}},
    {"type":"headline","x":44,"y":92,"w":420,"h":150,"p":{"text":"THE FULL\nMENU","fontSize":84,"align":"left","weight":800,"ink":"white","leading":0.88}},
    {"type":"qr","x":350,"y":340,"w":200,"h":200,"p":{"data":"https://realitydn.com/menu","caption":"","quiet":true}},
    {"type":"numeral","x":44,"y":340,"w":280,"h":170,"p":{"text":"→","fontSize":120,"ink":"red","align":"left"}},
    {"type":"body","x":44,"y":540,"w":460,"h":60,"p":{"text":"Everything we pour and plate, prices in đồng, updated weekly. Point your camera at the code — no app needed.","align":"left","fontSize":16,"leading":1.34}},
    {"type":"rule","x":44,"y":640,"w":507,"h":10,"p":{"weight":3}},
    {"type":"footer","x":44,"y":748,"w":507,"h":74,"p":{}}
  ]},
  { id:"way-toilets-arrow", name:"Toilets this way", group:"Wayfinding", size:"a5", orient:"portrait", accent:"amber", els:[
    {"type":"slab","x":0,"y":0,"w":420,"h":168,"p":{"fill":"amber","angle":-10,"echo":true}},
    {"type":"kicker","x":36,"y":44,"w":348,"h":22,"p":{"text":"NHÀ VỆ SINH","ink":"white","tracking":0.26,"align":"center","upper":true}},
    {"type":"headline","x":30,"y":70,"w":360,"h":82,"p":{"text":"TOILETS","weight":800,"fontSize":58,"ink":"white","align":"center"}},
    {"type":"arrow","x":110,"y":218,"w":200,"h":170,"p":{"dir":"down","label":"","ink":"amber"}},
    {"type":"body","x":44,"y":412,"w":332,"h":50,"p":{"text":"Down the stairs, second door on the left. Shared, all genders.","align":"center","fontSize":14,"leading":1.34}},
    {"type":"footer","x":36,"y":520,"w":348,"h":62,"p":{"showQR":false}}
  ]},
  { id:"way-hours-grid", name:"Opening hours", group:"Wayfinding", size:"a5", orient:"portrait", accent:"green", els:[
    {"type":"kicker","x":34,"y":50,"w":352,"h":24,"p":{"text":"REALITY · ĐÀ NẴNG","align":"center","ink":"green","tracking":0.26,"upper":true}},
    {"type":"headline","x":30,"y":80,"w":360,"h":80,"p":{"text":"GIỜ MỞ CỬA","fontSize":40,"align":"center","weight":800}},
    {"type":"rule","x":150,"y":168,"w":120,"h":4,"p":{"fill":"green","weight":4}},
    {"type":"pricelist","x":64,"y":210,"w":292,"h":240,"p":{"heading":"","dotLeader":true,"items":[{"l":"Thứ 2 — Thứ 5","p":"08 – 24"},{"l":"Thứ 6 — Thứ 7","p":"08 – muộn"},{"l":"Chủ nhật","p":"09 – 23"},{"l":"Bếp đóng","p":"22:00"}]}},
    {"type":"body","x":44,"y":470,"w":332,"h":40,"p":{"text":"Last call 30 minutes before close.","align":"center","fontSize":13}},
    {"type":"footer","x":36,"y":522,"w":348,"h":62,"p":{"showQR":false}}
  ]},
  { id:"way-stairs-up", name:"Rooftop upstairs", group:"Wayfinding", size:"a4", orient:"portrait", accent:"blue", els:[
    {"type":"block","x":0,"y":0,"w":595,"h":842,"p":{"fill":"blue"}},
    {"type":"kicker","x":44,"y":70,"w":507,"h":24,"p":{"text":"TẦNG THƯỢNG · LẦU 3","ink":"white","tracking":0.26,"align":"left","upper":true}},
    {"type":"headline","x":40,"y":104,"w":515,"h":220,"p":{"text":"ROOF\nTOP","weight":800,"fontSize":120,"ink":"white","leading":0.86,"echo":true}},
    {"type":"arrow","x":70,"y":360,"w":240,"h":220,"p":{"dir":"up","label":"","ink":"white"}},
    {"type":"numeral","x":340,"y":372,"w":215,"h":200,"p":{"text":"3F","weight":100,"fontSize":150,"ink":"white","align":"right"}},
    {"type":"body","x":44,"y":620,"w":460,"h":60,"p":{"text":"Two flights up. Open-air bar, smoking allowed up here only.","align":"left","fontSize":17,"ink":"white","leading":1.34}},
    {"type":"contact","x":44,"y":770,"w":507,"h":40,"p":{"align":"left"}}
  ]},
  { id:"way-no-smoking", name:"Smoking policy", group:"Wayfinding", size:"a4", orient:"portrait", accent:"red", els:[
    {"type":"stripes","x":0,"y":0,"w":595,"h":150,"p":{"fill":"red","bg":"white","dir":"v","count":10,"ratio":0.55}},
    {"type":"headline","x":44,"y":190,"w":507,"h":180,"p":{"text":"NO SMOKING\nINDOORS","weight":800,"fontSize":52,"leading":0.92,"ink":"ink"}},
    {"type":"rule","x":44,"y":392,"w":507,"h":6,"p":{"fill":"red","weight":5}},
    {"type":"body","x":44,"y":426,"w":507,"h":90,"p":{"text":"Cấm hút thuốc trong nhà. The only place to smoke is the third-floor patio — head up the stairs and out into the open air.","fontSize":18,"leading":1.34}},
    {"type":"badge","x":400,"y":520,"w":150,"h":150,"p":{"top":"PATIO","big":"3F","sub":"ONLY","surface":"accent","fill":"amber","rot":-7,"lift":"default"}},
    {"type":"arrow","x":44,"y":540,"w":200,"h":130,"p":{"dir":"up","label":"TO THE PATIO","ink":"red"}},
    {"type":"footer","x":44,"y":760,"w":507,"h":66,"p":{"showQR":false}}
  ]},
  { id:"way-house-rules", name:"House rules", group:"Wayfinding", size:"a4", orient:"portrait", accent:"purple", els:[
    {"type":"slab","x":0,"y":0,"w":595,"h":176,"p":{"fill":"purple","angle":12,"echo":true}},
    {"type":"kicker","x":44,"y":48,"w":400,"h":24,"p":{"text":"PLEASE & THANK YOU","ink":"white","tracking":0.26,"upper":true}},
    {"type":"headline","x":44,"y":76,"w":480,"h":90,"p":{"text":"HOUSE RULES","weight":800,"fontSize":50,"ink":"white"}},
    {"type":"pricelist","x":44,"y":230,"w":507,"h":300,"p":{"heading":"","dotLeader":false,"items":[{"l":"Be kind to staff","p":"01"},{"l":"Keep it down after 22:00","p":"02"},{"l":"Smoking on 3F patio only","p":"03"},{"l":"Tabs settle before you leave","p":"04"},{"l":"Last call 30 min before close","p":"05"}]}},
    {"type":"body","x":44,"y":560,"w":507,"h":50,"p":{"text":"We run on good faith. Ask us anything — we're behind the bar.","fontSize":16,"leading":1.34}},
    {"type":"footer","x":44,"y":760,"w":507,"h":66,"p":{}}
  ]},
  { id:"way-exit", name:"Emergency exit", group:"Wayfinding", size:"a5", orient:"portrait", accent:"green", els:[
    {"type":"block","x":0,"y":0,"w":420,"h":595,"p":{"fill":"green"}},
    {"type":"headline","x":30,"y":70,"w":360,"h":90,"p":{"text":"LỐI THOÁT","weight":800,"fontSize":44,"ink":"white","align":"center"}},
    {"type":"headline","x":30,"y":150,"w":360,"h":70,"p":{"text":"EXIT","weight":800,"fontSize":54,"ink":"white","align":"center"}},
    {"type":"arrow","x":90,"y":260,"w":240,"h":150,"p":{"dir":"right","label":"","ink":"white"}},
    {"type":"body","x":40,"y":440,"w":340,"h":50,"p":{"text":"Through the courtyard, out to Mai Thúc Lân.","align":"center","fontSize":14,"ink":"white","leading":1.34}},
    {"type":"contact","x":30,"y":530,"w":360,"h":40,"p":{"align":"center"}}
  ]},
  { id:"way-wifi-info", name:"WiFi & menu", group:"Wayfinding", size:"a5", orient:"portrait", accent:"blue", els:[
    {"type":"kicker","x":34,"y":48,"w":352,"h":24,"p":{"text":"GET CONNECTED","align":"center","ink":"blue","tracking":0.26,"upper":true}},
    {"type":"headline","x":30,"y":78,"w":360,"h":70,"p":{"text":"WIFI & MENU","fontSize":38,"align":"center","weight":800}},
    {"type":"qr","x":135,"y":168,"w":150,"h":150,"p":{"data":"WIFI:T:WPA;S:REALITY;P:welcome123;;","caption":"","quiet":true}},
    {"type":"pricelist","x":70,"y":332,"w":280,"h":80,"p":{"heading":"","dotLeader":false,"items":[{"l":"Network","p":"REALITY"},{"l":"Password","p":"welcome123"}]}},
    {"type":"body","x":40,"y":426,"w":340,"h":50,"p":{"text":"Scan to join, or ask the bar. Full menu at realitydn.com.","align":"center","fontSize":13,"leading":1.34}},
    {"type":"footer","x":30,"y":522,"w":360,"h":62,"p":{"showQR":false}}
  ]},
  { id:"way-capacity", name:"Room capacity", group:"Wayfinding", size:"a5", orient:"portrait", accent:"yellow", els:[
    {"type":"dotfield","x":0,"y":0,"w":420,"h":595,"p":{"fill":"yellow","dot":10,"gap":8,"bg":"white"}},
    {"type":"block","x":36,"y":96,"w":348,"h":360,"p":{"fill":"ink","radius":10,"lift":"default"}},
    {"type":"kicker","x":60,"y":130,"w":300,"h":24,"p":{"text":"SỨC CHỨA TỐI ĐA","align":"center","ink":"yellow","tracking":0.24,"upper":true}},
    {"type":"numeral","x":60,"y":158,"w":300,"h":180,"p":{"text":"60","weight":100,"fontSize":160,"ink":"white","align":"center"}},
    {"type":"body","x":60,"y":360,"w":300,"h":70,"p":{"text":"Maximum occupancy, this floor. For larger groups, book the rooftop.","align":"center","fontSize":13,"ink":"white","leading":1.34}},
    {"type":"contact","x":36,"y":520,"w":348,"h":40,"p":{"align":"center"}}
  ]},
  { id:"way-directory", name:"Floor directory", group:"Wayfinding", size:"a4", orient:"landscape", accent:"purple", els:[
    {"type":"slab","x":0,"y":0,"w":842,"h":595,"p":{"fill":"purple","angle":0,"echo":false}},
    {"type":"block","x":0,"y":0,"w":300,"h":595,"p":{"fill":"ink"}},
    {"type":"kicker","x":40,"y":70,"w":230,"h":24,"p":{"text":"REALITY · DIRECTORY","ink":"yellow","tracking":0.22,"upper":true}},
    {"type":"headline","x":36,"y":102,"w":240,"h":200,"p":{"text":"WHAT'S\nWHERE","weight":800,"fontSize":54,"ink":"white","leading":0.9}},
    {"type":"contact","x":40,"y":510,"w":230,"h":40,"p":{"align":"left"}},
    {"type":"pricelist","x":350,"y":110,"w":452,"h":380,"p":{"heading":"","dotLeader":true,"ink":"white","items":[{"l":"Ground · Bar & café","p":"1F"},{"l":"Stairs · Toilets","p":"1F"},{"l":"Mezzanine · Events","p":"2F"},{"l":"Rooftop · Open-air bar","p":"3F"},{"l":"Patio · Smoking area","p":"3F"}]}}
  ]},
  { id:"way-this-way", name:"Entrance this way", group:"Wayfinding", size:"a4", orient:"landscape", accent:"pink", els:[
    {"type":"block","x":0,"y":0,"w":842,"h":595,"p":{"fill":"white"}},
    {"type":"slab","x":0,"y":0,"w":842,"h":230,"p":{"fill":"pink","angle":-8,"echo":true}},
    {"type":"kicker","x":56,"y":60,"w":500,"h":24,"p":{"text":"BAR · CAFÉ · COMMUNITY","ink":"white","tracking":0.26,"upper":true}},
    {"type":"headline","x":52,"y":92,"w":740,"h":110,"p":{"text":"COME ON IN","weight":800,"fontSize":76,"ink":"white"}},
    {"type":"arrow","x":520,"y":300,"w":280,"h":200,"p":{"dir":"right","label":"FRONT DOOR","ink":"pink"}},
    {"type":"body","x":56,"y":320,"w":420,"h":70,"p":{"text":"Down the alley, glass door on your right. If it looks closed, push — it isn't.","fontSize":19,"leading":1.34}},
    {"type":"footer","x":56,"y":510,"w":420,"h":62,"p":{"showQR":true}}
  ]},
  { id:"way-quiet-hours", name:"Quiet hours", group:"Wayfinding", size:"a5", orient:"portrait", accent:"blue", els:[
    {"type":"headline","x":36,"y":64,"w":348,"h":70,"p":{"text":"BE GOOD\nNEIGHBOURS","weight":800,"fontSize":34,"leading":0.92}},
    {"type":"numeral","x":36,"y":168,"w":348,"h":170,"p":{"text":"22:00","weight":100,"fontSize":96,"ink":"blue","align":"left","echo":true}},
    {"type":"rule","x":36,"y":350,"w":348,"h":4,"p":{"fill":"blue","weight":3,"style":"dashed"}},
    {"type":"body","x":36,"y":372,"w":348,"h":110,"p":{"text":"After 10pm we move the music indoors and keep the patio voices low. Người dân sống quanh đây — cảm ơn bạn đã giữ yên tĩnh.","fontSize":14,"leading":1.34}},
    {"type":"footer","x":36,"y":522,"w":348,"h":62,"p":{"showQR":false}}
  ]},
  { id:"way-events-banner", name:"Events this way", group:"Wayfinding", size:"a3", orient:"landscape", accent:"amber", els:[
    {"type":"block","x":0,"y":0,"w":1191,"h":842,"p":{"fill":"ink"}},
    {"type":"slab","x":0,"y":0,"w":1191,"h":300,"p":{"fill":"amber","angle":-7,"echo":true}},
    {"type":"kicker","x":80,"y":96,"w":700,"h":30,"p":{"text":"TONIGHT · UP THE STAIRS","ink":"ink","tracking":0.26,"upper":true}},
    {"type":"headline","x":72,"y":132,"w":1000,"h":150,"p":{"text":"EVENTS ROOM","weight":800,"fontSize":104,"ink":"ink"}},
    {"type":"arrow","x":90,"y":420,"w":360,"h":300,"p":{"dir":"up","label":"","ink":"amber"}},
    {"type":"numeral","x":470,"y":400,"w":360,"h":320,"p":{"text":"2F","weight":100,"fontSize":220,"ink":"amber","align":"left","echo":true}},
    {"type":"body","x":860,"y":440,"w":260,"h":120,"p":{"text":"Film club, live sets, talks. Mezzanine, second floor.","fontSize":22,"ink":"white","leading":1.34}},
    {"type":"footer","x":72,"y":750,"w":1047,"h":70,"p":{"showQR":true}}
  ]},
  { id:"happy-hour-slab", name:"Happy Hour Slab", group:"Specials", size:"a4", orient:"portrait", accent:"pink", els:[
    {"type":"slab","x":0,"y":0,"w":595,"h":232,"p":{"fill":"pink","angle":-12,"echo":true}},
    {"type":"kicker","x":44,"y":50,"w":420,"h":24,"p":{"text":"MON–FRI · BAR ONLY","ink":"white","tracking":0.26,"upper":true}},
    {"type":"headline","x":44,"y":80,"w":500,"h":120,"p":{"text":"HAPPY\nHOUR","weight":800,"fontSize":78,"ink":"white","leading":0.86,"upper":true}},
    {"type":"badge","x":432,"y":56,"w":124,"h":124,"p":{"top":"2 FOR","big":"1","sub":"DRAFTS","surface":"accent","fill":"amber","rot":-7,"lift":"default"}},
    {"type":"numeral","x":300,"y":268,"w":255,"h":160,"p":{"text":"4–7","weight":100,"fontSize":158,"ink":"pink","echo":true,"align":"right"}},
    {"type":"body","x":44,"y":290,"w":240,"h":70,"p":{"text":"Every drink we pour, knocked down for three hours. Down the stairs, second on the left.","fontSize":13,"leading":1.34}},
    {"type":"pricelist","x":44,"y":470,"w":320,"h":230,"p":{"heading":"ON POUR","items":[{"l":"House spirits","p":"50k"},{"l":"Draft beer","p":"45k"},{"l":"Highball","p":"65k"},{"l":"House wine","p":"70k"}],"dotLeader":true}},
    {"type":"rule","x":44,"y":716,"w":507,"h":10,"p":{"weight":3,"fill":"ink"}},
    {"type":"footer","x":44,"y":748,"w":507,"h":74,"p":{"site":"www.realitydn.com","addr":"86 Mai Thúc Lân · Đà Nẵng","showQR":true,"rule":true}}
  ]},
  { id:"drink-of-week-numeral", name:"Drink Of The Week", group:"Specials", size:"a4", orient:"portrait", accent:"red", els:[
    {"type":"block","x":0,"y":0,"w":595,"h":842,"p":{"fill":"white"}},
    {"type":"stripes","x":0,"y":0,"w":595,"h":150,"p":{"fill":"red","bg":"white","dir":"v","count":11,"ratio":0.55}},
    {"type":"kicker","x":44,"y":188,"w":420,"h":24,"p":{"text":"DRINK OF THE WEEK","ink":"red","tracking":0.24,"upper":true}},
    {"type":"headline","x":44,"y":216,"w":510,"h":160,"p":{"text":"SMOKED\nNEGRONI","weight":800,"fontSize":64,"ink":"ink","leading":0.9,"echo":true,"echoAccent":"red","upper":true}},
    {"type":"body","x":44,"y":390,"w":360,"h":90,"p":{"text":"Campari, sweet vermouth, gin — sealed under cherrywood smoke at the bar. Stirred, not rushed.","fontSize":14,"leading":1.34}},
    {"type":"numeral","x":320,"y":470,"w":235,"h":170,"p":{"text":"120K","weight":100,"fontSize":124,"ink":"red","echo":true,"align":"right"}},
    {"type":"badge","x":44,"y":500,"w":130,"h":130,"p":{"top":"THIS","big":"WK","sub":"ONLY","surface":"accent","fill":"amber","rot":-8,"lift":"default"}},
    {"type":"marquee","x":0,"y":678,"w":595,"h":36,"p":{"text":"REALITY","sep":"★","surface":"solid","fill":"red","fontSize":16}},
    {"type":"footer","x":44,"y":748,"w":507,"h":74,"p":{"site":"www.realitydn.com","addr":"86 Mai Thúc Lân · Đà Nẵng","showQR":true,"rule":true}}
  ]},
  { id:"two-for-one-kinetic", name:"Two For One", group:"Specials", size:"a4", orient:"portrait", accent:"yellow", els:[
    {"type":"block","x":0,"y":0,"w":595,"h":842,"p":{"fill":"yellow"}},
    {"type":"slab","x":0,"y":300,"w":595,"h":320,"p":{"fill":"ink","angle":10,"echo":true}},
    {"type":"kicker","x":44,"y":56,"w":460,"h":24,"p":{"text":"WEDNESDAY NIGHTS · 6PM–CLOSE","ink":"ink","tracking":0.2,"upper":true}},
    {"type":"bignum","x":40,"y":80,"w":520,"h":210,"p":{"text":"2:1","weight":800,"fontSize":200,"ink":"ink","echo":true}},
    {"type":"headline","x":44,"y":360,"w":510,"h":130,"p":{"text":"ALL\nCOCKTAILS","weight":800,"fontSize":66,"ink":"white","leading":0.88,"upper":true}},
    {"type":"body","x":44,"y":500,"w":420,"h":70,"p":{"text":"Order one, the second is on us. Same drink, every cocktail on the list — no catch.","fontSize":14,"ink":"white","leading":1.34}},
    {"type":"badge","x":432,"y":360,"w":124,"h":124,"p":{"top":"EVERY","big":"WED","sub":"—","surface":"accent","fill":"pink","rot":7,"lift":"default"}},
    {"type":"rule","x":44,"y":660,"w":507,"h":10,"p":{"weight":3,"fill":"ink"}},
    {"type":"footer","x":44,"y":748,"w":507,"h":74,"p":{"site":"www.realitydn.com","addr":"86 Mai Thúc Lân · Đà Nẵng","showQR":true,"rule":true}}
  ]},
  { id:"spirits-flight-amber", name:"Spirits Flight", group:"Specials", size:"a4", orient:"portrait", accent:"amber", els:[
    {"type":"slab","x":0,"y":0,"w":595,"h":210,"p":{"fill":"amber","angle":-10,"echo":true}},
    {"type":"kicker","x":44,"y":48,"w":420,"h":24,"p":{"text":"TASTING FLIGHT · POUR & COMPARE","ink":"ink","tracking":0.2,"upper":true}},
    {"type":"headline","x":44,"y":78,"w":500,"h":110,"p":{"text":"WHISKY\nFLIGHT","weight":800,"fontSize":70,"ink":"ink","leading":0.88,"upper":true}},
    {"type":"numeral","x":320,"y":244,"w":235,"h":160,"p":{"text":"180K","weight":100,"fontSize":118,"ink":"amber","echo":true,"align":"right"}},
    {"type":"body","x":44,"y":252,"w":250,"h":90,"p":{"text":"Three pours, side by side. We pick the flight each week from what's open at the back bar.","fontSize":13,"leading":1.34}},
    {"type":"pricelist","x":44,"y":410,"w":360,"h":250,"p":{"heading":"THIS WEEK'S POUR","items":[{"l":"Highland single malt","p":"—"},{"l":"Bourbon, small batch","p":"—"},{"l":"Rye, bottled in bond","p":"—"}],"dotLeader":true}},
    {"type":"seal","x":430,"y":420,"w":120,"h":120,"p":{"top":"BAR","big":"★","sub":"FLIGHT","fill":"red","rot":-9}},
    {"type":"rule","x":44,"y":690,"w":507,"h":10,"p":{"weight":3,"fill":"ink"}},
    {"type":"footer","x":44,"y":748,"w":507,"h":74,"p":{"site":"www.realitydn.com","addr":"86 Mai Thúc Lân · Đà Nẵng","showQR":true,"rule":true}}
  ]},
  { id:"house-pour-list-a4", name:"House Pour List", group:"Specials", size:"a4", orient:"portrait", accent:"purple", els:[
    {"type":"block","x":0,"y":0,"w":595,"h":130,"p":{"fill":"purple"}},
    {"type":"kicker","x":44,"y":40,"w":420,"h":24,"p":{"text":"BAR LIST · 4PM TILL LATE","ink":"white","tracking":0.24,"upper":true}},
    {"type":"headline","x":44,"y":66,"w":510,"h":60,"p":{"text":"THE POUR LIST","weight":700,"fontSize":40,"ink":"white","leading":0.95,"upper":true}},
    {"type":"pricelist","x":44,"y":168,"w":507,"h":280,"p":{"heading":"SIGNATURE COCKTAILS","items":[{"l":"Smoked Negroni","p":"120k"},{"l":"Espresso Martini","p":"110k"},{"l":"Sông Hàn Spritz","p":"95k"},{"l":"Old Fashioned","p":"115k"},{"l":"Tamarind Margarita","p":"105k"}],"dotLeader":true,"surface":"paper"}},
    {"type":"rule","x":44,"y":466,"w":507,"h":8,"p":{"weight":2,"fill":"purple","style":"double"}},
    {"type":"pricelist","x":44,"y":490,"w":507,"h":200,"p":{"heading":"BEER & WINE","items":[{"l":"Draft beer","p":"45k"},{"l":"Bottled craft","p":"75k"},{"l":"House red / white","p":"70k"}],"dotLeader":true}},
    {"type":"footer","x":44,"y":748,"w":507,"h":74,"p":{"site":"www.realitydn.com","addr":"86 Mai Thúc Lân · Đà Nẵng","showQR":true,"rule":true}}
  ]},
  { id:"golden-hour-blue", name:"Golden Hour", group:"Specials", size:"a5", orient:"portrait", accent:"blue", els:[
    {"type":"slab","x":0,"y":0,"w":420,"h":180,"p":{"fill":"blue","angle":-14,"echo":true}},
    {"type":"kicker","x":30,"y":36,"w":300,"h":20,"p":{"text":"ROOFTOP · DAILY","ink":"white","tracking":0.24,"upper":true}},
    {"type":"headline","x":30,"y":60,"w":360,"h":90,"p":{"text":"GOLDEN\nHOUR","weight":800,"fontSize":52,"ink":"white","leading":0.86,"upper":true}},
    {"type":"numeral","x":200,"y":200,"w":190,"h":130,"p":{"text":"5–7","weight":100,"fontSize":130,"ink":"blue","echo":true,"align":"right"}},
    {"type":"body","x":30,"y":220,"w":165,"h":80,"p":{"text":"Half-price spritzes while the sun drops over the river.","fontSize":12,"leading":1.34}},
    {"type":"badge","x":290,"y":360,"w":100,"h":100,"p":{"top":"HALF","big":"½","sub":"SPRITZ","surface":"accent","fill":"amber","rot":-8,"lift":"default"}},
    {"type":"footer","x":30,"y":528,"w":360,"h":60,"p":{"site":"www.realitydn.com","addr":"86 Mai Thúc Lân · Đà Nẵng","showQR":true,"rule":true}}
  ]},
  { id:"new-arrival-green", name:"New Arrival", group:"Specials", size:"a5", orient:"portrait", accent:"green", els:[
    {"type":"block","x":0,"y":0,"w":420,"h":595,"p":{"fill":"white"}},
    {"type":"dotfield","x":0,"y":0,"w":420,"h":150,"p":{"fill":"green","dot":10,"gap":7,"bg":"white"}},
    {"type":"badge","x":280,"y":28,"w":110,"h":110,"p":{"top":"JUST","big":"NEW","sub":"IN","surface":"accent","fill":"pink","rot":8,"lift":"default"}},
    {"type":"kicker","x":30,"y":178,"w":300,"h":20,"p":{"text":"NOW ON THE MENU","ink":"green","tracking":0.24,"upper":true}},
    {"type":"headline","x":30,"y":202,"w":360,"h":120,"p":{"text":"YUZU\nGIMLET","weight":800,"fontSize":50,"ink":"ink","leading":0.88,"echo":true,"echoAccent":"green","upper":true}},
    {"type":"body","x":30,"y":330,"w":280,"h":80,"p":{"text":"Gin, fresh yuzu, a whisper of basil. Sharp, green, built for the heat.","fontSize":13,"leading":1.34}},
    {"type":"numeral","x":220,"y":400,"w":170,"h":120,"p":{"text":"95K","weight":100,"fontSize":100,"ink":"green","echo":true,"align":"right"}},
    {"type":"footer","x":30,"y":528,"w":360,"h":60,"p":{"site":"www.realitydn.com","addr":"86 Mai Thúc Lân · Đà Nẵng","showQR":true,"rule":true}}
  ]},
  { id:"weekday-specials-grid", name:"Weekday Specials", group:"Specials", size:"a5", orient:"portrait", accent:"pink", els:[
    {"type":"block","x":0,"y":0,"w":420,"h":110,"p":{"fill":"pink"}},
    {"type":"headline","x":30,"y":36,"w":360,"h":56,"p":{"text":"THE WEEK","weight":800,"fontSize":42,"ink":"white","leading":0.95,"upper":true}},
    {"type":"kicker","x":30,"y":124,"w":300,"h":20,"p":{"text":"ONE DEAL A DAY","ink":"pink","tracking":0.24,"upper":true}},
    {"type":"pricelist","x":30,"y":152,"w":360,"h":330,"p":{"heading":"","items":[{"l":"MON · House spirits","p":"40k"},{"l":"TUE · Draft pints","p":"35k"},{"l":"WED · 2-for-1 cocktails","p":"—"},{"l":"THU · Wine by glass","p":"55k"},{"l":"FRI · Highballs","p":"55k"}],"dotLeader":true,"surface":"paper"}},
    {"type":"rule","x":30,"y":470,"w":360,"h":8,"p":{"weight":3,"fill":"pink"}},
    {"type":"body","x":30,"y":486,"w":360,"h":30,"p":{"text":"Bar only, from 4pm. No mixing across days.","fontSize":11,"leading":1.3}},
    {"type":"footer","x":30,"y":528,"w":360,"h":60,"p":{"site":"www.realitydn.com","addr":"86 Mai Thúc Lân · Đà Nẵng","showQR":true,"rule":true}}
  ]},
  { id:"fifty-k-pours", name:"Fifty K Pours", group:"Specials", size:"a5", orient:"portrait", accent:"amber", els:[
    {"type":"slab","x":0,"y":0,"w":420,"h":595,"p":{"fill":"amber","angle":0,"echo":false}},
    {"type":"block","x":30,"y":60,"w":360,"h":475,"p":{"fill":"white","radius":6,"lift":"heavy"}},
    {"type":"kicker","x":56,"y":92,"w":300,"h":20,"p":{"text":"FLAT RATE · ALL NIGHT","ink":"amber","tracking":0.22,"upper":true}},
    {"type":"numeral","x":56,"y":120,"w":310,"h":180,"p":{"text":"50K","weight":100,"fontSize":168,"ink":"ink","echo":true,"align":"center"}},
    {"type":"headline","x":56,"y":320,"w":310,"h":60,"p":{"text":"EVERY POUR","weight":700,"fontSize":34,"ink":"ink","align":"center","upper":true}},
    {"type":"body","x":56,"y":388,"w":310,"h":70,"p":{"text":"Spirits, beer, house wine — one price, all of Sunday. Pick anything off the rail.","fontSize":13,"align":"center","leading":1.34}},
    {"type":"badge","x":290,"y":36,"w":100,"h":100,"p":{"top":"SUN","big":"ALL","sub":"DAY","surface":"accent","fill":"red","rot":9,"lift":"default"}},
    {"type":"footer","x":30,"y":528,"w":360,"h":60,"p":{"site":"www.realitydn.com","addr":"86 Mai Thúc Lân · Đà Nẵng","showQR":false,"rule":true}}
  ]},
  { id:"seasonal-menu-purple", name:"Seasonal Menu", group:"Specials", size:"a5", orient:"portrait", accent:"purple", els:[
    {"type":"slab","x":0,"y":0,"w":420,"h":170,"p":{"fill":"purple","angle":-12,"echo":true}},
    {"type":"kicker","x":30,"y":38,"w":300,"h":20,"p":{"text":"SUMMER LIST · WHILE IT LASTS","ink":"white","tracking":0.2,"upper":true}},
    {"type":"headline","x":30,"y":64,"w":360,"h":90,"p":{"text":"SEASONAL\nPOURS","weight":800,"fontSize":46,"ink":"white","leading":0.86,"upper":true}},
    {"type":"pricelist","x":30,"y":200,"w":360,"h":250,"p":{"heading":"ON NOW","items":[{"l":"Lychee Collins","p":"100k"},{"l":"Passionfruit Sour","p":"105k"},{"l":"Watermelon Paloma","p":"100k"},{"l":"Iced Vietnamese Espresso Martini","p":"115k"}],"dotLeader":true}},
    {"type":"marquee","x":0,"y":470,"w":420,"h":32,"p":{"text":"REALITY","sep":"★","surface":"accent","fill":"purple","fontSize":14}},
    {"type":"footer","x":30,"y":528,"w":360,"h":60,"p":{"site":"www.realitydn.com","addr":"86 Mai Thúc Lân · Đà Nẵng","showQR":true,"rule":true}}
  ]},
  { id:"ladies-night-pink", name:"Thursday Pour", group:"Specials", size:"a5", orient:"portrait", accent:"pink", els:[
    {"type":"block","x":0,"y":0,"w":420,"h":595,"p":{"fill":"ink"}},
    {"type":"slab","x":0,"y":120,"w":420,"h":240,"p":{"fill":"pink","angle":12,"echo":true}},
    {"type":"kicker","x":30,"y":44,"w":300,"h":20,"p":{"text":"THURSDAY · 7PM TILL LATE","ink":"pink","tracking":0.22,"upper":true}},
    {"type":"headline","x":30,"y":150,"w":360,"h":130,"p":{"text":"FREE\nFIRST\nROUND","weight":800,"fontSize":56,"ink":"white","leading":0.84,"upper":true}},
    {"type":"body","x":30,"y":390,"w":360,"h":70,"p":{"text":"First cocktail of the night is on the house, every Thursday. Walk in, sit down, we'll sort the rest.","fontSize":13,"ink":"white","leading":1.34}},
    {"type":"seal","x":280,"y":392,"w":110,"h":110,"p":{"top":"ON THE","big":"★","sub":"HOUSE","fill":"amber","rot":-8}},
    {"type":"footer","x":30,"y":528,"w":360,"h":60,"p":{"site":"www.realitydn.com","addr":"86 Mai Thúc Lân · Đà Nẵng","showQR":true,"rule":true}}
  ]},
  { id:"happy-hour-a3-hero", name:"Happy Hour Hero", group:"Specials", size:"a3", orient:"portrait", accent:"red", els:[
    {"type":"block","x":0,"y":0,"w":842,"h":1191,"p":{"fill":"yellow"}},
    {"type":"slab","x":0,"y":0,"w":842,"h":420,"p":{"fill":"red","angle":-10,"echo":true}},
    {"type":"kicker","x":64,"y":80,"w":600,"h":30,"p":{"text":"MONDAY TO FRIDAY · BAR ONLY","ink":"white","tracking":0.24,"upper":true}},
    {"type":"headline","x":64,"y":120,"w":720,"h":220,"p":{"text":"HAPPY\nHOUR","weight":800,"fontSize":150,"ink":"white","leading":0.84,"upper":true}},
    {"type":"badge","x":612,"y":92,"w":180,"h":180,"p":{"top":"2 FOR","big":"1","sub":"DRAFTS","surface":"accent","fill":"purple","rot":-7,"lift":"heavy"}},
    {"type":"numeral","x":420,"y":470,"w":380,"h":280,"p":{"text":"4–7","weight":100,"fontSize":270,"ink":"red","echo":true,"align":"right"}},
    {"type":"body","x":64,"y":500,"w":340,"h":120,"p":{"text":"Three hours, every weekday. Every drink on the list knocked down. Down the stairs, second on the left.","fontSize":20,"leading":1.34}},
    {"type":"pricelist","x":64,"y":760,"w":470,"h":300,"p":{"heading":"ON POUR","items":[{"l":"House spirits","p":"50k"},{"l":"Draft beer","p":"45k"},{"l":"Highball","p":"65k"},{"l":"House wine","p":"70k"}],"dotLeader":true,"surface":"paper"}},
    {"type":"marquee","x":0,"y":1080,"w":842,"h":44,"p":{"text":"REALITY","sep":"★","surface":"solid","fill":"ink","fontSize":20}},
    {"type":"footer","x":64,"y":1115,"w":714,"h":64,"p":{"site":"www.realitydn.com","addr":"86 Mai Thúc Lân · Đà Nẵng","showQR":true,"rule":true}}
  ]},
  { id:"free-coffee-voucher", name:"Free Coffee Voucher", group:"Tags & coupons", size:"a7", orient:"landscape", accent:"amber", els:[
    {"type":"slab","x":0,"y":0,"w":298,"h":78,"p":{"fill":"amber","angle":-8,"echo":true}},
    {"type":"kicker","x":22,"y":24,"w":220,"h":18,"p":{"text":"LOYALTY · BAR ONLY","ink":"white","tracking":0.24}},
    {"type":"coupon","x":18,"y":70,"w":262,"h":122,"p":{"heading":"ONE FREE COFFEE","big":"ON US","terms":"One per guest. Dine-in only.","code":"REAL-10","surface":"outline"}},
    {"type":"contact","x":22,"y":193,"w":254,"h":13,"p":{"site":"www.realitydn.com","addr":"","align":"left"}}
  ]},
  { id:"happy-hour-token", name:"Happy Hour Token", group:"Tags & coupons", size:"a7", orient:"landscape", accent:"red", els:[
    {"type":"block","x":0,"y":0,"w":298,"h":210,"p":{"fill":"red"}},
    {"type":"kicker","x":22,"y":28,"w":200,"h":16,"p":{"text":"ONE DRINK · ONE TOKEN","ink":"white","tracking":0.22}},
    {"type":"numeral","x":18,"y":44,"w":200,"h":120,"p":{"text":"1×","weight":100,"fontSize":120,"ink":"white","echo":true,"align":"left"}},
    {"type":"seal","x":196,"y":56,"w":90,"h":90,"p":{"top":"GOOD FOR","big":"★","sub":"ONE POUR","fill":"ink","rot":-8}},
    {"type":"contact","x":22,"y":184,"w":254,"h":13,"p":{"site":"www.realitydn.com","addr":"","align":"left"}}
  ]},
  { id:"stamp-card-ten", name:"Coffee Stamp Card", group:"Tags & coupons", size:"a7", orient:"landscape", accent:"green", els:[
    {"type":"block","x":0,"y":0,"w":298,"h":60,"p":{"fill":"green"}},
    {"type":"headline","x":22,"y":18,"w":254,"h":30,"p":{"text":"STAMP CARD","weight":800,"fontSize":26,"ink":"white","align":"left","tracking":0.04}},
    {"type":"dotfield","x":22,"y":78,"w":254,"h":72,"p":{"fill":"green","dot":12,"gap":8,"bg":"white"}},
    {"type":"body","x":22,"y":158,"w":254,"h":30,"p":{"text":"Ten coffees, the tenth on us. One stamp per cup.","fontSize":11,"align":"left"}},
    {"type":"contact","x":22,"y":192,"w":254,"h":13,"p":{"site":"www.realitydn.com","addr":"","align":"left"}}
  ]},
  { id:"two-for-one-coupon", name:"Two For One", group:"Tags & coupons", size:"a8", orient:"landscape", accent:"pink", els:[
    {"type":"slab","x":0,"y":0,"w":210,"h":60,"p":{"fill":"pink","angle":-12,"echo":true}},
    {"type":"headline","x":16,"y":14,"w":150,"h":36,"p":{"text":"2 FOR 1","weight":800,"fontSize":30,"ink":"white","align":"left"}},
    {"type":"badge","x":150,"y":8,"w":52,"h":52,"p":{"top":"ON","big":"★","sub":"DRAFTS","surface":"accent","fill":"purple","rot":-8,"lift":"default"}},
    {"type":"coupon","x":12,"y":64,"w":186,"h":80,"p":{"heading":"DRAFT BEER","big":"BRING A FRIEND","terms":"One per table, before 7pm.","code":"2FOR1","surface":"outline"}}
  ]},
  { id:"house-spirit-tag", name:"House Spirit Tag", group:"Tags & coupons", size:"a7", orient:"portrait", accent:"yellow", els:[
    {"type":"block","x":0,"y":0,"w":210,"h":130,"p":{"fill":"yellow"}},
    {"type":"kicker","x":20,"y":26,"w":170,"h":16,"p":{"text":"ON POUR","ink":"ink","tracking":0.24}},
    {"type":"numeral","x":16,"y":38,"w":180,"h":90,"p":{"text":"50K","weight":100,"fontSize":84,"ink":"ink","echo":true,"align":"left"}},
    {"type":"body","x":20,"y":150,"w":170,"h":40,"p":{"text":"House spirits, neat or on ice. Ask at the bar.","fontSize":12,"align":"left"}},
    {"type":"contact","x":20,"y":270,"w":170,"h":13,"p":{"site":"www.realitydn.com","addr":"","align":"left"}}
  ]},
  { id:"highball-shelf-tag", name:"Highball Shelf Tag", group:"Tags & coupons", size:"a6", orient:"portrait", accent:"blue", els:[
    {"type":"slab","x":0,"y":0,"w":298,"h":150,"p":{"fill":"blue","angle":-10,"echo":true}},
    {"type":"kicker","x":24,"y":40,"w":240,"h":18,"p":{"text":"SIGNATURE SERVE","ink":"white","tracking":0.26}},
    {"type":"headline","x":24,"y":62,"w":250,"h":50,"p":{"text":"HIGHBALL","weight":800,"fontSize":38,"ink":"white","align":"left"}},
    {"type":"numeral","x":150,"y":180,"w":124,"h":110,"p":{"text":"65K","weight":100,"fontSize":100,"ink":"blue","echo":true,"align":"right"}},
    {"type":"body","x":24,"y":200,"w":130,"h":60,"p":{"text":"Whisky, soda, citrus. Tall and cold.","fontSize":13,"align":"left"}},
    {"type":"footer","x":24,"y":350,"w":250,"h":60,"p":{"showQR":false}}
  ]},
  { id:"comp-card-vip", name:"Friend Comp Card", group:"Tags & coupons", size:"a7", orient:"landscape", accent:"purple", els:[
    {"type":"block","x":0,"y":0,"w":298,"h":210,"p":{"fill":"purple"}},
    {"type":"kicker","x":22,"y":26,"w":240,"h":16,"p":{"text":"ON THE HOUSE","ink":"white","tracking":0.26}},
    {"type":"headline","x":22,"y":44,"w":180,"h":70,"p":{"text":"FIRST\nROUND","weight":800,"fontSize":36,"ink":"white","leading":0.9,"align":"left"}},
    {"type":"seal","x":198,"y":50,"w":86,"h":86,"p":{"top":"REALITY","big":"★","sub":"COMP","fill":"pink","rot":8}},
    {"type":"body","x":22,"y":130,"w":240,"h":30,"p":{"text":"Hand this to the bar. One drink, our treat.","fontSize":12,"ink":"white","align":"left"}},
    {"type":"contact","x":22,"y":184,"w":254,"h":13,"p":{"site":"www.realitydn.com","addr":"","align":"left"}}
  ]},
  { id:"draft-token-mini", name:"Draft Drink Token", group:"Tags & coupons", size:"a8", orient:"portrait", accent:"amber", els:[
    {"type":"block","x":0,"y":0,"w":147,"h":90,"p":{"fill":"amber"}},
    {"type":"numeral","x":12,"y":8,"w":124,"h":80,"p":{"text":"1","weight":100,"fontSize":76,"ink":"ink","echo":true,"align":"center"}},
    {"type":"headline","x":12,"y":100,"w":124,"h":28,"p":{"text":"DRAFT BEER","weight":800,"fontSize":16,"ink":"ink","align":"center","tracking":0.06}},
    {"type":"rule","x":24,"y":138,"w":100,"h":8,"p":{"weight":2,"style":"dashed"}},
    {"type":"body","x":12,"y":150,"w":124,"h":30,"p":{"text":"Good for one pour.","fontSize":11,"align":"center"}},
    {"type":"contact","x":12,"y":188,"w":124,"h":13,"p":{"site":"www.realitydn.com","addr":"","align":"center"}}
  ]},
  { id:"weekend-discount", name:"Weekend 20 Off", group:"Tags & coupons", size:"a7", orient:"landscape", accent:"pink", els:[
    {"type":"stripes","x":0,"y":0,"w":298,"h":66,"p":{"fill":"pink","bg":"white","dir":"v","count":9,"ratio":0.55}},
    {"type":"numeral","x":18,"y":70,"w":150,"h":90,"p":{"text":"20%","weight":100,"fontSize":80,"ink":"pink","echo":true,"align":"left"}},
    {"type":"coupon","x":160,"y":74,"w":120,"h":110,"p":{"heading":"WEEKEND OFF","big":"FRI–SUN","terms":"Off your tab, dine-in.","code":"WKND20","surface":"outline"}},
    {"type":"contact","x":18,"y":192,"w":254,"h":13,"p":{"site":"www.realitydn.com","addr":"","align":"left"}}
  ]},
  { id:"wine-shelf-tag", name:"Wine Glass Tag", group:"Tags & coupons", size:"a7", orient:"portrait", accent:"red", els:[
    {"type":"slab","x":0,"y":0,"w":210,"h":120,"p":{"fill":"red","angle":-8,"echo":true}},
    {"type":"kicker","x":20,"y":34,"w":170,"h":16,"p":{"text":"BY THE GLASS","ink":"white","tracking":0.24}},
    {"type":"headline","x":20,"y":54,"w":170,"h":44,"p":{"text":"WINE","weight":800,"fontSize":40,"ink":"white","align":"left"}},
    {"type":"numeral","x":16,"y":138,"w":180,"h":90,"p":{"text":"70K","weight":100,"fontSize":80,"ink":"red","echo":true,"align":"left"}},
    {"type":"body","x":20,"y":234,"w":170,"h":30,"p":{"text":"Red or white. Ask what's open.","fontSize":12,"align":"left"}},
    {"type":"contact","x":20,"y":274,"w":170,"h":13,"p":{"site":"www.realitydn.com","addr":"","align":"left"}}
  ]},
  { id:"birthday-comp", name:"Birthday Drink", group:"Tags & coupons", size:"a7", orient:"landscape", accent:"yellow", els:[
    {"type":"block","x":0,"y":0,"w":298,"h":72,"p":{"fill":"yellow"}},
    {"type":"headline","x":22,"y":22,"w":200,"h":36,"p":{"text":"HAPPY BIRTHDAY","weight":800,"fontSize":24,"ink":"ink","align":"left"}},
    {"type":"badge","x":226,"y":14,"w":58,"h":58,"p":{"top":"FREE","big":"★","sub":"DRINK","surface":"accent","fill":"pink","rot":-8,"lift":"default"}},
    {"type":"coupon","x":18,"y":80,"w":262,"h":100,"p":{"heading":"ONE ON US","big":"YOUR DAY","terms":"Show ID at the bar on your birthday.","code":"BDAY","surface":"outline"}},
    {"type":"contact","x":22,"y":188,"w":254,"h":13,"p":{"site":"www.realitydn.com","addr":"","align":"left"}}
  ]},
  { id:"table-tent-special", name:"Table Tent Special", group:"Tags & coupons", size:"a6", orient:"portrait", accent:"green", els:[
    {"type":"slab","x":0,"y":0,"w":298,"h":140,"p":{"fill":"green","angle":-10,"echo":true}},
    {"type":"kicker","x":24,"y":36,"w":250,"h":18,"p":{"text":"TODAY ONLY · ASK US","ink":"white","tracking":0.24}},
    {"type":"headline","x":24,"y":58,"w":250,"h":56,"p":{"text":"FRESH\nPOUR","weight":800,"fontSize":40,"ink":"white","leading":0.88,"align":"left"}},
    {"type":"pricelist","x":24,"y":168,"w":250,"h":130,"p":{"heading":"TABLE SPECIALS","items":[{"l":"Cold brew","p":"45k"},{"l":"Citrus soda","p":"40k"},{"l":"Draft beer","p":"45k"}],"dotLeader":true}},
    {"type":"footer","x":24,"y":348,"w":250,"h":60,"p":{"showQR":false}}
  ]},
  { id:"merch-tee-flat-price", name:"T-Shirt Price — flat", group:"Merch", size:"a5", orient:"portrait", accent:"red", els:[
    {"type":"slab","x":0,"y":0,"w":420,"h":160,"p":{"fill":"red","angle":-10,"echo":true}},
    {"type":"kicker","x":30,"y":40,"w":360,"h":22,"p":{"text":"TAKE ONE HOME","ink":"white","align":"center","tracking":0.26,"fontSize":13}},
    {"type":"headline","x":30,"y":62,"w":360,"h":82,"p":{"text":"T-SHIRTS","weight":800,"fontSize":62,"ink":"white","align":"center","tracking":0.01}},
    {"type":"kicker","x":30,"y":176,"w":360,"h":20,"p":{"text":"ONE FLAT PRICE","ink":"red","align":"center","tracking":0.24,"fontSize":13}},
    {"type":"numeral","x":0,"y":198,"w":420,"h":186,"p":{"text":"300K","weight":100,"fontSize":138,"ink":"ink","echo":true,"echoAccent":"red","align":"center","tracking":0.01}},
    {"type":"headline","x":30,"y":388,"w":360,"h":38,"p":{"text":"PER SHIRT","weight":700,"fontSize":30,"ink":"ink","align":"center","tracking":0.04}},
    {"type":"block","x":0,"y":432,"w":420,"h":108,"p":{"fill":"ink"}},
    {"type":"kicker","x":30,"y":448,"w":360,"h":20,"p":{"text":"AVAILABLE SIZES","ink":"white","align":"center","tracking":0.3,"fontSize":12}},
    {"type":"headline","x":0,"y":470,"w":420,"h":68,"p":{"text":"S · M · L · XL\n2XL · 3XL · 4XL · 5XL","weight":700,"fontSize":29,"ink":"white","align":"center","leading":1.08,"tracking":0.02}},
    {"type":"footer","x":30,"y":546,"w":360,"h":48,"p":{"site":"www.realitydn.com","addr":"86 Mai Thúc Lân · Đà Nẵng","showQR":true,"rule":true}}
  ]}
];

function buildTemplate(tpl){
  const elements = (tpl.els||[]).map(s=>{
    const el = makeElement(s.type, s.x|0, s.y|0);
    if(s.w!=null) el.w=s.w; if(s.h!=null) el.h=s.h;
    if(s.p) Object.assign(el, JSON.parse(JSON.stringify(s.p)));
    return el;
  });
  return { elements, size: tpl.size||'a5', orient: tpl.orient||'portrait', accent: (tpl.accent && ACCENTS.indexOf(tpl.accent)>=0)?tpl.accent:'pink' };
}

Object.assign(window, {
  PALETTE, PALETTE_CMYK, INK, WHITE, ACCENTS,
  SIZES, SIZE_ORDER, GANG, PT_PER_MM, sizeDims,
  TYPE_SCALE, snapToScale, scaleStep, FACES, faceFor,
  contrastInk, surfaceStyle, resolveInk, buildQR, WORDMARK_PATH,
  ADDR, SITE, PARTNER, partnerOf, LIFT, dotFieldLayout, stripeLayout, burstRays,
  roundedRectPath, shapePath, SHAPE_KINDS, fitTextSize, measureTextW, arcTextLayout,
  BLEND_MODES, blendCss, blendPdf, risoOpts,
  CATALOG, DEFAULTS, makeElement, uid, slugify,
  TEMPLATES, TEMPLATE_GROUPS, buildTemplate
});
