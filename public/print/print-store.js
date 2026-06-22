/* ============================================================
   REALITY PRINT STUDIO — image store (IndexedDB) + cache
   ------------------------------------------------------------
   Photo elements carry only a short `imgId`; the pixels live in
   IndexedDB (room for gigabytes), NOT in the doc. The doc is
   auto-saved to localStorage on every edit — baking 0.3–3 MB of
   base64 into it would blow the ~5 MB cap and silently fail to
   save. So: upload → downscale → store blob in IDB under a uid →
   element references the id. On load the photo element resolves
   its image lazily through the in-memory cache (decode once).

   Exposes:
     window.PrintStore — raw IDB: putImage/getImage/delImage/allIds
     window.PrintImg   — cache: add(dataURL,w,h)→id, load(id)→Image,
                          peek(id)→Image|null
   ============================================================ */
(function(){
  const DB_NAME='reality-print', DB_VER=1, STORE='images';
  let _db=null;

  function open(){
    if(_db) return Promise.resolve(_db);
    return new Promise((res,rej)=>{
      let rq; try{ rq=indexedDB.open(DB_NAME,DB_VER); }catch(e){ rej(e); return; }
      rq.onupgradeneeded=()=>{ const db=rq.result; if(!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE,{keyPath:'id'}); };
      rq.onsuccess=()=>{ _db=rq.result; res(_db); };
      rq.onerror  =()=>rej(rq.error);
      rq.onblocked=()=>rej(new Error('IndexedDB open blocked'));
    });
  }
  function store(mode){ return _db.transaction(STORE,mode).objectStore(STORE); }
  function txDone(t){ return new Promise((res,rej)=>{ t.oncomplete=()=>res(); t.onerror=()=>rej(t.error); t.onabort=()=>rej(t.error); }); }
  function reqVal(r){ return new Promise((res,rej)=>{ r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error); }); }

  async function putImage(rec){ await open(); const s=store('readwrite'); s.put(rec); return txDone(s.transaction); }
  async function getImage(id){ await open(); return reqVal(store('readonly').get(id)); }
  async function delImage(id){ await open(); const s=store('readwrite'); s.delete(id); return txDone(s.transaction); }
  async function allIds(){ await open(); return reqVal(store('readonly').getAllKeys()); }
  window.PrintStore={ open, putImage, getImage, delImage, allIds };

  /* ---- decoded-image cache: id → { data(dataURL), w, h, img } ---- */
  const _cache=new Map();
  let _seq=0;
  function uid(){ return 'img'+Date.now().toString(36)+'_'+(_seq++); }
  function decode(dataURL){ return new Promise((res,rej)=>{ const im=new Image(); im.onload=()=>res(im); im.onerror=rej; im.src=dataURL; }); }

  /* store a fresh data URL → returns its new id (and caches the decoded image) */
  async function add(dataURL, w, h){
    const id=uid();
    let img=null; try{ img=await decode(dataURL); }catch(e){}
    _cache.set(id,{ data:dataURL, w, h, img });
    try{ await window.PrintStore.putImage({ id, data:dataURL, w, h, ts:Date.now() }); }catch(e){ /* quota — stays in memory at least */ }
    return id;
  }
  /* resolve an id → decoded HTMLImageElement (cache → IDB → decode) */
  async function load(id){
    if(!id) return null;
    const c=_cache.get(id); if(c && c.img) return c.img;
    let rec=null; try{ rec=await window.PrintStore.getImage(id); }catch(e){}
    if(!rec || !rec.data) return null;
    let img=null; try{ img=await decode(rec.data); }catch(e){ return null; }
    _cache.set(id,{ data:rec.data, w:rec.w, h:rec.h, img });
    return img;
  }
  function peek(id){ const c=id&&_cache.get(id); return (c && c.img) ? c.img : null; }

  window.PrintImg={ add, load, peek, _cache };
})();
