/* ============================================================
   REALITY POSTER STUDIO — App
   Master layout + per-format overrides, snapping type scale.
   ============================================================ */
const { CATALOG:AP_CAT, FORMATS:AP_FMT, OUTPUT_FORMATS:AP_OUT, STANDEE_FORMATS:AP_STD, HANDOUT_FORMATS:AP_HND, PALETTE:AP_PAL, ACCENTS:AP_ACC, INK_CHOICES:AP_INKS, ACCENT_DAYS:AP_DAYS,
        ACCENTS_BY_DAY:AP_ABYDAY, DAY_ABBR:AP_DABBR, DAY_NAMES:AP_DNAMES, accentDay:apAccentDay,
        DEFAULTS:AP_DEF, LAYOUT_KEYS:AP_LK, makeElement:apMake, resolveElements:apResolve,
        pointToMaster:apToMaster, snapToScale:apSnapScale, scaleStep:apScaleStep,
        TYPE_SCALE:AP_SCALE, StudioCanvas:APCanvas,
        GRAPHICS:AP_GFX, SHAPE_KINDS:AP_SHAPES, SHAPE_LABELS:AP_SHAPELAB, MASK_KINDS:AP_MASKS,
        RULE_PATTERNS:AP_RULES, RULE_TERMS:AP_TERMS, BURST_PRESETS:AP_BURSTS,
        TEMPLATES:AP_TPL, TEMPLATE_GROUPS:AP_TPLG, buildTemplate:apBuildTpl } = window;
const LS_KEY = 'reality-studio-doc-v2';
const TPL_KEY = 'reality-studio-templates-v1';

function starterDoc(){
  return {
    /* 4:5 (1080×1350) is the primary format — IG feed + the site pipeline */
    activeFormat:'master', masterFormat:'4x5',
    theme:'night', accent:'pink', showGrid:true, snap:true, overrides:{},
    title:'', exportFormat:'png', storyBoost:true, storyScale:1.15,
    elements:[
      Object.assign(apMake('photo', 80, 96), { w:920, h:700, treatment:'duotone', frame:false }),
      apMake('when', 360, 280),
      Object.assign(apMake('title', 150, 388), { text:'Pulse\nSessions', color:'fg' }),
      Object.assign(apMake('host', 280, 720), { kicker:'On the decks', name:'DJ Milk' }),
      apMake('ticket', 80, 1014),
    ]
  };
}
function loadDoc(){ try{ const r=localStorage.getItem(LS_KEY); if(r){ const d=JSON.parse(r); if(d&&d.elements){ const doc=Object.assign({overrides:{},activeFormat:'master',masterFormat:'4x5',title:'',exportFormat:'png',storyBoost:true,storyScale:1.15}, d); if(doc.storyScale===1.3) doc.storyScale=1.15; /* old default bled off the story sides; 1.15 keeps the column in-frame */ if(doc.activeFormat!=='master' && !AP_FMT[doc.activeFormat]) doc.activeFormat='master'; /* retired view (e.g. the old FB cover) saved as active → back to Master */ return doc; } } }catch(e){} return starterDoc(); }

/* Poster name → filename slug. Vietnamese-safe: đ/Đ are mapped by hand (they
   don't decompose under NFD), the rest of the diacritics strip normally.
   "Đêm Trò Chơi" → "dem-tro-choi"; "Board Game Night" → "board-game-night". */
function slugify(s){
  return (s||'').replace(/đ/g,'d').replace(/Đ/g,'D')
    .normalize('NFD').replace(new RegExp('[\\u0300-\\u036f]','g'),'')
    .toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-+|-+$)/g,'');
}
/* Export filename stem per format. Two formats lead with the accent's weekday
   (e.g. purple → "3-wed-…") so files sort Mon→Sun and the day is legible:
     • 9:16 Story — "3-wed-pulse-sessions"        (phone-post naming)
     • 4:5 Feed   — "3-wed-pulse-sessions-4x5"    (the website carousel pipeline
                     reads this token in Poster Manager to auto-tag the day)
   Every other format keeps "<name>-<format>". */
function storyStem(fmt, base, accent){
  const di = apAccentDay(accent);
  if(fmt==='9x16'){ if(di) return di.n+'-'+di.abbr.toLowerCase()+'-'+base; }
  else if(fmt==='4x5'){ if(di) return di.n+'-'+di.abbr.toLowerCase()+'-'+base+'-'+fmt; }
  return base+'-'+fmt;
}

/* My-templates store — full poster snapshots (elements, overrides, theme),
   saved by name in localStorage, separate from the working doc. */
function loadUserTpls(){ try{ const r=localStorage.getItem(TPL_KEY); if(r){ const a=JSON.parse(r); if(Array.isArray(a)) return a; } }catch(e){} return []; }

/* ---- In-queue helpers ------------------------------------------------------
   The queue lists app-calendar events that still need a poster. Feed ISO
   strings are always +07:00 (the hub's ictIso), so date/time read straight off
   the string — no TZ math in the browser. */
function feedDate(iso){ return (iso||'').slice(0,10); }                    // YYYY-MM-DD
function feedTime(iso){ return (iso||'').slice(11,16); }                   // HH:MM
function feedDayIdx(iso){ const d=feedDate(iso); if(d.length<10) return null;   // 0=Mon..6=Sun
  const w=new Date(d+'T12:00:00Z').getUTCDay(); return isNaN(w)?null:(w+6)%7; }
function feedDayLabel(iso){ const d=feedDate(iso); if(d.length<10) return '';   // house style, day-first: 9.7
  return (+d.slice(8,10))+'.'+(+d.slice(5,7)); }
/* One queue row per SERIES for weekly events; dismiss/claim key by the series
   so next week's instance doesn't resurrect a dismissed row. */
function queueKey(ev){ return (ev && (ev.seriesId || ev.id)) || null; }
const QUEUE_DISMISS_KEY = 'reality-studio-queue-dismissed-v1';
function loadQueueDismissed(){ try{ const r=localStorage.getItem(QUEUE_DISMISS_KEY); if(r){ const o=JSON.parse(r); if(o&&typeof o==='object'&&!Array.isArray(o)) return o; } }catch(e){} return {}; }
function storeQueueDismissed(o){ try{ localStorage.setItem(QUEUE_DISMISS_KEY, JSON.stringify(o)); }catch(e){} }
/* Title size for a prefilled starter — steps down the type scale as titles get
   longer, so long event names land inside the Classic layout's box. */
function queueTitleSize(t){ const n=(t||'').length; return n<=12?120 : n<=22?100 : n<=34?82 : n<=50?68 : 56; }

/* ---------- small controls ---------- */
function Field({ label, value, onChange, area }){
  return (
    <div className="rs-row">
      {label && <div className="rs-lab">{label}</div>}
      {area
        ? <textarea className="rs-area" value={value} onChange={e=>onChange(e.target.value)} />
        : <input className="rs-input" value={value} onChange={e=>onChange(e.target.value)} />}
    </div>
  );
}
function Slider({ label, val, min, max, step, onChange, suffix }){
  return (
    <div className="rs-row">
      <div className="rs-lab">{label}<span className="val">{val}{suffix||''}</span></div>
      <input className="rs-slider" type="range" min={min} max={max} step={step||1} value={val}
        onChange={e=>onChange(parseFloat(e.target.value))} />
    </div>
  );
}
function ScaleControl({ label, val, onChange }){
  const idx = AP_SCALE.indexOf(apSnapScale(val));
  return (
    <div className="rs-row">
      <div className="rs-lab">{label}<span className="val">{val}px · snapped</span></div>
      <div className="rs-stepper">
        <button onClick={()=>onChange(apScaleStep(val,-1))} aria-label="Smaller">A−</button>
        <input className="rs-slider" type="range" min={0} max={AP_SCALE.length-1} step={1} value={idx<0?0:idx}
          onChange={e=>onChange(AP_SCALE[parseInt(e.target.value)])} />
        <button onClick={()=>onChange(apScaleStep(val,1))} aria-label="Bigger">A+</button>
      </div>
    </div>
  );
}
function Chips({ label, options, value, onChange }){
  return (
    <div className="rs-row">
      {label && <div className="rs-lab">{label}</div>}
      <div className="rs-chips">
        {options.map(o=>(
          <button key={String(o.v)} className={'rs-chip'+(value===o.v?' on':'')} onClick={()=>onChange(o.v)}>{o.l}</button>
        ))}
      </div>
    </div>
  );
}
function Swatches({ label, value, onChange, autoTitle, autoBg }){
  // Auto adapts to the surface/theme; Ink and Cream are literal and fixed, so
  // any element (esp. text over a photo) can be forced dark or light. The Auto
  // swatch is relabelled / recoloured per role (text contrast vs poster accent).
  const fixed = [
    { v:'fg',    bg: autoBg || 'linear-gradient(135deg,#0d0905 0 50%,#fffbf1 50% 100%)',
                 title: autoTitle || 'Auto — adapts to surface / theme' },
    { v:'ink',   bg:'#0d0905', title:'Ink' },
    { v:'cream', bg:'#fffbf1', title:'Cream' },
  ];
  return (
    <div className="rs-row">
      {label && <div className="rs-lab">{label}</div>}
      <div className="rs-swatches">
        {fixed.map(s=>(
          <div key={s.v} className={'rs-sw'+(value===s.v?' on':'')} title={s.title}
            style={{ background:s.bg, border:'1.5px solid #3a2f1f' }} onClick={()=>onChange(s.v)} />
        ))}
        {AP_ACC.map(a=>(
          <div key={a} className={'rs-sw'+(value===a?' on':'')} title={a} style={{ background:AP_PAL[a] }} onClick={()=>onChange(a)} />
        ))}
      </div>
    </div>
  );
}
const SURFACES = [
  {v:'solid',l:'Solid'},{v:'paper',l:'Paper'},{v:'accent',l:'Accent'},
  {v:'outline',l:'Outline'},{v:'scrim',l:'Scrim'},{v:'none',l:'None'}
];
/* Type weights. Montserrat (titles/hosts) ships the full 100–900; Space Grotesk
   (taglines/info) tops out at 700. Short labels keep the chips tidy. */
const WEIGHTS_MONT = [
  {v:100,l:'Thin'},{v:300,l:'Light'},{v:400,l:'Reg'},{v:500,l:'Med'},
  {v:600,l:'Semi'},{v:700,l:'Bold'},{v:800,l:'Heavy'},{v:900,l:'Black'}
];
const WEIGHTS_GROT = [
  {v:300,l:'Light'},{v:400,l:'Reg'},{v:500,l:'Med'},{v:600,l:'Semi'},{v:700,l:'Bold'}
];
/* ============================================================
   PER-TYPE CAPABILITIES — the single source of truth for which shared
   dials an element exposes. The Inspector renders a FIXED canonical
   order of sections (Content → Type → Subtitle → Appearance → Shadow →
   Transform → This-format) and consults this map to decide what shows,
   so parity + ordering can't drift as new features land. Bespoke content
   (text fields, item editors, the photo panel) still lives inline; this
   governs the shared controls only.
     text/font  — text element + its weight set ('mont' | 'grot')
     size·weight·tracking·align·orient·lineHeight — which type dials show
     sizePreset — host's Standard/Compact quick toggle
     subtitle   — title's stacked subtitle group
     tag        — a centred chip (no align; gains a height dial)
     rowSize    — list block with Auto/S/M/L row sizing
     surface    — the shared Surface + colour block
     kickerColor— host's separate "Hosted by" colour
     fillOwn    — element owns its fill (weekly/block) — skip shared block
     media      — photo/logo (own panel)
     shadow     — every element now has a shadow control
     height     — expose a height dial + the shared tag-height presets
     widthPreset— weekly's grid width presets
   ============================================================ */
const TYPE_CAPS = {
  title:    { text:true, font:'mont', size:true, weight:true, tracking:true, align:true, orient:true, lineHeight:{ def:0.84, min:0.7, max:1.5 }, subtitle:true, surface:true, shadow:true },
  tagline:  { text:true, font:'grot', size:true, weight:true, tracking:true, align:true, orient:true, surface:true, shadow:true },
  info:     { text:true, font:'grot', size:true, weight:true, tracking:true, align:true, lineHeight:{ def:1.4, min:1, max:2 }, surface:true, shadow:true },
  when:     { text:true, font:'mont', size:true, weight:true, tracking:true, tag:true, align:true, surface:true, shadow:true, height:true },
  cost:     { text:true, font:'mont', size:true, weight:true, tracking:true, tag:true, align:true, surface:true, shadow:true, height:true },
  stamp:    { text:true, font:'mont', size:true, weight:true, tracking:true, tag:true, align:true, surface:true, shadow:true, height:true },
  host:     { text:true, font:'mont', size:true, sizePreset:true, weight:true, tracking:true, align:true, surface:true, kickerColor:true, shadow:true },
  ticket:   { align:true, surface:true, shadow:true },
  qr:       { align:true, surface:true, shadow:true },
  lineup:   { list:true, rowSize:true, align:true, surface:true, shadow:true },
  specials: { list:true, rowSize:true, align:true, surface:true, shadow:true },
  sessions: { list:true, rowSize:true, align:true, surface:true, shadow:true },
  agenda:   { list:true, rowSize:true, align:true, surface:true, shadow:true },
  badge:    { align:true, surface:true, shadow:true },
  wordmark: { surface:true, shadow:true },
  weekly:   { fillOwn:true, shadow:true, height:true, widthPreset:true },
  matchup:  { align:true, surface:true, shadow:true },
  block:    { fillOwn:true, shadow:true },
  /* graphical family — each owns its fill (and its own bespoke panel above),
     so they skip the shared Surface block and keep the shadow control */
  shape:    { fillOwn:true, shadow:true },
  icon:     { fillOwn:true, shadow:true },
  rule:     { fillOwn:true, shadow:true },
  burst:    { fillOwn:true, shadow:true },
  photo:    { media:true, shadow:true },
  logo:     { media:true, shadow:true },
};
const ROW_SIZES = [{v:0,l:'Auto fit'},{v:16,l:'S'},{v:21,l:'M'},{v:26,l:'L'}];
/* Shared height vocabulary for chip/tag-shaped elements (when · stamp · weekly)
   so a Weekly tag and a When chip can be dialled to the SAME height and sit in a
   row at uniform height — no more delicate per-element resizing. */
const TAG_HEIGHTS = [{v:84,l:'S'},{v:120,l:'M'},{v:162,l:'L'},{v:220,l:'XL'}];

/* One shadow control for every element. Defaults + slider ranges come from the
   shared window.shadowModel, so what you see matches what renders, and a brand
   new element's shadow Just Works. Applies as a text-shadow on bare text, a
   box-shadow on a surfaced card, or a drop-shadow on artwork (photo/logo/block/
   weekly) — the model picks the mode. */
function ShadowControls({ el, update, theme }){
  const m = window.shadowModel(el, theme);
  return (
    <React.Fragment>
      <div className="rs-sech">Shadow</div>
      <Chips options={[{v:true,l:'On'},{v:false,l:'Off'}]} value={m.on} onChange={v=>update({shadowOn:v})} />
      {m.on && <React.Fragment>
        <Slider label="Distance" val={m.dist} min={0} max={m.maxDist} step={1} onChange={v=>update({shadowDist:v})} suffix="px" />
        <Slider label="Direction" val={m.ang} min={-180} max={180} step={5} onChange={v=>update({shadowAngle:v})} suffix="°" />
        <Slider label="Blur" val={m.blur} min={0} max={m.maxBlur} step={1} onChange={v=>update({shadowBlur:v})} suffix="px" />
        <Slider label="Opacity" val={m.alpha} min={0.05} max={1} step={0.01} onChange={v=>update({shadowAlpha:v})} />
        <Swatches label="Shadow colour" value={m.ck} autoTitle="Auto — soft press shadow"
          onChange={v=>update(v==='fg'?{shadowColor:'fg',shadowAlpha:null}:{shadowColor:v,shadowAlpha:el.shadowAlpha!=null?el.shadowAlpha:0.9})} />
        <div className="rs-mini" style={{ marginTop:-2 }}>
          {m.mode==='text'
            ? <span>Falls on the letters (bare text) — add a surface for a card shadow instead.</span>
            : <span>Try a hard accent shadow — distance up, blur 0, full opacity. Very riso.</span>}
        </div>
      </React.Fragment>}
    </React.Fragment>
  );
}
/* Reality-ticket formats — picked from the details panel (not separate
   sidebar items). Each sets the size + what's shown; content is preserved. */
const TICKET_FORMATS = {
  banner:   { variant:'banner',   x:0, w:1080, h:270, surface:'paper', showQR:false },
  standard: { variant:'standard',      w:920,  h:200, surface:'paper', showQR:true  },
  slim:     { variant:'slim',          w:680,  h:120, surface:'paper', showQR:false },
  mini:     { variant:'mini',          w:480,  h:92,  surface:'paper', showQR:false },
};

/* ---------- photo helpers ---------- */
/* Read an image File/Blob, downscale to ≤860px on the long edge, and hand back
   a data URL. PNGs keep their alpha (re-encoded as PNG, for partner logos);
   everything else is JPEG. Shared by the upload button and clipboard paste. */
function processImageFile(file, onReady){
  if(!file) return;
  const png = file.type==='image/png';
  const fr=new FileReader(); fr.onload=()=>{ const im=new Image(); im.onload=()=>{
    const max=860, sc=Math.min(1,max/Math.max(im.width,im.height));
    const c=document.createElement('canvas'); c.width=Math.round(im.width*sc); c.height=Math.round(im.height*sc);
    c.getContext('2d').drawImage(im,0,0,c.width,c.height);
    onReady(png ? c.toDataURL('image/png') : c.toDataURL('image/jpeg',0.82));
  }; im.src=fr.result; }; fr.readAsDataURL(file);
}
/* Pull the first image out of a paste payload (DataTransfer), or null. */
function imageFromClipboard(cd){
  if(!cd) return null;
  const items=cd.items;
  if(items){ for(let i=0;i<items.length;i++){ const it=items[i];
    if(it.kind==='file' && it.type && it.type.indexOf('image/')===0) return it.getAsFile(); } }
  const files=cd.files;
  if(files){ for(let i=0;i<files.length;i++){ if(files[i].type && files[i].type.indexOf('image/')===0) return files[i]; } }
  return null;
}
function PhotoUpload({ onPick, label }){
  const inp = React.useRef(null);
  function handle(e){ const f=e.target.files[0]; if(!f) return; processImageFile(f, onPick); e.target.value=''; }
  return (<React.Fragment>
    <button className="rs-addrow" onClick={()=>inp.current.click()}>{label||'⬆ Upload / replace photo…'}</button>
    <input ref={inp} type="file" accept="image/*" style={{display:'none'}} onChange={handle} />
  </React.Fragment>);
}
const TREATS = [
  {v:'duotone',l:'Duotone'},{v:'offregister',l:'Off-Reg'},{v:'halftone',l:'Halftone'},
  {v:'posterize',l:'Banded'},{v:'cutout',l:'Cutout'},{v:'overprint',l:'Overprint'},
  {v:'spot',l:'Spot'},{v:'dither',l:'Dither'},{v:'hatch',l:'Hatch'},{v:'photocopy',l:'Copier'},
  {v:'contour',l:'Contour'},{v:'edges',l:'Outline'},{v:'mosaic',l:'Mosaic'},{v:'none',l:'None'}
];
/* recommended defaults applied when a treatment is chosen — each looks good out of the box */
const TREAT_PRESETS = {
  duotone:    { contrast:1.18, balance:0.5,  shadowTint:0.18, invert:false, midInk:null, hiTint:0 },
  offregister:{ contrast:1.25, offset:13,    angle:47,        spread:1.25, ink3:null, ghost:0 },
  halftone:   { contrast:1.2,  dot:9,        angle:15,        shape:'circle', inkMode:'single', gradMode:'tone', gradAngle:90, gradA:null, gradB:null, screenOffset:30, field:'paper', fieldInk:null, fieldStrength:0.12, dotGain:1, jitter:0, invert:false },
  posterize:  { contrast:1.25, bands:4, bandJitter:0, toneSmooth:0 },
  cutout:     { contrast:1.3,  threshold:0.52, softness:0.12, invert:false, cutEdge:0, cutSlip:0, toneSmooth:0 },
  overprint:  { contrast:1.2,  offset:8,     angle:45,        split:0.16, ink3:null, fieldTexture:0, toneSmooth:0 },
  spot:       { contrast:1.2,  spotLo:0.35,  spotHi:0.65,     spotSoft:0.08, spotInvert:false, spotBase:'duotone', balance:0.5, shadowTint:0.18, spotMode:'tone', spot2:false, toneSmooth:0 },
  dither:     { contrast:1.25, ditherMode:'bayer', ditherScale:3, ditherAngle:0, invert:false, inkMode:'single', gradMode:'tone', gradA:null, gradB:null, gradAngle:90, field:'paper', fieldInk:null, fieldStrength:0.12 },
  hatch:      { contrast:1.25, hatchSpacing:9, angle:-22, hatchWeight:1, hatchCross:false, hatchWobble:0.15, inkMode:'single', toneSmooth:0, gradMode:'tone', gradA:null, gradB:null, gradAngle:90, field:'paper', fieldInk:null, fieldStrength:0.12 },
  photocopy:  { contrast:1.15, toner:0.55, copyNoise:0.35, streaks:0.25, generations:2, inkMode:'black', field:'paper', fieldInk:null, fieldStrength:0.18 },
  contour:    { contrast:1.2,  bands:5, contourWeight:2, contourFill:'tint', contourSmooth:2.2, contourTint:0.19, contourLine:'auto', contourInk:null, contourSlip:0, contourSlipAngle:45, contourEcho:0, contourEchoAngle:45, contourEchoInk:null },
  edges:      { contrast:1.2,  edgeDetail:0.3, edgeThick:2, edgeBackdrop:'paper', inkMode:'single', edgeSmooth:1.6, edgeClean:0, edgeInk:null, edgeWash:null, fieldInk:null, edgeEcho:0, edgeEchoAngle:45, edgeEchoInk:null, edgeSlip:0, edgeSlipAngle:45 },
  mosaic:     { contrast:1.2,  cellSize:16, mosaicDepth:4, mosaicGap:0.08, mosaicShape:'square', mosaicBond:'grid', mosaicJitter:0, mosaicGrout:'paper' },
  none:       { contrast:1.1,  brightness:0 }
};
/* ---------- collapsible sidebar section (open state remembered per session) ---------- */
const _foldOpen = {};
function Fold({ id, title, open, badge, children }){
  const [isOpen,setOpen] = React.useState(_foldOpen[id]!=null ? _foldOpen[id] : !!open);
  const toggle=()=>{ _foldOpen[id]=!isOpen; setOpen(!isOpen); };
  return (
    <div className={'rs-fold'+(isOpen?' open':'')}>
      <button type="button" className="rs-foldhead" onClick={toggle}>
        <span className="chev">{isOpen?'▾':'▸'}</span><span className="t">{title}</span>
        {(badge!=null && badge!=='') ? <span className="badge">{badge}</span> : null}
      </button>
      {isOpen && <div className="rs-foldbody">{children}</div>}
    </div>
  );
}
/* ============================================================
   GRAPHICS PICKER — one grid component with two jobs:
     library   → each tile DRAG-spawns a new element (pass onSpawn)
     inspector → each tile CLICKS to swap the selected element's kind
                 (pass onPick), so a circle becomes a hexagon in place.
   Previews are drawn from the SAME geometry functions the canvas
   renders with, so what you pick is literally what you get.
   ============================================================ */
function GfxPreview({ type, kind, preset }){
  const S = 38;
  if(type==='shape'){
    /* 'none' only appears in the photo-mask grid — draw it as an empty frame
       rather than letting shapePath fall through to a filled rectangle. */
    if(kind==='none') return <svg viewBox={`0 0 ${S} ${S}`} width="100%" height="100%" style={{ display:'block' }}>
      <rect x="2" y="2" width={S-4} height={S-4} fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="4 3" opacity=".55" />
    </svg>;
    const d = window.shapePath(kind, S, S);
    return <svg viewBox={`0 0 ${S} ${S}`} width="100%" height="100%" style={{ display:'block', overflow:'visible' }}>
      {d ? <path d={d} fill="currentColor" /> : <circle cx={S/2} cy={S/2} r={S/2} fill="currentColor" />}
    </svg>;
  }
  if(type==='rule'){
    const W=46, H=18;
    const lay = window.ruleLayout({ w:W, h:H, pattern:kind, weight:2.2, amp:4, tickLen:4, term:'none' });
    return <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" style={{ display:'block' }}>
      {lay.strokes.map((s,i)=><polyline key={'s'+i} points={s.pts.map(p=>p[0]+','+p[1]).join(' ')} fill="none"
        stroke="currentColor" strokeWidth={lay.w} strokeLinecap={lay.cap} />)}
      {lay.dots.map((d,i)=><circle key={'o'+i} cx={d.x} cy={d.y} r={d.r} fill="currentColor" />)}
    </svg>;
  }
  if(type==='burst'){
    const p = preset||{ rays:16, hub:0 };
    const b = window.burstRays(S, S, p.rays, 0);
    return <svg viewBox={`0 0 ${S} ${S}`} width="100%" height="100%" style={{ display:'block' }}>
      {b.wedges.map((w,i)=><path key={i} d={`M${w.cx} ${w.cy} L${w.p0[0]} ${w.p0[1]} L${w.p1[0]} ${w.p1[1]} Z`} fill="currentColor" />)}
      {p.hub>0 && <circle cx={b.cx} cy={b.cy} r={b.R*p.hub} fill="#15110b" />}
    </svg>;
  }
  if(type==='icon'){
    const lay = window.iconLayout({ kind, w:S, h:S, strokeScale:1, solid:false });
    if(!lay) return null;
    const st = { fill:'none', stroke:'currentColor', strokeWidth:lay.sw, strokeLinecap:'round', strokeLinejoin:'round' };
    return <svg viewBox={`0 0 ${S} ${S}`} width="100%" height="100%" style={{ display:'block' }}>
      {lay.prims.map((p,i)=>{
        if(p.t==='rect')    return <rect key={i} x={p.x} y={p.y} width={p.w} height={p.h} {...st} />;
        if(p.t==='line')    return <line key={i} x1={p.x1} y1={p.y1} x2={p.x2} y2={p.y2} {...st} />;
        if(p.t==='ellipse') return <ellipse key={i} cx={p.cx} cy={p.cy} rx={p.rx} ry={p.ry} {...st} />;
        if(p.t==='poly')    return <polygon key={i} points={p.pts.map(q=>q[0]+','+q[1]).join(' ')} {...st} />;
        if(p.t==='path')    return <path key={i} d={p.d} {...st} />;
        return null;
      })}
    </svg>;
  }
  return null;
}
function GfxGrid({ type, items, prop, value, onPick, onSpawn, wide }){
  return (
    <div className={'rs-gfxgrid'+(wide?' wide':'')}>
      {items.map(it=>{
        const spawn = onSpawn ? (e)=>onSpawn(e, { type, label:it.l,
          preset: Object.assign({}, it.preset||null, prop?{ [prop]:it.k }:null) }) : undefined;
        return (
          <button key={it.k} type="button" title={it.l}
            className={'rs-gfxtile'+(value===it.k?' on':'')}
            onClick={onPick?()=>onPick(it.k):undefined}
            onPointerDown={spawn}>
            <span className="gp"><GfxPreview type={type} kind={it.k} preset={it.preset} /></span>
            <span className="gl">{it.l}</span>
          </button>
        );
      })}
    </div>
  );
}
/* Icon browser — 70-odd glyphs is too many for one flat grid, so it's a live
   filter over the design system's own categories (plus the core UI set, which
   ICON_CATEGORIES doesn't cover). Search matches key or label. */
function IconPicker({ value, onPick, onSpawn }){
  const [q,setQ] = React.useState('');
  const groups = React.useMemo(()=>{
    const cats = (window.ICON_CATEGORIES||[]).map(c=>({ group:c.group, items:c.items }));
    const core = (window.ICON_CORE||[]);
    return core.length ? [{ group:'Core · interface', items:core }].concat(cats) : cats;
  }, []);
  const lab = k => (window.ICON_LABELS||{})[k] || k.replace(/_/g,' ');
  const needle = q.trim().toLowerCase();
  const hit = k => !needle || k.toLowerCase().indexOf(needle)>=0 || lab(k).toLowerCase().indexOf(needle)>=0;
  const shown = groups.map(g=>({ group:g.group, items:g.items.filter(hit) })).filter(g=>g.items.length);
  const total = shown.reduce((n,g)=>n+g.items.length,0);
  return (
    <React.Fragment>
      <input className="rs-input rs-gfxsearch" type="search" value={q} placeholder="Search icons…"
        onChange={e=>setQ(e.target.value)} />
      {shown.map(g=>(
        <React.Fragment key={g.group}>
          <div className="rs-mini" style={{ margin:'8px 0 4px', opacity:.7 }}>{g.group}</div>
          <GfxGrid type="icon" prop="kind" value={value} onPick={onPick} onSpawn={onSpawn} wide
            items={g.items.map(k=>({ k, l:lab(k) }))} />
        </React.Fragment>
      ))}
      {!total && <div className="rs-mini" style={{ margin:'8px 0' }}>Nothing matches “{q}”.</div>}
    </React.Fragment>
  );
}

/* tooltip label for an ink key — the neutrals get their brand names */
const inkTitle = a => a==='ink' ? 'Ink' : a==='cream' ? 'Cream' : a;
/* an ink swatch row with a leading Auto/Off slot (null) */
function InkRow({ label, value, onChange, autoTitle }){
  return (
    <React.Fragment>
      <div className="rs-lab">{label} <span className="val">{value||'auto'}</span></div>
      <div className="rs-swatches">
        <div className={'rs-sw'+(value==null?' on':'')} title={autoTitle||'Auto'} style={{ border:'1.5px solid #3a2f1f' }} onClick={()=>onChange(null)} />
        {AP_INKS.map(a=>(
          <div key={a} className={'rs-sw'+(value===a?' on':'')} title={inkTitle(a)} style={{ background:AP_PAL[a] }} onClick={()=>onChange(a)} />
        ))}
      </div>
    </React.Fragment>
  );
}
/* one blur group — drives the under-press (soft focus) or over-press (finish)
   stage via its prop prefix ('blurUnder' | 'blurOver'). Six characters:
   gaussian soft, motion streak, zoom rush, spin sweep, lens defocus, and a
   tilt-shift focus band. */
const BLUR_TYPES = [
  {v:'gauss',l:'Soft'},{v:'motion',l:'Motion'},{v:'zoom',l:'Zoom'},
  {v:'spin',l:'Spin'},{v:'lens',l:'Lens'},{v:'tilt',l:'Band'}
];
function BlurControls({ el, update, prefix, label, max }){
  const P = k => prefix+k;
  const amt = el[prefix]!=null?el[prefix]:0;
  const type = el[P('Type')]||'gauss';
  const spin = type==='spin';
  const set = (k,v)=>{ const u={}; u[k]=v; update(u); };
  return (
    <React.Fragment>
      <Chips label={label} options={BLUR_TYPES} value={type}
        onChange={v=>{ const u={}; u[P('Type')]=v; if(v==='tilt') u[P('Angle')]=90; else if(v==='motion') u[P('Angle')]=0; update(u); }} />
      <Slider label={spin?'Sweep':'Amount'} val={amt} min={0} max={spin?40:(max||30)} step={0.5} onChange={v=>set(prefix,v)} suffix={spin?'°':'px'} />
      {amt>0 && type==='motion' &&
        <Slider label="Direction" val={el[P('Angle')]!=null?el[P('Angle')]:0} min={-180} max={180} step={5} onChange={v=>set(P('Angle'),v)} suffix="°" />}
      {amt>0 && (type==='zoom'||type==='spin') && <React.Fragment>
        <Slider label="Centre X" val={el[P('X')]!=null?el[P('X')]:0} min={-0.5} max={0.5} step={0.01} onChange={v=>set(P('X'),v)} />
        <Slider label="Centre Y" val={el[P('Y')]!=null?el[P('Y')]:0} min={-0.5} max={0.5} step={0.01} onChange={v=>set(P('Y'),v)} />
      </React.Fragment>}
      {amt>0 && type==='tilt' && <React.Fragment>
        <Slider label="Band angle" val={el[P('Angle')]!=null?el[P('Angle')]:90} min={0} max={180} step={5} onChange={v=>set(P('Angle'),v)} suffix="°" />
        <Slider label="Band position" val={el[P('Pos')]!=null?el[P('Pos')]:0.5} min={0} max={1} step={0.01} onChange={v=>set(P('Pos'),v)} />
        <Slider label="Band width" val={el[P('Width')]!=null?el[P('Width')]:0.3} min={0.05} max={0.9} step={0.01} onChange={v=>set(P('Width'),v)} />
      </React.Fragment>}
    </React.Fragment>
  );
}
function PhotoControls({ el, update, theme }){
  const t = el.treatment;
  const tDef = TREATS.find(x=>x.v===t);
  const pressLabel = tDef? tDef.l : t;
  const finishCount = [el.blurOver>0, el.grain>0, el.vignette>0, el.paperTex>0, el.inkBleed>0, el.dust>0, el.misprint>0,
                       !!el.finBright, el.finContrast!=null&&el.finContrast!==1, el.finSat!=null&&el.finSat!==1].filter(Boolean).length;
  const nBands = Math.max(2, (el.bands|0)||4);
  const setBandInk = (i,v)=>{ const arr=[]; for(let b=0;b<nBands;b++) arr.push((el.bandInks&&el.bandInks[b])||null); arr[i]=v; update({ bandInks:arr }); };
  /* mosaic shares bandInks with posterize (same dark→light order), sized by its depth */
  const nMosaic = Math.max(2, Math.min(6, (el.mosaicDepth|0)||4));
  const setMosaicInk = (i,v)=>{ const arr=[]; for(let b=0;b<nMosaic;b++) arr.push((el.bandInks&&el.bandInks[b])||null); arr[i]=v; update({ bandInks:arr }); };
  return (
    <React.Fragment>
      <Fold id="ph-img" title="Image" open>
        <PhotoUpload onPick={src=>update({ src })} />
        <div className="rs-mini" style={{ margin:'2px 0 8px' }}>…or copy an image anywhere and paste it here with <b>Ctrl-V</b> / <b>⌘V</b>.</div>
        {el.type==='logo'
          ? <React.Fragment>
              <Chips label="Background" options={[{v:true,l:'Transparent'},{v:false,l:'Paper'}]} value={el.transparent!==false} onChange={v=>update({ transparent:v })} />
              {el.transparent===false && <Swatches label="Paper fill" value={el.paperFill!=null?el.paperFill:'fg'} onChange={v=>update({paperFill:v})} autoTitle="Auto — paper" autoBg={theme==='night'?'#0a0703':'#fffbf1'} />}
              <div className="rs-mini" style={{ margin:'-2px 0 8px' }}>PNG transparency is kept and the whole mark is shown (contain-fit). Pick a treatment below only if you want to riso it.</div>
            </React.Fragment>
          : <Chips label="Or a sample" options={[{v:'spotlight',l:'DJ'},{v:'crowd',l:'Crowd'},{v:'portrait',l:'Portrait'}]}
              value={el.src?null:el.sample} onChange={v=>update({ sample:v, src:null })} />}
      </Fold>

      <Fold id="ph-mix" title="Second exposure" badge={el.src2?'on':null}>
        {!el.src2 && <div className="rs-mini" style={{ margin:'2px 0 8px' }}>Blend a second image into the source — the press treats the two as one photo.</div>}
        <PhotoUpload label={el.src2?'⬆ Replace second image…':'⬆ Add a second image…'} onPick={src2=>update({ src2 })} />
        {el.src2 && <React.Fragment>
          <Slider label="Mix" val={el.mix2!=null?el.mix2:0.6} min={0} max={1} step={0.02} onChange={v=>update({mix2:v})} />
          <Chips label="Blend" options={[{v:'screen',l:'Screen'},{v:'multiply',l:'Multiply'},{v:'lighten',l:'Lighten'},{v:'overlay',l:'Overlay'}]} value={el.mix2Mode||'screen'} onChange={v=>update({mix2Mode:v})} />
          <Slider label="Zoom" val={el.img2Scale!=null?el.img2Scale:1} min={0.5} max={3} step={0.02} onChange={v=>update({img2Scale:v})} suffix="×" />
          <Slider label="Pan X" val={el.img2X!=null?el.img2X:0} min={-0.5} max={0.5} step={0.01} onChange={v=>update({img2X:v})} />
          <Slider label="Pan Y" val={el.img2Y!=null?el.img2Y:0} min={-0.5} max={0.5} step={0.01} onChange={v=>update({img2Y:v})} />
          <Slider label="Rotate" val={el.img2Rot!=null?el.img2Rot:0} min={-180} max={180} step={1} onChange={v=>update({img2Rot:v})} suffix="°" />
          <button className="rs-addrow" onClick={()=>update({ src2:null })}>✕ Remove second image</button>
        </React.Fragment>}
      </Fold>

      <Fold id="ph-treat" title={'Treatment · '+pressLabel} open>
        <Chips options={TREATS} value={el.treatment} onChange={v=>update(Object.assign({ treatment:v }, TREAT_PRESETS[v]||{}))} />

        {t!=='none' && <React.Fragment>
          <div className="rs-sech">Main ink</div>
          <Chips options={[{v:true,l:'Follow poster accent'},{v:false,l:'Custom'}]} value={el.followAccent} onChange={v=>update({ followAccent:v })} />
          {!el.followAccent &&
            <div className="rs-swatches">
              {AP_INKS.map(a=>(
                <div key={a} className={'rs-sw'+(el.ink===a?' on':'')} title={inkTitle(a)} style={{ background:AP_PAL[a] }} onClick={()=>update({ ink:a })} />
              ))}
            </div>}
        </React.Fragment>}
        {(t==='offregister'||t==='overprint') && <React.Fragment>
          <div className="rs-lab">Accent ink <span className="val">{el.ink2||'auto'}</span></div>
          <div className="rs-swatches">
            <div className={'rs-sw ink'+(el.ink2==null?' on':'')} title="Auto — warm/cool partner" style={{ border:'1.5px solid #3a2f1f' }} onClick={()=>update({ ink2:null })} />
            {AP_INKS.map(a=>(
              <div key={a} className={'rs-sw'+(el.ink2===a?' on':'')} title={inkTitle(a)} style={{ background:AP_PAL[a] }} onClick={()=>update({ ink2:a })} />
            ))}
          </div>
        </React.Fragment>}

        {t!=='none' && <React.Fragment>
          <div className="rs-sech">Blend with photo</div>
          <Chips label="Where" options={[{v:'all',l:'Everywhere'},{v:'shadows',l:'Shadows'},{v:'highlights',l:'Lights'}]} value={el.treatWhere||'all'} onChange={v=>update({treatWhere:v})} />
          <Slider label="Strength" val={el.treatStrength!=null?el.treatStrength:1} min={0.1} max={1} step={0.02} onChange={v=>update({treatStrength:v})} />
          <div className="rs-mini" style={{ margin:'-2px 0 8px' }}>Below full strength the press prints over the <b>real photo</b>. Shadows / Lights feather the print into one tonal end — the photo shows through everywhere else.</div>
        </React.Fragment>}

        {t!=='none' && <div className="rs-sech">{'Press · '+pressLabel}</div>}
        {t==='duotone' && <React.Fragment>
          <Slider label="Tone balance" val={el.balance} min={0.1} max={0.9} step={0.01} onChange={v=>update({balance:v})} />
          <Slider label="Shadow tint" val={el.shadowTint} min={0} max={0.6} step={0.02} onChange={v=>update({shadowTint:v})} />
          <Chips label="Invert" options={[{v:false,l:'Normal'},{v:true,l:'Inverted'}]} value={el.invert} onChange={v=>update({invert:v})} />
          <InkRow label="Mid ink" value={el.midInk} onChange={v=>update({midInk:v})} autoTitle="Off — two-ink ramp" />
          <Slider label="Highlight tint" val={el.hiTint!=null?el.hiTint:0} min={0} max={0.6} step={0.02} onChange={v=>update({hiTint:v})} />
          {el.hiTint>0 && <InkRow label="Highlight ink" value={el.hiInk} onChange={v=>update({hiInk:v})} autoTitle="Auto — warm/cool partner" />}
          <div className="rs-mini" style={{ margin:'-2px 0 8px' }}>A <b>mid ink</b> makes it a tritone; <b>highlight tint</b> split-tones the light end.</div>
        </React.Fragment>}
        {t==='offregister' && <React.Fragment>
          <Slider label="Offset" val={el.offset} min={0} max={40} step={1} onChange={v=>update({offset:v})} suffix="px" />
          <Slider label="Angle" val={el.angle} min={0} max={360} step={1} onChange={v=>update({angle:v})} suffix="°" />
          <Slider label="Ink spread" val={el.spread} min={0.8} max={1.8} step={0.02} onChange={v=>update({spread:v})} />
          <InkRow label="Third ink" value={el.ink3} onChange={v=>update({ink3:v})} autoTitle="Off — two passes" />
          <Slider label="Ghost hit" val={el.ghost!=null?el.ghost:0} min={0} max={1} step={0.02} onChange={v=>update({ghost:v})} />
          <div className="rs-mini" style={{ margin:'-2px 0 8px' }}>Ghost prints a faint second impression of the main ink — the classic riso double-feed.</div>
        </React.Fragment>}
        {t==='halftone' && <React.Fragment>
          <Chips label="Inking" options={[{v:'single',l:'Ink'},{v:'black',l:'Mono'},{v:'gradient',l:'Gradient'},{v:'two',l:'Two-ink'}]} value={el.inkMode||'single'} onChange={v=>update({inkMode:v})} />
          {(el.inkMode||'single')==='gradient' && <React.Fragment>
            <Chips label="Ramp" options={[{v:'tone',l:'By tone'},{v:'frame',l:'Across frame'}]} value={el.gradMode||'tone'} onChange={v=>update({gradMode:v})} />
            <div className="rs-lab">From <span className="val">{el.gradA||el.ink||'accent'}</span></div>
            <div className="rs-swatches">
              <div className={'rs-sw'+(el.gradA==null?' on':'')} title="Main ink" style={{ border:'1.5px solid #3a2f1f' }} onClick={()=>update({ gradA:null })} />
              {AP_INKS.map(a=>(<div key={a} className={'rs-sw'+(el.gradA===a?' on':'')} title={inkTitle(a)} style={{ background:AP_PAL[a] }} onClick={()=>update({ gradA:a })} />))}
            </div>
            <div className="rs-lab">To <span className="val">{el.gradB||'partner'}</span></div>
            <div className="rs-swatches">
              <div className={'rs-sw'+(el.gradB==null?' on':'')} title="Auto — warm/cool partner" style={{ border:'1.5px solid #3a2f1f' }} onClick={()=>update({ gradB:null })} />
              {AP_INKS.map(a=>(<div key={a} className={'rs-sw'+(el.gradB===a?' on':'')} title={inkTitle(a)} style={{ background:AP_PAL[a] }} onClick={()=>update({ gradB:a })} />))}
            </div>
            {el.gradMode==='frame' && <Slider label="Ramp angle" val={el.gradAngle!=null?el.gradAngle:90} min={0} max={360} step={1} onChange={v=>update({gradAngle:v})} suffix="°" />}
          </React.Fragment>}
          {(el.inkMode||'single')==='two' && <React.Fragment>
            <div className="rs-lab">Second ink <span className="val">{el.ink2||'auto'}</span></div>
            <div className="rs-swatches">
              <div className={'rs-sw ink'+(el.ink2==null?' on':'')} title="Auto — warm/cool partner" style={{ border:'1.5px solid #3a2f1f' }} onClick={()=>update({ ink2:null })} />
              {AP_INKS.map(a=>(<div key={a} className={'rs-sw'+(el.ink2===a?' on':'')} title={inkTitle(a)} style={{ background:AP_PAL[a] }} onClick={()=>update({ ink2:a })} />))}
            </div>
            <Slider label="Screen offset" val={el.screenOffset!=null?el.screenOffset:30} min={0} max={90} step={1} onChange={v=>update({screenOffset:v})} suffix="°" />
          </React.Fragment>}
          <Slider label="Dot size" val={el.dot} min={4} max={22} step={1} onChange={v=>update({dot:v})} suffix="px" />
          <Slider label="Screen angle" val={el.angle} min={-90} max={90} step={1} onChange={v=>update({angle:v})} suffix="°" />
          <Chips label="Dot shape" options={[{v:'circle',l:'Dot'},{v:'square',l:'Square'},{v:'diamond',l:'Diamond'},{v:'ring',l:'Ring'},{v:'line',l:'Line'},{v:'cross',l:'Cross'},{v:'hex',l:'Hex'},{v:'star',l:'Star'},{v:'glyph',l:'Letter'}]} value={el.shape} onChange={v=>update({shape:v})} />
          {el.shape==='diamond' && <Slider label="Pucker" val={el.pucker!=null?el.pucker:0.35} min={0} max={1} step={0.02} onChange={v=>update({pucker:v})} />}
          {el.shape==='glyph' && <Field label="Letter (1–2 characters)" value={el.glyphChar!=null?el.glyphChar:'R'} onChange={v=>update({glyphChar:v})} />}
          <Slider label="Dot gain" val={el.dotGain!=null?el.dotGain:1} min={0.6} max={1.6} step={0.02} onChange={v=>update({dotGain:v})} />
          <Slider label="Hand-set jitter" val={el.jitter!=null?el.jitter:0} min={0} max={1} step={0.02} onChange={v=>update({jitter:v})} />
          <Chips label="Print" options={[{v:false,l:'Shadows'},{v:true,l:'Highlights'}]} value={!!el.invert} onChange={v=>update({invert:v})} />
          <div className="rs-sech">Halftone field</div>
          <Chips label="Background" options={[{v:'paper',l:'Paper'},{v:'tint',l:'Ink tint'},{v:'ink',l:'Solid ink'}]} value={el.field||'paper'} onChange={v=>update({field:v})} />
          {el.field && el.field!=='paper' && <React.Fragment>
            <div className="rs-lab">Field ink <span className="val">{el.fieldInk||'main'}</span></div>
            <div className="rs-swatches">
              <div className={'rs-sw'+(el.fieldInk==null?' on':'')} title="Main ink" style={{ border:'1.5px solid #3a2f1f' }} onClick={()=>update({ fieldInk:null })} />
              {AP_INKS.map(a=>(<div key={a} className={'rs-sw'+(el.fieldInk===a?' on':'')} title={inkTitle(a)} style={{ background:AP_PAL[a] }} onClick={()=>update({ fieldInk:a })} />))}
            </div>
            {el.field==='tint' && <Slider label="Tint strength" val={el.fieldStrength!=null?el.fieldStrength:0.12} min={0.04} max={0.5} step={0.01} onChange={v=>update({fieldStrength:v})} />}
          </React.Fragment>}
        </React.Fragment>}
        {t==='posterize' && <React.Fragment>
          <Slider label="Bands" val={el.bands} min={2} max={6} step={1} onChange={v=>update({bands:v})} />
          <Slider label="Smoothing" val={el.toneSmooth!=null?el.toneSmooth:0} min={0} max={10} step={0.2} onChange={v=>update({toneSmooth:v})} />
          <Slider label="Torn edges" val={el.bandJitter!=null?el.bandJitter:0} min={0} max={1} step={0.02} onChange={v=>update({bandJitter:v})} />
          <Chips label="Band colours" options={[{v:false,l:'Auto ramp'},{v:true,l:'Custom'}]} value={!!el.bandInks}
            onChange={v=>{ if(!v){ update({ bandInks:null }); } else { const arr=[]; for(let b=0;b<nBands;b++) arr.push(null); update({ bandInks:arr }); } }} />
          {el.bandInks && Array.from({length:nBands}).map((_,i)=>(
            <InkRow key={i} label={'Band '+(i+1)+(i===0?' · dark':i===nBands-1?' · light':'')} value={el.bandInks[i]||null} onChange={v=>setBandInk(i,v)} autoTitle="Auto — ramp colour" />
          ))}
        </React.Fragment>}
        {t==='cutout' && <React.Fragment>
          <Slider label="Threshold" val={el.threshold} min={0.15} max={0.85} step={0.01} onChange={v=>update({threshold:v})} />
          <Slider label="Edge softness" val={el.softness} min={0.01} max={0.4} step={0.01} onChange={v=>update({softness:v})} />
          <Slider label="Smoothing" val={el.toneSmooth!=null?el.toneSmooth:0} min={0} max={10} step={0.2} onChange={v=>update({toneSmooth:v})} />
          <Chips label="Invert" options={[{v:false,l:'Subject'},{v:true,l:'Background'}]} value={el.invert} onChange={v=>update({invert:v})} />
          <Slider label="Outline" val={el.cutEdge!=null?el.cutEdge:0} min={0} max={0.2} step={0.005} onChange={v=>update({cutEdge:v})} />
          {el.cutEdge>0 && <React.Fragment>
            <InkRow label="Outline ink" value={el.cutEdgeInk} onChange={v=>update({cutEdgeInk:v})} autoTitle="Auto — warm/cool partner" />
            <Slider label="Outline slip" val={el.cutSlip!=null?el.cutSlip:0} min={0} max={20} step={0.5} onChange={v=>update({cutSlip:v})} suffix="px" />
            {el.cutSlip>0 && <Slider label="Slip angle" val={el.cutSlipAngle!=null?el.cutSlipAngle:45} min={0} max={360} step={5} onChange={v=>update({cutSlipAngle:v})} suffix="°" />}
          </React.Fragment>}
        </React.Fragment>}
        {t==='overprint' && <React.Fragment>
          <Slider label="Offset" val={el.offset} min={0} max={30} step={1} onChange={v=>update({offset:v})} suffix="px" />
          <Slider label="Angle" val={el.angle} min={0} max={360} step={1} onChange={v=>update({angle:v})} suffix="°" />
          <Slider label="Field split" val={el.split} min={0.04} max={0.4} step={0.01} onChange={v=>update({split:v})} />
          <Slider label="Smoothing" val={el.toneSmooth!=null?el.toneSmooth:0} min={0} max={10} step={0.2} onChange={v=>update({toneSmooth:v})} />
          <InkRow label="Third ink" value={el.ink3} onChange={v=>update({ink3:v})} autoTitle="Off — two fields" />
          <Slider label="Ink texture" val={el.fieldTexture!=null?el.fieldTexture:0} min={0} max={1} step={0.02} onChange={v=>update({fieldTexture:v})} />
        </React.Fragment>}
        {t==='spot' && <React.Fragment>
          <Chips label="Select by" options={[{v:'tone',l:'Tone'},{v:'hue',l:'Colour'}]} value={el.spotMode||'tone'} onChange={v=>update({spotMode:v})} />
          <Chips label="Backdrop" options={[{v:'duotone',l:'Duotone'},{v:'image',l:'Raw image'}]} value={el.spotBase||'duotone'} onChange={v=>update({spotBase:v})} />
          {(el.spotMode||'tone')==='hue'
            ? <React.Fragment>
                <Slider label="Hue" val={el.spotHue!=null?el.spotHue:340} min={0} max={360} step={2} onChange={v=>update({spotHue:v})} suffix="°" />
                <Slider label="Hue range" val={el.spotHueRange!=null?el.spotHueRange:45} min={10} max={120} step={2} onChange={v=>update({spotHueRange:v})} suffix="°" />
                <div className="rs-mini" style={{ margin:'-2px 0 8px' }}>Everything near that hue in the <b>original photo</b> floods with the accent — "make the red jacket pop".</div>
              </React.Fragment>
            : <React.Fragment>
                <Slider label="Range low" val={el.spotLo!=null?el.spotLo:0.35} min={0} max={1} step={0.01} onChange={v=>update({spotLo:v})} />
                <Slider label="Range high" val={el.spotHi!=null?el.spotHi:0.65} min={0} max={1} step={0.01} onChange={v=>update({spotHi:v})} />
              </React.Fragment>}
          <Slider label="Edge softness" val={el.spotSoft!=null?el.spotSoft:0.08} min={0.002} max={0.4} step={0.01} onChange={v=>update({spotSoft:v})} />
          <Slider label="Smoothing" val={el.toneSmooth!=null?el.toneSmooth:0} min={0} max={10} step={0.2} onChange={v=>update({toneSmooth:v})} />
          <Chips label="Fill" options={[{v:false,l:'In range'},{v:true,l:'Out of range'}]} value={!!el.spotInvert} onChange={v=>update({spotInvert:v})} />
          {(el.spotMode||'tone')==='tone' && <React.Fragment>
            <Chips label="Second band" options={[{v:false,l:'Off'},{v:true,l:'On'}]} value={!!el.spot2} onChange={v=>update({spot2:v})} />
            {el.spot2 && <React.Fragment>
              <Slider label="Band 2 low" val={el.spot2Lo!=null?el.spot2Lo:0.7} min={0} max={1} step={0.01} onChange={v=>update({spot2Lo:v})} />
              <Slider label="Band 2 high" val={el.spot2Hi!=null?el.spot2Hi:0.9} min={0} max={1} step={0.01} onChange={v=>update({spot2Hi:v})} />
              <InkRow label="Band 2 ink" value={el.spot2Ink} onChange={v=>update({spot2Ink:v})} autoTitle="Auto — warm/cool partner" />
            </React.Fragment>}
          </React.Fragment>}
          {(el.spotBase||'duotone')==='duotone' && <React.Fragment>
            <Slider label="Tone balance" val={el.balance} min={0.1} max={0.9} step={0.01} onChange={v=>update({balance:v})} />
            <Slider label="Shadow tint" val={el.shadowTint} min={0} max={0.6} step={0.02} onChange={v=>update({shadowTint:v})} />
          </React.Fragment>}
        </React.Fragment>}
        {t==='dither' && <React.Fragment>
          <Chips label="Pattern" options={[{v:'bayer',l:'Bayer'},{v:'cluster',l:'Cluster dot'},{v:'lines',l:'Scanlines'},{v:'noise',l:'Noise'},{v:'diffusion',l:'Diffusion'}]} value={el.ditherMode||'bayer'} onChange={v=>update({ditherMode:v})} />
          <Slider label="Cell size" val={el.ditherScale!=null?el.ditherScale:3} min={1} max={12} step={0.5} onChange={v=>update({ditherScale:v})} suffix="px" />
          {(el.ditherMode==null||el.ditherMode==='bayer'||el.ditherMode==='cluster'||el.ditherMode==='lines') &&
            <Slider label="Screen angle" val={el.ditherAngle!=null?el.ditherAngle:0} min={-90} max={90} step={1} onChange={v=>update({ditherAngle:v})} suffix="°" />}
          <Chips label="Inking" options={[{v:'single',l:'Ink'},{v:'black',l:'Mono'},{v:'gradient',l:'Gradient'}]} value={el.inkMode==='black'?'black':el.inkMode==='gradient'?'gradient':'single'} onChange={v=>update({inkMode:v})} />
          {el.inkMode==='gradient' && <React.Fragment>
            <Chips label="Ramp" options={[{v:'tone',l:'By tone'},{v:'frame',l:'Across frame'}]} value={el.gradMode||'tone'} onChange={v=>update({gradMode:v})} />
            <InkRow label="From" value={el.gradA} onChange={v=>update({gradA:v})} autoTitle="Main ink" />
            <InkRow label="To" value={el.gradB} onChange={v=>update({gradB:v})} autoTitle="Auto — warm/cool partner" />
            {el.gradMode==='frame' && <Slider label="Ramp angle" val={el.gradAngle!=null?el.gradAngle:90} min={0} max={360} step={1} onChange={v=>update({gradAngle:v})} suffix="°" />}
          </React.Fragment>}
          <Chips label="Print" options={[{v:false,l:'Shadows'},{v:true,l:'Highlights'}]} value={!!el.invert} onChange={v=>update({invert:v})} />
          <Chips label="Background" options={[{v:'paper',l:'Paper'},{v:'tint',l:'Ink tint'},{v:'ink',l:'Solid ink'}]} value={el.field||'paper'} onChange={v=>update({field:v})} />
          {el.field && el.field!=='paper' && <React.Fragment>
            <InkRow label="Field ink" value={el.fieldInk} onChange={v=>update({fieldInk:v})} autoTitle="Main ink" />
            {el.field==='tint' && <Slider label="Tint strength" val={el.fieldStrength!=null?el.fieldStrength:0.12} min={0.04} max={0.5} step={0.01} onChange={v=>update({fieldStrength:v})} />}
          </React.Fragment>}
        </React.Fragment>}
        {t==='hatch' && <React.Fragment>
          <Chips label="Inking" options={[{v:'single',l:'Ink'},{v:'black',l:'Mono'},{v:'gradient',l:'Gradient'}]} value={el.inkMode==='black'?'black':el.inkMode==='gradient'?'gradient':'single'} onChange={v=>update({inkMode:v})} />
          {el.inkMode==='gradient' && <React.Fragment>
            <Chips label="Ramp" options={[{v:'tone',l:'By tone'},{v:'frame',l:'Across frame'}]} value={el.gradMode||'tone'} onChange={v=>update({gradMode:v})} />
            <InkRow label="From" value={el.gradA} onChange={v=>update({gradA:v})} autoTitle="Main ink" />
            <InkRow label="To" value={el.gradB} onChange={v=>update({gradB:v})} autoTitle="Auto — warm/cool partner" />
            {el.gradMode==='frame' && <Slider label="Ramp angle" val={el.gradAngle!=null?el.gradAngle:90} min={0} max={360} step={1} onChange={v=>update({gradAngle:v})} suffix="°" />}
          </React.Fragment>}
          <Slider label="Spacing" val={el.hatchSpacing!=null?el.hatchSpacing:9} min={4} max={20} step={0.5} onChange={v=>update({hatchSpacing:v})} suffix="px" />
          <Slider label="Angle" val={el.angle!=null?el.angle:-22} min={-90} max={90} step={1} onChange={v=>update({angle:v})} suffix="°" />
          <Slider label="Stroke weight" val={el.hatchWeight!=null?el.hatchWeight:1} min={0.5} max={1.5} step={0.02} onChange={v=>update({hatchWeight:v})} />
          <Chips label="Cross-hatch" options={[{v:false,l:'Off'},{v:true,l:'In the shadows'}]} value={!!el.hatchCross} onChange={v=>update({hatchCross:v})} />
          <Slider label="Wobble" val={el.hatchWobble!=null?el.hatchWobble:0.15} min={0} max={1} step={0.02} onChange={v=>update({hatchWobble:v})} />
          <Slider label="Smoothing" val={el.toneSmooth!=null?el.toneSmooth:0} min={0} max={10} step={0.2} onChange={v=>update({toneSmooth:v})} />
          <Chips label="Background" options={[{v:'paper',l:'Paper'},{v:'tint',l:'Ink tint'},{v:'ink',l:'Solid ink'}]} value={el.field||'paper'} onChange={v=>update({field:v})} />
          {el.field && el.field!=='paper' && <React.Fragment>
            <InkRow label="Field ink" value={el.fieldInk} onChange={v=>update({fieldInk:v})} autoTitle="Main ink" />
            {el.field==='tint' && <Slider label="Tint strength" val={el.fieldStrength!=null?el.fieldStrength:0.12} min={0.04} max={0.5} step={0.01} onChange={v=>update({fieldStrength:v})} />}
          </React.Fragment>}
        </React.Fragment>}
        {t==='photocopy' && <React.Fragment>
          <Chips label="Inking" options={[{v:'black',l:'Toner'},{v:'single',l:'Ink'}]} value={el.inkMode==='single'?'single':'black'} onChange={v=>update({inkMode:v})} />
          <Slider label="Toner" val={el.toner!=null?el.toner:0.55} min={0} max={1} step={0.02} onChange={v=>update({toner:v})} />
          <Slider label="Copy noise" val={el.copyNoise!=null?el.copyNoise:0.35} min={0} max={1} step={0.02} onChange={v=>update({copyNoise:v})} />
          <Slider label="Streaks" val={el.streaks!=null?el.streaks:0.25} min={0} max={1} step={0.02} onChange={v=>update({streaks:v})} />
          <Slider label="Generations" val={el.generations!=null?el.generations:2} min={1} max={5} step={1} onChange={v=>update({generations:v})} />
          <Chips label="Paper" options={[{v:'paper',l:'Plain'},{v:'tint',l:'Tinted stock'}]} value={el.field==='tint'?'tint':'paper'} onChange={v=>update({field:v})} />
          {el.field==='tint' && <React.Fragment>
            <InkRow label="Stock ink" value={el.fieldInk} onChange={v=>update({fieldInk:v})} autoTitle="Main ink" />
            <Slider label="Tint strength" val={el.fieldStrength!=null?el.fieldStrength:0.18} min={0.04} max={0.5} step={0.01} onChange={v=>update({fieldStrength:v})} />
          </React.Fragment>}
          <div className="rs-mini" style={{ margin:'-2px 0 8px' }}>Each generation is a re-copy — harder blacks, blown highlights. Tinted stock runs the toner on coloured paper.</div>
        </React.Fragment>}
        {t==='contour' && <React.Fragment>
          <Slider label="Bands" val={el.bands} min={2} max={12} step={1} onChange={v=>update({bands:v})} />
          <Slider label="Smoothing" val={el.contourSmooth!=null?el.contourSmooth:2.2} min={0} max={10} step={0.2} onChange={v=>update({contourSmooth:v})} />
          <Slider label="Line weight" val={el.contourWeight!=null?el.contourWeight:2} min={1} max={6} step={0.5} onChange={v=>update({contourWeight:v})} />
          <Chips label="Fill" options={[{v:'paper',l:'Paper'},{v:'tint',l:'Tint'},{v:'bands',l:'Full ramp'}]} value={el.contourFill||'tint'} onChange={v=>update({contourFill:v})} />
          {(el.contourFill||'tint')==='tint' && <Slider label="Tint strength" val={el.contourTint!=null?el.contourTint:0.19} min={0.05} max={0.6} step={0.01} onChange={v=>update({contourTint:v})} />}
          {(el.contourFill||'tint')==='bands' && <React.Fragment>
            <Chips label="Band colours" options={[{v:false,l:'Auto ramp'},{v:true,l:'Custom'}]} value={!!el.bandInks}
              onChange={v=>{ if(!v){ update({ bandInks:null }); } else { const arr=[]; for(let b=0;b<nBands;b++) arr.push(null); update({ bandInks:arr }); } }} />
            {el.bandInks && Array.from({length:nBands}).map((_,i)=>(
              <InkRow key={i} label={'Band '+(i+1)+(i===0?' · dark':i===nBands-1?' · light':'')} value={el.bandInks[i]||null} onChange={v=>setBandInk(i,v)} autoTitle="Auto — ramp colour" />
            ))}
          </React.Fragment>}
          <Chips label="Lines" options={[{v:'auto',l:'Auto'},{v:'ink',l:'Ink colour'},{v:'black',l:'Mono'}]} value={el.contourLine||'auto'} onChange={v=>update({contourLine:v})} />
          {el.contourLine==='ink' && <InkRow label="Line ink" value={el.contourInk} onChange={v=>update({contourInk:v})} autoTitle="Main ink" />}
          <Slider label="Line slip" val={el.contourSlip!=null?el.contourSlip:0} min={0} max={20} step={0.5} onChange={v=>update({contourSlip:v})} suffix="px" />
          {el.contourSlip>0 && <Slider label="Slip angle" val={el.contourSlipAngle!=null?el.contourSlipAngle:45} min={0} max={360} step={5} onChange={v=>update({contourSlipAngle:v})} suffix="°" />}
          <Slider label="Echo" val={el.contourEcho!=null?el.contourEcho:0} min={0} max={20} step={0.5} onChange={v=>update({contourEcho:v})} suffix="px" />
          {el.contourEcho>0 && <React.Fragment>
            <InkRow label="Echo ink" value={el.contourEchoInk} onChange={v=>update({contourEchoInk:v})} autoTitle="Auto — warm/cool partner" />
            <Slider label="Echo angle" val={el.contourEchoAngle!=null?el.contourEchoAngle:45} min={0} max={360} step={5} onChange={v=>update({contourEchoAngle:v})} suffix="°" />
          </React.Fragment>}
          <div className="rs-mini" style={{ margin:'-2px 0 8px' }}>Smoothing melts detail into clean topographic loops — push it up for a weather-map read. Slip prints the linework off-register from the fills; echo re-strikes it in a second ink.</div>
        </React.Fragment>}
        {t==='edges' && <React.Fragment>
          <Chips label="Backdrop" options={[{v:'paper',l:'Paper'},{v:'ink',l:'Ink field'},{v:'duotone',l:'Pale duotone'},{v:'image',l:'Raw image'}]} value={el.edgeBackdrop||'paper'} onChange={v=>update({edgeBackdrop:v})} />
          {el.edgeBackdrop==='ink' && <InkRow label="Field ink" value={el.fieldInk} onChange={v=>update({fieldInk:v})} autoTitle="Main ink" />}
          {(el.edgeBackdrop==='duotone'||el.edgeBackdrop==='image') &&
            <Slider label="Paper wash" val={el.edgeWash!=null?el.edgeWash:(el.edgeBackdrop==='duotone'?0.5:0)} min={0} max={0.9} step={0.02} onChange={v=>update({edgeWash:v})} />}
          <Slider label="Detail" val={el.edgeDetail!=null?el.edgeDetail:0.3} min={0} max={1} step={0.02} onChange={v=>update({edgeDetail:v})} />
          <Slider label="Simplify" val={el.edgeSmooth!=null?el.edgeSmooth:1.6} min={0} max={8} step={0.1} onChange={v=>update({edgeSmooth:v})} />
          <Slider label="De-speckle" val={el.edgeClean!=null?el.edgeClean:0} min={0} max={200} step={2} onChange={v=>update({edgeClean:v})} />
          <Slider label="Line weight" val={el.edgeThick!=null?el.edgeThick:2} min={1} max={6} step={0.5} onChange={v=>update({edgeThick:v})} />
          {el.edgeBackdrop!=='ink' && <React.Fragment>
            <Chips label="Inking" options={[{v:'single',l:'Ink'},{v:'black',l:'Mono'}]} value={el.inkMode==='black'?'black':'single'} onChange={v=>update({inkMode:v})} />
            {el.inkMode!=='black' && <InkRow label="Line ink" value={el.edgeInk} onChange={v=>update({edgeInk:v})} autoTitle="Main ink" />}
          </React.Fragment>}
          <Slider label="Line slip" val={el.edgeSlip!=null?el.edgeSlip:0} min={0} max={20} step={0.5} onChange={v=>update({edgeSlip:v})} suffix="px" />
          {el.edgeSlip>0 && <Slider label="Slip angle" val={el.edgeSlipAngle!=null?el.edgeSlipAngle:45} min={0} max={360} step={5} onChange={v=>update({edgeSlipAngle:v})} suffix="°" />}
          <Slider label="Echo" val={el.edgeEcho!=null?el.edgeEcho:0} min={0} max={20} step={0.5} onChange={v=>update({edgeEcho:v})} suffix="px" />
          {el.edgeEcho>0 && <React.Fragment>
            <InkRow label="Echo ink" value={el.edgeEchoInk} onChange={v=>update({edgeEchoInk:v})} autoTitle="Auto — warm/cool partner" />
            <Slider label="Echo angle" val={el.edgeEchoAngle!=null?el.edgeEchoAngle:45} min={0} max={360} step={5} onChange={v=>update({edgeEchoAngle:v})} suffix="°" />
          </React.Fragment>}
          <div className="rs-mini" style={{ margin:'-2px 0 8px' }}>Simplify melts texture so only confident lines survive; de-speckle sweeps the leftover dust. Echo re-strikes the linework off-register in a second ink.</div>
        </React.Fragment>}
        {t==='mosaic' && <React.Fragment>
          <Slider label="Tile size" val={el.cellSize!=null?el.cellSize:16} min={4} max={48} step={1} onChange={v=>update({cellSize:v})} suffix="px" />
          <Slider label="Depth" val={el.mosaicDepth!=null?el.mosaicDepth:4} min={2} max={6} step={1} onChange={v=>update({mosaicDepth:v})} />
          <Chips label="Tile shape" options={[{v:'square',l:'Square'},{v:'round',l:'Round'},{v:'diamond',l:'Diamond'}]} value={el.mosaicShape||'square'} onChange={v=>update({mosaicShape:v})} />
          <Chips label="Bond" options={[{v:'grid',l:'Grid'},{v:'brick',l:'Brick'}]} value={el.mosaicBond||'grid'} onChange={v=>update({mosaicBond:v})} />
          <Slider label="Hand-laid jitter" val={el.mosaicJitter!=null?el.mosaicJitter:0} min={0} max={1} step={0.02} onChange={v=>update({mosaicJitter:v})} />
          <Slider label="Grout" val={el.mosaicGap!=null?el.mosaicGap:0.08} min={0} max={0.3} step={0.01} onChange={v=>update({mosaicGap:v})} />
          {((el.mosaicGap==null?0.08:el.mosaicGap)>0 || (el.mosaicShape&&el.mosaicShape!=='square')) &&
            <Chips label="Grout colour" options={[{v:'paper',l:'Paper'},{v:'black',l:'Mono'},{v:'accent',l:'Accent'}]} value={el.mosaicGrout||'paper'} onChange={v=>update({mosaicGrout:v})} />}
          <Chips label="Tile colours" options={[{v:false,l:'Auto ramp'},{v:true,l:'Custom'}]} value={!!el.bandInks}
            onChange={v=>{ if(!v){ update({ bandInks:null }); } else { const arr=[]; for(let b=0;b<nMosaic;b++) arr.push(null); update({ bandInks:arr }); } }} />
          {el.bandInks && Array.from({length:nMosaic}).map((_,i)=>(
            <InkRow key={i} label={'Tile '+(i+1)+(i===0?' · dark':i===nMosaic-1?' · light':'')} value={el.bandInks[i]||null} onChange={v=>setMosaicInk(i,v)} autoTitle="Auto — ramp colour" />
          ))}
          <div className="rs-mini" style={{ margin:'-2px 0 8px' }}>Round and diamond tiles show the grout between them even at 0 — pick a mono grout for a stained-glass read.</div>
        </React.Fragment>}
      </Fold>

      <Fold id="ph-adjust" title="Adjust & focus" open>
        <Slider label="Brightness" val={el.brightness!=null?el.brightness:0} min={-0.5} max={0.5} step={0.02} onChange={v=>update({brightness:v})} />
        <Slider label="Contrast" val={el.contrast} min={0.7} max={1.9} step={0.01} onChange={v=>update({contrast:v})} />
        {t==='none' && <React.Fragment>
          <Slider label="Saturation" val={el.saturation!=null?el.saturation:1} min={0} max={2} step={0.02} onChange={v=>update({saturation:v})} />
          <Slider label="Hue shift" val={el.hue!=null?el.hue:0} min={-180} max={180} step={5} onChange={v=>update({hue:v})} suffix="°" />
          <Slider label="Warmth" val={el.temperature!=null?el.temperature:0} min={-1} max={1} step={0.02} onChange={v=>update({temperature:v})} />
        </React.Fragment>}
        <BlurControls el={el} update={update} prefix="blurUnder" label="Soft focus" max={24} />
        <div className="rs-mini" style={{ margin:'-2px 0 8px' }}>Soft focus blurs the photo <b>before</b> the press — motion smears the dots along a direction, zoom rushes them outward. The <b>Finish</b> blur prints over the finished image instead.</div>
      </Fold>

      <Fold id="ph-finish" title="Finish" badge={finishCount? String(finishCount) : null}>
        <div className="rs-sech">Tone</div>
        <Slider label="Brightness" val={el.finBright!=null?el.finBright:0} min={-0.5} max={0.5} step={0.02} onChange={v=>update({finBright:v})} />
        <Slider label="Contrast" val={el.finContrast!=null?el.finContrast:1} min={0.5} max={2} step={0.02} onChange={v=>update({finContrast:v})} />
        <Slider label="Saturation" val={el.finSat!=null?el.finSat:1} min={0} max={2} step={0.02} onChange={v=>update({finSat:v})} />
        <button className="rs-addrow" onClick={()=>update({finBright:0, finContrast:1, finSat:1})}>↺ Reset tone</button>
        <div className="rs-mini" style={{ margin:'-2px 0 8px' }}>Grades the <b>printed</b> ink — <b>Adjust &amp; focus</b> changes what the press sees instead. Unlike that pass, saturation here works under every treatment: pull it to 0 to grey off a duotone, push it up to make one ink shout.</div>
        <div className="rs-sech">Press artifacts</div>
        <BlurControls el={el} update={update} prefix="blurOver" label="Blur" max={30} />
        <Slider label="Grain" val={el.grain!=null?el.grain:0} min={0} max={1} step={0.02} onChange={v=>update({grain:v})} />
        {el.grain>0 && <React.Fragment>
          <Slider label="Grain size" val={el.grainSize!=null?el.grainSize:2} min={0.5} max={5} step={0.25} onChange={v=>update({grainSize:v})} suffix="px" />
          <InkRow label="Grain ink" value={el.grainInk} onChange={v=>update({grainInk:v})} autoTitle="Auto — neutral tooth" />
          <Chips label="Character" options={[{v:'soft',l:'Soft'},{v:'dirty',l:'Dirty'}]} value={el.grainBlend||'soft'} onChange={v=>update({grainBlend:v})} />
        </React.Fragment>}
        <Slider label="Vignette" val={el.vignette!=null?el.vignette:0} min={0} max={1} step={0.02} onChange={v=>update({vignette:v})} />
        {el.vignette>0 && <Slider label="Vignette softness" val={el.vignetteSoft!=null?el.vignetteSoft:0.6} min={0.2} max={1} step={0.02} onChange={v=>update({vignetteSoft:v})} />}
        <Slider label="Paper texture" val={el.paperTex!=null?el.paperTex:0} min={0} max={1} step={0.02} onChange={v=>update({paperTex:v})} />
        <Slider label="Ink bleed" val={el.inkBleed!=null?el.inkBleed:0} min={0} max={1} step={0.02} onChange={v=>update({inkBleed:v})} />
        <Slider label="Dust & scratches" val={el.dust!=null?el.dust:0} min={0} max={1} step={0.02} onChange={v=>update({dust:v})} />
        <Slider label="Misprint" val={el.misprint!=null?el.misprint:0} min={0} max={24} step={0.5} onChange={v=>update({misprint:v})} suffix="px" />
        {el.misprint>0 && <Slider label="Misprint angle" val={el.misprintAngle!=null?el.misprintAngle:-35} min={-180} max={180} step={5} onChange={v=>update({misprintAngle:v})} suffix="°" />}
        <div className="rs-mini" style={{ margin:'-2px 0 8px' }}>Press artifacts print over the finished image — the misprint slides the whole print off its paper.</div>
      </Fold>

      <Fold id="ph-frame" title="Frame & placement" open>
        {el.type==='photo' && <React.Fragment>
          <Chips label="Full bleed" options={[{v:true,l:'Fill format'},{v:false,l:'Free size'}]} value={!!el.bleed} onChange={v=>update({bleed:v})} />
          {el.bleed && <div className="rs-mini" style={{ marginTop:-2 }}>Fills <b>every format</b> edge-to-edge — no resizing per format. Frame the shot with pan/zoom below.</div>}
        </React.Fragment>}
        <Chips label="Frame" options={[{v:true,l:'Ink border'},{v:false,l:'Bleed'}]} value={el.frame} onChange={v=>update({frame:v})} />
        {el.type==='logo' && <div className="rs-mini" style={{ margin:'-2px 0 8px' }}>The whole logo always shows (contain). Zoom <b>below 1×</b> for more paper space around it.</div>}
        {/* MASK — the same shape registry the Shape element draws from, applied
            as the photo's silhouette. Ink border follows the mask, and so does
            the shadow, so a circle photo casts a circle shadow. */}
        {el.type==='photo' && <React.Fragment>
          <div className="rs-sech">Mask</div>
          <GfxGrid type="shape" prop="kind" value={el.mask||'none'} onPick={v=>update({mask:v})}
            items={AP_MASKS.map(k=> k==='none' ? { k:'none', l:'None' } : { k, l:AP_SHAPELAB[k]||k })} />
          {(el.mask&&el.mask!=='none') && <div className="rs-mini" style={{ margin:'4px 0 12px' }}>Cut from the same shape set as the graphics library — pan/zoom below to re-frame inside it.</div>}
        </React.Fragment>}
        <Slider label="Zoom" val={el.imgScale!=null?el.imgScale:1} min={0.5} max={3} step={0.02} onChange={v=>update({imgScale:v})} suffix="×" />
        <Slider label="Pan X" val={el.imgX!=null?el.imgX:0} min={-0.5} max={0.5} step={0.01} onChange={v=>update({imgX:v})} />
        <Slider label="Pan Y" val={el.imgY!=null?el.imgY:0} min={-0.5} max={0.5} step={0.01} onChange={v=>update({imgY:v})} />
        <Slider label="Rotate" val={el.imgRot!=null?el.imgRot:0} min={-180} max={180} step={1} onChange={v=>update({imgRot:v})} suffix="°" />
        <button className="rs-addrow" onClick={()=>update({imgScale:1, imgX:0, imgY:0, imgRot:0})}>↺ Reset image</button>
      </Fold>
    </React.Fragment>
  );
}

function BlockControls({ el, doc, update }){
  return (
    <React.Fragment>
      <div className="rs-sech">Fill</div>
      <Swatches value={el.fill!=null?el.fill:el.color} onChange={v=>update({fill:v})}
        autoTitle="Auto — the poster accent" autoBg={AP_PAL[doc.accent]} />
      <Slider label="Opacity" val={el.opacity!=null?el.opacity:1} min={0.08} max={1} step={0.02} onChange={v=>update({opacity:v})} />
      <div className="rs-sech">Texture</div>
      <Slider label="Grain" val={el.grain!=null?el.grain:0} min={0} max={1} step={0.02} onChange={v=>update({grain:v})} />
      {el.grain>0 && <React.Fragment>
        <Slider label="Grain size" val={el.grainSize!=null?el.grainSize:2} min={0.5} max={5} step={0.25} onChange={v=>update({grainSize:v})} suffix="px" />
        <InkRow label="Grain ink" value={el.grainInk} onChange={v=>update({grainInk:v})} autoTitle="Auto — neutral tooth" />
        <Chips label="Character" options={[{v:'soft',l:'Soft'},{v:'dirty',l:'Dirty'}]} value={el.grainBlend||'soft'} onChange={v=>update({grainBlend:v})} />
      </React.Fragment>}
      <div className="rs-mini" style={{ margin:'-2px 0 8px' }}>A pinch of grain makes a flat field feel printed, not digital.</div>
      <div className="rs-sech">Edge</div>
      <Chips options={[{v:true,l:'Ink border'},{v:false,l:'Bleed'}]} value={!!el.outline} onChange={v=>update({outline:v})} />
    </React.Fragment>
  );
}

/* ============================================================
   GRAPHICAL ELEMENT PANELS — shape · icon · rule · burst.
   Each opens with the kind picker (the same grid as the library, so
   swapping a circle for a hexagon is one click and never needs a
   re-drag), then that family's own dials. Colour is always the shared
   Swatches, so Auto keeps them on the poster accent.
   ============================================================ */
function ShapeControls({ el, doc, update }){
  const hollow = el.style==='outline';
  return (
    <React.Fragment>
      {/* "Silhouette", not "Shape" — the row above already says the element
          type, and two SHAPE headings in a row read like a bug. */}
      <div className="rs-sech">Silhouette</div>
      <GfxGrid type="shape" items={AP_SHAPES.map(k=>({ k, l:AP_SHAPELAB[k]||k }))} prop="kind"
        value={el.kind||'circle'} onPick={v=>update({kind:v})} />
      <div className="rs-sech">Fill</div>
      {/* Outline needs a line to draw — dial one in on the way there rather
          than leaving the shape invisible at stroke 0. */}
      <Chips options={[{v:'solid',l:'Solid'},{v:'outline',l:'Outline'}]} value={hollow?'outline':'solid'}
        onChange={v=>update(v==='outline' && !(el.stroke>0) ? { style:v, stroke:10 } : { style:v })} />
      <Swatches value={el.fill!=null?el.fill:el.color} onChange={v=>update({fill:v})}
        autoTitle="Auto — the poster accent" autoBg={AP_PAL[doc.accent]} />
      <Slider label="Opacity" val={el.opacity!=null?el.opacity:1} min={0.08} max={1} step={0.02} onChange={v=>update({opacity:v})} />
      {hollow
        ? <Slider label="Line weight" val={el.stroke!=null?el.stroke:8} min={1} max={60} step={1} onChange={v=>update({stroke:v})} suffix="px" />
        : <React.Fragment>
            <div className="rs-sech">Keyline</div>
            <Slider label="Weight" val={el.stroke!=null?el.stroke:0} min={0} max={40} step={1} onChange={v=>update({stroke:v})} suffix="px" />
            {el.stroke>0 && <Swatches label="Keyline colour" value={el.strokeColor||'fg'} onChange={v=>update({strokeColor:v})}
              autoTitle="Auto — the theme ink" />}
          </React.Fragment>}
      {!hollow && <React.Fragment>
        <div className="rs-sech">Texture</div>
        <Slider label="Grain" val={el.grain!=null?el.grain:0} min={0} max={1} step={0.02} onChange={v=>update({grain:v})} />
        {el.grain>0 && <React.Fragment>
          <Slider label="Grain size" val={el.grainSize!=null?el.grainSize:2} min={0.5} max={5} step={0.25} onChange={v=>update({grainSize:v})} suffix="px" />
          <InkRow label="Grain ink" value={el.grainInk} onChange={v=>update({grainInk:v})} autoTitle="Auto — neutral tooth" />
          <Chips label="Character" options={[{v:'soft',l:'Soft'},{v:'dirty',l:'Dirty'}]} value={el.grainBlend||'soft'} onChange={v=>update({grainBlend:v})} />
        </React.Fragment>}
        <div className="rs-mini" style={{ margin:'-2px 0 8px' }}>Grain is clipped to the silhouette, so a grained hexagon stays a hexagon.</div>
      </React.Fragment>}
    </React.Fragment>
  );
}

function IconControls({ el, doc, update }){
  return (
    <React.Fragment>
      <div className="rs-sech">Icon</div>
      <IconPicker value={el.kind} onPick={v=>update({kind:v})} />
      <div className="rs-sech">Ink</div>
      <Chips options={[{v:false,l:'Line'},{v:true,l:'Solid'}]} value={!!el.solid} onChange={v=>update({solid:v})} />
      <Swatches value={el.fill!=null?el.fill:el.color} onChange={v=>update({fill:v})}
        autoTitle="Auto — the poster accent" autoBg={AP_PAL[doc.accent]} />
      <Slider label="Stroke weight" val={el.strokeScale!=null?el.strokeScale:1} min={0.4} max={3} step={0.1} onChange={v=>update({strokeScale:v})} suffix="×" />
      <Slider label="Opacity" val={el.opacity!=null?el.opacity:1} min={0.08} max={1} step={0.02} onChange={v=>update({opacity:v})} />
      <div className="rs-mini" style={{ marginTop:-2 }}>The Year 2 glyph set — the same vectors the app and Print Studio draw.</div>
    </React.Fragment>
  );
}

function RuleControls({ el, doc, update }){
  const pat = el.pattern||'solid';
  const shaped = pat==='zigzag'||pat==='wave'||pat==='square';
  const spaced = pat!=='solid'&&pat!=='double'&&pat!=='triple';
  return (
    <React.Fragment>
      <div className="rs-sech">Pattern</div>
      <GfxGrid type="rule" items={AP_RULES.map(p=>({ k:p.v, l:p.l }))} prop="pattern"
        value={pat} onPick={v=>update({pattern:v})} />
      <div className="rs-sech">Line</div>
      <Swatches value={el.fill!=null?el.fill:el.color} onChange={v=>update({fill:v})}
        autoTitle="Auto — the poster accent" autoBg={AP_PAL[doc.accent]} />
      <Slider label="Weight" val={el.weight!=null?el.weight:6} min={1} max={40} step={1} onChange={v=>update({weight:v})} suffix="px" />
      {spaced && <Slider label="Spacing" val={el.spacing!=null?el.spacing:20} min={4} max={120} step={1} onChange={v=>update({spacing:v})} suffix="px" />}
      {pat==='dashed' && <Slider label="Dash length" val={el.dashRatio!=null?el.dashRatio:0.55} min={0.1} max={0.9} step={0.05} onChange={v=>update({dashRatio:v})} />}
      {shaped && <Slider label="Amplitude" val={el.amp!=null?el.amp:10} min={1} max={80} step={1} onChange={v=>update({amp:v})} suffix="px" />}
      {(pat==='double'||pat==='triple') && <Slider label="Line gap" val={el.gap!=null?el.gap:12} min={2} max={80} step={1} onChange={v=>update({gap:v})} suffix="px" />}
      {pat==='ticks' && <React.Fragment>
        <Slider label="Tick length" val={el.tickLen!=null?el.tickLen:10} min={2} max={60} step={1} onChange={v=>update({tickLen:v})} suffix="px" />
        <Chips label="Tick direction" options={[{v:'both',l:'Both'},{v:'up',l:'Up'},{v:'down',l:'Down'}]} value={el.tickDir||'both'} onChange={v=>update({tickDir:v})} />
      </React.Fragment>}
      <div className="rs-sech">Ends</div>
      <Chips options={AP_TERMS} value={el.term||'none'} onChange={v=>update({term:v})} />
      {el.term && el.term!=='none' && <React.Fragment>
        <Chips label="Which end" options={[{v:'end',l:'End'},{v:'start',l:'Start'},{v:'both',l:'Both'}]} value={el.termAt||'end'} onChange={v=>update({termAt:v})} />
        <Slider label="Terminal size" val={el.termScale!=null?el.termScale:1} min={0.4} max={3} step={0.1} onChange={v=>update({termScale:v})} suffix="×" />
      </React.Fragment>}
      <Chips label="Caps" options={[{v:'round',l:'Round'},{v:'butt',l:'Flat'}]} value={el.cap||'round'} onChange={v=>update({cap:v})} />
      <Slider label="Opacity" val={el.opacity!=null?el.opacity:1} min={0.08} max={1} step={0.02} onChange={v=>update({opacity:v})} />
      <div className="rs-mini" style={{ marginTop:-2 }}>Rotate the element 90° for a vertical rule — the geometry always runs along the box.</div>
    </React.Fragment>
  );
}

function BurstControls({ el, doc, update }){
  return (
    <React.Fragment>
      <div className="rs-sech">Burst</div>
      <Swatches value={el.fill!=null?el.fill:el.color} onChange={v=>update({fill:v})}
        autoTitle="Auto — the poster accent" autoBg={AP_PAL[doc.accent]} />
      <Slider label="Rays" val={el.rays!=null?el.rays:16} min={3} max={64} step={1} onChange={v=>update({rays:v})} />
      <Slider label="Spin" val={el.spin!=null?el.spin:0} min={0} max={90} step={1} onChange={v=>update({spin:v})} suffix="°" />
      <Slider label="Hub" val={el.hub!=null?el.hub:0} min={0} max={0.9} step={0.02} onChange={v=>update({hub:v})} />
      {el.hub>0 && <Swatches label="Hub colour" value={el.hubFill||'paper'} onChange={v=>update({hubFill:v})} autoTitle="Auto — the paper" />}
      <Slider label="Opacity" val={el.opacity!=null?el.opacity:1} min={0.08} max={1} step={0.02} onChange={v=>update({opacity:v})} />
      <div className="rs-mini" style={{ marginTop:-2 }}>Send it behind a title (▼) and knock the hub out to ring a photo.</div>
    </React.Fragment>
  );
}

/* ---------- inspector ---------- */
/* Centre-on-canvas row — the same three buttons serve one box and a group of
   them (the handler centres the selection's bounding box either way), so the
   only thing that changes is the label. */
function CentreRow({ label, centre, hint }){
  return (
    <React.Fragment>
      <div className="rs-lab" style={{ marginTop:0 }}>{label}</div>
      <div className="rs-actions">
        <button className="rs-iconbtn" onClick={()=>centre('x')} title="Centre left-to-right on the canvas">⇄ Across</button>
        <button className="rs-iconbtn" onClick={()=>centre('y')} title="Centre top-to-bottom on the canvas">⇕ Down</button>
        <button className="rs-iconbtn" onClick={()=>centre('both')} title="Centre on both axes">⊕ Both</button>
      </div>
      {hint && <div className="rs-mini" style={{ margin:'4px 0 2px' }}>{hint}</div>}
    </React.Fragment>
  );
}

function Inspector({ el, doc, update, dup, del, layer, clearAll, setDoc, isOutput, activeLabel, resetOverride, toggleHidden, selCount, align, distribute, centre, formatLabel }){
  if(!el){
    const DAYS = AP_ABYDAY.map((a,i)=>({ n:i+1, abbr:AP_DABBR[i], accent:a }));
    return (
      <React.Fragment>
        <div className="rs-sech">Day — pick the accent</div>
        <div className="rs-vibe rs-days">
          {DAYS.map(d=>(
            <button key={d.abbr} className={doc.accent===d.accent?'on':''} onClick={()=>setDoc(x=>({...x, accent:d.accent}))}
              title={d.abbr+'’s colour'}>
              <span className="dot" style={{ background:AP_PAL[d.accent] }} />{d.n} · {d.abbr}
            </button>
          ))}
        </div>
        <div className="rs-mini" style={{ marginTop:10 }}>Each weekday has its colour. Picking one sets the poster accent — and names the Story export (e.g. <b>3-Wed-…</b>).</div>
        {isOutput && doc.activeFormat==='9x16' && <React.Fragment>
          <div className="rs-sech">Story sizing</div>
          <Chips options={[{v:true,l:'Boost on'},{v:false,l:'Off'}]} value={doc.storyBoost!==false} onChange={v=>setDoc(d=>({...d, storyBoost:v}))} />
          {doc.storyBoost!==false &&
            <Slider label="Scale" val={doc.storyScale||1.15} min={1} max={1.8} step={0.05} onChange={v=>setDoc(d=>({...d, storyScale:v}))} suffix="×" />}
          <div className="rs-mini" style={{ marginTop:2 }}>Scales every element + its text up so the story reads on a phone — applies to all your templates. Anything you hand-size in 9:16 keeps its size.</div>
        </React.Fragment>}
        <div className="rs-sech">Canvas</div>
        <div className="rs-empty">
          <div className="big">Nothing selected</div>
          <p>Drag a part from the left onto the poster, or click one to select it. {isOutput? 'Move it here to override just this format.' : 'You\u2019re on Master — edits flow to every format.'}</p>
        </div>
        <div className="rs-mini" style={{ textAlign:'center', marginBottom:12 }}>{doc.elements.length} element{doc.elements.length===1?'':'s'} placed</div>
        <button className="rs-iconbtn rs-del" style={{ width:'100%', justifyContent:'center' }} onClick={clearAll}>Clear poster</button>
      </React.Fragment>
    );
  }

  const caps = TYPE_CAPS[el.type] || {};
  const isText = !!caps.text;
  const setItems = (items)=>update({ items });
  // Per-type default tracking, so the slider reads true for elements saved
  // before letter-spacing was configurable (matches the renderer's fallback).
  const lsDefault = (el.type==='when'||el.type==='cost')?0.16 : el.type==='host'?0.02 : el.type==='stamp'?0.04 : el.type==='title'?0.005 : 0;
  // Companion to Align: how far off the aligned edge the text sits. Defaults to
  // the type's baked-in padding, so 0 reads as (and is) flush to the box edge.
  const inset = window.textInsetModel(el);
  const WEIGHTS = caps.font==='grot' ? WEIGHTS_GROT : WEIGHTS_MONT;
  const defWeight = (AP_DEF[el.type] && AP_DEF[el.type].props.weight) || (caps.font==='grot'?400:700);
  const sizeLabel = 'Font size'+(isOutput?' · '+activeLabel+' only':'');
  // Tags get a height dial too (chips auto-centre their text); paragraph text
  // auto-sizes to its box, so height stays hidden there.
  const showHeight = !isText || !!caps.tag;

  return (
    <React.Fragment>
      {selCount>=2 && <React.Fragment>
        <div className="rs-sech">Arrange · {selCount} selected</div>
        <div className="rs-lab" style={{ marginTop:0 }}>Align on a vertical line</div>
        <div className="rs-actions">
          <button className="rs-iconbtn" onClick={()=>align('x','left')} title="Align left edges">Left</button>
          <button className="rs-iconbtn" onClick={()=>align('x','center')} title="Align horizontal centres">Centre</button>
          <button className="rs-iconbtn" onClick={()=>align('x','right')} title="Align right edges">Right</button>
        </div>
        <div className="rs-lab">Align on a horizontal line</div>
        <div className="rs-actions">
          <button className="rs-iconbtn" onClick={()=>align('y','top')} title="Align top edges">Top</button>
          <button className="rs-iconbtn" onClick={()=>align('y','middle')} title="Align vertical centres">Middle</button>
          <button className="rs-iconbtn" onClick={()=>align('y','bottom')} title="Align bottom edges">Bottom</button>
        </div>

        {/* Distribute needs something BETWEEN the two extremes to move, so it
            can't do anything at 2 — but HIDING it there just read as "distribute
            is missing". Always shown from 2, disabled until 3, and the hint says
            why. */}
        {(()=>{ const off = selCount<3; return <React.Fragment>
          <div className="rs-lab">Distribute — even gaps</div>
          <div className="rs-actions">
            <button className="rs-iconbtn" disabled={off} onClick={()=>distribute('x','gaps')} title="Equal gaps left-to-right">⇄ Across</button>
            <button className="rs-iconbtn" disabled={off} onClick={()=>distribute('y','gaps')} title="Equal gaps top-to-bottom">⇕ Down</button>
          </div>
          <div className="rs-lab">Distribute — even centres</div>
          <div className="rs-actions">
            <button className="rs-iconbtn" disabled={off} onClick={()=>distribute('x','centres')} title="Equal spacing of centres, left-to-right">⇄ Across</button>
            <button className="rs-iconbtn" disabled={off} onClick={()=>distribute('y','centres')} title="Equal spacing of centres, top-to-bottom">⇕ Down</button>
          </div>
          <div className="rs-mini" style={{ margin:'4px 0 12px' }}>
            {off
              ? <React.Fragment>Select a <b>third</b> box to distribute — with two there's nothing between them to space.</React.Fragment>
              : <React.Fragment>The outermost two stay put. <b>Gaps</b> evens the space between boxes; <b>centres</b> evens their midpoints — they differ once the boxes are different sizes.</React.Fragment>}
          </div>
        </React.Fragment>; })()}

        <div className="rs-lab">Centre the group on the canvas</div>
        <div className="rs-actions">
          <button className="rs-iconbtn" onClick={()=>centre('x')} title="Centre the group left-to-right on the canvas">⇄ Across</button>
          <button className="rs-iconbtn" onClick={()=>centre('y')} title="Centre the group top-to-bottom on the canvas">⇕ Down</button>
          <button className="rs-iconbtn" onClick={()=>centre('both')} title="Centre the group on both axes">⊕ Both</button>
        </div>
        <div className="rs-mini" style={{ margin:'4px 0 2px' }}>Moves the whole selection as one onto the {formatLabel} centre — the boxes keep their positions relative to each other.</div>

        <button className="rs-iconbtn rs-del" style={{ width:'100%', justifyContent:'center', marginTop:8 }} onClick={del}>Delete {selCount}</button>
        <div className="rs-mini" style={{ margin:'8px 0 2px' }}>Editing the last-clicked box below · shift-click to add/remove.</div>
      </React.Fragment>}
      <div className="rs-sech" style={{ display:'flex', justifyContent:'space-between' }}>
        <span>{el.type}{el._overridden && <span className="rs-ovtag"> · overridden</span>}</span>
      </div>
      {/* Two rows: stacking order, then the destructive pair. Six buttons on one
          row crushed "Duplicate"/"Delete" to illegible at 312px. */}
      <div className="rs-actions" style={{ marginBottom:6 }}>
        <button className="rs-iconbtn" onClick={()=>layer('back')} title="Send to back">⤓ Back</button>
        <button className="rs-iconbtn" onClick={()=>layer(-1)} title="Send back one">▼</button>
        <button className="rs-iconbtn" onClick={()=>layer(1)} title="Bring forward one">▲</button>
        <button className="rs-iconbtn" onClick={()=>layer('front')} title="Bring to front">⤒ Front</button>
      </div>
      <div className="rs-actions">
        <button className="rs-iconbtn" onClick={dup} title="Duplicate">Duplicate</button>
        <button className="rs-iconbtn rs-del" onClick={del} title="Delete">Delete</button>
      </div>
      {/* Centring is arrangement, so it sits with the stacking buttons rather
          than down in Transform — behind a photo panel it would never be found.
          Hidden while several boxes are selected: the group version is up in
          Arrange, and two Centre rows meaning different things is a trap. */}
      {selCount<2 && <CentreRow label="Centre on the canvas" centre={centre}
        hint={'Exact centre of the '+formatLabel+' canvas — never snapped to the grid.'} />}

      {/* ===================== WHOLE ITEM ===================== */}
      {/* appearance — image / surface / fill of the whole element */}
      {caps.media && <PhotoControls el={el} update={update} theme={doc.theme} />}
      {el.type==='block' && <BlockControls el={el} doc={doc} update={update} />}
      {el.type==='shape' && <ShapeControls el={el} doc={doc} update={update} />}
      {el.type==='icon'  && <IconControls  el={el} doc={doc} update={update} />}
      {el.type==='rule'  && <RuleControls  el={el} doc={doc} update={update} />}
      {el.type==='burst' && <BurstControls el={el} doc={doc} update={update} />}
      {caps.surface && <React.Fragment>
        <div className="rs-sech">Surface</div>
        <Chips options={SURFACES} value={el.surface} onChange={v=>update({surface:v})} />
        <Swatches label={el.type==='host'?'Background / fill':'Fill / accent'} value={el.fill!=null?el.fill:el.color}
          onChange={v=>update({fill:v})} autoTitle="Auto — the poster accent" autoBg={AP_PAL[doc.accent]} />
        <div className="rs-mini" style={{ marginTop:-2 }}>Fill colours an <b>Accent</b> surface and the element’s accent highlights (heading, first row…).</div>
      </React.Fragment>}
      {el.type==='weekly' && <React.Fragment>
        <div className="rs-sech">Accent</div>
        <Swatches label="Bar + day" value={el.fill!=null?el.fill:el.color} onChange={v=>update({fill:v})} autoTitle="Auto — the poster accent" autoBg={AP_PAL[doc.accent]} />
        <div className="rs-mini" style={{ marginTop:-2 }}>The badge stays a white circle; the bar and day follow the accent.</div>
      </React.Fragment>}

      {/* effect */}
      {caps.shadow && <ShadowControls el={el} update={update} theme={doc.theme} />}

      {/* geometry of the whole box (+ per-format overrides) */}
      <div className="rs-sech">Transform{isOutput && <span className="rs-ovtag"> · {activeLabel} only</span>}</div>
      <Chips label="Tilt presets" options={[{v:0,l:'0°'},{v:-3,l:'-3°'},{v:3,l:'+3°'},{v:-6,l:'-6°'},{v:6,l:'+6°'}]} value={el.rot||0} onChange={v=>update({rot:v})} />
      <Slider label="Rotation" val={el.rot||0} min={-45} max={45} onChange={v=>update({rot:v})} suffix="°" />
      <Slider label="Width" val={el.w} min={120} max={1080} step={6} onChange={v=>update({w:v})} suffix="px" />
      {caps.widthPreset && <Chips label="Width presets" options={[{v:540,l:'Half'},{v:756,l:'Wide'},{v:900,l:'Safe'},{v:1080,l:'Bleed'}]} value={el.w} onChange={v=>update({w:v})} />}
      {showHeight && <Slider label="Height" val={el.h} min={70} max={1920} step={6} onChange={v=>update({h:v})} suffix="px" />}
      {caps.height && <Chips label="Height presets — match across tags" options={TAG_HEIGHTS} value={el.h} onChange={v=>update({h:v})} />}
      <Chips label="Anchor (all formats)" options={[{v:'safe',l:'Safe cluster'},{v:'bottom',l:'Pin to base'}]} value={el.anchor||'safe'} onChange={v=>update({anchor:v})} />
      {isOutput && <React.Fragment>
        <Chips label={'Visibility · '+activeLabel} options={[{v:false,l:'Shown'},{v:true,l:'Hidden'}]} value={!!el.hidden} onChange={v=>toggleHidden(el.id, v)} />
        {el._overridden
          ? <React.Fragment>
              <button className="rs-addrow" onClick={()=>resetOverride(el.id)}>↺ Reset to Master</button>
              <div className="rs-mini" style={{ marginTop:6 }}>Layout detached for {activeLabel}. Reset to follow Master again.</div>
            </React.Fragment>
          : <div className="rs-mini">Following Master. Move, resize, rotate{el.type==='photo'?', reframe the photo':''}{isText?', resize text':''} to override just {activeLabel}.</div>}
      </React.Fragment>}

      {/* ===================== MAIN TEXT ===================== */}
      {/* content (primary text / data) */}
      {el.type==='title' && <React.Fragment>
        <div className="rs-sech">Title</div>
        <Field label="Title text" value={el.text} onChange={v=>update({text:v})} area />
      </React.Fragment>}
      {el.type==='tagline' && <React.Fragment>
        <div className="rs-sech">Text</div>
        <Field label="Tagline" value={el.text} onChange={v=>update({text:v})} area />
      </React.Fragment>}
      {el.type==='info' && <React.Fragment>
        <div className="rs-sech">Text</div>
        <Field label="Info text" value={el.text} onChange={v=>update({text:v})} area />
        <div className="rs-mini" style={{ margin:'-2px 0 8px' }}>Markdown: <b>**bold**</b>, <i>*italic*</i>, and lines starting with <b>-</b> become bullets. Blank line = a gap.</div>
      </React.Fragment>}
      {el.type==='when' && <React.Fragment>
        <div className="rs-sech">Text</div>
        <Field label="When" value={el.text} onChange={v=>update({text:v})} />
      </React.Fragment>}
      {el.type==='cost' && <React.Fragment>
        <div className="rs-sech">Text</div>
        <Field label="Cost" value={el.text} onChange={v=>update({text:v})} />
      </React.Fragment>}
      {el.type==='stamp' && <React.Fragment>
        <div className="rs-sech">Text</div>
        <Field label="Stamp text" value={el.text} onChange={v=>update({text:v})} />
      </React.Fragment>}
      {el.type==='host' && <React.Fragment>
        <div className="rs-sech">Name</div>
        <Field label="Name" value={el.name} onChange={v=>update({name:v})} />
      </React.Fragment>}
      {el.type==='ticket' && <React.Fragment>
        <div className="rs-sech">Content</div>
        <Chips label="Format" options={[{v:'banner',l:'Banner'},{v:'standard',l:'Standard'},{v:'slim',l:'Slim'},{v:'mini',l:'Mini'}]}
          value={el.variant||'standard'} onChange={v=>update(TICKET_FORMATS[v])} />
        <div className="rs-mini" style={{ marginBottom:8 }}>Wordmark is the canonical REALITY mark (fixed).</div>
        <Field label="Website" value={el.site} onChange={v=>update({site:v})} />
        <Field label="Address" value={el.addr} onChange={v=>update({addr:v})} />
        <Chips label="QR" options={[{v:true,l:'Show'},{v:false,l:'Hide'}]} value={el.showQR} onChange={v=>update({showQR:v})} />
      </React.Fragment>}
      {el.type==='qr' && <React.Fragment>
        <div className="rs-sech">Content</div>
        <Field label="Label" value={el.label} onChange={v=>update({label:v})} />
        <Field label="Website" value={el.site} onChange={v=>update({site:v})} />
      </React.Fragment>}
      {el.type==='badge' && <React.Fragment>
        <div className="rs-sech">Content</div>
        <div className="rs-rowflex">
          <Field label="Top" value={el.top} onChange={v=>update({top:v})} />
          <Field label="Big" value={el.big} onChange={v=>update({big:v})} />
        </div>
        <Field label="Sub" value={el.sub} onChange={v=>update({sub:v})} />
      </React.Fragment>}
      {el.type==='wordmark' && <React.Fragment>
        <div className="rs-sech">Wordmark</div>
        <div className="rs-mini" style={{ marginBottom:8 }}>The canonical REALITY mark — fixed vector letterforms (Montserrat Alternates A/I/Y). Drag a handle or use Width/Height to resize; it scales crisp and never distorts. Recolour below.</div>
      </React.Fragment>}
      {el.type==='weekly' && <React.Fragment>
        <div className="rs-sech">Content</div>
        <div className="rs-rowflex">
          <Field label="Price (left)" value={el.price} onChange={v=>update({price:v})} />
          <Field label="Time (right)" value={el.time} onChange={v=>update({time:v})} />
        </div>
        <div className="rs-rowflex">
          <Field label="Above day" value={el.every} onChange={v=>update({every:v})} />
          <Field label="Day" value={el.day} onChange={v=>update({day:v})} />
        </div>
        <Field label="Below day" value={el.allYear} onChange={v=>update({allYear:v})} />
      </React.Fragment>}
      {el.type==='matchup' && <React.Fragment>
        <div className="rs-sech">Content</div>
        <Field label="Competition / round" value={el.comp} onChange={v=>update({comp:v})} />
        <div className="rs-rowflex">
          <Field label="Team A" value={el.teamA} onChange={v=>update({teamA:v})} />
          <Field label="Team B" value={el.teamB} onChange={v=>update({teamB:v})} />
        </div>
        <div className="rs-rowflex">
          <Field label="Date" value={el.date} onChange={v=>update({date:v})} />
          <Field label="Time" value={el.time} onChange={v=>update({time:v})} />
        </div>
        <Field label="Centre mark" value={el.vs} onChange={v=>update({vs:v})} />
        <div className="rs-mini" style={{ marginTop:-2 }}>Team names auto-fit and stay matched in size. Want flags or crests? Drop in Partner-logo elements over the photo.</div>
      </React.Fragment>}
      {caps.list && <React.Fragment>
        <div className="rs-sech">Heading</div>
        <Field label="Heading" value={el.heading} onChange={v=>update({heading:v})} />
        <Slider label="Heading size" val={el.headingSize!=null?el.headingSize:(el.type==='specials'?26:15)} min={11} max={56} step={1} suffix="px" onChange={v=>update({headingSize:v})} />
      </React.Fragment>}

      {/* main-text formatting */}
      {caps.size && <ScaleControl label={sizeLabel} val={el.fontSize} onChange={v=>update({fontSize:v})} />}
      {caps.sizePreset && <Chips label="Size preset" options={[{v:'lg',l:'Large'},{v:'md',l:'Medium'},{v:'sm',l:'Small'}]}
        value={el.fontSize>=40?'lg':el.fontSize>=30?'md':'sm'}
        onChange={v=>update(v==='lg'?{fontSize:46,h:170}:v==='md'?{fontSize:32,h:120}:{fontSize:26,h:84})} />}
      {caps.weight && <Chips label="Weight" options={WEIGHTS} value={el.weight!=null?el.weight:defWeight} onChange={v=>update({weight:v})} />}
      {isText && <Slider label="Letter spacing" val={el.letterSpacing!=null?el.letterSpacing:lsDefault} min={-0.05} max={0.6} step={0.005} onChange={v=>update({letterSpacing:v})} suffix="em" />}
      {caps.lineHeight && <Slider label="Line spacing" val={el.lineHeight!=null?el.lineHeight:caps.lineHeight.def} min={caps.lineHeight.min} max={caps.lineHeight.max} step={0.05} onChange={v=>update({lineHeight:v})} />}
      {/* the text types already sit under their own Text/Name section; the list
          and composite blocks don't, so give the dial a home of its own */}
      {caps.align && !caps.size && <div className="rs-sech">Alignment</div>}
      {caps.align && <Chips label="Align" options={[{v:'left',l:'Left'},{v:'center',l:'Center'},{v:'right',l:'Right'}]} value={inset.align} onChange={v=>update({align:v})} />}
      {caps.align && inset.applies &&
        <Slider label={'Edge offset · from the '+inset.side} val={inset.val} min={0} max={inset.max} step={1}
          onChange={v=>update({textInset:v})} suffix="px" />}
      {caps.align && caps.list && <div className="rs-mini" style={{ margin:'-2px 0 8px' }}>Aligns the heading and row text. Two-column rows (name · time) keep their columns — that spread is the layout.</div>}
      {caps.orient && <Chips label="Orientation" options={[{v:'h',l:'Horizontal'},{v:'v',l:'Vertical'}]} value={el.orient||'h'} onChange={v=>update({orient:v})} />}
      {caps.surface && !caps.list && <Swatches label={el.type==='host'?'Name colour':el.type==='wordmark'?'Wordmark colour':'Text colour'} value={el.textColor!=null?el.textColor:el.color}
        onChange={v=>update({textColor:v})} autoTitle="Auto — stays readable on the surface" />}

      {/* ===================== SUBTEXT ===================== */}
      {caps.subtitle && <React.Fragment>
        <div className="rs-sech">Subtitle</div>
        <Field label="Subtitle — sits in the title box" value={el.subtitle||''} onChange={v=>update({subtitle:v})} area />
        {(el.subtitle||'').trim()
          ? <React.Fragment>
              <Chips label="Spacing to title" options={[{v:'tight',l:'Tight'},{v:'snug',l:'Snug'},{v:'roomy',l:'Roomy'},{v:'split',l:'Top / bottom'}]} value={el.subLayout||'snug'} onChange={v=>update({subLayout:v})} />
              <ScaleControl label={'Subtitle size'+(isOutput?' · '+activeLabel+' only':'')} val={el.subSize!=null?el.subSize:30} onChange={v=>update({subSize:v})} />
              <Chips label="Subtitle weight" options={WEIGHTS_MONT} value={el.subWeight||600} onChange={v=>update({subWeight:v})} />
              <Slider label="Subtitle tracking" val={el.subTracking!=null?el.subTracking:0.02} min={-0.05} max={0.6} step={0.005} onChange={v=>update({subTracking:v})} suffix="em" />
              <Swatches label="Subtitle colour" value={el.subColor!=null?el.subColor:'fg'} onChange={v=>update({subColor:v})} autoTitle="Auto — follows the title" />
            </React.Fragment>
          : <div className="rs-mini" style={{ marginTop:-2 }}>Add a line to sit under the title, inside the same box.</div>}
      </React.Fragment>}
      {el.type==='host' && <React.Fragment>
        <div className="rs-sech">Kicker</div>
        <Field label="Kicker (optional)" value={el.kicker} onChange={v=>update({kicker:v})} />
        <Swatches label="“Hosted by” colour" value={el.kickerColor!=null?el.kickerColor:'fg'} onChange={v=>update({kickerColor:v})} autoTitle="Auto — the poster accent" autoBg={AP_PAL[doc.accent]} />
      </React.Fragment>}
      {caps.list && <React.Fragment>
        <div className="rs-sech">Rows</div>
        {(el.type==='lineup'||el.type==='specials') && <React.Fragment>
          <div className="rs-lab">Items</div>
          {el.items.map((it,i)=>(
            <div className="rs-itemrow" key={i}>
              <input className="rs-input" value={el.type==='lineup'?it.n:it.l}
                onChange={e=>{ const items=el.items.slice(); items[i]=el.type==='lineup'?{...it,n:e.target.value}:{...it,l:e.target.value}; setItems(items); }} />
              <input className="rs-input" style={{ maxWidth:80 }} value={el.type==='lineup'?it.t:it.p}
                onChange={e=>{ const items=el.items.slice(); items[i]=el.type==='lineup'?{...it,t:e.target.value}:{...it,p:e.target.value}; setItems(items); }} />
              <button onClick={()=>setItems(el.items.filter((_,j)=>j!==i))}>×</button>
            </div>
          ))}
          <button className="rs-addrow" onClick={()=>setItems([...el.items, el.type==='lineup'?{n:'New act',t:'00:00'}:{l:'Item',p:'₫0'}])}>+ Add row</button>
          <div style={{ height:10 }} />
        </React.Fragment>}
        {el.type==='sessions' && <React.Fragment>
          <div className="rs-row">
            <div className="rs-lab">Sessions — one per line</div>
            <textarea className="rs-area" style={{ minHeight:160 }} value={el.raw} spellCheck={false}
              placeholder={'001 — Session title — 3.6.26'}
              onChange={e=>update({ raw:e.target.value })} />
          </div>
          <div className="rs-mini" style={{ margin:'2px 0 8px' }}>Paste columns split by <b>tabs, dashes or 2+ spaces</b> — date, time, a label and the fixture, in any order. End a line with a symbol (<b>&lt;</b> <b>~</b> …) to tag its category below.</div>
        </React.Fragment>}
        {el.type==='agenda' && <React.Fragment>
          <div className="rs-lab">Days — colour follows the weekday</div>
          {el.items.map((it,i)=>(
            <div key={i} style={{ marginBottom:8, paddingBottom:8, borderBottom:'1px solid rgba(120,110,90,.14)' }}>
              <div className="rs-itemrow">
                <input className="rs-input" style={{ maxWidth:104 }} placeholder="Day" value={it.day||''}
                  onChange={e=>{ const items=el.items.slice(); items[i]={...it,day:e.target.value}; setItems(items); }} />
                <input className="rs-input" placeholder="Event" value={it.name||''}
                  onChange={e=>{ const items=el.items.slice(); items[i]={...it,name:e.target.value}; setItems(items); }} />
                <input className="rs-input" style={{ maxWidth:64 }} placeholder="Time" value={it.time||''}
                  onChange={e=>{ const items=el.items.slice(); items[i]={...it,time:e.target.value}; setItems(items); }} />
                <button onClick={()=>setItems(el.items.filter((_,j)=>j!==i))}>×</button>
              </div>
              <input className="rs-input" style={{ marginTop:4, width:'100%' }} placeholder="Description (optional)" value={it.desc||''}
                onChange={e=>{ const items=el.items.slice(); items[i]={...it,desc:e.target.value}; setItems(items); }} />
            </div>
          ))}
          <button className="rs-addrow" onClick={()=>setItems([...el.items, {day:'Monday',name:'New event',time:'19:00',desc:''}])}>+ Add day</button>
          <div className="rs-mini" style={{ margin:'2px 0 8px' }}>Each day auto-colours by the weekly schedule — <b>Mon</b> green · <b>Tue</b> blue · <b>Wed</b> purple · <b>Thu</b> pink · <b>Fri</b> red · <b>Sat</b> amber · <b>Sun</b> yellow.</div>
          <div style={{ height:6 }} />
        </React.Fragment>}
        <Chips label="Row size" options={ROW_SIZES} value={el.rowSize||0} onChange={v=>update({rowSize:v})} />
        <Chips label="Row weight" options={WEIGHTS_MONT} value={el.rowWeight||700} onChange={v=>update({rowWeight:v})} />
        <Slider label="Row tracking" val={el.rowTracking!=null?el.rowTracking:(el.type==='specials'?0.03:0.01)} min={-0.05} max={0.4} step={0.005} suffix="em" onChange={v=>update({rowTracking:v})} />
        <Slider label="Line spacing" val={el.rowGap!=null?el.rowGap:(el.type==='specials'?5:7)} min={0} max={24} step={1} suffix="px" onChange={v=>update({rowGap:v})} />
        <Swatches label="Row text colour" value={el.textColor!=null?el.textColor:el.color} onChange={v=>update({textColor:v})} autoTitle="Auto — stays readable on the surface" />
        {el.type==='sessions' && (()=>{
          const marks = window.parseSessions(el.raw).reduce((a,r)=>{ if(r.marker && a.indexOf(r.marker)<0) a.push(r.marker); return a; }, []);
          if(!marks.length) return <div className="rs-mini" style={{ marginTop:6 }}>Tip: end a line with a symbol — <b>&lt;</b>, <b>~</b>, <b>^</b>, <b>●</b> — to tag it. Name + colour the categories here once they appear, and rows get a dot + a legend.</div>;
          const DEFCAT=['blue','green','pink','amber','purple','red','yellow'];
          return <React.Fragment>
            <div className="rs-lab" style={{ marginTop:8 }}>Categories — line-end markers</div>
            {marks.map(m=>{
              const k=(el.markerKey&&el.markerKey[m])||{};
              const setK=(patch)=>update({ markerKey: Object.assign({}, el.markerKey||{}, { [m]: Object.assign({}, k, patch) }) });
              const cur=k.color||DEFCAT[marks.indexOf(m)%7];
              return <div key={m} style={{ marginBottom:8 }}>
                <div className="rs-itemrow">
                  <span style={{ flex:'none', width:24, textAlign:'center', fontFamily:'Montserrat', fontWeight:800 }}>{m}</span>
                  <input className="rs-input" placeholder="Name (e.g. Projector)" value={k.name||''} onChange={e=>setK({name:e.target.value})} />
                </div>
                <div className="rs-swatches" style={{ marginTop:4 }}>
                  {AP_INKS.map(a=>(<div key={a} className={'rs-sw'+(cur===a?' on':'')} title={inkTitle(a)} style={{ background:AP_PAL[a] }} onClick={()=>setK({color:a})} />))}
                </div>
              </div>;
            })}
          </React.Fragment>;
        })()}
      </React.Fragment>}
    </React.Fragment>
  );
}

/* ---------- topbar ---------- */
function Topbar({ doc, setDoc, count, overrideCount, resetFormat, onExport, exporting, exportMsg, cloudUser, onCloudSignIn, onCloudSignOut, onExportToEvent }){
  const isOutput = doc.activeFormat!=='master';
  const hasCloud = typeof window!=='undefined' && !!window.RCloud;
  /* Poster name is held locally while typing and committed on blur/Enter/Save —
     committing per keystroke would re-render the riso canvases on every key. */
  const [name, setName] = React.useState(doc.title||'');
  React.useEffect(()=>{ setName(doc.title||''); }, [doc.title]);
  const commit = ()=> setDoc(d=> d.title===name ? d : ({...d, title:name}));
  const slug = slugify(name) || 'reality-poster';
  const kind = doc.exportFormat||'png';
  const printDef = (AP_FMT[doc.activeFormat]||{}).print;   // A1 / standee print-res descriptor
  const scope = isOutput ? AP_FMT[doc.activeFormat].label+' only' : 'All formats';
  const outName = isOutput
    ? `${storyStem(doc.activeFormat, slug, doc.accent)}.${kind}`
    : (kind==='pdf' ? `${slugify(name)? slug+'-poster' : 'reality-posters'}.pdf`
                    : `${slugify(name)? slug+'-poster' : 'reality-posters'}.zip`);
  return (
    <div className="rs-top">
      <div className="rs-brand">Reality<small>POSTER STUDIO</small></div>
      <div className="rs-tgroup"><span className="gl">View</span>
        <div className="rs-seg">
          <button className={'master'+(doc.activeFormat==='master'?' on':'')} onClick={()=>setDoc(d=>({...d, activeFormat:'master'}))}>
            Master<small>SOURCE</small>
          </button>
        </div>
        <div className="rs-seg">
          {AP_OUT.filter(fmt=>fmt!=='a4').map(fmt=>(
            <button key={fmt} className={doc.activeFormat===fmt?'on':''} onClick={()=>setDoc(d=>({...d, activeFormat:fmt}))}>
              {AP_FMT[fmt].label}<small>{AP_FMT[fmt].sub}</small>
            </button>
          ))}
        </div>
        {/* Print options — A4 / A1 XL / standees / handouts collapsed into one menu
            to save menubar space. A4 stays in the Save-All bundle; the rest are
            on-demand print views captured at true print resolution. */}
        <select className={'rs-stsel'+(['a4','a1'].concat(AP_STD).concat(AP_HND).indexOf(doc.activeFormat)>=0?' on':'')}
          aria-label="Print options"
          value={['a4','a1'].concat(AP_STD).concat(AP_HND).indexOf(doc.activeFormat)>=0 ? doc.activeFormat : ''}
          onChange={e=>{ if(e.target.value) setDoc(d=>({...d, activeFormat:e.target.value})); }}
          title="Print outputs — A4, A1 XL, roll-up standees, and handout flyers. A4 rides the Save-All bundle; the rest are on-demand at true print resolution (PDF as a real-world mm page a shop runs 1:1).">
          <option value="">Print options…</option>
          <option value="a4">{AP_FMT['a4'].label} · {AP_FMT['a4'].sub}</option>
          <option value="a1">{AP_FMT['a1'].label} · {AP_FMT['a1'].sub}</option>
          <optgroup label="Standees">{AP_STD.map(fmt=>(<option key={fmt} value={fmt}>{AP_FMT[fmt].label} cm</option>))}</optgroup>
          <optgroup label="Handouts">{AP_HND.map(fmt=>(<option key={fmt} value={fmt}>{AP_FMT[fmt].label}</option>))}</optgroup>
        </select>
        {isOutput && <button className="rs-iconbtn" disabled={!overrideCount} onClick={resetFormat}
          title="Clear all overrides for this format">↺ {overrideCount||0}</button>}
      </div>
      <div className="rs-tgroup"><span className="gl">Palette</span>
        <div className="rs-seg">
          {[{v:'day',l:'Day'},{v:'night',l:'Night'}].map(o=>(
            <button key={o.v} className={doc.theme===o.v?'on':''} onClick={()=>setDoc(d=>({...d, theme:o.v}))}>{o.l}</button>
          ))}
        </div>
      </div>
      <div className="rs-tgroup"><span className="gl">Accent</span>
        <div className="rs-swatches">
          {AP_ABYDAY.map(a=>{ const di=apAccentDay(a); return (
            <div key={a} className={'rs-sw'+(doc.accent===a?' on':'')} style={{ background:AP_PAL[a], width:22, height:22 }}
              onClick={()=>setDoc(d=>({...d, accent:a}))}
              title={(di? di.n+' · '+di.abbr+' — ' : '') + a + (AP_DAYS[a] ? ' (' + AP_DAYS[a] + '’s colour on the weekly schedule)' : '')} />
          ); })}
        </div>
      </div>
      <div className="spacer" />
      <div className="rs-tgroup"><span className="gl">{exporting? (exportMsg||'Exporting…') : 'Export'}</span>
        <input className="rs-tname" placeholder="Poster name…" value={name} spellCheck={false}
          onChange={e=>setName(e.target.value)} onBlur={commit}
          onKeyDown={e=>{ if(e.key==='Enter'){ commit(); e.currentTarget.blur(); } }}
          title='Names the exported files — "Board Game Night" → board-game-night-4x5.png' />
        <select className="rs-tsel" value={kind} disabled={exporting} aria-label="Image format"
          onChange={e=>{ const v=e.target.value; setDoc(d=>({...d, exportFormat:v})); }}>
          <option value="png">PNG</option>
          <option value="jpg">JPG</option>
          <option value="pdf">PDF</option>
        </select>
        <button className="rs-savebtn" disabled={exporting} onClick={()=>{ commit(); onExport(name); }}
          title={(printDef
            ? `Print-resolution ${AP_FMT[doc.activeFormat].label} — ${Math.round(printDef.wmm/25.4*printDef.dpi)}px wide (${printDef.dpi} dpi)`+(kind==='pdf'?`, a true ${printDef.wmm}×${printDef.hmm}mm PDF a shop runs 1:1`:'')
            : isOutput
              ? 'Export the format you’re viewing'
              : 'Master view — export all five formats'+(kind==='pdf'?' as one PDF':' as a ZIP'))+' → '+outName}>
          Save Images<small>{scope}</small>
        </button>
      </div>
      {/* WP9: cloud sync + poster write-back. Hidden entirely if RCloud failed to
          load; otherwise a sign-in toggle + an "Export to event…" affordance.
          Sign-in/out and the picker are fully best-effort (no-op when dormant). */}
      {hasCloud && <div className="rs-tgroup"><span className="gl">Cloud</span>
        {cloudUser
          ? <React.Fragment>
              <button className="rs-iconbtn on" disabled={exporting} onClick={onExportToEvent}
                title="Send this poster's 4:5 / 9:16 / 1:1 to an event's poster slots">→ Event</button>
              <button className="rs-iconbtn" onClick={onCloudSignOut}
                title={'Signed in as '+cloudUser+' — click to sign out (stays local-only)'}>Sign out</button>
            </React.Fragment>
          : <button className="rs-iconbtn" onClick={onCloudSignIn}
              title="Sign in to the REALITY hub to sync drafts/templates and export to events">Sign in</button>}
      </div>}
      <button className={'rs-iconbtn'+(doc.showGrid?' on':'')} onClick={()=>setDoc(d=>({...d,showGrid:!d.showGrid}))}>Grid</button>
      <button className={'rs-iconbtn'+(doc.snap?' on':'')} onClick={()=>setDoc(d=>({...d,snap:!d.snap}))}>Snap</button>
      <span className="gl" style={{ fontFamily:'Montserrat', fontWeight:700, letterSpacing:'.1em', fontSize:9, color:'#6f6553' }}>{count} EL</span>
    </div>
  );
}

/* ---------- app ---------- */
function App(){
  const [doc, setDoc] = React.useState(loadDoc);
  const [selectedIds, setSelectedIds] = React.useState([]);
  const selectedId = selectedIds.length ? selectedIds[selectedIds.length-1] : null;  // primary (last clicked)
  const [scale, setScale] = React.useState(0.4);
  const [spawn, setSpawn] = React.useState(null);
  const [tplOpen, setTplOpen] = React.useState(false);
  const [dayOpen, setDayOpen] = React.useState({});   // My-templates day sub-menus (by accent → weekday)
  const [exporting, setExporting] = React.useState(false);
  const [plateOnly, setPlateOnly] = React.useState(false);   // image-only/text-less render for the 'feed' slot
  const [sliceMode, setSliceMode] = React.useState(false);   // editing the feed-slice band
  const setFeedSlice = (s)=>setDoc(d=>({ ...d, feedSlice:s }));
  const [exportMsg, setExportMsg] = React.useState('');

  /* Shift-click adds/removes; a plain click selects one. */
  function select(id, additive){
    if(id==null){ setSelectedIds([]); return; }
    setSelectedIds(prev => additive
      ? (prev.includes(id) ? prev.filter(x=>x!==id) : [...prev, id])
      : (prev.length===1 && prev[0]===id ? prev : [id]));
  }
  const stageRef = React.useRef(null);
  const canvasRef = React.useRef(null);
  const scaleRef = React.useRef(scale); scaleRef.current = scale;

  const viewFormat = doc.activeFormat==='master' ? doc.masterFormat : doc.activeFormat;
  const isOutput = doc.activeFormat!=='master';
  const activeLabel = AP_FMT[viewFormat].label;
  const docRef = React.useRef(doc); docRef.current = doc;

  React.useEffect(()=>{ try{ localStorage.setItem(LS_KEY, JSON.stringify(doc)); }catch(e){} }, [doc]);

  /* ---- WP9 cloud sign-in state (best-effort; localStorage stays the source of
     truth). `cloudUser` is just for the toolbar label; null = local-only. ---- */
  const [cloudUser, setCloudUser] = React.useState(()=>{ try{ return window.RCloud && window.RCloud.isSignedIn() ? (window.RCloud.currentEmail()||'signed in') : null; }catch(e){ return null; } });
  async function cloudSignIn(){
    try{
      if(!window.RCloud) return;
      const t = await window.RCloud.signIn();
      const email = t ? (window.RCloud.currentEmail()||'signed in') : null;
      setCloudUser(email);
      // on connect: migrate THIS browser's templates UP to the account, then pull any
      // the account has that this browser lacks. Both best-effort; never throw.
      if(email && window.RStore){
        try{ if(window.RStore.cloudPushAll) await window.RStore.cloudPushAll(); }catch(e){}
        try{ if(window.RStore.cloudPull){ const all = await window.RStore.cloudPull();
          if(Array.isArray(all)) setUserTpls(all.slice().sort((a,b)=>(b.savedAt||0)-(a.savedAt||0))); } }catch(e){}
      }
    }catch(e){ /* never throws into render */ }
  }
  function cloudSignOut(){ try{ if(window.RCloud) window.RCloud.signOut(); }catch(e){} setCloudUser(null); }

  /* ---- WP9 working-doc cloud sync — beside the localStorage autosave above.
     Debounced ~2s push of the working doc to studio_documents (poster/working).
     localStorage is the offline source of truth; this is purely additive and
     fully guarded (RCloud no-ops when signed-out / hub dormant). ---- */
  const cloudPushRef = React.useRef(null);
  React.useEffect(()=>{
    if(!cloudUser || !window.RCloud) return;
    if(cloudPushRef.current) clearTimeout(cloudPushRef.current);
    cloudPushRef.current = setTimeout(()=>{
      try{ window.RCloud.putDoc('poster','working', docRef.current.title||'', docRef.current, Date.now()); }catch(e){}
    }, 2000);
    return ()=>{ if(cloudPushRef.current) clearTimeout(cloudPushRef.current); };
  }, [doc, cloudUser]);

  /* On mount (and on sign-in), if the cloud has a working doc saved AFTER this
     session loaded the local copy, offer a one-line confirm before replacing
     (last-write-wins, no merge). We compare against the session start: a cloud
     doc newer than that came from another device/tab. Guarded so a hub error
     can't disturb the app. */
  const sessionStartRef = React.useRef(Date.now());
  const cloudPullDoneRef = React.useRef(false);
  React.useEffect(()=>{
    if(!cloudUser || !window.RCloud || cloudPullDoneRef.current) return;
    cloudPullDoneRef.current = true;
    let live = true;
    (async()=>{
      try{
        const remote = await window.RCloud.getDoc('poster','working');
        if(!live || !remote) return;
        const remoteAt = typeof remote.updatedAt==='number' ? remote.updatedAt : Date.parse(remote.updatedAt||'')||0;
        let remoteDoc = remote.json;
        if(typeof remoteDoc==='string'){ try{ remoteDoc = JSON.parse(remoteDoc); }catch(e){ remoteDoc = null; } }
        if(remoteDoc && remoteDoc.elements && remoteAt > sessionStartRef.current){
          if(window.confirm('A newer Poster Studio working draft was found in the cloud. Load it? (Replaces what’s on screen.)')){
            setDoc(d=>Object.assign({}, d, remoteDoc));
            setSelectedIds([]);
          }
        }
      }catch(e){ /* local-only on any failure */ }
    })();
    return ()=>{ live=false; };
  }, [cloudUser]);

  /* Delete / Backspace removes the selected element(s) — but not while you're
     typing in an inspector field. */
  const selIdsRef = React.useRef(selectedIds); selIdsRef.current = selectedIds;
  /* kept current each render (assigned below, once sel / updateEl exist) so the
     window-level paste handler always sees the live selection + edit routing. */
  const selRef = React.useRef(null);
  const updateElRef = React.useRef(null);
  React.useEffect(()=>{
    function onKey(e){
      if(e.key!=='Delete' && e.key!=='Backspace') return;
      const ids = selIdsRef.current; if(!ids.length) return;
      const ae = document.activeElement;
      if(ae && (ae.tagName==='INPUT' || ae.tagName==='TEXTAREA' || ae.tagName==='SELECT' || ae.isContentEditable)) return;
      e.preventDefault();
      setDoc(d=>{ const overrides=Object.assign({}, d.overrides);
        Object.keys(overrides).forEach(f=>{ let fo=overrides[f]; if(!fo) return; let changed=false;
          ids.forEach(id=>{ if(fo[id]){ if(!changed){ fo=Object.assign({},fo); changed=true; } delete fo[id]; } });
          if(changed) overrides[f]=fo; });
        return {...d, elements:d.elements.filter(e=>ids.indexOf(e.id)<0), overrides};
      });
      setSelectedIds([]);
    }
    window.addEventListener('keydown', onKey);
    return ()=>window.removeEventListener('keydown', onKey);
  }, []);

  /* Ctrl/⌘-V over a selected photo replaces its image — same downscale → JPEG
     pipeline as the upload button. Ignored while typing in an inspector field,
     or when the selection isn't a photo (so text paste is never hijacked). */
  React.useEffect(()=>{
    function onPaste(e){
      const el = selRef.current;
      if(!el || el.type!=='photo') return;
      const ae = document.activeElement;
      if(ae && (ae.tagName==='INPUT' || ae.tagName==='TEXTAREA' || ae.tagName==='SELECT' || ae.isContentEditable)) return;
      const file = imageFromClipboard(e.clipboardData);
      if(!file) return;
      e.preventDefault();
      processImageFile(file, src=>{ const fn=updateElRef.current; if(fn) fn(el.id, { src }); });
    }
    window.addEventListener('paste', onPaste);
    return ()=>window.removeEventListener('paste', onPaste);
  }, []);

  React.useLayoutEffect(()=>{
    function recompute(){
      const s = stageRef.current; if(!s) return;
      const pad = 96, f = AP_FMT[viewFormat];
      setScale(Math.min((s.clientWidth-pad)/f.w, (s.clientHeight-pad)/f.h));
    }
    recompute();
    const ro = new ResizeObserver(recompute);
    if(stageRef.current) ro.observe(stageRef.current);
    return ()=>ro.disconnect();
  }, [viewFormat]);

  /* resolved elements for the current view */
  const resolved = React.useMemo(()=> doc.activeFormat==='master'
    ? doc.elements.map(e=>Object.assign({}, e, {_overridden:false}))
    : apResolve(doc, doc.activeFormat)
  , [doc]);
  const sel = resolved.find(e=>e.id===selectedId) || null;
  selRef.current = sel;
  const overrideCount = isOutput ? Object.keys((doc.overrides[doc.activeFormat])||{}).length : 0;

  /* routed edit: content → master, layout → per-format override */
  function updateEl(id, patch){
    if(doc.activeFormat==='master'){
      setDoc(d=>({ ...d, elements:d.elements.map(e=>e.id===id?{...e,...patch}:e) }));
      return;
    }
    const fmt = doc.activeFormat, layout={}, content={};
    Object.keys(patch).forEach(k=> (AP_LK.indexOf(k)>=0?layout:content)[k]=patch[k]);
    setDoc(d=>{
      let elements=d.elements;
      if(Object.keys(content).length) elements = elements.map(e=>e.id===id?{...e,...content}:e);
      let overrides=d.overrides;
      if(Object.keys(layout).length){
        const fo = Object.assign({}, overrides[fmt]||{});
        fo[id] = Object.assign({}, fo[id]||{}, layout);
        overrides = Object.assign({}, overrides, {[fmt]:fo});
      }
      return { ...d, elements, overrides };
    });
  }
  const update = (patch)=> sel && updateEl(sel.id, patch);
  updateElRef.current = updateEl;

  function resetOverride(id){
    const fmt = doc.activeFormat;
    setDoc(d=>{ const fo=Object.assign({}, d.overrides[fmt]||{}); delete fo[id]; return {...d, overrides:Object.assign({}, d.overrides, {[fmt]:fo})}; });
  }
  function resetFormat(){
    const fmt = doc.activeFormat;
    setDoc(d=>{ const ov=Object.assign({}, d.overrides); delete ov[fmt]; return {...d, overrides:ov}; });
  }
  function toggleHidden(id, val){ updateEl(id, { hidden:val }); }

  const del = ()=>{ const ids=selectedIds; if(!ids.length) return;
    setDoc(d=>{ const overrides=Object.assign({}, d.overrides);
      Object.keys(overrides).forEach(f=>{ let fo=overrides[f]; if(!fo) return; let changed=false;
        ids.forEach(id=>{ if(fo[id]){ if(!changed){ fo=Object.assign({},fo); changed=true; } delete fo[id]; } });
        if(changed) overrides[f]=fo; });
      return {...d, elements:d.elements.filter(e=>ids.indexOf(e.id)<0), overrides};
    }); setSelectedIds([]);
  };
  const dup = ()=>{ if(!sel) return; const mEl=doc.elements.find(e=>e.id===sel.id); if(!mEl) return;
    const c=Object.assign(JSON.parse(JSON.stringify(mEl)), {id:window.uid(), x:mEl.x+40, y:mEl.y+40});
    setDoc(d=>({ ...d, elements:[...d.elements, c] })); setSelectedIds([c.id]);
  };
  /* Layer order. A number steps one place; 'front'/'back' jump the whole way
     (the ▲▼ buttons alone made burying a full-bleed shape a lot of clicking). */
  const layer = (dir)=>{ if(!sel) return; setDoc(d=>{
    const arr=d.elements.slice(); const i=arr.findIndex(e=>e.id===sel.id); if(i<0) return d;
    if(dir==='front'||dir==='back'){
      const [it]=arr.splice(i,1);
      if(dir==='front') arr.push(it); else arr.unshift(it);
      return {...d, elements:arr};
    }
    const j=i+dir; if(j<0||j>=arr.length) return d;
    const tmp=arr[i]; arr[i]=arr[j]; arr[j]=tmp; return {...d, elements:arr};
  }); };
  const clearAll = ()=>{ if(confirm('Remove all elements from the poster?')){ setDoc(d=>({...d, elements:[], overrides:{}, eventRef:null})); setSelectedIds([]); } };

  /* ============================================================
     ARRANGE — align · distribute · centre on canvas.

     All three read the RESOLVED boxes (what you actually see in the
     format on screen) and write back through updateEl, so the edit is
     routed exactly like dragging a box: in Master it moves Master, in
     an output format it lands as that format's override.

     Deliberately NOT snapped to the grid even when Snap is on — the
     whole point of "centre" and "distribute" is the exact number, and
     rounding it to the 54px step would put it visibly off.
     ============================================================ */
  function selBoxes(){ return selectedIds.map(id=>resolved.find(e=>e.id===id)).filter(Boolean); }

  /* Align to a shared edge/line — the Swiss vertical (and horizontal).
     Operates on the selection's own bounding box. */
  function alignSel(axis, mode){
    const items = selBoxes();
    if(items.length<2) return;
    const x0=Math.min(...items.map(e=>e.x)), x1=Math.max(...items.map(e=>e.x+e.w));
    const y0=Math.min(...items.map(e=>e.y)), y1=Math.max(...items.map(e=>e.y+e.h));
    items.forEach(e=>{
      if(axis==='x'){
        const nx = mode==='left'? x0 : mode==='right'? x1-e.w : (x0+x1)/2 - e.w/2;
        updateEl(e.id, { x: Math.round(nx) });
      } else {
        const ny = mode==='top'? y0 : mode==='bottom'? y1-e.h : (y0+y1)/2 - e.h/2;
        updateEl(e.id, { y: Math.round(ny) });
      }
    });
  }

  /* Distribute — the two extremes stay put and everything between them is
     respaced. Two readings, because they differ the moment the boxes aren't
     the same size:
       'gaps'    even GAPS between edges — what the eye reads as even rhythm
                 for a row of mixed-width chips.
       'centres' even spacing of CENTRES — what you want when the boxes are
                 icons/marks on a grid and the gaps should vary.
     Needs 3+ (with 2 there is nothing between the extremes to move). */
  function distributeSel(axis, mode){
    const items = selBoxes();
    if(items.length<3) return;
    const P = axis==='x' ? 'x' : 'y', S = axis==='x' ? 'w' : 'h';
    const sorted = items.slice().sort((a,b)=> (a[P]+a[S]/2) - (b[P]+b[S]/2));
    if(mode==='centres'){
      const c0 = sorted[0][P]+sorted[0][S]/2;
      const last = sorted[sorted.length-1];
      const c1 = last[P]+last[S]/2;
      const step = (c1-c0)/(sorted.length-1);
      sorted.forEach((e,i)=>{ if(i===0||i===sorted.length-1) return;
        updateEl(e.id, { [P]: Math.round(c0 + i*step - e[S]/2) }); });
    } else {
      const start = Math.min(...sorted.map(e=>e[P]));
      const end   = Math.max(...sorted.map(e=>e[P]+e[S]));
      const span  = sorted.reduce((n,e)=>n+e[S], 0);
      const gap   = (end - start - span) / (sorted.length - 1);   // may go negative on overlaps — that's the honest result
      let cur = start;
      sorted.forEach((e,i)=>{
        if(i && i<sorted.length-1) updateEl(e.id, { [P]: Math.round(cur) });
        cur += e[S] + gap;
      });
    }
  }

  /* Centre on the canvas. One box centres itself; several centre as a GROUP —
     the selection's bounding box lands on the canvas centre and every box
     keeps its place within it. (The safe square is itself centred on the
     canvas, so canvas-centre and safe-centre are the same point — no second
     control needed.) */
  function centreSel(axis){
    const items = selBoxes();
    if(!items.length) return;
    const f = AP_FMT[viewFormat];
    const x0=Math.min(...items.map(e=>e.x)), x1=Math.max(...items.map(e=>e.x+e.w));
    const y0=Math.min(...items.map(e=>e.y)), y1=Math.max(...items.map(e=>e.y+e.h));
    const dx = f.w/2 - (x0+x1)/2, dy = f.h/2 - (y0+y1)/2;
    items.forEach(e=>{
      const patch = {};
      if(axis!=='y') patch.x = Math.round(e.x + dx);
      if(axis!=='x') patch.y = Math.round(e.y + dy);
      updateEl(e.id, patch);
    });
  }

  /* spawn-drag from library — always adds to Master (mapped from drop point) */
  function startSpawn(e, item){
    e.preventDefault();
    const type = item.type, preset = item.preset||null;
    setSpawn({ type:item.label||type, x:e.clientX, y:e.clientY });
    function mv(ev){ setSpawn(s=> s?{...s, x:ev.clientX, y:ev.clientY}:s); }
    function up(ev){
      window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up);
      setSpawn(null);
      const st = stageRef.current, cv = canvasRef.current; if(!st||!cv) return;
      const sr = st.getBoundingClientRect();
      if(ev.clientX<sr.left||ev.clientX>sr.right||ev.clientY<sr.top||ev.clientY>sr.bottom) return;
      const cr = cv.getBoundingClientRect(), sc = scaleRef.current, d = AP_DEF[type], dd = docRef.current;
      const pw = (preset&&preset.w!=null)?preset.w:d.w, ph = (preset&&preset.h!=null)?preset.h:d.h;
      let vx = (ev.clientX-cr.left)/sc - pw/2, vy = (ev.clientY-cr.top)/sc - ph/2;
      if(dd.snap){ vx=Math.round(vx/window.STEP)*window.STEP; vy=Math.round(vy/window.STEP)*window.STEP; }
      const vf = dd.activeFormat==='master'?dd.masterFormat:dd.activeFormat;
      const m = apToMaster(type, vx, vy, dd.masterFormat, vf);
      const el = apMake(type, Math.round(m.x), Math.round(m.y));
      if(preset) Object.assign(el, JSON.parse(JSON.stringify(preset)));
      setDoc(x=>({ ...x, elements:[...x.elements, el] }));
      setSelectedIds([el.id]);
    }
    window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up);
  }

  /* load a starting layout (replaces the current elements) */
  function applyTemplate(tpl){
    if(docRef.current.elements.length &&
       !window.confirm('Replace the current poster with the “'+tpl.name+'” layout?')) return;
    const built = apBuildTpl(tpl);
    /* keep the template's authored per-format nudges (they used to be dropped
       here), and detach any event link — this is a fresh, unqueued poster */
    setDoc(d=>({ ...d, masterFormat:'4x5', activeFormat:'master', overrides:built.overrides||{},
      elements:built.elements, theme:built.theme, accent:built.accent, eventRef:null }));
    setSelectedIds([]);
  }

  function dismissQueueItem(ev){
    const k = queueKey(ev); if(!k) return;
    const next = Object.assign({}, queueDismissed, { [k]: Date.now() });
    setQueueDismissed(next); storeQueueDismissed(next);
  }

  /* Click a queue row → the Classic starter prefilled with the event's name,
     day accent, time, host and price, linked to the event (doc.eventRef) so the
     cloud send offers it first and a template save claims it off the queue. */
  function applyQueueItem(ev){
    const title = ev.title_en || ev.title_vi || 'Untitled event';
    if(docRef.current.elements.length &&
       !window.confirm('Replace the current poster with a starter for “'+title+'”?')) return;
    const tpl = (AP_TPL||[]).find(t=>t.id==='talk-classic') || (AP_TPL||[])[0];
    if(!tpl) return;
    const built = apBuildTpl(tpl);
    const di = feedDayIdx(ev.startsAt);
    const accent = di!=null ? AP_ABYDAY[di] : built.accent;
    /* weekly series read "THU · 19:00"; one-offs pin the date: "THU 9.7 · 19:00" */
    const when = ((di!=null?AP_DABBR[di].toUpperCase():'')
      + (ev.seriesId ? '' : ' '+feedDayLabel(ev.startsAt)) + ' · ' + feedTime(ev.startsAt)).trim();
    /* Fill every box the feed can populate: the day·time chip, the host credit,
       and the price chip. Host keeps the template placeholder when the event has
       none; cost reads "Free" when the event carries no price (the feed's null
       cost means free — matching the app's own event page). */
    built.elements.forEach(el=>{
      if(el.type==='title'){ el.text = title; el.fontSize = queueTitleSize(title); }
      if(el.type==='when'){ el.text = when; el.w = 460; }
      if(el.type==='host' && ev.host){ el.name = ev.host; }
      if(el.type==='cost'){ el.text = ev.cost ? ev.cost : 'Free'; }
    });
    setDoc(d=>({ ...d, masterFormat:'4x5', activeFormat:'master', overrides:built.overrides||{},
      elements:built.elements, theme:built.theme, accent, title,
      eventRef:{ id:ev.id, key:queueKey(ev), title, startsAt:ev.startsAt, cost:ev.cost||null } }));
    setSelectedIds([]);
  }


  /* ---- My templates — save / load / delete full poster snapshots.
     The library lives in IndexedDB (window.RStore) — room for gigabytes, so
     it no longer hits localStorage's ~5MB wall. On first load it copies any
     old localStorage library in and keeps that copy untouched as a backup;
     if IndexedDB is unavailable it falls back to showing the localStorage
     copy read-only so nothing is ever hidden. ---- */
  const [userTpls, setUserTpls] = React.useState([]);
  const [tplReady, setTplReady] = React.useState(false);
  React.useEffect(()=>{ let live=true; (async()=>{
    try{
      const m = await window.RStore.migrate();
      let all = await window.RStore.tplGetAll();
      /* WP9: migrate this browser's library UP to the account, then pull any cloud
         templates this browser is missing. IndexedDB stays the source of truth —
         both calls never throw and no-op when signed-out / hub dormant. */
      try{ if(window.RStore.cloudPushAll) await window.RStore.cloudPushAll(); }catch(e){}
      try{ if(window.RStore.cloudPull){ const merged = await window.RStore.cloudPull(); if(Array.isArray(merged)&&merged.length>=all.length) all = merged; } }catch(e){}
      all.sort((a,b)=>(b.savedAt||0)-(a.savedAt||0));
      if(!live) return;
      setUserTpls(all);
      if(m && m.migrated) console.info('[studio] moved '+m.migrated+' template(s) into IndexedDB; the old localStorage copy is kept as a backup.');
    }catch(e){
      console.error('[studio] IndexedDB template store unavailable — showing the localStorage copy read-only.', e);
      if(live) setUserTpls(loadUserTpls());
    }finally{ if(live) setTplReady(true); }
  })(); return ()=>{ live=false; }; }, []);

  /* ---- In queue — app-calendar events that still need a poster ----
     Anonymous public feed read (no sign-in). An event queues while it has no
     image in any poster slot, no saved template claiming it (tpl.eventId), and
     hasn't been dismissed here. Weekly series collapse to their next instance.
     The fetch is unclamped so the ?event= deep link can find far-out events;
     the visible queue clamps to the next QUEUE_DAYS days. */
  const QUEUE_DAYS = 35;
  const [queueOpen, setQueueOpen] = React.useState(true);
  const [queueFeed, setQueueFeed] = React.useState(null);   // null=loading | { events, err }
  const [queueDismissed, setQueueDismissed] = React.useState(loadQueueDismissed);
  const [queueSent, setQueueSent] = React.useState({});     // keys postered this session
  /* One transient blip (weak wifi, the hub mid-redeploy) must not read as "no
     feed" for the rest of the session — retry a couple of times with a pause
     before giving up. The picker also gets a manual Retry button. */
  async function fetchFeedRetry(params, tries){
    tries = tries || 3;
    for(let i=0;i<tries;i++){
      const fd = window.RCloud && window.RCloud.fetchFeed ? await window.RCloud.fetchFeed(params) : null;
      if(fd && Array.isArray(fd.events)) return fd;
      if(i < tries-1) await new Promise(r=>setTimeout(r, 1200*(i+1)));
    }
    return null;
  }
  React.useEffect(()=>{ let live=true; (async()=>{
    try{
      if(!window.RCloud || !window.RCloud.fetchFeed){ setQueueFeed({ events:[], err:'unavailable' }); return; }
      const from = new Date(Date.now()+7*3600*1000).toISOString().slice(0,10);   // today, ICT
      const fd = await fetchFeedRetry({ from });
      if(!live) return;
      setQueueFeed(fd && Array.isArray(fd.events) ? { events:fd.events, err:null } : { events:[], err:'unavailable' });
    }catch(e){ if(live) setQueueFeed({ events:[], err:'unavailable' }); }
  })(); return ()=>{ live=false; }; }, []);

  const queueItems = React.useMemo(()=>{
    const evs = (queueFeed && queueFeed.events) || [];
    if(!evs.length) return [];
    const claimed = {}; userTpls.forEach(t=>{ if(t && t.eventId) claimed[t.eventId]=1; });
    const horizon = new Date(Date.now()+7*3600*1000 + QUEUE_DAYS*86400000).toISOString().slice(0,10);
    const hasPoster = ev=>{ const p=(ev&&ev.posters)||{}; return !!(p.poster4x5||p.feed||p.square1x1||p.story); };
    /* posterStaleAt (hub 0033): something the ARTWORK prints changed after this
       poster was made — the name, the host, the price, or the day/time — so the
       poster now advertises the old one. Such events re-queue even though they
       have a poster; only a dismissal NEWER than the change (a later change
       re-surfaces) or a poster sent this session clears them. */
    const staleAt = ev=>{ const t=Date.parse((ev&&ev.posterStaleAt)||''); return isNaN(t)?0:t; };
    const done = ev=>{ const k=queueKey(ev); const st=staleAt(ev);
      if(st) return !!(queueSent[k] || (queueDismissed[k]||0) > st);
      return !!(hasPoster(ev) || claimed[k] || queueDismissed[k] || queueSent[k]); };
    /* One row per series — the earliest ELIGIBLE instance. (Any-eligible-shows,
       not any-done-hides: after a rename only the stamped instances re-open, and
       one fresh instance with the old poster must not silence the whole series.) */
    const bySeries = {}, out = [];
    evs.forEach(ev=>{
      if(!ev || !ev.id || !ev.startsAt) return;
      if(done(ev) || feedDate(ev.startsAt) > horizon) return;
      if(ev.seriesId){
        const s = bySeries[ev.seriesId] || (bySeries[ev.seriesId] = { first:null });
        if(!s.first || ev.startsAt < s.first.startsAt) s.first = ev;
        return;
      }
      out.push(ev);
    });
    Object.keys(bySeries).forEach(k=>{ out.push(bySeries[k].first); });
    out.sort((a,b)=> a.startsAt < b.startsAt ? -1 : 1);
    return out;
  }, [queueFeed, userTpls, queueDismissed, queueSent]);

  /* ?event=<id> deep link (the app's "Open in Poster Studio") — once the feed
     lands, load that event's starter directly. */
  const deepLinkDoneRef = React.useRef(false);
  React.useEffect(()=>{
    if(deepLinkDoneRef.current || !queueFeed) return;
    deepLinkDoneRef.current = true;
    try{
      const id = new URLSearchParams(window.location.search).get('event');
      if(!id) return;
      const ev = (queueFeed.events||[]).find(e=>e.id===id);
      if(ev) applyQueueItem(ev);
      else if(queueFeed.err) window.alert('Couldn’t reach the events feed to open that event — check the connection and reload.');
      else window.alert('That event isn’t in the public feed yet (draft or unpublished) — publish it in the app, then try again.');
    }catch(e){ /* never disturb the app over a deep link */ }
  }, [queueFeed]);
  async function saveUserTpl(){
    const d = docRef.current;
    if(!d.elements.length){ window.alert('Nothing on the poster to save yet.'); return; }
    const name = (window.prompt('Save this poster as a template called:', d.title || 'My layout') || '').trim();
    if(!name) return;
    const existing = userTpls.find(t=>t.name.toLowerCase()===name.toLowerCase());
    if(existing && !window.confirm('A template called “'+existing.name+'” already exists. Replace it?')) return;
    const snap = JSON.parse(JSON.stringify({ elements:d.elements, overrides:d.overrides||{},
      masterFormat:d.masterFormat, theme:d.theme, accent:d.accent, title:d.title||'',
      eventRef:d.eventRef||null }));
    /* eventId claims the queue entry that spawned this poster — saving files the
       template under its day and takes the event off "In queue". Saving always
       lands the template in the active library (never straight into Archive). */
    const t = { id: existing? existing.id : window.uid(), name, savedAt: Date.now(),
      eventId: (d.eventRef && d.eventRef.key) || (existing && existing.eventId) || null,
      archived: false, doc: snap };
    try{ await window.RStore.tplPut(t); }
    catch(e){ console.error(e); window.alert('Couldn’t save the template — the browser blocked writing to storage. Your other templates are unaffected.'); return; }
    setUserTpls(existing ? userTpls.map(p=>p.id===t.id? t : p) : [t, ...userTpls]);
  }
  function applyUserTpl(t){
    if(docRef.current.elements.length &&
       !window.confirm('Replace the current poster with “'+t.name+'”?')) return;
    const snap = JSON.parse(JSON.stringify(t.doc));
    /* fresh element ids (and remapped overrides) so the loaded copy can never
       collide with anything else made this session */
    const idMap = {};
    snap.elements.forEach(e=>{ const nid=window.uid(); idMap[e.id]=nid; e.id=nid; });
    const overrides = {};
    Object.keys(snap.overrides||{}).forEach(f=>{ const fo=snap.overrides[f]||{}; const nfo={};
      Object.keys(fo).forEach(id=>{ if(idMap[id]) nfo[idMap[id]]=fo[id]; }); overrides[f]=nfo; });
    setDoc(d=>({ ...d, activeFormat:'master', masterFormat:snap.masterFormat||'4x5',
      elements:snap.elements, overrides, theme:snap.theme, accent:snap.accent,
      title: snap.title || d.title,
      /* restore the template's own event link (or none) — never inherit the
         previous poster's, or the cloud send would offer the wrong event */
      eventRef: snap.eventRef || null }));
    setSelectedIds([]);
  }
  /* Archive / restore — archived templates leave the day-filed library and sit
     in the collapsible Archive drawer below it. The flag rides the same record
     (and its cloud mirror), so nothing about storage changes shape. */
  async function setTplArchived(id, val){
    const t = userTpls.find(x=>x.id===id); if(!t) return;
    const next = Object.assign({}, t, { archived: !!val });
    try{ await window.RStore.tplPut(next); }
    catch(e){ console.error(e); window.alert('Couldn’t update that template right now — try again.'); return; }
    setUserTpls(userTpls.map(x=>x.id===id? next : x));
  }
  async function delUserTpl(id){
    const t = userTpls.find(x=>x.id===id);
    if(t && !window.confirm('Delete the template “'+t.name+'”?')) return;
    try{ await window.RStore.tplDelete(id); }
    catch(e){ console.error(e); window.alert('Couldn’t delete that template right now — try again.'); return; }
    setUserTpls(userTpls.filter(x=>x.id!==id));
  }

  /* ---- template portability — templates live in this browser's localStorage
     only, so Export writes the whole "My templates" list to a .json (photo
     data URLs included) and Import merges a file back in on another machine.
     Same name or id replaces; anything else is added. */
  const tplFileRef = React.useRef(null);
  function exportUserTpls(){
    if(!userTpls.length){ window.alert('No saved templates to export yet.'); return; }
    const payload = { kind:'reality-studio-templates', version:1,
      exportedAt:new Date().toISOString(), templates:userTpls };
    const blob = new Blob([JSON.stringify(payload)], { type:'application/json' });
    const url = URL.createObjectURL(blob);
    const d = new Date(), pad = n=>(n<10?'0':'')+n;
    const a = document.createElement('a'); a.href = url;
    a.download = 'reality-poster-templates-'+d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())+'.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(url), 4000);
  }
  function importUserTpls(file){
    const fr = new FileReader();
    fr.onload = async ()=>{
      let list = null;
      try{
        const data = JSON.parse(fr.result);
        list = Array.isArray(data) ? data : (data && Array.isArray(data.templates) ? data.templates : null);
      }catch(e){}
      if(!list){ window.alert('Couldn’t read that file — it doesn’t look like a Poster Studio template export.'); return; }
      const incoming = list
        .filter(t=>t && typeof t.name==='string' && t.name.trim() && t.doc && Array.isArray(t.doc.elements))
        .map(t=>({ id: t.id || window.uid(), name: t.name.trim(), savedAt: t.savedAt || Date.now(),
                   eventId: t.eventId || null, archived: !!t.archived,
                   doc: Object.assign({ masterFormat:'4x5', theme:'day', accent:'blue', overrides:{}, title:'' }, t.doc) }));
      if(!incoming.length){ window.alert('No usable templates in that file.'); return; }
      const skipped = list.length - incoming.length;
      const next = userTpls.slice(); let replaced = 0;
      incoming.forEach(t=>{
        const i = next.findIndex(p=>p.id===t.id || p.name.toLowerCase()===t.name.toLowerCase());
        if(i>=0){ next[i]=t; replaced++; } else next.unshift(t);
      });
      try{ await window.RStore.tplReplaceAll(next); }
      catch(e){ console.error(e); window.alert('Couldn’t save the imported templates to storage — nothing was changed.'); return; }
      setUserTpls(next);
      window.alert('Imported '+incoming.length+' template'+(incoming.length===1?'':'s')
        +(replaced? ' — '+replaced+' replaced an existing one':'')
        +(skipped? ' ('+skipped+' unreadable, skipped)':'')+'.');
    };
    fr.readAsText(file);
  }

  /* ---- export — Save Images. Scope follows the active view (an output format
     exports just itself; Master exports every format), the file type comes from
     the toolbar select, and filenames come from the poster name:
       "Board Game Night" →  board-game-night-4x5.png        (single format)
                             board-game-night-poster.zip     (Master, png/jpg)
                             board-game-night-poster.pdf     (Master, pdf — one page per format)
     No name falls back to the old reality-poster-* names. ---- */
  /* Wait until the on-screen canvas PROVABLY shows `fmt` before capturing: poll
     the data-fmt commit sentinel, then two rAFs (one fully painted frame), then
     the old fixed wait as a floor for the async riso photo repaint. A blind fixed
     wait loses this race on a busy main thread and the capture bakes the PREVIOUS
     format's layout into the render (the 2026-07 mixed-layout square1x1 bug). */
  async function settleFormat(fmt, floorMs){
    const until = performance.now() + 5000;
    while(performance.now() < until){
      const node = canvasRef.current;
      if(node && node.dataset && node.dataset.fmt === fmt) break;
      await new Promise(r=>setTimeout(r, 40));
    }
    /* two rAFs = one fully painted frame — but rAF never fires in a hidden/
       backgrounded tab, so race it against a timeout or the export hangs */
    await new Promise(r=>{ let done=false; const fin=()=>{ if(!done){ done=true; r(); } };
      requestAnimationFrame(()=>requestAnimationFrame(fin)); setTimeout(fin, 300); });
    await new Promise(r=>setTimeout(r, floorMs));
  }

  async function doExport(titleArg){
    if(exporting || !window.htmlToImage) return;
    const kind = doc.exportFormat || 'png';
    const slug = slugify(titleArg!=null ? titleArg : (doc.title||''));
    const base = slug || 'reality-poster';
    /* Print views (A1, standees) carry a `print:{wmm,hmm,dpi}` descriptor and
       capture at true print resolution — e.g. A1 is 3508px wide (594mm @
       150dpi), an 80×200 standee 4724px wide. The ratio rides the `exporting`
       flag as a number so riso photos and grainy blocks repaint 1:1 with the
       capture grid (no soft upscale). */
    const printDef = (AP_FMT[doc.activeFormat]||{}).print;
    const printRatio = printDef ? Math.round(printDef.wmm/25.4*printDef.dpi) / AP_FMT[doc.activeFormat].w : 0;
    setSelectedIds([]); setExporting(printRatio || true); setExportMsg('Rendering…');
    const bg = doc.theme==='night' ? '#0a0703' : '#fffbf1';
    const capture = (f, type, ratio)=>{
      const node=canvasRef.current;
      const opts={ width:f.w, height:f.h, pixelRatio:ratio||2, cacheBust:true, backgroundColor:bg,
        style:{ transform:'none', left:'0px', top:'0px', margin:'0', position:'static' } };
      return type==='jpg' ? window.htmlToImage.toJpeg(node, Object.assign({quality:0.95}, opts))
                          : window.htmlToImage.toPng(node, opts);
    };
    const dl = (href, name)=>{ const a=document.createElement('a'); a.href=href; a.download=name; document.body.appendChild(a); a.click(); a.remove(); };
    const JS = window.jspdf && window.jspdf.jsPDF;
    try{
      if(doc.activeFormat!=='master'){
        /* single format — exactly the view on screen */
        await settleFormat(viewFormat, printRatio?420:140);   // print-res riso repaints need longer
        const f=AP_FMT[viewFormat], name=storyStem(viewFormat, base, doc.accent);
        if(kind==='pdf'){
          const url=await capture(f, null, printRatio||null);
          /* Print PDFs (A1, standees) are made at real-world size in mm so a
             print shop runs them 1:1; screen formats keep the px-sized page. */
          const pdf = printDef
            ? new JS({ unit:'mm', format:[printDef.wmm,printDef.hmm], orientation: printDef.wmm>printDef.hmm?'landscape':'portrait' })
            : new JS({ unit:'px', format:[f.w,f.h], orientation: f.w>f.h?'landscape':'portrait', hotfixes:['px_scaling'] });
          /* 'FAST' = lossless FLATE on the embedded raster — without a
             compression arg jsPDF stores it raw and one page tops 20MB.
             FAST over SLOW: same pixels, ~0.7MB larger, no multi-second
             main-thread stall per page (matters for the 5-page master). */
          if(printDef) pdf.addImage(url,'PNG',0,0,printDef.wmm,printDef.hmm,undefined,'FAST');
          else pdf.addImage(url,'PNG',0,0,f.w,f.h,undefined,'FAST');
          pdf.save(name+'.pdf');
        } else {
          dl(await capture(f, kind, printRatio||null), name+'.'+kind);
        }
      } else {
        /* Master — every output format: zip of images, or one multi-page PDF */
        const prev = doc.activeFormat;
        const zip = kind!=='pdf' ? new window.JSZip() : null;
        let pdf = null;
        for(const fmt of AP_OUT){
          setExportMsg('Rendering '+AP_FMT[fmt].label+'…');
          setDoc(d=>({ ...d, activeFormat:fmt }));
          await settleFormat(fmt, 380);   // sentinel + painted frame + riso-repaint floor
          const f = AP_FMT[fmt];
          if(kind==='pdf'){
            const url = await capture(f);
            if(!pdf) pdf = new JS({ unit:'px', format:[f.w,f.h], orientation: f.w>f.h?'landscape':'portrait', hotfixes:['px_scaling'] });
            else pdf.addPage([f.w,f.h], f.w>f.h?'l':'p');
            pdf.addImage(url,'PNG',0,0,f.w,f.h,undefined,'FAST');
          } else {
            const url = await capture(f, kind);
            zip.file(storyStem(fmt, base, doc.accent)+'.'+kind, url.split(',')[1], { base64:true });
          }
        }
        setDoc(d=>({ ...d, activeFormat:prev }));
        if(kind==='pdf'){
          pdf.save((slug? slug+'-poster' : 'reality-posters')+'.pdf');
        } else {
          setExportMsg('Zipping…');
          const blob = await zip.generateAsync({ type:'blob' });
          dl(URL.createObjectURL(blob), (slug? slug+'-poster' : 'reality-posters')+'.zip');
        }
      }
    }catch(err){ console.error('export failed', err); setExportMsg('Export failed'); await new Promise(r=>setTimeout(r,1400)); }
    setExporting(false); setExportMsg('');
  }

  /* ---- WP9 poster write-back — "Export to event…". Renders the studio formats
     to blobs and POSTs them onto an event's poster slots via RCloud.putPoster
     (replacing the old Poster Manager publish loop). Format → slot:
       4x5  → poster4x5   (the designed 4:5 poster)
       9x16 → story
       1x1  → square1x1
       4x5  → feed        (the text-less FEED SLICE: a horizontal band of the image
                           only — the strip that fills the calendar's "This week" cards)
     Strictly additive: nothing here touches the local export path; all guarded.
     Photos are embedded inline as data URLs (content-addressing OUT OF SCOPE —
     TODO(WP9): content-address photos so big posters don't bloat R2). ---- */
  const EVENT_SLOTS = [
    { fmt:'4x5',  slot:'poster4x5' },
    { fmt:'9x16', slot:'story' },
    { fmt:'1x1',  slot:'square1x1' },
    { fmt:'4x5',  slot:'feed', plate:true },   // image-only / text-less render
  ];
  const [eventPicker, setEventPicker] = React.useState(null);   // null | { open, loading, events, err }
  async function openEventPicker(){
    if(!window.RCloud){ return; }
    if(!window.RCloud.isSignedIn()){
      await cloudSignIn();
      if(!window.RCloud.isSignedIn()){ window.alert('Cloud sign-in is needed to export to an event. (Stayed local-only.)'); return; }
    }
    /* the event this poster was queued for (if any) gets pinned first in the picker */
    const origin = docRef.current.eventRef || null;
    setEventPicker({ open:true, loading:true, events:[], err:null, origin });
    try{
      const today = new Date(Date.now()+7*3600*1000).toISOString().slice(0,10);   // ICT date
      const feed = await fetchFeedRetry({ from: today });
      const events = (feed && Array.isArray(feed.events)) ? feed.events : [];
      setEventPicker({ open:true, loading:false, events, err: feed ? null : 'Feed not available — the hub may be mid-deploy or the connection blipped.', origin });
    }catch(e){
      setEventPicker({ open:true, loading:false, events:[], err:'Could not load the events feed.', origin });
    }
  }
  async function exportToEvent(eventId){
    if(exporting || !window.htmlToImage || !window.RCloud) return;
    /* grab the picker's feed rows before closing it — the post-send message needs
       to know whether the target belongs to a series */
    const pickedFrom = (eventPicker && eventPicker.events) || [];
    setEventPicker(null);
    const prev = doc.activeFormat;
    setSelectedIds([]); setExporting(true);
    const bg = doc.theme==='night' ? '#0a0703' : '#fffbf1';
    const toBlob = (f)=>{
      const node=canvasRef.current;
      const opts={ width:f.w, height:f.h, pixelRatio:2, cacheBust:true, backgroundColor:bg,
        style:{ transform:'none', left:'0px', top:'0px', margin:'0', position:'static' } };
      return window.htmlToImage.toBlob(node, opts);
    };
    // The feed slice: capture only the chosen band of the 4:5 master — shift the
    // canvas up by the band's top, capture the band's height. Photo-only via plateOnly,
    // so the output is a small text-less strip (storage/bandwidth win).
    const toBlobSlice = ()=>{
      const node=canvasRef.current, f=AP_FMT['4x5'];
      const sl=doc.feedSlice||{ yFrac:0.4, hFrac:0.2 };
      const by=Math.round((sl.yFrac||0)*f.h), bh=Math.max(1, Math.round((sl.hFrac||0.2)*f.h));
      const opts={ width:f.w, height:bh, pixelRatio:2, cacheBust:true, backgroundColor:bg,
        style:{ transform:`translateY(${-by}px)`, left:'0px', top:'0px', margin:'0', position:'static' } };
      return window.htmlToImage.toBlob(node, opts);
    };
    let ok = 0, failed = 0, wideHits = 0;
    try{
      for(const m of EVENT_SLOTS){
        const label = m.plate ? 'image-only' : AP_FMT[m.fmt].label;
        setExportMsg('Rendering '+label+'…');
        if(m.plate) setPlateOnly(true);
        setDoc(d=>({ ...d, activeFormat:m.fmt }));
        await settleFormat(m.fmt, m.plate?440:380);   // sentinel + painted frame + riso-repaint floor
        let blob = null;
        try{ blob = await (m.plate ? toBlobSlice() : toBlob(AP_FMT[m.fmt])); }catch(e){ blob = null; }
        if(m.plate) setPlateOnly(false);
        if(!blob){ failed++; continue; }
        /* Downscale the 2x render to its base px and re-encode for upload. WebP by
           default; story + square1x1 stay JPEG — story for Instagram's share intake,
           square1x1 because it's the event's OG/social share image and Facebook /
           Zalo / iMessage render WebP link previews unreliably. The hub feed,
           the app, and danang.community serve THIS file — full-res PNGs remain in
           the local Save/export path. On any encode failure the raw render goes
           up unchanged, exactly as before. */
        let up = { blob, type: blob.type || 'image/png' };
        try{
          if(window.RCloud.optimizeImage){
            const f = AP_FMT[m.fmt];
            const sl = doc.feedSlice || { yFrac:0.4, hFrac:0.2 };
            const th = m.plate ? Math.max(1, Math.round((sl.hFrac||0.2)*f.h)) : f.h;
            up = await window.RCloud.optimizeImage(blob, f.w, th,
              (m.slot==='story' || m.slot==='square1x1') ? { prefer:'image/jpeg' } : undefined);
          }
        }catch(e){ /* keep the raw render */ }
        setExportMsg('Uploading '+label+'…');
        const res = await window.RCloud.putPoster(eventId, m.slot, up.blob, up.type);
        if(res && res.ok){ ok++; if(res.seriesWide) wideHits++; } else failed++;
      }
      setDoc(d=>({ ...d, activeFormat:prev }));
      if(ok){
        /* the event now has a poster — take it (and its weekly series) off the queue */
        const hit = ((queueFeed && queueFeed.events) || []).find(e=>e.id===eventId);
        const k = hit ? queueKey(hit) : eventId;
        setQueueSent(s=>Object.assign({}, s, { [k]:1 }));
      }
      /* A send onto a series instance normally stamps the whole series (the hub
         answers seriesWide). It DOESN'T when that instance is hand-edited — a
         detached date keeps its own artwork, so the other dates quietly keep the
         old poster. Say so, or it reads as "the update didn't work". */
      const target = pickedFrom.find(e=>e.id===eventId)
        || ((queueFeed && queueFeed.events) || []).find(e=>e.id===eventId);
      const oneDateOnly = ok>0 && wideHits===0 && !!(target && target.seriesId);
      setExportMsg(ok
        ? (oneDateOnly
            ? 'Sent to THIS DATE only — the rest of the series keeps its old poster'
            : ('Sent '+ok+' image'+(ok===1?'':'s')+' to the event'+(failed?(' · '+failed+' failed'):'')))
        : 'Export to event failed');
      await new Promise(r=>setTimeout(r, ok?(oneDateOnly?3400:1600):1800));
    }catch(err){
      console.error('export-to-event failed', err);
      setPlateOnly(false);
      setDoc(d=>({ ...d, activeFormat:prev }));
      setExportMsg('Export to event failed'); await new Promise(r=>setTimeout(r,1600));
    }
    setExporting(false); setExportMsg('');
  }

  return (
    <div className="rs-app">
      <Topbar doc={doc} setDoc={setDoc} count={doc.elements.length} overrideCount={overrideCount} resetFormat={resetFormat}
        onExport={doExport} exporting={exporting} exportMsg={exportMsg}
        cloudUser={cloudUser} onCloudSignIn={cloudSignIn} onCloudSignOut={cloudSignOut} onExportToEvent={openEventPicker} />
      <div className="rs-body">
        <div className="rs-lib">
          {/* ---- In queue — upcoming app events still missing a poster ---- */}
          <div className="rs-sech" onClick={()=>setQueueOpen(o=>!o)}
            style={{ cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span>In queue</span>
            <span style={{ fontSize:11, opacity:.6 }}>
              {queueItems.length>0 && <b style={{ marginRight:6 }}>{queueItems.length}</b>}{queueOpen?'▾':'▸'}
            </span>
          </div>
          {queueOpen && <React.Fragment>
            {queueFeed==null &&
              <div className="rs-mini" style={{ margin:'4px 0 10px' }}>Checking the calendar…</div>}
            {queueFeed && queueFeed.err &&
              <div className="rs-mini" style={{ margin:'4px 0 10px' }}>Couldn’t reach the events feed — the queue appears once it loads (check the connection and reload).</div>}
            {queueFeed && !queueFeed.err && queueItems.length===0 &&
              <div className="rs-mini" style={{ margin:'4px 0 10px' }}>All caught up — every event in the next {QUEUE_DAYS===35?'5 weeks':QUEUE_DAYS+' days'} has a poster.</div>}
            {queueItems.map(ev=>{
              const di = feedDayIdx(ev.startsAt);
              const accent = di!=null ? AP_ABYDAY[di] : null;
              const stale = !!ev.posterStaleAt;
              return (
                <div key={ev.id} className="rs-libitem" onClick={()=>applyQueueItem(ev)}
                  style={{ cursor:'pointer', position:'relative', paddingRight:36 }}>
                  <span className="ln" style={{ display:'flex', alignItems:'center', gap:7 }}>
                    {accent && <span style={{ width:9, height:9, borderRadius:'50%', flex:'none', background:AP_PAL[accent], border:'1px solid rgba(0,0,0,.25)' }} />}
                    <span>{ev.title_en || ev.title_vi || '(untitled)'}</span>
                    {stale && <span title="The name, host, price or day/time changed after this poster was made — the artwork still shows the old one."
                      style={{ fontSize:9, fontWeight:700, letterSpacing:.4, textTransform:'uppercase', padding:'1px 5px', border:'1px solid currentColor', borderRadius:3, opacity:.7, flex:'none' }}>out of date</span>}
                  </span>
                  {/* cost rides the feed (hub 0033) so the price makes it onto the poster */}
                  <span className="lh">{ev.seriesId?'weekly · ':''}{di!=null?AP_DABBR[di]+' ':''}{feedDayLabel(ev.startsAt)} · {feedTime(ev.startsAt)}{ev.cost?' · '+ev.cost:''} · click for a starter</span>
                  <button className="rs-tplx" title={stale?'Dismiss — keep the current poster despite the rename':'Dismiss — this event doesn’t need a poster'}
                    onClick={e=>{ e.stopPropagation(); dismissQueueItem(ev); }}>×</button>
                </div>
              );
            })}
            {queueFeed && !queueFeed.err && queueItems.length>0 &&
              <div className="rs-mini" style={{ margin:'2px 0 12px' }}>Events created in the app’s calendar that still need a poster. Click one for a prefilled Classic starter — saving it as a template, or sending the poster to the event, clears it from the queue. Events whose name, host, price or day/time changed after the poster was made re-appear (“out of date”) until a fresh poster is sent or you dismiss them.</div>}
          </React.Fragment>}
          {AP_TPL && AP_TPL.length>0 && <React.Fragment>
            <div className="rs-sech" onClick={()=>setTplOpen(o=>!o)}
              style={{ cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span>Templates</span><span style={{ fontSize:11, opacity:.6 }}>{tplOpen?'▾':'▸'}</span>
            </div>
            {tplOpen && <React.Fragment>
              <div className="rs-mini" style={{ margin:'6px 0 2px', opacity:.7 }}>My templates · filed by day (accent colour)</div>
              {!tplReady &&
                <div className="rs-mini" style={{ margin:'2px 0 6px' }}>Loading your templates…</div>}
              {tplReady && userTpls.length===0 &&
                <div className="rs-mini" style={{ margin:'2px 0 6px' }}>None yet — build a poster, then keep it here for next time.</div>}
              {/* A saved preset is filed under the weekday its accent codes for
                  (green→Mon … yellow→Sun). Each day is its own collapsible menu;
                  days start open only if they hold something. */}
              {tplReady && userTpls.length>0 && AP_DNAMES.map((day,di)=>{
                const dayAccent = AP_ABYDAY[di];
                const items = userTpls.filter(t=> !t.archived && AP_DAYS[t.doc && t.doc.accent] === day);
                const isOpen = dayOpen[day]!==undefined ? dayOpen[day] : items.length>0;
                return (
                  <React.Fragment key={day}>
                    <div className="rs-dayhdr" onClick={()=>setDayOpen(o=>({...o, [day]:!isOpen}))}
                      style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', padding:'5px 2px',
                        userSelect:'none', borderBottom:'1px solid rgba(120,110,90,.12)' }}>
                      <span style={{ width:11, height:11, borderRadius:'50%', flex:'none', background:AP_PAL[dayAccent], border:'1px solid rgba(0,0,0,.25)' }} />
                      <span style={{ fontFamily:'Montserrat', fontWeight:700, fontSize:11, letterSpacing:'.09em', textTransform:'uppercase' }}>{AP_DABBR[di]}</span>
                      <span style={{ fontSize:10, opacity:.45 }}>{day}</span>
                      <span style={{ marginLeft:'auto', fontFamily:'Montserrat', fontWeight:700, fontSize:10, opacity: items.length?0.6:0.3 }}>{items.length}</span>
                      <span style={{ fontSize:10, opacity:.55, width:10, textAlign:'center' }}>{isOpen?'▾':'▸'}</span>
                    </div>
                    {isOpen && items.map(t=>(
                      <div key={t.id} className="rs-libitem" onClick={()=>applyUserTpl(t)}
                        style={{ cursor:'pointer', position:'relative', paddingRight:60, marginLeft:11 }}>
                        <span className="ln">{t.name}</span>
                        <span className="lh">{t.doc.elements.length} parts · saved {new Date(t.savedAt).toLocaleDateString(undefined,{ day:'numeric', month:'short' })}</span>
                        <button className="rs-tplx" style={{ right:34, borderColor:'#3a2f1f', color:'#b6ab97' }} title="Archive this template — tuck it into the Archive drawer below"
                          onClick={e=>{ e.stopPropagation(); setTplArchived(t.id, true); }}>⤓</button>
                        <button className="rs-tplx" title="Delete this template"
                          onClick={e=>{ e.stopPropagation(); delUserTpl(t.id); }}>×</button>
                      </div>
                    ))}
                    {isOpen && items.length===0 &&
                      <div className="rs-mini" style={{ margin:'3px 0 5px 19px', opacity:.45 }}>Set a poster’s accent to {dayAccent} to file it here.</div>}
                  </React.Fragment>
                );
              })}
              {tplReady && userTpls.some(t=> !t.archived && !AP_DAYS[t.doc && t.doc.accent]) && (()=>{
                const items = userTpls.filter(t=> !t.archived && !AP_DAYS[t.doc && t.doc.accent]);
                const isOpen = dayOpen._other!==undefined ? dayOpen._other : true;
                return (
                  <React.Fragment>
                    <div className="rs-dayhdr" onClick={()=>setDayOpen(o=>({...o, _other:!isOpen}))}
                      style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', padding:'5px 2px',
                        userSelect:'none', borderBottom:'1px solid rgba(120,110,90,.12)' }}>
                      <span style={{ width:11, height:11, borderRadius:'50%', flex:'none', background:'transparent', border:'1px dashed rgba(120,110,90,.7)' }} />
                      <span style={{ fontFamily:'Montserrat', fontWeight:700, fontSize:11, letterSpacing:'.09em', textTransform:'uppercase' }}>Other</span>
                      <span style={{ fontSize:10, opacity:.45 }}>no day colour</span>
                      <span style={{ marginLeft:'auto', fontFamily:'Montserrat', fontWeight:700, fontSize:10, opacity:.6 }}>{items.length}</span>
                      <span style={{ fontSize:10, opacity:.55, width:10, textAlign:'center' }}>{isOpen?'▾':'▸'}</span>
                    </div>
                    {isOpen && items.map(t=>(
                      <div key={t.id} className="rs-libitem" onClick={()=>applyUserTpl(t)}
                        style={{ cursor:'pointer', position:'relative', paddingRight:60, marginLeft:11 }}>
                        <span className="ln">{t.name}</span>
                        <span className="lh">{t.doc.elements.length} parts · saved {new Date(t.savedAt).toLocaleDateString(undefined,{ day:'numeric', month:'short' })}</span>
                        <button className="rs-tplx" style={{ right:34, borderColor:'#3a2f1f', color:'#b6ab97' }} title="Archive this template — tuck it into the Archive drawer below"
                          onClick={e=>{ e.stopPropagation(); setTplArchived(t.id, true); }}>⤓</button>
                        <button className="rs-tplx" title="Delete this template"
                          onClick={e=>{ e.stopPropagation(); delUserTpl(t.id); }}>×</button>
                      </div>
                    ))}
                  </React.Fragment>
                );
              })()}
              {/* ---- Archive — templates tucked out of the day-filed library ---- */}
              {tplReady && (()=>{
                const arch = userTpls.filter(t=>t.archived);
                const isOpen = dayOpen._archive!==undefined ? dayOpen._archive : false;
                return (
                  <React.Fragment>
                    <div className="rs-dayhdr" onClick={()=>setDayOpen(o=>({...o, _archive:!isOpen}))}
                      style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', padding:'5px 2px',
                        userSelect:'none', borderBottom:'1px solid rgba(120,110,90,.12)' }}>
                      <span style={{ width:11, height:11, flex:'none', border:'1px solid rgba(120,110,90,.7)', borderRadius:2, background:'transparent' }} />
                      <span style={{ fontFamily:'Montserrat', fontWeight:700, fontSize:11, letterSpacing:'.09em', textTransform:'uppercase' }}>Archive</span>
                      <span style={{ fontSize:10, opacity:.45 }}>tucked away</span>
                      <span style={{ marginLeft:'auto', fontFamily:'Montserrat', fontWeight:700, fontSize:10, opacity: arch.length?0.6:0.3 }}>{arch.length}</span>
                      <span style={{ fontSize:10, opacity:.55, width:10, textAlign:'center' }}>{isOpen?'▾':'▸'}</span>
                    </div>
                    {isOpen && arch.length===0 &&
                      <div className="rs-mini" style={{ margin:'3px 0 5px 19px', opacity:.45 }}>Nothing archived — the ⤓ on any template tucks it away here.</div>}
                    {isOpen && arch.map(t=>(
                      <div key={t.id} className="rs-libitem" onClick={()=>applyUserTpl(t)}
                        style={{ cursor:'pointer', position:'relative', paddingRight:60, marginLeft:11, opacity:.75 }}>
                        <span className="ln">{t.name}</span>
                        <span className="lh">{t.doc.elements.length} parts · archived</span>
                        <button className="rs-tplx" style={{ right:34, borderColor:'#3a2f1f', color:'#b6ab97' }} title="Restore to My templates"
                          onClick={e=>{ e.stopPropagation(); setTplArchived(t.id, false); }}>↩</button>
                        <button className="rs-tplx" title="Delete this template"
                          onClick={e=>{ e.stopPropagation(); delUserTpl(t.id); }}>×</button>
                      </div>
                    ))}
                  </React.Fragment>
                );
              })()}
              <button className="rs-addrow" onClick={saveUserTpl} style={{ marginBottom:6, marginTop:8 }}>＋ Save current poster as template</button>
              <div className="rs-rowflex" style={{ marginBottom:6 }}>
                <button className="rs-addrow" onClick={exportUserTpls} title="Download all My templates (photos included) as one .json">⬇ Export all</button>
                <button className="rs-addrow" onClick={()=>tplFileRef.current.click()} title="Load templates from an exported .json — same names update, new names add">⬆ Import…</button>
              </div>
              <input ref={tplFileRef} type="file" accept=".json,application/json" style={{ display:'none' }}
                onChange={e=>{ const f=e.target.files[0]; if(f) importUserTpls(f); e.target.value=''; }} />
              <div className="rs-mini" style={{ margin:'0 0 12px' }}>Saved in this browser (IndexedDB — room for plenty now). Export a .json to back them up or carry them to another computer, photos and all.</div>
              {AP_TPLG.map(grp=>(
                <React.Fragment key={grp}>
                  <div className="rs-mini" style={{ margin:'6px 0 2px', opacity:.7 }}>{grp}</div>
                  {AP_TPL.filter(tp=>tp.group===grp).map(tp=>(
                    <div key={tp.id} className="rs-libitem" onClick={()=>applyTemplate(tp)} style={{ cursor:'pointer' }}>
                      <span className="ln">{tp.name}</span>
                      <span className="lh">{tp.els.length} parts · click to load</span>
                    </div>
                  ))}
                </React.Fragment>
              ))}
              <div className="rs-mini" style={{ margin:'8px 0 14px' }}>Click a template to load it (replaces the poster).</div>
            </React.Fragment>}
          </React.Fragment>}
          {AP_CAT.map(g=>(
            <React.Fragment key={g.group}>
              <div className="rs-sech">{g.group}</div>
              {g.items.map((it,i)=>(
                <div key={it.label} className="rs-libitem" onPointerDown={e=>startSpawn(e, it)}>
                  <span className="ln">{it.label}</span>
                  <span className="lh">{it.hint}</span>
                </div>
              ))}
            </React.Fragment>
          ))}

          {/* GRAPHICS — four families that differ only by one prop, so they're
              folds of silhouette grids rather than 60 more library rows. Drag a
              tile out exactly like a part; it lands with that kind preset. */}
          <div className="rs-sech">Graphics</div>
          {AP_GFX.map(g=>(
            <Fold key={g.id} id={g.id} title={g.title} open={g.open}>
              {g.groups
                ? <IconPicker value={null} onSpawn={startSpawn} />
                : <GfxGrid type={g.type} prop={g.prop} items={g.items} onSpawn={startSpawn} />}
              <div className="rs-mini" style={{ marginTop:8 }}>{g.hint}</div>
            </Fold>
          ))}

          <div className="rs-mini" style={{ marginTop:16 }}>Drag a part onto the poster — it snaps to the grid and joins the Master layout.</div>
        </div>

        <APCanvas elements={resolved} format={viewFormat} theme={doc.theme} accent={doc.accent}
          showGrid={doc.showGrid} snap={doc.snap} scale={scale} stageRef={stageRef} canvasRef={canvasRef}
          selectedId={selectedId} selectedIds={selectedIds} onSelect={select} onChange={updateEl} onCommit={()=>{}} exporting={exporting} plateOnly={plateOnly}
          sliceMode={sliceMode} feedSlice={doc.feedSlice} onSliceChange={setFeedSlice} />

        <div className="rs-inspector">
          <div className={'rs-context'+(isOutput?' out':' master')}>
            {isOutput
              ? <React.Fragment><b>{activeLabel}</b> output · layout edits override Master{overrideCount?` · ${overrideCount} overridden`:''}</React.Fragment>
              : <React.Fragment><b>Master</b> source · edits flow to every format</React.Fragment>}
          </div>
          <Inspector el={sel} doc={doc} update={update} dup={dup} del={del} layer={layer}
            clearAll={clearAll} setDoc={setDoc} isOutput={isOutput} activeLabel={activeLabel}
            resetOverride={resetOverride} toggleHidden={toggleHidden}
            selCount={selectedIds.length} align={alignSel} distribute={distributeSel} centre={centreSel}
            formatLabel={activeLabel} />
          {/* Feed slice — the text-less strip that fills the calendar's "This week"
              cards. Toggle to drag the band on the poster; sliders for precision. */}
          <div className="rs-sech" style={{ marginTop:16 }}>Feed slice</div>
          <div className="rs-mini" style={{ marginBottom:6 }}>The text-less strip used on the calendar’s “This week” cards (a thin band — far smaller than a full poster). Pick which part of the image to use.</div>
          <button className="rs-addrow" onClick={()=>{ const on=!sliceMode; setSliceMode(on);
            if(on) setDoc(d=>({ ...d, activeFormat:'master', feedSlice:d.feedSlice||{ yFrac:0.4, hFrac:0.2 } })); }}>
            {sliceMode ? '✓ Done selecting' : '◧ Select feed slice…'}</button>
          {sliceMode && <React.Fragment>
            <Slider label="Top" val={Math.round(((doc.feedSlice&&doc.feedSlice.yFrac)||0.4)*100)} min={0} max={92} step={1}
              onChange={v=>setFeedSlice({ yFrac:v/100, hFrac:(doc.feedSlice&&doc.feedSlice.hFrac)||0.2 })} suffix="%" />
            <Slider label="Height" val={Math.round(((doc.feedSlice&&doc.feedSlice.hFrac)||0.2)*100)} min={8} max={60} step={1}
              onChange={v=>setFeedSlice({ yFrac:(doc.feedSlice&&doc.feedSlice.yFrac)||0.4, hFrac:v/100 })} suffix="%" />
            <button className="rs-addrow" style={{ marginTop:6 }} onClick={()=>setFeedSlice({ yFrac:0.4, hFrac:0.2 })}>Center · 4:1 band</button>
          </React.Fragment>}
        </div>
      </div>

      {spawn && <div className="rs-ghost" style={{ left:spawn.x, top:spawn.y }}>{spawn.type}</div>}

      {eventPicker && eventPicker.open &&
        <EventPickerModal picker={eventPicker} onPick={exportToEvent} onClose={()=>setEventPicker(null)} onRetry={openEventPicker} />}
    </div>
  );
}

/* ---- WP9 event picker — lists upcoming events from the REALITY feed so the
   user can push the current poster's formats onto an event's poster slots.
   Reuses the studio's overlay/modal CSS atoms; fully additive UI. ---- */
function EventPickerModal({ picker, onPick, onClose, onRetry }){
  /* When the poster came off "In queue" (doc.eventRef), that event is pinned
     up top as the obvious one-click send; everything else lists below it.
     ONLY when the ref still names a live upcoming event: a saved template keeps
     the eventRef it was made with, so a weekly series' template can point at an
     instance from months ago. Pinning that sent Modern Jive's new poster to its
     14.07 date — long past, and detached, so the send touched that one row and
     the series kept the old artwork. The feed is loaded `from: today`, so
     "not in picker.events" is exactly "past or gone". */
  const originRef = picker.origin || null;
  const originEv = originRef ? picker.events.find(e=>e.id===originRef.id) : null;
  const origin = originEv ? originRef : null;
  const rest = origin ? picker.events.filter(e=>e.id!==origin.id) : picker.events;
  const whenOf = iso => (iso||'').slice(0,16).replace('T',' ');
  return (
    <div className="rs-overlay" onClick={onClose}
      style={{ position:'fixed', inset:0, background:'rgba(10,7,3,.55)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999 }}>
      <div className="rs-modal" onClick={e=>e.stopPropagation()}
        style={{ width:420, maxWidth:'92vw', maxHeight:'80vh', overflow:'auto', background:'#fffbf1', color:'#0d0905', borderRadius:10, padding:18, boxShadow:'0 30px 70px rgba(0,0,0,.5)' }}>
        <div style={{ fontFamily:'Montserrat', fontWeight:800, letterSpacing:'.04em', fontSize:14, marginBottom:4 }}>Export to event</div>
        <div style={{ fontSize:12, opacity:.7, marginBottom:12 }}>
          Sends 4:5 → <b>poster4x5</b>, 9:16 → <b>story</b>, 1:1 → <b>square1x1</b>, plus your text-less <b>feed slice</b> → <b>feed</b> onto the chosen event.
        </div>
        {picker.loading && <div style={{ fontSize:12, opacity:.7 }}>Loading upcoming events…</div>}
        {!picker.loading && picker.err &&
          <div style={{ fontSize:12, color:'#b00' }}>
            {picker.err}
            {onRetry &&
              <button onClick={onRetry}
                style={{ marginLeft:8, padding:'4px 10px', border:'2px solid #0d0905', background:'#fddf00', color:'#0d0905', borderRadius:6, fontFamily:'Montserrat', fontWeight:700, fontSize:11, cursor:'pointer' }}>
                Retry
              </button>}
          </div>}
        {!picker.loading && !picker.err && picker.events.length===0 && !origin &&
          <div style={{ fontSize:12, opacity:.7 }}>No upcoming events in the feed.</div>}
        {!picker.loading && origin && (
          <React.Fragment>
            <div style={{ fontFamily:'Montserrat', fontWeight:700, fontSize:10, letterSpacing:'.09em', textTransform:'uppercase', opacity:.55, margin:'2px 0 6px' }}>This poster’s event</div>
            <div onClick={()=>onPick(origin.id)}
              style={{ cursor:'pointer', padding:'10px 12px', borderRadius:6, marginBottom:10, border:'2px solid #0d0905', background:'rgba(120,110,90,.07)' }}
              onMouseEnter={e=>e.currentTarget.style.background='rgba(120,110,90,.16)'}
              onMouseLeave={e=>e.currentTarget.style.background='rgba(120,110,90,.07)'}>
              <div style={{ fontWeight:800, fontSize:13 }}>{(originEv && (originEv.title_en || originEv.title_vi)) || origin.title || '(untitled)'}</div>
              <div style={{ fontSize:11, opacity:.6 }}>{whenOf((originEv && originEv.startsAt) || origin.startsAt)}{originEv && originEv.location && originEv.location.code ? ' · '+originEv.location.code : ''}</div>
              <div style={{ fontSize:11, opacity:.75, marginTop:3 }}>↳ Send here — this poster was queued for this event.</div>
            </div>
            {rest.length>0 &&
              <div style={{ fontFamily:'Montserrat', fontWeight:700, fontSize:10, letterSpacing:'.09em', textTransform:'uppercase', opacity:.55, margin:'2px 0 6px' }}>…or another event</div>}
          </React.Fragment>
        )}
        {!picker.loading && rest.map(ev=>{
          return (
            <div key={ev.id} onClick={()=>onPick(ev.id)}
              style={{ cursor:'pointer', padding:'8px 10px', borderRadius:6, marginBottom:4, border:'1px solid rgba(120,110,90,.2)' }}
              onMouseEnter={e=>e.currentTarget.style.background='rgba(120,110,90,.08)'}
              onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
              <div style={{ fontWeight:700, fontSize:13 }}>{ev.title_en || ev.title_vi || '(untitled)'}</div>
              <div style={{ fontSize:11, opacity:.6 }}>{whenOf(ev.startsAt)}{ev.location && ev.location.code ? ' · '+ev.location.code : ''}</div>
            </div>
          );
        })}
        <div style={{ marginTop:12, textAlign:'right' }}>
          <button className="rs-addrow" onClick={onClose} style={{ display:'inline-block' }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
