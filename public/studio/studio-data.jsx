/* ============================================================
   REALITY POSTER STUDIO — shared data + utilities
   Exports to window: PALETTE, ACCENTS, FORMATS, MODULE, STEP,
   themeColors, surfaceStyle, safeRect, CATALOG, makeElement,
   uid, QRGlyph
   ============================================================ */

const PALETTE = {
  blue:'#18a7e0', green:'#43b02a', yellow:'#fddf00',
  amber:'#fdb515', purple:'#6e3179', pink:'#ed1b72', red:'#ed2224'
};
const ACCENTS = ['blue','green','yellow','amber','purple','pink','red'];
/* Weekday each accent codes for on schedule surfaces (Year 2 scheme, shifted
   June 2026) — surfaced as tooltips on the poster-accent picker so an event
   poster can match its day. Amber is the schedule's "orange". */
const ACCENT_DAYS = {
  yellow:'Sunday', green:'Monday', blue:'Tuesday', purple:'Wednesday',
  pink:'Thursday', red:'Friday', amber:'Saturday'
};
/* Mon→Sun order + the inverse of ACCENT_DAYS — drives the day-of-week picker,
   the ordered accent row, and the Story filename (e.g. purple → "3-Wed"). */
const DAY_NAMES = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const DAY_ABBR  = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const ACCENT_BY_DAY = {}; Object.keys(ACCENT_DAYS).forEach(a=>{ ACCENT_BY_DAY[ACCENT_DAYS[a]]=a; });
const ACCENTS_BY_DAY = DAY_NAMES.map(d=>ACCENT_BY_DAY[d]);   // green,blue,purple,pink,red,amber,yellow
function accentDay(accent){ const day=ACCENT_DAYS[accent]; if(!day) return null; const i=DAY_NAMES.indexOf(day); return { name:day, abbr:DAY_ABBR[i], n:i+1 }; }

const FORMATS = {
  '4x5':  { w:1080, h:1350, label:'4:5', sub:'FEED' },   /* primary — IG feed + site pipeline */
  '5x7':  { w:1080, h:1512, label:'5:7', sub:'POSTER' },
  '1x1':  { w:1080, h:1080, label:'1:1', sub:'SQUARE' },
  '9x16': { w:1080, h:1920, label:'9:16', sub:'STORY' },
  /* Facebook event cover — 1.91:1 landscape (1920×1005 on upload; 2× export
     ≈ 2160×1130). Facebook crops the sides on mobile and the edges on desktop,
     so the safe zone is the centre ~62.5% (1200×628 on the real thing). `fit`
     scales the portrait master down into that zone; full-bleed photos still
     fill. On-demand like A1 — kept out of the Save-All bundle. */
  'fbcover': { w:1080, h:565, label:'FB', sub:'EVENT', fit:0.5, safe:{ x:202, y:106, w:676, h:353 } },
  'a4':   { w:1080, h:1527, label:'A4', sub:'PRINT' },
  /* Extra print view — same sheet shape as A4 (all A-series paper is 1:√2),
     but Save captures it at print resolution (3508px = A1 @ 150dpi; PDF at
     true 594×841mm). Deliberately NOT in OUTPUT_FORMATS: it's on-demand for
     the occasional big print, never part of the Save-All bundle. */
  'a1':   { w:1080, h:1527, label:'A1', sub:'PRINT XL' }
};
const OUTPUT_FORMATS = ['4x5','5x7','1x1','9x16','a4'];
/* modular type scale — font size snaps to these for consistency */
const TYPE_SCALE = [18,22,26,32,38,46,56,68,82,100,120,144,172,206,248];
function snapToScale(v){
  let best = TYPE_SCALE[0], d = Infinity;
  for(const s of TYPE_SCALE){ const dd = Math.abs(s-v); if(dd<d){ d=dd; best=s; } }
  return best;
}
function scaleStep(v, dir){
  let i = TYPE_SCALE.indexOf(snapToScale(v));
  i = Math.max(0, Math.min(TYPE_SCALE.length-1, i+dir));
  return TYPE_SCALE[i];
}
const LAYOUT_KEYS = ['x','y','w','h','rot','hidden','imgScale','imgX','imgY','imgRot'];
const MODULE = 108;
const STEP = 54;

function themeColors(theme){
  return theme==='night'
    ? { fg:'#fffbf1', bg:'#0a0703', paper:'#171109', shadow:(a)=>`rgba(255,251,241,${a})` }
    : { fg:'#0d0905', bg:'#fffbf1', paper:'#fffbf1', shadow:(a)=>`rgba(13,9,5,${a})` };
}

/* Pick the readable ink/cream for text sitting on a given fill. Threshold is
   kept low so all seven brand accents keep dark ink (the Riso look); only a
   genuinely dark fill (e.g. Ink) flips the text to cream. */
function contrastInk(hex){
  if(typeof hex!=='string' || hex[0]!=='#' || hex.length<7) return '#0d0905';
  const r=parseInt(hex.slice(1,3),16)/255, g=parseInt(hex.slice(3,5),16)/255, b=parseInt(hex.slice(5,7),16)/255;
  const L=0.2126*r + 0.7152*g + 0.0722*b;
  return L<0.2 ? '#fffbf1' : '#0d0905';
}

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

/* centered 1:1 safe square for a format */
function safeRect(format){
  const f = FORMATS[format];
  if(f.safe) return f.safe;                 // format-defined zone (e.g. the FB cover centre band)
  const size = Math.min(f.w, f.h);
  return { x:(f.w-size)/2, y:(f.h-size)/2, w:size, h:size };
}

let _id = 1;
function uid(){ return 'e'+(_id++)+'_'+Math.random().toString(36).slice(2,6); }

/* ---- Sessions list parser — one session per line, pasted as-is ----
   Accepts "001 — Title — 3.6.26", "Title – 10.6", "Title | date", tab-separated
   columns, or bare titles. Splits on em/en dashes, pipes, tabs, or a SPACED
   hyphen (so "Check-in" never splits). The leading number and trailing date are
   both optional per line; anything unrecognised folds back into the title. */
function parseSessions(raw){
  const NUM  = /^[#№]?\d{1,4}[.):]?$/;                                  // 001 · #3 · 12. · 4)
  const DATE = /^\d{1,2}[./-]\d{1,2}([./-]\d{2,4})?$/;                  // 3.6.26 · 17.7 · 12/06/2026
  return (raw||'').split(/\r?\n/).map(line=>{
    const s = line.trim();
    if(!s) return null;
    const parts = s.split(/\s*[—–|]\s*|\s+-\s+|\t+/).map(p=>p.trim()).filter(Boolean);
    let num='', date='';
    if(parts.length>1 && NUM.test(parts[0])) num = parts.shift();
    if(parts.length>1 && DATE.test(parts[parts.length-1])) date = parts.pop();
    else if(num && parts.length===1 && DATE.test(parts[0])) date = parts.pop();   // "003 — 17.6.26"
    // "12. Title" / "3) Title" — numbered without a separator. The dot/paren is
    // required: a bare leading number stays in the title ("24 Hour Comic").
    if(!num && parts.length){ const m = parts[0].match(/^(\d{1,4}[.)])\s+(\S.*)$/); if(m){ num=m[1]; parts[0]=m[2]; } }
    return { num, date, title: parts.join(' — ') };
  }).filter(Boolean);
}

/* ---- REAL QR — encodes https://realitydn.com (v2, EC M) ----
   Generated by tools/generate-qr.py; exported posters scan for real.
   Canonical PNG/SVG assets live in brand-assets/qr/. */
const _QR_ROWS = [
"1111111000000100001111111",
"1000001000111111001000001",
"1011101011001000101011101",
"1011101010101110001011101",
"1011101010111000101011101",
"1000001010111101001000001",
"1111111010101010101111111",
"0000000010111011100000000",
"1011111001111111001111100",
"1111010001011100100100010",
"0000111110111111111011011",
"0110000100110011011000001",
"0100001001001110111110111",
"1111110111100100100101010",
"1000001111011011001111011",
"1001110101010011111110001",
"1010011011010001111110100",
"0000000011001100100011000",
"1111111000100110101010111",
"1000001010001100100011011",
"1011101010101011111110111",
"1011101010000000011011111",
"1011101010011001100001101",
"1000001000110011110111001",
"1111111010110000001111111"
];
const _QR = _QR_ROWS.map(r=>r.split('').map(Number));
function QRGlyph({ size, dark, light }){
  const n = _QR.length;
  /* spec quiet zone: 4 modules per side relative to the full tile */
  const pad = size * (4 / (n + 8));
  return (
    <div style={{ width:size, height:size, background:light, padding:pad, boxSizing:'border-box' }}>
      <div style={{ width:'100%', height:'100%', display:'grid',
        gridTemplateColumns:`repeat(${n},1fr)`, gridTemplateRows:`repeat(${n},1fr)` }}>
        {_QR.flatMap((row,y)=>row.map((c,x)=>
          <div key={x+'-'+y} style={{ background: c?dark:light }} />
        ))}
      </div>
    </div>
  );
}

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
    { type:'host',    label:'Host',     hint:'Credit — size in panel' },
  ]},
  { group:'Blocks', items:[
    { type:'block',   label:'Colour block', hint:'Flat ink field' },
    { type:'ticket',  label:'REALITY ticket', hint:'Banner / sizes in panel', wide:true },
    { type:'lineup',  label:'Lineup',   hint:'Acts + set times' },
    { type:'sessions',label:'Sessions', hint:'Series — paste the list' },
    { type:'specials',label:'Specials', hint:'Drinks + prices' },
    { type:'qr',      label:'QR block', hint:'Scan to site' },
    { type:'weekly',  label:'Weekly tag', hint:'Price · day · time', wide:true },
  ]},
  { group:'Marks', items:[
    { type:'stamp',   label:'Stamp',    hint:'SOLD OUT / FREE' },
    { type:'badge',   label:'Badge',    hint:'Every Wed' },
  ]},
  { group:'Media', items:[
    { type:'photo',   label:'Photo',    hint:'Riso-treated image', wide:true },
    { type:'logo',    label:'Partner logo', hint:'PNG with transparency', wide:true },
  ]},
];

const DEFAULTS = {
  // letterSpacing is in em; defaults match each type's prior fixed tracking so
  // nothing shifts until you move the slider. Spread things far apart at will.
  title:   { w:760, h:300, props:{ text:'Event Title', fontSize:140, weight:800, surface:'none', align:'left', orient:'h', color:'fg', letterSpacing:0.005,
             subtitle:'', subSize:30, subWeight:600, subTracking:0.02, subColor:'fg', subLayout:'snug' } },
  tagline: { w:560, h:80,  props:{ text:'A short tagline goes right here', fontSize:22, weight:400, surface:'none', align:'left', orient:'h', color:'fg', letterSpacing:0 } },
  info:    { w:560, h:260, props:{ text:'Doors at 8, music from 9.\n\nEntry is **free** before 10 — *come early*.\n- All welcome\n- Cash bar', fontSize:24, weight:400, surface:'none', align:'left', orient:'h', color:'fg', letterSpacing:0, lineHeight:1.4 } },
  when:    { w:360, h:84,  props:{ text:'FRI · 22:00', fontSize:30, weight:700, surface:'accent', align:'center', orient:'h', color:'fg', letterSpacing:0.16 } },
  host:    { w:520, h:170, props:{ kicker:'Hosted by', name:'The Host', fontSize:46, weight:700, surface:'solid', align:'center', orient:'h', color:'fg', letterSpacing:0.02 } },
  ticket:  { w:920, h:200, anchor:'bottom', props:{ variant:'standard', word:'Reality', addr:'86 Mai Thúc Lân · Đà Nẵng', site:'www.realitydn.com', surface:'paper', showQR:true, color:'fg' } },
  lineup:  { w:520, h:240, props:{ heading:'On the decks', items:[{n:'DJ Milk',t:'23:00'},{n:'Hanø',t:'00:30'},{n:'b2b Suki',t:'late'}], surface:'scrim', color:'fg' } },
  sessions:{ w:660, h:460, props:{ heading:'Next sessions',
             raw:'001 — First Session Title — 3.6.26\n002 — Second Session Title — 10.6.26\n003 — Third Session Title — 17.6.26\n004 — Fourth Session Title — 24.6.26',
             rowSize:0, surface:'scrim', color:'fg' } },
  specials:{ w:460, h:230, props:{ heading:'Happy Hour', items:[{l:'House spirits',p:'₫50k'},{l:'Draft + shot',p:'₫65k'},{l:'Til 1am',p:'2-for-1'}], surface:'accent', color:'fg' } },
  qr:      { w:360, h:150, props:{ label:'Scan for the night', site:'realitydn.com', surface:'paper', showQR:true, color:'fg' } },
  stamp:   { w:300, h:96,  props:{ text:'SOLD OUT', fontSize:38, surface:'accent', rot:-8, color:'fg', letterSpacing:0.04 } },
  badge:   { w:200, h:200, props:{ top:'EVERY', big:'WED', sub:'all year', surface:'paper', color:'fg' } },
  /* Weekly recurring-event combo: an accent bar with the price (left) and time
     (right), and a day-of-week badge centred on top. One draggable unit. */
  weekly:  { w:820, h:220, props:{ price:'FREE', every:'EVERY', day:'THU', allYear:'ALL YEAR', time:'18:00', fill:'fg', color:'fg',
             shadowOn:true, shadowDist:9, shadowAngle:90, shadowBlur:3, shadowAlpha:null, shadowColor:'fg' } },
  block:   { w:540, h:420, props:{ fill:'fg', opacity:1, grain:0, grainSize:2, outline:false, color:'fg' } },
  photo:   { w:760, h:900, props:{ treatment:'duotone', sample:'spotlight', src:null,
             followAccent:true, ink:'pink', ink2:null, contrast:1.18, brightness:0, dot:9, bands:4, threshold:0.52,
             softness:0.12, angle:47, balance:0.5, shadowTint:0.18, invert:false, spread:1.25,
             shape:'circle', split:0.16, offset:13, frame:false, surface:'none', color:'fg',
             inkMode:'single', gradMode:'tone', gradAngle:90, gradA:null, gradB:null, screenOffset:30,
             field:'paper', fieldInk:null, fieldStrength:0.12, dotGain:1, jitter:0, pucker:0.35,
             spotLo:0.35, spotHi:0.65, spotSoft:0.08, spotInvert:false, spotBase:'duotone', transparent:false, fit:'cover',
             bleed:false, bleedBottom:0,
             imgScale:1, imgX:0, imgY:0, imgRot:0,
             blurUnder:0, blurOver:0, grain:0, grainSize:2 } },
  /* Partner logo — same engine as a photo but untreated by default and with a
     transparent ground (PNG-24 alpha is kept), contain-fit so the whole mark
     shows. Treatments still available if you want to riso a logo. */
  logo:    { w:320, h:180, props:{ treatment:'none', transparent:true, paperFill:'fg', sample:null, src:null,
             followAccent:true, ink:'pink', ink2:null, contrast:1.1, brightness:0, dot:9, bands:4, threshold:0.52,
             softness:0.12, angle:47, balance:0.5, shadowTint:0.18, invert:false, spread:1.25,
             shape:'circle', split:0.16, offset:13, frame:false, surface:'none', color:'fg',
             inkMode:'single', gradMode:'tone', gradAngle:90, gradA:null, gradB:null, screenOffset:30,
             field:'paper', fieldInk:null, fieldStrength:0.12, dotGain:1, jitter:0, pucker:0.35,
             spotLo:0.35, spotHi:0.65, spotSoft:0.08, spotInvert:false, spotBase:'duotone', fit:'contain',
             imgScale:1, imgX:0, imgY:0, imgRot:0,
             blurUnder:0, blurOver:0, grain:0, grainSize:2 } },
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
    r.y = el.y - ms.y + ts.y;            // x unchanged — column width is constant 1080
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
  const cx=tf.w/2, nw=r.w*k, nh=r.h*k;
  const nx = cx + (r.x + r.w/2 - cx)*k - nw/2;
  const ny = r.anchor==='bottom' ? (r.y + r.h) - nh : (tf.h/2 + (r.y + r.h/2 - tf.h/2)*k - nh/2);
  const out = Object.assign({}, r, { x:Math.round(nx), y:Math.round(ny), w:Math.round(nw), h:Math.round(nh) });
  if(typeof r.fontSize==='number') out.fontSize = Math.round(r.fontSize*k);
  out._boost = k;   // blocks with fixed internal type read this to scale their text in step
  return out;
}
function resolveElements(doc, format){
  const ovs = (doc.overrides && doc.overrides[format]) || {};
  const fmt = FORMATS[format];
  const mw = FORMATS[doc.masterFormat].w;
  const story = (format==='9x16' && doc.storyBoost!==false) ? (doc.storyScale||1.3) : 1;
  const fit = (fmt && fmt.fit) ? fmt.fit : 1;          // landscape covers scale the portrait master down to fit
  return doc.elements.map(el=>{
    let r;
    if(el.bleed && el.type==='photo'){
      /* full-bleed background: fill the format in every aspect (no manual
         resize per format). bleedBottom reserves a band for a full-width
         Reality banner so the image stops at its top edge; landscape covers
         fill edge-to-edge (their banner placement is bespoke). */
      const reserve = fit!==1 ? 0 : (el.bleedBottom||0);
      r = Object.assign({}, el, { x:0, y:0, w:fmt.w, h:fmt.h - reserve });
    } else {
      r = mapElementToFormat(el, doc.masterFormat, format);
      let scale = story!==1 ? story : fit;
      if(fit!==1 && el.type==='photo' && el.w>=mw*0.98 && el.x<=mw*0.02) scale = 1;   // legacy bleeds (no flag) still fill on covers
      if(scale!==1) r = boostForStory(r, scale, fmt);
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
  return { x, y: y - safeRect(format).y + safeRect(masterFormat).y };
}

/* ============================================================
   TEMPLATES — starting layouts authored at the 4:5 master
   (1080×1350; safe square y 135–1215). Pick one to fill the
   canvas; you then tune from there. Positions keep the key
   content inside the 4:5 safe zone.
   ============================================================ */
const TEMPLATE_GROUPS = ['Talk', 'Series', 'Nightlife'];
/* Every template opens with a full-bleed background photo (the house style),
   keeps content on a shared left line (x:90 — the Swiss vertical), and the
   Talk/Series families end with a full-width Reality banner filling the bottom
   (the bookish, serious read). Text over the photo defaults to cream.

   BLEED(reserve) fills EVERY format edge-to-edge (bleed:true), so there's no
   per-format resizing — reserve leaves a bottom band (the banner) untouched.
   Duotone in the poster accent, slightly darkened, keeps cream text readable. */
const BLEED  = (reserve, extra) => { const r = reserve==null?270:reserve; return ({ type:'photo', x:0, y:0, w:1080, h:1350-r,
  p:Object.assign({ bleed:true, bleedBottom:r, treatment:'duotone', followAccent:true, contrast:1.22, brightness:-0.06, frame:false }, extra||{}) }); };
const BANNER = () => ({ type:'ticket', x:0, y:1080, w:1080, h:270, p:{ variant:'banner', surface:'paper', showQR:false, site:'realitydn.com', addr:'86 Mai Thúc Lân · Đà Nẵng' } });
const TICKET = () => ({ type:'ticket', x:90, y:1150, w:900, h:170, p:{ variant:'standard', surface:'paper', showQR:true, site:'realitydn.com', addr:'86 Mai Thúc Lân · Đà Nẵng' } });

const TEMPLATES = [
  /* ---- TALK · single events (Day · full-bleed + bottom banner) ---- */
  { id:'talk-classic', name:'Classic', group:'Talk', theme:'day', accent:'blue', els:[
    BLEED(),
    { type:'when',  x:90, y:250, w:360, h:84,  p:{ text:'THU · 19:00', surface:'accent', align:'center' } },
    { type:'title', x:90, y:380, w:900, h:340, p:{ text:'Event\nTitle', fontSize:120, weight:700, align:'left', surface:'none', color:'cream' } },
    { type:'host',  x:90, y:780, w:640, h:110, p:{ kicker:'Presented by', name:'Speaker Name', align:'left', surface:'none', color:'cream', fontSize:30 } },
    BANNER(),
  ]},
  { id:'talk-top', name:'Top + tagline', group:'Talk', theme:'day', accent:'red', els:[
    BLEED(),
    { type:'title',  x:90, y:200, w:900, h:260, p:{ text:'Event Title', fontSize:96, weight:700, align:'left', surface:'none', color:'cream' } },
    { type:'tagline',x:90, y:490, w:780, h:80,  p:{ text:'A short line about the talk.', fontSize:22, surface:'none', color:'cream' } },
    { type:'when',   x:90, y:600, w:360, h:84,  p:{ text:'THU · 19:00', surface:'accent' } },
    { type:'host',   x:90, y:740, w:640, h:100, p:{ kicker:'With', name:'Speaker Name', align:'left', surface:'none', color:'cream', fontSize:28 } },
    BANNER(),
  ]},
  { id:'talk-block', name:'Text block', group:'Talk', theme:'day', accent:'yellow', els:[
    BLEED(),
    { type:'title', x:90, y:360, w:760, h:300, p:{ text:'Event Title', fontSize:84, weight:700, align:'left', surface:'solid' } },
    { type:'when',  x:90, y:690, w:360, h:84, p:{ text:'THU · 19:00', surface:'accent' } },
    { type:'host',  x:90, y:830, w:640, h:100, p:{ kicker:'Presented by', name:'Speaker Name', align:'left', surface:'none', color:'cream', fontSize:28 } },
    BANNER(),
  ]},
  { id:'talk-statement', name:'Statement', group:'Talk', theme:'day', accent:'red', ov:{ '1x1':{ when:{ y:700 } } }, els:[
    BLEED(),
    { type:'title', x:90, y:330, w:900, h:560, p:{ text:'BIG\nIDEA', fontSize:190, weight:800, align:'left', surface:'none', color:'cream' } },
    { type:'when',  k:'when', x:90, y:930, w:360, h:84, p:{ text:'THU · 19:00', surface:'accent' } },
    BANNER(),
  ]},
  { id:'talk-lower', name:'Lower third', group:'Talk', theme:'day', accent:'blue', ov:{ '1x1':{ host:{ y:690 } } }, els:[
    BLEED(),
    { type:'when',  x:90, y:540, w:360, h:84, p:{ text:'THU · 19:00', surface:'accent' } },
    { type:'title', x:90, y:630, w:900, h:280, p:{ text:'Event Title', fontSize:104, weight:700, align:'left', surface:'none', color:'cream' } },
    { type:'host',  k:'host', x:90, y:910, w:640, h:100, p:{ kicker:'With', name:'Speaker Name', align:'left', surface:'none', color:'cream', fontSize:28 } },
    BANNER(),
  ]},
  /* ---- SERIES · recurring talks (Day · full-bleed + bottom banner) ---- */
  { id:'series-badge', name:'Badge', group:'Series', theme:'day', accent:'green', ov:{ '1x1':{ host:{ y:700 } } }, els:[
    BLEED(),
    { type:'badge', x:760, y:230, w:230, h:230, p:{ top:'EVERY', big:'THU', sub:'weekly' } },
    { type:'title', x:90, y:520, w:900, h:300, p:{ text:'Series\nName', fontSize:108, weight:700, surface:'none', align:'left', color:'cream' } },
    { type:'host',  k:'host', x:90, y:860, w:640, h:100, p:{ kicker:'Hosted by', name:'Host Name', surface:'none', align:'left', color:'cream', fontSize:28 } },
    BANNER(),
  ]},
  { id:'series-lineup', name:'Lineup', group:'Series', theme:'day', accent:'blue', els:[
    BLEED(),
    { type:'title',  x:90, y:230, w:900, h:220, p:{ text:'Series Name', fontSize:84, weight:700, surface:'none', align:'left', color:'cream' } },
    { type:'lineup', x:90, y:500, w:620, h:420, p:{ heading:'This month', surface:'scrim', items:[{n:'Opening talk',t:'19:00'},{n:'Main session',t:'19:45'},{n:'Q & A',t:'20:45'}] } },
    BANNER(),
  ]},
  { id:'series-sessions', name:'Sessions', group:'Series', theme:'day', accent:'purple', ov:{ '1x1':{ sessions:{ h:490 } } }, els:[
    BLEED(),
    { type:'title',    x:90, y:200, w:900, h:200, p:{ text:'Series Name', fontSize:84, weight:700, surface:'none', align:'left', color:'cream' } },
    { type:'sessions', k:'sessions', x:90, y:440, w:720, h:580, p:{ heading:'Next sessions', surface:'scrim', raw:'01 — Opening Night — 5.6\n02 — Director in Focus — 12.6\n03 — Late Classic — 19.6\n04 — Closing Film — 26.6' } },
    BANNER(),
  ]},
  { id:'series-min', name:'Minimal', group:'Series', theme:'day', accent:'amber', ov:{ '1x1':{ badge:{ y:575 } } }, els:[
    BLEED(),
    { type:'title', x:90, y:360, w:900, h:300, p:{ text:'Series\nName', fontSize:120, align:'left', surface:'none', color:'cream' } },
    { type:'badge', k:'badge', x:90, y:720, w:230, h:230, p:{ top:'EVERY', big:'THU', sub:'19:00' } },
    BANNER(),
  ]},
  /* ---- NIGHTLIFE (Night · full-bleed + standard ticket) ---- */
  { id:'night-dj', name:'DJ hero', group:'Nightlife', theme:'night', accent:'pink', els:[
    BLEED(0, { contrast:1.3 }),
    { type:'title', x:90, y:520, w:920, h:360, p:{ text:'PULSE\nSESSIONS', fontSize:150, weight:700, align:'left', surface:'none', color:'cream' } },
    { type:'host',  x:90, y:900, w:560, h:120, p:{ kicker:'On the decks', name:'DJ Name', surface:'none', align:'left', color:'cream', fontSize:30 } },
    TICKET(),
  ]},
  { id:'night-lineup', name:'Lineup night', group:'Nightlife', theme:'night', accent:'blue', els:[
    BLEED(0),
    { type:'title',   x:90, y:240, w:920, h:200, p:{ text:'Club Night', fontSize:92, weight:700, surface:'none', color:'cream' } },
    { type:'lineup',  x:90, y:470, w:560, h:380, p:{ heading:'Lineup', surface:'scrim', items:[{n:'DJ One',t:'22:00'},{n:'DJ Two',t:'23:30'},{n:'b2b Finale',t:'01:00'}] } },
    { type:'specials',x:680,y:470, w:330, h:320, p:{ surface:'accent', heading:'All night', items:[{l:'House pour',p:'₫50k'},{l:'Beer + shot',p:'₫65k'},{l:'Til 1am',p:'2-for-1'}] } },
    TICKET(),
  ]},
  { id:'night-party', name:'Party slam', group:'Nightlife', theme:'night', accent:'red', els:[
    BLEED(0, { treatment:'spot', spotBase:'duotone', contrast:1.3 }),
    { type:'title', x:90, y:330, w:920, h:560, p:{ text:'BIG\nNIGHT', fontSize:190, weight:800, align:'left', surface:'none', color:'cream' } },
    { type:'when',  x:90, y:960, w:380, h:90, p:{ text:'SAT · 22:00', surface:'accent' } },
    TICKET(),
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

Object.assign(window, {
  PALETTE, ACCENTS, ACCENT_DAYS, ACCENTS_BY_DAY, DAY_ABBR, DAY_NAMES, accentDay,
  FORMATS, OUTPUT_FORMATS, MODULE, STEP, TYPE_SCALE, LAYOUT_KEYS,
  snapToScale, scaleStep,
  themeColors, contrastInk, surfaceStyle, safeRect, CATALOG, DEFAULTS, makeElement, uid, QRGlyph, parseSessions,
  resolveElements, mapElementToFormat, pointToMaster,
  TEMPLATES, TEMPLATE_GROUPS, buildTemplate
});
