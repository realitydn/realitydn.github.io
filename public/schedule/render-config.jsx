/* ============================================================
   REALITY SCHEDULE STUDIO — render · stylings, channels, geometry
   The shared layout kernel, part 1: every constant the renderers
   and the fit engine read. Palettes (theme tokens: each renderer
   reads them generically, so a styling skins every output at once),
   the channel registry, the looks, per-channel geometry and the
   per-day type ladder.
   ============================================================ */
import { relLuminance } from '../studio-shared/brand.js';
import { CREAM as R_CREAM, DAY_COLORS as R_DC, DAY_TEXT as R_DT, INK as R_INK, WHITE as R_WHITE } from './schedule-data.jsx';

/* sRGB relative luminance — brand.js's, the real one with the gamma
   expansion. Used to decide whether a palette's ground is light enough to
   carry a QR's quiet zone invisibly; anything that isn't a #rrggbb reads as
   light (1), as it always has. */
function R_LUM(hex){
  if(typeof hex!=='string' || hex[0]!=='#' || hex.length<7) return 1;
  return relLuminance(hex);
}

/* ---- stylings — Year 2 token sets. Each renderer reads these generically, so a
   styling skins every output at once. Print always falls back to day-on-white. ---- */
const PRESS_INK = { 1:R_INK,2:R_INK,3:R_INK,4:R_INK,5:R_INK,6:R_INK,7:R_INK };
const PRESS_CREAM = { 1:R_CREAM,2:R_CREAM,3:R_CREAM,4:R_CREAM,5:R_CREAM,6:R_CREAM,7:R_CREAM };
function themeTokens(theme, printish){
  if(printish) return {
    id:'print', bg:R_WHITE, paper:R_CREAM, fg:R_INK,
    fgStrong:'rgba(13,9,5,.85)', dim:'rgba(13,9,5,.58)', hairline:'rgba(13,9,5,.16)',
    shadow:'0 8px 2px rgba(13,9,5,.16)', shadowSm:'0 5px 1px rgba(13,9,5,.14)', dc:R_DC, dt:R_DT };
  switch(theme){
    case 'night': return {   /* cream on near-black; Wednesday purple lifts after dark */
      id:'night', bg:'#0a0703', paper:'#171109', fg:'#fffbf1',
      fgStrong:'rgba(255,251,241,.88)', dim:'rgba(255,251,241,.6)', hairline:'#3a2c1c',
      shadow:'0 8px 2px rgba(255,251,241,.18)', shadowSm:'0 5px 1px rgba(255,251,241,.15)',
      dc:Object.assign({}, R_DC, { 3:'#9a4faa' }), dt:R_DT };
    case 'paper': return {   /* warm kraft stock, ink, hard riso-ish drop */
      id:'paper', bg:'#ebe1c6', paper:'#f4ecd6', fg:R_INK,
      fgStrong:'rgba(13,9,5,.86)', dim:'rgba(13,9,5,.55)', hairline:'rgba(13,9,5,.2)',
      shadow:'0 7px 0 rgba(13,9,5,.16)', shadowSm:'0 4px 0 rgba(13,9,5,.14)',
      dc:R_DC, dt:R_DT };
    case 'carbon': return {  /* warm charcoal, softer than night */
      id:'carbon', bg:'#1b1610', paper:'#251d13', fg:'#fdf6e6',
      fgStrong:'rgba(253,246,230,.88)', dim:'rgba(253,246,230,.56)', hairline:'#473726',
      shadow:'0 8px 2px rgba(253,246,230,.16)', shadowSm:'0 5px 1px rgba(253,246,230,.14)',
      dc:Object.assign({}, R_DC, { 3:'#9a4faa' }), dt:R_DT };
    case 'press': return {   /* one-colour newsprint — mono blocks + a hard offset shadow */
      id:'press', bg:R_CREAM, paper:R_CREAM, fg:R_INK,
      fgStrong:'rgba(13,9,5,.85)', dim:'rgba(13,9,5,.55)', hairline:'rgba(13,9,5,.22)',
      shadow:'4px 4px 0 rgba(13,9,5,.88)', shadowSm:'3px 3px 0 rgba(13,9,5,.85)',
      dc:PRESS_INK, dt:PRESS_CREAM };
    default: return {        /* day — ink on cream */
      id:'day', bg:R_CREAM, paper:R_CREAM, fg:R_INK,
      fgStrong:'rgba(13,9,5,.85)', dim:'rgba(13,9,5,.58)', hairline:'rgba(13,9,5,.16)',
      shadow:'0 8px 2px rgba(13,9,5,.16)', shadowSm:'0 5px 1px rgba(13,9,5,.14)',
      dc:R_DC, dt:R_DT };
  }
}
const ThemeCtx = React.createContext(themeTokens('day'));
const RED = '#ed2224';

/* ---- palettes — the visual half of a styling, chosen independently of the layout.
   sw is the picker swatch (paper + three weekday accents). ---- */
const PALETTES = [
  { id:'day',    name:'Day',    note:'Ink on cream' },
  { id:'night',  name:'Night',  note:'Cream on near-black' },
  { id:'paper',  name:'Paper',  note:'Warm kraft, hard shadow' },
  { id:'carbon', name:'Carbon', note:'Warm charcoal' },
  { id:'press',  name:'Press',  note:'One-colour newsprint' },
].map(p=>{ const T = themeTokens(p.id); return Object.assign({}, p, {
  sw:{ bg:T.bg, fg:T.fg, a:[T.dc[1], T.dc[4], T.dc[6]] } }); });

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

/* Width the QR block reserves in a carousel footer, at each density. The same
   number is used for the invisible spacer opposite it, so the centred column
   stays centred. Density 2 (minimal) gets NO code: that density exists for the
   weeks where nothing fits, and it is the one place a QR would cost height
   rather than ride space the footer already has. */
const CAROUSEL_QR = { 0:112, 1:80, 2:0 };

export { R_LUM, themeTokens, ThemeCtx, RED, PALETTES, CHANNELS, DAILY_VARIANTS, channelById,
  LOOKS_LIST, lookOf, GEOM, gridColsFor, gridGapFor, GRID_F, lookF, stackBannerH, gridStripH, gridPad,
  dayGapFor, SHORT_STEP, SIZE_COMFORT, SIZE_BRIM, sizedChannel, ladderLen, clampStep, entryFont,
  entryLead, CAROUSEL_QR };
