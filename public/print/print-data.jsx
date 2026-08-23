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
const SITE = 'realitydn.com';

/* Misregistration partners — the second silkscreen layer (--accent-2). An
   element's "echo" ghost is drawn offset in its partner colour, the riso
   overprint move. Lifted from the poster riso-engine PARTNER map. */
const PARTNER = { pink:'blue', red:'blue', amber:'purple', yellow:'pink', blue:'pink', green:'purple', purple:'amber' };
function partnerOf(accent){ return PARTNER[accent] || 'blue'; }

/* ============================================================
   INK MARK — the ink strip / ink square as a placeable print
   element (canon rev 22.08.26). Machine spec: design-system-year2/
   design_handoff_web_app_ink_pass/tokens/ink-strip.json — cell
   ORDER is FIXED; recolouring (mode / day) is the only parameter.
   Deliberate duplicate of the Poster Studio block (studio-data.jsx)
   — tools/verify-day-colours.mjs guards BOTH against canon.

   Print departures: STOCK IS THE PAPER. On true-white stock the
   stock cells are UNPRINTED — the PDF exporter skips them entirely
   (never a cream/white fill) and the screen shows them paper-white.
   Stock is always an inner cell, so the outer-corner rule (G2)
   holds with no ground plate; ink cells ride the K plate; accents
   fill from PALETTE_CMYK. No radius, no gradients, no cell
   shadows, never auto-placed, static always. v1 skips voids.
   ============================================================ */
const INK_MARK_CELLS = {
  red:PALETTE.red, blue:PALETTE.blue, yellow:PALETTE.yellow, green:PALETTE.green,
  pink:PALETTE.pink, purple:PALETTE.purple, amber:PALETTE.amber,
  ink:INK.rgb,      /* screen preview; the PDF draws these K-only (0,0,0,1) */
  stock:WHITE.rgb   /* the substrate — UNPRINTED on press, skipped by the exporter */
};
const INK_MARK = {
  rev:'22.08.26',
  forms:{
    'strip-v':        { cols:2, rows:9, field:6 },
    'strip-h':        { cols:9, rows:2, field:6 },
    'strip-short-v':  { cols:2, rows:7, field:2 },
    'strip-short-h':  { cols:7, rows:2, field:2 },
    'square':         { cols:4, rows:4, field:4, square:true },
    'square-anchored':{ cols:4, rows:4, field:4, square:true, anchored:true }
  },
  /* fixed cell orders per mode — bands read red-first; `field` lists the six
     1×1 strip cells in reading order; `sq` is the square's quadrant-4 field
     in Z order. Mirrors src/components/InkMark.jsx exactly. */
  modes:{
    full:    { bands:['red','blue','yellow'], field:['stock','ink','green','pink','purple','amber'], sq:['stock','pink','purple','amber'] },
    majors:  { bands:['red','blue','yellow'], field:['stock','ink','stock','ink','ink','stock'],     sq:['stock','ink','stock','ink'] },
    daycode: { bands:['day','ink','day'],     field:['stock','day','ink','day','day','stock'],       sq:['stock','day','day','ink'] },
    ink:     { bands:['ink','stock','ink'],   field:['ink','stock','stock','ink','ink','stock'],     sq:['stock','ink','ink','ink'] }
  },
  /* square-anchored × full: whole neutral pair kept, two minors dropped —
     ink lands on the OUTER corner. */
  anchoredField:['stock','pink','green','ink'],
  floors:{ strip:8, short:6, square:6 }      /* pt per module on print */
};
const INK_MARK_DAY_KEYS = ['mon','tue','wed','thu','fri','sat','sun'];
/* day key → accent name — the canonical weekday pairing (day-colours.json). */
const INK_MARK_DAY_ACCENT = {
  mon:'green', tue:'blue', wed:'purple', thu:'pink', fri:'red', sat:'amber', sun:'yellow'
};
/* form + mode → the cell names for the 3 bands and the field, canon order. */
function inkMarkCells(form, mode){
  const m = INK_MARK.modes[mode] || INK_MARK.modes.full;
  const f = INK_MARK.forms[form] || INK_MARK.forms['strip-v'];
  const field = f.square
    ? ((f.anchored && (mode==='full' || !INK_MARK.modes[mode])) ? INK_MARK.anchoredField : m.sq)
    : (f.field===2 ? m.field.slice(0,2) : m.field);
  return { bands:m.bands.slice(), field:field.slice() };
}
/* form → cell boxes in MODULE units: [{ slot:'b0'…'b2'|'f0'…'f5', x,y,w,h }].
   ONE geometry for the screen divs AND the vector PDF, so the two renderers
   can't drift. Bands 2×2; field cells 1×1; square field in Z order (f3 = the
   outer corner). */
function inkMarkLayout(form){
  const f = INK_MARK.forms[form] || INK_MARK.forms['strip-v'];
  const boxes=[];
  if(f.square){
    boxes.push({ slot:'b0', x:0, y:0, w:2, h:2 });
    boxes.push({ slot:'b1', x:2, y:0, w:2, h:2 });
    boxes.push({ slot:'b2', x:0, y:2, w:2, h:2 });
    for(let i=0;i<4;i++) boxes.push({ slot:'f'+i, x:2+(i%2), y:2+(i>>1), w:1, h:1 });
  } else if(f.cols===2){
    for(let b=0;b<3;b++) boxes.push({ slot:'b'+b, x:0, y:b*2, w:2, h:2 });
    for(let i=0;i<f.field;i++) boxes.push({ slot:'f'+i, x:i%2, y:6+(i>>1), w:1, h:1 });
  } else {
    for(let b=0;b<3;b++) boxes.push({ slot:'b'+b, x:b*2, y:0, w:2, h:2 });
    for(let i=0;i<f.field;i++) boxes.push({ slot:'f'+i, x:6+(i>>1), y:i%2, w:1, h:1 });
  }
  return { cols:f.cols, rows:f.rows, boxes };
}
/* cell name → screen hex. 'day' takes the weekday accent's hue. */
function inkMarkHex(name, dayAccent){
  if(name==='day') return PALETTE[dayAccent] || PALETTE.pink;
  return INK_MARK_CELLS[name] || INK.rgb;
}

/* Flat straight-down shadow — the lifted-edge plane (style guide §05).
   On the white sheet it prints as a soft K tint. {dy, k} per step. */
const LIFT = { none:null, light:{dy:4,k:0.08}, default:{dy:8,k:0.12}, heavy:{dy:12,k:0.18} };

/* Generalised plane shadow — the Poster Studio shadow model, print-grade.
   Presets stay the flat straight-down K-tint above; lift:'custom' opens the
   dials: shadowDist (pt) · shadowAngle (deg, 90 = straight down) · shadowColor
   ('k' soft press tint | 'ink' | any accent — the hard riso shadow) ·
   shadowAlpha (0..1). Always FLAT (zero blur): a vector offset both renderers
   can draw identically — blur would force rasterising the whole sheet.
   Returns { dx, dy, color, alpha } (color 'k'|'ink'|'white'|accent) or null. */
function shadowSpec(el){
  const key = el.lift||'none';
  if(key==='custom'){
    const dist = el.shadowDist!=null?el.shadowDist:8;
    if(!(dist>0)) return null;
    const ang = (el.shadowAngle!=null?el.shadowAngle:90)*Math.PI/180;
    const color = el.shadowColor||'k';
    const alpha = el.shadowAlpha!=null?el.shadowAlpha:(color==='k'?0.12:1);
    return { dx:Math.round(Math.cos(ang)*dist*100)/100, dy:Math.round(Math.sin(ang)*dist*100)/100, color, alpha };
  }
  const s = LIFT[key];
  return s ? { dx:0, dy:s.dy, color:'k', alpha:s.k } : null;
}
/* screen CSS colour for a shadow spec (the PDF resolves it to CMYK itself) */
function shadowCss(spec){
  if(!spec) return null;
  let rgb;
  if(spec.color==='k') rgb = 'rgba(13,9,5,'+spec.alpha+')';
  else {
    const hex = spec.color==='ink' ? INK.rgb : spec.color==='white' ? WHITE.rgb : (PALETTE[spec.color]||INK.rgb);
    const r=parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16);
    rgb = 'rgba('+r+','+g+','+b+','+spec.alpha+')';
  }
  return spec.dx+'px '+spec.dy+'px 0 '+rgb;
}

/* ---- layout grid — margins + columns/rows with gutters -------------------
   The Swiss backbone: doc.marginMm sets the safe margin; doc.grid holds
   { cols, rows, gutter } (0 = off). Returns snap targets (xs/ys — every
   column/row EDGE plus the margins and centre) and the column/row boxes for
   the canvas overlay. Both the canvas snapper and the overlay read this, so
   what you see is exactly what you snap to. */
function gridSpec(doc, dims){
  const m = (doc.marginMm!=null?doc.marginMm:6)*PT_PER_MM;
  const g = doc.grid||{};
  const cols = Math.max(0, g.cols|0), rows = Math.max(0, g.rows|0);
  const gut = g.gutter!=null?g.gutter:12;
  const innerW = dims.wpt-m*2, innerH = dims.hpt-m*2;
  const xs = [m, dims.wpt/2, dims.wpt-m];
  const ys = [m, dims.hpt/2, dims.hpt-m];
  const colBoxes = [], rowBoxes = [];
  if(cols>1 && innerW>cols*8){
    const cw = (innerW-(cols-1)*gut)/cols;
    for(let i=0;i<cols;i++){
      const x0 = m+i*(cw+gut);
      colBoxes.push([x0, x0+cw]);
      if(i>0){ xs.push(x0-gut); } xs.push(x0); xs.push(x0+cw);
    }
  }
  if(rows>1 && innerH>rows*8){
    const rh = (innerH-(rows-1)*gut)/rows;
    for(let i=0;i<rows;i++){
      const y0 = m+i*(rh+gut);
      rowBoxes.push([y0, y0+rh]);
      if(i>0){ ys.push(y0-gut); } ys.push(y0); ys.push(y0+rh);
    }
  }
  return { m, cols, rows, gutter:gut, xs, ys, colBoxes, rowBoxes, innerW, innerH };
}

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

/* ---- rule / divider — the line element as an expressive kit. One shared layout
   so the screen SVG and the vector PDF draw IDENTICAL geometry (LOCAL coords,
   y-down, centred on my=h/2). Patterns: solid · dashed · dotted · dashdot ·
   double · triple · ticks · zigzag · wave · square. Optional terminals
   (dot/arrow/diamond/star) at either end. Returns everything as point arrays so
   the misregistration echo is a trivial offset. Reads el.pattern, falling back
   to the legacy el.style, so existing rules keep working. ---- */
function ruleLayout(el){
  const W=Math.max(1,el.w), H=Math.max(1,el.h), w=Math.max(0.5, el.weight||3), my=H/2;
  const pat=el.pattern||el.style||'solid';
  const term=el.term||'none', termAt=el.termAt||'end';
  const tHas=(s)=> term!=='none' && (termAt==='both'||termAt===s);
  const ts=Math.max(2.5, Math.min(H/2, (w*2.2)*(el.termScale||1)));
  const extOf = term==='arrow' ? 2*ts : (term==='none'?0:ts);
  const x0=tHas('start')?extOf:0, x1=W-(tHas('end')?extOf:0), span=Math.max(1, x1-x0);
  const strokes=[], dots=[], fills=[];
  const period=Math.max(2, el.spacing!=null?el.spacing : (pat==='dotted'?Math.max(4,w*2.6) : pat==='ticks'?14 : pat==='wave'?28 : pat==='zigzag'?24 : pat==='square'?26 : Math.max(6,w*4)));
  const amp=Math.max(1, Math.min(H/2 - w/2, el.amp!=null?el.amp : Math.min(H/2 - w/2, 7)));

  if(x1>x0){
    if(pat==='double'){ const g=el.gap!=null?el.gap:Math.max(2,w*1.7); strokes.push({pts:[[x0,my-g/2],[x1,my-g/2]]},{pts:[[x0,my+g/2],[x1,my+g/2]]}); }
    else if(pat==='triple'){ const g=el.gap!=null?el.gap:Math.max(2,w*1.7); strokes.push({pts:[[x0,my-g],[x1,my-g]]},{pts:[[x0,my],[x1,my]]},{pts:[[x0,my+g],[x1,my+g]]}); }
    else if(pat==='dashed'){ const on=period*(el.dashRatio!=null?Math.max(0.1,Math.min(0.9,el.dashRatio)):0.55); for(let x=x0;x<x1-0.01;x+=period) strokes.push({pts:[[x,my],[Math.min(x+on,x1),my]]}); }
    else if(pat==='dotted'){ const r=Math.max(0.6,(el.dotSize!=null?el.dotSize:w)/2), n=Math.max(1,Math.round(span/period)), st=span/n; for(let i=0;i<=n;i++) dots.push({x:x0+i*st,y:my,r}); }
    else if(pat==='dashdot'){ const on=period*0.42; for(let x=x0;x<x1-0.01;x+=period){ const xe=Math.min(x+on,x1); strokes.push({pts:[[x,my],[xe,my]]}); const xd=xe+(period-on)/2; if(xd<x1-0.01) dots.push({x:xd,y:my,r:Math.max(0.9,w*0.72)}); } }
    else if(pat==='ticks'){ strokes.push({pts:[[x0,my],[x1,my]]}); const tl=Math.max(1,el.tickLen!=null?el.tickLen:Math.min(H/2-w/2,6)), dir=el.tickDir||'both', n=Math.max(1,Math.round(span/period)), st=span/n; for(let i=0;i<=n;i++){ const x=x0+i*st, up=dir!=='down'?tl:0, dn=dir!=='up'?tl:0; strokes.push({pts:[[x,my-up],[x,my+dn]]}); } }
    else if(pat==='zigzag'){ const pts=[[x0,my]]; let i=0; for(let x=x0+period/2;x<x1-0.01;x+=period/2){ pts.push([x, my+(i%2?amp:-amp)]); i++; } pts.push([x1,my]); strokes.push({pts}); }
    else if(pat==='square'){ let lvl=-amp; const pts=[[x0,my+lvl]]; for(let x=x0+period/2;x<x1-0.01;x+=period/2){ pts.push([x,my+lvl]); lvl=-lvl; pts.push([x,my+lvl]); } pts.push([x1,my+lvl]); strokes.push({pts}); }
    else if(pat==='wave'){ const steps=Math.max(16,Math.round(span/2)), pts=[]; for(let i=0;i<=steps;i++){ const x=x0+span*i/steps; pts.push([x, my+amp*Math.sin(((x-x0)/period)*Math.PI*2)]); } strokes.push({pts}); }
    else { strokes.push({pts:[[x0,my],[x1,my]]}); }
  }

  function addTerm(s){
    const isStart=s==='start', cx=isStart?x0:x1;
    if(term==='dot') dots.push({x:cx,y:my,r:ts});
    else if(term==='diamond') fills.push({pts:[[cx,my-ts],[cx+ts,my],[cx,my+ts],[cx-ts,my]]});
    else if(term==='star') fills.push({pts:_starPts(cx,my,ts,5,0.42,-90)});
    else if(term==='arrow'){ const tipX=isStart?0:W, baseX=isStart?2*ts:W-2*ts; fills.push({pts:[[tipX,my],[baseX,my-ts],[baseX,my+ts]]}); }
  }
  if(tHas('start')) addTerm('start');
  if(tHas('end')) addTerm('end');

  return { strokes, dots, fills, w, cap: el.cap==='butt'?'butt':'round' };
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
/* ---- border style → dash array + cap. Shared by the screen border overlay and
   the PDF stroke so a dashed/dotted/dash-dot box border is WYSIWYG. Both stroke
   the SAME roundedRectPath, so the dash phase lands identically at the corners.
   Values scale with the stroke width so the rhythm holds at any weight. ---- */
function borderDash(pattern, w){
  w=Math.max(0.5, w||1);
  if(pattern==='dashed')  return { dash:[w*2.6, w*1.9], cap:'butt'  };
  if(pattern==='dotted')  return { dash:[0.01,  w*2.0], cap:'round' };
  if(pattern==='dashdot') return { dash:[w*2.8, w*1.7, 0.01, w*1.7], cap:'round' };
  return { dash:null, cap:'butt' };   // solid
}
function _poly(pts){ return 'M '+pts.map(p=>p[0].toFixed(2)+' '+p[1].toFixed(2)).join(' L ')+' Z'; }
function _regPoly(cx,cy,r,n,startDeg){ const p=[]; for(let i=0;i<n;i++){ const a=(startDeg+i*360/n)*Math.PI/180; p.push([cx+Math.cos(a)*r, cy+Math.sin(a)*r]); } return _poly(p); }
function _starPts(cx,cy,R,n,inner,startDeg){ const p=[]; for(let i=0;i<n*2;i++){ const r=i%2?R*inner:R, a=(startDeg+i*180/n)*Math.PI/180; p.push([cx+Math.cos(a)*r, cy+Math.sin(a)*r]); } return p; }
function _star(cx,cy,R,n,inner,startDeg){ return _poly(_starPts(cx,cy,R,n,inner,startDeg)); }
function _scalePath(d,w,h){ let i=0; return d.replace(/-?\d*\.?\d+/g, m=> ((i++%2)===0 ? parseFloat(m)*w : parseFloat(m)*h).toFixed(2) ); }
/* kind → path for a w×h box. circle/ellipse return null (renderers draw an
   ellipse). Polygons inscribe in the short-side circle (stay regular); box
   shapes fill the rectangle. */
/* Keep this list + shapePath IDENTICAL to their twins in
   public/studio/studio-data.jsx — Poster Studio draws the same shapes from the
   same geometry, and a kind added to one studio only is a silent divergence. */
const SHAPE_KINDS=['circle','rounded','squircle','rect','pill','triangle','diamond','pentagon','hexagon','octagon','star5','star6','chevron','cross','banner','shield','arch','heart','blob','drop','arrow','halfdisc','quarter','bolt'];
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
    case 'drop':     return _scalePath('M 0.50 0.0 C 0.78 0.30 0.92 0.48 0.92 0.64 C 0.92 0.87 0.73 1.0 0.50 1.0 C 0.27 1.0 0.08 0.87 0.08 0.64 C 0.08 0.48 0.22 0.30 0.50 0.0 Z', w, h);
    case 'arrow':    { const s=h*0.28; return _poly([[0,cy-s],[w*0.58,cy-s],[w*0.58,0],[w,cy],[w*0.58,h],[w*0.58,cy+s],[0,cy+s]]); }
    case 'halfdisc': return `M 0 ${h} L 0 ${cy.toFixed(2)} A ${cx.toFixed(2)} ${cy.toFixed(2)} 0 0 1 ${w} ${cy.toFixed(2)} L ${w} ${h} Z`;
    case 'quarter':  return `M 0 ${h} L 0 0 A ${w} ${h} 0 0 1 ${w} ${h} Z`;
    case 'bolt':     return _scalePath('M 0.62 0.0 L 0.14 0.56 L 0.44 0.56 L 0.34 1.0 L 0.86 0.40 L 0.55 0.40 Z', w, h);
    default:         return _poly([[0,0],[w,0],[w,h],[0,h]]);
  }
}

/* ---- icon geometry — the Year 2 glyph set (print-icons.js), fitted to a box.
   Glyphs are 24×24 primitive lists; we centre a uniform scale into the element
   and hand both renderers the SAME scaled primitives, so screen SVG and PDF
   vector match. Stroke width scales with the glyph (a 200pt icon keeps its
   visual 2px-at-24 weight). `solid` fills the non-linear primitives. */
function iconLayout(el){
  const g = (window.ICON_GLYPHS||{})[el.kind] || null;
  if(!g) return null;
  const s = Math.min(el.w, el.h)/24;
  const ox = (el.w-24*s)/2, oy = (el.h-24*s)/2;
  const sw = 2*(el.strokeScale!=null?el.strokeScale:1)*s;
  const prims = g.map(p=>{
    const stroke = !!p.linear || p.t==='line' || !el.solid;
    if(p.t==='rect')    return { t:'rect', x:ox+p.x*s, y:oy+p.y*s, w:p.w*s, h:p.h*s, stroke };
    if(p.t==='line')    return { t:'line', x1:ox+p.x1*s, y1:oy+p.y1*s, x2:ox+p.x2*s, y2:oy+p.y2*s, stroke:true };
    if(p.t==='ellipse') return { t:'ellipse', cx:ox+p.cx*s, cy:oy+p.cy*s, rx:p.rx*s, ry:p.ry*s, stroke };
    if(p.t==='poly'){
      const pts = p.points.trim().split(/[\s,]+/).map(Number);
      const out=[]; for(let i=0;i<pts.length;i+=2) out.push([ox+pts[i]*s, oy+pts[i+1]*s]);
      return { t:'poly', pts:out, stroke };
    }
    if(p.t==='path')    return { t:'path', d:_scaleSvgPath(p.d, s, ox, oy), stroke };
    return null;
  }).filter(Boolean);
  return { prims, sw, s };
}
/* uniform-scale + translate every coordinate in a simple SVG path string.
   Handles the command set the icon glyphs actually use (M L H V C Q T A Z,
   absolute + relative). Arc flags are passed through untouched. */
function _scaleSvgPath(d, s, ox, oy){
  let out='', i=0;
  const toks = d.match(/[a-zA-Z]|-?\d*\.?\d+(?:e-?\d+)?/g)||[];
  let cmd='';
  while(i<toks.length){
    const t=toks[i];
    if(/[a-zA-Z]/.test(t)){ cmd=t; out+=(out?' ':'')+t; i++; continue; }
    const rel = cmd===cmd.toLowerCase() && cmd!=='z';
    const C = cmd.toUpperCase();
    let nums;
    if(C==='H'||C==='V'){ nums=[parseFloat(toks[i])]; i+=1; }
    else if(C==='A'){ nums=toks.slice(i,i+7).map(parseFloat); i+=7; }
    else if(C==='C'){ nums=toks.slice(i,i+6).map(parseFloat); i+=6; }
    else if(C==='S'||C==='Q'){ nums=toks.slice(i,i+4).map(parseFloat); i+=4; }
    else { nums=toks.slice(i,i+2).map(parseFloat); i+=2; }   // M L T
    let scaled;
    if(C==='A'){
      scaled=[nums[0]*s, nums[1]*s, nums[2], nums[3], nums[4],
              rel?nums[5]*s:nums[5]*s+ox, rel?nums[6]*s:nums[6]*s+oy];
    } else if(C==='H'){ scaled=[rel?nums[0]*s:nums[0]*s+ox]; }
    else if(C==='V'){ scaled=[rel?nums[0]*s:nums[0]*s+oy]; }
    else { scaled=nums.map((n,j)=> rel? n*s : (j%2===0? n*s+ox : n*s+oy)); }
    out += ' '+scaled.map(n=>+n.toFixed(3)).join(' ');
  }
  return out;
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

/* ---- QR destinations — one-tap targets so a standee can be pointed at a real
   REALITY link without retyping. Values verified from the app / confirmed by
   Donald; the inspector fills `data` from these, then it's freely editable. ---- */
const QR_DESTINATIONS = [
  { id:'website',  label:'Website',   data:'https://realitydn.com',                     hint:'realitydn.com' },
  { id:'checkin',  label:'Check-in',  data:'https://app.realitydn.com/here',            hint:'Presence · joins tonight’s game' },
  { id:'menu',     label:'Menu',      data:'https://app.realitydn.com/menu',            hint:'Drinks + food' },
  { id:'hub',      label:'App hub',   data:'https://app.realitydn.com',                 hint:'Session / programming hub' },
  { id:'instagram',label:'Instagram', data:'https://instagram.com/reality.dn',          hint:'@reality.dn' },
  { id:'reviews',  label:'Reviews',   data:'https://maps.app.goo.gl/mRQfWUwx3nXT5vsn7', hint:'Google Maps · leave a ★' },
];

/* 5-point star as one closed vector path (points up), radius r about (cx,cy).
   Shared by the screen SVG + the PDF so the centre mark is pixel-identical. */
function starPath(cx,cy,r){ return _star(cx,cy,r,5,0.42,-90); }

/* ---- QR geometry — the styling brain shared by the screen (SVG) and the PDF
   (vector), so a stylized code is WYSIWYG. Classifies the module matrix into
   data cells and the three finder eyes (which are kept structurally whole —
   solid ring + centre — so any scanner still locks on), applies the chosen
   module / eye shapes, and reserves an optional centre-logo knockout. Emits
   renderer-agnostic descriptors in MODULE units (0..tot, quiet zone folded in);
   each renderer just maps kind→primitive and role→colour. A centre logo forces
   ECL H so the codewords it covers are always recoverable. ---- */
function qrGeometry(text, opts){
  opts = opts||{};
  const hasLogo = !!opts.logo && opts.logo!=='none';
  const ecl = hasLogo ? 'H' : (opts.ecl||'M');
  const m = buildQR(text, ecl); if(!m) return null;
  const n = m.length;
  const quiet = opts.quiet!==false ? 4 : 0;
  const tot = n + quiet*2;
  const mod = opts.moduleStyle || 'square';
  const eye = opts.eyeStyle || 'square';
  const inEye = (r,c)=> (r<7&&c<7) || (r<7&&c>=n-7) || (r>=n-7&&c<7);
  /* centre knockout — an odd-sized module box so it stays centred on the grid */
  let logo=null;
  if(hasLogo){ let s=Math.round(n*0.21); if(s%2===0) s+=1; s=Math.max(5,s);
    const o=Math.floor((n-s)/2); logo={ r0:o, c0:o, s }; }
  const inLogo=(r,c)=> logo && r>=logo.r0 && r<logo.r0+logo.s && c>=logo.c0 && c<logo.c0+logo.s;

  const shapes=[];
  const dataShape=(x,y)=>{
    if(mod==='dot')     return { kind:'circle',    role:'data', cx:x+0.5, cy:y+0.5, r:0.5 };
    if(mod==='rounded') return { kind:'roundrect', role:'data', x, y, w:1, h:1, r:0.32 };
    return { kind:'rect', role:'data', x, y, w:1, h:1 };
  };
  for(let r=0;r<n;r++) for(let c=0;c<n;c++){
    if(!m[r][c] || inEye(r,c) || inLogo(r,c)) continue;
    shapes.push(dataShape(quiet+c, quiet+r));
  }
  /* finder eyes: outer ring (7×7) + light knockout (5×5) + inner pip (3×3),
     three of them. Shapes stacked in order so the ring reads. */
  /* Every eye keeps a (rounded-)square OUTER frame so the 1:1:3:1:1 finder
     detection stays rock-solid; the style only varies the corner rounding + the
     centre pip. A pure-circle outer ring drops the finder corners and fails
     stricter scanners — so "dot" = rounded frame + a round pip, not a full disc. */
  const oK = eye==='square' ? 'rect' : 'roundrect';
  const oR = eye==='square' ? 0 : 1.9;
  [[0,0],[0,n-7],[n-7,0]].forEach(([r0,c0])=>{
    const x=quiet+c0, y=quiet+r0;
    shapes.push({ kind:oK, role:'eye',     x:x,   y:y,   w:7, h:7, r:oR });
    shapes.push({ kind:oK, role:'eyeHole', x:x+1, y:y+1, w:5, h:5, r:Math.max(0,oR-0.6) });
    if(eye==='dot') shapes.push({ kind:'circle', role:'eye', cx:x+3.5, cy:y+3.5, r:1.5 });
    else            shapes.push({ kind:oK, role:'eye', x:x+2, y:y+2, w:3, h:3, r:Math.max(0,oR-1.2) });
  });
  /* logo knockout patch (light) — sits above data/eyes to guarantee a clean
     quiet ring around the mark; the mark itself is drawn from `logo` below. */
  if(logo){ shapes.push({ kind:'roundrect', role:'logoBg',
    x:quiet+logo.c0-0.7, y:quiet+logo.r0-0.7, w:logo.s+1.4, h:logo.s+1.4, r:1.4 }); }

  return { n, quiet, tot, shapes, ecl, logoKind: hasLogo ? opts.logo : 'none',
    logo: logo ? { cx:quiet+logo.c0+logo.s/2, cy:quiet+logo.r0+logo.s/2, s:logo.s } : null };
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
    { type:'pricelist',label:'Price list', hint:'Menu rows · 1–2 columns' },
    { type:'qr',       label:'QR standee', hint:'Scan to any link' },
    { type:'coupon',   label:'Coupon',     hint:'Voucher with code', wide:true },
    { type:'punchgrid',label:'Punch card', hint:'Loyalty stamp grid' },
  ]},
  { group:'Image · icons', items:[
    { type:'image',    label:'Image',       hint:'Photo + riso effects', wide:true },
    { type:'icon',     label:'Icon',        hint:'Year 2 glyph set · vector' },
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
    { type:'inkmark',  label:'Ink mark',       hint:'The strip / square · canon' },
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
  // Tracking defaults follow the CANON LADDER (reality-tokens.css/.json,
  // baked per role — no size-derived formula) PLUS the print offset (+.01em,
  // "one ladder, two offsets"): display .015→.025 · label .16→.17 ·
  // name 0→.01 · body stays 0 (Grotesk states facts). headline/numeral/
  // bignum = display · kicker = label. Enforced by
  // tools/verify-day-colours.mjs §TYPE — change the ladder there first.
  headline:  { w:320, h:96,  props:{ text:'HEADLINE', fam:'mont', weight:800, fontSize:46, align:'left', surface:'none', ink:'auto', fill:'pink', tracking:0.025, leading:0.92, upper:true, border:2, lift:'none', echo:false, echoAccent:'auto', echoDx:4, echoDy:4 } },
  numeral:   { w:200, h:160, props:{ text:'01', fam:'mont', weight:100, fontSize:128, align:'center', surface:'none', ink:'auto', fill:'pink', tracking:0.025, leading:0.88, upper:true, lift:'none', echo:false, echoAccent:'auto', echoDx:5, echoDy:5 } },
  bignum:    { w:220, h:120, props:{ text:'4–7', fam:'mont', weight:800, fontSize:90, align:'center', surface:'none', ink:'auto', fill:'pink', tracking:0.025, leading:0.9, upper:true, lift:'none', echo:false, echoAccent:'auto', echoDx:4, echoDy:4 } },
  kicker:    { w:240, h:24,  props:{ text:'EYEBROW LABEL', fam:'mont', weight:700, fontSize:11, align:'left', surface:'none', ink:'pink', fill:'pink', tracking:0.17, leading:1.1, upper:true } },
  body:      { w:300, h:80,  props:{ text:'Readable body copy goes here. Keep it short and bold.', fam:'grot', weight:400, fontSize:13, align:'left', surface:'none', ink:'auto', fill:'pink', tracking:0, leading:1.34, upper:false } },
  pricelist: { w:280, h:150, props:{ heading:'HAPPY HOUR', items:[{l:'House pour',p:'50k'},{l:'Draft beer',p:'45k'},{l:'Highball',p:'65k'}], fam:'mont', listStyle:'prices', marker:'•', markerColor:'auto', surface:'none', ink:'ink', fill:'pink', dotLeader:true, border:2, lift:'none', cols:1, rowSize:'m', headingColor:'auto', upper:true } },
  qr:        { w:170, h:210, props:{ data:'https://app.realitydn.com/menu', caption:'SCAN THE MENU', ecl:'M', quiet:true,
               moduleStyle:'square', eyeStyle:'square', eye:'auto', logo:'none', logoColor:'auto', echo:false, echoAccent:'auto',
               surface:'none', ink:'ink', fill:'pink', border:2, lift:'none' } },
  coupon:    { w:300, h:150, props:{ heading:'VOUCHER', big:'1 FREE COFFEE', terms:'One per guest · dine-in', code:'REALITY-000', fam:'mont', surface:'outline', ink:'ink', fill:'pink', border:1.4, borderPattern:'dashed', borderColor:'auto', radius:0, lift:'none' } },
  block:     { w:240, h:120, props:{ fill:'pink', radius:0, border:0, lift:'none', echo:false, echoAccent:'auto', echoDx:8, echoDy:8, blend:'normal' } },
  slab:      { w:320, h:150, props:{ fill:'blue', angle:-12, lift:'none', echo:false, echoAccent:'auto', echoDx:9, echoDy:9, blend:'normal' } },
  stripes:   { w:320, h:90,  props:{ fill:'red', bg:'white', dir:'diag', count:8, ratio:0.5, lift:'none', echo:false, echoAccent:'auto', echoDx:9, echoDy:9, blend:'normal' } },
  dotfield:  { w:200, h:170, props:{ fill:'amber', dot:9, gap:6, bg:'white', shape:'circle', grad:'out', ramp:0.8, angle:0, lift:'none', echo:false, echoAccent:'auto', echoDx:8, echoDy:8, blend:'normal' } },
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
  rule:      { w:260, h:20,  props:{ fill:'ink', weight:3, pattern:'solid', spacing:12, dashRatio:0.55, amp:7, gap:6, cap:'round', tickLen:6, tickDir:'both', term:'none', termAt:'end', echo:false, echoAccent:'auto' } },
  /* mark:'on' — the canon ink mark on the footer (square flush with the QR /
     short strip when there's none). ABSENT = ON by design: the footer is the
     print ticket, the brand carrier, so saved docs + templates gain it.
     markForm 'auto' keeps that pairing; 'square' / 'strip' (7×2) /
     'strip-long' (9×2) force one form. markMode (full / majors / ink)
     recolours — DELIBERATELY absent: unset keeps each form's classic ink
     (square full · strip majors), so older docs render unchanged. */
  footer:    { w:540, h:74,  props:{ site:SITE, addr:ADDR, qrData:'https://realitydn.com', showQR:true, mark:'on', markForm:'auto', surface:'none', rule:true, ink:'ink' } },
  wordmark:  { w:240, h:42,  props:{ ink:'ink' } },
  /* The ink strip / square (INK_MARK above) — user-placeable ONLY, never
     auto-placed. On print the paper IS the ground (stock cells unprinted),
     so there's no ground prop here. Default = module 18pt on the 2×9 strip. */
  inkmark:   { w:36,  h:162, props:{ form:'strip-v', mode:'full', day:'fri' } },
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
  burst:     { w:220, h:220, props:{ fill:'amber', rays:16, hub:0.0, hubFill:'white', echo:false, echoAccent:'auto', echoDx:7, echoDy:7, blend:'normal' } },
  /* flexible vector shape — polygon/star/blob/etc. with an optional keyline
     stroke (so it doubles as a non-rectangular die-cut bed). */
  shape:     { w:200, h:200, props:{ kind:'hexagon', fill:'blue', stroke:0, strokeColor:'ink', lift:'none', echo:false, echoAccent:'auto', echoDx:7, echoDy:7, blend:'normal' } },
  /* text set on a circular arc — the round-sticker rim treatment. */
  arctext:   { w:240, h:240, props:{ text:'REALITY · ĐÀ NẴNG', fam:'mont', weight:700, fontSize:24, tracking:0.08, fill:'ink', flip:false, radiusAdj:0, upper:true } },
  /* Year 2 geometric glyph — 24×24 primitives scaled to the box, drawn as true
     vector strokes in the PDF. `solid` fills the closed primitives. */
  icon:      { w:110, h:110, props:{ kind:'drink', ink:'ink', solid:false, strokeScale:1, echo:false, echoAccent:'auto', echoDx:5, echoDy:5, lift:'none', blend:'normal' } },
  /* loyalty punch grid — outlined stamp cells; bonus fills the last cell */
  punchgrid: { w:260, h:96,  props:{ cols:5, rows:2, cell:'circle', gap:8, stroke:1.5, ink:'ink', numbered:true, bonus:true, bonusFill:'pink', bonusLabel:'★', blend:'normal' } },
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
const TEMPLATE_GROUPS = ['Stickers', 'QR standee', 'Wayfinding', 'Menus'];
/* Rebuilt 24.08.26 against current canon. The previous set was 79 layouts
   across seven groups, much of it speculative — tip jars, Zalo, VietQR,
   loyalty punch cards, room-capacity signs — none of which we print. This is
   the core: fifteen pieces we actually put on a wall, a table or a laptop.
   Specials, Merch and Tags & coupons are retired; a one-off promo is a
   My-template, not a shipped default.

   Everything here is on the current system:
     · the mark rides the footer (full 9x2 strip bare, or the square flush
       against the footer QR) — no piece places a second one;
     · Montserrat NAMES, Grotesk STATES facts, so every price, time and
       address is Grotesk with tabular figures;
     · tracking comes off the print ladder via the components, never inline;
     · REGISTER follows canon M2. Signage and standees are FAR, so they keep
       caps. Menus and table cards are NEAR — M2 names a printed menu
       explicitly — so their headings and item names are sentence case and
       `upper:false`. That is the one visible break with the old set.
     · purple fills take cream text and everything else takes ink, straight
       out of contrastInk;
     · QR targets are the real ones: app.realitydn.com for check-in, menu and
       the hub; the printed site string stays realitydn.com.
   Prices stay in the short 85k form — that is the printed-menu register here,
   and 45.000d is the app and web form. */
const TEMPLATES = [
  /* ---- STICKERS · square die-cut stock, the visible shape drawn inside ---- */
  { id:"stk-stamp-round", name:"Round stamp", group:"Stickers", size:"st100", orient:"portrait", accent:"red", els:[
    {"type":"sticker","x":8,"y":8,"w":267,"h":267,"p":{"shape":"circle","fill":"white","ring":"red","ringW":8}},
    {"type":"arctext","x":30,"y":30,"w":223,"h":223,"p":{"text":"REALITY · BAR · CAFÉ","fill":"red","fontSize":21}},
    {"type":"arctext","x":30,"y":30,"w":223,"h":223,"p":{"text":"ĐÀ NẴNG · SINCE 2024","fill":"red","fontSize":17,"flip":true}},
    {"type":"inkmark","x":110,"y":110,"w":64,"h":64,"p":{"form":"square-anchored","mode":"full"}}
  ]},
  { id:"stk-mark-square", name:"The mark", group:"Stickers", size:"st75", orient:"portrait", accent:"blue", els:[
    {"type":"sticker","x":6,"y":6,"w":201,"h":201,"p":{"shape":"squircle","fill":"white","ring":"ink","ringW":5,"radius":0.28}},
    {"type":"inkmark","x":47,"y":40,"w":120,"h":120,"p":{"form":"square-anchored","mode":"full"}},
    {"type":"wordmark","x":57,"y":172,"w":100,"h":17,"p":{"ink":"ink"}}
  ]},
  { id:"stk-qr-scan", name:"Scan sticker", group:"Stickers", size:"st75", orient:"portrait", accent:"pink", els:[
    {"type":"sticker","x":6,"y":6,"w":201,"h":201,"p":{"shape":"circle","fill":"white","ring":"pink","ringW":5}},
    {"type":"qr","x":57,"y":40,"w":99,"h":124,"p":{"data":"https://app.realitydn.com","caption":"WHAT'S ON","quiet":true}},
    {"type":"kicker","x":34,"y":170,"w":145,"h":18,"p":{"text":"REALITY · ĐÀ NẴNG","ink":"pink","align":"center","fontSize":8}}
  ]},

  /* ---- QR STANDEE · far register, caps. The code is the whole point, so the
     footer runs without one and carries the full strip instead. ---- */
  { id:"qr-checkin-a5", name:"Check in — A5 standee", group:"QR standee", size:"a5", orient:"portrait", accent:"green", els:[
    {"type":"block","x":0,"y":0,"w":420,"h":170,"p":{"fill":"green"}},
    {"type":"kicker","x":36,"y":44,"w":348,"h":20,"p":{"text":"REALITY · ĐÀ NẴNG","ink":"ink","align":"left"}},
    {"type":"headline","x":36,"y":70,"w":348,"h":86,"p":{"text":"CHECK\nIN HERE","fontSize":50,"align":"left","weight":800,"ink":"ink","leading":0.9}},
    {"type":"qr","x":130,"y":222,"w":160,"h":196,"p":{"data":"https://app.realitydn.com/here","caption":"SCAN ON ARRIVAL","quiet":true}},
    {"type":"body","x":40,"y":436,"w":340,"h":56,"p":{"text":"One scan when you arrive and you're in tonight's game. No app needed.\nQuét một lần khi đến — check-in và chơi cùng tối nay.","align":"center","fontSize":12,"leading":1.34}},
    {"type":"footer","x":36,"y":505,"w":348,"h":64,"p":{"showQR":false}}
  ]},
  { id:"qr-menu-a6", name:"Menu — table card", group:"QR standee", size:"a6", orient:"portrait", accent:"blue", els:[
    {"type":"kicker","x":24,"y":30,"w":250,"h":18,"p":{"text":"REALITY · BAR · CAFÉ","ink":"blue","align":"center","fontSize":9}},
    {"type":"headline","x":24,"y":54,"w":250,"h":40,"p":{"text":"THE MENU","fontSize":30,"align":"center","weight":800}},
    {"type":"rule","x":114,"y":102,"w":70,"h":4,"p":{"fill":"blue","weight":3}},
    {"type":"qr","x":79,"y":124,"w":140,"h":172,"p":{"data":"https://app.realitydn.com/menu","caption":"DRINKS + FOOD","quiet":true}},
    {"type":"body","x":30,"y":304,"w":238,"h":34,"p":{"text":"Scan for the full list and today's specials.\nQuét để xem toàn bộ thực đơn.","align":"center","fontSize":10,"leading":1.3}},
    {"type":"footer","x":24,"y":344,"w":250,"h":52,"p":{"showQR":false}}
  ]},
  { id:"qr-hub-a5", name:"What's on — A5 standee", group:"QR standee", size:"a5", orient:"portrait", accent:"purple", els:[
    {"type":"block","x":0,"y":0,"w":420,"h":180,"p":{"fill":"purple"}},
    {"type":"kicker","x":36,"y":46,"w":348,"h":20,"p":{"text":"MỖI TUẦN · EVERY WEEK","ink":"white","align":"left"}},
    {"type":"headline","x":36,"y":72,"w":348,"h":92,"p":{"text":"WHAT'S ON\nTHIS WEEK","fontSize":44,"align":"left","weight":800,"ink":"white","leading":0.92}},
    {"type":"qr","x":130,"y":230,"w":160,"h":196,"p":{"data":"https://app.realitydn.com","caption":"EVERY EVENT, LIVE","quiet":true}},
    {"type":"body","x":40,"y":444,"w":340,"h":50,"p":{"text":"Thirty-plus events a week — the live list, always current.\nHơn 30 sự kiện mỗi tuần.","align":"center","fontSize":12,"leading":1.34}},
    {"type":"footer","x":36,"y":505,"w":348,"h":64,"p":{"showQR":false}}
  ]},
  { id:"qr-review-a6", name:"Leave a review", group:"QR standee", size:"a6", orient:"portrait", accent:"amber", els:[
    {"type":"kicker","x":24,"y":30,"w":250,"h":18,"p":{"text":"CẢM ƠN · THANK YOU","ink":"amber","align":"center","fontSize":9}},
    {"type":"headline","x":24,"y":54,"w":250,"h":66,"p":{"text":"LEAVE US\nA REVIEW","fontSize":26,"align":"center","weight":800,"leading":0.94}},
    {"type":"qr","x":79,"y":140,"w":140,"h":172,"p":{"data":"https://maps.app.goo.gl/mRQfWUwx3nXT5vsn7","caption":"GOOGLE MAPS","quiet":true}},
    {"type":"body","x":30,"y":320,"w":238,"h":32,"p":{"text":"Thirty seconds, and it genuinely helps.\nMất 30 giây, và giúp chúng tôi rất nhiều.","align":"center","fontSize":10,"leading":1.3}},
    {"type":"footer","x":24,"y":356,"w":250,"h":52,"p":{"showQR":false}}
  ]},

  /* ---- WAYFINDING · far register. Read across a room, so caps throughout and
     the arrow label sits on the signage rung. ---- */
  { id:"way-toilets-a5", name:"Toilets", group:"Wayfinding", size:"a5", orient:"portrait", accent:"amber", els:[
    {"type":"block","x":0,"y":0,"w":420,"h":150,"p":{"fill":"amber"}},
    {"type":"kicker","x":36,"y":40,"w":348,"h":20,"p":{"text":"NHÀ VỆ SINH","ink":"ink","align":"center"}},
    {"type":"headline","x":30,"y":64,"w":360,"h":72,"p":{"text":"TOILETS","weight":800,"fontSize":54,"ink":"ink","align":"center"}},
    {"type":"arrow","x":110,"y":200,"w":200,"h":180,"p":{"dir":"down","label":"","ink":"amber"}},
    {"type":"body","x":44,"y":404,"w":332,"h":48,"p":{"text":"Down the stairs, second door on the left. Shared, all genders.","align":"center","fontSize":13,"leading":1.34}},
    {"type":"footer","x":36,"y":505,"w":348,"h":64,"p":{"showQR":false}}
  ]},
  { id:"way-rooftop-a4", name:"Rooftop upstairs", group:"Wayfinding", size:"a4", orient:"portrait", accent:"red", els:[
    {"type":"block","x":0,"y":0,"w":595,"h":230,"p":{"fill":"red"}},
    {"type":"kicker","x":44,"y":62,"w":507,"h":22,"p":{"text":"TẦNG THƯỢNG","ink":"ink","align":"center"}},
    {"type":"headline","x":44,"y":92,"w":507,"h":118,"p":{"text":"ROOFTOP\nUPSTAIRS","weight":800,"fontSize":60,"ink":"ink","align":"center","leading":0.92}},
    {"type":"arrow","x":198,"y":290,"w":200,"h":210,"p":{"dir":"up","label":"","ink":"red"}},
    {"type":"body","x":74,"y":528,"w":447,"h":54,"p":{"text":"Third floor — the bar, the patio and most of the live music.\nTầng 3 — quầy bar, sân thượng và nhạc sống.","align":"center","fontSize":15,"leading":1.34}},
    {"type":"footer","x":44,"y":740,"w":507,"h":66,"p":{"showQR":false}}
  ]},
  { id:"way-hours-a5", name:"Opening hours", group:"Wayfinding", size:"a5", orient:"portrait", accent:"green", els:[
    {"type":"kicker","x":34,"y":48,"w":352,"h":22,"p":{"text":"REALITY · ĐÀ NẴNG","align":"center","ink":"green"}},
    {"type":"headline","x":30,"y":78,"w":360,"h":66,"p":{"text":"GIỜ MỞ CỬA","fontSize":38,"align":"center","weight":800}},
    {"type":"rule","x":150,"y":158,"w":120,"h":4,"p":{"fill":"green","weight":4}},
    {"type":"pricelist","x":64,"y":200,"w":292,"h":230,"p":{"heading":"","upper":false,"rowSize":"l","dotLeader":true,"items":[
      {"l":"Thứ 2 – Thứ 5","p":"08:00 – 24:00"},
      {"l":"Thứ 6 – Thứ 7","p":"08:00 – muộn"},
      {"l":"Chủ nhật","p":"09:00 – 23:00"},
      {"l":"Bếp đóng","p":"22:00"}]}},
    {"type":"body","x":44,"y":444,"w":332,"h":40,"p":{"text":"Last call 30 minutes before close.","align":"center","fontSize":13}},
    {"type":"footer","x":36,"y":505,"w":348,"h":64,"p":{"showQR":false}}
  ]},
  { id:"way-house-rules-a4", name:"House rules", group:"Wayfinding", size:"a4", orient:"portrait", accent:"blue", els:[
    {"type":"kicker","x":44,"y":62,"w":507,"h":22,"p":{"text":"REALITY · HOUSE RULES","align":"center","ink":"blue"}},
    {"type":"headline","x":44,"y":92,"w":507,"h":112,"p":{"text":"BE GOOD TO\nEACH OTHER","fontSize":54,"align":"center","weight":800,"leading":0.92}},
    {"type":"rule","x":248,"y":222,"w":100,"h":4,"p":{"fill":"blue","weight":4}},
    {"type":"pricelist","x":88,"y":268,"w":419,"h":195,"p":{"heading":"","listStyle":"bulleted","upper":false,"rowSize":"l","marker":"—","markerColor":"blue","items":[
      {"l":"Everyone is welcome here. Behave like it.","p":""},
      {"l":"Ask before you photograph anyone.","p":""},
      {"l":"Order something if you're using the space.","p":""},
      {"l":"Keep the rooftop quiet after 22:00.","p":""},
      {"l":"Tell a staff member if anything is off.","p":""}]}},
    {"type":"body","x":88,"y":496,"w":419,"h":76,"p":{"text":"Mọi người đều được chào đón. Hãy hỏi trước khi chụp ảnh người khác, gọi món nếu bạn dùng không gian, và giữ yên tĩnh trên sân thượng sau 22:00.","align":"center","fontSize":13,"leading":1.4}},
    {"type":"footer","x":44,"y":740,"w":507,"h":66,"p":{"showQR":true,"qrData":"https://app.realitydn.com"}}
  ]},

  /* ---- MENUS · NEAR register (canon M2 names a printed menu). Headings and
     item names are sentence case; prices are Grotesk facts with tabular
     figures, so a dot-leader column lines up. ---- */
  { id:"menu-drinks-a4", name:"Drinks — A4 board", group:"Menus", size:"a4", orient:"portrait", accent:"pink", els:[
    {"type":"kicker","x":44,"y":44,"w":507,"h":20,"p":{"text":"REALITY · BAR · CAFÉ · ĐÀ NẴNG","ink":"pink","align":"center"}},
    {"type":"headline","x":44,"y":70,"w":507,"h":72,"p":{"text":"Drinks","weight":800,"fontSize":56,"align":"center","upper":false}},
    {"type":"rule","x":44,"y":152,"w":507,"h":10,"p":{"weight":3,"fill":"ink","pattern":"solid"}},
    {"type":"pricelist","x":44,"y":186,"w":507,"h":152,"p":{"heading":"Cocktails","upper":false,"cols":2,"rowSize":"m","dotLeader":true,"items":[
      {"l":"Gin tonic","p":"85k"},{"l":"Negroni","p":"110k"},{"l":"Whisky sour","p":"105k"},
      {"l":"Yuzu gimlet","p":"95k"},{"l":"Espresso martini","p":"110k"},{"l":"Long Island","p":"120k"}]}},
    {"type":"pricelist","x":44,"y":352,"w":507,"h":124,"p":{"heading":"Beer & cider","upper":false,"cols":2,"rowSize":"m","dotLeader":true,"items":[
      {"l":"Draft lager","p":"45k"},{"l":"Draft IPA","p":"55k"},
      {"l":"Cider bottle","p":"60k"},{"l":"Stout can","p":"65k"}]}},
    {"type":"pricelist","x":44,"y":490,"w":507,"h":124,"p":{"heading":"No & low","upper":false,"cols":2,"rowSize":"m","dotLeader":true,"items":[
      {"l":"Soda chanh","p":"40k"},{"l":"Cold brew tonic","p":"50k"},
      {"l":"Kombucha","p":"55k"},{"l":"Juice of the day","p":"45k"}]}},
    {"type":"marquee","x":0,"y":636,"w":595,"h":36,"p":{"text":"HAPPY HOUR 16–19","sep":"★","surface":"solid","fill":"pink","fontSize":14}},
    {"type":"body","x":44,"y":690,"w":507,"h":30,"p":{"text":"Prices in nghìn đồng. Ask the bar what's fresh — hỏi quầy bar món hôm nay.","align":"center","fontSize":12}},
    {"type":"footer","x":44,"y":748,"w":507,"h":66,"p":{"showQR":true,"qrData":"https://app.realitydn.com/menu"}}
  ]},
  { id:"menu-coffee-a5", name:"Cà phê — coffee card", group:"Menus", size:"a5", orient:"portrait", accent:"amber", els:[
    {"type":"icon","x":186,"y":40,"w":48,"h":48,"p":{"kind":"coffee","ink":"amber"}},
    {"type":"headline","x":34,"y":100,"w":352,"h":52,"p":{"text":"Cà phê","weight":800,"fontSize":40,"align":"center","upper":false}},
    {"type":"kicker","x":34,"y":156,"w":352,"h":20,"p":{"text":"RANG TẠI ĐÀ NẴNG · ROASTED HERE","ink":"amber","align":"center","fontSize":9}},
    {"type":"pricelist","x":58,"y":204,"w":304,"h":180,"p":{"heading":"Đen & sữa","upper":false,"rowSize":"m","dotLeader":true,"items":[
      {"l":"Cà phê đen","p":"25k"},{"l":"Cà phê sữa","p":"30k"},
      {"l":"Bạc xỉu","p":"35k"},{"l":"Cà phê muối","p":"40k"}]}},
    {"type":"pricelist","x":58,"y":396,"w":304,"h":140,"p":{"heading":"Espresso bar","upper":false,"rowSize":"m","dotLeader":true,"items":[
      {"l":"Espresso","p":"35k"},{"l":"Flat white","p":"50k"},
      {"l":"Cold brew","p":"55k"}]}},
    {"type":"footer","x":34,"y":520,"w":352,"h":62,"p":{"showQR":false}}
  ]},
  { id:"menu-happyhour-a3", name:"Happy hour — big board", group:"Menus", size:"a3", orient:"portrait", accent:"red", els:[
    {"type":"block","x":0,"y":0,"w":842,"h":300,"p":{"fill":"red"}},
    {"type":"kicker","x":62,"y":92,"w":718,"h":26,"p":{"text":"MỖI NGÀY · EVERY DAY","ink":"ink","align":"center"}},
    {"type":"headline","x":62,"y":128,"w":718,"h":148,"p":{"text":"HAPPY\nHOUR","weight":800,"fontSize":92,"ink":"ink","align":"center","leading":0.9}},
    {"type":"bignum","x":221,"y":350,"w":400,"h":130,"p":{"text":"16–19","fontSize":96,"align":"center","weight":800}},
    {"type":"pricelist","x":141,"y":540,"w":560,"h":340,"p":{"heading":"Half price all night","upper":false,"rowSize":"xxl","dotLeader":true,"items":[
      {"l":"House pour","p":"50k"},{"l":"Draft beer","p":"45k"},
      {"l":"Highball","p":"65k"},{"l":"Glass of wine","p":"70k"}]}},
    {"type":"body","x":141,"y":930,"w":560,"h":50,"p":{"text":"Every day from four until seven. Giá đã bao gồm thuế.","align":"center","fontSize":18,"leading":1.34}},
    {"type":"footer","x":62,"y":1062,"w":718,"h":80,"p":{"showQR":true,"qrData":"https://app.realitydn.com/menu"}}
  ]},
  { id:"menu-table-a6", name:"Table card — tonight", group:"Menus", size:"a6", orient:"portrait", accent:"green", els:[
    {"type":"kicker","x":24,"y":28,"w":250,"h":18,"p":{"text":"TỐI NAY · TONIGHT","ink":"green","align":"center","fontSize":9}},
    {"type":"headline","x":24,"y":50,"w":250,"h":36,"p":{"text":"On the bar","fontSize":26,"align":"center","weight":800,"upper":false}},
    {"type":"rule","x":114,"y":94,"w":70,"h":4,"p":{"fill":"green","weight":3}},
    {"type":"pricelist","x":34,"y":116,"w":230,"h":180,"p":{"heading":"","upper":false,"rowSize":"m","dotLeader":true,"items":[
      {"l":"House pour","p":"50k"},{"l":"Draft beer","p":"45k"},
      {"l":"Cà phê muối","p":"40k"},{"l":"Soda chanh","p":"40k"}]}},
    {"type":"body","x":30,"y":300,"w":238,"h":32,"p":{"text":"Full menu on the card by the till, or scan below.","align":"center","fontSize":10,"leading":1.3}},
    {"type":"footer","x":24,"y":344,"w":250,"h":52,"p":{"showQR":true,"qrData":"https://app.realitydn.com/menu"}}
  ]},
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
  contrastInk, surfaceStyle, resolveInk, buildQR, qrGeometry, starPath, QR_DESTINATIONS, WORDMARK_PATH,
  ADDR, SITE, PARTNER, partnerOf, LIFT, shadowSpec, shadowCss, gridSpec,
  INK_MARK, INK_MARK_CELLS, INK_MARK_DAY_KEYS, INK_MARK_DAY_ACCENT, inkMarkCells, inkMarkLayout, inkMarkHex,
  dotFieldLayout, stripeLayout, burstRays, ruleLayout, borderDash,
  iconLayout, punchLayout, listSplit, LIST_ROW_SIZES, listRowFont,
  roundedRectPath, shapePath, SHAPE_KINDS, fitTextSize, measureTextW, arcTextLayout,
  lineBox, wrapTextW, couponLayout,
  BLEND_MODES, blendCss, blendPdf, risoOpts,
  CATALOG, DEFAULTS, makeElement, uid, slugify,
  TEMPLATES, TEMPLATE_GROUPS, buildTemplate
});
