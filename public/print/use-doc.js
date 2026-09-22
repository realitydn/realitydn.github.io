/* ============================================================
   REALITY PRINT STUDIO — useDoc: the sheet, the selection, undo
   ------------------------------------------------------------
   The working doc (hydrated from what PrintDocs.load() found),
   the selection, the shared undo history, and every edit the
   inspector, the canvas and the keyboard make to it: update,
   duplicate, delete, layer, clear, align / distribute, and the
   paper-size change that rescales the layout in place.
   (Split out of print-app.jsx, Phase 3.)
   ============================================================ */
import { useHistory } from '../studio-shared/history.js';
import { uid as apUid } from '../studio-shared/util.js';
import { sizeDims as apDims } from './print-paper.js';
import { makeElement as apMake } from './print-data.jsx';
import { migrateElements as apMigrate, nfcDeep as apNfc } from './print-preflight.js';

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
/* The stored doc arrives from PrintDocs.load() (IndexedDB since v2 — see
   print-store.js) and is brought up to the current rules here: missing sheet
   keys default in, and old QR eyes go back to square. */
function hydrateDoc(d){
  if(!d || !Array.isArray(d.elements)) return starterDoc();
  const out = Object.assign(starterDoc(), d);
  out.elements = apMigrate(d.elements);
  return out;
}

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

function useDoc(bootDoc){
  const [doc, setDoc] = React.useState(()=>hydrateDoc(bootDoc));
  const [selectedIds, setSelectedIds] = React.useState([]);
  const selectedId = selectedIds.length ? selectedIds[selectedIds.length-1] : null;
  const docRef = React.useRef(doc); docRef.current = doc;
  const selIdsRef = React.useRef(selectedIds); selIdsRef.current = selectedIds;

  /* ---- history — one entry per quiet burst of edits (350ms), max 80
     (../studio-shared/history.js, the one Poster and Schedule use) ---- */
  const hist = useHistory(doc, { limit:80, coalesceMs:350, apply:(snap)=>{
    setDoc(snap);
    setSelectedIds(ids=>ids.filter(id=>snap.elements.some(e=>e.id===id)));
  } });

  function select(id, additive){
    if(id==null){ setSelectedIds([]); return; }
    setSelectedIds(prev => additive ? (prev.includes(id)?prev.filter(x=>x!==id):[...prev,id]) : (prev.length===1&&prev[0]===id?prev:[id]));
  }

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
     edited sheet becomes the new basis. (The app refits the view after.) */
  const resizeBase = React.useRef(null);
  function resize(newSize){
    setDoc(d=>{
      if(d.size===newSize) return d;
      const rb = resizeBase.current;
      const base = (rb && rb.result===d.elements && rb.orient===d.orient) ? rb : { size:d.size, orient:d.orient, elements:d.elements };
      const o = apDims(base.size, base.orient), n = apDims(newSize, d.orient), k = n.wpt/o.wpt;
      const elements = newSize===base.size ? base.elements.slice() : base.elements.map(e=>scaleElement(e, k));
      resizeBase.current = { size:base.size, orient:base.orient, elements:base.elements, result:elements };
      return {...d, size:newSize, elements};
    });
  }

  return {
    doc, setDoc, docRef, selectedIds, setSelectedIds, selIdsRef, selectedId, sel, select, hist,
    updateEl, updateMany, update, del, dup, layer, clearAll, alignSel, distributeSel, resize,
  };
}

export { useDoc, starterDoc, hydrateDoc, scaleElement };
