/* ============================================================
   REALITY POSTER STUDIO — starter templates
   Imported directly (not through studio-data.jsx, which they build on).
   ============================================================ */
import { makeElement } from './studio-data.jsx';
/* ============================================================
   TEMPLATES — starting layouts authored at the 4:5 master
   (1080×1350; safe square y 135–1215). Pick one to fill the
   canvas; you then tune from there. Positions keep the key
   content inside the 4:5 safe zone.
   ============================================================ */
const TEMPLATE_GROUPS = ['Weekly', 'Talk', 'Series', 'Nightlife', 'Ink', 'Menu'];
/* Every template opens with a full-bleed background photo (the house style),
   keeps content on a shared left line (x:90 — the Swiss vertical), and the
   Talk/Series families end with a full-width Reality banner filling the bottom
   (the bookish, serious read). Text over the photo defaults to cream.

   BLEED(reserve) fills EVERY format edge-to-edge (bleed:true), so there's no
   per-format resizing — reserve leaves a bottom band (the banner) untouched.
   Duotone in the poster accent, slightly darkened, keeps cream text readable. */
const BLEED  = (reserve, extra) => { const r = reserve==null?270:reserve; return ({ type:'photo', x:0, y:0, w:1080, h:1350-r,
  p:Object.assign({ bleed:true, bleedBottom:r, treatment:'separation', followAccent:true, contrast:1.12, brightness:-0.04, frame:false }, extra||{}) }); };
/* The two closing bands, authored once so every template that ends in one is
   identical. BANNER matches TICKET_FORMATS.banner exactly (QR on, canon
   square in full ink, column right) — the two must agree, or picking "Banner"
   in the details panel would rebuild a template's own footer differently
   from how the template shipped it. TICKET sits on the shared Swiss frame
   (x:90 … 990) like every other element; it used to sit at x:80/w:920, one
   of the odd-one-out numbers the standard-sizing pass swept up. */
const BANNER = () => ({ type:'ticket', k:'ticket', x:0, y:1080, w:1080, h:270, p:{ variant:'banner', surface:'paper', showQR:true, align:'right', mark:'on', markForm:'square', markMode:'full', site:'realitydn.com', addr:'86 Mai Thúc Lân · Đà Nẵng' } });
const TICKET = () => ({ type:'ticket', k:'ticket', x:90, y:1125, w:900, h:180, p:{ variant:'standard', surface:'paper', showQR:true, site:'realitydn.com', addr:'86 Mai Thúc Lân · Đà Nẵng' } });

const TEMPLATES = [
  /* ---- WEEKLY · recurring events (Day · full-bleed + bottom banner) ---- */
  { id:'weekly-classic', name:'Classic', group:'Weekly', theme:'day', accent:'blue', ov:{ '1x1':{ weekly:{ y:35 }, title:{ y:285 }, host:{ y:655 } } }, els:[
    BLEED(),
    { type:'weekly', k:'weekly', x:90, y:270, w:900, h:225, p:{ price:'Free', every:'EVERY', day:'THU', allYear:'ALL YEAR', time:'19:00' } },
    { type:'title',  k:'title', x:90, y:540, w:900, h:360, p:{ text:'Quiz\nNight', fontSize:120, weight:700, align:'left', surface:'none', color:'cream' } },
    { type:'host',   k:'host', x:90, y:900, w:630, h:135, p:{ kicker:'Hosted by', name:'Host Name', align:'left', surface:'none', color:'cream', fontSize:32 } },
    BANNER(),
  ]},
  /* ---- TALK · single events (Day · full-bleed + bottom banner) ---- */
  /* THE default event template — what the queue hands a calendar event, and
     the one every other Talk layout is a variation on. It is deliberately the
     plainest statement of the standard frame, so the boxes here ARE the house
     sizes: chips 360×90 and 270×90 on one baseline, title 900 wide, host
     630×135, banner 1080×270 flush to the foot. Every edge is a multiple of
     45 and the left/right lines are 90 / 990, so nothing in it needs nudging
     and Snap lands on all of it.

       270 – 360   Thu · 19:00   +   Free      (one chip row)
       405 – 765   Event Title
       810 – 945   Hosted by / Speaker Name
      1080 – 1350  the Reality banner                                  */
  { id:'talk-classic', name:'Classic', group:'Talk', theme:'day', accent:'blue', els:[
    BLEED(),
    { type:'when',  x:90, y:270, w:360, h:90, p:{ text:'Thu · 19:00', surface:'accent', align:'center' } },
    { type:'cost',  x:540, y:270, w:270, h:90, p:{ text:'Free', surface:'accent', align:'center' } },
    { type:'title', x:90, y:405, w:900, h:360, p:{ text:'Event\nTitle', fontSize:120, weight:700, align:'left', surface:'none', color:'cream' } },
    { type:'host',  x:90, y:810, w:630, h:135, p:{ kicker:'Hosted by', name:'Speaker Name', align:'left', surface:'none', color:'cream', fontSize:32 } },
    BANNER(),
  ]},
  { id:'talk-top', name:'Top + tagline', group:'Talk', theme:'day', accent:'red', els:[
    BLEED(),
    { type:'title',  x:90, y:180, w:900, h:270, p:{ text:'Event Title', fontSize:100, weight:700, align:'left', surface:'none', color:'cream' } },
    { type:'tagline',x:90, y:495, w:900, h:90,  p:{ text:'A short line about the talk.', fontSize:22, surface:'none', color:'cream' } },
    { type:'when',   x:90, y:630, w:360, h:90,  p:{ text:'Thu · 19:00', surface:'accent' } },
    { type:'host',   x:90, y:765, w:630, h:135, p:{ kicker:'With', name:'Speaker Name', align:'left', surface:'none', color:'cream', fontSize:32 } },
    BANNER(),
  ]},
  { id:'talk-block', name:'Text block', group:'Talk', theme:'day', accent:'yellow', els:[
    BLEED(),
    { type:'title', x:90, y:360, w:900, h:315, p:{ text:'Event Title', fontSize:82, weight:700, align:'left', surface:'solid' } },
    { type:'when',  x:90, y:720, w:360, h:90, p:{ text:'Thu · 19:00', surface:'accent' } },
    { type:'host',  x:90, y:855, w:630, h:135, p:{ kicker:'Hosted by', name:'Speaker Name', align:'left', surface:'none', color:'cream', fontSize:32 } },
    BANNER(),
  ]},
  { id:'talk-statement', name:'Statement', group:'Talk', theme:'day', accent:'red', ov:{ '1x1':{ title:{ y:130 }, when:{ y:710 } } }, els:[
    BLEED(),
    { type:'title', k:'title', x:90, y:315, w:900, h:540, p:{ text:'BIG\nIDEA', fontSize:206, weight:800, align:'left', surface:'none', color:'cream' } },
    { type:'when',  k:'when', x:90, y:945, w:360, h:90, p:{ text:'Thu · 19:00', surface:'accent' } },
    BANNER(),
  ]},
  { id:'talk-lower', name:'Lower third', group:'Talk', theme:'day', accent:'blue', ov:{ '1x1':{ when:{ y:240 }, title:{ y:360 }, host:{ y:665 } } }, els:[
    BLEED(),
    { type:'when',  k:'when', x:90, y:540, w:360, h:90, p:{ text:'Thu · 19:00', surface:'accent' } },
    { type:'title', k:'title', x:90, y:630, w:900, h:270, p:{ text:'Event Title', fontSize:100, weight:700, align:'left', surface:'none', color:'cream' } },
    { type:'host',  k:'host', x:90, y:900, w:630, h:135, p:{ kicker:'With', name:'Speaker Name', align:'left', surface:'none', color:'cream', fontSize:32 } },
    BANNER(),
  ]},
  /* ---- SERIES · recurring talks (Day · full-bleed + bottom banner) ---- */
  { id:'series-badge', name:'Badge', group:'Series', theme:'day', accent:'green', ov:{ '1x1':{ host:{ y:700 } } }, els:[
    BLEED(),
    { type:'badge', x:765, y:225, w:225, h:225, p:{ top:'EVERY', big:'THU', sub:'weekly' } },
    { type:'title', x:90, y:540, w:900, h:315, p:{ text:'Series\nName', fontSize:100, weight:700, surface:'none', align:'left', color:'cream' } },
    { type:'host',  k:'host', x:90, y:855, w:630, h:135, p:{ kicker:'Hosted by', name:'Host Name', surface:'none', align:'left', color:'cream', fontSize:32 } },
    BANNER(),
  ]},
  { id:'series-sessions', name:'Sessions', group:'Series', theme:'day', accent:'purple', ov:{ '1x1':{ sessions:{ h:490 } } }, els:[
    BLEED(),
    { type:'title',    x:90, y:180, w:900, h:180, p:{ text:'Series Name', fontSize:82, weight:700, surface:'none', align:'left', color:'cream' } },
    { type:'sessions', k:'sessions', x:90, y:450, w:900, h:585, p:{ heading:'Next sessions', surface:'scrim', raw:'01 — Opening Night — 5.6\n02 — Director in Focus — 12.6\n03 — Late Classic — 19.6\n04 — Closing Film — 26.6' } },
    BANNER(),
  ]},
  { id:'series-min', name:'Minimal', group:'Series', theme:'day', accent:'amber', ov:{ '1x1':{ badge:{ y:575 } } }, els:[
    BLEED(),
    { type:'title', x:90, y:360, w:900, h:315, p:{ text:'Series\nName', fontSize:120, align:'left', surface:'none', color:'cream' } },
    { type:'badge', k:'badge', x:90, y:720, w:225, h:225, p:{ top:'EVERY', big:'THU', sub:'19:00' } },
    BANNER(),
  ]},
  /* ---- NIGHTLIFE (Night · full-bleed + standard ticket) ---- */
  { id:'night-dj', name:'DJ hero', group:'Nightlife', theme:'night', accent:'pink', ov:{ '1x1':{ title:{ y:330 }, host:{ y:710 } } }, els:[
    BLEED(0, { contrast:1.3 }),
    { type:'title', k:'title', x:90, y:540, w:900, h:360, p:{ text:'PULSE\nSESSIONS', fontSize:144, weight:700, align:'left', surface:'none', color:'cream' } },
    { type:'host',  k:'host', x:90, y:900, w:630, h:135, p:{ kicker:'On the decks', name:'DJ Name', surface:'none', align:'left', color:'cream', fontSize:32 } },
    TICKET(),
  ]},
  { id:'night-party', name:'Party slam', group:'Nightlife', theme:'night', accent:'red', ov:{ '1x1':{ title:{ y:160 }, when:{ y:745 } } }, els:[
    BLEED(0, { treatment:'spot', spotBase:'duotone', contrast:1.3 }),
    { type:'title', k:'title', x:90, y:315, w:900, h:540, p:{ text:'BIG\nNIGHT', fontSize:206, weight:800, align:'left', surface:'none', color:'cream' } },
    { type:'when',  k:'when', x:90, y:945, w:360, h:90, p:{ text:'Sat · 22:00', surface:'accent' } },
    TICKET(),
  ]},
  /* ---- INK · the Year-2 system spoken plainly: no photograph — the locked
     palette, the tracking ladder and the canon mark do the whole composition
     on bare paper. One starting point: a band stack, keeping the ticket
     (mark absent = on). The mark-hero and listing starters went with the
     ink-mark and Week parts (pared 13.10.26). ---- */
  /* Three-ink bands — a band-stack poster. Day-accent display band (title,
     Auto fill follows the day carousel), a paper band of facts (Grotesk,
     name-role rows), and the red ACTION band: one imperative line set cream.
     Both bands' text is Auto — the APCA text-on-fill rule (5.10.26) gives
     cream on red, pink, blue, green and purple and ink on yellow and amber,
     so the action band no longer needs an explicit textColor:'cream' and the
     display band follows whatever day it is recoloured to. 3px ink blocks
     as rules between the bands; no decoration beyond the fields. The bands run
     edge-to-edge, so 9:16 pins their x/w back to the frame (the Story boost
     would otherwise push a full-width box past the canvas); text keeps the
     x:90 Swiss line via textInset. */
  { id:'ink-bands', name:'Three-ink bands', group:'Ink', theme:'day', accent:'blue',
    ov:{ '9x16':{ band1:{ x:0, w:1080 }, r1:{ x:0, w:1080 }, facts:{ x:0, w:1080 }, r2:{ x:0, w:1080 }, action:{ x:0, w:1080 } } }, els:[
    { type:'title', k:'band1', x:0, y:135, w:1080, h:360, p:{ text:'Event\nTitle', fontSize:144, weight:800, align:'left', surface:'accent', textInset:90 } },
    { type:'block', k:'r1', x:0, y:487, w:1080, h:3, p:{ fill:'ink', grain:0, opacity:1, outline:false } },
    { type:'info',  k:'facts', x:0, y:495, w:1080, h:270, p:{ surface:'none', align:'left', fontSize:32, lineHeight:1.5, textInset:90,
      text:'Thu · 25.9.26 · 19:00\nThe Rooftop · Floor 3\nFree entry — all welcome' } },
    { type:'block', k:'r2', x:0, y:757, w:1080, h:3, p:{ fill:'ink', grain:0, opacity:1, outline:false } },
    { type:'title', k:'action', x:0, y:765, w:1080, h:180, p:{ text:'Come early', fontSize:100, weight:800, align:'left', surface:'accent', fill:'red', textInset:90 } },
    TICKET(),
  ]},
  /* ---- MENU · vended / pop-up stall (Day · clean white cards + colour-block
     header). Two drink categories as side-by-side cards, the smaller (right)
     one carrying a Snacks SUB-section beneath it — same card, smaller heading,
     so it reads as subordinate. Authored to fill the 4:5 master and to print
     clean at A4 (the intended output). Each specials block sets an explicit
     rowSize: the auto-fit caps rows tiny (right for a poster callout, far too
     small when the list IS the poster). Footer ticket carries the mandatory
     address + a scannable QR. Hide the footer on the square — its centre crop
     would collide with the long columns; the menu's real home is A4. */
  { id:'menu-two-cat', name:'Two-category', group:'Menu', theme:'day', accent:'red',
    ov:{ '1x1':{ ticket:{ hidden:true } } }, els:[
    { type:'title', k:'title', x:90, y:135, w:900, h:180, p:{ text:'MENU', fontSize:120, weight:800, align:'left', surface:'accent', subtitle:'Drinks & Snacks', subSize:28 } },
    { type:'specials', k:'alc', x:90, y:405, w:405, h:675, p:{ heading:'Alcoholic', headingSize:28, surface:'paper', rowSize:34, rowGap:24, rowWeight:700, rowTracking:0, items:[
        {l:'Bia Saigon',p:'₫25k'},{l:'Rum & Coke',p:'₫70k'},{l:'Gin Tonic',p:'₫80k'},
        {l:'House Cocktail',p:'₫90k'},{l:'Wine, glass',p:'₫90k'},{l:'Rượu shot',p:'₫50k'} ] } },
    { type:'specials', k:'nonalc', x:585, y:405, w:405, h:360, p:{ heading:'Non-Alcoholic', headingSize:28, surface:'paper', rowSize:30, rowGap:18, rowWeight:700, rowTracking:0, items:[
        {l:'Cà phê',p:'₫25k'},{l:'Trà đá',p:'₫10k'},{l:'Soft drink',p:'₫20k'},{l:'Nước suối',p:'₫10k'} ] } },
    { type:'specials', k:'snacks', x:585, y:810, w:405, h:270, p:{ heading:'Snacks', headingSize:18, surface:'paper', rowSize:26, rowGap:16, rowWeight:700, rowTracking:0, items:[
        {l:'Khoai tây / Chips',p:'₫20k'},{l:'Đậu phộng',p:'₫15k'},{l:'Bánh snack',p:'₫15k'} ] } },
    { type:'ticket', k:'ticket', x:90, y:1125, w:900, h:180, p:{ variant:'standard', surface:'paper', showQR:true, site:'realitydn.com', addr:'86 Mai Thúc Lân · Đà Nẵng' } },
  ]},
];
function buildTemplate(tpl){
  const keymap = {};
  const elements = (tpl.els||[]).map(s=>{
    const el = makeElement(s.type, s.x|0, s.y|0);
    if(s.w!=null) el.w=s.w; if(s.h!=null) el.h=s.h;
    if(s.p) Object.assign(el, JSON.parse(JSON.stringify(s.p)));
    if(s.k) keymap[s.k] = el.id;
    return el;
  });
  /* per-format overrides, authored by element key (`k`) since real ids are
     generated here. The 4:5 master stays the canonical design; these only
     nudge a piece where a shorter aspect (1:1) would otherwise clip it. */
  const overrides = {};
  if(tpl.ov) Object.keys(tpl.ov).forEach(fmt=>{
    const fo = {}; const spec = tpl.ov[fmt];
    Object.keys(spec).forEach(k=>{ if(keymap[k]) fo[keymap[k]] = spec[k]; });
    if(Object.keys(fo).length) overrides[fmt] = fo;
  });
  return { elements, masterFormat:'4x5', theme: tpl.theme||'day', accent: tpl.accent||'blue', overrides };
}

export { TEMPLATES, TEMPLATE_GROUPS, buildTemplate };
