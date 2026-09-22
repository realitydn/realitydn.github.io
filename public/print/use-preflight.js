/* ============================================================
   REALITY PRINT STUDIO — usePreflight: the live check
   ------------------------------------------------------------
   Feeds print-preflight.js what only the app can know — each
   photo's stored size (null = gone from storage), the embedded
   fonts' glyph coverage, photos the store couldn't keep — and
   recomputes the list on every edit. Also the "art past trim"
   count the Trim button warns with, and picking an issue's parts.
   (Split out of print-app.jsx, Phase 3.)
   ============================================================ */
import { PrintImg } from './print-store.js';
import { artPastTrim as apPastTrim, preflight as preflight_ } from './print-preflight.js';
import { PrintExport } from './print-imposition.js';

function usePreflight({ doc, dims, storeErr, setSelectedIds }){
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
  const items = React.useMemo(()=>{
    const items = preflight_(doc, dims, { images:imgMeta, hasGlyph:glyphFn });
    /* photos the store could not keep — fine now, gone after a reload */
    const unsaved = PrintImg && PrintImg.unsaved ? PrintImg.unsaved() : [];
    doc.elements.forEach(e=>{ if(e.type==='image' && e.imgId && unsaved.indexOf(e.imgId)>=0)
      items.push({ level:'err', kind:'img', ids:[e.id], text:'Image is in memory only — storage refused it, so it vanishes on reload. Export now, or free space and re-upload.' }); });
    return items;
  }, [doc, imgMeta, glyphFn, storeErr]);
  const pastTrim = React.useMemo(()=>apPastTrim(doc.elements, dims).length, [doc.elements, dims.wpt, dims.hpt]);
  const pickIssue = (it)=>{ if(it.ids && it.ids.length) setSelectedIds(it.ids.filter(id=>doc.elements.some(e=>e.id===id))); };

  return { items, pastTrim, pickIssue };
}

export { usePreflight };
