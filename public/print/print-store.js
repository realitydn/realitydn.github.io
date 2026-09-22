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

   The IndexedDB plumbing (open, transactions, the queued writer) is
   ../studio-shared/store.js, shared with Poster and Schedule. This
   file is Print's schema and what it keeps there; the database, its
   stores, keys and records are unchanged.
   ============================================================ */
import { openDB, makeWriter } from '../studio-shared/store.js';

let PrintStore, PrintImg, PrintDocs;
(function(){
  const DB_NAME='reality-print', DB_VER=2, STORE='images', KV='kv';
  const LS_DOC='reality-print-doc-v1', LS_TPL='reality-print-templates-v1';
  const db = openDB({
    name: DB_NAME, version: DB_VER, errorEvent: 'printstore:error',
    /* an older tab still holds v1 open — the upgrade waits on it */
    blockedMessage: 'IndexedDB upgrade blocked — close other Print Studio tabs',
    upgrade(d){
      if(!d.objectStoreNames.contains(STORE)) d.createObjectStore(STORE,{keyPath:'id'});
      if(!d.objectStoreNames.contains(KV))    d.createObjectStore(KV);
    },
  });
  const open = db.open;

  function putImage(rec){ return db.put(STORE, rec); }
  function getImage(id){ return db.get(STORE, id); }
  function delImage(id){ return db.delete(STORE, id); }
  function allIds(){ return db.getAllKeys(STORE); }
  function kvGet(key){ return db.get(KV, key); }
  function kvPut(key, val){ return db.put(KV, val, key); }

  /* Orphan sweep. Nothing ever called delImage, so every photo ever uploaded
     stayed in IDB forever. Deletes records NOT in `keep` — and, to stay
     conservative, only ones older than minAgeMs (a photo placed a minute ago
     in another tab, or deleted and still undoable, survives). The app only
     calls this after the doc AND the templates both loaded cleanly. */
  async function gcImages(keep, minAgeMs){
    const swept = await db.tx(STORE, 'readwrite', s=>{
      const now=Date.now(), out={ n:0 };
      const rq=s.openCursor();
      rq.onsuccess=()=>{ const c=rq.result; if(!c) return;
        const v=c.value, young = v && v.ts && (now-v.ts) < (minAgeMs||0);
        if(!keep.has(c.key) && !young){ c.delete(); out.n++; }
        c.continue(); };
      return out;   // read once the transaction has committed
    });
    return swept.n;
  }
  PrintStore={ open, putImage, getImage, delImage, allIds, kvGet, kvPut, gcImages };

  const report = db.report;

  /* ---- decoded-image cache: id → { data(dataURL), w, h, img, unsaved } ---- */
  const _cache=new Map();
  let _seq=0;
  function newImgId(){ return 'img'+Date.now().toString(36)+'_'+(_seq++); }
  function decode(dataURL){ return new Promise((res,rej)=>{ const im=new Image(); im.onload=()=>res(im); im.onerror=rej; im.src=dataURL; }); }

  /* store a fresh data URL → returns its new id (and caches the decoded image).
     A failed write still returns the id — the photo works for this session —
     but it is flagged `unsaved` and REPORTED: it will be gone after a reload,
     and the user needs to know that now, not when the PDF comes out blank. */
  async function add(dataURL, w, h){
    const id=newImgId();
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
  /* One write in flight per key, the newest value queued behind it (store.js
     makeWriter): a drag fires a doc change per frame, and this lands the LAST
     one without a transaction per pixel. */
  function writer(key, lsKey){
    return makeWriter(async (v)=>{ if(_backend==='ls') lsPut(lsKey, v); else await kvPut(key, v); });
  }
  PrintDocs={ load:loadDocs, saveDoc:writer('doc', LS_DOC), saveTpls:writer('templates', LS_TPL),
              backend:()=>_backend };
})();

export { PrintStore, PrintImg, PrintDocs };
