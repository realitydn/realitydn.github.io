/* ============================================================
   REALITY PRINT STUDIO — App
   One A-size document, vector CMYK PDF out, gang-on-A4.
   ============================================================ */
const { CATALOG:AP_CAT, DEFAULTS:AP_DEF, PALETTE:AP_PAL, ACCENTS:AP_ACC,
        SIZES:AP_SZ, SIZE_ORDER:AP_ORD, GANG:AP_GANG, sizeDims:apDims, PT_PER_MM:AP_PPM,
        TYPE_SCALE:AP_SCALE, snapToScale:apSnap, scaleStep:apStep,
        makeElement:apMake, uid:apUid, slugify:apSlug,
        PrintCanvas:APCanvas, TEMPLATES:AP_TPL, TEMPLATE_GROUPS:AP_TPLG, buildTemplate:apBuildTpl } = window;
const LS_KEY = 'reality-print-doc-v1';
const TPL_KEY = 'reality-print-templates-v1';

function starterDoc(){
  return {
    size:'a5', orient:'portrait', accent:'pink',
    showGrid:false, showBleed:true, snap:true, bleed:true, marks:true,
    title:'', elements:[
      Object.assign(apMake('kicker', 34, 40),  { w:360, text:'REALITY · ĐÀ NẴNG', align:'center', ink:'pink', tracking:0.26 }),
      Object.assign(apMake('headline', 30, 74),{ w:360, h:96, text:'INFO SIGN', fontSize:46, align:'center' }),
      Object.assign(apMake('body', 40, 200),   { w:340, text:'Drag parts from the left. Pick a template to start fast.', align:'center', fontSize:14 }),
    ]
  };
}
function loadDoc(){ try{ const r=localStorage.getItem(LS_KEY); if(r){ const d=JSON.parse(r); if(d&&d.elements) return Object.assign(starterDoc(), d); } }catch(e){} return starterDoc(); }
function loadUserTpls(){ try{ const r=localStorage.getItem(TPL_KEY); if(r){ const a=JSON.parse(r); if(Array.isArray(a)) return a; } }catch(e){} return []; }

/* ---------- small controls ---------- */
function Field({ label, value, onChange, area, mono }){
  return (
    <div className="ps-row">
      {label && <div className="ps-lab">{label}</div>}
      {area
        ? <textarea className="ps-area" value={value||''} onChange={e=>onChange(e.target.value)} spellCheck={false} />
        : <input className={'ps-input'+(mono?' mono':'')} value={value||''} onChange={e=>onChange(e.target.value)} spellCheck={false} />}
    </div>
  );
}
function Slider({ label, val, min, max, step, onChange, suffix }){
  return (
    <div className="ps-row">
      <div className="ps-lab">{label}<span className="val">{val}{suffix||''}</span></div>
      <input className="ps-slider" type="range" min={min} max={max} step={step||1} value={val}
        onChange={e=>onChange(parseFloat(e.target.value))} />
    </div>
  );
}
function ScaleControl({ label, val, onChange }){
  const idx = AP_SCALE.indexOf(apSnap(val));
  return (
    <div className="ps-row">
      <div className="ps-lab">{label}<span className="val">{val}pt</span></div>
      <div className="ps-stepper">
        <button onClick={()=>onChange(apStep(val,-1))}>A−</button>
        <input className="ps-slider" type="range" min={0} max={AP_SCALE.length-1} step={1} value={idx<0?0:idx}
          onChange={e=>onChange(AP_SCALE[parseInt(e.target.value)])} />
        <button onClick={()=>onChange(apStep(val,1))}>A+</button>
      </div>
    </div>
  );
}
function Chips({ label, options, value, onChange }){
  return (
    <div className="ps-row">
      {label && <div className="ps-lab">{label}</div>}
      <div className="ps-chips">
        {options.map(o=>(
          <button key={String(o.v)} className={'ps-chip'+(value===o.v?' on':'')} onClick={()=>onChange(o.v)}>{o.l}</button>
        ))}
      </div>
    </div>
  );
}
function Swatches({ label, value, onChange, auto, white }){
  const fixed = [];
  if(auto)  fixed.push({ v:'auto',  bg:'linear-gradient(135deg,#111 0 50%,#fff 50% 100%)', title:'Auto — readable on the surface' });
  fixed.push({ v:'ink', bg:'#111111', title:'Ink (K-only)' });
  if(white) fixed.push({ v:'white', bg:'#ffffff', title:'White (paper / reverse)' });
  return (
    <div className="ps-row">
      {label && <div className="ps-lab">{label}</div>}
      <div className="ps-swatches">
        {fixed.map(s=>(
          <div key={s.v} className={'ps-sw'+(value===s.v?' on':'')} title={s.title}
            style={{ background:s.bg, border:'1.5px solid #cfc7b6' }} onClick={()=>onChange(s.v)} />
        ))}
        {AP_ACC.map(a=>(
          <div key={a} className={'ps-sw'+(value===a?' on':'')} title={a} style={{ background:AP_PAL[a] }} onClick={()=>onChange(a)} />
        ))}
      </div>
    </div>
  );
}
const SURFACES = [{v:'none',l:'None'},{v:'paper',l:'Outline box'},{v:'solid',l:'Solid'},{v:'accent',l:'Accent'},{v:'outline',l:'Hairline'}];
const FAMS = [{v:'mont',l:'Display'},{v:'grot',l:'Text'},{v:'alt',l:'Wordmark'}];
const LIFTS = [{v:'none',l:'Flat'},{v:'light',l:'Light'},{v:'default',l:'Lift'},{v:'heavy',l:'Heavy'}];
const ECHOABLE = ['headline','numeral','bignum','block','slab','sticker'];
const LIFTABLE = ['headline','numeral','bignum','block','slab','pricelist','qr','badge','coupon','footer','marquee','stripes','sticker'];
const STICKER_SHAPES = [{v:'circle',l:'Circle'},{v:'rounded',l:'Rounded'},{v:'squircle',l:'Squircle'},{v:'rect',l:'Square'}];
const DOT_SHAPES = [{v:'circle',l:'Circle'},{v:'square',l:'Square'},{v:'diamond',l:'Diamond'},{v:'ring',l:'Ring'}];
const DOT_GRADS = [{v:'none',l:'Even'},{v:'out',l:'Grow out'},{v:'in',l:'Grow in'},{v:'down',l:'Down'},{v:'up',l:'Up'}];

/* ---------- inspector ---------- */
function Inspector({ el, doc, update, dup, del, layer, clearAll }){
  if(!el){
    return (
      <React.Fragment>
        <div className="ps-sech">Canvas</div>
        <div className="ps-empty">
          <div className="big">Nothing selected</div>
          <p>Drag a part from the left, or click one to edit it. Everything prints as crisp vector — text on the black plate only.</p>
        </div>
        <div className="ps-mini" style={{ textAlign:'center', marginBottom:12 }}>{doc.elements.length} part{doc.elements.length===1?'':'s'} placed</div>
        <button className="ps-iconbtn ps-del" style={{ width:'100%', justifyContent:'center' }} onClick={clearAll}>Clear sheet</button>
      </React.Fragment>
    );
  }
  const isText = ['headline','body','kicker','bignum','numeral'].indexOf(el.type)>=0;
  const setItems = (items)=>update({ items });
  return (
    <React.Fragment>
      <div className="ps-sech">{el.type}</div>
      <div className="ps-actions">
        <button className="ps-iconbtn" onClick={()=>layer(1)} title="Bring forward">▲</button>
        <button className="ps-iconbtn" onClick={()=>layer(-1)} title="Send back">▼</button>
        <button className="ps-iconbtn" onClick={dup}>Duplicate</button>
        <button className="ps-iconbtn ps-del" onClick={del}>Delete</button>
      </div>

      {isText && <Field label="Text" value={el.text} onChange={v=>update({text:v})} area />}
      {el.type==='slab' && <Slider label="Angle" val={el.angle||0} min={-45} max={45} step={1} onChange={v=>update({angle:v})} suffix="°" />}
      {el.type==='stripes' && <React.Fragment>
        <Chips label="Direction" options={[{v:'h',l:'Horizontal'},{v:'v',l:'Vertical'}]} value={el.dir||'h'} onChange={v=>update({dir:v})} />
        <Slider label="Count" val={el.count||8} min={2} max={24} step={1} onChange={v=>update({count:v})} />
        <Slider label="Thickness" val={el.ratio!=null?el.ratio:0.5} min={0.15} max={0.9} step={0.05} onChange={v=>update({ratio:v})} />
        <Chips label="Ground" options={[{v:'white',l:'White'},{v:'ink',l:'Ink'},{v:'none',l:'None'}]} value={el.bg||'white'} onChange={v=>update({bg:v})} />
      </React.Fragment>}
      {el.type==='dotfield' && <React.Fragment>
        <Chips label="Dot shape" options={DOT_SHAPES} value={el.shape||'circle'} onChange={v=>update({shape:v})} />
        <Chips label="Size ramp" options={DOT_GRADS} value={el.grad||'none'} onChange={v=>update({grad:v})} />
        <Slider label="Dot size" val={el.dot||9} min={2} max={28} step={1} onChange={v=>update({dot:v})} suffix="pt" />
        <Slider label="Gap" val={el.gap!=null?el.gap:6} min={1} max={28} step={1} onChange={v=>update({gap:v})} suffix="pt" />
        <Chips label="Ground" options={[{v:'white',l:'White'},{v:'ink',l:'Ink'},{v:'none',l:'None'}]} value={el.bg||'white'} onChange={v=>update({bg:v})} />
      </React.Fragment>}
      {el.type==='sticker' && <React.Fragment>
        <Chips label="Die-cut shape" options={STICKER_SHAPES} value={el.shape||'circle'} onChange={v=>update({shape:v})} />
        {(el.shape==='rounded'||el.shape==='squircle') &&
          <Slider label="Corner radius" val={el.radius!=null?el.radius:0.22} min={0.05} max={0.5} step={0.01} onChange={v=>update({radius:v})} />}
        <Slider label="Keyline ring" val={el.ringW!=null?el.ringW:4} min={0} max={14} step={0.5} onChange={v=>update({ringW:v})} suffix="pt" />
        <Swatches label="Ring colour" value={el.ring!=null?el.ring:'ink'} onChange={v=>update({ring:v})} white />
      </React.Fragment>}
      {el.type==='burst' && <React.Fragment>
        <Slider label="Rays" val={el.rays||16} min={6} max={48} step={1} onChange={v=>update({rays:v})} />
        <Slider label="Centre hub" val={el.hub!=null?el.hub:0} min={0} max={0.8} step={0.02} onChange={v=>update({hub:v})} />
        {(el.hub||0)>0 && <Swatches label="Hub fill" value={el.hubFill||'white'} onChange={v=>update({hubFill:v})} white />}
      </React.Fragment>}
      {el.type==='footer' && <React.Fragment>
        <Field label="Website" value={el.site} onChange={v=>update({site:v})} />
        <Field label="Address" value={el.addr} onChange={v=>update({addr:v})} />
        <Field label="QR encodes" value={el.qrData} onChange={v=>update({qrData:v})} />
        <Chips label="QR" options={[{v:true,l:'Show'},{v:false,l:'Hide'}]} value={el.showQR!==false} onChange={v=>update({showQR:v})} />
        <Chips label="Top rule" options={[{v:true,l:'On'},{v:false,l:'Off'}]} value={el.rule!==false} onChange={v=>update({rule:v})} />
      </React.Fragment>}
      {(el.type==='badge'||el.type==='seal') && <React.Fragment>
        <Field label="Top" value={el.top} onChange={v=>update({top:v})} />
        <Field label="Big" value={el.big} onChange={v=>update({big:v})} />
        <Field label="Sub" value={el.sub} onChange={v=>update({sub:v})} />
        <Slider label="Rotate" val={el.rot||0} min={-20} max={20} step={1} onChange={v=>update({rot:v})} suffix="°" />
      </React.Fragment>}
      {el.type==='marquee' && <React.Fragment>
        <Field label="Word" value={el.text} onChange={v=>update({text:v})} />
        <Field label="Separator" value={el.sep} onChange={v=>update({sep:v})} />
        <Slider label="Size" val={el.fontSize||15} min={8} max={40} step={1} onChange={v=>update({fontSize:v})} suffix="pt" />
      </React.Fragment>}
      {el.type==='qr' && <React.Fragment>
        <Field label="Encodes (URL / WiFi / text)" value={el.data} onChange={v=>update({data:v})} area />
        <Field label="Caption (optional)" value={el.caption} onChange={v=>update({caption:v})} />
        <Chips label="Error correction" options={[{v:'L',l:'L'},{v:'M',l:'M'},{v:'Q',l:'Q'},{v:'H',l:'H'}]} value={el.ecl||'M'} onChange={v=>update({ecl:v})} />
        <Chips label="Quiet zone" options={[{v:true,l:'On'},{v:false,l:'Off'}]} value={el.quiet!==false} onChange={v=>update({quiet:v})} />
      </React.Fragment>}
      {el.type==='coupon' && <React.Fragment>
        <Field label="Kicker" value={el.heading} onChange={v=>update({heading:v})} />
        <Field label="Headline" value={el.big} onChange={v=>update({big:v})} area />
        <Field label="Terms" value={el.terms} onChange={v=>update({terms:v})} />
        <Field label="Code" value={el.code} onChange={v=>update({code:v})} mono />
      </React.Fragment>}
      {el.type==='pricelist' && <React.Fragment>
        <Field label="Heading (optional)" value={el.heading} onChange={v=>update({heading:v})} />
        <div className="ps-lab">Rows</div>
        {(el.items||[]).map((it,i)=>(
          <div className="ps-itemrow" key={i}>
            <input className="ps-input" value={it.l} onChange={e=>{ const items=el.items.slice(); items[i]={...it,l:e.target.value}; setItems(items); }} />
            <input className="ps-input" style={{ maxWidth:78 }} value={it.p} onChange={e=>{ const items=el.items.slice(); items[i]={...it,p:e.target.value}; setItems(items); }} />
            <button onClick={()=>setItems(el.items.filter((_,j)=>j!==i))}>×</button>
          </div>
        ))}
        <button className="ps-addrow" onClick={()=>setItems([...(el.items||[]), {l:'Item',p:'0k'}])}>+ Add row</button>
        <Chips label="Dot leader" options={[{v:true,l:'On'},{v:false,l:'Off'}]} value={el.dotLeader!==false} onChange={v=>update({dotLeader:v})} />
        <div style={{ height:8 }} />
      </React.Fragment>}
      {el.type==='arrow' && <React.Fragment>
        <Chips label="Direction" options={[{v:'up',l:'↑'},{v:'right',l:'→'},{v:'down',l:'↓'},{v:'left',l:'←'}]} value={el.dir||'right'} onChange={v=>update({dir:v})} />
        <Field label="Label (optional)" value={el.label} onChange={v=>update({label:v})} />
      </React.Fragment>}
      {el.type==='contact' && <React.Fragment>
        <Field label="Site / line 1" value={el.site} onChange={v=>update({site:v})} />
        <Field label="Address / line 2" value={el.addr} onChange={v=>update({addr:v})} />
        <Chips label="Align" options={[{v:'left',l:'Left'},{v:'center',l:'Center'}]} value={el.align||'left'} onChange={v=>update({align:v})} />
      </React.Fragment>}

      {/* type / style */}
      {isText && <React.Fragment>
        <ScaleControl label="Size" val={el.fontSize} onChange={v=>update({fontSize:v})} />
        <Chips label="Typeface" options={FAMS} value={el.fam||'mont'} onChange={v=>update({fam:v})} />
        {el.fam!=='grot' && <Chips label="Weight" options={[{v:100,l:'Thin'},{v:500,l:'Medium'},{v:700,l:'Bold'},{v:800,l:'Heavy'}]} value={el.weight||800} onChange={v=>update({weight:v})} />}
        <Chips label="Align" options={[{v:'left',l:'Left'},{v:'center',l:'Center'},{v:'right',l:'Right'}]} value={el.align||'left'} onChange={v=>update({align:v})} />
        <Slider label="Letter spacing" val={el.tracking!=null?el.tracking:0} min={-0.05} max={0.5} step={0.005} onChange={v=>update({tracking:v})} suffix="em" />
        <Chips label="Case" options={[{v:true,l:'UPPER'},{v:false,l:'As typed'}]} value={el.upper!==false} onChange={v=>update({upper:v})} />
      </React.Fragment>}
      {el.type==='rule' && <React.Fragment>
        <Slider label="Thickness" val={el.weight||3} min={0.5} max={20} step={0.5} onChange={v=>update({weight:v})} suffix="pt" />
        <Chips label="Style" options={[{v:'solid',l:'Solid'},{v:'double',l:'Double'},{v:'dashed',l:'Dashed'},{v:'dotted',l:'Dotted'}]} value={el.style||'solid'} onChange={v=>update({style:v})} />
      </React.Fragment>}
      {el.type==='block' && <React.Fragment>
        <Slider label="Corner radius" val={el.radius||0} min={0} max={40} step={1} onChange={v=>update({radius:v})} suffix="pt" />
        <Slider label="Ink border" val={el.border||0} min={0} max={6} step={0.5} onChange={v=>update({border:v})} suffix="pt" />
      </React.Fragment>}

      {/* treatment — Year 2 plane shadow + misregistration echo */}
      {(LIFTABLE.indexOf(el.type)>=0 || ECHOABLE.indexOf(el.type)>=0) && <div className="ps-sech">Treatment</div>}
      {LIFTABLE.indexOf(el.type)>=0 && <Chips label="Lift · plane shadow" options={LIFTS} value={el.lift||'none'} onChange={v=>update({lift:v})} />}
      {ECHOABLE.indexOf(el.type)>=0 && <React.Fragment>
        <Chips label="Echo · misregistration" options={[{v:false,l:'Off'},{v:true,l:'On'}]} value={!!el.echo} onChange={v=>update({echo:v})} />
        {el.echo && <Swatches label="Echo colour" value={el.echoAccent||'auto'} onChange={v=>update({echoAccent:v})} auto />}
      </React.Fragment>}

      {/* colour */}
      <div className="ps-sech">Colour</div>
      {['headline','numeral','body','kicker','bignum','pricelist','qr','coupon','contact','arrow','wordmark','footer','badge','marquee'].indexOf(el.type)>=0 &&
        <Swatches label="Ink" value={el.ink!=null?el.ink:'auto'} onChange={v=>update({ink:v})} auto white />}
      {['block','rule','slab','stripes','dotfield','badge','seal','marquee','sticker','burst'].indexOf(el.type)>=0 &&
        <Swatches label={el.type==='sticker'?'Bed fill':el.type==='burst'?'Ray colour':'Fill'} value={el.fill!=null?el.fill:'pink'} onChange={v=>update({fill:v})} white />}
      {['headline','numeral','bignum','kicker','pricelist','qr','coupon','badge','marquee'].indexOf(el.type)>=0 &&
        <Chips label="Surface" options={SURFACES} value={el.surface||'none'} onChange={v=>update({surface:v})} />}

      {/* size + position */}
      <div className="ps-sech">Box</div>
      <Slider label="Width" val={el.w} min={16} max={Math.round(apDims(doc.size,doc.orient).wpt)} step={2} onChange={v=>update({w:v})} suffix="pt" />
      <Slider label="Height" val={el.h} min={10} max={Math.round(apDims(doc.size,doc.orient).hpt)} step={2} onChange={v=>update({h:v})} suffix="pt" />
      <div className="ps-rowflex">
        <Slider label="X" val={el.x} min={-40} max={Math.round(apDims(doc.size,doc.orient).wpt)} step={1} onChange={v=>update({x:v})} suffix="" />
        <Slider label="Y" val={el.y} min={-40} max={Math.round(apDims(doc.size,doc.orient).hpt)} step={1} onChange={v=>update({y:v})} suffix="" />
      </div>
    </React.Fragment>
  );
}

/* ---------- topbar ---------- */
function Topbar({ doc, setDoc, onResize, onExport, exporting, exportMsg }){
  const [name, setName] = React.useState(doc.title||'');
  React.useEffect(()=>{ setName(doc.title||''); }, [doc.title]);
  const commit = ()=> setDoc(d=> d.title===name ? d : ({...d, title:name}));
  const gang = AP_GANG[doc.size];
  const dims = apDims(doc.size, doc.orient);
  return (
    <div className="ps-top">
      <div className="ps-brand">Reality<small>PRINT STUDIO</small></div>

      <div className="ps-tgroup"><span className="gl">Size</span>
        <div className="ps-seg">
          {AP_ORD.map(sz=>(
            <button key={sz} className={doc.size===sz?'on':''} onClick={()=>onResize(sz)} title={AP_SZ[sz].mm.join('×')+' mm'}>
              {AP_SZ[sz].label}<small>{AP_SZ[sz].sub}</small>
            </button>
          ))}
        </div>
      </div>
      <div className="ps-tgroup"><span className="gl">Orient</span>
        <div className="ps-seg">
          {[{v:'portrait',l:'Portrait'},{v:'landscape',l:'Landscape'}].map(o=>(
            <button key={o.v} className={doc.orient===o.v?'on':''} onClick={()=>setDoc(d=>({...d, orient:o.v}))}>{o.l}</button>
          ))}
        </div>
      </div>
      <div className="ps-tgroup"><span className="gl">Accent</span>
        <div className="ps-swatches">
          {AP_ACC.map(a=>(
            <div key={a} className={'ps-sw'+(doc.accent===a?' on':'')} style={{ background:AP_PAL[a], width:22, height:22 }}
              onClick={()=>setDoc(d=>({...d, accent:a}))} title={a} />
          ))}
        </div>
      </div>

      <div className="spacer" />

      <div className="ps-tgroup"><span className="gl">{exporting? (exportMsg||'Rendering…') : ('Export · '+dims.wmm+'×'+dims.hmm+'mm')}</span>
        <input className="ps-tname" placeholder="File name…" value={name} spellCheck={false}
          onChange={e=>setName(e.target.value)} onBlur={commit}
          onKeyDown={e=>{ if(e.key==='Enter'){ commit(); e.currentTarget.blur(); } }} />
        <button className="ps-savebtn" disabled={exporting} onClick={()=>{ commit(); onExport('single'); }}
          title="One print-ready PDF at exact trim size, 3mm bleed + crop marks, K-only black text">
          Save PDF<small>1 UP · {AP_SZ[doc.size].label}</small>
        </button>
        <button className="ps-savebtn alt" disabled={exporting || !gang} onClick={()=>{ commit(); onExport('gang'); }}
          title={gang ? ('Gang '+gang.per+'× '+AP_SZ[doc.size].label+' onto one A4 sheet with cut guides') : 'Ganging is for A5–A8 (they tile an A4 sheet)'}>
          Gang on A4<small>{gang ? gang.per+' UP' : '—'}</small>
        </button>
      </div>

      <button className={'ps-iconbtn'+(doc.showBleed?' on':'')} onClick={()=>setDoc(d=>({...d,showBleed:!d.showBleed}))} title="Show bleed + crop marks">Bleed</button>
      <button className={'ps-iconbtn'+(doc.showGrid?' on':'')} onClick={()=>setDoc(d=>({...d,showGrid:!d.showGrid}))}>Grid</button>
      <button className={'ps-iconbtn'+(doc.snap?' on':'')} onClick={()=>setDoc(d=>({...d,snap:!d.snap}))}>Snap</button>
    </div>
  );
}

/* ---------- app ---------- */
function App(){
  const [doc, setDoc] = React.useState(loadDoc);
  const [selectedIds, setSelectedIds] = React.useState([]);
  const selectedId = selectedIds.length ? selectedIds[selectedIds.length-1] : null;
  const [scale, setScale] = React.useState(0.5);
  const [spawn, setSpawn] = React.useState(null);
  /* library sections — all start COLLAPSED (the menu was overwhelming); a
     section key maps to true once the user opens it. */
  const [openSecs, setOpenSecs] = React.useState({});
  const toggleSec = (k)=> setOpenSecs(s=>({ ...s, [k]:!s[k] }));
  const [exporting, setExporting] = React.useState(false);
  const [exportMsg, setExportMsg] = React.useState('');
  const [userTpls, setUserTpls] = React.useState(loadUserTpls);

  const stageRef = React.useRef(null);
  const canvasRef = React.useRef(null);
  const scaleRef = React.useRef(scale); scaleRef.current = scale;
  const docRef = React.useRef(doc); docRef.current = doc;
  const dims = apDims(doc.size, doc.orient);

  React.useEffect(()=>{ try{ localStorage.setItem(LS_KEY, JSON.stringify(doc)); }catch(e){} }, [doc]);
  React.useEffect(()=>{ if(window.PrintExport) window.PrintExport.ready().catch(()=>{}); }, []);

  function select(id, additive){
    if(id==null){ setSelectedIds([]); return; }
    setSelectedIds(prev => additive ? (prev.includes(id)?prev.filter(x=>x!==id):[...prev,id]) : (prev.length===1&&prev[0]===id?prev:[id]));
  }

  /* delete key */
  const selIdsRef = React.useRef(selectedIds); selIdsRef.current = selectedIds;
  React.useEffect(()=>{
    function onKey(e){
      if(e.key!=='Delete' && e.key!=='Backspace') return;
      const ids = selIdsRef.current; if(!ids.length) return;
      const ae = document.activeElement;
      if(ae && (ae.tagName==='INPUT'||ae.tagName==='TEXTAREA'||ae.tagName==='SELECT'||ae.isContentEditable)) return;
      e.preventDefault();
      setDoc(d=>({ ...d, elements:d.elements.filter(x=>ids.indexOf(x.id)<0) })); setSelectedIds([]);
    }
    window.addEventListener('keydown', onKey); return ()=>window.removeEventListener('keydown', onKey);
  }, []);

  React.useLayoutEffect(()=>{
    function recompute(){ const s=stageRef.current; if(!s) return; const pad=110;
      setScale(Math.min((s.clientWidth-pad)/dims.wpt, (s.clientHeight-pad)/dims.hpt)); }
    recompute();
    const ro = new ResizeObserver(recompute); if(stageRef.current) ro.observe(stageRef.current);
    return ()=>ro.disconnect();
  }, [dims.wpt, dims.hpt]);

  const sel = doc.elements.find(e=>e.id===selectedId) || null;

  function updateEl(id, patch){ setDoc(d=>({ ...d, elements:d.elements.map(e=>e.id===id?{...e,...patch}:e) })); }
  const update = (patch)=> sel && updateEl(sel.id, patch);
  const del = ()=>{ const ids=selectedIds; if(!ids.length) return; setDoc(d=>({...d, elements:d.elements.filter(e=>ids.indexOf(e.id)<0)})); setSelectedIds([]); };
  const dup = ()=>{ if(!sel) return; const c=Object.assign(JSON.parse(JSON.stringify(sel)),{id:apUid(), x:sel.x+12, y:sel.y+12}); setDoc(d=>({...d, elements:[...d.elements, c]})); setSelectedIds([c.id]); };
  const layer = (dir)=>{ if(!sel) return; setDoc(d=>{ const arr=d.elements.slice(); const i=arr.findIndex(e=>e.id===sel.id); const j=i+dir; if(j<0||j>=arr.length) return d; const t=arr[i]; arr[i]=arr[j]; arr[j]=t; return {...d, elements:arr}; }); };
  const clearAll = ()=>{ if(confirm('Remove all parts from the sheet?')){ setDoc(d=>({...d, elements:[]})); setSelectedIds([]); } };

  /* resize the document to a new A-size: scale every part in place */
  function onResize(newSize){
    setDoc(d=>{
      if(d.size===newSize) return d;
      const o = apDims(d.size, d.orient), n = apDims(newSize, d.orient), k = n.wpt/o.wpt;
      const elements = d.elements.map(e=>Object.assign({}, e, {
        x:Math.round(e.x*k), y:Math.round(e.y*k), w:Math.round(e.w*k), h:Math.round(e.h*k),
        fontSize: e.fontSize!=null ? Math.max(5, Math.round(e.fontSize*k)) : e.fontSize
      }));
      return {...d, size:newSize, elements};
    });
  }

  /* spawn-drag from library */
  function startSpawn(e, item){
    e.preventDefault();
    const type = item.type;
    setSpawn({ type:item.label||type, x:e.clientX, y:e.clientY });
    function mv(ev){ setSpawn(s=> s?{...s, x:ev.clientX, y:ev.clientY}:s); }
    function up(ev){
      window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); setSpawn(null);
      const st=stageRef.current, cv=canvasRef.current; if(!st||!cv) return;
      const sr=st.getBoundingClientRect();
      if(ev.clientX<sr.left||ev.clientX>sr.right||ev.clientY<sr.top||ev.clientY>sr.bottom) return;
      const cr=cv.getBoundingClientRect(), sc=scaleRef.current, d=AP_DEF[type];
      let vx=(ev.clientX-cr.left)/sc - d.w/2, vy=(ev.clientY-cr.top)/sc - d.h/2;
      if(docRef.current.snap){ vx=Math.round(vx/6)*6; vy=Math.round(vy/6)*6; }
      const el=apMake(type, Math.round(vx), Math.round(vy));
      setDoc(x=>({ ...x, elements:[...x.elements, el] })); setSelectedIds([el.id]);
    }
    window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up);
  }

  function applyTemplate(tpl){
    if(docRef.current.elements.length && !window.confirm('Replace the current sheet with the “'+tpl.name+'” layout?')) return;
    const b = apBuildTpl(tpl);
    setDoc(d=>({ ...d, size:b.size, orient:b.orient, accent:b.accent, elements:b.elements })); setSelectedIds([]);
  }
  function saveUserTpl(){
    const d=docRef.current; if(!d.elements.length){ window.alert('Nothing on the sheet to save yet.'); return; }
    const name=(window.prompt('Save this sheet as a template called:', d.title||'My layout')||'').trim(); if(!name) return;
    const snap=JSON.parse(JSON.stringify({ size:d.size, orient:d.orient, accent:d.accent, elements:d.elements }));
    const existing=userTpls.find(t=>t.name.toLowerCase()===name.toLowerCase());
    const t={ id: existing?existing.id:apUid(), name, savedAt:Date.now(), doc:snap };
    const next = existing ? userTpls.map(p=>p.id===t.id?t:p) : [t, ...userTpls];
    try{ localStorage.setItem(TPL_KEY, JSON.stringify(next)); setUserTpls(next); }catch(e){ window.alert('Storage full.'); }
  }
  function applyUserTpl(t){
    if(docRef.current.elements.length && !window.confirm('Replace the current sheet with “'+t.name+'”?')) return;
    const snap=JSON.parse(JSON.stringify(t.doc)); snap.elements.forEach(e=>{ e.id=apUid(); });
    setDoc(d=>({ ...d, size:snap.size, orient:snap.orient, accent:snap.accent, elements:snap.elements })); setSelectedIds([]);
  }
  function delUserTpl(id){ const next=userTpls.filter(x=>x.id!==id); try{ localStorage.setItem(TPL_KEY, JSON.stringify(next)); }catch(e){} setUserTpls(next); }

  /* ---- export ---- */
  function dl(bytes, name){
    const blob = new Blob([bytes], { type:'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a=document.createElement('a'); a.href=url; a.download=name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(url), 4000);
  }
  async function onExport(mode){
    if(exporting || !window.PrintExport) return;
    setSelectedIds([]); setExporting(true);
    const d = docRef.current;
    const base = apSlug(d.title) || 'reality-print';
    try{
      if(mode==='gang'){
        setExportMsg('Ganging '+AP_SZ[d.size].label+'…');
        const bytes = await window.PrintExport.gang(d, { marks:true });
        dl(bytes, base+'-'+d.size+'-x'+AP_GANG[d.size].per+'-a4.pdf');
      } else {
        setExportMsg('Rendering '+AP_SZ[d.size].label+'…');
        const bytes = await window.PrintExport.single(d, { bleed:d.bleed!==false, marks:d.marks!==false });
        dl(bytes, base+'-'+d.size+'.pdf');
      }
    }catch(err){ console.error('export failed', err); setExportMsg('Export failed — '+err.message); await new Promise(r=>setTimeout(r,1800)); }
    setExporting(false); setExportMsg('');
  }

  return (
    <div className="ps-app">
      <Topbar doc={doc} setDoc={setDoc} onResize={onResize} onExport={onExport} exporting={exporting} exportMsg={exportMsg} />
      <div className="ps-body">
        <div className="ps-lib">
          <div className="ps-libtitle">Templates</div>
          {AP_TPLG.map(grp=>{
            const items = AP_TPL.filter(tp=>tp.group===grp); const k='t:'+grp, open=!!openSecs[k];
            return (
              <React.Fragment key={k}>
                <button className={'ps-sec'+(open?' open':'')} onClick={()=>toggleSec(k)}>
                  <span className="caret">{open?'▾':'▸'}</span><span className="t">{grp}</span><span className="n">{items.length}</span>
                </button>
                {open && items.map(tp=>(
                  <div key={tp.id} className="ps-libitem" onClick={()=>applyTemplate(tp)}>
                    <span className="ln">{tp.name}</span><span className="lh">{AP_SZ[tp.size].label} · {tp.orient}</span>
                  </div>
                ))}
              </React.Fragment>
            );
          })}
          {(()=>{ const k='my', open=!!openSecs[k]; return (
            <React.Fragment>
              <button className={'ps-sec'+(open?' open':'')} onClick={()=>toggleSec(k)}>
                <span className="caret">{open?'▾':'▸'}</span><span className="t">My templates</span><span className="n">{userTpls.length}</span>
              </button>
              {open && <React.Fragment>
                {userTpls.map(t=>(
                  <div key={t.id} className="ps-libitem" onClick={()=>applyUserTpl(t)} style={{ position:'relative', paddingRight:34 }}>
                    <span className="ln">{t.name}</span><span className="lh">{t.doc.elements.length} parts · {AP_SZ[t.doc.size].label}</span>
                    <button className="ps-tplx" onClick={e=>{ e.stopPropagation(); delUserTpl(t.id); }}>×</button>
                  </div>
                ))}
                <button className="ps-addrow" onClick={saveUserTpl} style={{ marginBottom:6 }}>＋ Save current sheet</button>
              </React.Fragment>}
            </React.Fragment>
          ); })()}

          <div className="ps-libtitle">Parts <span className="hint">drag onto the sheet</span></div>
          {AP_CAT.map(g=>{
            const k='c:'+g.group, open=!!openSecs[k];
            return (
              <React.Fragment key={k}>
                <button className={'ps-sec'+(open?' open':'')} onClick={()=>toggleSec(k)}>
                  <span className="caret">{open?'▾':'▸'}</span><span className="t">{g.group}</span><span className="n">{g.items.length}</span>
                </button>
                {open && g.items.map(it=>(
                  <div key={it.label} className="ps-libitem" onPointerDown={e=>startSpawn(e, it)}>
                    <span className="ln">{it.label}</span><span className="lh">{it.hint}</span>
                  </div>
                ))}
              </React.Fragment>
            );
          })}
        </div>

        <APCanvas elements={doc.elements} wpt={dims.wpt} hpt={dims.hpt} accent={doc.accent}
          marginPt={6*AP_PPM} bleedPt={3*AP_PPM} showGrid={doc.showGrid} showBleed={doc.showBleed} snap={doc.snap}
          scale={scale} stageRef={stageRef} canvasRef={canvasRef}
          selectedId={selectedId} selectedIds={selectedIds} onSelect={select} onChange={updateEl} onCommit={()=>{}} />

        <div className="ps-inspector">
          <Inspector el={sel} doc={doc} update={update} dup={dup} del={del} layer={layer} clearAll={clearAll} />
        </div>
      </div>
      {spawn && <div className="ps-ghost" style={{ left:spawn.x, top:spawn.y }}>{spawn.type}</div>}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
