/* ============================================================
   REALITY POSTER STUDIO — useDoc
   The doc (Master + per-format overrides), the selection, the view format,
   undo (the shared history), and every edit routed onto Master or an override.
   ============================================================ */
import { useHistory } from '../../studio-shared/history.js';
import { FORMATS as AP_FMT, resolveElements as apResolve, LAYOUT_KEYS as AP_LK, uid } from '../studio-data.jsx';
import { starterDoc, shallowSame } from '../doc.js';
function useDoc(initialDoc){
  const [doc, setDoc] = React.useState(()=>initialDoc || starterDoc());
  const [selectedIds, setSelectedIds] = React.useState([]);
  const selectedId = selectedIds.length ? selectedIds[selectedIds.length-1] : null;  // primary (last clicked)
  const [sliceMode, setSliceMode] = React.useState(false);   // editing the feed-slice band
  const setFeedSlice = (s)=>setDoc(d=>({ ...d, feedSlice:s }));

  /* Shift-click adds/removes; a plain click selects one. */
  function select(id, additive){
    if(id==null){ setSelectedIds([]); return; }
    setSelectedIds(prev => additive
      ? (prev.includes(id) ? prev.filter(x=>x!==id) : [...prev, id])
      : (prev.length===1 && prev[0]===id ? prev : [id]));
  }

  const viewFormat = doc.activeFormat==='master' ? doc.masterFormat : doc.activeFormat;
  const isOutput = doc.activeFormat!=='master';
  const activeLabel = AP_FMT[viewFormat].label;
  const docRef = React.useRef(doc); docRef.current = doc;
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

  /* ---- undo / redo ----
     Poster Studio never had this, which is a strange thing to say about a tool
     whose whole job is trying things. The shared history
     (../studio-shared/history.js, Print's and Schedule's too): every doc change
     starts a 350ms timer, and the timer is what commits a history entry — so
     dragging a slider across forty values is ONE undo, not forty. 80 deep. */
  const hist = useHistory(doc, { limit:80, coalesceMs:350, apply:(snap)=>{
    setDoc(snap);
    setSelectedIds(ids=>ids.filter(id=>snap.elements.some(e=>e.id===id)));
  } });
  const { undo, redo } = hist;
  /* A doc change that ISN'T an edit — export flipping the view through every
     format and back. hist.quiet() files it as the new baseline instead of an
     undo step. Every Save Images from Master used to leave five format flips
     in the undo stack, so the first Ctrl-Z after an export only changed which
     format you were looking at. (Only ever call it with an update that
     produces a NEW doc — a mark nobody consumes would swallow the next real
     edit.) */
  const setDocQuiet = (fn)=>{ hist.quiet(); setDoc(fn); };

  /* resolved elements for the current view.
     Each box KEEPS its object identity across renders while nothing in it has
     changed: the canvas's elements are memoised, and a fresh object for every
     box on every doc change made that memo worthless — drag one box and all
     twenty re-rendered, photos re-fingerprinting their press dials each frame.
     A shallow compare against the last list, by id; any changed prop (or a
     nested list that was replaced) hands over the new object. */
  const prevResolvedRef = React.useRef(new Map());
  const resolved = React.useMemo(()=>{
    const fresh = doc.activeFormat==='master'
      ? doc.elements.map(e=>Object.assign({}, e, {_overridden:false}))
      : apResolve(doc, doc.activeFormat);
    const prev = prevResolvedRef.current, next = new Map();
    const out = fresh.map(r=>{ const p = prev.get(r.id);
      const keep = (p && shallowSame(p, r)) ? p : r; next.set(r.id, keep); return keep; });
    prevResolvedRef.current = next;
    return out;
  }, [doc]);
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
    const c=Object.assign(JSON.parse(JSON.stringify(mEl)), {id:uid(), x:mEl.x+40, y:mEl.y+40});
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

  return { doc, setDoc, docRef, selectedIds, setSelectedIds, selectedId, select, sliceMode, setSliceMode, setFeedSlice,
    viewFormat, isOutput, activeLabel, hist, undo, redo, setDocQuiet, resolved, resolvedRef, sel, selRef, selIdsRef,
    overrideCount, updateEl, updateElRef, update, resetOverride, resetFormat, toggleHidden, del, dup, layer, clearAll };
}

export { useDoc };
