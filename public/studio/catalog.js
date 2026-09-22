/* ============================================================
   REALITY POSTER STUDIO — the library catalog
   The parts list and the graphics picker's families (shapes, rules, bursts, icons).
   ============================================================ */
import { SHAPE_KINDS, RULE_PATTERNS } from '../studio-shared/shapes.js';
/* ============================================================
   PARTS CATALOG — pre-filled draggable components
   make() returns an element placed at (x,y) with sane defaults
   ============================================================ */
const CATALOG = [
  { group:'Type', items:[
    { type:'title',   label:'Title',    hint:'The big slam' },
    { type:'tagline', label:'Tagline',  hint:'One line under it' },
    { type:'info',    label:'Info text', hint:'Formattable paragraph' },
    { type:'when',    label:'When chip', hint:'Day · time' },
    { type:'cost',    label:'Cost chip', hint:'Price · e.g. FREE' },
    { type:'host',    label:'Host',     hint:'Credit — size in panel' },
  ]},
  { group:'Blocks', items:[
    { type:'block',   label:'Colour block', hint:'Flat ink field' },
    { type:'ticket',  label:'REALITY ticket', hint:'Banner / sizes in panel', wide:true },
    { type:'lineup',  label:'Lineup',   hint:'Acts + set times' },
    { type:'sessions',label:'Sessions', hint:'Series — paste the list' },
    { type:'agenda',  label:'Week',     hint:'Colour-coded days', wide:true },
    { type:'specials',label:'Specials', hint:'Drinks + prices' },
    { type:'qr',      label:'QR block', hint:'Scan to site' },
    { type:'weekly',  label:'Weekly tag', hint:'Price · day · time', wide:true },
    { type:'matchup', label:'Matchup',   hint:'Team vs team · time', wide:true },
  ]},
  { group:'Marks', items:[
    { type:'stamp',    label:'Stamp',    hint:'SOLD OUT / FREE' },
    { type:'badge',    label:'Badge',    hint:'Every Wed' },
    { type:'wordmark', label:'REALITY wordmark', hint:'Canonical mark · resizable', wide:true },
    { type:'inkmark',  label:'Ink mark', hint:'The strip / square · canon grid' },
  ]},
  { group:'Media', items:[
    { type:'photo',   label:'Photo',    hint:'Riso-treated image', wide:true },
    { type:'logo',    label:'Partner logo', hint:'PNG with transparency', wide:true },
  ]},
];

/* ============================================================
   GRAPHICS PICKER — the collapsible half of the library. Where the
   CATALOG above is a list of DIFFERENT parts, this is four families
   whose members differ only by one prop (`kind` / `pattern`), so
   they're better browsed as a grid of silhouettes than as 60 rows.
   Each entry drag-spawns its family type with that prop preset; the
   full dial set then lives in the Inspector like any other element.
   ============================================================ */
const SHAPE_LABELS = {
  circle:'Circle', rounded:'Rounded', squircle:'Squircle', rect:'Square', pill:'Pill',
  triangle:'Triangle', diamond:'Diamond', pentagon:'Pentagon', hexagon:'Hexagon', octagon:'Octagon',
  star5:'Star', star6:'Six-point', chevron:'Chevron', cross:'Cross', banner:'Banner',
  shield:'Shield', arch:'Arch', heart:'Heart', blob:'Blob', drop:'Drop',
  arrow:'Arrow', halfdisc:'Half disc', quarter:'Quarter', bolt:'Bolt'
};
/* the shapes that read well as a photo mask (a bolt-shaped photo does not) */
const MASK_KINDS = ['none','circle','rounded','squircle','pill','arch','triangle','diamond','pentagon','hexagon','octagon','star5','shield','banner','heart','blob','drop','halfdisc'];
const RULE_TERMS = [{v:'none',l:'Plain'},{v:'dot',l:'Dot'},{v:'arrow',l:'Arrow'},{v:'diamond',l:'Diamond'},{v:'star',l:'Star'}];
/* Burst variants — same element, different ray counts / hub, since those two
   dials are what actually change its character. */
const BURST_PRESETS = [
  { k:'fine',   l:'Fine',    p:{ rays:28, hub:0 } },
  { k:'classic',l:'Classic', p:{ rays:16, hub:0 } },
  { k:'bold',   l:'Bold',    p:{ rays:10, hub:0 } },
  { k:'ring',   l:'Ring',    p:{ rays:20, hub:0.42 } },
  { k:'wheel',  l:'Wheel',   p:{ rays:12, hub:0.6 } },
];
/* The picker's own structure. `kind` families read their members from the
   registries above; `icons` reads ICON_CATEGORIES (studio-shared/print-icons.js). */
const GRAPHICS = [
  { id:'gfx-shapes', title:'Shapes',  type:'shape', prop:'kind',    open:true,
    items:SHAPE_KINDS.map(k=>({ k, l:SHAPE_LABELS[k]||k })),
    hint:'Fill, grain, keyline and shadow in the panel — same ink set as everything else.' },
  { id:'gfx-rules',  title:'Lines + rules', type:'rule', prop:'pattern',
    items:RULE_PATTERNS.map(p=>({ k:p.v, l:p.l })),
    hint:'Weight, spacing and end-caps in the panel. Rotate for a vertical rule.' },
  { id:'gfx-burst',  title:'Bursts', type:'burst', prop:null,
    items:BURST_PRESETS.map(b=>({ k:b.k, l:b.l, preset:b.p })),
    hint:'Rays + hub in the panel. Drop one behind a title.' },
  { id:'gfx-icons',  title:'Icons',  type:'icon', prop:'kind', search:true,
    groups:true,
    hint:'The Year 2 glyph set — the same vectors the app and Print Studio use.' },
];

export { CATALOG, SHAPE_LABELS, MASK_KINDS, RULE_TERMS, BURST_PRESETS, GRAPHICS };
