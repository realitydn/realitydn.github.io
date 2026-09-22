/* ============================================================
   REALITY STUDIOS — the brand, once
   ------------------------------------------------------------
   Poster, Print and Schedule used to carry three hand-typed copies of
   the palette, the weekday coding, the ink mark and the wordmark, kept
   honest only by tools/verify-day-colours.mjs reading each copy's
   literals. They now import this module, and the weekday data is not
   typed here at all: it is DERIVED from public/tokens/day-colours.json
   (canon 18.08.26), which esbuild inlines into each Studio's bundle. So
   the verifier checks one source, and a hue changed in the token file
   reaches every Studio on the next build.

   What stays a literal here, on purpose, and is guarded by the verifier:
     · ACCENTS — the palette ORDER swatch rows are drawn in (names only);
     · the artwork neutrals, ink #0d0905 on cream #fffbf1 (ink-strip.json
       cells; the engine's PAL mirrors them);
     · the ink-mark cell ORDER (ink-strip.json: order is canon);
     · the wordmark's baked letter paths.

   Two neutral pairs, one rule. Poster + Schedule artwork is ink on
   cream; Print's canon screen pair is #111111 on true white (the
   `print` block of day-colours.json — the PDF itself is K-only and
   never sees the hex). Everything that depends on the substrate takes
   the pair as a PARAMETER (contrastInk, the ink-mark cells) rather
   than forking.
   ============================================================ */
import CANON from '../tokens/day-colours.json';

/* ---- the weekday coding, from canon ------------------------------- */
const DAY_KEYS  = ['mon','tue','wed','thu','fri','sat','sun'];   // ISO 1..7
const DAY_NAMES = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const DAY_ABBR  = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];   // house form (never uppercased by the Poster)

/* day key → accent name ('--green' → 'green'). A token the palette doesn't
   know is a canon error; say so loudly rather than paint a blank day. */
const DAY_ACCENT = {};
DAY_KEYS.forEach(d=>{
  const day = CANON.days && CANON.days[d];
  if(!day) throw new Error('brand.js: day-colours.json has no "'+d+'"');
  DAY_ACCENT[d] = String(day.token).replace(/^--/,'');
});

/* ---- the locked palette ------------------------------------------- */
/* The seven accents in swatch order. Names only — every hex comes off the
   weekday it codes for in day-colours.json. */
const ACCENTS = ['blue','green','yellow','amber','purple','pink','red'];
/* the artwork neutrals (ink-strip.json cells; riso-press PAL mirrors them) */
const INK_HEX   = '#0d0905';
const CREAM_HEX = '#fffbf1';
const WHITE_HEX = '#ffffff';
/* The two substrate pairs. `ink` is the dark neutral, `light` the sheet. */
const NEUTRALS = {
  artwork: { ink:INK_HEX, light:CREAM_HEX },                       // Poster + Schedule
  print:   { ink:CANON.print.ink, light:CANON.print.stock },       // Print: #111111 on true white
};

const PALETTE = {};
ACCENTS.forEach(a=>{
  const d = DAY_KEYS.find(k=>DAY_ACCENT[k]===a);
  if(!d) throw new Error('brand.js: no weekday in day-colours.json codes for "'+a+'"');
  PALETTE[a] = CANON.days[d].hex.toLowerCase();
});
/* the two neutrals — valid anywhere an ink key is stored */
PALETTE.ink = INK_HEX;
PALETTE.cream = CREAM_HEX;

/* what ink swatch pickers (and a press's plates) offer: the seven accents
   plus the neutrals. ACCENTS stays the day-coding seven. */
const INK_CHOICES = ACCENTS.concat(['ink','cream']);
/* tooltip label for an ink key — the neutrals get their brand names */
const inkTitle = a => a==='ink' ? 'Ink' : a==='cream' ? 'Cream' : a;

/* ---- weekday tables, in the shapes the Studios read ---------------- */
/* Poster: accent ↔ weekday name. Amber is the schedule's "orange". */
const ACCENT_DAYS = {};                         // yellow → 'Sunday'
const ACCENT_BY_DAY = {};                       // 'Sunday' → yellow
DAY_KEYS.forEach((d,i)=>{ ACCENT_DAYS[DAY_ACCENT[d]] = DAY_NAMES[i]; ACCENT_BY_DAY[DAY_NAMES[i]] = DAY_ACCENT[d]; });
const ACCENTS_BY_DAY = DAY_KEYS.map(d=>DAY_ACCENT[d]);   // green,blue,purple,pink,red,amber,yellow
function accentDay(accent){
  const day = ACCENT_DAYS[accent]; if(!day) return null;
  const i = DAY_NAMES.indexOf(day);
  return { name:day, abbr:DAY_ABBR[i], n:i+1 };
}
/* Schedule: keyed by ISO weekday 1=Mon..7=Sun. DAY_TEXT is canon's `on`
   (cream on purple, ink on the rest). */
const DAY_COLORS = {}, DAY_TEXT = {}, DAY_FULL = {}, DAY_ABBR_ISO = {};
DAY_KEYS.forEach((d,i)=>{
  const iso = i+1;
  DAY_COLORS[iso]   = CANON.days[d].hex.toLowerCase();
  DAY_TEXT[iso]     = CANON.days[d].on.toLowerCase();
  DAY_FULL[iso]     = DAY_NAMES[i];
  DAY_ABBR_ISO[iso] = DAY_ABBR[i].toUpperCase();
});

/* Misregistration partners — the second silkscreen layer (--accent-2),
   straight from canon. */
const PARTNER = Object.assign({}, CANON.partners);
function partnerOf(accent){ return PARTNER[accent] || 'blue'; }

/* the three faces, as CSS font-family values (Montserrat NAMES things,
   Space Grotesk STATES facts, Alternates is the wordmark's A/I/Y only) */
const MONT = "'Montserrat',sans-serif";
const ALT  = "'Montserrat Alternates',sans-serif";
const GROT = "'Space Grotesk',sans-serif";

/* mandatory brand strings (style guide §11) — always full diacritics. The
   site on artwork is the bare host (canon D5). */
const SITE = CANON.site;
const ADDR = '86 Mai Thúc Lân · Đà Nẵng';

/* ---- contrast ----------------------------------------------------- */
/* Pick the readable neutral for text sitting on a fill.

   Real relative luminance (with the sRGB gamma expansion), and whichever
   neutral of the pair actually contrasts better. On the artwork pair that
   lands on exactly canon's `on` for all seven day accents — ink on blue ·
   green · yellow · amber · pink · red, cream on purple — with no lookup
   table, and keeps working for a fill the palette never named. Print's
   pair (#111111 / white) gives the same answer: white only on purple.

   Ties and near-ties go to INK — the Riso look — because `>` keeps ink
   unless the light is strictly better (pink 4.72 vs 4.06, red 4.59 vs 4.19).

   NOT generalised: cream-on-red is canon for the ACTION BUTTON only
   (reality-tokens.json F2 — 4.19:1, a knowing AA exception). A red fill in
   artwork still takes ink here; an element that wants the button read sets
   its text colour explicitly. */
function relLuminance(hex){
  const ch = (i)=>{ const c = parseInt(hex.slice(i,i+2),16)/255;
    return c<=0.03928 ? c/12.92 : Math.pow((c+0.055)/1.055, 2.4); };
  return 0.2126*ch(1) + 0.7152*ch(3) + 0.0722*ch(5);
}
function contrastRatio(a, b){
  const l1=relLuminance(a), l2=relLuminance(b);
  return (Math.max(l1,l2)+0.05) / (Math.min(l1,l2)+0.05);
}
function contrastInk(hex, pair){
  const p = pair || NEUTRALS.artwork;
  if(typeof hex!=='string' || hex[0]!=='#' || hex.length<7) return p.ink;
  return contrastRatio(hex, p.light) > contrastRatio(hex, p.ink) ? p.light : p.ink;
}

/* ============================================================
   INK MARK — the ink strip / ink square (canon rev 22.08.26).
   Machine spec: design-system-year2/design_handoff_web_app_ink_pass/
   tokens/ink-strip.json — cell ORDER is FIXED; recolouring (mode /
   day) is the only parameter. Forms: 2×9 / 9×2 strip · 2×7 / 7×2
   short · 4×4 square (+ square-anchored, where ink takes the outer
   corner). No radius, no gradients, no cell shadows, never
   auto-placed. v1 deliberately skips voids/dropout — recolour only.

   The substrate is the one parameter between the Studios: artwork
   prints `stock` as cream (a COLOUR, not an absence — always an inner
   cell); Print's stock is the white sheet, UNPRINTED on press (its
   exporter skips those cells) and ink rides the K plate. Hence two
   cell tables from one factory.
   ============================================================ */
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
     ink lands on the OUTER corner (why that form needs no ground). */
  anchoredField:['stock','pink','green','ink'],
  floors:{ strip:8, short:6, square:6 }      /* per module — px on screen, pt on print */
};
/* cell name → hex for a substrate pair */
function inkMarkCellHexes(pair){
  const c = {};
  ACCENTS.forEach(a=>{ c[a] = PALETTE[a]; });
  c.ink = pair.ink;
  c.stock = pair.light;
  return c;
}
const INK_MARK_CELLS       = inkMarkCellHexes(NEUTRALS.artwork);   // Poster + Schedule
const INK_MARK_CELLS_PRINT = inkMarkCellHexes(NEUTRALS.print);     // Print (stock = the unprinted sheet)
const INK_MARK_DAY_KEYS = DAY_KEYS;
/* day key → accent name (mon green · tue blue · wed purple · thu pink ·
   fri red · sat amber · sun yellow — straight from day-colours.json). */
const INK_MARK_DAY_ACCENT = DAY_ACCENT;

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
   ONE geometry for the screen divs AND Print Studio's vector PDF, so the
   renderers can't drift. Bands are 2×2; field cells 1×1.
     strip-v: bands stacked, field rows of two (row-major)
     strip-h: strip-v rotated -90° — bands left-to-right, field columns of two
     square:  quadrants in Z order (red TL · blue TR · yellow BL), field at
              half module in quadrant 4 (Z order, f3 = the outer corner). */
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
/* cell name → hex. 'day' takes the weekday accent's hue. `cells` is the
   substrate's table (default: artwork). */
function inkMarkHex(name, dayAccent, cells){
  const c = cells || INK_MARK_CELLS;
  if(name==='day') return PALETTE[dayAccent] || PALETTE.pink;
  return c[name] || c.ink;
}

/* ---- the REALITY wordmark -------------------------------------------
   Montserrat with the Alternates A/I/Y, baked to vector: the seven letter
   subpaths of the site Logo, in a 512×84 box. Screens draw them as <path>s
   (wordmark.jsx); Print's PDF exporter draws the joined string with
   drawSvgPath. Never re-typeset the mark from a font-family. */
const WORDMARK_PATHS = [
  'M73.4,63.7V13.3h20.7c4.5,0,8.3.7,11.5,2.1,3.2,1.4,5.7,3.5,7.4,6.2,1.7,2.7,2.6,5.9,2.6,9.6s-.9,6.9-2.6,9.5c-1.7,2.6-4.2,4.7-7.4,6.1-3.2,1.4-7,2.2-11.5,2.2h-15.5l4.1-4.2v18.9h-9.4ZM82.7,45.9l-4.1-4.5h15c4.1,0,7.2-.9,9.3-2.7,2.1-1.8,3.1-4.2,3.1-7.4s-1-5.6-3.1-7.4c-2.1-1.8-5.2-2.6-9.3-2.6h-15l4.1-4.6v29.2ZM106.3,63.7l-12.7-18.3h10l12.8,18.3h-10.1Z',
  'M142.6,55.8h28.4v7.9h-37.8V13.3h36.8v7.9h-27.4v34.6ZM141.8,34.3h25.1v7.7h-25.1v-7.7Z',
  'M188.2,63.7v-27.9c0-5,.9-9.3,2.8-12.7s4.5-6.1,7.8-7.8c3.4-1.8,7.2-2.6,11.7-2.6s8.4.9,11.8,2.6c3.4,1.8,6,4.4,7.8,7.8,1.8,3.5,2.8,7.7,2.8,12.7v27.9h-9.3v-28.8c0-4.8-1.2-8.3-3.6-10.6-2.4-2.3-5.6-3.5-9.5-3.5s-7.2,1.2-9.5,3.5c-2.4,2.3-3.6,5.9-3.6,10.6v28.8h-9.2ZM194.1,50.7v-7.8h32.8v7.8h-32.8Z',
  'M253.3,63.7V13.3h9.4v42.5h26.4v7.9h-35.7Z',
  'M299.8,21.2v-7.9h27.9v7.9h-27.9ZM299.8,63.7v-7.9h27.9v7.9h-27.9ZM309,62.6V14.3h9.4v48.3h-9.4Z',
  'M354.8,63.7V21.2h-16.7v-7.9h42.8v7.9h-16.7v42.5h-9.4Z',
  'M415.7,71.4c-4.2,0-8.1-.6-11.5-1.9-3.5-1.2-6.4-3-8.7-5.2l3.8-7.2c2.3,2,4.7,3.5,7.5,4.5,2.7,1,5.7,1.5,9,1.5s7.8-1.2,10.2-3.5c2.3-2.4,3.5-6,3.5-10.9v-9.8l2.7,1.2c-1.6,3.9-4,6.7-7,8.5-3,1.8-6.6,2.7-10.6,2.7-6.3,0-11.3-1.8-14.8-5.4-3.5-3.6-5.3-8.9-5.3-15.7V13.3h9.4v16.5c0,4.5,1.1,7.9,3.3,10.1,2.2,2.2,5.1,3.3,8.8,3.3s7.2-1.2,9.7-3.5c2.5-2.3,3.7-6,3.7-10.9v-15.6h9.4v35c0,5.1-.9,9.3-2.8,12.7s-4.5,6-7.9,7.7c-3.4,1.8-7.5,2.7-12.2,2.7Z'
];
const WORDMARK_PATH = WORDMARK_PATHS.join(' ');
const WORDMARK_VIEWBOX = '0 0 512 84';
/* the same mark with the built-in margins cropped — sits flush in a
   left-aligned header (Schedule's `tight`) */
const WORDMARK_VIEWBOX_TIGHT = '72.4 12.3 374.2 60.1';

export {
  CANON,
  DAY_KEYS, DAY_NAMES, DAY_ABBR, DAY_ACCENT,
  ACCENTS, PALETTE, INK_CHOICES, inkTitle,
  INK_HEX, CREAM_HEX, WHITE_HEX, NEUTRALS,
  ACCENT_DAYS, ACCENT_BY_DAY, ACCENTS_BY_DAY, accentDay,
  DAY_COLORS, DAY_TEXT, DAY_FULL, DAY_ABBR_ISO,
  PARTNER, partnerOf, SITE, ADDR, MONT, ALT, GROT,
  relLuminance, contrastRatio, contrastInk,
  INK_MARK, INK_MARK_CELLS, INK_MARK_CELLS_PRINT, INK_MARK_DAY_KEYS, INK_MARK_DAY_ACCENT,
  inkMarkCells, inkMarkLayout, inkMarkHex,
  WORDMARK_PATHS, WORDMARK_PATH, WORDMARK_VIEWBOX, WORDMARK_VIEWBOX_TIGHT,
};
