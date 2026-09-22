/* ============================================================
   REALITY PRINT STUDIO — App
   One A-size document, vector CMYK PDF out, gang-on-A4.
   Year 2 pass: layout grid + snapping, undo/redo, zoom, Fold
   inspector in one canonical order, template previews.
   ============================================================ */
import { processImageFile, imageFromClipboard } from '../studio-shared/image-intake.jsx';
import { describeStoreError as storeErrText, watchOtherTabs } from '../studio-shared/store.js';
import { useHistory, historyKey } from '../studio-shared/history.js';
import { ACCENTS as AP_ACC } from '../studio-shared/brand.js';
import { uid as apUid, slugify as apSlug } from '../studio-shared/util.js';
import { PrintImg, PrintDocs, PrintStore } from './print-store.js';
import {
  SIZES as AP_SZ, SIZE_ORDER as AP_ORD, GANG as AP_GANG, sizeDims as apDims, PT_PER_MM as AP_PPM, gridSpec,
} from './print-paper.js';
import { DEFAULTS as AP_DEF, makeElement as apMake } from './print-data.jsx';
import { buildTemplate as apBuildTpl } from './print-templates.js';
import {
  artPastTrim as apPastTrim, migrateElements as apMigrate, nfcDeep as apNfc, preflight as preflight_,
} from './print-preflight.js';
import { PrintCanvas as APCanvas } from './print-canvas.jsx';
import { PrintExport } from './print-imposition.js';
import { RUI } from './controls.jsx';
import { Inspector } from './inspector.jsx';
import { Topbar } from './topbar.jsx';
import { Library } from './library.jsx';

// For main.jsx's test hooks (scripts/test-studios renders the photo inspector).
export { ImageControls, IMG_TREATS, IMG_TREAT_PRESETS } from './image-controls.jsx';

function starterDoc(){
  return {
    size:'a5', orient:'portrait', accent:'pink',
    /* withBleed is opt-in: the PDF is the printable area at the exact A-size
       unless the shop asks for bleed. (It replaces the old always-on `bleed`
       flag, so docs saved before this default themselves back to trim-only.) */
    showGrid:false, showBleed:true, snap:true, withBleed:false,
    marginMm:6, grid:{ cols:0, rows:0, gutter:12 },
    title:'', elements:[
      Object.assign(apMake('kicker', 34, 40),  { w:360, text:'REALITY · ĐÀ NẴNG', align:'center', ink:'pink', tracking:0.26 }),
      Object.assign(apMake('headline', 30, 74),{ w:360, h:96, text:'INFO SIGN', fontSize:46, align:'center' }),
      Object.assign(apMake('body', 40, 200),   { w:340, text:'Drag parts from the left. Pick a template to start fast.', align:'center', fontSize:14 }),
    ]
  };
}
/* The stored doc / templates arrive from PrintDocs.load() (IndexedDB since
   v2 — see print-store.js) and are brought up to the current rules here:
   missing sheet keys default in, and old QR eyes go back to square. */
function hydrateDoc(d){
  if(!d || !Array.isArray(d.elements)) return starterDoc();
  const out = Object.assign(starterDoc(), d);
  out.elements = apMigrate(d.elements);
  return out;
}
function hydrateTpls(a){
  if(!Array.isArray(a)) return [];
  return a.filter(t=>t && t.doc && Array.isArray(t.doc.elements))
          .map(t=>Object.assign({}, t, { doc:Object.assign({}, t.doc, { elements:apMigrate(t.doc.elements) }) }));
}
/* storage errors in words a person can act on: storeErrText is store.js's
   describeStoreError (the Poster's badge reads the same words). */

/* ---------- paper-size change: what scales ----------
   x/y/w/h and fontSize always did; these are the other LENGTHS (pt) a part
   carries, which stayed put — so an A6 scaled to A1 kept its 2pt borders and
   6pt echo offsets. Per type, because the same key means different things
   (a sticker's `radius` is a fraction, a block's is pt; `weight` is a rule's
   thickness but a headline's font weight). ECHO_DEF is each renderer's
   fallback offset, materialised when echo is on so there's a number to scale. */
const LEN_PROPS = {
  '*':      ['border','shadowDist'],
  headline:['radius'], numeral:['radius'], bignum:['radius'], kicker:['radius'], pricelist:['radius'],
  qr:['radius'], coupon:['radius'], badge:['radius'], marquee:['radius'], arrow:['radius'], block:['radius'],
  image:['frameW'], sticker:['ringW'], shape:['stroke'], punchgrid:['stroke','gap'],
  rule:['weight','spacing','amp','gap','tickLen'], dotfield:['dot','gap'], arctext:['radiusAdj'],
};
const ECHO_DEF = { headline:4, numeral:5, bignum:4, kicker:4, body:4, icon:5, qr:6, block:8, slab:9, stripes:9, dotfield:8, sticker:7, burst:7, shape:7, rule:5 };
const round2 = v=>Math.round(v*100)/100;
function scaleElement(e, k){
  const o = Object.assign({}, e, {
    x:Math.round(e.x*k), y:Math.round(e.y*k), w:Math.round(e.w*k), h:Math.round(e.h*k),
    fontSize: e.fontSize!=null ? Math.max(5, Math.round(e.fontSize*k)) : e.fontSize
  });
  LEN_PROPS['*'].concat(LEN_PROPS[e.type]||[]).forEach(p=>{ if(typeof e[p]==='number') o[p]=round2(e[p]*k); });
  if(e.echo && ECHO_DEF[e.type]!=null){
    o.echoDx = round2((e.echoDx!=null?e.echoDx:ECHO_DEF[e.type])*k);
    o.echoDy = round2((e.echoDy!=null?e.echoDy:ECHO_DEF[e.type])*k);
  }
  if(e.type==='qr') o.capScale = round2((e.capScale||1)*k);
  return o;
}

/* ---------- boot: the stored doc is async now (IndexedDB) ----------
   Root waits for PrintDocs.load() — a few ms — and only then mounts the app,
   so the first render IS the saved sheet and the autosave never gets a chance
   to write the starter doc over it. */
function Root(){
  const [boot, setBoot] = React.useState(null);
  React.useEffect(()=>{
    let live = true;
    const p = PrintDocs ? PrintDocs.load() : Promise.resolve({ doc:null, tpls:null, backend:'none' });
    p.catch(e=>({ doc:null, tpls:null, backend:'none', error:e })).then(r=>{ if(live) setBoot(r); });
    return ()=>{ live=false; };
  }, []);
  if(!boot) return <div className="ps-boot">Reality · Print Studio</div>;
  return <App boot={boot} />;
}

/* ---------- app ---------- */
function App({ boot }){
  const [doc, setDoc] = React.useState(()=>hydrateDoc(boot.doc));
  const [selectedIds, setSelectedIds] = React.useState([]);
  const selectedId = selectedIds.length ? selectedIds[selectedIds.length-1] : null;
  const [fitScale, setFitScale] = React.useState(0.5);
  const [zoom, setZoom] = React.useState(null);           // null = fit
  const [spawn, setSpawn] = React.useState(null);
  const [exporting, setExporting] = React.useState(false);
  const [exportMsg, setExportMsg] = React.useState('');
  /* export problems stay until dismissed — they used to vanish after 1.8 s */
  const [exportErr, setExportErr] = React.useState(null);
  const [exportNote, setExportNote] = React.useState(null);
  const [userTpls, setUserTpls] = React.useState(()=>hydrateTpls(boot.tpls));
  const [saveSt, setSaveSt] = React.useState('saved');    // saved | saving | failed
  const [saveErr, setSaveErr] = React.useState(null);
  const [tplErr, setTplErr] = React.useState(null);
  const [storeErr, setStoreErr] = React.useState(boot.backend==='ls' ? 'IndexedDB unavailable — saving to localStorage (shared, ~5 MB)' : null);
  const [otherTab, setOtherTab] = React.useState(false);

  const stageRef = React.useRef(null);
  const canvasRef = React.useRef(null);
  const docRef = React.useRef(doc); docRef.current = doc;
  const dims = apDims(doc.size, doc.orient);
  const scale = zoom!=null ? zoom : fitScale;
  const scaleRef = React.useRef(scale); scaleRef.current = scale;
  const fitRef = React.useRef(fitScale); fitRef.current = fitScale;
  const zoomRef = React.useRef(zoom); zoomRef.current = zoom;

  /* ---- autosave. Every doc change goes to PrintDocs (IndexedDB; one write in
     flight, the newest queued), and a failed write SAYS so — the old
     localStorage write swallowed the error, so a full bucket (shared with
     Poster and Schedule) meant edits silently stopped persisting. The first
     render is the doc we just loaded; writing it back would only let a second
     tab clobber the first by opening. ---- */
  const saveSeq = React.useRef(0);
  const firstSave = React.useRef(true);
  React.useEffect(()=>{
    if(firstSave.current){ firstSave.current=false; return; }
    if(!PrintDocs) return;
    const n = ++saveSeq.current;
    setSaveSt('saving');
    PrintDocs.saveDoc(doc).then(()=>{ if(n===saveSeq.current){ setSaveSt('saved'); setSaveErr(null); } })
      .catch(e=>{ console.error('autosave failed', e); if(n===saveSeq.current){ setSaveSt('failed'); setSaveErr(storeErrText(e)); } });
  }, [doc]);
  const persistTpls = (next)=>{
    setUserTpls(next);
    if(!PrintDocs) return;
    PrintDocs.saveTpls(next).then(()=>setTplErr(null))
      .catch(e=>{ console.error('template save failed', e); setTplErr(storeErrText(e)); });
  };
  /* the image store reports its own failures (a photo kept in memory only) */
  React.useEffect(()=>{
    const h = (e)=>{ const d=e.detail||{}; setStoreErr(d.message||'storage error'); };
    window.addEventListener('printstore:error', h); return ()=>window.removeEventListener('printstore:error', h);
  }, []);

  /* ---- two tabs, one working doc. Both autosave to the same record, so the
     last one to change anything wins and the other's work is gone on reload.
     Tabs announce themselves on a BroadcastChannel; any other voice on it
     raises the warning (and a `storage` event covers the localStorage
     fallback, where a write from the other tab fires one here) — store.js
     watchOtherTabs. ---- */
  const tabs = React.useRef(null);
  React.useEffect(()=>{
    tabs.current = watchOtherTabs({ channel:'reality-print-studio', storagePrefix:'reality-print', onChange:setOtherTab });
    return ()=>{ tabs.current.stop(); tabs.current = null; };
  }, []);

  /* ---- orphaned photos. Nothing ever called delImage, so every upload stayed
     in IDB for good. Once per load, and only when the doc AND the templates
     both came out of IndexedDB cleanly and no other tab answered the hello:
     delete stored images nothing references (the working doc, every "My
     template", this session's undo history) that are over a day old. ---- */
  const tplsRef = React.useRef(userTpls); tplsRef.current = userTpls;
  React.useEffect(()=>{
    if(boot.backend!=='idb' || boot.error || !PrintStore || !PrintStore.gcImages) return;
    const t = setTimeout(()=>{
      if(tabs.current && tabs.current.peers()>0) return;
      const keep = new Set();
      const take = (els)=> (els||[]).forEach(e=>{ if(e && e.imgId) keep.add(e.imgId); });
      take(docRef.current.elements);
      tplsRef.current.forEach(tp=> take(tp.doc && tp.doc.elements));
      hist.snapshots().forEach(d=>take(d && d.elements));
      PrintStore.gcImages(keep, 24*3600*1000)
        .then(n=>{ if(n) console.info('Print Studio: removed '+n+' orphaned image'+(n===1?'':'s')+' from storage'); })
        .catch(e=>console.warn('image sweep skipped', e));
    }, 2500);
    return ()=>clearTimeout(t);
  }, []);

  React.useEffect(()=>{ if(PrintExport) PrintExport.ready().catch(()=>{}); }, []);
  /* layouts measured in JS (fitted headlines, the coupon stack) read the webfont
     off a canvas — repaint once the faces land so a cold load isn't laid out
     against the fallback metrics. */
  const [, fontsIn] = React.useState(0);
  React.useEffect(()=>{ if(document.fonts && document.fonts.ready) document.fonts.ready.then(()=>fontsIn(1)).catch(()=>{}); }, []);

  /* ---- history — one entry per quiet burst of edits (350ms), max 80
     (../studio-shared/history.js, the one Poster and Schedule use) ---- */
  const hist = useHistory(doc, { limit:80, coalesceMs:350, apply:(snap)=>{
    setDoc(snap);
    setSelectedIds(ids=>ids.filter(id=>snap.elements.some(e=>e.id===id)));
  } });
  const { undo, redo } = hist;

  function select(id, additive){
    if(id==null){ setSelectedIds([]); return; }
    setSelectedIds(prev => additive ? (prev.includes(id)?prev.filter(x=>x!==id):[...prev,id]) : (prev.length===1&&prev[0]===id?prev:[id]));
  }

  /* ---- keyboard: delete, undo/redo, duplicate, select-all, nudge, esc ---- */
  const selIdsRef = React.useRef(selectedIds); selIdsRef.current = selectedIds;
  React.useEffect(()=>{
    function onKey(e){
      const ae = document.activeElement;
      const typing = ae && (ae.tagName==='INPUT'||ae.tagName==='TEXTAREA'||ae.tagName==='SELECT'||ae.isContentEditable);
      const mod = e.ctrlKey||e.metaKey;
      if(historyKey(e, undo, redo)) return;
      if(typing) return;
      const ids = selIdsRef.current;
      if(mod && (e.key==='a'||e.key==='A')){ e.preventDefault(); setSelectedIds(docRef.current.elements.map(x=>x.id)); return; }
      if(mod && (e.key==='d'||e.key==='D')){ e.preventDefault();
        if(!ids.length) return;
        const cur=docRef.current; const copies=[];
        ids.forEach(id=>{ const src=cur.elements.find(x=>x.id===id); if(src){ const c=Object.assign(JSON.parse(JSON.stringify(src)),{id:apUid(), x:src.x+12, y:src.y+12}); copies.push(c); } });
        if(copies.length){ setDoc(d=>({ ...d, elements:[...d.elements, ...copies] })); setSelectedIds(copies.map(c=>c.id)); }
        return; }
      if(e.key==='Escape'){ setSelectedIds([]); return; }
      if(e.key==='Delete'||e.key==='Backspace'){
        if(!ids.length) return;
        e.preventDefault();
        setDoc(d=>({ ...d, elements:d.elements.filter(x=>ids.indexOf(x.id)<0) })); setSelectedIds([]);
        return;
      }
      if(e.key==='ArrowLeft'||e.key==='ArrowRight'||e.key==='ArrowUp'||e.key==='ArrowDown'){
        if(!ids.length) return;
        e.preventDefault();
        const st = e.shiftKey?10:1;
        const dx = e.key==='ArrowLeft'?-st : e.key==='ArrowRight'?st : 0;
        const dy = e.key==='ArrowUp'?-st : e.key==='ArrowDown'?st : 0;
        setDoc(d=>({ ...d, elements:d.elements.map(x=> ids.indexOf(x.id)>=0 ? {...x, x:x.x+dx, y:x.y+dy} : x) }));
        return;
      }
    }
    window.addEventListener('keydown', onKey); return ()=>window.removeEventListener('keydown', onKey);
  }, [undo, redo]);

  /* warm the image store, and accept pasted images */
  React.useEffect(()=>{ if(PrintStore) PrintStore.open().catch(()=>{}); }, []);
  React.useEffect(()=>{
    function onPaste(e){
      const file = imageFromClipboard(e.clipboardData); if(!file) return;
      const ae=document.activeElement; if(ae && (ae.tagName==='INPUT'||ae.tagName==='TEXTAREA'||ae.isContentEditable)) return;
      e.preventDefault();
      processImageFile(file, ({data,w,h})=>{
        if(!PrintImg) return;
        PrintImg.add(data,w,h).then(id=>{
          const cur=docRef.current, ids=selIdsRef.current, selEl=cur.elements.find(x=>x.id===ids[ids.length-1]);
          if(selEl && selEl.type==='image'){ updateEl(selEl.id, { imgId:id, h: selEl.imgId?selEl.h:Math.max(20,Math.round(selEl.w*h/w)) }); return; }
          const dd=apDims(cur.size,cur.orient), elw=Math.min(AP_DEF.image.w, Math.round(dd.wpt-40)), elh=Math.max(20,Math.round(elw*h/w));
          const ne=apMake('image', Math.round((dd.wpt-elw)/2), 60); ne.w=elw; ne.h=elh; ne.imgId=id;
          setDoc(x=>({ ...x, elements:[...x.elements, ne] })); setSelectedIds([ne.id]);
        });
      });
    }
    window.addEventListener('paste', onPaste); return ()=>window.removeEventListener('paste', onPaste);
  }, []);

  React.useLayoutEffect(()=>{
    function recompute(){ const s=stageRef.current; if(!s) return; const pad=110;
      setFitScale(Math.max(0.05, Math.min((s.clientWidth-pad)/dims.wpt, (s.clientHeight-pad)/dims.hpt))); }
    recompute();
    const ro = new ResizeObserver(recompute); if(stageRef.current) ro.observe(stageRef.current);
    return ()=>ro.disconnect();
  }, [dims.wpt, dims.hpt]);

  const sel = doc.elements.find(e=>e.id===selectedId) || null;

  /* every edit lands NFC (nfcDeep) — decomposed Vietnamese pasted into a
     field is folded to precomposed letters here, before it's saved; the
     exporter normalises again regardless, for docs saved before this. */
  function updateEl(id, patch){ patch = apNfc(patch); setDoc(d=>({ ...d, elements:d.elements.map(e=>e.id===id?{...e,...patch}:e) })); }
  function updateMany(patches){ setDoc(d=>({ ...d, elements:d.elements.map(e=> patches[e.id] ? {...e, ...patches[e.id]} : e) })); }
  const update = (patch)=> sel && updateEl(sel.id, patch);
  const del = ()=>{ const ids=selectedIds; if(!ids.length) return; setDoc(d=>({...d, elements:d.elements.filter(e=>ids.indexOf(e.id)<0)})); setSelectedIds([]); };
  const dup = ()=>{ if(!sel) return; const c=Object.assign(JSON.parse(JSON.stringify(sel)),{id:apUid(), x:sel.x+12, y:sel.y+12}); setDoc(d=>({...d, elements:[...d.elements, c]})); setSelectedIds([c.id]); };
  const layer = (dir)=>{ if(!sel) return; setDoc(d=>{ const arr=d.elements.slice(); const i=arr.findIndex(e=>e.id===sel.id); const j=i+dir; if(j<0||j>=arr.length) return d; const t=arr[i]; arr[i]=arr[j]; arr[j]=t; return {...d, elements:arr}; }); };
  const clearAll = ()=>{ if(confirm('Remove all parts from the sheet?')){ setDoc(d=>({...d, elements:[]})); setSelectedIds([]); } };

  /* align + distribute the multi-selection */
  function alignSel(axis, mode){
    const items = selectedIds.map(id=>doc.elements.find(e=>e.id===id)).filter(Boolean);
    if(items.length<2) return;
    const x0=Math.min(...items.map(e=>e.x)), x1=Math.max(...items.map(e=>e.x+e.w));
    const y0=Math.min(...items.map(e=>e.y)), y1=Math.max(...items.map(e=>e.y+e.h));
    const patches={};
    items.forEach(e=>{
      if(axis==='x'){ const nx = mode==='left'? x0 : mode==='right'? x1-e.w : (x0+x1)/2 - e.w/2; patches[e.id]={ x:Math.round(nx) }; }
      else { const ny = mode==='top'? y0 : mode==='bottom'? y1-e.h : (y0+y1)/2 - e.h/2; patches[e.id]={ y:Math.round(ny) }; }
    });
    updateMany(patches);
  }
  function distributeSel(axis){
    const items = selectedIds.map(id=>doc.elements.find(e=>e.id===id)).filter(Boolean);
    if(items.length<3) return;
    const sorted = items.slice().sort((a,b)=> axis==='x' ? a.x-b.x : a.y-b.y);
    const lo = axis==='x' ? Math.min(...items.map(e=>e.x)) : Math.min(...items.map(e=>e.y));
    const hi = axis==='x' ? Math.max(...items.map(e=>e.x+e.w)) : Math.max(...items.map(e=>e.y+e.h));
    const sum = sorted.reduce((a,e)=> a + (axis==='x'?e.w:e.h), 0);
    const gap = ((hi-lo) - sum) / (sorted.length-1);
    let cur = lo;
    const patches={};
    sorted.forEach(e=>{
      patches[e.id] = axis==='x' ? { x:Math.round(cur) } : { y:Math.round(cur) };
      cur += (axis==='x'?e.w:e.h) + gap;
    });
    updateMany(patches);
  }

  /* resize the document to a new A-size: scale every part in place.
     Always from an UNROUNDED basis: each step used to scale the previous
     step's rounded numbers, so A6 → A1 → A6 did not come back to the A6 you
     had. resizeBase remembers the elements as they were before the first of a
     run of size changes; while the sheet is untouched between changes (its
     elements are still exactly what the last resize produced), the next one
     scales that original again — so any hop, and any return trip, is one
     rounding away from the source, not a stack of them. Edit anything and the
     edited sheet becomes the new basis. */
  const resizeBase = React.useRef(null);
  function onResize(newSize){
    setDoc(d=>{
      if(d.size===newSize) return d;
      const rb = resizeBase.current;
      const base = (rb && rb.result===d.elements && rb.orient===d.orient) ? rb : { size:d.size, orient:d.orient, elements:d.elements };
      const o = apDims(base.size, base.orient), n = apDims(newSize, d.orient), k = n.wpt/o.wpt;
      const elements = newSize===base.size ? base.elements.slice() : base.elements.map(e=>scaleElement(e, k));
      resizeBase.current = { size:base.size, orient:base.orient, elements:base.elements, result:elements };
      return {...d, size:newSize, elements};
    });
    setZoom(null);
  }

  /* zoom controls */
  const ZOOMS = [0.1,0.15,0.25,0.35,0.5,0.65,0.8,1,1.25,1.5,2,3,4];
  const onZoomFit = ()=> setZoom(null);
  const onZoomStep = (dir)=> setZoom(z=>{
    const cur = z!=null?z:fitRef.current;
    let i = 0; for(let k=0;k<ZOOMS.length;k++){ if(Math.abs(ZOOMS[k]-cur)<Math.abs(ZOOMS[i]-cur)) i=k; }
    if(ZOOMS[i]<=cur && dir>0) i++; else if(ZOOMS[i]>=cur && dir<0) i--;
    i = Math.max(0, Math.min(ZOOMS.length-1, dir>0?Math.max(i, 0):i));
    return ZOOMS[Math.max(0, Math.min(ZOOMS.length-1, i))];
  });
  const onZoomWheel = React.useCallback((deltaY)=>{
    setZoom(z=>{
      const cur = z!=null?z:fitRef.current;
      return Math.max(0.08, Math.min(4, cur*Math.exp(-deltaY*0.0012)));
    });
  }, []);
  const zoomPct = Math.round(scale*100)+'%';

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
    /* A flood template runs its colour 12pt past the trim — which only prints
       if the PDF carries bleed. withBleed defaults OFF, so applying one used to
       hand over a trim-only file that guillotines to white slivers. Floods
       switch it on (the Trim/Bleed control shows it; switch back if the shop
       wants trim-only); anything else leaves the choice as it was. */
    const floods = apPastTrim(b.elements, apDims(b.size, b.orient)).length>0;
    setDoc(d=>({ ...d, size:b.size, orient:b.orient, accent:b.accent, elements:b.elements, withBleed: floods ? true : d.withBleed })); setSelectedIds([]); setZoom(null);
  }
  function saveUserTpl(){
    const d=docRef.current; if(!d.elements.length){ window.alert('Nothing on the sheet to save yet.'); return; }
    const name=(window.prompt('Save this sheet as a template called:', d.title||'My layout')||'').trim(); if(!name) return;
    const snap=JSON.parse(JSON.stringify({ size:d.size, orient:d.orient, accent:d.accent, elements:d.elements }));
    const existing=userTpls.find(t=>t.name.toLowerCase()===name.toLowerCase());
    const t={ id: existing?existing.id:apUid(), name, savedAt:Date.now(), doc:snap };
    const next = existing ? userTpls.map(p=>p.id===t.id?t:p) : [t, ...userTpls];
    persistTpls(next);
  }
  function applyUserTpl(t){
    if(docRef.current.elements.length && !window.confirm('Replace the current sheet with “'+t.name+'”?')) return;
    const snap=JSON.parse(JSON.stringify(t.doc)); snap.elements = apMigrate(snap.elements); snap.elements.forEach(e=>{ e.id=apUid(); });
    const floods = apPastTrim(snap.elements, apDims(snap.size, snap.orient)).length>0;   // same rule as applyTemplate
    setDoc(d=>({ ...d, size:snap.size, orient:snap.orient, accent:snap.accent, elements:snap.elements, withBleed: floods ? true : d.withBleed })); setSelectedIds([]); setZoom(null);
  }
  function delUserTpl(id){ persistTpls(userTpls.filter(x=>x.id!==id)); }

  /* ---- export ---- */
  function dl(bytes, name){
    const blob = new Blob([bytes], { type:'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a=document.createElement('a'); a.href=url; a.download=name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(url), 4000);
  }
  async function onExport(mode){
    if(exporting || !PrintExport) return;
    const d = docRef.current;
    /* photos that would print as blank boxes — ask before making a broken PDF
       rather than after (the preflight shows them too) */
    const imgs = d.elements.filter(e=>e.type==='image');
    if(imgs.length && PrintImg){
      const miss = [];
      for(const e of imgs){
        if(!e.imgId){ miss.push('an empty image frame'); continue; }
        const m = await PrintImg.meta(e.imgId).catch(()=>null);
        if(!m) miss.push('a photo missing from storage');
      }
      if(miss.length && !window.confirm(miss.length+' image'+(miss.length===1?'':'s')+' will print as a blank white box:\n\n  · '+miss.join('\n  · ')
          +'\n\nRe-upload '+(miss.length===1?'it':'them')+' first, or export anyway?')) return;
    }
    setSelectedIds([]); setExporting(true); setExportErr(null); setExportNote(null);
    const base = apSlug(d.title) || 'reality-print';
    try{
      if(mode==='gang'){
        setExportMsg('Ganging '+AP_SZ[d.size].label+'…');
        const bytes = await PrintExport.gang(d, { marks:true });
        dl(bytes, base+'-'+d.size+'-x'+AP_GANG[d.size].per+'-a4.pdf');
      } else {
        setExportMsg('Rendering '+AP_SZ[d.size].label+'…');
        const withBleed = d.withBleed===true;
        const bytes = await PrintExport.single(d, { bleed:withBleed, marks:true });
        dl(bytes, base+'-'+d.size+(withBleed?'-bleed':'')+'.pdf');
      }
      /* what the exporter could not draw — said out loud, kept until dismissed */
      const rep = PrintExport.report ? PrintExport.report() : null;
      if(rep && (rep.missingImages.length || rep.failed.length)){
        const bits = [];
        if(rep.missingImages.length) bits.push(rep.missingImages.length+' image'+(rep.missingImages.length===1?'':'s')+' printed as blank boxes');
        if(rep.failed.length) bits.push(rep.failed.length+' part'+(rep.failed.length===1?'':'s')+' failed to draw ('+rep.failed.map(f=>f.type).join(', ')+')');
        setExportNote('PDF saved, but '+bits.join(' and ')+'. Check it before sending.');
        setSelectedIds(rep.missingImages.map(m=>m.id).concat(rep.failed.map(f=>f.id)).filter(Boolean));
      }
    }catch(err){ console.error('export failed', err); setExportErr('Export failed — '+((err&&err.message)||err)); }
    setExporting(false); setExportMsg('');
  }

  /* ---- preflight inputs the pure check can't reach on its own: each photo's
     stored size (null = gone from storage) and the embedded fonts' cmaps. ---- */
  const [imgMeta, setImgMeta] = React.useState({});
  React.useEffect(()=>{
    if(!PrintImg) return;
    const ids = Array.from(new Set(doc.elements.filter(e=>e.type==='image' && e.imgId).map(e=>e.imgId))).filter(id=>!(id in imgMeta));
    if(!ids.length) return;
    let live = true;
    Promise.all(ids.map(id=>PrintImg.meta(id).then(m=>[id,m], ()=>[id,null]))).then(rs=>{
      if(!live) return;
      setImgMeta(o=>{ const n=Object.assign({}, o); rs.forEach(([id,m])=>{ n[id]=m; }); return n; });
    });
    return ()=>{ live=false; };
  }, [doc.elements]);
  const [glyphFn, setGlyphFn] = React.useState(null);
  React.useEffect(()=>{
    if(PrintExport && PrintExport.glyphChecker)
      PrintExport.glyphChecker().then(fn=>setGlyphFn(()=>fn)).catch(e=>console.warn('glyph check unavailable', e));
  }, []);
  const preflightItems = React.useMemo(()=>{
    const items = preflight_(doc, dims, { images:imgMeta, hasGlyph:glyphFn });
    /* photos the store could not keep — fine now, gone after a reload */
    const unsaved = PrintImg && PrintImg.unsaved ? PrintImg.unsaved() : [];
    doc.elements.forEach(e=>{ if(e.type==='image' && e.imgId && unsaved.indexOf(e.imgId)>=0)
      items.push({ level:'err', kind:'img', ids:[e.id], text:'Image is in memory only — storage refused it, so it vanishes on reload. Export now, or free space and re-upload.' }); });
    return items;
  }, [doc, imgMeta, glyphFn, storeErr]);
  const pastTrim = React.useMemo(()=>apPastTrim(doc.elements, dims).length, [doc.elements, dims.wpt, dims.hpt]);
  const pickIssue = (it)=>{ if(it.ids && it.ids.length) setSelectedIds(it.ids.filter(id=>doc.elements.some(e=>e.id===id))); };

  /* ---- status: what the save / the other tab / the store is doing, in the
     top row, where it can't be missed ---- */
  const status = (<React.Fragment>
    {saveSt==='failed'
      ? <span className="ps-stat bad" title={'The last change did not reach storage: '+saveErr+'. Keep this tab open, free space (or export a PDF), and it retries on the next edit.'}>NOT SAVED — {saveErr}</span>
      : <span className="ps-stat" title={boot.backend==='ls' ? 'Autosaved to browser localStorage' : 'Autosaved to this browser (IndexedDB)'}>{saveSt==='saving' ? 'Saving…' : '✓ Saved'}</span>}
    {tplErr && <span className="ps-stat bad" title="The My templates list did not save">TEMPLATES NOT SAVED — {tplErr}</span>}
    {otherTab && <span className="ps-stat warn" title="Both tabs autosave the same sheet — the last one edited wins, and the other's changes are lost on reload. Close one.">⚠ Open in another tab</span>}
    {storeErr && <span className="ps-stat warn" title={storeErr}>⚠ {storeErr.length>44 ? storeErr.slice(0,42)+'…' : storeErr}
      <button className="ps-statx" onClick={()=>setStoreErr(null)} title="Dismiss">×</button></span>}
  </React.Fragment>);

  const gridS = gridSpec(doc, dims);

  /* Ctrl-K. The palette searches every inspector label the Fold index has
     harvested, plus these — the sheet-level commands that live in the topbar
     and are otherwise only reachable by aiming at a 10px segmented button. */
  const [palOpen, setPalOpen] = RUI.usePalette();
  React.useEffect(()=>{
    RUI.setActions([].concat(
      AP_ORD.map(sz=>({ label:'Size · '+AP_SZ[sz].label+' ('+AP_SZ[sz].mm.join('×')+' mm)', group:'Sheet', run:()=>onResize(sz) })),
      [{ label:'Orientation · Portrait', group:'Sheet', run:()=>setDoc(d=>({...d, orient:'portrait'})) },
       { label:'Orientation · Landscape', group:'Sheet', run:()=>setDoc(d=>({...d, orient:'landscape'})) }],
      AP_ACC.map(a=>({ label:'Accent · '+a, group:'Sheet', run:()=>setDoc(d=>({...d, accent:a})) })),
      [{ label:'Export · Trim only (exact '+AP_SZ[doc.size].label+')', group:'Sheet', run:()=>setDoc(d=>({...d, withBleed:false})) },
       { label:'Export · With 3 mm bleed + crop marks', group:'Sheet', run:()=>setDoc(d=>({...d, withBleed:true})) }],
      [{ label:'Toggle bleed guide on canvas', group:'View', run:()=>setDoc(d=>({...d, showBleed:!d.showBleed})) },
       { label:'Toggle layout grid', group:'View', run:()=>setDoc(d=>({...d, showGrid:!d.showGrid})) },
       { label:'Toggle snap', group:'View', run:()=>setDoc(d=>({...d, snap:!d.snap})) },
       { label:'Toggle hints', group:'View', run:()=>RUI.setHints(!RUI.hintsOn()) },
       { label:'Zoom to fit', group:'View', run:onZoomFit },
       { label:'Undo', group:'Edit', run:undo },
       { label:'Redo', group:'Edit', run:redo },
       { label:'Save PDF — 1 up', group:'Export', run:()=>onExport('single') },
       { label:'Save PDF — gang on A4', group:'Export', run:()=>onExport('gang') }]
    ));
  }, [doc.size, doc.orient, doc.showBleed, doc.showGrid, doc.snap]);

  return (
    <div className="ps-app">
      <Topbar doc={doc} setDoc={setDoc} onResize={onResize} onExport={onExport} exporting={exporting} exportMsg={exportMsg}
        zoomPct={zoomPct} onZoomFit={onZoomFit} onZoomStep={onZoomStep}
        canUndo={hist.canUndo} canRedo={hist.canRedo} onUndo={undo} onRedo={redo}
        preflight={preflightItems} onPickIssue={pickIssue} pastTrim={pastTrim} status={status} />
      <div className="ps-body">
        <Library userTpls={userTpls} onApplyTemplate={applyTemplate} onApplyUserTpl={applyUserTpl}
          onDeleteUserTpl={delUserTpl} onSaveUserTpl={saveUserTpl} onStartSpawn={startSpawn} />

        <APCanvas elements={doc.elements} wpt={dims.wpt} hpt={dims.hpt} accent={doc.accent}
          grid={gridS} bleedPt={3*AP_PPM} showGrid={doc.showGrid} showBleed={doc.showBleed} snap={doc.snap}
          scale={scale} stageRef={stageRef} canvasRef={canvasRef}
          selectedId={selectedId} selectedIds={selectedIds} onSelect={select}
          onChange={updateEl} onChangeMany={updateMany} onCommit={()=>{}} onZoomWheel={onZoomWheel} />

        <div className="ps-inspector">
          <Inspector el={sel} doc={doc} dims={dims} update={update} dup={dup} del={del} layer={layer}
            clearAll={clearAll} setDoc={setDoc} selCount={selectedIds.length} align={alignSel} distribute={distributeSel} />
        </div>
      </div>
      {spawn && <div className="ps-ghost" style={{ left:spawn.x, top:spawn.y }}>{spawn.type}</div>}
      {palOpen && <RUI.Palette onClose={()=>setPalOpen(false)} />}
      {(exportErr || exportNote) && <div className={'ps-toast'+(exportErr?' bad':'')} role="alert">
        <span>{exportErr || exportNote}</span>
        <button className="ps-statx" onClick={()=>{ setExportErr(null); setExportNote(null); }} title="Dismiss">×</button>
      </div>}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<Root/>);
