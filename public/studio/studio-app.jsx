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
    /* The empty-Studio demo, re-cut onto the 90/45 frame (23.08) — it used to
       sit on 80/96/150/280/1014, none of which Snap could reach, so the first
       thing anyone dragged jumped. Text still overlaps the photo on purpose;
       every edge is just a multiple of the step now. */
    elements:[
      Object.assign(apMake('photo', 90, 90), { w:900, h:900, treatment:'duotone', frame:false }),
      apMake('when', 360, 270),
      Object.assign(apMake('title', 135, 405), { text:'Pulse\nSessions', color:'fg' }),
      Object.assign(apMake('host', 270, 720), { kicker:'On the decks', name:'DJ Milk' }),
      apMake('ticket', 90, 1125),
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

/* A template's id is a PERSISTED primary key: two records sharing one means the
   second silently overwrites the first, and there is no way back. uid() is not
   good enough for that — its counter restarts at 1 on every page load, so the
   Nth element of one session and the Nth of the next differ only by four random
   characters. Elements are fine with that (they live and die inside one doc);
   a saved poster is not. */
function tplId(){
  try{ if(window.crypto && window.crypto.randomUUID) return 'tpl_'+window.crypto.randomUUID(); }catch(e){}
  return 'tpl_'+Date.now().toString(36)+'_'
    +Math.random().toString(36).slice(2,10)+Math.random().toString(36).slice(2,10);
}
/* Newest first — the library's one order, in one place. */
function sortTpls(list){ return (list||[]).slice().sort((a,b)=>(b.savedAt||0)-(a.savedAt||0)); }

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
/* Search text for a feed row — diacritics-blind, so "cafe" finds "Philosophy
   Café" and "dem" finds "Đêm Trò Chơi". Same đ/Đ hand-map as slugify (they don't
   decompose under NFD). Both titles, the host and the room code are searchable:
   the feed runs two months out, so the picker's flat list is ~300 rows deep. */
function searchNorm(s){
  return (s||'').replace(/đ/g,'d').replace(/Đ/g,'D')
    .normalize('NFD').replace(new RegExp('[\\u0300-\\u036f]','g'),'')
    .toLowerCase();
}
function eventHaystack(ev){
  if(!ev) return '';
  return searchNorm([ev.title_en, ev.title_vi, ev.host, ev.location && ev.location.code]
    .filter(Boolean).join(' '));
}
/* Tokens AND together, so "chess night" and "night chess" both land. */
function eventMatches(ev, terms){
  if(!terms || !terms.length) return true;
  const hay = eventHaystack(ev);
  for(let i=0;i<terms.length;i++){ if(hay.indexOf(terms[i])<0) return false; }
  return true;
}
/* Does ONE poster cover the whole series, or does this date own its artwork?
   The hub answers it per event (feed v1 `posterScope`) with the same rule its
   poster write-back applies: a series date shares the series poster only while
   it is neither hand-edited nor part of a series whose content changes every
   week (Film Club, Coffee + Conversation). Hubs deployed before that field
   don't send it — fall back to the old read, where any series meant one shared
   weekly poster. */
function seriesWidePoster(ev){
  if(!ev) return false;
  if(ev.posterScope) return ev.posterScope === 'series';
  return !!ev.seriesId;
}
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
/* ---------- small controls ----------
   Field / Slider / Chips / ScaleControl / NumField / Fold come from the shared
   kit (public/studio-shared/studio-ui.jsx), the same copy Print Studio loads,
   so the two can't drift to different components again. Swatches stays local:
   its Auto/Ink/Cream trio is Poster's, not Print's K-only set. */
RUI.configure({ prefix:'rs', storeKey:'reality-studio' });
const { Field, Slider, Chips, NumField, Fold, Hint, HintsToggle } = RUI;
const ScaleControl = (p)=><RUI.ScaleControl {...p} scale={AP_SCALE} snap={apSnapScale} step={apScaleStep} suffix="px" note="snapped" />;

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
  /* when + cost are FACT chips — Space Grotesk (canon M1), so their weight
     picker is the Grotesk set, not Montserrat's. */
  when:     { text:true, font:'grot', size:true, weight:true, tracking:true, tag:true, align:true, surface:true, shadow:true, height:true },
  cost:     { text:true, font:'grot', size:true, weight:true, tracking:true, tag:true, align:true, surface:true, shadow:true, height:true },
  stamp:    { text:true, font:'mont', size:true, weight:true, tracking:true, tag:true, align:true, surface:true, shadow:true, height:true },
  /* The whole host credit is Grotesk (24.08) — lead-in AND name — so its
     weight picker is the Grotesk set, which tops out at 700. */
  host:     { text:true, font:'grot', size:true, sizePreset:true, weight:true, tracking:true, align:true, surface:true, kickerColor:true, shadow:true },
  ticket:   { align:true, surface:true, shadow:true },
  qr:       { align:true, surface:true, shadow:true },
  lineup:   { list:true, rowSize:true, align:true, surface:true, shadow:true },
  specials: { list:true, rowSize:true, align:true, surface:true, shadow:true },
  sessions: { list:true, rowSize:true, align:true, surface:true, shadow:true },
  agenda:   { list:true, rowSize:true, align:true, surface:true, shadow:true },
  badge:    { align:true, surface:true, shadow:true },
  wordmark: { surface:true, shadow:true },
  /* weekly owns its accent bar, so it takes textColor WITHOUT surface — the
     bar text needs the same Auto/override swatch every accent fill gets. */
  weekly:   { fillOwn:true, shadow:true, height:true, widthPreset:true, textColor:true },
  matchup:  { align:true, surface:true, shadow:true },
  block:    { fillOwn:true, shadow:true },
  /* ink mark — fixed canon palette: no surface, no fill, no shadow (the spec
     bans cell shadows and the whole mark stays flat). Its own panel only. */
  inkmark:  {},
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
   row at uniform height — no more delicate per-element resizing.
   Rungs are MODULE multiples (1 · 1.5 · 2 · 2.5) rather than the old
   84/120/162/220, so a tag set from this list already sits on the grid and
   Snap doesn't shift it the moment you drag it. */
const TAG_HEIGHTS = [{v:90,l:'S'},{v:135,l:'M'},{v:180,l:'L'},{v:225,l:'XL'}];

/* One shadow control for every element. Defaults + slider ranges come from the
   shared window.shadowModel, so what you see matches what renders, and a brand
   new element's shadow Just Works. Applies as a text-shadow on bare text, a
   box-shadow on a surfaced card, or a drop-shadow on artwork (photo/logo/block/
   weekly) — the model picks the mode. */
function ShadowControls({ el, update, theme }){
  const m = window.shadowModel(el, theme);
  const lift = shadowLift(el, m);
  const label = (LIFTS.find(x=>x.v===lift)||{}).l;
  // Only badge a rung you chose. "Lift" on an element whose family lifts by
  // default is the absence of a decision, and badging it says nothing.
  const deflt = m.defOn ? 'lift' : 'off';
  return (
    <Fold id="sh" title="Shadow" badge={lift===deflt?null:label} dirty={lift==='custom'?1:0}>
      <Chips label="Lift" options={LIFTS} value={lift} onChange={v=>update(applyLift(v,m))} />
      {lift==='custom' && <React.Fragment>
        <Slider label="Distance" val={m.dist} min={0} max={m.maxDist} step={1} onChange={v=>update({shadowDist:v})} suffix="px" />
        <Slider label="Direction" val={m.ang} min={-180} max={180} step={5} onChange={v=>update({shadowAngle:v})} suffix="°" />
        <Slider label="Blur" val={m.blur} min={0} max={m.maxBlur} step={1} onChange={v=>update({shadowBlur:v})} suffix="px" />
        <Slider label="Opacity" val={m.alpha} min={0.05} max={1} step={0.01} onChange={v=>update({shadowAlpha:v})} />
        <Swatches label="Shadow colour" value={m.ck} autoTitle="Auto — soft press shadow"
          onChange={v=>update(v==='fg'?{shadowColor:'fg',shadowAlpha:null}:{shadowColor:v,shadowAlpha:el.shadowAlpha!=null?el.shadowAlpha:0.9})} />
      </React.Fragment>}
      <Hint tight>
        {m.mode==='text'
          ? <span>Falls on the letters (bare text) — add a surface for a card shadow instead. <b>Hard</b> is the riso one: far, unblurred, opaque.</span>
          : <span><b>Lift</b> is this element's own default drop. <b>Hard</b> throws it further with no blur — very riso. <b>Custom</b> opens the dials.</span>}
      </Hint>
    </Fold>
  );
}
/* Reality-ticket formats — picked from the details panel (not separate
   sidebar items). Each sets the size + what's shown; content is preserved.

   The BANNER is the full-width closing band and the poster's brand carrier,
   so it comes up complete: QR shown, the canon ink SQUARE in FULL ink, and
   the column aligned right with the mark block opposite (see the banner
   renderer). markForm is pinned to 'square' rather than left on 'auto' so
   the square survives the QR being switched off — 'auto' only picks the
   square *because* a QR is there. The two slim variants stay bare; they
   exist for sheets that already carry a ticket elsewhere. */
const TICKET_FORMATS = {
  banner:   { variant:'banner',   x:0, w:1080, h:270, surface:'paper', showQR:true,
              align:'right', mark:'on', markForm:'square', markMode:'full' },
  standard: { variant:'standard',      w:900,  h:180, surface:'paper', showQR:true  },
  slim:     { variant:'slim',          w:675,  h:135, surface:'paper', showQR:false },
  mini:     { variant:'mini',          w:450,  h:90,  surface:'paper', showQR:false },
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
/* Every press, in the canon order, each carrying the Photo Guidance's own
   three lines. `tag` is what the treatment IS in four words; best/avoid are
   transcribed from the guidance card, not written here — they are what makes
   the strip teachable to somebody who has never heard of a riso. Keep them in
   step with the card if it revs. */
const TREATS = [
  {v:'duotone',l:'Duotone',tag:'two-colour sep · the default',
   best:'Faces, portraits, anything that has to stay readable.',
   avoid:'You want maximum graphic punch — go louder below.'},
  {v:'offregister',l:'Off-Reg',tag:'the signature',
   best:'Hero DJ / party shots, movement, big sizes.',
   avoid:'The photo is text-dense or printed small — fringing muddies it.'},
  {v:'halftone',l:'Halftone',tag:'newsprint grit',
   best:'Live music, crowds, high-contrast images.',
   avoid:'The photo is soft and flat — the dots vanish.'},
  {v:'posterize',l:'Banded',tag:'silkscreen flatness',
   best:'Bold, simple compositions with one clear subject.',
   avoid:'The scene is detailed — fine detail collapses.'},
  {v:'cutout',l:'Cutout',tag:'max punch',
   best:'One clear subject on a dark background; loud headlines.',
   avoid:"The background is busy — the subject won't separate."},
  {v:'overprint',l:'Overprint',tag:'wet overlap',
   best:'Texture / abstract shots, covers, two-colour richness.',
   avoid:'Literal clarity matters — it abstracts the image.'},
  {v:'spot',l:'Spot',tag:'one tone floods',
   best:'A single flare, face or lamp you want to pick out in flat ink.',
   avoid:'The tone you want is spread across the frame — it floods everything.'},
  {v:'dither',l:'Dither',tag:'1-bit zine screen',
   best:'Photocopied-flyer energy; anything that wants to look duplicated.',
   avoid:'The subject reads by colour rather than shape — there is no colour left.'},
  {v:'hatch',l:'Hatch',tag:'engraved lines',
   best:'Portraits and objects with real form — the strokes follow the light.',
   avoid:'The photo is flat or busy; the lines have nothing to describe.'},
  {v:'photocopy',l:'Copier',tag:'toner-crushed mono',
   best:'Grit, urgency, gig-poster feel. Faces survive it well.',
   avoid:'You need the midtones — this treatment is mostly about losing them.'},
  {v:'contour',l:'Contour',tag:'topographic map',
   best:'Landscapes, crowds, anything with broad tonal shapes to trace.',
   avoid:'The scene is fine-grained — smooth it hard first or it turns to noise.'},
  {v:'edges',l:'Outline',tag:'the drawing under the photo',
   best:'Strong silhouettes and architecture; anything that reads as a drawing.',
   avoid:'The light is soft — there are no edges to find.'},
  {v:'mosaic',l:'Mosaic',tag:'tiled to the ramp',
   best:'Abstraction, backgrounds, covering a photo that is not quite good enough.',
   avoid:'Anyone needs to be recognisable.'},
  {v:'none',l:'None',tag:'no plate — the photo as shot',
   best:'Checking the frame before you print it.',
   avoid:'It is going on a poster — a raw photo breaks the palette.'}
];

/* ============================================================
   HOW THE INK SITS — the press composited onto the photograph.
   ============================================================
   Strength only ever FADES a print towards the picture underneath.
   These change what the print IS: a halftone multiplied over a
   photograph keeps the photograph's own tone under the screen
   instead of replacing it, which is what a screen printed over a
   photograph actually does — and no strength setting gets there.

   Every one is a real ink behaviour before it is a compositing
   formula, and the copy says which. Ported from the app's Darkroom
   (src/lib/riso-presets.ts). */
const PRESS_BLENDS = [
  { v:'normal',     l:'Opaque',   note:'The print covers the photo. Opaque ink — the classic riso.' },
  { v:'multiply',   l:'Multiply', note:'Transparent ink over the photograph — the picture reads THROUGH the screen. The one to reach for on a halftone.' },
  { v:'screen',     l:'Screen',   note:'Ink that only ever lightens. Glows on night stock; nearly invisible on day.' },
  { v:'overlay',    l:'Overlay',  note:'Multiplies the shadows and screens the lights at once — contrast without losing either end.' },
  { v:'soft-light', l:'Soft',     note:'The gentlest of them. A tint of the treatment rather than a print of it.' },
  { v:'hard-light', l:'Hard',     note:"Overlay's opposite — the PRINT decides. Hard, poster-ish, unsubtle." },
  { v:'darken',     l:'Darken',   note:'Keeps whichever is darker. Ink lands only where it would be seen.' },
  { v:'lighten',    l:'Lighten',  note:'Keeps whichever is lighter. The night-stock twin of Darken.' }
];

/* ============================================================
   NAMED FINISHES — in the order a print acquires wear.
   ============================================================
   Named for the object, not the sliders: nobody wants "grain 0.6,
   dust 0.3, contrast 1.45", they want "off a photocopier". Each
   look is applied over the neutral stack, so switching between two
   of them can never accumulate — picking Clean really is clean.
   Ported from the app's Darkroom, which named these while this
   engine only ever had the dials. */
const FINISH_NEUTRAL = {
  finBright:0, finContrast:1, finSat:1,
  blurOver:0, blurOverType:'gauss', blurOverAngle:0, blurOverX:0, blurOverY:0, blurOverPos:0.5, blurOverWidth:0.3,
  grain:0, grainSize:2, grainInk:null, grainBlend:'soft',
  vignette:0, vignetteSoft:0.6, paperTex:0, inkBleed:0, dust:0, misprint:0, misprintAngle:-35
};
const FINISH_LOOKS = [
  { v:'clean',   l:'Clean',    p:{}, note:'No finishing — a digital print of a riso.' },
  { v:'stock',   l:'On stock', p:{ paperTex:0.45, grain:0.18 },
    note:'Paper tooth and a breath of grain. The one for anything published.' },
  { v:'pressed', l:'Pressed',  p:{ paperTex:0.5, grain:0.25, inkBleed:0.3, vignette:0.35 },
    note:'Stock, plus wet ink and an edge falloff — a print still in the room.' },
  { v:'handled', l:'Handled',  p:{ paperTex:0.55, grain:0.35, grainSize:2.5, inkBleed:0.25, vignette:0.4, dust:0.4, misprint:5 },
    note:'Dust, scratches and a mis-registered pull. A print that has been somewhere.' },
  { v:'copier',  l:'Copied',   p:{ finContrast:1.45, finSat:0.35, grain:0.6, grainSize:1.5, grainBlend:'dirty', dust:0.3, paperTex:0.3 },
    note:'Blown contrast, dirty toner grain, no subtlety left.' }
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
/* ============================================================
   NAMED LOOKS — the presets you actually reach for.
   ============================================================
   A treatment like Halftone exposes fourteen dials. Nobody sets
   a poster by moving fourteen dials; you want "newsprint" or
   "coarse" and then maybe a nudge. Each look is a patch applied
   on top of the treatment's own TREAT_PRESETS baseline, so the
   dials underneath stay honest — a look is a starting point, not
   a mode, and tuning one afterwards is expected.

   `look` is stored on the element only so the chip shows which
   one you picked; nothing renders from it. */
const TREAT_LOOKS = {
  duotone: [
    { v:'soft',    l:'Soft',        p:{ balance:0.5,  shadowTint:0.18, contrast:1.18, invert:false, hiTint:0 } },
    { v:'deep',    l:'Deep',        p:{ balance:0.38, shadowTint:0.34, contrast:1.38, invert:false, hiTint:0 } },
    { v:'split',   l:'Split tone',  p:{ balance:0.5,  shadowTint:0.2,  contrast:1.2,  hiTint:0.3, hiInk:null } },
    { v:'flip',    l:'Inverted',    p:{ balance:0.5,  shadowTint:0.18, contrast:1.18, invert:true } },
  ],
  halftone: [
    { v:'news',    l:'Newsprint',   p:{ dot:7,  angle:15, shape:'circle', dotGain:1.15, jitter:0,    field:'paper', inkMode:'single' } },
    { v:'coarse',  l:'Coarse',      p:{ dot:17, angle:45, shape:'circle', dotGain:1.2,  jitter:0,    field:'paper', inkMode:'single' } },
    { v:'ring',    l:'Ring screen', p:{ dot:13, angle:0,  shape:'ring',   dotGain:1,    jitter:0,    field:'paper', inkMode:'single' } },
    { v:'handset', l:'Hand-set',    p:{ dot:11, angle:22, shape:'square', dotGain:1.1,  jitter:0.45, field:'paper', inkMode:'single' } },
    { v:'twoink',  l:'Two-ink',     p:{ dot:9,  angle:15, shape:'circle', inkMode:'two', screenOffset:30, dotGain:1, jitter:0 } },
  ],
  offregister: [
    { v:'slip',    l:'Slip',        p:{ offset:8,  angle:45, spread:1.2,  ghost:0 } },
    { v:'miss',    l:'Wide miss',   p:{ offset:27, angle:20, spread:1.45, ghost:0 } },
    { v:'ghost',   l:'Double feed', p:{ offset:12, angle:47, spread:1.25, ghost:0.55 } },
  ],
  posterize: [
    { v:'four',    l:'Four bands',  p:{ bands:4, bandJitter:0,   toneSmooth:0 } },
    { v:'two',     l:'Two-tone',    p:{ bands:2, bandJitter:0,   toneSmooth:0 } },
    { v:'six',     l:'Six bands',   p:{ bands:6, bandJitter:0,   toneSmooth:1.4 } },
    { v:'torn',    l:'Torn',        p:{ bands:4, bandJitter:0.5, toneSmooth:3 } },
  ],
  cutout: [
    { v:'clean',   l:'Clean',       p:{ threshold:0.52, softness:0.04, cutEdge:0,    invert:false } },
    { v:'soft',    l:'Soft',        p:{ threshold:0.52, softness:0.3,  cutEdge:0,    invert:false } },
    { v:'outline', l:'Outlined',    p:{ threshold:0.52, softness:0.08, cutEdge:0.06, cutSlip:0, invert:false } },
    { v:'ground',  l:'Background',  p:{ threshold:0.52, softness:0.12, cutEdge:0,    invert:true } },
  ],
  overprint: [
    { v:'classic', l:'Classic',     p:{ offset:8,  angle:45, split:0.16, fieldTexture:0 } },
    { v:'wide',    l:'Wide split',  p:{ offset:14, angle:30, split:0.34, fieldTexture:0 } },
    { v:'rough',   l:'Textured',    p:{ offset:8,  angle:45, split:0.2,  fieldTexture:0.55 } },
  ],
  spot: [
    { v:'tone',    l:'Tone pop',    p:{ spotMode:'tone', spotLo:0.35, spotHi:0.65, spotSoft:0.08, spotBase:'duotone' } },
    { v:'hue',     l:'Colour pop',  p:{ spotMode:'hue',  spotHue:340, spotHueRange:45, spotSoft:0.1, spotBase:'duotone' } },
    { v:'raw',     l:'On the photo',p:{ spotMode:'tone', spotLo:0.35, spotHi:0.65, spotSoft:0.08, spotBase:'image' } },
  ],
  dither: [
    { v:'bayer',   l:'Bayer',       p:{ ditherMode:'bayer', ditherScale:3, ditherAngle:0 } },
    { v:'noise',   l:'Noise',       p:{ ditherMode:'noise', ditherScale:2, ditherAngle:0 } },
    { v:'coarse',  l:'Coarse',      p:{ ditherMode:'bayer', ditherScale:6, ditherAngle:0 } },
  ],
  hatch: [
    { v:'fine',    l:'Fine',        p:{ hatchSpacing:6,  hatchWeight:0.8, hatchCross:false, hatchWobble:0.1,  angle:-22 } },
    { v:'cross',   l:'Cross',       p:{ hatchSpacing:10, hatchWeight:1,   hatchCross:true,  hatchWobble:0.15, angle:-22 } },
    { v:'sketch',  l:'Sketch',      p:{ hatchSpacing:11, hatchWeight:1.4, hatchCross:false, hatchWobble:0.5,  angle:-35 } },
  ],
  photocopy: [
    { v:'clean',   l:'First gen',   p:{ toner:0.55, copyNoise:0.2,  streaks:0.12, generations:1 } },
    { v:'worn',    l:'Third gen',   p:{ toner:0.42, copyNoise:0.45, streaks:0.35, generations:3 } },
    { v:'blown',   l:'Blown out',   p:{ toner:0.75, copyNoise:0.5,  streaks:0.5,  generations:4 } },
  ],
  contour: [
    { v:'map',     l:'Map',         p:{ bands:5, contourWeight:2,   contourFill:'tint', contourTint:0.19, contourSmooth:2.2 } },
    { v:'line',    l:'Line only',   p:{ bands:6, contourWeight:1.6, contourFill:'none', contourSmooth:2.6 } },
    { v:'bold',    l:'Bold',        p:{ bands:4, contourWeight:4,   contourFill:'tint', contourTint:0.26, contourSmooth:3 } },
  ],
  edges: [
    { v:'fine',    l:'Fine',        p:{ edgeDetail:0.22, edgeThick:1.4, edgeSmooth:1.6, edgeClean:0.2, edgeBackdrop:'paper' } },
    { v:'bold',    l:'Bold',        p:{ edgeDetail:0.4,  edgeThick:3,   edgeSmooth:2,   edgeClean:0.3, edgeBackdrop:'paper' } },
    { v:'onink',   l:'On ink',      p:{ edgeDetail:0.3,  edgeThick:2,   edgeSmooth:1.6, edgeClean:0.2, edgeBackdrop:'ink' } },
  ],
  mosaic: [
    { v:'tile',    l:'Tile',        p:{ cellSize:16, mosaicDepth:4, mosaicShape:'square', mosaicGap:0.08, mosaicBond:'grid' } },
    { v:'glass',   l:'Stained glass', p:{ cellSize:26, mosaicDepth:5, mosaicShape:'circle', mosaicGap:0.18, mosaicGrout:'ink' } },
    { v:'brick',   l:'Brick',       p:{ cellSize:20, mosaicDepth:4, mosaicShape:'square', mosaicGap:0.1,  mosaicBond:'brick' } },
  ],
};

/* ---- shadow, as a ladder instead of six dials ----
   Print Studio has had this shape for a while (its LIFTS) and it's the right
   one: four named steps carry every shadow anyone actually places, and the
   dials stay one click away for the fifth case. The rungs are multiples of
   the type's OWN defaults (shadowModel computes those per element family), so
   "Lift" on a photo and "Lift" on a chip both look right. */
const LIFTS = [{v:'off',l:'Flat'},{v:'light',l:'Light'},{v:'lift',l:'Lift'},{v:'heavy',l:'Hard'},{v:'custom',l:'Custom'}];
function shadowLift(el, m){
  if(el.shadowLift) return el.shadowLift;
  // Posters saved before the ladder existed: read the rung back off the dials.
  if(!m.on) return 'off';
  const touched = el.shadowDist!=null || el.shadowBlur!=null || el.shadowAngle!=null
               || el.shadowAlpha!=null || !!el.shadowColor;
  return touched ? 'custom' : 'lift';
}
function applyLift(v, m){
  // null clears an override — shadowModel then falls back to the type default,
  // which is exactly what "Lift" means.
  const clear = { shadowDist:null, shadowBlur:null, shadowAngle:null, shadowAlpha:null, shadowColor:null };
  if(v==='off')   return Object.assign({ shadowLift:'off',   shadowOn:false }, clear);
  if(v==='light') return Object.assign({ shadowLift:'light', shadowOn:true }, clear, { shadowDist:Math.max(1,Math.round(m.dDef*0.55)), shadowBlur:m.bDef });
  if(v==='lift')  return Object.assign({ shadowLift:'lift',  shadowOn:true }, clear);
  if(v==='heavy') return Object.assign({ shadowLift:'heavy', shadowOn:true }, clear, { shadowDist:Math.round(m.dDef*2.2), shadowBlur:0, shadowAlpha:0.9 });
  return { shadowLift:'custom', shadowOn:true };
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
/* ============================================================
   TREATMENT STRIP — every press, live on YOUR photo.
   ============================================================
   Fourteen words in a row of chips ask you to already know what
   "Overprint" looks like. Fourteen thumbnails of the photo in your
   hand do not. Ported from the app's Darkroom, which puts the same
   strip first because picking the press IS the first decision.

   A thumbnail previews the CLICK, not the current state: each one
   renders its treatment at the TREAT_PRESETS baseline the chip
   would apply, over your paper, inks, framing and exposure. So it
   shows what you would actually get, and nudging a halftone's dot
   size does not turn the chooser into a second preview.

   Sizes in this engine are design px on a 520-wide frame, so a dot
   covers the same fraction of a 128px thumbnail as of a 900px
   render — the strip is honest at any width. 128 is simply where
   fourteen of them stop costing anything: about a quarter of one
   full photo render, behind a debounce that a slider drag resets.
   ============================================================ */
const THUMB_W = 128;
const THUMB_DEBOUNCE_MS = 200;
function TreatmentStrip({ el, inkKey, theme, onPick }){
  const refs = React.useRef({});
  /* Everything a thumbnail is a preview OF. risoSig covers every engine dial
     (the per-treatment ones are overridden by the patch, so they only ever
     redraw the same image — cheap, and it can never go stale); the rest is
     what lives outside it: the source, the framing, and the ink. */
  const sig = [window.risoSig?window.risoSig(el):'', el.src, el.src2, el.sample, el.type,
    inkKey, theme, el.imgScale, el.imgX, el.imgY, el.imgRot,
    el.img2Scale, el.img2X, el.img2Y, el.img2Rot, Math.round((el.h/el.w)*1000)].join('|');
  React.useEffect(()=>{
    if(!window.RISO || !window.photoSources || !window.drawPhotoPress) return;
    let alive=true;
    const timer=setTimeout(()=>{
      window.photoSources(el).then(([s1,s2])=>{
        if(!alive || !s1) return;
        const H=Math.max(24, Math.round(THUMB_W*(el.h/el.w)));
        for(let i=0;i<TREATS.length;i++){
          const key=TREATS[i].v, cv=refs.current[key];
          if(!cv) continue;
          cv.width=THUMB_W; cv.height=H;
          /* the engine's globals are set inside drawPhotoPress and consumed
             synchronously by render(), so these fourteen calls cannot
             interleave with the poster's own press */
          window.drawPhotoPress(cv, el, inkKey, theme, s1, s2,
            Object.assign({ treatment:key }, TREAT_PRESETS[key]||{}));
        }
      });
    }, THUMB_DEBOUNCE_MS);
    return ()=>{ alive=false; clearTimeout(timer); };
  }, [sig]);
  return (
    <div className="rs-gfxgrid rs-treatgrid">
      {TREATS.map(tr=>(
        <button key={tr.v} type="button" title={tr.l+' — '+tr.tag}
          className={'rs-gfxtile'+(el.treatment===tr.v?' on':'')} onClick={()=>onPick(tr.v)}>
          <canvas className="tp" ref={c=>{ refs.current[tr.v]=c; }} />
          <span className="gl">{tr.l}</span>
        </button>
      ))}
    </div>
  );
}
function PhotoControls({ el, update, theme, accent }){
  const t = el.treatment;
  const tDef = TREATS.find(x=>x.v===t);
  const pressLabel = tDef? tDef.l : t;
  /* The ink the press will actually run, resolved exactly the way the canvas
     resolves it — so a thumbnail in the strip is never a different colour from
     the photo on the poster. */
  const inkKey = el.followAccent ? (accent||'pink') : (el.ink||'pink');
  const pickTreat = v=>update(Object.assign({ treatment:v, look:null }, TREAT_PRESETS[v]||{}));
  /* The press's own grade, in the under-layer's prop names — what the photo
     showing through is graded by while the two are joined. */
  const pressGrade = { underBright:el.brightness||0, underContrast:el.contrast!=null?el.contrast:1,
    underSat:el.saturation!=null?el.saturation:1, underHue:el.hue||0, underTemp:el.temperature||0 };
  /* Whether any of the photograph survives the print at all. Opaque ink at full
     strength everywhere leaves none of it, and the engine skips the whole
     composite in that case — so the panel says so rather than offering dials
     that cannot move anything. */
  const photoShowsThrough = (el.treatStrength!=null && el.treatStrength<1)
    || (el.treatWhere && el.treatWhere!=='all') || ((el.treatBlend||'normal')!=='normal');
  const blendDef = PRESS_BLENDS.find(b=>b.v===(el.treatBlend||'normal'));
  /* The named finish this stack IS — measured against the whole neutral set, so
     it can never claim "Pressed" about a print that merely shares one dial with
     it. Undefined once you tune off one, which is the honest answer. */
  const finishLook = FINISH_LOOKS.find(f=>{
    const want=Object.assign({}, FINISH_NEUTRAL, f.p);
    return Object.keys(FINISH_NEUTRAL).every(k=>(el[k]==null?FINISH_NEUTRAL[k]:el[k])===want[k]);
  });
  const finishCount = [el.blurOver>0, el.grain>0, el.vignette>0, el.paperTex>0, el.inkBleed>0, el.dust>0, el.misprint>0,
                       !!el.finBright, el.finContrast!=null&&el.finContrast!==1, el.finSat!=null&&el.finSat!==1].filter(Boolean).length;
  const nBands = Math.max(2, (el.bands|0)||4);
  const setBandInk = (i,v)=>{ const arr=[]; for(let b=0;b<nBands;b++) arr.push((el.bandInks&&el.bandInks[b])||null); arr[i]=v; update({ bandInks:arr }); };
  /* mosaic shares bandInks with posterize (same dark→light order), sized by its depth */
  const nMosaic = Math.max(2, Math.min(6, (el.mosaicDepth|0)||4));
  const setMosaicInk = (i,v)=>{ const arr=[]; for(let b=0;b<nMosaic;b++) arr.push((el.bandInks&&el.bandInks[b])||null); arr[i]=v; update({ bandInks:arr }); };

  /* The named looks for whatever press is selected, and how far off its preset
     the dials currently sit. TREAT_PRESETS[t] is exactly "what choosing this
     treatment sets", so deviation from it is exactly "you tuned it" — no second
     list to keep in step. */
  const looks = TREAT_LOOKS[t] || [];
  const activeLook = looks.find(x=>x.v===el.look);
  const photoBase = (AP_DEF[el.type]||{}).props || {};
  /* The baseline the Tune badge counts against is "the treatment, plus whatever
     named look is selected". Picking Deep is a choice you made ONE click ago and
     can see highlighted — counting its three dials as tuning would badge the
     fold for doing exactly what the chip above says it did. */
  const pressBase = Object.assign({}, photoBase, TREAT_PRESETS[t]||{}, activeLook?activeLook.p:{});
  const pressDirty = RUI.dirtyCount(el, Object.keys(TREAT_PRESETS[t]||{}), pressBase);
  const adjustDirty = RUI.dirtyCount(el, ['brightness','contrast','saturation','hue','temperature','blurUnder'], pressBase);
  const frameDirty = RUI.dirtyCount(el, ['imgScale','imgX','imgY','imgRot','frame','bleed','bleedBottom','fit'], photoBase);
  /* The second grade only counts while it is switched on. Turning comp off
     leaves the dials where you left them — so flipping back and forth doesn't
     lose the grade — and a badge that kept counting them would be claiming
     something is set that changes nothing on the poster. */
  const blendDirty = RUI.dirtyCount(el, ['treatStrength','treatWhere','treatBlend','compOrig'].concat(
    el.compOrig ? ['underBright','underContrast','underSat','underHue','underTemp'] : []), photoBase);
  return (
    <React.Fragment>
      <Fold id="ph-img" title="Image" open>
        <PhotoUpload onPick={src=>update({ src })} />
        <Hint tight>…or copy an image anywhere and paste it here with <b>Ctrl-V</b> / <b>⌘V</b>.</Hint>
        {el.type==='logo'
          ? <React.Fragment>
              <Chips label="Background" options={[{v:true,l:'Transparent'},{v:false,l:'Paper'}]} value={el.transparent!==false} onChange={v=>update({ transparent:v })} />
              {el.transparent===false && <Swatches label="Paper fill" value={el.paperFill!=null?el.paperFill:'fg'} onChange={v=>update({paperFill:v})} autoTitle="Auto — paper" autoBg={theme==='night'?'#0a0703':'#fffbf1'} />}
              <Hint tight>PNG transparency is kept and the whole mark is shown (contain-fit). Pick a treatment below only if you want to riso it.</Hint>
            </React.Fragment>
          : <Chips label="Or a sample" options={[{v:'spotlight',l:'DJ'},{v:'crowd',l:'Crowd'},{v:'portrait',l:'Portrait'}]}
              value={el.src?null:el.sample} onChange={v=>update({ sample:v, src:null })} />}
      </Fold>

      <Fold id="ph-mix" title="Second exposure" badge={el.src2?'on':null}>
        {!el.src2 && <Hint tight>Blend a second image into the source — the press treats the two as one photo.</Hint>}
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
        {/* A logo with no file has nothing to develop, so it keeps the words. */}
        {(el.type==='logo' && !el.src)
          ? <Chips options={TREATS} value={el.treatment} onChange={pickTreat} />
          : <TreatmentStrip el={el} inkKey={inkKey} theme={theme} onPick={pickTreat} />}
        {tDef && tDef.tag && <Hint tight>
          <b>{tDef.tag}</b> · <b>Best for</b> {tDef.best} <b>Avoid when</b> {tDef.avoid}
        </Hint>}
        {/* The variants of this press worth a name. Picking one patches the
            dials below — it isn't a mode, so nudging afterwards is fine and
            the chip simply stops being highlighted. */}
        {looks.length>0 &&
          <Chips label="Look" options={looks} value={el.look||null}
            onChange={v=>{ const L=looks.find(x=>x.v===v); update(Object.assign({ look:v }, L?L.p:{})); }} />}

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

        {/* Where the print meets the photograph underneath it. Its own fold
            because it is now three separate decisions plus a second grade —
            and because it auto-opens the moment any of them is set, so a
            composited photo never hides behind a collapsed head. */}
        {t!=='none' && <Fold id="ph-blend" title="Blend with photo" dirty={blendDirty}
          hint={<React.Fragment><b>Strength</b> fades the print towards the photo, <b>Where</b> feathers it into one tonal end, and <b>how the ink sits</b> changes what the print <i>is</i> — no amount of fading gets you a screen the photograph reads through.</React.Fragment>}>
          <Chips label="Where" options={[{v:'all',l:'Everywhere'},{v:'shadows',l:'Shadows'},{v:'highlights',l:'Lights'}]} value={el.treatWhere||'all'} onChange={v=>update({treatWhere:v})} />
          <Slider label="Strength" val={el.treatStrength!=null?el.treatStrength:1} min={0.1} max={1} step={0.02} onChange={v=>update({treatStrength:v})} />
          <Chips label="How the ink sits" options={PRESS_BLENDS.map(b=>({v:b.v,l:b.l,t:b.note}))}
            value={el.treatBlend||'normal'} onChange={v=>update({treatBlend:v})} />
          {blendDef && <Hint tight><b>{blendDef.l}</b> — {blendDef.note}</Hint>}

          <div className="rs-sech">The photo underneath</div>
          {/* Switching on SEEDS the second grade from the press's own, so the
              toggle itself never moves a pixel — the split starts as a copy and
              only becomes a decision when you drag one of the dials. */}
          <Chips options={[{v:false,l:'As the press saw it'},{v:true,l:'Comp over the original'}]}
            value={!!el.compOrig} onChange={v=>update(v? Object.assign({compOrig:true}, pressGrade) : {compOrig:false})} />
          {el.compOrig && !photoShowsThrough && <Hint tight>Nothing to comp over yet: at <b>full strength</b> with <b>opaque</b> ink the print covers the photo completely. Drop the strength, feather it into Shadows or Lights, or change how the ink sits.</Hint>}
          {el.compOrig
            ? <React.Fragment>
                <Slider label="Photo brightness" val={el.underBright!=null?el.underBright:0} min={-0.5} max={0.5} step={0.02} onChange={v=>update({underBright:v})} />
                <Slider label="Photo contrast" val={el.underContrast!=null?el.underContrast:1} min={0.7} max={1.9} step={0.01} onChange={v=>update({underContrast:v})} />
                <Slider label="Photo saturation" val={el.underSat!=null?el.underSat:1} min={0} max={2} step={0.02} onChange={v=>update({underSat:v})} />
                <Slider label="Photo hue shift" val={el.underHue!=null?el.underHue:0} min={-180} max={180} step={5} onChange={v=>update({underHue:v})} suffix="°" />
                <Slider label="Photo warmth" val={el.underTemp!=null?el.underTemp:0} min={-1} max={1} step={0.02} onChange={v=>update({underTemp:v})} />
                <button className="rs-addrow" onClick={()=>update(pressGrade)}>↺ Match the press again</button>
                <Hint tight>The photograph showing <b>through</b> the print, graded on its own. <b>Adjust &amp; focus</b> still decides what the press sees — so the press can read a crushed mono version while this stays a full-colour photo.{el.treatWhere && el.treatWhere!=='all' ? ' With the print landing on one tonal end only, this is where it gets interesting.' : ''}</Hint>
              </React.Fragment>
            : <Hint tight>Off, the photo under the print is the same one the press read, and <b>Adjust &amp; focus</b> grades both at once. Turn it on to split them.</Hint>}
        </Fold>}

        {/* Every dial the chosen press exposes, folded away. Choosing a
            treatment already lands on a good default (TREAT_PRESETS) and the
            Look chips above cover the variants worth naming — this is where
            you go when none of them is quite it. The badge counts how many
            dials you've moved off the preset. */}
        {t!=='none' && <Fold id="ph-press" title={'Tune · '+pressLabel} dirty={pressDirty}>
        {t==='duotone' && <React.Fragment>
          <Slider label="Tone balance" val={el.balance} min={0.1} max={0.9} step={0.01} onChange={v=>update({balance:v})} />
          <Slider label="Shadow tint" val={el.shadowTint} min={0} max={0.6} step={0.02} onChange={v=>update({shadowTint:v})} />
          <Chips label="Invert" options={[{v:false,l:'Normal'},{v:true,l:'Inverted'}]} value={el.invert} onChange={v=>update({invert:v})} />
          <InkRow label="Mid ink" value={el.midInk} onChange={v=>update({midInk:v})} autoTitle="Off — two-ink ramp" />
          <Slider label="Highlight tint" val={el.hiTint!=null?el.hiTint:0} min={0} max={0.6} step={0.02} onChange={v=>update({hiTint:v})} />
          {el.hiTint>0 && <InkRow label="Highlight ink" value={el.hiInk} onChange={v=>update({hiInk:v})} autoTitle="Auto — warm/cool partner" />}
          <Hint tight>A <b>mid ink</b> makes it a tritone; <b>highlight tint</b> split-tones the light end.</Hint>
        </React.Fragment>}
        {t==='offregister' && <React.Fragment>
          <Slider label="Offset" val={el.offset} min={0} max={40} step={1} onChange={v=>update({offset:v})} suffix="px" />
          <Slider label="Angle" val={el.angle} min={0} max={360} step={1} onChange={v=>update({angle:v})} suffix="°" />
          <Slider label="Ink spread" val={el.spread} min={0.8} max={1.8} step={0.02} onChange={v=>update({spread:v})} />
          <InkRow label="Third ink" value={el.ink3} onChange={v=>update({ink3:v})} autoTitle="Off — two passes" />
          <Slider label="Ghost hit" val={el.ghost!=null?el.ghost:0} min={0} max={1} step={0.02} onChange={v=>update({ghost:v})} />
          <Hint tight>Ghost prints a faint second impression of the main ink — the classic riso double-feed.</Hint>
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
                <Hint tight>Everything near that hue in the <b>original photo</b> floods with the accent — "make the red jacket pop".</Hint>
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
          <Hint tight>Each generation is a re-copy — harder blacks, blown highlights. Tinted stock runs the toner on coloured paper.</Hint>
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
          <Hint tight>Smoothing melts detail into clean topographic loops — push it up for a weather-map read. Slip prints the linework off-register from the fills; echo re-strikes it in a second ink.</Hint>
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
          <Hint tight>Simplify melts texture so only confident lines survive; de-speckle sweeps the leftover dust. Echo re-strikes the linework off-register in a second ink.</Hint>
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
          <Hint tight>Round and diamond tiles show the grout between them even at 0 — pick a mono grout for a stained-glass read.</Hint>
        </React.Fragment>}
        </Fold>}
      </Fold>

      <Fold id="ph-adjust" title="Adjust & focus" dirty={adjustDirty}>
        <Slider label="Brightness" val={el.brightness!=null?el.brightness:0} min={-0.5} max={0.5} step={0.02} onChange={v=>update({brightness:v})} />
        <Slider label="Contrast" val={el.contrast} min={0.7} max={1.9} step={0.01} onChange={v=>update({contrast:v})} />
        {t==='none' && <React.Fragment>
          <Slider label="Saturation" val={el.saturation!=null?el.saturation:1} min={0} max={2} step={0.02} onChange={v=>update({saturation:v})} />
          <Slider label="Hue shift" val={el.hue!=null?el.hue:0} min={-180} max={180} step={5} onChange={v=>update({hue:v})} suffix="°" />
          <Slider label="Warmth" val={el.temperature!=null?el.temperature:0} min={-1} max={1} step={0.02} onChange={v=>update({temperature:v})} />
        </React.Fragment>}
        <BlurControls el={el} update={update} prefix="blurUnder" label="Soft focus" max={24} />
        <Hint tight>Soft focus blurs the photo <b>before</b> the press — motion smears the dots along a direction, zoom rushes them outward. The <b>Finish</b> blur prints over the finished image instead.</Hint>
      </Fold>

      <Fold id="ph-finish" title="Finish" badge={finishLook && finishLook.v!=='clean' ? finishLook.l : (finishCount? String(finishCount) : null)}>
        <Chips label="Named finish" options={FINISH_LOOKS.map(f=>({v:f.v,l:f.l,t:f.note}))} value={finishLook? finishLook.v : null}
          onChange={v=>{ const f=FINISH_LOOKS.find(x=>x.v===v); if(f) update(Object.assign({}, FINISH_NEUTRAL, f.p)); }} />
        <Hint tight>{finishLook? finishLook.note : 'Tuned off a named finish — the dials below are yours.'} Picking one resets the whole stack, so two of them can never pile up.</Hint>
        <div className="rs-sech">Tone</div>
        <Slider label="Brightness" val={el.finBright!=null?el.finBright:0} min={-0.5} max={0.5} step={0.02} onChange={v=>update({finBright:v})} />
        <Slider label="Contrast" val={el.finContrast!=null?el.finContrast:1} min={0.5} max={2} step={0.02} onChange={v=>update({finContrast:v})} />
        <Slider label="Saturation" val={el.finSat!=null?el.finSat:1} min={0} max={2} step={0.02} onChange={v=>update({finSat:v})} />
        <button className="rs-addrow" onClick={()=>update({finBright:0, finContrast:1, finSat:1})}>↺ Reset tone</button>
        <Hint tight>Grades the <b>printed</b> ink — <b>Adjust &amp; focus</b> changes what the press sees instead. Unlike that pass, saturation here works under every treatment: pull it to 0 to grey off a duotone, push it up to make one ink shout.</Hint>
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
        <Hint tight>Press artifacts print over the finished image — the misprint slides the whole print off its paper.</Hint>
      </Fold>

      <Fold id="ph-frame" title="Frame & placement" dirty={frameDirty}>
        {el.type==='photo' && <React.Fragment>
          <Chips label="Full bleed" options={[{v:true,l:'Fill format'},{v:false,l:'Free size'}]} value={!!el.bleed} onChange={v=>update({bleed:v})} />
          {el.bleed && <Hint tight>Fills <b>every format</b> edge-to-edge — no resizing per format. Frame the shot with pan/zoom below.</Hint>}
        </React.Fragment>}
        <Chips label="Frame" options={[{v:true,l:'Ink border'},{v:false,l:'Bleed'}]} value={el.frame} onChange={v=>update({frame:v})} />
        {el.type==='logo' && <Hint tight>The whole logo always shows (contain). Zoom <b>below 1×</b> for more paper space around it.</Hint>}
        <Slider label="Zoom" val={el.imgScale!=null?el.imgScale:1} min={0.5} max={3} step={0.02} onChange={v=>update({imgScale:v})} suffix="×" />
        <Slider label="Pan X" val={el.imgX!=null?el.imgX:0} min={-0.5} max={0.5} step={0.01} onChange={v=>update({imgX:v})} />
        <Slider label="Pan Y" val={el.imgY!=null?el.imgY:0} min={-0.5} max={0.5} step={0.01} onChange={v=>update({imgY:v})} />
        <Slider label="Rotate" val={el.imgRot!=null?el.imgRot:0} min={-180} max={180} step={1} onChange={v=>update({imgRot:v})} suffix="°" />
        <button className="rs-addrow" onClick={()=>update({imgScale:1, imgX:0, imgY:0, imgRot:0})}>↺ Reset image</button>
      </Fold>

      {/* MASK — the same shape registry the Shape element draws from, applied
          as the photo's silhouette. Ink border follows the mask, and so does
          the shadow, so a circle photo casts a circle shadow.

          Its own fold, CLOSED by default. Eighteen shape tiles was the tallest
          block in the panel and it sat INSIDE "Frame & placement", pushing
          Zoom / Pan / Rotate off-screen on every photo — and most photos never
          take a mask. The head badge names the active mask, so a set one is
          never hidden by the collapse. */}
      {el.type==='photo' && <Fold id="ph-mask" title="Mask"
        badge={(el.mask&&el.mask!=='none') ? (AP_SHAPELAB[el.mask]||el.mask) : null}>
        <GfxGrid type="shape" prop="kind" value={el.mask||'none'} onPick={v=>update({mask:v})}
          items={AP_MASKS.map(k=> k==='none' ? { k:'none', l:'None' } : { k, l:AP_SHAPELAB[k]||k })} />
        {(el.mask&&el.mask!=='none') && <Hint tight>Cut from the same shape set as the graphics library — pan/zoom in <b>Frame &amp; placement</b> to re-frame inside it.</Hint>}
      </Fold>}
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
      <Hint tight>A pinch of grain makes a flat field feel printed, not digital.</Hint>
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
        <Hint tight>Grain is clipped to the silhouette, so a grained hexagon stays a hexagon.</Hint>
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
      <Hint tight>The Year 2 glyph set — the same vectors the app and Print Studio draw.</Hint>
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
      <Hint tight>Rotate the element 90° for a vertical rule — the geometry always runs along the box.</Hint>
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
      <Hint tight>Send it behind a title (▼) and knock the hub out to ring a photo.</Hint>
    </React.Fragment>
  );
}

/* Ink mark — form · mode · day · module · ground. The mark is the canon grid
   (studio-data INK_MARK): the panel only ever RECOLOURS (mode/day) or resizes
   by whole modules; cell order is untouchable. Form/module changes resize the
   element box to exact module multiples so cells stay square; a free drag-
   resize still fits-and-centres without distortion. v1 has no voids/dropout. */
/* ============================================================
   INK MARK EDITOR — the mark on its own terms.

   The Inspector's chips can set form and mode, but they read as words, and
   the one dial that matters most — the DAY hue — hid behind picking "Day
   code" first. Designing a Monday strip meant switching mode, switching day,
   then squinting at a 60px mark on the canvas.

   This is the same controls rendered as the thing they produce: every form,
   every mode and all seven days drawn live at a legible size, on a ground you
   can flip between paper, ink and the poster's accent so the ground decision
   is made by looking rather than guessing. Edits apply straight to the
   selected element — no apply step, no separate copy of the state.

   Cell ORDER is still canon and still not editable here. The panel recolours;
   it never reorders.
   ============================================================ */
const MARK_FORMS = [
  { v:'strip-v',       l:'Strip',    h:'2×9 · vertical' },
  { v:'strip-h',       l:'Strip ↔',  h:'9×2 · horizontal' },
  { v:'strip-short-v', l:'Short',    h:'2×7 · vertical' },
  { v:'strip-short-h', l:'Short ↔',  h:'7×2 · horizontal' },
  { v:'square',        l:'Square',   h:'4×4' },
  { v:'square-anchored', l:'Anchored', h:'4×4 · ink corner' },
];
const MARK_MODES = [
  { v:'full',    l:'Full',     h:'all seven hues' },
  { v:'majors',  l:'Majors',   h:'three bands, neutral field' },
  { v:'daycode', l:'Day code', h:'one weekday hue' },
  { v:'ink',     l:'Ink',      h:'ink + stock only' },
];
const MARK_GROUNDS = [
  { v:'paper',  l:'Paper',  bg:'#fffbf1' },
  { v:'ink',    l:'Ink',    bg:'#0d0905' },
  { v:'accent', l:'Accent', bg:null },
];
function InkMarkEditor({ el, doc, update, onClose }){
  const IM = window.INK_MARK;
  const Swatch = window.InkMarkSwatch;
  const [ground, setGround] = React.useState('paper');
  const form = el.form||'strip-v';
  const mode = el.mode||'full';
  const day  = el.day||'fri';
  const anchored = form==='square-anchored';
  const plate = el.ground===true && !anchored;
  const accentHex = window.PALETTE[doc.accent] || '#18a7e0';
  const bg = ground==='accent' ? accentHex : MARK_GROUNDS.filter(g=>g.v===ground)[0].bg;
  /* the preview's theme drives only the paper-shade plate tone, so it follows
     the ground you are previewing on, not the poster's theme */
  const previewTheme = ground==='ink' ? 'night' : 'day';
  const f = IM.forms[form] || IM.forms['strip-v'];
  const floor = IM.floors[form.indexOf('short')>=0 ? 'short' : f.square ? 'square' : 'strip'];
  const pad = plate ? 2 : 0;
  const m = Math.max(1, Math.round(Math.min(el.w/(f.cols+pad), el.h/(f.rows+pad))));
  /* resize the box to exact module multiples whenever form/ground/module move,
     so the mark never renders letterboxed inside its own element */
  const fit = (patch, mod)=>{
    const nf = IM.forms[patch.form!=null?patch.form:form] || f;
    const na = (patch.form!=null?patch.form:form)==='square-anchored';
    const ng = (patch.ground!=null?patch.ground:el.ground)===true && !na;
    const np = ng?2:0;
    return Object.assign(patch, { w:Math.round((nf.cols+np)*mod), h:Math.round((nf.rows+np)*mod) });
  };
  /* Thumbnail modules are fitted to the tile's ACTUAL box — ~52×28 for a
     normal tile, ~40×28 for a wide one — constraining width and height
     separately. Sizing off the longer axis alone made the 4×4 square 48px
     tall in a 30px well, so it sat on top of its own label. */
  const thumbM = (fm, wBudget)=>{ const ff = IM.forms[fm]||f;
    return Math.max(2, Math.floor(Math.min((wBudget||52)/ff.cols, 28/ff.rows))); };
  const dayM = thumbM(form, 40);
  /* the preview gets the panel's full width rather than a square budget, so a
     9×2 strip reads at its real proportion instead of shrinking to fit a
     dimension it does not use */
  const previewM = Math.max(6, Math.floor(Math.min(258/f.cols, 168/f.rows)));
  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(10,7,3,.62)',
      display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999 }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:'#171109', border:'2px solid #3a2c1c',
        width:'min(860px, 94vw)', maxHeight:'92vh', overflow:'auto', padding:'20px 22px 22px',
        boxShadow:'0 18px 0 rgba(0,0,0,.35)' }}>
        <div style={{ display:'flex', alignItems:'baseline', gap:12, marginBottom:16 }}>
          <div style={{ fontFamily:'Montserrat', fontWeight:800, fontSize:15, letterSpacing:'.04em',
            textTransform:'uppercase', color:'#fffbf1' }}>Ink mark editor</div>
          <div style={{ fontFamily:'Space Grotesk', fontSize:12, color:'#8a7f6c' }}>
            Cell order is canon — this recolours and resizes, it never reorders.</div>
          <button onClick={onClose} style={{ marginLeft:'auto', background:'none', border:'2px solid #3a2c1c',
            color:'#e9ddc5', padding:'5px 12px', cursor:'pointer', fontFamily:'Montserrat', fontWeight:700,
            fontSize:11, letterSpacing:'.08em', textTransform:'uppercase' }}>Done</button>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'minmax(220px,300px) 1fr', gap:22, alignItems:'start' }}>
          {/* ---- live preview ---- */}
          <div>
            <div style={{ background:bg, border:'2px solid #3a2c1c', minHeight:210, padding:20,
              display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Swatch form={form} mode={mode} day={day} grounded={plate} theme={previewTheme}
                m={previewM} />
            </div>
            <div style={{ display:'flex', gap:5, marginTop:8 }}>
              {MARK_GROUNDS.map(g=>(
                <button key={g.v} onClick={()=>setGround(g.v)}
                  style={{ flex:1, padding:'6px 0', cursor:'pointer', fontFamily:'Montserrat', fontWeight:700,
                    fontSize:9.5, letterSpacing:'.08em', textTransform:'uppercase',
                    background: ground===g.v ? '#2a1620' : 'transparent',
                    border:'2px solid '+(ground===g.v ? '#ed1b72' : '#3a2c1c'),
                    color: ground===g.v ? '#ed1b72' : '#8a7f6c' }}>{g.l}</button>
              ))}
            </div>
            <div className="rs-mini" style={{ marginTop:8 }}>
              Preview grounds only — they are not applied to the poster. Check the mark on the
              substrate it will actually print on: stock cells vanish on paper, ink cells vanish on ink.
            </div>
          </div>

          {/* ---- dials ---- */}
          <div>
            <div className="rs-sech" style={{ marginTop:0 }}>Form</div>
            <div className="rs-gfxgrid">
              {MARK_FORMS.map(o=>(
                <button key={o.v} title={o.h} className={'rs-gfxtile'+(form===o.v?' on':'')}
                  onClick={()=>update(fit({ form:o.v }, m))}>
                  <span className="gp" style={{ display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <Swatch form={o.v} mode={mode} day={day} grounded={false} theme="night" m={thumbM(o.v)} />
                  </span>
                  <span className="gl">{o.l}</span>
                </button>
              ))}
            </div>

            <div className="rs-sech">Mode</div>
            <div className="rs-gfxgrid">
              {MARK_MODES.map(o=>(
                <button key={o.v} title={o.h} className={'rs-gfxtile'+(mode===o.v?' on':'')}
                  onClick={()=>update({ mode:o.v })}>
                  <span className="gp" style={{ display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <Swatch form={form} mode={o.v} day={day} grounded={false} theme="night" m={thumbM(form)} />
                  </span>
                  <span className="gl">{o.l}</span>
                </button>
              ))}
            </div>

            {/* All seven, always visible — clicking one IS the "make me a
                Tuesday strip" action, so it switches to daycode itself rather
                than making you find the mode first. */}
            <div className="rs-sech">Day strip — the weekday hue</div>
            <div className="rs-gfxgrid wide">
              {window.INK_MARK_DAY_KEYS.map((d,i)=>(
                <button key={d} title={window.DAY_NAMES[i]}
                  className={'rs-gfxtile'+((mode==='daycode' && day===d)?' on':'')}
                  onClick={()=>update({ mode:'daycode', day:d })}>
                  <span className="gp" style={{ display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <Swatch form={form} mode="daycode" day={d} grounded={false} theme="night" m={dayM} />
                  </span>
                  <span className="gl">{window.DAY_ABBR[i]}</span>
                </button>
              ))}
            </div>

            <div className="rs-sech">Size &amp; ground</div>
            <Slider label="Module" val={m} min={floor} max={90} step={1} suffix="px"
              onChange={v=>update(fit({}, v))} />
            {anchored
              ? <div className="rs-mini">Anchored needs no ground — its ink cell takes the outer corner itself.</div>
              : <React.Fragment>
                  <Chips label="Ground — paper-shade plate" options={[{v:false,l:'Off'},{v:true,l:'On'}]}
                    value={el.ground===true} onChange={v=>update(fit({ground:v}, m))} />
                  <div className="rs-mini">Off by default. The plate is canon G2's guard for a stock cell landing on an
                    outer edge — turn it on when the mark sits directly on artwork with no ground of its own.</div>
                </React.Fragment>}
          </div>
        </div>
      </div>
    </div>
  );
}

function InkmarkControls({ el, doc, update }){
  const IM = window.INK_MARK;
  const form = el.form||'strip-v';
  const f = IM.forms[form] || IM.forms['strip-v'];
  const anchored = form==='square-anchored';
  const grounded = el.ground===true && !anchored;
  const pad = grounded?2:0;
  const gw = f.cols+pad, gh = f.rows+pad;
  const m = Math.max(1, Math.round(Math.min(el.w/gw, el.h/gh)));
  const floor = IM.floors[form.indexOf('short')>=0 ? 'short' : f.square ? 'square' : 'strip'];
  /* resize the box to exact module multiples for a target form/ground/module */
  const fit = (patch, mod)=>{
    const nf = IM.forms[patch.form!=null?patch.form:form] || f;
    const na = (patch.form!=null?patch.form:form)==='square-anchored';
    const ng = (patch.ground!=null?patch.ground:el.ground)===true && !na;
    const np = ng?2:0;
    return Object.assign(patch, { w:Math.round((nf.cols+np)*mod), h:Math.round((nf.rows+np)*mod) });
  };
  const days = window.INK_MARK_DAY_KEYS.map((d,i)=>({ v:d, l:window.DAY_ABBR[i] }));
  const [editing, setEditing] = React.useState(false);
  return (
    <React.Fragment>
      {editing && <InkMarkEditor el={el} doc={doc} update={update} onClose={()=>setEditing(false)} />}
      <div className="rs-sech">Ink mark</div>
      {/* The full editor: every form, every mode and all seven day hues drawn
          live, on a ground you can flip. The chips below stay for a quick nudge
          when you already know what you want. */}
      <button className="rs-addrow" onClick={()=>setEditing(true)}
        style={{ marginBottom:10 }}>⧉ Open mark editor — forms, modes, day strips</button>
      <Chips label="Form" options={[
        {v:'strip-v',l:'Strip'},{v:'strip-h',l:'Strip ↔'},
        {v:'strip-short-v',l:'Short'},{v:'strip-short-h',l:'Short ↔'},
        {v:'square',l:'Square'},{v:'square-anchored',l:'Anchored'}]}
        value={form} onChange={v=>update(fit({form:v}, m))} />
      <Chips label="Mode" options={[{v:'full',l:'Full'},{v:'majors',l:'Majors'},{v:'daycode',l:'Day code'},{v:'ink',l:'Ink'}]}
        value={el.mode||'full'} onChange={v=>update({mode:v})} />
      {el.mode==='daycode' && <Chips label="Day — sets the hue" options={days}
        value={el.day||'fri'} onChange={v=>update({day:v})} />}
      <Slider label="Module" val={m} min={floor} max={90} step={1} suffix="px"
        onChange={v=>update(fit({}, v))} />
      {anchored
        ? <div className="rs-mini" style={{ marginTop:2 }}>Anchored needs no ground — its ink cell takes the outer corner itself.</div>
        : <React.Fragment>
            <Chips label="Ground — paper-shade plate" options={[{v:true,l:'On'},{v:false,l:'Off'}]}
              value={el.ground===true} onChange={v=>update(fit({ground:v}, m))} />
            <div className="rs-mini" style={{ marginTop:2 }}>On a poster the ground keeps stock off the outer corners (canon G2) — one module of clear space, baked in.</div>
          </React.Fragment>}
      <Hint tight>Cell order is canon — the panel recolours (mode / day), never reorders. One mark per surface.</Hint>
    </React.Fragment>
  );
}

/* ---------- inspector ---------- */
/* Centre-on-canvas row — the same three buttons serve one box and a group of
   them (the handler centres the selection's bounding box either way), so the
   only thing that changes is the label. */
/* ============================================================
   LIBRARY CHROME — collapsible sections + real previews.
   ============================================================
   The parts list was 3,195px of always-open rows. Print Studio
   already had the answer (its .ps-sec / .ps-tplcard), so these
   are the same two ideas in Poster's register: every group is a
   button with a count that starts closed, and a template is a
   mini render of itself rather than "4 parts · click to load".

   Open state rides the shared fold store, so it persists — and
   a closed section renders no children, which is also what keeps
   twenty riso thumbnails from being built on page load. */
function Sec({ id, title, count, dot, sub, open, children }){
  const key = 'lib:'+id;
  const folds = RUI.useStore(RUI.foldStore);
  const chosen = folds[key];
  const isOpen = chosen!=null ? chosen : !!open;
  return (
    <React.Fragment>
      <button className={'rs-sec'+(isOpen?' open':'')} onClick={()=>RUI.setFold(key, !isOpen)}>
        <span className="caret">{isOpen?'▾':'▸'}</span>
        {dot && <span className="dot" style={{ background:dot }} />}
        <span className="t">{title}</span>
        {sub && <span style={{ fontSize:10, opacity:.45, flex:'none' }}>{sub}</span>}
        {count!=null && <span className="n">{count}</span>}
      </button>
      {isOpen && children}
    </React.Fragment>
  );
}

/* ---- library thumbnails ----------------------------------------------------
   Rasterising a card is main-thread work, so captures run ONE AT A TIME: open a
   day with eight posters in it and the tiles fill in one after another instead
   of the panel locking up. Ordering also buys every card after the first a long
   settle before its own turn comes round. */
let _thumbQ = Promise.resolve();
function queueThumb(fn){
  _thumbQ = _thumbQ.then(fn, fn).catch(()=>{});
  return _thumbQ;
}
/* html-to-image inlines the web fonts into every capture, and re-reads the
   stylesheets to do it. The answer is the same for all of them, so it's fetched
   once and handed to each.

   Time-boxed, and that matters more than the saving: the fetch is of Google's
   font files, and when they're slow to answer html-to-image simply waits — which
   would park the whole capture queue behind them for as long as the connection
   is bad. Past the deadline (or on an older build with no helper) captures go
   ahead with '' and fall back to system type, which at 88px is a wash. */
let _thumbFontCss = null;
function thumbFontCss(node){
  if(_thumbFontCss) return _thumbFontCss;
  const hti = window.htmlToImage;
  _thumbFontCss = (hti && typeof hti.getFontEmbedCSS==='function')
    ? Promise.race([
        Promise.resolve(hti.getFontEmbedCSS(node)).catch(()=>''),
        new Promise(r=>setTimeout(()=>r(''), 4000)),
      ]).then(css=>typeof css==='string'?css:'')
    : Promise.resolve('');
  return _thumbFontCss;
}
/* The press only paints a photo once its source has decoded, so a capture taken
   on mount catches empty frames. Warm the sources first (RISO.loadImage is
   cached), then wait one fully painted frame — same shape as settleFormat, rAF
   raced against a timeout so a backgrounded tab can't stall the queue. */
async function settleThumb(doc){
  try{
    const srcs = [];
    (doc.elements||[]).forEach(el=>{ if(el && el.src) srcs.push(el.src); if(el && el.src2) srcs.push(el.src2); });
    if(srcs.length && window.RISO && window.RISO.loadImage)
      await Promise.all(srcs.map(s=>window.RISO.loadImage(s).catch(()=>null)));
  }catch(e){}
  await new Promise(r=>{ let done=false; const fin=()=>{ if(!done){ done=true; r(); } };
    requestAnimationFrame(()=>requestAnimationFrame(fin)); setTimeout(fin, 400); });
  await new Promise(r=>setTimeout(r, 180));
}

/* A template drawn at ~1/12 scale by the SAME element renderer the canvas
   uses, so the preview cannot lie about what loading it gives you.

   Drawn ONCE, though. Every card used to be a live poster: its photos went back
   through the riso press on every open, and — because the card passed a bare
   `exporting` — at the export grid's 2x, so an 88px tile paid for a 2,160px
   render. Two things changed. The press is now told the tile's real ratio, and
   the first painted frame is captured to a small JPEG (`onCapture`) that every
   later open draws instead of the poster. `thumb` is that capture; a card
   without one renders live exactly as before and takes its picture. */
function TplThumb({ doc, w, thumb, onCapture }){
  const f = AP_FMT[doc.masterFormat||'4x5'];
  const tw = w||88, sc = tw/f.w, th = Math.round(f.h*sc);
  const t = window.themeColors(doc.theme||'day');
  const accentHex = AP_PAL[doc.accent] || AP_PAL.blue;
  const inner = React.useRef(null);
  const noop = ()=>{};
  /* Capture the live render once, then hand it up to be filed. Keyed on `thumb`
     alone: a re-render for any other reason must not re-shoot a card, and a
     capture that lands flips this to the <img> branch. */
  React.useEffect(()=>{
    if(thumb || !onCapture || !window.htmlToImage) return;
    let alive = true;
    queueThumb(async ()=>{
      if(!alive || !inner.current) return;
      await settleThumb(doc);
      const node = inner.current;
      if(!alive || !node) return;
      /* Captured at the tile's own scale (pixelRatio sc*2 over the poster's real
         1080px box) — a ~176px JPEG, which is what the card wants and all it
         should ever have cost. */
      const src = await window.htmlToImage.toJpeg(node, {
        width:f.w, height:f.h, pixelRatio:sc*2, quality:0.82, backgroundColor:t.bg,
        fontEmbedCSS: await thumbFontCss(node),
        style:{ transform:'none', transformOrigin:'0 0' } });
      if(alive && src) onCapture({ src, w:tw, h:th });
    });
    return ()=>{ alive=false; };
  }, [thumb]);

  if(thumb && thumb.src){
    /* Height rides the capture, not this doc — a thumbnail shot at another tile
       width still lands on its own aspect rather than being squashed into it. */
    const ih = thumb.w ? Math.round((thumb.h||th) * (tw/thumb.w)) : th;
    return <img className="rs-thumbbox" src={thumb.src} alt="" loading="lazy" decoding="async"
      style={{ width:tw, height:ih, background:t.bg, display:'block' }} />;
  }
  return (
    <div className="rs-thumbbox" style={{ width:tw, height:th }}>
      <div ref={inner} style={{ width:f.w, height:f.h, transform:'scale('+sc+')', transformOrigin:'0 0',
        background:t.bg, position:'relative', overflow:'hidden', pointerEvents:'none' }}>
        {doc.elements.map(el=>(
          <StudioElement key={el.id} el={el} theme={doc.theme||'day'} posterAccentHex={accentHex}
            posterAccent={doc.accent} selected={false} dragging={false} onElPointerDown={noop} exporting={sc*2} />
        ))}
      </div>
    </div>
  );
}
function TplCard({ tpl, onApply }){
  const built = React.useMemo(()=>apBuildTpl(tpl), [tpl]);
  return (
    <div className="rs-tplcard" onClick={onApply} title={tpl.name}>
      <TplThumb doc={built} w={88} />
      <span className="tn">{tpl.name}</span>
      <span className="ts">{tpl.els.length} parts</span>
    </div>
  );
}
function UserTplCard({ t, onApply, onArchive, onDelete, archived, thumb, onCapture }){
  return (
    <div className="rs-tplcard" onClick={onApply} title={t.name} style={archived?{ opacity:.75 }:null}>
      <TplThumb doc={t.doc} w={88} thumb={thumb} onCapture={onCapture} />
      <span className="tn">{t.name}</span>
      <span className="ts">{archived ? 'archived' : new Date(t.savedAt).toLocaleDateString(undefined,{ day:'numeric', month:'short' })}</span>
      <button className="rs-tplx" style={{ right:28, top:4, width:20, height:20, fontSize:11, borderColor:'#3a2f1f', color:'#b6ab97' }}
        title={archived?'Restore to My templates':'Archive — tuck it into the Archive drawer'}
        onClick={e=>{ e.stopPropagation(); onArchive(); }}>{archived?'↩':'⤓'}</button>
      <button className="rs-tplx" style={{ top:4, width:20, height:20, fontSize:11 }} title="Delete this template"
        onClick={e=>{ e.stopPropagation(); onDelete(); }}>×</button>
    </div>
  );
}

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

/* ============================================================
   INSPECTOR — one canonical order, every section a fold.
   ============================================================
   This used to be a flat wall: 82–88 controls and ~2,100px of
   scroll for a title, with folds only inside the photo panel.
   Now it reads the same way for every element type —

     Actions → Content → Type → Subtitle → Rows →
     Colour & surface → Shadow → Transform → Format override

   — and each section is a Fold that (a) carries a badge counting
   the props inside it that differ from this type's defaults, and
   (b) opens itself the first time it has something in it. Once
   you click a fold your choice is stored and wins from then on.

   Same shape as Print Studio's inspector, deliberately: the two
   tools are used within minutes of each other and there is no
   reason for "where is the size control" to have two answers.
   ============================================================ */
function Inspector({ el, doc, update, dup, del, layer, clearAll, setDoc, isOutput, activeLabel, resetOverride, toggleHidden, selCount, align, distribute, centre, formatLabel, sliceMode, setSliceMode, setFeedSlice }){
  if(!el){
    const DAYS = AP_ABYDAY.map((a,i)=>({ n:i+1, abbr:AP_DABBR[i], accent:a }));
    const slice = doc.feedSlice || { yFrac:0.4, hFrac:0.2 };
    return (
      <React.Fragment>
        {/* The day picker stays bare — it's the single most-used control in the
            tool and putting it behind a disclosure would be a joke. */}
        <div className="rs-sech">Day — pick the accent</div>
        <div className="rs-vibe rs-days">
          {DAYS.map(d=>(
            <button key={d.abbr} className={doc.accent===d.accent?'on':''} onClick={()=>setDoc(x=>({...x, accent:d.accent}))}
              title={d.abbr+'’s colour'}>
              <span className="dot" style={{ background:AP_PAL[d.accent] }} />{d.n} · {d.abbr}
            </button>
          ))}
        </div>
        <Hint>Each weekday has its colour. Picking one sets the poster accent — and names the Story export (e.g. <b>3-Wed-…</b>).</Hint>

        <div className="rs-empty" style={{ padding:'22px 12px 16px' }}>
          <div className="big">Nothing selected</div>
          <p>Drag a part from the left onto the poster, or click one to select it. {isOutput? 'Move it here to override just this format.' : 'You’re on Master — edits flow to every format.'}</p>
        </div>

        {isOutput && doc.activeFormat==='9x16' &&
          <Fold id="d-story" title="Story sizing" dirty={doc.storyBoost===false||((doc.storyScale||1.15)!==1.15)?1:0}>
            <Chips options={[{v:true,l:'Boost on'},{v:false,l:'Off'}]} value={doc.storyBoost!==false} onChange={v=>setDoc(d=>({...d, storyBoost:v}))} />
            {doc.storyBoost!==false &&
              <Slider label="Scale" val={doc.storyScale||1.15} min={1} max={1.8} step={0.05} onChange={v=>setDoc(d=>({...d, storyScale:v}))} suffix="×" />}
            <Hint tight>Scales every element + its text up so the story reads on a phone — applies to all your templates. Anything you hand-size in 9:16 keeps its size.</Hint>
          </Fold>}

        {/* Feed slice used to sit below the inspector on EVERY selection, which
            meant carrying a document-level control through every element edit.
            It belongs here, with the other whole-poster settings. */}
        <Fold id="d-slice" title="Feed slice" badge={sliceMode?'picking':null}>
          <Hint>The text-less strip used on the calendar’s “This week” cards (a thin band — far smaller than a full poster). Pick which part of the image to use.</Hint>
          <button className="rs-addrow" onClick={()=>{ const on=!sliceMode; setSliceMode(on);
            if(on) setDoc(d=>({ ...d, activeFormat:'master', feedSlice:d.feedSlice||{ yFrac:0.4, hFrac:0.2 } })); }}>
            {sliceMode ? '✓ Done selecting' : '◧ Select feed slice…'}</button>
          {sliceMode && <React.Fragment>
            <Slider label="Top" val={Math.round(slice.yFrac*100)} min={0} max={92} step={1}
              onChange={v=>setFeedSlice({ yFrac:v/100, hFrac:slice.hFrac })} suffix="%" />
            <Slider label="Height" val={Math.round(slice.hFrac*100)} min={8} max={60} step={1}
              onChange={v=>setFeedSlice({ yFrac:slice.yFrac, hFrac:v/100 })} suffix="%" />
            <button className="rs-addrow" style={{ marginTop:6 }} onClick={()=>setFeedSlice({ yFrac:0.4, hFrac:0.2 })}>Center · 4:1 band</button>
          </React.Fragment>}
        </Fold>

        <Fold id="d-canvas" title="Canvas">
          <div className="rs-mini" style={{ textAlign:'center', marginBottom:12 }}>{doc.elements.length} element{doc.elements.length===1?'':'s'} placed</div>
          <button className="rs-iconbtn rs-del" style={{ width:'100%', justifyContent:'center', marginBottom:10 }} onClick={clearAll}>Clear poster</button>
        </Fold>

        <Fold id="d-keys" title="Shortcuts">
          <div className="rs-mini" style={{ marginBottom:10 }}>
            <b>Ctrl-K</b> find any control · <b>Ctrl-Z</b> undo · <b>Ctrl-⇧-Z</b> redo · <b>Ctrl-D</b> duplicate ·
            <b> Ctrl-A</b> select all · arrows nudge 6px (<b>⇧</b> 30) · <b>⇧-click</b> multi-select ·
            <b> double-click</b> text to edit it on the poster · <b>Ctrl-V</b> paste an image onto a photo.
          </div>
        </Fold>
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

  /* Badges + auto-open, counted against what this type is born with. Note the
     box defaults (w/h/anchor/rot) live OUTSIDE DEFAULTS[type].props — fold them
     in, or `anchor:'safe'` reads as an edit on every element ever made. */
  const _D = AP_DEF[el.type] || {};
  const base = Object.assign({ w:_D.w, h:_D.h, anchor:_D.anchor||'safe', rot:0 }, _D.props||{});
  const dirt = (keys)=>RUI.dirtyCount(el, keys, base);
  const dContent   = dirt(['text','name','heading','items','raw','label','site','addr','top','big','sub',
                           'price','time','every','day','allYear','comp','teamA','teamB','date','vs',
                           'variant','showQR','mark','markForm','markMode','kind','preset','glyph','pattern']);
  const dType      = dirt(['fontSize','weight','letterSpacing','lineHeight','align','textInset','orient','textColor','headingSize']);
  const dSurface   = dirt(['surface','fill']);
  const dSub       = dirt(['subtitle','subSize','subWeight','subTracking','subColor','subLayout']);
  const dKicker    = dirt(['kicker','kickerColor']);
  const dRows      = dirt(['rowSize','rowWeight','rowTracking','rowGap','markerKey']);
  const dTransform = dirt(['rot','anchor']);   // NOT w/h/x/y — placing a box sets those, so counting them badges everything

  /* Text content lives in its own fold per type. Kept as one expression so the
     order of the type branches — and the copy in them — is unchanged from when
     they were bare sections; only the container is new. */
  const contentBody = (
    <React.Fragment>
      {el.type==='title' && <Field label="Title text" value={el.text} onChange={v=>update({text:v})} area />}
      {el.type==='tagline' && <Field label="Tagline" value={el.text} onChange={v=>update({text:v})} area />}
      {el.type==='info' && <React.Fragment>
        <Field label="Info text" value={el.text} onChange={v=>update({text:v})} area />
        <Hint tight>Markdown: <b>**bold**</b>, <i>*italic*</i>, and lines starting with <b>-</b> become bullets. Blank line = a gap.</Hint>
      </React.Fragment>}
      {el.type==='when' && <Field label="When" value={el.text} onChange={v=>update({text:v})} />}
      {el.type==='cost' && <Field label="Cost" value={el.text} onChange={v=>update({text:v})} />}
      {el.type==='stamp' && <Field label="Stamp text" value={el.text} onChange={v=>update({text:v})} />}
      {el.type==='host' && <Field label="Name" value={el.name} onChange={v=>update({name:v})} />}
      {el.type==='ticket' && <React.Fragment>
        <Chips label="Format" options={[{v:'banner',l:'Banner'},{v:'standard',l:'Standard'},{v:'slim',l:'Slim'},{v:'mini',l:'Mini'}]}
          value={el.variant||'standard'} onChange={v=>update(TICKET_FORMATS[v])} />
        <Hint tight>Wordmark is the canonical REALITY mark (fixed).</Hint>
        <Field label="Website" value={el.site} onChange={v=>update({site:v})} />
        <Field label="Address" value={el.addr} onChange={v=>update({addr:v})} />
        <Chips label="QR" options={[{v:true,l:'Show'},{v:false,l:'Hide'}]} value={el.showQR} onChange={v=>update({showQR:v})} />
        {/* absent prop = ON — the ticket is the brand carrier (see DEFAULTS) */}
        <Chips label="Ink mark" options={[{v:'on',l:'On'},{v:'off',l:'Off'}]} value={el.mark||'on'} onChange={v=>update({mark:v})} />
        {el.mark!=='off' && <Chips label="Mark form" options={[{v:'auto',l:'Auto'},{v:'square',l:'Square'},{v:'strip-long',l:'Full strip'},{v:'strip',l:'Short strip'}]}
          value={el.markForm||'auto'} onChange={v=>update({markForm:v})} />}
        {el.mark!=='off' && <Chips label="Mark mode" options={[{v:'full',l:'Full'},{v:'majors',l:'Majors'},{v:'ink',l:'Ink'}]}
          value={el.markMode||(((el.markForm||'auto')==='square'||((el.markForm||'auto')==='auto'&&!!el.showQR))?'full':'majors')} onChange={v=>update({markMode:v})} />}
        <Hint tight>Auto pairs the canon square with the QR (flush — its quiet zone is the gap) and the <b>full 9×2 strip</b> with a bare band; Square / Full strip / Short strip force one form, on the banner too. Short is the fallback for a band too narrow to hold nine cells. Mode unset keeps each form's classic ink (square Full · strip Majors).</Hint>
      </React.Fragment>}
      {el.type==='qr' && <React.Fragment>
        <Field label="Label" value={el.label} onChange={v=>update({label:v})} />
        <Field label="Website" value={el.site} onChange={v=>update({site:v})} />
      </React.Fragment>}
      {el.type==='badge' && <React.Fragment>
        <div className="rs-rowflex">
          <Field label="Top" value={el.top} onChange={v=>update({top:v})} />
          <Field label="Big" value={el.big} onChange={v=>update({big:v})} />
        </div>
        <Field label="Sub" value={el.sub} onChange={v=>update({sub:v})} />
      </React.Fragment>}
      {el.type==='wordmark' &&
        <Hint tight>The canonical REALITY mark — fixed vector letterforms (Montserrat Alternates A/I/Y). Drag a handle or use Width/Height to resize; it scales crisp and never distorts. Recolour below.</Hint>}
      {el.type==='weekly' && <React.Fragment>
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
        <Hint tight>Team names auto-fit and stay matched in size. Want flags or crests? Drop in Partner-logo elements over the photo.</Hint>
      </React.Fragment>}
      {caps.list && <React.Fragment>
        <Field label="Heading" value={el.heading} onChange={v=>update({heading:v})} />
        <Slider label="Heading size" val={el.headingSize!=null?el.headingSize:(el.type==='specials'?26:15)} min={11} max={56} step={1} suffix="px" onChange={v=>update({headingSize:v})} />
      </React.Fragment>}
    </React.Fragment>
  );
  const hasContent = ['title','tagline','info','when','cost','stamp','host','ticket','qr','badge','wordmark','weekly','matchup'].indexOf(el.type)>=0 || !!caps.list;

  return (
    <React.Fragment>
      {selCount>=2 &&
        <Fold id="f-arrange" title={'Arrange · '+selCount+' selected'} open>
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
          <Hint tight>Moves the whole selection as one onto the {formatLabel} centre — the boxes keep their positions relative to each other.</Hint>
          <button className="rs-iconbtn rs-del" style={{ width:'100%', justifyContent:'center', marginTop:8, marginBottom:10 }} onClick={del}>Delete {selCount}</button>
        </Fold>}

      {/* ---- actions: always bare, always first ---- */}
      <div className="rs-sech" style={{ display:'flex', justifyContent:'space-between' }}>
        <span>{el.type}{el._overridden && <span className="rs-ovtag"> · overridden</span>}</span>
        {selCount>=2 && <span style={{ fontSize:9, opacity:.6 }}>last of {selCount}</span>}
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
        <button className="rs-iconbtn" onClick={dup} title="Duplicate (Ctrl-D)">Duplicate</button>
        <button className="rs-iconbtn rs-del" onClick={del} title="Delete">Delete</button>
      </div>

      {/* ===================== CONTENT ===================== */}
      {/* A photo's content IS its image + press panels, which bring their own
          folds — wrapping them in one more would be a fold inside a fold for
          no gain. Everything else gets a Content fold of its own. */}
      {caps.media && <PhotoControls el={el} update={update} theme={doc.theme} accent={doc.accent} />}
      {el.type==='block' && <Fold id="f-content" title="Block" dirty={dContent}><BlockControls el={el} doc={doc} update={update} /></Fold>}
      {el.type==='shape' && <Fold id="f-content" title="Shape" dirty={dContent}><ShapeControls el={el} doc={doc} update={update} /></Fold>}
      {el.type==='icon'  && <Fold id="f-content" title="Icon"  dirty={dContent}><IconControls  el={el} doc={doc} update={update} /></Fold>}
      {el.type==='rule'  && <Fold id="f-content" title="Rule"  dirty={dContent}><RuleControls  el={el} doc={doc} update={update} /></Fold>}
      {el.type==='burst' && <Fold id="f-content" title="Burst" dirty={dContent}><BurstControls el={el} doc={doc} update={update} /></Fold>}
      {el.type==='inkmark' && <Fold id="f-content" title="Ink mark" open><InkmarkControls el={el} doc={doc} update={update} /></Fold>}
      {hasContent && <Fold id="f-content" title="Content" open dirty={dContent}>{contentBody}</Fold>}

      {/* ===================== TYPE ===================== */}
      {(caps.size || caps.sizePreset || caps.weight || caps.align || isText) &&
        <Fold id="f-type" title="Type" open dirty={dType}>
          {caps.size && <ScaleControl label={sizeLabel} val={el.fontSize} onChange={v=>update({fontSize:v})} />}
          {caps.sizePreset && <Chips label="Size preset" options={[{v:'lg',l:'Large'},{v:'md',l:'Medium'},{v:'sm',l:'Small'}]}
            value={el.fontSize>=40?'lg':el.fontSize>=30?'md':'sm'}
            onChange={v=>update(v==='lg'?{fontSize:46,h:180}:v==='md'?{fontSize:32,h:135}:{fontSize:26,h:90})} />}
          {caps.weight && <Chips label="Weight" options={WEIGHTS} value={el.weight!=null?el.weight:defWeight} onChange={v=>update({weight:v})} />}
          {isText && <Slider label="Letter spacing" val={el.letterSpacing!=null?el.letterSpacing:lsDefault} min={-0.05} max={0.6} step={0.005} onChange={v=>update({letterSpacing:v})} suffix="em" />}
          {caps.lineHeight && <Slider label="Line spacing" val={el.lineHeight!=null?el.lineHeight:caps.lineHeight.def} min={caps.lineHeight.min} max={caps.lineHeight.max} step={0.05} onChange={v=>update({lineHeight:v})} />}
          {caps.align && <Chips label="Align" options={[{v:'left',l:'Left'},{v:'center',l:'Center'},{v:'right',l:'Right'}]} value={inset.align} onChange={v=>update({align:v})} />}
          {caps.align && inset.applies &&
            <Slider label={'Edge offset · from the '+inset.side} val={inset.val} min={0} max={inset.max} step={1}
              onChange={v=>update({textInset:v})} suffix="px" />}
          {caps.align && caps.list && <Hint tight>Aligns the heading and row text. Two-column rows (name · time) keep their columns — that spread is the layout.</Hint>}
          {caps.orient && <Chips label="Orientation" options={[{v:'h',l:'Horizontal'},{v:'v',l:'Vertical'}]} value={el.orient||'h'} onChange={v=>update({orient:v})} />}
          {(caps.surface || caps.textColor) && !caps.list &&
            <Swatches label={el.type==='host'?'Name colour':el.type==='wordmark'?'Wordmark colour':el.type==='weekly'?'Bar text colour':'Text colour'} value={el.textColor!=null?el.textColor:el.color}
              onChange={v=>update({textColor:v})} autoTitle="Auto — the readable neutral for this fill (ink, or cream on purple)" />}
        </Fold>}

      {/* ===================== SUBTEXT ===================== */}
      {caps.subtitle &&
        <Fold id="f-sub" title="Subtitle" dirty={dSub}>
          <Field label="Subtitle — sits in the title box" value={el.subtitle||''} onChange={v=>update({subtitle:v})} area />
          {(el.subtitle||'').trim()
            ? <React.Fragment>
                <Chips label="Spacing to title" options={[{v:'tight',l:'Tight'},{v:'snug',l:'Snug'},{v:'roomy',l:'Roomy'},{v:'split',l:'Top / bottom'}]} value={el.subLayout||'snug'} onChange={v=>update({subLayout:v})} />
                <ScaleControl label={'Subtitle size'+(isOutput?' · '+activeLabel+' only':'')} val={el.subSize!=null?el.subSize:30} onChange={v=>update({subSize:v})} />
                <Chips label="Subtitle weight" options={WEIGHTS_MONT} value={el.subWeight||600} onChange={v=>update({subWeight:v})} />
                <Slider label="Subtitle tracking" val={el.subTracking!=null?el.subTracking:0.02} min={-0.05} max={0.6} step={0.005} onChange={v=>update({subTracking:v})} suffix="em" />
                <Swatches label="Subtitle colour" value={el.subColor!=null?el.subColor:'fg'} onChange={v=>update({subColor:v})} autoTitle="Auto — follows the title" />
              </React.Fragment>
            : <div className="rs-mini" style={{ marginTop:-2, marginBottom:10 }}>Add a line to sit under the title, inside the same box.</div>}
        </Fold>}
      {el.type==='host' &&
        <Fold id="f-kicker" title="Kicker" dirty={dKicker}>
          <Field label="Kicker (optional)" value={el.kicker} onChange={v=>update({kicker:v})} />
          <Swatches label="“Hosted by” colour" value={el.kickerColor!=null?el.kickerColor:'fg'} onChange={v=>update({kickerColor:v})} autoTitle="Auto — the poster accent" autoBg={AP_PAL[doc.accent]} />
        </Fold>}

      {/* ===================== ROWS ===================== */}
      {caps.list &&
        <Fold id="f-rows" title="Rows" open dirty={dRows}>
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
            <Hint tight>Paste columns split by <b>tabs, dashes or 2+ spaces</b> — date, time, a label and the fixture, in any order. End a line with a symbol (<b>&lt;</b> <b>~</b> …) to tag its category below.</Hint>
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
            <Hint tight>Each day auto-colours by the weekly schedule — <b>Mon</b> green · <b>Tue</b> blue · <b>Wed</b> purple · <b>Thu</b> pink · <b>Fri</b> red · <b>Sat</b> amber · <b>Sun</b> yellow.</Hint>
            <div style={{ height:6 }} />
          </React.Fragment>}
          <Chips label="Row size" options={ROW_SIZES} value={el.rowSize||0} onChange={v=>update({rowSize:v})} />
          <Chips label="Row weight" options={WEIGHTS_MONT} value={el.rowWeight||700} onChange={v=>update({rowWeight:v})} />
          <Slider label="Row tracking" val={el.rowTracking!=null?el.rowTracking:(el.type==='specials'?0.03:0.01)} min={-0.05} max={0.4} step={0.005} suffix="em" onChange={v=>update({rowTracking:v})} />
          <Slider label="Line spacing" val={el.rowGap!=null?el.rowGap:(el.type==='specials'?5:7)} min={0} max={24} step={1} suffix="px" onChange={v=>update({rowGap:v})} />
          <Swatches label="Row text colour" value={el.textColor!=null?el.textColor:el.color} onChange={v=>update({textColor:v})} autoTitle="Auto — stays readable on the surface" />
          {el.type==='sessions' && (()=>{
            const marks = window.parseSessions(el.raw).reduce((a,r)=>{ if(r.marker && a.indexOf(r.marker)<0) a.push(r.marker); return a; }, []);
            if(!marks.length) return <Hint>Tip: end a line with a symbol — <b>&lt;</b>, <b>~</b>, <b>^</b>, <b>●</b> — to tag it. Name + colour the categories here once they appear, and rows get a dot + a legend.</Hint>;
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
        </Fold>}

      {/* ===================== COLOUR & SURFACE ===================== */}
      {caps.surface &&
        <Fold id="f-surface" title="Colour & surface" dirty={dSurface}>
          <Chips label="Surface" options={SURFACES} value={el.surface} onChange={v=>update({surface:v})} />
          <Swatches label={el.type==='host'?'Background / fill':'Fill / accent'} value={el.fill!=null?el.fill:el.color}
            onChange={v=>update({fill:v})} autoTitle="Auto — the poster accent" autoBg={AP_PAL[doc.accent]} />
          <Hint tight>Fill colours an <b>Accent</b> surface and the element’s accent highlights (heading, first row…).</Hint>
        </Fold>}
      {el.type==='weekly' &&
        <Fold id="f-surface" title="Accent" dirty={dSurface}>
          <Swatches label="Bar + day" value={el.fill!=null?el.fill:el.color} onChange={v=>update({fill:v})} autoTitle="Auto — the poster accent" autoBg={AP_PAL[doc.accent]} />
          <Hint tight>The badge stays a white circle; the bar and day follow the accent.</Hint>
        </Fold>}

      {/* ===================== SHADOW ===================== */}
      {caps.shadow && <ShadowControls el={el} update={update} theme={doc.theme} />}

      {/* ===================== TRANSFORM ===================== */}
      <Fold id="f-transform" title={'Transform'+(isOutput?' · '+activeLabel:'')} dirty={dTransform}>
        {/* Numbers first: nudging a slider to an exact 540 is a fight, and
            these are the same X/Y/W/H fields Print Studio has. */}
        <div className="rs-numgrid" style={{ marginBottom:12 }}>
          <NumField label="X" value={Math.round(el.x)} onChange={v=>update({x:Math.round(v)})} />
          <NumField label="Y" value={Math.round(el.y)} onChange={v=>update({y:Math.round(v)})} />
          <NumField label="W" value={Math.round(el.w)} min={60} onChange={v=>update({w:Math.round(v)})} />
          <NumField label="H" value={Math.round(el.h)} min={40} onChange={v=>update({h:Math.round(v)})} />
          <NumField label="Rot°" value={Math.round(el.rot||0)} onChange={v=>update({rot:Math.round(v)})} />
        </div>
        {selCount<2 && <CentreRow label="Centre on the canvas" centre={centre}
          hint={'Exact centre of the '+formatLabel+' canvas — never snapped to the grid.'} />}
        <Chips label="Tilt presets" options={[{v:0,l:'0°'},{v:-3,l:'-3°'},{v:3,l:'+3°'},{v:-6,l:'-6°'},{v:6,l:'+6°'}]} value={el.rot||0} onChange={v=>update({rot:v})} />
        <Slider label="Rotation" val={el.rot||0} min={-45} max={45} onChange={v=>update({rot:v})} suffix="°" />
        <Slider label="Width" val={el.w} min={120} max={1080} step={6} onChange={v=>update({w:v})} suffix="px" />
        {caps.widthPreset && <Chips label="Width presets" options={[{v:540,l:'Half'},{v:756,l:'Wide'},{v:900,l:'Safe'},{v:1080,l:'Bleed'}]} value={el.w} onChange={v=>update({w:v})} />}
        {showHeight && <Slider label="Height" val={el.h} min={70} max={1920} step={6} onChange={v=>update({h:v})} suffix="px" />}
        {caps.height && <Chips label="Height presets — match across tags" options={TAG_HEIGHTS} value={el.h} onChange={v=>update({h:v})} />}
        <Chips label="Anchor (all formats)" options={[{v:'safe',l:'Safe cluster'},{v:'bottom',l:'Pin to base'}]} value={el.anchor||'safe'} onChange={v=>update({anchor:v})} />
      </Fold>

      {/* ===================== PER-FORMAT OVERRIDE ===================== */}
      {isOutput &&
        <Fold id="f-override" title={activeLabel+' only'} open badge={el._overridden?'detached':null}>
          <Chips label={'Visibility · '+activeLabel} options={[{v:false,l:'Shown'},{v:true,l:'Hidden'}]} value={!!el.hidden} onChange={v=>toggleHidden(el.id, v)} />
          {el._overridden
            ? <React.Fragment>
                <button className="rs-addrow" onClick={()=>resetOverride(el.id)}>↺ Reset to Master</button>
                <div className="rs-mini" style={{ margin:'6px 0 10px' }}>Layout detached for {activeLabel}. Reset to follow Master again.</div>
              </React.Fragment>
            : <div className="rs-mini" style={{ marginBottom:10 }}>Following Master. Move, resize, rotate{el.type==='photo'?', reframe the photo':''}{isText?', resize text':''} to override just {activeLabel}.</div>}
        </Fold>}
    </React.Fragment>
  );
}

/* ---------- topbar ---------- */
function Topbar({ doc, setDoc, overrideCount, resetFormat, onExport, exporting, exportMsg, cloudUser, cloudMsg, onCloudSignIn, onCloudSignOut, onExportToEvent,
                  onSaveTpl, canUndo, canRedo, onUndo, onRedo, zoomPct, onZoomStep, onZoomFit }){
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
  const printOn = ['a4','a1'].concat(AP_STD).concat(AP_HND).indexOf(doc.activeFormat)>=0;
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
        {/* The label used to read "Print options…" even while you were LOOKING at
            an A1 — the selected size was only discoverable by opening the menu.
            Now the closed state names what's active. */}
        <select className={'rs-stsel'+(printOn?' on':'')}
          aria-label="Print options"
          value={printOn ? doc.activeFormat : ''}
          onChange={e=>{ if(e.target.value) setDoc(d=>({...d, activeFormat:e.target.value})); }}
          title="Print outputs — A4, A1 XL, roll-up standees, and handout flyers. A4 rides the Save-All bundle; the rest are on-demand at true print resolution (PDF as a real-world mm page a shop runs 1:1).">
          <option value="">{printOn ? 'Print · '+AP_FMT[doc.activeFormat].label : 'Print options…'}</option>
          <option value="a4">{AP_FMT['a4'].label} · {AP_FMT['a4'].sub}</option>
          <option value="a1">{AP_FMT['a1'].label} · {AP_FMT['a1'].sub}</option>
          <optgroup label="Standees">{AP_STD.map(fmt=>(<option key={fmt} value={fmt}>{AP_FMT[fmt].label} cm</option>))}</optgroup>
          <optgroup label="Handouts">{AP_HND.map(fmt=>(<option key={fmt} value={fmt}>{AP_FMT[fmt].label}</option>))}</optgroup>
        </select>
        {isOutput && <button className="rs-iconbtn" disabled={!overrideCount} onClick={resetFormat}
          title="Clear all overrides for this format">↺ {overrideCount||0}</button>}
      </div>
      <div className="rs-tgroup">
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
      <div className="rs-tgroup">
        <div className="rs-seg">
          <button disabled={!canUndo} onClick={onUndo} title="Undo (Ctrl-Z)">↶</button>
          <button disabled={!canRedo} onClick={onRedo} title="Redo (Ctrl-⇧-Z)">↷</button>
        </div>
      </div>
      <div className="rs-tgroup">
        <div className="rs-seg">
          <button onClick={()=>onZoomStep(-1)} title="Zoom out">−</button>
          <button onClick={onZoomFit} title="Fit the poster to the pane">{zoomPct}</button>
          <button onClick={()=>onZoomStep(1)} title="Zoom in">＋</button>
        </div>
      </div>
      <button className={'rs-iconbtn'+(doc.showGrid?' on':'')} onClick={()=>setDoc(d=>({...d,showGrid:!d.showGrid}))}>Grid</button>
      <button className={'rs-iconbtn'+(doc.snap?' on':'')} onClick={()=>setDoc(d=>({...d,snap:!d.snap}))}>Snap</button>
      <HintsToggle />
      <div className="spacer" />
      {/* WP9: cloud sync + poster write-back. Hidden entirely if RCloud failed to
          load; otherwise a sign-in toggle + an "Export to event…" affordance.
          Sign-in/out and the picker are fully best-effort (no-op when dormant). */}
      {hasCloud && <div className="rs-tgroup">
        {/* The group label names the ACCOUNT once signed in. Templates are stored
            per account, so signing in with the other Google account looks exactly
            like an empty library — this is where you notice. */}
        <span className="gl" title={cloudUser ? 'Signed in as '+cloudUser : undefined}>
          {cloudMsg || (cloudUser ? String(cloudUser).split('@')[0] : 'Cloud')}</span>
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
      {/* Keeping the poster and exporting it are the two things you finish on, so
          they share the sticky right-hand block — Save template used to live
          only at the foot of the template list, a scroll away down the library. */}
      <div className="rs-export">
        <div className="rs-tgroup">
          <button className="rs-iconbtn" onClick={onSaveTpl} disabled={!doc.elements.length}
            title="Keep this poster in My templates — filed under the weekday its accent codes for (also the ＋ at the foot of the template list)">
            ⤓ Save template</button>
        </div>
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
      </div>
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

  /* ---- undo / redo ----
     Poster Studio never had this, which is a strange thing to say about a tool
     whose whole job is trying things. Same model as Print Studio's: every doc
     change starts a 350ms timer, and the timer is what commits a history entry
     — so dragging a slider across forty values is ONE undo, not forty. `skip`
     stops the undo's own setDoc from being recorded as a new edit. */
  const [histVer, setHistVer] = React.useState(0);
  const hist = React.useRef({ past:[], future:[], prev:null, pending:null, timer:null, skip:false });
  React.useEffect(()=>{
    const h = hist.current;
    if(h.skip){ h.skip=false; h.prev=doc; return; }
    if(h.prev==null){ h.prev=doc; return; }
    if(h.pending==null) h.pending=h.prev;
    h.prev=doc;
    clearTimeout(h.timer);
    h.timer=setTimeout(()=>{
      h.past.push(h.pending); if(h.past.length>80) h.past.shift();
      h.future=[]; h.pending=null; setHistVer(v=>v+1);
    }, 350);
  }, [doc]);
  const undo = React.useCallback(()=>{
    const h = hist.current;
    clearTimeout(h.timer);
    if(h.pending!=null){ h.past.push(h.pending); h.pending=null; h.future=[]; }
    const prev = h.past.pop(); if(!prev) return;
    h.future.push(docRef.current); h.skip=true;
    setDoc(prev); setHistVer(v=>v+1);
    setSelectedIds(ids=>ids.filter(id=>prev.elements.some(e=>e.id===id)));
  }, []);
  const redo = React.useCallback(()=>{
    const h = hist.current;
    const nxt = h.future.pop(); if(!nxt) return;
    h.past.push(docRef.current); h.skip=true;
    setDoc(nxt); setHistVer(v=>v+1);
    setSelectedIds(ids=>ids.filter(id=>nxt.elements.some(e=>e.id===id)));
  }, []);

  /* ---- WP9 cloud sign-in state (best-effort; localStorage stays the source of
     truth). `cloudUser` is just for the toolbar label; null = local-only. ---- */
  const [cloudUser, setCloudUser] = React.useState(()=>{ try{ return window.RCloud && window.RCloud.isSignedIn() ? (window.RCloud.currentEmail()||'signed in') : null; }catch(e){ return null; } });
  /* Restoring a library onto a new computer is one request per template — say so,
     rather than looking idle for a few minutes. */
  const [cloudMsg, setCloudMsg] = React.useState(null);
  const cloudProgress = React.useCallback((done, total)=>{
    setCloudMsg(done>=total ? null : 'Restoring '+done+'/'+total+'…');
  }, []);
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
        try{ if(window.RStore.cloudPull) await window.RStore.cloudPull(cloudProgress); }catch(e){}
        /* Re-read the store rather than taking the pull's own list — same reason
           as the loader: that list predates the round-trip, and signing in
           mid-session must not roll the library back over a save made while the
           restore was running. */
        try{ const after = await window.RStore.tplGetAll();
          if(Array.isArray(after) && after.length) setUserTpls(sortTpls(after)); }catch(e){}
        finally{ setCloudMsg(null); }
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
  /* Resolved elements (Master values with this format's overrides folded in) —
     the arrow-nudge needs the positions you can actually SEE, then writes back
     through updateEl so the edit lands in the right place: on Master, or as an
     override for the format you're looking at. */
  const resolvedRef = React.useRef([]);
  React.useEffect(()=>{
    function onKey(e){
      const ae = document.activeElement;
      const typing = ae && (ae.tagName==='INPUT'||ae.tagName==='TEXTAREA'||ae.tagName==='SELECT'||ae.isContentEditable);
      const mod = e.ctrlKey||e.metaKey;
      if(mod && (e.key==='z'||e.key==='Z')){ if(typing) return; e.preventDefault(); e.shiftKey?redo():undo(); return; }
      if(mod && (e.key==='y'||e.key==='Y')){ if(typing) return; e.preventDefault(); redo(); return; }
      if(typing) return;
      const ids = selIdsRef.current;

      if(mod && (e.key==='a'||e.key==='A')){ e.preventDefault(); setSelectedIds(docRef.current.elements.map(x=>x.id)); return; }
      if(mod && (e.key==='d'||e.key==='D')){
        e.preventDefault();
        if(!ids.length) return;
        const cur = docRef.current, copies = [];
        ids.forEach(id=>{ const src = cur.elements.find(x=>x.id===id);
          if(src) copies.push(Object.assign(JSON.parse(JSON.stringify(src)), { id:window.uid(), x:src.x+40, y:src.y+40 })); });
        if(copies.length){ setDoc(d=>({ ...d, elements:[...d.elements, ...copies] })); setSelectedIds(copies.map(c=>c.id)); }
        return;
      }
      if(e.key==='Escape'){ setSelectedIds([]); return; }

      if(e.key==='Delete' || e.key==='Backspace'){
        if(!ids.length) return;
        e.preventDefault();
        setDoc(d=>{ const overrides=Object.assign({}, d.overrides);
          Object.keys(overrides).forEach(f=>{ let fo=overrides[f]; if(!fo) return; let changed=false;
            ids.forEach(id=>{ if(fo[id]){ if(!changed){ fo=Object.assign({},fo); changed=true; } delete fo[id]; } });
            if(changed) overrides[f]=fo; });
          return {...d, elements:d.elements.filter(e=>ids.indexOf(e.id)<0), overrides};
        });
        setSelectedIds([]);
        return;
      }

      if(e.key==='ArrowLeft'||e.key==='ArrowRight'||e.key==='ArrowUp'||e.key==='ArrowDown'){
        if(!ids.length) return;
        e.preventDefault();
        // 6px = one grid step, so a nudge lands on the same armature a drag
        // snaps to. Shift moves five steps.
        const st = e.shiftKey?30:6;
        const dx = e.key==='ArrowLeft'?-st : e.key==='ArrowRight'?st : 0;
        const dy = e.key==='ArrowUp'?-st : e.key==='ArrowDown'?st : 0;
        const up = updateElRef.current;
        ids.forEach(id=>{ const r = resolvedRef.current.find(x=>x.id===id);
          if(r) up(id, { x:r.x+dx, y:r.y+dy }); });
        return;
      }
    }
    window.addEventListener('keydown', onKey);
    return ()=>window.removeEventListener('keydown', onKey);
  }, [undo, redo]);

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

  /* Zoom. The stage has always fitted the poster to the pane and left it there,
     which is fine until you're nudging a 6px inset on a 1080px canvas rendered
     at 0.4. `fit` stays the auto-computed scale; `zoom` multiplies it, and
     changing format or resizing the pane refits without discarding the zoom. */
  const [fit, setFit] = React.useState(0.4);
  const [zoom, setZoom] = React.useState(1);
  React.useLayoutEffect(()=>{
    function recompute(){
      const s = stageRef.current; if(!s) return;
      const pad = 96, f = AP_FMT[viewFormat];
      setFit(Math.min((s.clientWidth-pad)/f.w, (s.clientHeight-pad)/f.h));
    }
    recompute();
    const ro = new ResizeObserver(recompute);
    if(stageRef.current) ro.observe(stageRef.current);
    return ()=>ro.disconnect();
  }, [viewFormat]);
  React.useEffect(()=>{ setScale(fit*zoom); }, [fit, zoom]);
  const ZOOMS = [0.5, 0.75, 1, 1.5, 2, 3];
  const zoomStep = (dir)=>setZoom(z=>{
    const i = ZOOMS.findIndex(v=>v>z+0.001);
    const at = dir>0 ? (i<0 ? ZOOMS.length-1 : i)
                     : (i<=0 ? 0 : (Math.abs(ZOOMS[i-1]-z)<0.001 ? Math.max(0,i-2) : i-1));
    return ZOOMS[Math.max(0, Math.min(ZOOMS.length-1, at))];
  });
  const zoomPct = Math.round(fit*zoom*100)+'%';

  /* resolved elements for the current view */
  const resolved = React.useMemo(()=> doc.activeFormat==='master'
    ? doc.elements.map(e=>Object.assign({}, e, {_overridden:false}))
    : apResolve(doc, doc.activeFormat)
  , [doc]);
  const sel = resolved.find(e=>e.id===selectedId) || null;
  resolvedRef.current = resolved;
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
    /* A poster that covers every date of a weekly stays date-less ("Thu · 19:00");
       one that belongs to THIS date pins it: "Thu 9.7 · 19:00". That's one-offs,
       hand-edited dates, and series whose topic changes weekly — Film Club and
       Storyteller print a date because their artwork is only true for one night.
       Sentence case, not caps: the chip is a FACT and renders in Grotesk, which
       is never uppercased (canon M3) — AP_DABBR is already in the house form. */
    const when = ((di!=null?AP_DABBR[di]:'')
      + (seriesWidePoster(ev) ? '' : ' '+feedDayLabel(ev.startsAt)) + ' · ' + feedTime(ev.startsAt)).trim();
    /* Fill every box the feed can populate: the day·time chip, the host credit,
       and the price chip. Host keeps the template placeholder when the event has
       none; cost reads "Free" when the event carries no price (the feed's null
       cost means free — matching the app's own event page). */
    built.elements.forEach(el=>{
      if(el.type==='title'){ el.text = title; el.fontSize = queueTitleSize(title); }
      if(el.type==='when'){ el.text = when; el.w = 450; }
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
  /* Non-null when the IndexedDB library could not be read — the panel is then
     showing the legacy localStorage backup, and says so. */
  const [tplStoreErr, setTplStoreErr] = React.useState(null);
  /* Recently deleted — the last few templates that left the library by any
     route (Delete, saved over, displaced by an import). */
  const [tplBin, setTplBin] = React.useState([]);
  const refreshBin = React.useCallback(async ()=>{
    try{ const b = await window.RStore.binGetAll(); setTplBin(Array.isArray(b)?b:[]); }catch(e){}
  }, []);
  /* Put one back. If its id has since been taken by a different template, the
     restored copy gets a new one rather than overwriting the sitting tenant. */
  async function restoreFromBin(entry){
    if(!entry || !entry.tpl) return;
    const taken = userTpls.some(t=>t.id===entry.tpl.id);
    const t = Object.assign({}, entry.tpl, taken ? { id: tplId() } : null);
    try{ await window.RStore.tplPut(t); }
    catch(e){ console.error(e); window.alert('Couldn’t put that template back right now — try again.'); return; }
    try{ await window.RStore.binDelete(entry.id); }catch(e){}
    setUserTpls(prev=>{
      const i = prev.findIndex(p=>p.id===t.id);
      if(i<0) return [t, ...prev];
      const next = prev.slice(); next[i]=t; return next;
    });
    refreshBin();
  }
  /* Ask the account for everything it has that this browser hasn't. The load
     path already tries this quietly and gives up silently on any hub error;
     this one reports what it found, so "the hub hasn't got it either" is
     something you can see rather than infer. */
  const [restoring, setRestoring] = React.useState(false);
  async function restoreFromCloud(){
    if(restoring) return;
    if(!window.RCloud || !window.RCloud.isSignedIn()){
      window.alert('Sign in to the REALITY hub first (top right) — that’s where the off-machine copies live.');
      return;
    }
    setRestoring(true); setCloudMsg('Checking the hub…');
    try{
      const r = await window.RStore.cloudRestore((done,total)=>setCloudMsg('Restoring '+done+'/'+total+'…'));
      try{ const after = await window.RStore.tplGetAll();
        if(Array.isArray(after) && after.length) setUserTpls(sortTpls(after)); }catch(e){}
      window.alert(r.restored
        ? 'Restored '+r.restored+' template'+(r.restored===1?'':'s')+' from the hub.'
          +(r.failed? ' '+r.failed+' couldn’t be read.':'')
        : 'Nothing to restore — the hub holds '+r.hub+' template'+(r.hub===1?'':'s')
          +' and this browser already has all of them.'
          +(r.hub? '\n\nIf something is still missing it was never mirrored to the hub (a photo-heavy template can exceed the hub’s per-document cap) or it was deleted from both. Check Recently deleted.' : ''));
    }catch(e){
      console.error(e);
      window.alert('Couldn’t reach the hub just now — nothing was changed. Check the connection and try again.');
    }finally{ setRestoring(false); setCloudMsg(null); }
  }
  /* Card pictures, { [id]: {src,w,h} } — a derived, local-only cache (see
     RStore's thumbnail notes). Missing ones are shot by the card that wants
     them, so an existing library fills itself in as you open its days. */
  const [tplThumbs, setTplThumbs] = React.useState({});
  const captureTplThumb = React.useCallback((id, thumb)=>{
    if(!id || !thumb) return;
    setTplThumbs(m => m[id] ? m : Object.assign({}, m, { [id]:thumb }));
    try{ Promise.resolve(window.RStore.thumbPut(id, thumb)).catch(()=>{}); }catch(e){}
  }, []);
  /* Forget a card's picture — the template it drew is gone or has been saved
     over, and a stale thumbnail showing the poster it replaced is worse than a
     card that simply redraws itself. */
  const forgetTplThumb = React.useCallback((id)=>{
    setTplThumbs(m=>{ if(!m[id]) return m; const n = Object.assign({}, m); delete n[id]; return n; });
  }, []);
  React.useEffect(()=>{ let live=true; (async()=>{
    try{
      const m = await window.RStore.migrate();
      const local = await window.RStore.tplGetAll();
      /* Show what's on THIS disk immediately, before the cloud round-trip.
         That trip spends one request per template it has to restore and can run
         for minutes; the library used to stay empty for all of it, and two
         things went wrong in that window. A save made during it was checked for
         a name clash against an empty list — so it made a SECOND copy under the
         same name instead of replacing the first — and was then wiped off the
         list by `setUserTpls(all)`, a snapshot read before the save happened.
         From the outside that is a save that didn't take. Local disk is the
         source of truth and it is right here, so it goes up first. */
      if(!live) return;
      setUserTpls(sortTpls(local));
      setTplReady(true);
      if(m && m.migrated) console.info('[studio] moved '+m.migrated+' template(s) into IndexedDB; the old localStorage copy is kept as a backup.');
      /* One read for the whole library's card pictures. Best-effort: without
         them every card just renders itself live, exactly as it used to. */
      try{ const thumbs = await window.RStore.thumbGetAll(); if(live && thumbs) setTplThumbs(thumbs); }catch(e){}
      if(live) refreshBin();
      /* WP9: migrate this browser's library UP to the account, then pull any cloud
         templates this browser is missing. IndexedDB stays the source of truth —
         both calls never throw and no-op when signed-out / hub dormant. */
      try{ if(window.RStore.cloudPushAll) await window.RStore.cloudPushAll(); }catch(e){}
      try{ if(window.RStore.cloudPull) await window.RStore.cloudPull(cloudProgress); }catch(e){}
      if(live) setCloudMsg(null);
      /* Re-READ rather than trust what the pull returned: its list was taken
         before the round-trip, so a template saved while it ran is on disk but
         not in it. A non-empty read is the disk and replaces the list outright;
         an empty one is left alone, since Delete and Import are the only ways to
         empty the store and both update the list themselves. */
      try{
        const after = await window.RStore.tplGetAll();
        if(live && Array.isArray(after) && after.length) setUserTpls(sortTpls(after));
      }catch(e){}
    }catch(e){
      console.error('[studio] IndexedDB template store unavailable — showing the localStorage copy read-only.', e);
      /* Say so on screen. This used to be a console line only, so a single
         IndexedDB hiccup silently swapped the real library for the pre-migration
         localStorage copy — every template saved since the move to IndexedDB
         just wasn't there, with nothing on screen to say why. */
      if(live){ setTplStoreErr(String((e && e.message) || e || 'unknown error')); setUserTpls(loadUserTpls()); }
    }finally{ if(live){ setTplReady(true); setCloudMsg(null); } }
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
    /* The name match decides replace-vs-new, so it has to be made against the
       REAL library. Normally that's the on-screen list; if it hasn't landed yet
       ask the store instead of matching against nothing, which is how you end up
       with two templates under one name and one of them apparently missing. */
    let library = userTpls;
    if(!tplReady){
      try{ const fresh = await window.RStore.tplGetAll(); if(Array.isArray(fresh)) library = fresh; }catch(e){}
    }
    const existing = library.find(t=>t.name.toLowerCase()===name.toLowerCase());
    if(existing && !window.confirm('A template called “'+existing.name+'” already exists. Replace it?')) return;
    const snap = JSON.parse(JSON.stringify({ elements:d.elements, overrides:d.overrides||{},
      masterFormat:d.masterFormat, theme:d.theme, accent:d.accent, title:d.title||'',
      eventRef:d.eventRef||null }));
    /* eventId claims the queue entry that spawned this poster — saving files the
       template under its day and takes the event off "In queue". Saving always
       lands the template in the active library (never straight into Archive). */
    const t = { id: existing? existing.id : tplId(), name, savedAt: Date.now(),
      eventId: (d.eventRef && d.eventRef.key) || (existing && existing.eventId) || null,
      archived: false, doc: snap };
    /* Saving over a template overwrites a finished poster. Keep the version it
       replaces in Recently deleted first, so "replace it?" is undoable. */
    if(existing){ try{ await window.RStore.binPut(existing, 'saved over'); }catch(e){} }
    try{ await window.RStore.tplPut(t); }
    catch(e){ console.error(e); window.alert('Couldn’t save the template — the browser blocked writing to storage. Your other templates are unaffected.'); return; }
    /* Saving over a template replaces its artwork, so its card picture is now a
       photo of the poster you just overwrote — drop it and let the card reshoot.
       (Which also makes re-saving the way to fix a thumbnail you don't like.) */
    try{ await window.RStore.thumbDelete(t.id); }catch(e){}
    forgetTplThumb(t.id);
    /* Functional, like every other list write below. `userTpls` here is whatever
       this handler closed over when it started — and a save waits on a prompt, a
       confirm and an IndexedDB write, which is plenty of time for the loader or
       a sign-in to have replaced the list underneath it. Folding into `prev`
       means the two can't overwrite each other. */
    setUserTpls(prev=>{
      const i = prev.findIndex(p=>p.id===t.id);
      if(i<0) return [t, ...prev];
      const next = prev.slice(); next[i] = t; return next;
    });
    if(existing) refreshBin();
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
    setUserTpls(prev=>prev.map(x=>x.id===id? next : x));
  }
  async function delUserTpl(id){
    const t = userTpls.find(x=>x.id===id);
    if(t && !window.confirm('Delete the template “'+t.name+'”?')) return;
    /* Into Recently deleted first — a mis-click on a 20px × next to a 20px ⤓
       used to be the end of that poster. */
    if(t){ try{ await window.RStore.binPut(t, 'deleted'); }catch(e){} }
    try{ await window.RStore.tplDelete(id); }
    catch(e){ console.error(e); window.alert('Couldn’t delete that template right now — try again.'); return; }
    forgetTplThumb(id);
    setUserTpls(prev=>prev.filter(x=>x.id!==id));
    refreshBin();
  }

  /* ---- template portability — templates live in this browser's localStorage
     only, so Export writes the whole "My templates" list to a .json (photo
     data URLs included) and Import merges a file back in on another machine.
     Same name or id replaces; anything else is added. */
  const tplFileRef = React.useRef(null);
  async function exportUserTpls(){
    /* Read the STORE. This used to write out whatever the panel was showing, so
       a backup taken while the library was still syncing was short — and a short
       backup imported later used to take the rest of the library with it. */
    let all = userTpls;
    try{ const fresh = await window.RStore.tplGetAll(); if(Array.isArray(fresh) && fresh.length) all = fresh; }
    catch(e){ console.error(e); }
    if(!all.length){ window.alert('No saved templates to export yet.'); return; }
    const payload = { kind:'reality-studio-templates', version:1,
      exportedAt:new Date().toISOString(), templates:sortTpls(all) };
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
        .map(t=>({ id: t.id || tplId(), name: t.name.trim(), savedAt: t.savedAt || Date.now(),
                   eventId: t.eventId || null, archived: !!t.archived,
                   doc: Object.assign({ masterFormat:'4x5', theme:'day', accent:'blue', overrides:{}, title:'' }, t.doc) }));
      if(!incoming.length){ window.alert('No usable templates in that file.'); return; }
      const skipped = list.length - incoming.length;
      /* Merge against the STORE, never against the on-screen list.
         This used to build its result from `userTpls` and hand it to
         tplReplaceAll, which CLEARED the store and wrote back exactly that
         list — so importing while the library was short (it stayed empty for
         the whole of a cloud restore) permanently deleted every template that
         wasn't on screen at that instant. Nothing here clears anything, and
         an unreadable library aborts rather than guessing. */
      let current = [];
      try{ current = await window.RStore.tplGetAll(); }
      catch(e){ console.error(e);
        window.alert('Couldn’t read your library, so nothing was imported and nothing was changed. Reload the page and try again.');
        return; }
      /* A record the import supersedes by NAME under a different id has to go,
         or the same name sits in the library twice. Those go to Recently
         deleted first, and their cloud copies are left alone. */
      const drop = [];
      incoming.forEach(t=>{
        const clash = current.find(p=>p.id!==t.id && p.name.toLowerCase()===t.name.toLowerCase());
        if(clash && drop.indexOf(clash.id)<0) drop.push(clash.id);
      });
      const replaced = drop.length + incoming.filter(t=>current.some(p=>p.id===t.id)).length;
      for(const id of drop){
        const old = current.find(p=>p.id===id);
        if(old){ try{ await window.RStore.binPut(old, 'replaced by an import'); }catch(e){} }
      }
      try{ await window.RStore.tplApply(incoming, drop); }
      catch(e){ console.error(e); window.alert('Couldn’t save the imported templates to storage — nothing was changed.'); return; }
      /* Everything the file touched carries new artwork under an id that may
         already have a card picture — drop those, keep the rest. */
      try{
        const after = await window.RStore.tplGetAll();
        const touched = {}; incoming.forEach(t=>{ touched[t.id]=1; }); drop.forEach(id=>{ touched[id]=1; });
        const keep = after.filter(t=>!touched[t.id]).map(t=>t.id);
        await window.RStore.thumbPrune(keep);
        setTplThumbs(m=>{ const n={}; keep.forEach(id=>{ if(m[id]) n[id]=m[id]; }); return n; });
        setUserTpls(sortTpls(after));
      }catch(e){ console.error(e); }
      await refreshBin();
      window.alert('Imported '+incoming.length+' template'+(incoming.length===1?'':'s')
        +(replaced? ' — '+replaced+' replaced an existing one'+(replaced===1?'':'s'):'')
        +(skipped? ' ('+skipped+' unreadable, skipped)':'')
        +'.\n\nNothing else in your library was touched'
        +(drop.length? ', and the '+drop.length+' it replaced went to Recently deleted.':'.'));
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
  /* scope: 'one' (this date) | 'series' (every upcoming date of the series).
     The picker only offers the choice when the target actually repeats. */
  async function exportToEvent(eventId, scope){
    if(exporting || !window.htmlToImage || !window.RCloud) return;
    /* grab the picker's feed rows before closing it — the post-send message needs
       to know whether the target belongs to a series, and the fan-out fallback
       needs the sibling dates */
    const pickedFrom = (eventPicker && eventPicker.events) || [];
    setEventPicker(null);
    const feedRows = pickedFrom.length ? pickedFrom : ((queueFeed && queueFeed.events) || []);
    const target = feedRows.find(e=>e.id===eventId) || null;
    const wantSeries = scope==='series' && !!(target && target.seriesId);
    /* The other upcoming dates of this series, soonest first. Only walked on the
       FALLBACK path: a hub that understands scope=series answers seriesForced,
       having already stamped the series default and every date in one write. */
    const siblings = wantSeries
      ? feedRows.filter(e=>e.seriesId===target.seriesId && e.id!==eventId)
          .sort((a,b)=>String(a.startsAt||'').localeCompare(String(b.startsAt||'')))
      : [];
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
    let ok = 0, failed = 0, wideHits = 0, forcedHits = 0, fanFailed = 0;
    const fanned = {};   // sibling ids that took at least one slot on the fallback path
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
        const res = await window.RCloud.putPoster(eventId, m.slot, up.blob, up.type,
          wantSeries ? { scope:'series' } : undefined);
        if(res && res.ok){ ok++; if(res.seriesWide) wideHits++; if(res.seriesForced) forcedHits++; }
        else { failed++; continue; }
        /* Fallback for a hub deployed before scope=series: it stamped at most the
           non-detached dates, so push the same bytes onto each sibling by hand.
           Costs one upload per date — it stops happening the moment the hub starts
           answering seriesForced. */
        if(wantSeries && !res.seriesForced){
          for(let i=0;i<siblings.length;i++){
            setExportMsg(label+' — date '+(i+2)+' of '+(siblings.length+1)+'…');
            const r2 = await window.RCloud.putPoster(siblings[i].id, m.slot, up.blob, up.type, { scope:'series' });
            if(r2 && r2.ok) fanned[siblings[i].id] = 1; else fanFailed++;
          }
        }
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
         old poster. Say so, or it reads as "the update didn't work"; "All N dates"
         is the way past it. Each outcome gets its own line — none of them can be
         inferred from the canvas, so silence here is what made this confusing. */
      const isSeries = !!(target && target.seriesId);
      const seriesRun = wantSeries && ok>0;
      const dates = forcedHits ? (siblings.length+1) : (Object.keys(fanned).length+1);
      const oneDateOnly = ok>0 && !wantSeries && isSeries && wideHits===0;
      const wentWide    = ok>0 && !wantSeries && isSeries && wideHits>0;
      const lost = failed + fanFailed;
      setExportMsg(!ok ? 'Export to event failed'
        : seriesRun   ? ('Sent to '+dates+' date'+(dates===1?'':'s')+' in the series'+(lost?(' · '+lost+' failed'):''))
        : oneDateOnly ? 'Sent to THIS DATE only — the rest of the series keeps its old poster'
        : wentWide    ? 'Sent to the event — this series shares one poster, so every date took it'
        : ('Sent '+ok+' image'+(ok===1?'':'s')+' to the event'+(failed?(' · '+failed+' failed'):'')));
      await new Promise(r=>setTimeout(r, ok?((oneDateOnly||wentWide||seriesRun)?3400:1600):1800));
    }catch(err){
      console.error('export-to-event failed', err);
      setPlateOnly(false);
      setDoc(d=>({ ...d, activeFormat:prev }));
      setExportMsg('Export to event failed'); await new Promise(r=>setTimeout(r,1600));
    }
    setExporting(false); setExportMsg('');
  }

  const h = hist.current;

  /* Ctrl-K. The Fold index covers every inspector control on its own; these are
     the poster-level commands, which otherwise live only as 10px buttons in a
     topbar that has run out of room. */
  const [palOpen, setPalOpen] = RUI.usePalette();
  React.useEffect(()=>{
    RUI.setActions([].concat(
      [{ label:'View · Master (source)', group:'Format', run:()=>setDoc(d=>({...d, activeFormat:'master'})) }],
      AP_OUT.filter(f=>f!=='a4').map(f=>({ label:'View · '+AP_FMT[f].label+' ('+AP_FMT[f].sub+')', group:'Format', run:()=>setDoc(d=>({...d, activeFormat:f})) })),
      ['a4','a1'].concat(AP_STD).concat(AP_HND).map(f=>({ label:'Print · '+AP_FMT[f].label, group:'Format', run:()=>setDoc(d=>({...d, activeFormat:f})) })),
      AP_ABYDAY.map((a,i)=>({ label:'Day · '+AP_DNAMES[i]+' ('+a+')', group:'Accent', run:()=>setDoc(d=>({...d, accent:a})) })),
      [{ label:'Palette · Day', group:'Theme', run:()=>setDoc(d=>({...d, theme:'day'})) },
       { label:'Palette · Night', group:'Theme', run:()=>setDoc(d=>({...d, theme:'night'})) },
       { label:'Toggle grid', group:'View', run:()=>setDoc(d=>({...d, showGrid:!d.showGrid})) },
       { label:'Toggle snap', group:'View', run:()=>setDoc(d=>({...d, snap:!d.snap})) },
       { label:'Toggle hints', group:'View', run:()=>RUI.setHints(!RUI.hintsOn()) },
       { label:'Zoom to fit', group:'View', run:()=>setZoom(1) },
       { label:'Undo', group:'Edit', run:undo },
       { label:'Redo', group:'Edit', run:redo },
       { label:'Select all', group:'Edit', run:()=>setSelectedIds(docRef.current.elements.map(x=>x.id)) },
       { label:'Save current poster as a template', group:'Templates', run:saveUserTpl },
       { label:'Save images', group:'Export', run:()=>doExport(docRef.current.title||'') }]
    ));
  }, [doc.activeFormat, doc.theme, doc.showGrid, doc.snap, undo, redo]);

  return (
    <div className="rs-app">
      <Topbar doc={doc} setDoc={setDoc} overrideCount={overrideCount} resetFormat={resetFormat}
        onExport={doExport} exporting={exporting} exportMsg={exportMsg}
        cloudUser={cloudUser} cloudMsg={cloudMsg} onCloudSignIn={cloudSignIn} onCloudSignOut={cloudSignOut} onExportToEvent={openEventPicker}
        onSaveTpl={saveUserTpl}
        canUndo={h.past.length>0||h.pending!=null} canRedo={h.future.length>0} onUndo={undo} onRedo={redo}
        zoomPct={zoomPct} onZoomStep={zoomStep} onZoomFit={()=>setZoom(1)} />
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
              {/* A count of everything saved, and of the two places a template
                  goes when it ISN'T under the weekday you expect: the Archive
                  drawer (one click of ⤓ on a card puts it there) and Other (the
                  poster's accent isn't a day colour). Without this, a template
                  that had merely moved read as a template that was gone. */}
              {(()=>{
                const arch = userTpls.filter(t=>t.archived).length;
                const other = userTpls.filter(t=>!t.archived && !AP_DAYS[t.doc && t.doc.accent]).length;
                return (
                  <div className="rs-mini" style={{ margin:'6px 0 2px', opacity:.7 }}>
                    My templates · filed by day (accent colour)
                    {tplReady && <React.Fragment> · {userTpls.length} saved
                      {arch>0 && <span title="Archived — open the Archive drawer below to restore them">, {arch} archived</span>}
                      {other>0 && <span title="No day colour — these are under Other">, {other} in Other</span>}
                    </React.Fragment>}
                  </div>
                );
              })()}
              {tplStoreErr &&
                <div className="rs-mini" style={{ margin:'4px 0 8px', padding:'7px 9px', borderRadius:7,
                  border:'1px solid #5a2326', background:'#2a1416', color:'#ffb3b8', opacity:1 }}>
                  <b>This browser couldn’t open the template store</b> ({tplStoreErr}). What’s listed below is
                  the older localStorage backup, not your full library — anything saved since the move to
                  IndexedDB is missing from it. Don’t delete or import over these; reload the page first, and
                  if it says this again, tell Donald before saving anything else.
                </div>}
              {!tplReady &&
                <div className="rs-mini" style={{ margin:'2px 0 6px' }}>Loading your templates…</div>}
              {tplReady && userTpls.length===0 &&
                <div className="rs-mini" style={{ margin:'2px 0 6px' }}>None yet — build a poster, then keep it here for next time.</div>}
              {/* A saved preset is filed under the weekday its accent codes for
                  (green→Mon … yellow→Sun), plus drawers for the ones with no day
                  colour and the ones tucked away. All three are the same Sec the
                  rest of the library uses now, and the card is a real render of
                  the poster rather than a line of text about it. */}
              {tplReady && userTpls.length>0 && AP_DNAMES.map((day,di)=>{
                const dayAccent = AP_ABYDAY[di];
                const items = userTpls.filter(t=> !t.archived && AP_DAYS[t.doc && t.doc.accent] === day);
                return (
                  <Sec key={day} id={'my:'+day} title={AP_DABBR[di]} sub={day} count={items.length}
                    dot={AP_PAL[dayAccent]} open={items.length>0}>
                    {items.length>0
                      ? <div className="rs-tplgrid">
                          {items.map(t=>(
                            <UserTplCard key={t.id} t={t} onApply={()=>applyUserTpl(t)}
                              thumb={tplThumbs[t.id]} onCapture={th=>captureTplThumb(t.id, th)}
                              onArchive={()=>setTplArchived(t.id, true)} onDelete={()=>delUserTpl(t.id)} />
                          ))}
                        </div>
                      : <div className="rs-mini" style={{ margin:'3px 0 8px 12px', opacity:.45 }}>Set a poster’s accent to {dayAccent} to file it here.</div>}
                  </Sec>
                );
              })}
              {tplReady && (()=>{
                const items = userTpls.filter(t=> !t.archived && !AP_DAYS[t.doc && t.doc.accent]);
                if(!items.length) return null;
                return (
                  <Sec id="my:other" title="Other" sub="no day colour" count={items.length} open>
                    <div className="rs-tplgrid">
                      {items.map(t=>(
                        <UserTplCard key={t.id} t={t} onApply={()=>applyUserTpl(t)}
                          thumb={tplThumbs[t.id]} onCapture={th=>captureTplThumb(t.id, th)}
                          onArchive={()=>setTplArchived(t.id, true)} onDelete={()=>delUserTpl(t.id)} />
                      ))}
                    </div>
                  </Sec>
                );
              })()}
              {tplReady && (()=>{
                const arch = userTpls.filter(t=>t.archived);
                return (
                  <Sec id="my:archive" title="Archive" sub="tucked away" count={arch.length}>
                    {arch.length
                      ? <div className="rs-tplgrid">
                          {arch.map(t=>(
                            <UserTplCard key={t.id} t={t} archived onApply={()=>applyUserTpl(t)}
                              thumb={tplThumbs[t.id]} onCapture={th=>captureTplThumb(t.id, th)}
                              onArchive={()=>setTplArchived(t.id, false)} onDelete={()=>delUserTpl(t.id)} />
                          ))}
                        </div>
                      : <div className="rs-mini" style={{ margin:'3px 0 8px 12px', opacity:.45 }}>Nothing archived — the ⤓ on any template tucks it away here.</div>}
                  </Sec>
                );
              })()}
              {/* Recently deleted — every route out of the library now leaves a
                  copy here first, so Delete, "replace it?" and a bad import are
                  all undoable. Capped at the last 10; oldest out. */}
              {tplReady && tplBin.length>0 &&
                <Sec id="my:bin" title="Recently deleted" sub="restorable" count={tplBin.length}>
                  <div className="rs-tplgrid">
                    {tplBin.map(e=>(
                      <div key={e.id} className="rs-tplcard" title={e.tpl.name+' — '+e.reason}
                        onClick={()=>restoreFromBin(e)} style={{ opacity:.8 }}>
                        <TplThumb doc={e.tpl.doc} w={88} />
                        <span className="tn">{e.tpl.name}</span>
                        <span className="ts">{e.reason} · {new Date(e.at).toLocaleDateString(undefined,{ day:'numeric', month:'short' })}</span>
                        <button className="rs-tplx" style={{ top:4, width:20, height:20, fontSize:11, borderColor:'#3a2f1f', color:'#b6ab97' }}
                          title={'Put “'+e.tpl.name+'” back in My templates'}
                          onClick={ev=>{ ev.stopPropagation(); restoreFromBin(e); }}>↩</button>
                      </div>
                    ))}
                  </div>
                  <div className="rs-mini" style={{ margin:'0 0 8px 12px', opacity:.45 }}>Click one to put it back. Only the last 10 are kept.</div>
                </Sec>}

              <button className="rs-addrow" onClick={saveUserTpl} style={{ marginBottom:6, marginTop:8 }}>＋ Save current poster as template</button>
              <div className="rs-rowflex" style={{ marginBottom:6 }}>
                <button className="rs-addrow" onClick={exportUserTpls} title="Download every saved template (photos included) as one .json — read straight from storage, not from what's on screen">⬇ Export all</button>
                <button className="rs-addrow" onClick={()=>tplFileRef.current.click()} title="Merge templates in from an exported .json — same name updates, new names add, nothing else is touched">⬆ Import…</button>
              </div>
              <button className="rs-addrow" onClick={restoreFromCloud} disabled={restoring}
                style={{ marginBottom:6 }}
                title="Ask your REALITY hub account for every template this browser hasn't got, and say what it found">
                {restoring ? '↻ Checking the hub…' : '↻ Restore from cloud'}</button>
              <input ref={tplFileRef} type="file" accept=".json,application/json" style={{ display:'none' }}
                onChange={e=>{ const f=e.target.files[0]; if(f) importUserTpls(f); e.target.value=''; }} />
              <Hint tight>Saved in this browser (IndexedDB — room for plenty now). Export a .json to back them up or carry them to another computer, photos and all.</Hint>
              <div className="rs-libtitle" style={{ marginTop:14 }}>Starters<span className="hint">click to load</span></div>
              {AP_TPLG.map(grp=>{
                const items = AP_TPL.filter(tp=>tp.group===grp);
                return (
                  <Sec key={grp} id={'t:'+grp} title={grp} count={items.length}>
                    <div className="rs-tplgrid">
                      {items.map(tp=><TplCard key={tp.id} tpl={tp} onApply={()=>applyTemplate(tp)} />)}
                    </div>
                  </Sec>
                );
              })}
              <Hint>Loading a starter replaces the poster.</Hint>
            </React.Fragment>}
          </React.Fragment>}
          <div className="rs-libtitle">Parts<span className="hint">drag onto the poster</span></div>
          {AP_CAT.map(g=>(
            <Sec key={g.group} id={'c:'+g.group} title={g.group} count={g.items.length}>
              {g.items.map(it=>(
                <div key={it.label} className="rs-libitem" onPointerDown={e=>startSpawn(e, it)}>
                  <span className="ln">{it.label}</span>
                  <span className="lh">{it.hint}</span>
                </div>
              ))}
            </Sec>
          ))}

          {/* GRAPHICS — four families that differ only by one prop, so they're
              grids of silhouettes rather than 60 more library rows. Drag a tile
              out exactly like a part; it lands with that kind preset. */}
          <div className="rs-libtitle">Graphics<span className="hint">drag a silhouette</span></div>
          {AP_GFX.map(g=>(
            <Sec key={g.id} id={'g:'+g.id} title={g.title} count={g.items?g.items.length:null}>
              {g.groups
                ? <IconPicker value={null} onSpawn={startSpawn} />
                : <GfxGrid type={g.type} prop={g.prop} items={g.items} onSpawn={startSpawn} />}
              <Hint>{g.hint}</Hint>
            </Sec>
          ))}

          <Hint>Drag a part onto the poster — it snaps to the grid and joins the Master layout.</Hint>
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
          {/* Feed slice moved INTO the inspector's no-selection panel — it's a
              whole-poster setting, and riding along under every element edit
              was three controls of tax on every selection. */}
          <Inspector el={sel} doc={doc} update={update} dup={dup} del={del} layer={layer}
            clearAll={clearAll} setDoc={setDoc} isOutput={isOutput} activeLabel={activeLabel}
            resetOverride={resetOverride} toggleHidden={toggleHidden}
            selCount={selectedIds.length} align={alignSel} distribute={distributeSel} centre={centreSel}
            formatLabel={activeLabel}
            sliceMode={sliceMode} setSliceMode={setSliceMode} setFeedSlice={setFeedSlice} />
        </div>
      </div>

      {spawn && <div className="rs-ghost" style={{ left:spawn.x, top:spawn.y }}>{spawn.type}</div>}
      {palOpen && <RUI.Palette onClose={()=>setPalOpen(false)} />}

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
  const whenOf = iso => (iso||'').slice(0,16).replace('T',' ');

  /* Search by name. The feed is loaded two months out, so this list is ~300 rows
     deep and the event you want is almost never on screen — scrolling for it was
     the slowest part of a send. Diacritics-blind and token-AND (see
     eventMatches), over both titles, the host and the room code. */
  const [q, setQ] = React.useState('');
  const terms = React.useMemo(()=>{ const n = searchNorm(q).trim(); return n ? n.split(/\s+/) : []; }, [q]);
  const searchRef = React.useRef(null);
  React.useEffect(()=>{ if(!picker.loading){ try{ searchRef.current && searchRef.current.focus(); }catch(e){} } }, [picker.loading]);

  /* seriesId → its upcoming dates, soonest first. Built once so every row can say
     "repeats" without rescanning the feed. */
  const bySeries = React.useMemo(()=>{
    const m = {};
    picker.events.forEach(e=>{ if(e.seriesId) (m[e.seriesId] = m[e.seriesId] || []).push(e); });
    Object.keys(m).forEach(k=>m[k].sort((a,b)=>String(a.startsAt||'').localeCompare(String(b.startsAt||''))));
    return m;
  }, [picker.events]);
  const datesOf = ev => (ev && ev.seriesId && bySeries[ev.seriesId]) || [];

  /* A one-off event sends on the click, exactly as before. A repeating one stops
     for the scope question first: nothing goes series-wide by accident, and
     nothing silently misses the other dates. */
  const [scopeStep, setScopeStep] = React.useState(null);   // null | the picked feed row
  function choose(ev){
    if(!ev) return;
    if(datesOf(ev).length > 1) setScopeStep(ev);
    else onPick(ev.id, 'one');
  }

  const rest = (origin ? picker.events.filter(e=>e.id!==origin.id) : picker.events)
    .filter(ev=>eventMatches(ev, terms));
  const originHit = !!(origin && eventMatches(originEv, terms));
  const kicker = { fontFamily:'Montserrat', fontWeight:700, fontSize:10, letterSpacing:'.09em',
    textTransform:'uppercase', opacity:.55, margin:'2px 0 6px' };

  /* ---- step 2: this date, or the whole series? ---- */
  function renderScope(){
    const dates = datesOf(scopeStep);
    const list = dates.slice(0,8).map(d=>feedDayLabel(d.startsAt)).join(' · ')
      + (dates.length>8 ? '  +'+(dates.length-8)+' more' : '');
    const opt = { display:'block', width:'100%', textAlign:'left', cursor:'pointer', font:'inherit',
      color:'#0d0905', borderRadius:6, marginBottom:8, padding:'10px 12px' };
    return (
      <React.Fragment>
        <div style={{ fontWeight:800, fontSize:14, marginBottom:2 }}>{scopeStep.title_en || scopeStep.title_vi || '(untitled)'}</div>
        <div style={{ fontSize:12, opacity:.7, marginBottom:12 }}>Repeats — {dates.length} upcoming dates in the feed.</div>
        <button onClick={()=>onPick(scopeStep.id, 'one')}
          style={Object.assign({}, opt, { border:'1px solid rgba(120,110,90,.45)', background:'transparent' })}>
          <div style={{ fontFamily:'Montserrat', fontWeight:800, fontSize:13 }}>This date only</div>
          <div style={{ fontSize:11, opacity:.65, marginTop:2 }}>{whenOf(scopeStep.startsAt)}</div>
        </button>
        <button onClick={()=>onPick(scopeStep.id, 'series')}
          style={Object.assign({}, opt, { border:'2px solid #0d0905', background:'#fddf00' })}>
          <div style={{ fontFamily:'Montserrat', fontWeight:800, fontSize:13 }}>All {dates.length} dates</div>
          <div style={{ fontSize:11, opacity:.7, marginTop:2 }}>{list}</div>
        </button>
        <div style={{ fontSize:11, opacity:.6, lineHeight:1.45 }}>
          “All dates” also becomes the series default, so dates the app mints later inherit this poster — and it overrides dates whose poster was set by hand.
        </div>
      </React.Fragment>
    );
  }

  /* ---- step 1: pick the event ---- */
  function renderList(){
    const listable = !picker.loading && !picker.err && picker.events.length>0;
    return (
      <React.Fragment>
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
        {listable &&
          <input ref={searchRef} type="search" value={q} placeholder="Search by name…"
            onChange={e=>setQ(e.target.value)}
            style={{ width:'100%', padding:'8px 10px', marginBottom:10, borderRadius:6,
              border:'2px solid #0d0905', background:'#fff', color:'#0d0905',
              fontFamily:'Space Grotesk, sans-serif', fontSize:13 }} />}
        {!picker.loading && originHit && (
          <React.Fragment>
            <div style={kicker}>This poster’s event</div>
            <div onClick={()=>choose(originEv)}
              style={{ cursor:'pointer', padding:'10px 12px', borderRadius:6, marginBottom:10, border:'2px solid #0d0905', background:'rgba(120,110,90,.07)' }}
              onMouseEnter={e=>e.currentTarget.style.background='rgba(120,110,90,.16)'}
              onMouseLeave={e=>e.currentTarget.style.background='rgba(120,110,90,.07)'}>
              <div style={{ fontWeight:800, fontSize:13 }}>{(originEv && (originEv.title_en || originEv.title_vi)) || origin.title || '(untitled)'}</div>
              <div style={{ fontSize:11, opacity:.6 }}>{whenOf((originEv && originEv.startsAt) || origin.startsAt)}{originEv && originEv.location && originEv.location.code ? ' · '+originEv.location.code : ''}</div>
              <div style={{ fontSize:11, opacity:.75, marginTop:3 }}>↳ Send here — this poster was queued for this event.</div>
            </div>
            {rest.length>0 && <div style={kicker}>…or another event</div>}
          </React.Fragment>
        )}
        {!picker.loading && rest.map(ev=>{
          const n = datesOf(ev).length;
          return (
            <div key={ev.id} onClick={()=>choose(ev)}
              style={{ cursor:'pointer', padding:'8px 10px', borderRadius:6, marginBottom:4, border:'1px solid rgba(120,110,90,.2)' }}
              onMouseEnter={e=>e.currentTarget.style.background='rgba(120,110,90,.08)'}
              onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
              <div style={{ fontWeight:700, fontSize:13 }}>{ev.title_en || ev.title_vi || '(untitled)'}</div>
              <div style={{ fontSize:11, opacity:.6 }}>
                {whenOf(ev.startsAt)}{ev.location && ev.location.code ? ' · '+ev.location.code : ''}
                {n>1 ? ' · repeats — '+n+' dates' : ''}
              </div>
            </div>
          );
        })}
        {listable && !rest.length && !originHit &&
          <div style={{ fontSize:12, opacity:.7 }}>Nothing matches “{q}”.</div>}
      </React.Fragment>
    );
  }

  return (
    <div className="rs-overlay" onClick={onClose}
      style={{ position:'fixed', inset:0, background:'rgba(10,7,3,.55)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999 }}>
      <div className="rs-modal" onClick={e=>e.stopPropagation()}
        style={{ width:420, maxWidth:'92vw', maxHeight:'80vh', overflow:'auto', background:'#fffbf1', color:'#0d0905', borderRadius:10, padding:18, boxShadow:'0 30px 70px rgba(0,0,0,.5)' }}>
        <div style={{ fontFamily:'Montserrat', fontWeight:800, letterSpacing:'.04em', fontSize:14, marginBottom:4 }}>
          {scopeStep ? 'Update the series?' : 'Export to event'}
        </div>
        {!scopeStep &&
          <div style={{ fontSize:12, opacity:.7, marginBottom:12 }}>
            Sends 4:5 → <b>poster4x5</b>, 9:16 → <b>story</b>, 1:1 → <b>square1x1</b>, plus your text-less <b>feed slice</b> → <b>feed</b> onto the chosen event.
          </div>}
        {scopeStep ? renderScope() : renderList()}
        <div style={{ marginTop:12, display:'flex', justifyContent:'flex-end', gap:8 }}>
          {scopeStep &&
            <button className="rs-addrow" onClick={()=>setScopeStep(null)} style={{ display:'inline-block', width:'auto' }}>‹ Back</button>}
          <button className="rs-addrow" onClick={onClose} style={{ display:'inline-block', width:'auto' }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
