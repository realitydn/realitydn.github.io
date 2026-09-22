/* ============================================================
   REALITY PRINT STUDIO — the parts: catalogue + defaults
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

   This file is the parts library: the drag-on CATALOG, each part's
   DEFAULTS (tools/verify-day-colours.mjs reads the tracking presets
   out of THIS file), makeElement, and the QR destinations. The rest
   of what used to live here:
     print-paper.js     sizes, inks, CMYK, type ladder, faces, grid
     print-layout.js    geometry both renderers share
     print-templates.js the starter layouts
     print-preflight.js NFC, migrations, the trim test, the preflight
   The brand (palette, ink mark, wordmark, partner map) is
   ../studio-shared/brand.js; shapes, QR and ids are studio-shared too.
   ============================================================ */

import { ADDR, SITE } from '../studio-shared/brand.js';
import { setIdPrefix, uid } from '../studio-shared/util.js';

/* element ids: 'p…'; slugify (Vietnamese-safe) — ../studio-shared/util.js */
setIdPrefix('p');

/* ---- QR — the encoder (vendored qrcode-generator, UTF-8 + NFC, EC level M,
   auto version), nfc and the square-finder-eye geometry the screen SVG and the
   PDF share (qrGeometry) are ../studio-shared/qr.js — the one copy the Poster
   now encodes its tickets with too. ---- */
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

export { QR_DESTINATIONS, CATALOG, DEFAULTS, makeElement };
