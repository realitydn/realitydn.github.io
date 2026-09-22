/* ============================================================
   REALITY PRINT STUDIO — storage (IndexedDB) + image cache
   ------------------------------------------------------------
   Photo elements carry only a short `imgId`; the pixels live in
   IndexedDB (room for gigabytes), NOT in the doc. Baking 0.3–3 MB
   of base64 into the doc would blow a ~5 MB localStorage cap and
   silently fail to save. So: upload → downscale → store blob in
   IDB under a uid → element references the id. On load the photo
   element resolves its image lazily through the in-memory cache.

   v2 (23.09.26): the WORKING DOC and "My templates" live here too.
   They used to sit in localStorage — the same ~5 MB origin bucket
   Poster Studio and Schedule Studio fill — and a failed write was
   swallowed, so a full bucket meant edits quietly stopped saving.
   The first v2 load copies the old localStorage keys across, and
   only once both are safely written here removes them. If IDB is
   unavailable (private window, blocked by an old tab) the docs keep
   living in localStorage — and every failed write now RAISES, so
   the app can say "not saved" instead of pretending.

   Exports (ES module, in Print Studio's bundle):
     PrintStore — raw IDB: putImage/getImage/delImage/allIds,
                  kvGet/kvPut, gcImages(keepSet, minAgeMs)
     PrintImg   — cache: add(dataURL,w,h)→id, load(id)→Image,
                  peek(id)→Image|null, meta(id)→{w,h}|null,
                  unsaved()→[ids kept in memory only]
     PrintDocs  — load()→{doc,tpls,backend}, saveDoc(doc),
                  saveTpls(list) — each save a Promise that
                  REJECTS when the write didn't land
   Failures are also broadcast as a window 'printstore:error' event
   ({ detail:{ kind, message } }) so the chrome can show them.
   ============================================================ */
let PrintStore, PrintImg, PrintDocs;
(function(){
  const DB_NAME='reality-print', DB_VER=2, STORE='images', KV='kv';
  const LS_DOC='reality-print-doc-v1', LS_TPL='reality-print-templates-v1';
  let _db=null, _opening=null;

  function open(){
    if(_db) return Promise.resolve(_db);
    if(_opening) return _opening;
    _opening = new Promise((res,rej)=>{
      let rq; try{ rq=indexedDB.open(DB_NAME,DB_VER); }catch(e){ rej(e); return; }
      rq.onupgradeneeded=()=>{ const db=rq.result;
        if(!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE,{keyPath:'id'});
        if(!db.objectStoreNames.contains(KV))    db.createObjectStore(KV); };
      rq.onsuccess=()=>{ _db=rq.result;
        /* a newer tab wants to upgrade — step aside rather than block it */
        _db.onversionchange=()=>{ try{ _db.close(); }catch(e){} _db=null; };
        res(_db); };
      rq.onerror  =()=>rej(rq.error);
      /* an older tab still holds v1 open — the upgrade waits on it */
      rq.onblocked=()=>rej(new Error('IndexedDB upgrade blocked — close other Print Studio tabs'));
    });
    _opening.catch(()=>{}).then(()=>{ _opening=null; });
    return _opening;
  }
  function store(name, mode){ return _db.transaction(name,mode).objectStore(name); }
  function txDone(t){ return new Promise((res,rej)=>{ t.oncomplete=()=>res(); t.onerror=()=>rej(t.error); t.onabort=()=>rej(t.error||new Error('transaction aborted')); }); }
  function reqVal(r){ return new Promise((res,rej)=>{ r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error); }); }

  async function putImage(rec){ await open(); const s=store(STORE,'readwrite'); s.put(rec); return txDone(s.transaction); }
  async function getImage(id){ await open(); return reqVal(store(STORE,'readonly').get(id)); }
  async function delImage(id){ await open(); const s=store(STORE,'readwrite'); s.delete(id); return txDone(s.transaction); }
  async function allIds(){ await open(); return reqVal(store(STORE,'readonly').getAllKeys()); }
  async function kvGet(key){ await open(); return reqVal(store(KV,'readonly').get(key)); }
  async function kvPut(key, val){ await open(); const s=store(KV,'readwrite'); s.put(val, key); return txDone(s.transaction); }

  /* Orphan sweep. Nothing ever called delImage, so every photo ever uploaded
     stayed in IDB forever. Deletes records NOT in `keep` — and, to stay
     conservative, only ones older than minAgeMs (a photo placed a minute ago
     in another tab, or deleted and still undoable, survives). The app only
     calls this after the doc AND the templates both loaded cleanly. */
  async function gcImages(keep, minAgeMs){
    await open();
    return new Promise((res,rej)=>{
      const t=_db.transaction(STORE,'readwrite'), s=t.objectStore(STORE), now=Date.now(); let n=0;
      const rq=s.openCursor();
      rq.onsuccess=()=>{ const c=rq.result; if(!c) return;
        const v=c.value, young = v && v.ts && (now-v.ts) < (minAgeMs||0);
        if(!keep.has(c.key) && !young){ c.delete(); n++; }
        c.continue(); };
      t.oncomplete=()=>res(n); t.onerror=()=>rej(t.error); t.onabort=()=>rej(t.error);
    });
  }
  PrintStore={ open, putImage, getImage, delImage, allIds, kvGet, kvPut, gcImages };

  function report(kind, message){
    try{ window.dispatchEvent(new CustomEvent('printstore:error', { detail:{ kind, message } })); }catch(e){}
  }

  /* ---- decoded-image cache: id → { data(dataURL), w, h, img, unsaved } ---- */
  const _cache=new Map();
  let _seq=0;
  function uid(){ return 'img'+Date.now().toString(36)+'_'+(_seq++); }
  function decode(dataURL){ return new Promise((res,rej)=>{ const im=new Image(); im.onload=()=>res(im); im.onerror=rej; im.src=dataURL; }); }

  /* store a fresh data URL → returns its new id (and caches the decoded image).
     A failed write still returns the id — the photo works for this session —
     but it is flagged `unsaved` and REPORTED: it will be gone after a reload,
     and the user needs to know that now, not when the PDF comes out blank. */
  async function add(dataURL, w, h){
    const id=uid();
    let img=null; try{ img=await decode(dataURL); }catch(e){}
    const entry={ data:dataURL, w, h, img, unsaved:false };
    _cache.set(id, entry);
    try{ await PrintStore.putImage({ id, data:dataURL, w, h, ts:Date.now() }); }
    catch(e){ entry.unsaved=true; report('image', 'Image not saved to storage ('+((e&&e.message)||'quota')+') — it will vanish on reload.'); }
    return id;
  }
  /* resolve an id → decoded HTMLImageElement (cache → IDB → decode) */
  async function load(id){
    if(!id) return null;
    const c=_cache.get(id); if(c && c.img) return c.img;
    let rec=null; try{ rec=await PrintStore.getImage(id); }catch(e){}
    if(!rec || !rec.data) return null;
    let img=null; try{ img=await decode(rec.data); }catch(e){ return null; }
    _cache.set(id,{ data:rec.data, w:rec.w, h:rec.h, img, unsaved:false });
    return img;
  }
  function peek(id){ const c=id&&_cache.get(id); return (c && c.img) ? c.img : null; }
  /* natural size of a stored image, or null when it is not in storage (or the
     cache) at all — the preflight's dpi and "missing" checks. */
  async function meta(id){
    if(!id) return null;
    const c=_cache.get(id); if(c && c.w && c.h) return { w:c.w, h:c.h };
    let rec=null; try{ rec=await PrintStore.getImage(id); }catch(e){}
    if(!rec || !rec.data) return null;
    let w=rec.w, h=rec.h;
    if(!(w&&h)){ const im=await load(id); if(!im) return null; w=im.naturalWidth; h=im.naturalHeight; }
    return { w, h };
  }
  function unsaved(){ const out=[]; _cache.forEach((v,k)=>{ if(v.unsaved) out.push(k); }); return out; }

  PrintImg={ add, load, peek, meta, unsaved, _cache };

  /* ---- the working doc + "My templates" ---- */
  let _backend=null;   // 'idb' | 'ls'
  function parse(s){ try{ return s ? JSON.parse(s) : null; }catch(e){ return null; } }
  async function loadDocs(){
    let lsDoc=null, lsTpl=null;
    try{ lsDoc=localStorage.getItem(LS_DOC); lsTpl=localStorage.getItem(LS_TPL); }catch(e){}
    try{
      await open();
      let doc=await kvGet('doc'), tpls=await kvGet('templates'), migrated=false;
      if(doc==null && lsDoc){ const d=parse(lsDoc); if(d){ await kvPut('doc', d); doc=d; migrated=true; } }
      if(tpls==null && lsTpl){ const t=parse(lsTpl); if(Array.isArray(t)){ await kvPut('templates', t); tpls=t; migrated=true; } }
      /* both are in IDB now (or were already) — retire the localStorage copies
         so they stop eating the bucket Poster and Schedule share. */
      if(lsDoc!=null && doc!=null){ try{ localStorage.removeItem(LS_DOC); }catch(e){} }
      if(lsTpl!=null && tpls!=null){ try{ localStorage.removeItem(LS_TPL); }catch(e){} }
      _backend='idb';
      return { doc, tpls, backend:'idb', migrated };
    }catch(e){
      _backend='ls';
      report('backend', 'IndexedDB unavailable ('+((e&&e.message)||e)+') — saving to browser localStorage instead.');
      return { doc:parse(lsDoc), tpls:parse(lsTpl), backend:'ls', error:e };
    }
  }
  function lsPut(key, val){ localStorage.setItem(key, JSON.stringify(val)); }   // throws on quota — on purpose
  /* One write in flight per key, the newest value queued behind it: a drag
     fires a doc change per frame, and this lands the LAST one without a
     transaction per pixel. Each caller's promise settles with the write that
     carried its value (or a newer one). */
  function writer(key, lsKey){
    let busy=false, has=false, next, waiters=[];
    async function pump(){
      busy=true;
      while(has){
        const v=next, ws=waiters; has=false; waiters=[];
        try{ if(_backend==='ls') lsPut(lsKey, v); else await kvPut(key, v); ws.forEach(w=>w.res()); }
        catch(e){ ws.forEach(w=>w.rej(e)); }
      }
      busy=false;
    }
    return (v)=> new Promise((res,rej)=>{ next=v; has=true; waiters.push({res,rej}); if(!busy) pump(); });
  }
  PrintDocs={ load:loadDocs, saveDoc:writer('doc', LS_DOC), saveTpls:writer('templates', LS_TPL),
              backend:()=>_backend };
})();

export { PrintStore, PrintImg, PrintDocs };
