/* ============================================================
   REALITY POSTER STUDIO — App
   Master layout + per-format overrides, snapping type scale.
   ============================================================ */
const { CATALOG:AP_CAT, FORMATS:AP_FMT, OUTPUT_FORMATS:AP_OUT, PALETTE:AP_PAL, ACCENTS:AP_ACC, ACCENT_DAYS:AP_DAYS,
        DEFAULTS:AP_DEF, LAYOUT_KEYS:AP_LK, makeElement:apMake, resolveElements:apResolve,
        pointToMaster:apToMaster, snapToScale:apSnapScale, scaleStep:apScaleStep,
        TYPE_SCALE:AP_SCALE, StudioCanvas:APCanvas,
        TEMPLATES:AP_TPL, TEMPLATE_GROUPS:AP_TPLG, buildTemplate:apBuildTpl } = window;
const LS_KEY = 'reality-studio-doc-v2';
const TPL_KEY = 'reality-studio-templates-v1';

function starterDoc(){
  return {
    /* 4:5 (1080×1350) is the primary format — IG feed + the site pipeline */
    activeFormat:'master', masterFormat:'4x5',
    theme:'night', accent:'pink', showGrid:true, snap:true, overrides:{},
    title:'', exportFormat:'png',
    elements:[
      Object.assign(apMake('photo', 80, 96), { w:920, h:700, treatment:'duotone', frame:false }),
      apMake('when', 360, 280),
      Object.assign(apMake('title', 150, 388), { text:'Pulse\nSessions', color:'fg' }),
      Object.assign(apMake('host', 280, 720), { kicker:'On the decks', name:'DJ Milk' }),
      apMake('ticket', 80, 1014),
    ]
  };
}
function loadDoc(){ try{ const r=localStorage.getItem(LS_KEY); if(r){ const d=JSON.parse(r); if(d&&d.elements) return Object.assign({overrides:{},activeFormat:'master',masterFormat:'4x5',title:'',exportFormat:'png'}, d); } }catch(e){} return starterDoc(); }

/* Poster name → filename slug. Vietnamese-safe: đ/Đ are mapped by hand (they
   don't decompose under NFD), the rest of the diacritics strip normally.
   "Đêm Trò Chơi" → "dem-tro-choi"; "Board Game Night" → "board-game-night". */
function slugify(s){
  return (s||'').replace(/đ/g,'d').replace(/Đ/g,'D')
    .normalize('NFD').replace(new RegExp('[\\u0300-\\u036f]','g'),'')
    .toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-+|-+$)/g,'');
}

/* My-templates store — full poster snapshots (elements, overrides, theme),
   saved by name in localStorage, separate from the working doc. */
function loadUserTpls(){ try{ const r=localStorage.getItem(TPL_KEY); if(r){ const a=JSON.parse(r); if(Array.isArray(a)) return a; } }catch(e){} return []; }

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
   a JPEG data URL. Shared by the upload button and clipboard paste. */
function processImageFile(file, onReady){
  if(!file) return;
  const fr=new FileReader(); fr.onload=()=>{ const im=new Image(); im.onload=()=>{
    const max=860, sc=Math.min(1,max/Math.max(im.width,im.height));
    const c=document.createElement('canvas'); c.width=Math.round(im.width*sc); c.height=Math.round(im.height*sc);
    c.getContext('2d').drawImage(im,0,0,c.width,c.height); onReady(c.toDataURL('image/jpeg',0.82));
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
function PhotoUpload({ onPick }){
  const inp = React.useRef(null);
  function handle(e){ const f=e.target.files[0]; if(!f) return; processImageFile(f, onPick); e.target.value=''; }
  return (<React.Fragment>
    <button className="rs-addrow" onClick={()=>inp.current.click()}>⬆ Upload / replace photo…</button>
    <input ref={inp} type="file" accept="image/*" style={{display:'none'}} onChange={handle} />
  </React.Fragment>);
}
const TREATS = [
  {v:'duotone',l:'Duotone'},{v:'offregister',l:'Off-Reg'},{v:'halftone',l:'Halftone'},
  {v:'posterize',l:'Banded'},{v:'cutout',l:'Cutout'},{v:'overprint',l:'Overprint'}
];
/* recommended defaults applied when a treatment is chosen — each looks good out of the box */
const TREAT_PRESETS = {
  duotone:    { contrast:1.18, balance:0.5,  shadowTint:0.18, invert:false },
  offregister:{ contrast:1.25, offset:13,    angle:47,        spread:1.25 },
  halftone:   { contrast:1.2,  dot:9,        angle:15,        shape:'circle' },
  posterize:  { contrast:1.25, bands:4 },
  cutout:     { contrast:1.3,  threshold:0.52, softness:0.12, invert:false },
  overprint:  { contrast:1.2,  offset:8,     angle:45,        split:0.16 }
};
function PhotoControls({ el, update }){
  const t = el.treatment;
  return (
    <React.Fragment>
      <div className="rs-sech">Image</div>
      <PhotoUpload onPick={src=>update({ src })} />
      <div className="rs-mini" style={{ margin:'2px 0 8px' }}>…or copy an image anywhere and paste it here with <b>Ctrl-V</b> / <b>⌘V</b>.</div>
      <Chips label="Or a sample" options={[{v:'spotlight',l:'DJ'},{v:'crowd',l:'Crowd'},{v:'portrait',l:'Portrait'}]}
        value={el.src?null:el.sample} onChange={v=>update({ sample:v, src:null })} />

      <div className="rs-sech">Treatment</div>
      <Chips options={TREATS} value={el.treatment} onChange={v=>update(Object.assign({ treatment:v }, TREAT_PRESETS[v]||{}))} />

      <div className="rs-sech">Main ink</div>
      <Chips options={[{v:true,l:'Follow poster accent'},{v:false,l:'Custom'}]} value={el.followAccent} onChange={v=>update({ followAccent:v })} />
      {!el.followAccent &&
        <div className="rs-swatches">
          {AP_ACC.map(a=>(
            <div key={a} className={'rs-sw'+(el.ink===a?' on':'')} title={a} style={{ background:AP_PAL[a] }} onClick={()=>update({ ink:a })} />
          ))}
        </div>}
      {(t==='offregister'||t==='overprint') && <React.Fragment>
        <div className="rs-lab">Accent ink <span className="val">{el.ink2||'auto'}</span></div>
        <div className="rs-swatches">
          <div className={'rs-sw ink'+(el.ink2==null?' on':'')} title="Auto — warm/cool partner" style={{ border:'1.5px solid #3a2f1f' }} onClick={()=>update({ ink2:null })} />
          {AP_ACC.map(a=>(
            <div key={a} className={'rs-sw'+(el.ink2===a?' on':'')} title={a} style={{ background:AP_PAL[a] }} onClick={()=>update({ ink2:a })} />
          ))}
        </div>
      </React.Fragment>}

      <div className="rs-sech">Press · {TREATS.find(x=>x.v===t).l}</div>
      <Slider label="Brightness" val={el.brightness!=null?el.brightness:0} min={-0.5} max={0.5} step={0.02} onChange={v=>update({brightness:v})} />
      <Slider label="Contrast" val={el.contrast} min={0.7} max={1.9} step={0.01} onChange={v=>update({contrast:v})} />
      <Slider label="Soft focus" val={el.blurUnder!=null?el.blurUnder:0} min={0} max={16} step={0.5} onChange={v=>update({blurUnder:v})} suffix="px" />
      {t==='duotone' && <React.Fragment>
        <Slider label="Tone balance" val={el.balance} min={0.1} max={0.9} step={0.01} onChange={v=>update({balance:v})} />
        <Slider label="Shadow tint" val={el.shadowTint} min={0} max={0.6} step={0.02} onChange={v=>update({shadowTint:v})} />
        <Chips label="Invert" options={[{v:false,l:'Normal'},{v:true,l:'Inverted'}]} value={el.invert} onChange={v=>update({invert:v})} />
      </React.Fragment>}
      {t==='offregister' && <React.Fragment>
        <Slider label="Offset" val={el.offset} min={0} max={40} step={1} onChange={v=>update({offset:v})} suffix="px" />
        <Slider label="Angle" val={el.angle} min={0} max={360} step={1} onChange={v=>update({angle:v})} suffix="°" />
        <Slider label="Ink spread" val={el.spread} min={0.8} max={1.8} step={0.02} onChange={v=>update({spread:v})} />
      </React.Fragment>}
      {t==='halftone' && <React.Fragment>
        <Slider label="Dot size" val={el.dot} min={4} max={22} step={1} onChange={v=>update({dot:v})} suffix="px" />
        <Slider label="Screen angle" val={el.angle} min={-90} max={90} step={1} onChange={v=>update({angle:v})} suffix="°" />
        <Chips label="Dot shape" options={[{v:'circle',l:'Dot'},{v:'square',l:'Square'},{v:'line',l:'Line'}]} value={el.shape} onChange={v=>update({shape:v})} />
      </React.Fragment>}
      {t==='posterize' && <Slider label="Bands" val={el.bands} min={2} max={6} step={1} onChange={v=>update({bands:v})} />}
      {t==='cutout' && <React.Fragment>
        <Slider label="Threshold" val={el.threshold} min={0.15} max={0.85} step={0.01} onChange={v=>update({threshold:v})} />
        <Slider label="Edge softness" val={el.softness} min={0.01} max={0.4} step={0.01} onChange={v=>update({softness:v})} />
        <Chips label="Invert" options={[{v:false,l:'Subject'},{v:true,l:'Background'}]} value={el.invert} onChange={v=>update({invert:v})} />
      </React.Fragment>}
      {t==='overprint' && <React.Fragment>
        <Slider label="Offset" val={el.offset} min={0} max={30} step={1} onChange={v=>update({offset:v})} suffix="px" />
        <Slider label="Angle" val={el.angle} min={0} max={360} step={1} onChange={v=>update({angle:v})} suffix="°" />
        <Slider label="Field split" val={el.split} min={0.04} max={0.4} step={0.01} onChange={v=>update({split:v})} />
      </React.Fragment>}

      <div className="rs-sech">Finish</div>
      <Slider label="Blur" val={el.blurOver!=null?el.blurOver:0} min={0} max={30} step={0.5} onChange={v=>update({blurOver:v})} suffix="px" />
      <Slider label="Grain" val={el.grain!=null?el.grain:0} min={0} max={1} step={0.02} onChange={v=>update({grain:v})} />
      {el.grain>0 && <Slider label="Grain size" val={el.grainSize!=null?el.grainSize:2} min={0.5} max={5} step={0.25} onChange={v=>update({grainSize:v})} suffix="px" />}
      <div className="rs-mini" style={{ margin:'-2px 0 8px' }}>Soft focus blurs the photo <b>before</b> the press — it spreads dots and bands. Blur + grain print <b>over</b> the finished image.</div>

      <div className="rs-sech">Frame</div>
      <Chips options={[{v:true,l:'Ink border'},{v:false,l:'Bleed'}]} value={el.frame} onChange={v=>update({frame:v})} />

      <div className="rs-sech">Image in frame</div>
      <Slider label="Zoom" val={el.imgScale!=null?el.imgScale:1} min={0.5} max={3} step={0.02} onChange={v=>update({imgScale:v})} suffix="×" />
      <Slider label="Pan X" val={el.imgX!=null?el.imgX:0} min={-0.5} max={0.5} step={0.01} onChange={v=>update({imgX:v})} />
      <Slider label="Pan Y" val={el.imgY!=null?el.imgY:0} min={-0.5} max={0.5} step={0.01} onChange={v=>update({imgY:v})} />
      <Slider label="Rotate" val={el.imgRot!=null?el.imgRot:0} min={-180} max={180} step={1} onChange={v=>update({imgRot:v})} suffix="°" />
      <button className="rs-addrow" onClick={()=>update({imgScale:1, imgX:0, imgY:0, imgRot:0})}>↺ Reset image</button>
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
      {el.grain>0 && <Slider label="Grain size" val={el.grainSize!=null?el.grainSize:2} min={0.5} max={5} step={0.25} onChange={v=>update({grainSize:v})} suffix="px" />}
      <div className="rs-mini" style={{ margin:'-2px 0 8px' }}>A pinch of grain makes a flat field feel printed, not digital.</div>
      <div className="rs-sech">Edge</div>
      <Chips options={[{v:true,l:'Ink border'},{v:false,l:'Bleed'}]} value={!!el.outline} onChange={v=>update({outline:v})} />
    </React.Fragment>
  );
}

/* ---------- inspector ---------- */
function Inspector({ el, doc, update, dup, del, layer, clearAll, setDoc, isOutput, activeLabel, resetOverride, toggleHidden, selCount, align }){
  if(!el){
    const VIBES = [
      {k:'Community', theme:'day', accent:'blue'},
      {k:'Sundowner', theme:'day', accent:'amber'},
      {k:'Nightlife', theme:'night', accent:'pink'},
      {k:'Big Night', theme:'night', accent:'red'},
    ];
    return (
      <React.Fragment>
        <div className="rs-sech">Vibe — quick set</div>
        <div className="rs-vibe">
          {VIBES.map(v=>(
            <button key={v.k} onClick={()=>setDoc(d=>({...d, theme:v.theme, accent:v.accent}))}>
              <span className="dot" style={{ background:AP_PAL[v.accent] }} />{v.k}
            </button>
          ))}
        </div>
        <div className="rs-mini" style={{ marginTop:10 }}>A vibe just sets palette + accent — it never touches your layout.</div>
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

  const isText = ['title','tagline','when','stamp','host'].indexOf(el.type)>=0;
  const setItems = (items)=>update({ items });
  // Per-type default tracking, so the slider reads true for elements saved
  // before letter-spacing was configurable (matches the renderer's fallback).
  const lsDefault = el.type==='when'?0.16 : el.type==='host'?0.02 : el.type==='stamp'?0.04 : el.type==='title'?0.005 : 0;

  return (
    <React.Fragment>
      {selCount>=2 && <React.Fragment>
        <div className="rs-sech">Align · {selCount} selected</div>
        <div className="rs-lab" style={{ marginTop:0 }}>On a vertical line</div>
        <div className="rs-actions">
          <button className="rs-iconbtn" onClick={()=>align('x','left')} title="Align left edges">Left</button>
          <button className="rs-iconbtn" onClick={()=>align('x','center')} title="Align horizontal centres">Centre</button>
          <button className="rs-iconbtn" onClick={()=>align('x','right')} title="Align right edges">Right</button>
        </div>
        <div className="rs-lab">On a horizontal line</div>
        <div className="rs-actions">
          <button className="rs-iconbtn" onClick={()=>align('y','top')} title="Align top edges">Top</button>
          <button className="rs-iconbtn" onClick={()=>align('y','middle')} title="Align vertical centres">Middle</button>
          <button className="rs-iconbtn" onClick={()=>align('y','bottom')} title="Align bottom edges">Bottom</button>
        </div>
        <button className="rs-iconbtn rs-del" style={{ width:'100%', justifyContent:'center', marginTop:6 }} onClick={del}>Delete {selCount}</button>
        <div className="rs-mini" style={{ margin:'8px 0 2px' }}>Editing the last-clicked box below · shift-click to add/remove.</div>
      </React.Fragment>}
      <div className="rs-sech" style={{ display:'flex', justifyContent:'space-between' }}>
        <span>{el.type}{el._overridden && <span className="rs-ovtag"> · overridden</span>}</span>
      </div>
      <div className="rs-actions">
        <button className="rs-iconbtn" onClick={()=>layer(1)} title="Bring forward">▲</button>
        <button className="rs-iconbtn" onClick={()=>layer(-1)} title="Send back">▼</button>
        <button className="rs-iconbtn" onClick={dup} title="Duplicate">Duplicate</button>
        <button className="rs-iconbtn rs-del" onClick={del} title="Delete">Delete</button>
      </div>

      {/* ---- content (shared across formats) ---- */}
      {el.type==='title' && <Field label="Title text" value={el.text} onChange={v=>update({text:v})} area />}
      {el.type==='tagline' && <Field label="Tagline" value={el.text} onChange={v=>update({text:v})} area />}
      {el.type==='when' && <Field label="When" value={el.text} onChange={v=>update({text:v})} />}
      {el.type==='stamp' && <Field label="Stamp text" value={el.text} onChange={v=>update({text:v})} />}
      {el.type==='host' && <React.Fragment>
        <Chips label="Size" options={[{v:'std',l:'Standard'},{v:'compact',l:'Compact'}]}
          value={(el.fontSize<=34)?'compact':'std'} onChange={v=>update(v==='compact'?{fontSize:28,h:80}:{fontSize:46,h:170})} />
        <Field label="Kicker (optional)" value={el.kicker} onChange={v=>update({kicker:v})} />
        <Field label="Name" value={el.name} onChange={v=>update({name:v})} />
      </React.Fragment>}
      {el.type==='ticket' && <React.Fragment>
        <Chips label="Format" options={[{v:'banner',l:'Banner'},{v:'standard',l:'Standard'},{v:'slim',l:'Slim'},{v:'mini',l:'Mini'}]}
          value={el.variant||'standard'} onChange={v=>update(TICKET_FORMATS[v])} />
        <div className="rs-mini" style={{ marginBottom:8 }}>Wordmark is the canonical REALITY mark (fixed).</div>
        <Field label="Website" value={el.site} onChange={v=>update({site:v})} />
        <Field label="Address" value={el.addr} onChange={v=>update({addr:v})} />
        <Chips label="QR" options={[{v:true,l:'Show'},{v:false,l:'Hide'}]} value={el.showQR} onChange={v=>update({showQR:v})} />
      </React.Fragment>}
      {el.type==='qr' && <React.Fragment>
        <Field label="Label" value={el.label} onChange={v=>update({label:v})} />
        <Field label="Website" value={el.site} onChange={v=>update({site:v})} />
      </React.Fragment>}
      {(el.type==='lineup'||el.type==='specials') && <React.Fragment>
        <Field label="Heading" value={el.heading} onChange={v=>update({heading:v})} />
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
        <div style={{ height:12 }} />
      </React.Fragment>}
      {el.type==='badge' && <React.Fragment>
        <div className="rs-rowflex">
          <Field label="Top" value={el.top} onChange={v=>update({top:v})} />
          <Field label="Big" value={el.big} onChange={v=>update({big:v})} />
        </div>
        <Field label="Sub" value={el.sub} onChange={v=>update({sub:v})} />
      </React.Fragment>}
      {el.type==='sessions' && <React.Fragment>
        <Field label="Heading" value={el.heading} onChange={v=>update({heading:v})} />
        <div className="rs-row">
          <div className="rs-lab">Sessions — one per line</div>
          <textarea className="rs-area" style={{ minHeight:160 }} value={el.raw} spellCheck={false}
            placeholder={'001 — Session title — 3.6.26'}
            onChange={e=>update({ raw:e.target.value })} />
        </div>
        <div className="rs-mini" style={{ margin:'2px 0 8px' }}>Paste straight from your notes — <b>number — title — date</b> split by dashes, pipes or tabs. Number and date are optional on every line.</div>
        <Chips label="Row size" options={[{v:0,l:'Auto fit'},{v:16,l:'S'},{v:21,l:'M'},{v:26,l:'L'}]}
          value={el.rowSize||0} onChange={v=>update({rowSize:v})} />
      </React.Fragment>}

      {el.type==='photo' && <PhotoControls el={el} update={update} />}
      {el.type==='block' && <BlockControls el={el} doc={doc} update={update} />}

      {/* ---- style (shared) ---- */}
      {el.type!=='photo' && el.type!=='block' && <React.Fragment>
      <div className="rs-sech">Surface</div>
      <Chips options={SURFACES} value={el.surface} onChange={v=>update({surface:v})} />
      <Swatches label="Text colour" value={el.textColor!=null?el.textColor:el.color}
        onChange={v=>update({textColor:v})} autoTitle="Auto — stays readable on the surface" />
      <Swatches label="Fill / accent" value={el.fill!=null?el.fill:el.color}
        onChange={v=>update({fill:v})} autoTitle="Auto — the poster accent" autoBg={AP_PAL[doc.accent]} />
      <div className="rs-mini" style={{ marginTop:-2 }}>Fill colours an <b>Accent</b> surface and the element’s accent highlights (kicker, heading…).</div>
      </React.Fragment>}

      {(el.type==='title'||el.type==='tagline'||el.type==='host'||el.type==='stamp') &&
        <ScaleControl label="Font size" val={el.fontSize} onChange={v=>update({fontSize:v})} />}
      {isText &&
        <Slider label="Letter spacing" val={el.letterSpacing!=null?el.letterSpacing:lsDefault} min={-0.05} max={0.6} step={0.005} onChange={v=>update({letterSpacing:v})} suffix="em" />}
      {el.type==='title' && <Chips label="Weight" options={[{v:100,l:'Thin'},{v:500,l:'Med'},{v:800,l:'Heavy'}]} value={el.weight} onChange={v=>update({weight:v})} />}
      {(el.type==='title'||el.type==='tagline'||el.type==='host') &&
        <Chips label="Align" options={[{v:'left',l:'Left'},{v:'center',l:'Center'},{v:'right',l:'Right'}]} value={el.align} onChange={v=>update({align:v})} />}
      {el.type==='title' && <Chips label="Orientation" options={[{v:'h',l:'Horizontal'},{v:'v',l:'Vertical'}]} value={el.orient} onChange={v=>update({orient:v})} />}

      {/* ---- title drop shadow (on the letters; legacy default = press shadow
              when bare, none when surfaced — same look as before) ---- */}
      {el.type==='title' && (()=>{
        const bare = !el.surface || el.surface==='none';
        const on = el.shadowOn!=null ? el.shadowOn : bare;
        const ck = el.shadowColor||'fg';
        const alphaVal = el.shadowAlpha!=null ? el.shadowAlpha : (ck==='fg' ? (doc.theme==='night'?0.22:0.16) : 0.9);
        return (
          <React.Fragment>
            <div className="rs-sech">Shadow</div>
            <Chips options={[{v:true,l:'On'},{v:false,l:'Off'}]} value={on} onChange={v=>update({shadowOn:v})} />
            {on && <React.Fragment>
              <Slider label="Distance" val={el.shadowDist!=null?el.shadowDist:6} min={0} max={40} step={1} onChange={v=>update({shadowDist:v})} suffix="px" />
              <Slider label="Direction" val={el.shadowAngle!=null?el.shadowAngle:90} min={-180} max={180} step={5} onChange={v=>update({shadowAngle:v})} suffix="°" />
              <Slider label="Blur" val={el.shadowBlur!=null?el.shadowBlur:1} min={0} max={24} step={1} onChange={v=>update({shadowBlur:v})} suffix="px" />
              <Slider label="Opacity" val={alphaVal} min={0.05} max={1} step={0.01} onChange={v=>update({shadowAlpha:v})} />
              <Swatches label="Shadow colour" value={ck} autoTitle="Auto — soft press shadow"
                onChange={v=>update(v==='fg'
                  ? { shadowColor:'fg', shadowAlpha:null }
                  : { shadowColor:v, shadowAlpha: el.shadowAlpha!=null?el.shadowAlpha:0.9 })} />
              <div className="rs-mini" style={{ marginTop:-2 }}>Try a hard accent shadow — distance up, blur 0, full opacity. Very riso.</div>
            </React.Fragment>}
          </React.Fragment>
        );
      })()}

      {/* ---- transform (layout — per-format when on an output) ---- */}
      <div className="rs-sech">Transform{isOutput && <span className="rs-ovtag"> · {activeLabel} only</span>}</div>
      <Chips label="Tilt presets" options={[{v:0,l:'0°'},{v:-3,l:'-3°'},{v:3,l:'+3°'},{v:-6,l:'-6°'},{v:6,l:'+6°'}]} value={el.rot||0} onChange={v=>update({rot:v})} />
      <Slider label="Rotation" val={el.rot||0} min={-45} max={45} onChange={v=>update({rot:v})} suffix="°" />
      <Slider label="Width" val={el.w} min={120} max={1080} step={6} onChange={v=>update({w:v})} suffix="px" />
      {!isText && <Slider label="Height" val={el.h} min={70} max={1920} step={6} onChange={v=>update({h:v})} suffix="px" />}
      <Chips label="Anchor (all formats)" options={[{v:'safe',l:'Safe cluster'},{v:'bottom',l:'Pin to base'}]} value={el.anchor||'safe'} onChange={v=>update({anchor:v})} />

      {/* ---- per-format override controls ---- */}
      {isOutput && <React.Fragment>
        <div className="rs-sech">This format · {activeLabel}</div>
        <Chips label="Visibility" options={[{v:false,l:'Shown'},{v:true,l:'Hidden'}]} value={!!el.hidden} onChange={v=>toggleHidden(el.id, v)} />
        {el._overridden
          ? <React.Fragment>
              <button className="rs-addrow" onClick={()=>resetOverride(el.id)}>↺ Reset to Master</button>
              <div className="rs-mini" style={{ marginTop:6 }}>Layout detached for {activeLabel}. Reset to follow Master again.</div>
            </React.Fragment>
          : <div className="rs-mini">Following Master. Move, resize or rotate to override just {activeLabel}.</div>}
      </React.Fragment>}
    </React.Fragment>
  );
}

/* ---------- topbar ---------- */
function Topbar({ doc, setDoc, count, overrideCount, resetFormat, onExport, exporting, exportMsg }){
  const isOutput = doc.activeFormat!=='master';
  /* Poster name is held locally while typing and committed on blur/Enter/Save —
     committing per keystroke would re-render the riso canvases on every key. */
  const [name, setName] = React.useState(doc.title||'');
  React.useEffect(()=>{ setName(doc.title||''); }, [doc.title]);
  const commit = ()=> setDoc(d=> d.title===name ? d : ({...d, title:name}));
  const slug = slugify(name) || 'reality-poster';
  const kind = doc.exportFormat||'png';
  const scope = isOutput ? AP_FMT[doc.activeFormat].label+' only' : 'All formats';
  const outName = isOutput
    ? `${slug}-${doc.activeFormat}.${kind}`
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
          {AP_OUT.map(fmt=>(
            <button key={fmt} className={doc.activeFormat===fmt?'on':''} onClick={()=>setDoc(d=>({...d, activeFormat:fmt}))}>
              {AP_FMT[fmt].label}<small>{AP_FMT[fmt].sub}</small>
            </button>
          ))}
        </div>
        <div className="rs-seg xtra"
          title="Extra print view — never part of the Save-All bundle. Save here for a print-resolution A1: 3508px wide (150 dpi), PDF at true 594×841mm.">
          <button className={doc.activeFormat==='a1'?'on':''} onClick={()=>setDoc(d=>({...d, activeFormat:'a1'}))}>
            A1<small>PRINT XL</small>
          </button>
        </div>
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
          {AP_ACC.map(a=>(
            <div key={a} className={'rs-sw'+(doc.accent===a?' on':'')} style={{ background:AP_PAL[a], width:22, height:22 }}
              onClick={()=>setDoc(d=>({...d, accent:a}))}
              title={a + (AP_DAYS[a] ? ' — ' + AP_DAYS[a] + '’s colour on the weekly schedule' : '')} />
          ))}
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
          title={(doc.activeFormat==='a1'
            ? 'Print-resolution A1 — 3508px wide (150 dpi)'+(kind==='pdf'?', a true 594×841mm PDF a shop runs 1:1':'')
            : isOutput
              ? 'Export the format you’re viewing'
              : 'Master view — export all five formats'+(kind==='pdf'?' as one PDF':' as a ZIP'))+' → '+outName}>
          Save Images<small>{scope}</small>
        </button>
      </div>
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
  const [exporting, setExporting] = React.useState(false);
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
  const layer = (dir)=>{ if(!sel) return; setDoc(d=>{ const arr=d.elements.slice(); const i=arr.findIndex(e=>e.id===sel.id); const j=i+dir; if(j<0||j>=arr.length) return d; const tmp=arr[i]; arr[i]=arr[j]; arr[j]=tmp; return {...d, elements:arr}; }); };
  const clearAll = ()=>{ if(confirm('Remove all elements from the poster?')){ setDoc(d=>({...d, elements:[], overrides:{}})); setSelectedIds([]); } };

  /* Align the selected boxes to a shared edge/line — the Swiss vertical (and
     horizontal). Operates on the selection's bounding box. */
  function alignSel(axis, mode){
    const items = selectedIds.map(id=>resolved.find(e=>e.id===id)).filter(Boolean);
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
    setDoc(d=>({ ...d, masterFormat:'4x5', activeFormat:'master', overrides:{},
      elements:built.elements, theme:built.theme, accent:built.accent }));
    setSelectedIds([]);
  }

  /* ---- My templates — save / load / delete full poster snapshots ---- */
  const [userTpls, setUserTpls] = React.useState(loadUserTpls);
  function persistTpls(next){
    try{ localStorage.setItem(TPL_KEY, JSON.stringify(next)); }
    catch(e){ window.alert('Couldn’t save — browser storage is full. Delete an old template (ones with photos are heavy) and try again.'); return false; }
    setUserTpls(next); return true;
  }
  function saveUserTpl(){
    const d = docRef.current;
    if(!d.elements.length){ window.alert('Nothing on the poster to save yet.'); return; }
    const name = (window.prompt('Save this poster as a template called:', d.title || 'My layout') || '').trim();
    if(!name) return;
    const existing = userTpls.find(t=>t.name.toLowerCase()===name.toLowerCase());
    if(existing && !window.confirm('A template called “'+existing.name+'” already exists. Replace it?')) return;
    const snap = JSON.parse(JSON.stringify({ elements:d.elements, overrides:d.overrides||{},
      masterFormat:d.masterFormat, theme:d.theme, accent:d.accent, title:d.title||'' }));
    const t = { id: existing? existing.id : window.uid(), name, savedAt: Date.now(), doc: snap };
    persistTpls(existing ? userTpls.map(p=>p.id===t.id? t : p) : [t, ...userTpls]);
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
      title: snap.title || d.title }));
    setSelectedIds([]);
  }
  function delUserTpl(id){
    const t = userTpls.find(x=>x.id===id);
    if(t && !window.confirm('Delete the template “'+t.name+'”?')) return;
    persistTpls(userTpls.filter(x=>x.id!==id));
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
    fr.onload = ()=>{
      let list = null;
      try{
        const data = JSON.parse(fr.result);
        list = Array.isArray(data) ? data : (data && Array.isArray(data.templates) ? data.templates : null);
      }catch(e){}
      if(!list){ window.alert('Couldn’t read that file — it doesn’t look like a Poster Studio template export.'); return; }
      const incoming = list
        .filter(t=>t && typeof t.name==='string' && t.name.trim() && t.doc && Array.isArray(t.doc.elements))
        .map(t=>({ id: t.id || window.uid(), name: t.name.trim(), savedAt: t.savedAt || Date.now(),
                   doc: Object.assign({ masterFormat:'4x5', theme:'day', accent:'blue', overrides:{}, title:'' }, t.doc) }));
      if(!incoming.length){ window.alert('No usable templates in that file.'); return; }
      const skipped = list.length - incoming.length;
      const next = userTpls.slice(); let replaced = 0;
      incoming.forEach(t=>{
        const i = next.findIndex(p=>p.id===t.id || p.name.toLowerCase()===t.name.toLowerCase());
        if(i>=0){ next[i]=t; replaced++; } else next.unshift(t);
      });
      if(persistTpls(next))
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
  async function doExport(titleArg){
    if(exporting || !window.htmlToImage) return;
    const kind = doc.exportFormat || 'png';
    const slug = slugify(titleArg!=null ? titleArg : (doc.title||''));
    const base = slug || 'reality-poster';
    /* The A1 view captures at print resolution — 3508px wide is true A1 @
       150dpi. The ratio rides the `exporting` flag as a number so riso photos
       and grainy blocks repaint 1:1 with the capture grid (no soft upscale). */
    const a1Ratio = doc.activeFormat==='a1' ? 3508/AP_FMT.a1.w : 0;
    setSelectedIds([]); setExporting(a1Ratio || true); setExportMsg('Rendering…');
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
        await new Promise(r=>setTimeout(r, a1Ratio?420:140));   // print-res riso repaints need longer
        const f=AP_FMT[viewFormat], name=base+'-'+viewFormat;
        if(kind==='pdf'){
          const url=await capture(f, null, a1Ratio||null);
          /* A1 PDFs are made at real-world size (594×841mm) so a print shop
             runs them 1:1; screen formats keep the px-sized page. */
          const pdf = a1Ratio
            ? new JS({ unit:'mm', format:[594,841], orientation:'portrait' })
            : new JS({ unit:'px', format:[f.w,f.h], orientation: f.w>f.h?'landscape':'portrait', hotfixes:['px_scaling'] });
          /* 'FAST' = lossless FLATE on the embedded raster — without a
             compression arg jsPDF stores it raw and one page tops 20MB.
             FAST over SLOW: same pixels, ~0.7MB larger, no multi-second
             main-thread stall per page (matters for the 5-page master). */
          if(a1Ratio) pdf.addImage(url,'PNG',0,0,594,841,undefined,'FAST');
          else pdf.addImage(url,'PNG',0,0,f.w,f.h,undefined,'FAST');
          pdf.save(name+'.pdf');
        } else {
          dl(await capture(f, kind, a1Ratio||null), name+'.'+kind);
        }
      } else {
        /* Master — every output format: zip of images, or one multi-page PDF */
        const prev = doc.activeFormat;
        const zip = kind!=='pdf' ? new window.JSZip() : null;
        let pdf = null;
        for(const fmt of AP_OUT){
          setExportMsg('Rendering '+AP_FMT[fmt].label+'…');
          setDoc(d=>({ ...d, activeFormat:fmt }));
          await new Promise(r=>setTimeout(r,380));   // React render + rescale + photo repaint
          const f = AP_FMT[fmt];
          if(kind==='pdf'){
            const url = await capture(f);
            if(!pdf) pdf = new JS({ unit:'px', format:[f.w,f.h], orientation: f.w>f.h?'landscape':'portrait', hotfixes:['px_scaling'] });
            else pdf.addPage([f.w,f.h], f.w>f.h?'l':'p');
            pdf.addImage(url,'PNG',0,0,f.w,f.h,undefined,'FAST');
          } else {
            const url = await capture(f, kind);
            zip.file(base+'-'+fmt+'.'+kind, url.split(',')[1], { base64:true });
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

  return (
    <div className="rs-app">
      <Topbar doc={doc} setDoc={setDoc} count={doc.elements.length} overrideCount={overrideCount} resetFormat={resetFormat}
        onExport={doExport} exporting={exporting} exportMsg={exportMsg} />
      <div className="rs-body">
        <div className="rs-lib">
          {AP_TPL && AP_TPL.length>0 && <React.Fragment>
            <div className="rs-sech" onClick={()=>setTplOpen(o=>!o)}
              style={{ cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span>Templates</span><span style={{ fontSize:11, opacity:.6 }}>{tplOpen?'▾':'▸'}</span>
            </div>
            {tplOpen && <React.Fragment>
              <div className="rs-mini" style={{ margin:'6px 0 2px', opacity:.7 }}>My templates</div>
              {userTpls.map(t=>(
                <div key={t.id} className="rs-libitem" onClick={()=>applyUserTpl(t)}
                  style={{ cursor:'pointer', position:'relative', paddingRight:36 }}>
                  <span className="ln">{t.name}</span>
                  <span className="lh">{t.doc.elements.length} parts · saved {new Date(t.savedAt).toLocaleDateString(undefined,{ day:'numeric', month:'short' })}</span>
                  <button className="rs-tplx" title="Delete this template"
                    onClick={e=>{ e.stopPropagation(); delUserTpl(t.id); }}>×</button>
                </div>
              ))}
              {userTpls.length===0 &&
                <div className="rs-mini" style={{ margin:'2px 0 6px' }}>None yet — build a poster, then keep it here for next time.</div>}
              <button className="rs-addrow" onClick={saveUserTpl} style={{ marginBottom:6 }}>＋ Save current poster as template</button>
              <div className="rs-rowflex" style={{ marginBottom:6 }}>
                <button className="rs-addrow" onClick={exportUserTpls} title="Download all My templates (photos included) as one .json">⬇ Export all</button>
                <button className="rs-addrow" onClick={()=>tplFileRef.current.click()} title="Load templates from an exported .json — same names update, new names add">⬆ Import…</button>
              </div>
              <input ref={tplFileRef} type="file" accept=".json,application/json" style={{ display:'none' }}
                onChange={e=>{ const f=e.target.files[0]; if(f) importUserTpls(f); e.target.value=''; }} />
              <div className="rs-mini" style={{ margin:'0 0 12px' }}>Templates live in this browser only — export a .json to carry them to another computer, photos and all.</div>
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
          <div className="rs-mini" style={{ marginTop:16 }}>Drag a part onto the poster — it snaps to the grid and joins the Master layout.</div>
        </div>

        <APCanvas elements={resolved} format={viewFormat} theme={doc.theme} accent={doc.accent}
          showGrid={doc.showGrid} snap={doc.snap} scale={scale} stageRef={stageRef} canvasRef={canvasRef}
          selectedId={selectedId} selectedIds={selectedIds} onSelect={select} onChange={updateEl} onCommit={()=>{}} exporting={exporting} />

        <div className="rs-inspector">
          <div className={'rs-context'+(isOutput?' out':' master')}>
            {isOutput
              ? <React.Fragment><b>{activeLabel}</b> output · layout edits override Master{overrideCount?` · ${overrideCount} overridden`:''}</React.Fragment>
              : <React.Fragment><b>Master</b> source · edits flow to every format</React.Fragment>}
          </div>
          <Inspector el={sel} doc={doc} update={update} dup={dup} del={del} layer={layer}
            clearAll={clearAll} setDoc={setDoc} isOutput={isOutput} activeLabel={activeLabel}
            resetOverride={resetOverride} toggleHidden={toggleHidden}
            selCount={selectedIds.length} align={alignSel} />
        </div>
      </div>

      {spawn && <div className="rs-ghost" style={{ left:spawn.x, top:spawn.y }}>{spawn.type}</div>}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
