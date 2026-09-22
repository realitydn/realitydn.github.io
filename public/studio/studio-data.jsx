/* ============================================================
   REALITY POSTER STUDIO — shared data + utilities
   Exports to window: PALETTE, ACCENTS, FORMATS, MODULE, STEP,
   themeColors, surfaceStyle, safeRect, CATALOG, makeElement,
   uid, QRGlyph
   ============================================================ */

import {
  SHAPE_KINDS, shapePath, shapeClip, roundedRectPath, burstRays, ruleLayout, RULE_PATTERNS, iconLayout,
} from '../studio-shared/shapes.js';
import { QRGlyph, qrPatternOf, QUIET_SPEC, QUIET_TIGHT } from '../studio-shared/qr.js';
import { setIdPrefix, uid, makeTypeScale } from '../studio-shared/util.js';

/* The palette, the weekday coding (derived from public/tokens/day-colours.json),
   contrast and the ink mark live in ../studio-shared/brand.js — one copy for all
   three Studios. Re-exported below so this Studio's modules keep one import. */
import {
  PALETTE, ACCENTS, INK_CHOICES, ACCENT_DAYS, ACCENT_BY_DAY, ACCENTS_BY_DAY, DAY_ABBR, DAY_NAMES, accentDay,
  relLuminance, contrastRatio, contrastInk,
  INK_MARK, INK_MARK_CELLS, INK_MARK_DAY_KEYS, INK_MARK_DAY_ACCENT, inkMarkCells, inkMarkLayout, inkMarkHex,
} from '../studio-shared/brand.js';
/* The library's parts list + graphics families: ./catalog.js, re-exported below.
   The starter templates are ./templates.jsx — imported from there directly,
   since they build on makeElement here. */
import { CATALOG, SHAPE_LABELS, MASK_KINDS, RULE_TERMS, BURST_PRESETS, GRAPHICS } from './catalog.js';


const FORMATS = {
  '4x5':  { w:1080, h:1350, label:'4:5', sub:'FEED' },   /* primary — IG feed + site pipeline */
  '5x7':  { w:1080, h:1512, label:'5:7', sub:'POSTER' },
  '1x1':  { w:1080, h:1080, label:'1:1', sub:'SQUARE' },
  '9x16': { w:1080, h:1920, label:'9:16', sub:'STORY' },
  'a4':   { w:1080, h:1527, label:'A4', sub:'PRINT' },
  /* Extra print view — same sheet shape as A4 (all A-series paper is 1:√2),
     but Save captures it at print resolution via the `print` descriptor below
     (3508px = A1 @ 150dpi; PDF at true 594×841mm). Deliberately NOT in
     OUTPUT_FORMATS: on-demand for the occasional big print, never in Save-All. */
  'a1':   { w:1080, h:1527, label:'A1', sub:'PRINT XL', print:{ wmm:594, hmm:841, dpi:150 } },
  /* Small handout / flyer views — same 1:√2 sheet as A4 (so one layout serves
     A4/A5/A6), but captured at true print size via the `print` descriptor: A5
     148×210mm, A6 105×148mm, both at 300 dpi (small print wants the higher dpi —
     A5 ≈ 1748px wide, A6 ≈ 1240px — vs the 150 dpi big-format views). On-demand
     like A1: kept OUT of OUTPUT_FORMATS, surfaced through the toolbar's HANDOUT
     picker, never in the Save-All bundle. */
  'a5':   { w:1080, h:1527, label:'A5', sub:'HANDOUT', print:{ wmm:148, hmm:210, dpi:300 } },
  'a6':   { w:1080, h:1527, label:'A6', sub:'HANDOUT', print:{ wmm:105, hmm:148, dpi:300 } },
  /* Roll-up / standing standee views — Việt Nam's standard standee sizes, all
     portrait. Like A1 each carries a `print:{wmm,hmm,dpi}` descriptor so Save
     captures at true print resolution (150 dpi) and the PDF is a real-world mm
     page a shop runs 1:1. Preview h = 1080 × (cm-h / cm-w) so the on-screen
     aspect matches the print exactly. On-demand only — kept OUT of
     OUTPUT_FORMATS so they never join the Save-All bundle. */
  'st-60x120': { w:1080, h:2160, label:'60×120', sub:'STANDEE', print:{ wmm:600, hmm:1200, dpi:150 } },
  'st-60x160': { w:1080, h:2880, label:'60×160', sub:'STANDEE', print:{ wmm:600, hmm:1600, dpi:150 } },
  'st-80x180': { w:1080, h:2430, label:'80×180', sub:'STANDEE', print:{ wmm:800, hmm:1800, dpi:150 } },
  'st-80x200': { w:1080, h:2700, label:'80×200', sub:'STANDEE', print:{ wmm:800, hmm:2000, dpi:150 } }
};
const OUTPUT_FORMATS = ['4x5','1x1','9x16','a4'];   // 5x7 + FB cover removed (4:5 serves FB events); a4 stays in Save-All but renders under "Print options", not as an inline tab
/* Extra on-demand print views — never in the Save-All bundle. A1 is the single
   XL sheet (its own toolbar button); these are the roll-up standee family,
   surfaced through the toolbar's STANDEE picker. */
const STANDEE_FORMATS = ['st-60x120','st-60x160','st-80x180','st-80x200'];
/* Small print handouts (A5 · A6) — on-demand like the standees, surfaced
   through their own toolbar picker, kept out of the Save-All bundle. */
const HANDOUT_FORMATS = ['a5','a6'];
/* modular type scale — font size snaps to these for consistency */
/* px — the snapping itself is ../studio-shared/util.js makeTypeScale */
const TYPE = makeTypeScale([18,22,26,32,38,46,56,68,82,100,120,144,172,206,248]);
const TYPE_SCALE = TYPE.steps, snapToScale = TYPE.snap, scaleStep = TYPE.step;
/* keys routed to per-format overrides (vs content, which is shared across every
   format). Geometry + image framing + text SIZE — so type can be resized per
   view without touching Master or the other formats. */
const LAYOUT_KEYS = ['x','y','w','h','rot','hidden','imgScale','imgX','imgY','imgRot','fontSize','subSize'];
/* ---- THE GRID (rev 23.08.26) ----------------------------------------
   MODULE 90 / STEP 45 (half-module).

   The poster-grid card specifies a 108px module on a 1080×1512 canvas —
   10×14 — but 5:7 was retired (D9) and the master is 4:5 (1080×1350), where
   108 leaves a HALF-MODULE orphan row at the foot. It tiled nothing but the
   square, and its 54px snap step could not reach either of the two lines the
   system actually uses: the x:90 Swiss vertical every template sits on, or
   the safe square's edge at y:135.

   90 fixes all three at once, and keeps the card's intent (a square module,
   a whole-number grid, generous margins):
       4:5  1080×1350  ->  12 × 15   exact
       1:1  1080×1080  ->  12 × 12   exact
       margin 90       =   one module
       safe-square edge y135 = step 3
   9:16 and A4 still carry a remainder (1920 and 1527 aren't multiples of
   anything useful), but those are DERIVED views — mapElementToFormat places
   them off the master, nobody authors on their grid. The overlay draws their
   partial row honestly rather than pretending.

   Templates are authored on this frame: left line 90, right line 990, so a
   full-width element is w:900 = 10 modules. */
const MODULE = 90;
const STEP = 45;

function themeColors(theme){
  return theme==='night'
    ? { fg:'#fffbf1', bg:'#0a0703', paper:'#171109', shadow:(a)=>`rgba(255,251,241,${a})` }
    : { fg:'#0d0905', bg:'#fffbf1', paper:'#fffbf1', shadow:(a)=>`rgba(13,9,5,${a})` };
}

/* contrastInk — Poster's contrast-ratio rule, now canon for every Studio — is in
   brand.js; with no pair it answers ink/cream, the artwork neutrals. */

/* surface → concrete box style (canvas px units) */
function surfaceStyle(surface, theme, accentHex, lift){
  const t = themeColors(theme);
  const sh = lift===false ? 'none' : `0 ${10}px ${2}px ${t.shadow(theme==='night'?0.20:0.16)}`;
  switch(surface){
    case 'solid':   return { background:t.fg, color:t.bg, border:`3px solid ${t.fg}`, boxShadow:sh };
    case 'paper':   return { background:t.paper, color:t.fg, border:`3px solid ${t.fg}`, boxShadow:sh };
    case 'accent':  return { background:accentHex, color:contrastInk(accentHex), border:`3px solid ${accentHex}`, boxShadow:sh };
    case 'outline': return { background:'transparent', color:t.fg, border:`3px solid ${t.fg}`, boxShadow:sh };
    case 'scrim':   return { background: theme==='night'?'rgba(10,7,3,0.55)':'rgba(255,251,241,0.72)',
                             color:t.fg, border:`3px solid ${t.fg}`, boxShadow:sh,
                             backdropFilter:'blur(4px)', WebkitBackdropFilter:'blur(4px)' };
    default:        return { background:'transparent', color:t.fg, border:'3px solid transparent', boxShadow:'none' };
  }
}

/* ============================================================
   ONE SHADOW MODEL for every element. The renderer and the Shadow
   control both read this, so the two never drift. Resolves the live
   shadow params from el.shadow*, fills in per-type defaults + slider
   ranges, and picks the application mode:
     filter → photo / logo / block / weekly  (drop-shadow on the art)
     box    → a surfaced text/chip/card       (box-shadow on the card)
     text   → bare text, no surface           (text-shadow on letters)
   Defaults reproduce the exact look each element had before it had a
   control: bare titles + every surfaced card keep their press shadow;
   bare body text and un-framed photos/blocks start with none.
   ============================================================ */
function shadowModel(el, theme){
  const type = el.type;
  const filterFam = type==='photo'||type==='logo'||type==='block'||type==='weekly'||type==='wordmark'
                 || type==='shape'||type==='icon'||type==='rule'||type==='burst';
  const bare = !el.surface || el.surface==='none';
  let dDef, bDef, maxDist, maxBlur, defOn;
  if(filterFam){      dDef=9;  bDef=3; maxDist=60; maxBlur=40; defOn = (type==='weekly'); }
  else if(bare){      dDef=6;  bDef=1; maxDist=40; maxBlur=24; defOn = (type==='title'||type==='matchup'); }
  else {              dDef=10; bDef=2; maxDist=60; maxBlur=40; defOn = true; }
  const on   = el.shadowOn!=null   ? el.shadowOn   : defOn;
  const dist = el.shadowDist!=null  ? el.shadowDist  : dDef;
  const blur = el.shadowBlur!=null  ? el.shadowBlur  : bDef;
  const ang  = el.shadowAngle!=null ? el.shadowAngle : 90;
  const ck   = el.shadowColor || 'fg';
  const fgAlpha = filterFam ? (theme==='night'?0.40:0.22)
                : bare      ? (theme==='night'?0.22:0.16)
                :             (theme==='night'?0.20:0.16);
  const alpha = el.shadowAlpha!=null ? el.shadowAlpha : (ck==='fg' ? fgAlpha : 0.9);
  const mode  = filterFam ? 'filter' : (bare ? 'text' : 'box');
  return { filterFam, bare, mode, on, dist, blur, ang, ck, alpha, dDef, bDef, maxDist, maxBlur, defOn };
}

/* ============================================================
   TEXT ALIGN + INSET — one model behind the Align control and every
   element that draws text. Two jobs:

   `align` — the effective alignment. Each type declares the alignment
   it has always rendered at, so an element saved before this control
   existed keeps its look AND shows the right chip selected.

   `def`/`val` — the inset: how far the text sits from the edge it is
   aligned to. Defaults to that type's baked-in horizontal padding, so
   the number you read is the gap you get and 0 means flush to the box
   edge. Only left/right can move — a centred line is symmetric by
   definition — so the control hides itself on centre.

   Renderer and control both read this, so the two never drift.
   ============================================================ */
const TEXT_ALIGN_DEF = {
  title:'left', tagline:'left', info:'left', lineup:'left', sessions:'left',
  specials:'left', agenda:'left', qr:'left',
  when:'center', cost:'center', stamp:'center', host:'center',
  badge:'center', matchup:'center', ticket:'center'
};
/* The banner is the one ticket variant whose alignment is a real composition
   choice: it's a full-width band running a stacked column (wordmark over the
   site·address line) rather than the other variants' three-part row, and it
   closes the poster. It defaults RIGHT — the column sits with the trailing
   edge, the mark takes the opposite side, and the band reads as a signature
   rather than a centred title block. Every other variant keeps centre. */
function ticketAlignDef(el){ return el.variant==='banner' ? 'right' : 'center'; }
/* baked-in horizontal padding per type — the honest default for the inset */
const TEXT_PAD = {
  title:26, tagline:24, info:22, when:26, cost:26, host:28, stamp:16,
  lineup:24, sessions:24, specials:24, agenda:22, qr:18, badge:0
};
function textInsetModel(el){
  const bare = !el.surface || el.surface==='none';
  let def;
  /* a bare title has no card to pad against — its letters already start at the
     box edge, so 0 is honest there. Ticket and matchup size their own padding. */
  if(el.type==='title')        def = bare ? 0 : 26;
  else if(el.type==='ticket')  def = el.variant==='banner' ? 46 : 34;
  else if(el.type==='matchup') def = Math.round((el.w||600)*0.06);
  else                         def = TEXT_PAD[el.type] || 0;
  const align = el.align || (el.type==='ticket' ? ticketAlignDef(el) : TEXT_ALIGN_DEF[el.type]) || 'left';
  const side  = align==='left' ? 'left' : align==='right' ? 'right' : null;
  return { def, side, align, applies: side!=null,
           val: el.textInset!=null ? el.textInset : def,
           max: Math.max(60, Math.round((el.w||400)*0.4)) };
}

/* centered 1:1 safe square for a format */
function safeRect(format){
  const f = FORMATS[format];
  const size = Math.min(f.w, f.h);
  return { x:(f.w-size)/2, y:(f.h-size)/2, w:size, h:size };
}

/* element ids: 'e…' (util.js uid) */
setIdPrefix('e');

/* ---- Sessions list parser — one row per line, pasted as-is ----
   Treats each row as a set of typed cells split on em/en dashes, pipes, tabs,
   2+ spaces, or a SPACED hyphen (so "Check-in" / "S. Africa" never split), then
   infers roles instead of assuming a fixed shape:
     • date  — 3.6.26 · 17.7 · 12/06       • time — 11:00 · 23h59
     • marker— a trailing symbol (< ~ ^ ●…) that tags the row's CATEGORY
     • title — the cell with the most letters (the headline / fixture)
     • num   — whatever's left (a label like "001" or "Trận 20")
   So "001 — Title — 3.6", "Tunisia vs Japan <", and a 5-column football
   fixture all parse cleanly. Everything is optional per line. */
function parseSessions(raw){
  const DATE = /^\d{1,2}[./-]\d{1,2}([./-]\d{2,4})?$/;
  const TIME = /^\d{1,2}[:h]\d{2}$/;                       // 11:00 · 23h59
  const MARK = /^(.*?)\s*([<>~^✦●◆▲★+])$/;                 // one trailing symbol = a category tag
  const letters = s => (String(s).match(/[A-Za-zÀ-ỹ]/g)||[]).length;
  return (raw||'').split(/\r?\n/).map(line=>{
    let s = line.trim();
    if(!s) return null;
    let marker=''; const mm = s.match(MARK); if(mm){ marker = mm[2]; s = mm[1].trim(); }
    const parts = s.split(/\s*[—–|]\s*|\s+-\s+|\t+|\s{2,}/).map(p=>p.trim()).filter(Boolean);
    let num='', date='', time=''; const rest=[];
    parts.forEach(p=>{
      if(!date && DATE.test(p)) date=p;
      else if(!time && TIME.test(p)) time=p;
      else rest.push(p);
    });
    let title='';
    if(rest.length){
      let bi=0; rest.forEach((p,i)=>{ if(letters(p)>letters(rest[bi])) bi=i; });   // headline = most letters
      title = rest[bi];
      num = rest.filter((_,i)=>i!==bi).join(' ');
    }
    // "12. Title" / "3) Title" — numbered without a separator (bare numbers stay)
    if(!num && title){ const m = title.match(/^(\d{1,4}[.)])\s+(\S.*)$/); if(m){ num=m[1]; title=m[2]; } }
    return { num, date, time, title, marker };
  }).filter(Boolean);
}

/* ---- REAL QR — ../studio-shared/qr.js. The ticket and the QR block encode
   their own Website field (qrTarget: a bare host gains https://), through the
   same UTF-8 encoder Print Studio's PDFs use. This file used to carry a FIXED
   matrix for https://realitydn.com, so editing the site changed the caption
   and not the code. QRGlyph draws it; QUIET_SPEC / QUIET_TIGHT / qrPatternOf
   are the quiet-zone maths the flush ink square is sized from. ---- */

/* INK MARK — the ink strip / ink square (canon rev 22.08.26) — is in brand.js:
   INK_MARK, its cell tables, inkMarkCells / inkMarkLayout / inkMarkHex. G2
   (closed 22.08.26): on print/poster surfaces the outer-corner rule HOLDS —
   stock is never on an outer edge or corner — so the poster element defaults
   to a paper-shade GROUND with one module of clear space (square-anchored
   needs none: its ink corner IS the anchor). The open silhouette is a
   SCREEN-only allowance. */

/* ============================================================
   VECTOR GEOMETRY — the graphical-element kit (shapePath, shapeClip,
   burstRays, ruleLayout, iconLayout, SHAPE_KINDS, RULE_PATTERNS) is
   ../studio-shared/shapes.js: ONE copy Poster and Print both draw from,
   so a shape authored on a poster and the same shape on a printed A3
   are the same geometry, and the photo masks reuse it too. Add a kind
   there and both Studios have it.
   ============================================================ */


const DEFAULTS = {
  // letterSpacing is in em. Tracking defaults follow the CANON LADDER
  // (reality-tokens.css, baked per role — no size-derived formula):
  //   display .015 · h1 .025 · h2 .04 · name 0 · label .16 · button .11
  // title=display · subtitle=h1 · when/cost=label · host+rows=name ·
  // stamp=h2. Screen artwork carries the bare ladder (the +.01em offset is
  // print's — Print Studio bakes it, this file must NOT). Enforced by
  // tools/verify-day-colours.mjs §TYPE — change the ladder there first.
  title:   { w:720, h:315, props:{ text:'Event Title', fontSize:144, weight:800, surface:'none', align:'left', orient:'h', color:'fg', letterSpacing:0.015,
             subtitle:'', subSize:32, subWeight:600, subTracking:0.025, subColor:'fg', subLayout:'snug' } },
  tagline: { w:540, h:90,  props:{ text:'A short tagline goes right here', fontSize:22, weight:400, surface:'none', align:'left', orient:'h', color:'fg', letterSpacing:0 } },
  info:    { w:540, h:270, props:{ text:'Doors at 8, music from 9.\n\nEntry is **free** before 10 — *come early*.\n- All welcome\n- Cash bar', fontSize:26, weight:400, surface:'none', align:'left', orient:'h', color:'fg', letterSpacing:0, lineHeight:1.4 } },
  /* when + cost are FACT chips (canon M1) — Space Grotesk at 700 with tabular
     figures, so their tracking is 0 by definition, NOT the .16em label role
     they used to carry. The optical ladder belongs to Montserrat's caps; it
     has no meaning on Grotesk's lowercase. Sentence-case strings, because
     Grotesk is never uppercased and the renderer sets no text-transform. */
  when:    { w:360, h:90,  props:{ text:'Fri · 22:00', fontSize:32, weight:700, surface:'accent', align:'center', orient:'h', color:'fg', letterSpacing:0 } },
  // Cost chip — the day·time chip's twin (same accent tag), carrying the price.
  // The calendar handoff fills it from the event's cost ("Free" when free).
  cost:    { w:270, h:90,  props:{ text:'Free', fontSize:32, weight:700, surface:'accent', align:'center', orient:'h', color:'fg', letterSpacing:0 } },
  host:    { w:630, h:135, props:{ kicker:'Hosted by', name:'The Host', fontSize:46, weight:700, surface:'solid', align:'center', orient:'h', color:'fg', letterSpacing:0 } },
  /* mark:'on' — the canon ink mark on the ticket band (square flush with the
     QR / short strip when there's none). ABSENT = ON by design: the ticket is
     the brand carrier, so saved posters and templates gain it on open.
     markForm 'auto' keeps that classic pairing; 'square' / 'strip' (7×2) /
     'strip-long' (9×2) force one form on both variants. markMode (full /
     majors / ink) recolours — DELIBERATELY absent here: unset keeps each
     form's classic ink (square full · strip majors), so older docs render
     unchanged. */
  ticket:  { w:900, h:180, anchor:'bottom', props:{ variant:'standard', word:'Reality', addr:'86 Mai Thúc Lân · Đà Nẵng', site:'realitydn.com', surface:'paper', showQR:true, mark:'on', markForm:'auto', color:'fg' } },
  lineup:  { w:540, h:270, props:{ heading:'On the decks', items:[{n:'DJ Milk',t:'23:00'},{n:'Hanø',t:'00:30'},{n:'b2b Suki',t:'late'}], rowSize:0, rowWeight:700, rowTracking:0, rowGap:7, headingSize:15, surface:'scrim', color:'fg' } },
  sessions:{ w:675, h:450, props:{ heading:'Next sessions',
             raw:'001 — First Session Title — 3.6.26\n002 — Second Session Title — 10.6.26\n003 — Third Session Title — 17.6.26\n004 — Fourth Session Title — 24.6.26',
             rowSize:0, rowWeight:700, rowTracking:0, rowGap:7, headingSize:15, markerKey:{}, surface:'scrim', color:'fg' } },
  specials:{ w:450, h:225, props:{ heading:'Happy Hour', items:[{l:'House spirits',p:'₫50k'},{l:'Draft + shot',p:'₫65k'},{l:'Til 1am',p:'2-for-1'}], rowSize:0, rowWeight:700, rowTracking:0, rowGap:5, headingSize:26, surface:'accent', color:'fg' } },
  /* Colour-coded week — one row per day, each auto-tinted by the weekly-schedule
     accent (Mon green · Tue blue · Wed purple · Thu pink · Fri red · Sat amber ·
     Sun yellow). Day chip + event name · time, with an optional description
     beneath. The heading takes the poster accent. `day` drives the colour (a
     per-row `accent` override wins); unknown days fall back to the poster accent. */
  agenda:  { w:900, h:720, props:{ heading:'A taste of the week',
             items:[{day:'Monday',name:'Board Game Night',time:'19:00',desc:'A ton of games, a full bar, very, very social.'},
                    {day:'Wednesday',name:'Vietnam Talk',time:'14:30',desc:'A weekly intro to Vietnamese language + culture.'},
                    {day:'Friday',name:'No Mic Open Mic',time:'19:00',desc:'Rooftop acoustic jam.'}],
             rowSize:22, rowGap:16, headingSize:30, rowTracking:0, surface:'none', color:'fg' } },
  qr:      { w:450, h:180, props:{ label:'Scan for the night', site:'realitydn.com', surface:'paper', showQR:true, color:'fg' } },
  stamp:   { w:315, h:90,  props:{ text:'SOLD OUT', fontSize:38, weight:800, surface:'accent', rot:-8, color:'fg', letterSpacing:0.04, align:'center' } },
  badge:   { w:225, h:225, props:{ top:'EVERY', big:'WED', sub:'all year', surface:'paper', color:'fg' } },
  /* Standalone REALITY wordmark — the canonical vector mark as a free,
     resizable element. Default box is on-aspect (512:84 ≈ 6.1:1); the mark
     always fits undistorted, so drag any handle to scale. */
  wordmark:{ w:512, h:84,  props:{ surface:'none', color:'fg' } },
  /* The ink strip / square (INK_MARK above) — user-placeable ONLY, never
     auto-placed. Cell order is canon; mode/day recolour it, nothing reorders
     it.

     Ground defaults OFF (23.08): the paper-shade plate is G2's guard for a
     stock cell landing on an outer edge, but in practice the strip is dropped
     onto artwork that already has its own ground, and the plate read as a
     mat nobody asked for. The control is still there and the guidance still
     sits under it — this changes the DEFAULT, not the rule. Absent stays
     grounded, so every saved poster renders exactly as before; only newly
     placed marks come up bare. Default box = module 30 on the bare 2×9
     strip-v grid (the same 60×270 mark the grounded default drew inside its
     120×330 plate — the mark doesn't shrink, the plate just goes). */
  inkmark: { w:60, h:270, props:{ form:'strip-v', mode:'full', day:'fri', ground:false } },
  /* Weekly recurring-event combo: an accent bar with the price (left) and time
     (right), and a day-of-week badge centred on top. One draggable unit. */
  weekly:  { w:900, h:225, props:{ price:'Free', every:'EVERY', day:'THU', allYear:'ALL YEAR', time:'18:00', fill:'fg', color:'fg',
             shadowOn:true, shadowDist:9, shadowAngle:90, shadowBlur:3, shadowAlpha:null, shadowColor:'fg' } },
  /* Match-up combo: competition kicker, two team names auto-fitted to a matched
     size, an accent VS coin between, date · time below. One draggable unit. */
  matchup: { w:810, h:675, props:{ comp:'WORLD CUP', teamA:'Brazil', teamB:'Argentina', vs:'VS',
             date:'Sat 14 Jun', time:'22:00', surface:'none', color:'fg', fill:'fg' } },
  block:   { w:540, h:450, props:{ fill:'fg', opacity:1, grain:0, grainSize:2, outline:false, color:'fg' } },
  /* ---- graphical elements. All four share the block's colour + grain
     vocabulary (fill 'fg' = Auto → the poster accent, so they follow the day
     carousel), the one shadowModel, and the standard rotate/resize handles. */
  /* stroke starts at 0 so a fresh shape is a clean flat field (the block's
     manners); switching Fill to Outline in the panel dials it up for you. */
  shape:   { w:405, h:405, props:{ kind:'circle', fill:'fg', style:'solid', stroke:0, strokeColor:'fg',
             opacity:1, grain:0, grainSize:2, grainInk:null, grainBlend:'soft', color:'fg' } },
  icon:    { w:225, h:225, props:{ kind:'drink', fill:'fg', solid:false, strokeScale:1, opacity:1, color:'fg' } },
  /* spacing/gap stay null so ruleLayout can pick the right rhythm per pattern */
  rule:    { w:630, h:45,  props:{ pattern:'solid', fill:'fg', weight:6, spacing:null, dashRatio:0.55,
             amp:10, gap:null, cap:'round', tickLen:10, tickDir:'both', term:'none', termAt:'end',
             termScale:1, dotSize:null, opacity:1, color:'fg' } },
  burst:   { w:450, h:450, props:{ fill:'fg', rays:16, hub:0, hubFill:'paper', spin:0, opacity:1, color:'fg' } },
  photo:   { w:765, h:900, props:{ treatment:'separation', sample:'spotlight', src:null,
             /* the press (riso-press.js) — null = the paper decides; see
                the engine's RENDER_DEFAULTS for what each one means */
             inks:null, stock:null, opaque:null, invertSource:false, screen:'fm', sepShape:'chain', pitch:9, grainPitch:0.5, levels:0,
             sepGCR:null, sepBoost:1.15, tac:null, gain:0.8, linear:true, solidity:0.97, ceiling:0.98, floor:0.10, floodCap:0,
             drift:0, driftSeed:7, skew:0, stretch:0, duo:true, drumBand:0, bandPeriod:90, drumStreak:0, starve:0, wet:0.25,
             pull:0, pressRun:true, fountainTo:null, fountainPlate:1, fountainAngle:0, fountainSoft:1, proofPlate:null, proofGrey:false,
             sep:false, copyEdge:0.45, copyHollow:0.35, copySatellites:0.3, copyDrum:0.06, copyDrumPeriod:150, nightPlate:1,
             followAccent:true, ink:'pink', ink2:null, contrast:1.08, brightness:0, dot:9, bands:4, threshold:0.52,
             softness:0.12, angle:47, balance:0.5, shadowTint:0.18, invert:false, spread:1.25,
             shape:'circle', split:0.16, offset:13, frame:false, surface:'none', color:'fg',
             inkMode:'single', gradMode:'tone', gradAngle:90, gradA:null, gradB:null, screenOffset:30,
             field:'paper', fieldInk:null, fieldStrength:0.12, dotGain:1, jitter:0, pucker:0.35,
             spotLo:0.35, spotHi:0.65, spotSoft:0.08, spotInvert:false, spotBase:'duotone', transparent:false, fit:'cover',
             treatStrength:1, treatWhere:'all', treatBlend:'normal',
             compOrig:false, underBright:0, underContrast:1, underSat:1, underHue:0, underTemp:0,
             /* mask — the frame's silhouette, drawn from the SAME shape registry
                as the Shape element (MASK_KINDS is the subset that reads well
                as a photo). 'none' = the classic rectangle. */
             mask:'none',
             bleed:false, bleedBottom:0,
             imgScale:1, imgX:0, imgY:0, imgRot:0,
             blurUnder:0, blurOver:0, grain:0, grainSize:2,
             /* deepened press + finish stack (engine defaults mirror these) */
             saturation:1, hue:0, temperature:0, toneSmooth:0,
             midInk:null, hiTint:0, hiInk:null, ink3:null, ghost:0, glyphChar:'R',
             bandInks:null, bandJitter:0, cutEdge:0, cutEdgeInk:null, cutSlip:0, cutSlipAngle:45,
             fieldTexture:0, spotMode:'tone', spotHue:340, spotHueRange:45, spot2:false, spot2Lo:0.7, spot2Hi:0.9, spot2Ink:null,
             ditherMode:'bayer', ditherScale:3, ditherAngle:0, hatchSpacing:9, hatchWeight:1, hatchCross:false, hatchWobble:0.15,
             toner:0.55, copyNoise:0.35, streaks:0.25, generations:2,
             contourWeight:2, contourFill:'tint', contourSmooth:2.2, contourTint:0.19, contourLine:'auto', contourInk:null, contourSlip:0, contourSlipAngle:45,
             contourEcho:0, contourEchoAngle:45, contourEchoInk:null,
             edgeDetail:0.3, edgeThick:2, edgeBackdrop:'paper', edgeSmooth:1.6, edgeClean:0, edgeInk:null, edgeWash:null, edgeEcho:0, edgeEchoAngle:45, edgeEchoInk:null,
             edgeSlip:0, edgeSlipAngle:45,
             cellSize:16, mosaicDepth:4, mosaicGap:0.08, mosaicShape:'square', mosaicBond:'grid', mosaicJitter:0, mosaicGrout:'paper',
             blurUnderType:'gauss', blurUnderAngle:0, blurUnderX:0, blurUnderY:0, blurUnderPos:0.5, blurUnderWidth:0.3,
             blurOverType:'gauss', blurOverAngle:0, blurOverX:0, blurOverY:0, blurOverPos:0.5, blurOverWidth:0.3,
             grainInk:null, grainBlend:'soft', finBright:0, finContrast:1, finSat:1,
             vignette:0, vignetteSoft:0.6, paperTex:0, inkBleed:0, dust:0, misprint:0, misprintAngle:-35,
             src2:null, mix2:0.6, mix2Mode:'screen', img2Scale:1, img2X:0, img2Y:0, img2Rot:0 } },
  /* Partner logo — same engine as a photo but untreated by default and with a
     transparent ground (PNG-24 alpha is kept), contain-fit so the whole mark
     shows. Treatments still available if you want to riso a logo. */
  logo:    { w:315, h:180, props:{ treatment:'none', transparent:true, paperFill:'fg', sample:null, src:null,
             inks:null, stock:null, opaque:null, invertSource:false, screen:'fm', sepShape:'chain', pitch:9, grainPitch:0.5, levels:0,
             sepGCR:null, sepBoost:1.15, tac:null, gain:0.8, linear:true, solidity:0.97, ceiling:0.98, floor:0.10, floodCap:0,
             drift:0, driftSeed:7, skew:0, stretch:0, duo:true, drumBand:0, bandPeriod:90, drumStreak:0, starve:0, wet:0.25,
             pull:0, pressRun:true, fountainTo:null, fountainPlate:1, fountainAngle:0, fountainSoft:1, proofPlate:null, proofGrey:false,
             sep:false, copyEdge:0.45, copyHollow:0.35, copySatellites:0.3, copyDrum:0.06, copyDrumPeriod:150, nightPlate:1,
             followAccent:true, ink:'pink', ink2:null, contrast:1.1, brightness:0, dot:9, bands:4, threshold:0.52,
             softness:0.12, angle:47, balance:0.5, shadowTint:0.18, invert:false, spread:1.25,
             shape:'circle', split:0.16, offset:13, frame:false, surface:'none', color:'fg',
             inkMode:'single', gradMode:'tone', gradAngle:90, gradA:null, gradB:null, screenOffset:30,
             field:'paper', fieldInk:null, fieldStrength:0.12, dotGain:1, jitter:0, pucker:0.35,
             spotLo:0.35, spotHi:0.65, spotSoft:0.08, spotInvert:false, spotBase:'duotone', fit:'contain',
             treatStrength:1, treatWhere:'all', treatBlend:'normal',
             compOrig:false, underBright:0, underContrast:1, underSat:1, underHue:0, underTemp:0,
             imgScale:1, imgX:0, imgY:0, imgRot:0,
             blurUnder:0, blurOver:0, grain:0, grainSize:2,
             saturation:1, hue:0, temperature:0, toneSmooth:0,
             midInk:null, hiTint:0, hiInk:null, ink3:null, ghost:0, glyphChar:'R',
             bandInks:null, bandJitter:0, cutEdge:0, cutEdgeInk:null, cutSlip:0, cutSlipAngle:45,
             fieldTexture:0, spotMode:'tone', spotHue:340, spotHueRange:45, spot2:false, spot2Lo:0.7, spot2Hi:0.9, spot2Ink:null,
             ditherMode:'bayer', ditherScale:3, ditherAngle:0, hatchSpacing:9, hatchWeight:1, hatchCross:false, hatchWobble:0.15,
             toner:0.55, copyNoise:0.35, streaks:0.25, generations:2,
             contourWeight:2, contourFill:'tint', contourSmooth:2.2, contourTint:0.19, contourLine:'auto', contourInk:null, contourSlip:0, contourSlipAngle:45,
             contourEcho:0, contourEchoAngle:45, contourEchoInk:null,
             edgeDetail:0.3, edgeThick:2, edgeBackdrop:'paper', edgeSmooth:1.6, edgeClean:0, edgeInk:null, edgeWash:null, edgeEcho:0, edgeEchoAngle:45, edgeEchoInk:null,
             edgeSlip:0, edgeSlipAngle:45,
             cellSize:16, mosaicDepth:4, mosaicGap:0.08, mosaicShape:'square', mosaicBond:'grid', mosaicJitter:0, mosaicGrout:'paper',
             blurUnderType:'gauss', blurUnderAngle:0, blurUnderX:0, blurUnderY:0, blurUnderPos:0.5, blurUnderWidth:0.3,
             blurOverType:'gauss', blurOverAngle:0, blurOverX:0, blurOverY:0, blurOverPos:0.5, blurOverWidth:0.3,
             grainInk:null, grainBlend:'soft', finBright:0, finContrast:1, finSat:1,
             vignette:0, vignetteSoft:0.6, paperTex:0, inkBleed:0, dust:0, misprint:0, misprintAngle:-35,
             src2:null, mix2:0.6, mix2Mode:'screen', img2Scale:1, img2X:0, img2Y:0, img2Rot:0 } },
};

function makeElement(type, x, y){
  const d = DEFAULTS[type];
  const base = { id:uid(), type, x, y, w:d.w, h:d.h, rot:(d.props.rot||0), anchor:d.anchor||'safe' };
  return Object.assign(base, JSON.parse(JSON.stringify(d.props)));
}

/* ============================================================
   MASTER → FORMAT resolution
   Master holds canonical elements authored at masterFormat dims.
   Each output format is derived by mapping every element relative
   to the safe square (so the centre cluster stays put), with
   bottom-anchored pieces pinned to the canvas base. Per-format
   overrides (layout only) win over the derived values.
   ============================================================ */
function mapElementToFormat(el, masterFormat, format){
  const mf = FORMATS[masterFormat], tf = FORMATS[format];
  const ms = safeRect(masterFormat), ts = safeRect(format);
  const r = Object.assign({}, el);
  if(el.anchor==='bottom'){
    const distBottom = mf.h - (el.y + el.h);
    r.y = tf.h - distBottom - el.h;
  } else {
    // Align safe-zone CENTRES (not tops). Every current format's safe square is
    // 1080 tall — same as Master — so this equals top-alignment today, but it's
    // the form that stays correct if a short/landscape format ever returns.
    // x unchanged: the column width is a constant 1080, centre x = 540 in both.
    r.y = el.y - (ms.y + ms.h/2) + (ts.y + ts.h/2);
  }
  return r;
}
/* STORY BOOST — Instagram stories (9:16) read tiny on a phone because the
   master cluster is authored for the shorter 4:5. When on (default), every
   element + its font is scaled up about the frame centre so it fills the
   story; bottom-pinned pieces grow upward from their base. A per-format
   override still wins, so anything hand-sized in 9:16 keeps its size. */
function boostForStory(r, k, tf){
  if(k===1) return r;
  /* A FULL-BLEED band does not widen. Its job is to span the frame, and 1.15×
     of "the whole frame" is 81px off each edge of a 1080 story — which put the
     Reality banner's own padding off-canvas and cropped the mark block clean
     off the right side of every story export that used it. Eight templates.
     The band still grows vertically and its internal type still boosts; only
     the horizontal span is pinned.
     ink-bands carried a hand-written 9:16 override for exactly this, on each
     of its five edge-to-edge elements. That override is now redundant rather
     than load-bearing — the rule belongs here, not in one template. */
  const full = r.x <= 0 && (r.x + r.w) >= tf.w;
  const cx=tf.w/2, nw = full ? tf.w : r.w*k, nh=r.h*k;
  const nx = full ? 0 : cx + (r.x + r.w/2 - cx)*k - nw/2;
  /* Round the HEIGHT first, then derive y from the rounded value: computing
     both from the unrounded number let a bottom-anchored band land a pixel
     past the canvas foot (1609.5 + 310.5 rounding to 1610 + 311 = 1921). */
  const H = Math.round(nh);
  const ny = r.anchor==='bottom' ? (r.y + r.h) - H : (tf.h/2 + (r.y + r.h/2 - tf.h/2)*k - H/2);
  const out = Object.assign({}, r, { x:Math.round(nx), y:Math.round(ny), w:Math.round(nw), h:H });
  if(typeof r.fontSize==='number') out.fontSize = Math.round(r.fontSize*k);
  out._boost = k;   // blocks with fixed internal type read this to scale their text in step
  return out;
}
function resolveElements(doc, format){
  const ovs = (doc.overrides && doc.overrides[format]) || {};
  const fmt = FORMATS[format];
  const story = (format==='9x16' && doc.storyBoost!==false) ? (doc.storyScale||1.15) : 1;
  return doc.elements.map(el=>{
    let r;
    if(el.bleed && el.type==='photo'){
      /* full-bleed background: fill the format in every aspect (no manual
         resize per format). bleedBottom reserves a band for a full-width
         Reality banner so the image stops at its top edge. */
      r = Object.assign({}, el, { x:0, y:0, w:fmt.w, h:fmt.h - (el.bleedBottom||0) });
    } else {
      r = mapElementToFormat(el, doc.masterFormat, format);
      if(story!==1) r = boostForStory(r, story, fmt);
    }
    const ov = ovs[el.id];
    if(ov) Object.assign(r, ov);
    r._overridden = !!ov;
    return r;
  });
}
/* inverse: a point dropped in `format` view → master coords for storage */
function pointToMaster(type, x, y, masterFormat, format){
  const anchor = (DEFAULTS[type] && DEFAULTS[type].anchor) || 'safe';
  const mf = FORMATS[masterFormat], tf = FORMATS[format];
  if(anchor==='bottom') return { x, y: y - tf.h + mf.h };
  const ms = safeRect(masterFormat), ts = safeRect(format);   // inverse of mapElementToFormat: align safe-zone centres
  return { x, y: y - (ts.y + ts.h/2) + (ms.y + ms.h/2) };
}

export {
  PALETTE, ACCENTS, INK_CHOICES, ACCENT_DAYS, ACCENT_BY_DAY, ACCENTS_BY_DAY, DAY_ABBR, DAY_NAMES, accentDay,
  FORMATS, OUTPUT_FORMATS, STANDEE_FORMATS, HANDOUT_FORMATS, MODULE, STEP, TYPE_SCALE, LAYOUT_KEYS,
  snapToScale, scaleStep,
  themeColors, contrastInk, relLuminance, contrastRatio, surfaceStyle, shadowModel, textInsetModel, safeRect, CATALOG, DEFAULTS, makeElement, uid, QRGlyph, qrPatternOf, QUIET_SPEC, QUIET_TIGHT, parseSessions,
  SHAPE_KINDS, SHAPE_LABELS, MASK_KINDS, RULE_PATTERNS, RULE_TERMS, BURST_PRESETS, GRAPHICS,
  INK_MARK, INK_MARK_CELLS, INK_MARK_DAY_KEYS, INK_MARK_DAY_ACCENT, inkMarkCells, inkMarkLayout, inkMarkHex,
  shapePath, shapeClip, roundedRectPath, burstRays, ruleLayout, iconLayout,
  resolveElements, mapElementToFormat, pointToMaster,
};
