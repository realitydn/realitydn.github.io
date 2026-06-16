/* ============================================================
   REALITY POSTER STUDIO — saved-template store (IndexedDB)
   ------------------------------------------------------------
   The "My templates" library outgrew localStorage's ~5MB cap:
   each template embeds its photos as base64 data URLs, so a
   couple dozen photo-heavy posters fill the box. This moves the
   library into IndexedDB, which is good for gigabytes.

   Design notes:
   • Phase 1 keeps templates in the SAME shape as before — a doc
     whose elements carry inline data-URL `src`. This is a near
     verbatim copy into a bigger box: lowest possible risk to an
     existing library. (Phase 2, later, content-addresses the
     photos so they're stored once and the records shrink — the
     shape that maps onto a Cloudflare R2/KV sync.)
   • migrate(): on first run, copies the old localStorage list
     (key 'reality-studio-templates-v1') in and NEVER deletes it
     — that copy stays as an untouched backup. A one-time flag
     means it copies once (so templates you later delete can't
     come back) and it's idempotent if interrupted.
   • The {getAll,put,delete,replaceAll} surface is deliberately
     the shape a future cloud sync would expose, so the cloud
     step bolts on without rewriting callers.
   ============================================================ */
(function(){
  const DB_NAME = 'reality-studio', DB_VER = 1;
  const T_STORE = 'templates';     // keyPath 'id' — one record per saved template
  const M_STORE = 'meta';          // keyPath 'k'  — { k, v } flags (migration, etc.)
  const LS_TPL_KEY = 'reality-studio-templates-v1';   // the legacy localStorage library
  let _db = null;

  function open(){
    if(_db) return Promise.resolve(_db);
    return new Promise((res, rej)=>{
      let rq;
      try{ rq = indexedDB.open(DB_NAME, DB_VER); }
      catch(e){ rej(e); return; }
      rq.onupgradeneeded = ()=>{
        const db = rq.result;
        if(!db.objectStoreNames.contains(T_STORE)) db.createObjectStore(T_STORE, { keyPath:'id' });
        if(!db.objectStoreNames.contains(M_STORE)) db.createObjectStore(M_STORE, { keyPath:'k' });
      };
      rq.onsuccess = ()=>{ _db = rq.result; res(_db); };
      rq.onerror   = ()=>rej(rq.error);
      rq.onblocked = ()=>rej(new Error('IndexedDB open blocked'));
    });
  }

  /* small promise wrappers */
  function store(name, mode){ return _db.transaction(name, mode).objectStore(name); }
  function txDone(t){ return new Promise((res, rej)=>{ t.oncomplete=()=>res(); t.onerror=()=>rej(t.error); t.onabort=()=>rej(t.error); }); }
  function reqVal(r){ return new Promise((res, rej)=>{ r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error); }); }

  async function tplGetAll(){ await open(); return reqVal(store(T_STORE, 'readonly').getAll()); }

  async function tplPut(t){ await open(); const s = store(T_STORE, 'readwrite'); s.put(t); return txDone(s.transaction); }

  async function tplDelete(id){ await open(); const s = store(T_STORE, 'readwrite'); s.delete(id); return txDone(s.transaction); }

  /* Upsert many in one transaction without clearing — used by migrate() so a
     re-run can never drop records added after the first migration. */
  async function tplBulkPut(arr){
    await open();
    const s = store(T_STORE, 'readwrite');
    (arr||[]).forEach(t=>s.put(t));
    return txDone(s.transaction);
  }

  /* Make the store exactly equal `arr`, atomically — clear + put all ride one
     transaction, so any failure rolls the whole thing back (nothing is half
     written). Used by Import. */
  async function tplReplaceAll(arr){
    await open();
    const s = store(T_STORE, 'readwrite');
    s.clear();
    (arr||[]).forEach(t=>s.put(t));
    return txDone(s.transaction);
  }

  async function metaGet(k){ await open(); const v = await reqVal(store(M_STORE, 'readonly').get(k)); return v ? v.v : undefined; }
  async function metaPut(k, v){ await open(); const s = store(M_STORE, 'readwrite'); s.put({ k, v }); return txDone(s.transaction); }

  /* One-time copy of the legacy localStorage library into IndexedDB.
     • Keeps the localStorage entry intact (an untouched backup).
     • Guarded by the 'migrated_v1' flag: runs the copy once, ever — so a
       template you delete after migrating can't be resurrected on reload.
     • Uses bulkPut (upsert by id), so an interrupted run that re-fires can't
       duplicate or clobber anything.
     Returns { migrated:n } on the run that copies, else { already:true }. */
  async function migrate(){
    await open();
    if(await metaGet('migrated_v1')) return { already:true };
    let arr = [];
    try{ const r = localStorage.getItem(LS_TPL_KEY); if(r){ const a = JSON.parse(r); if(Array.isArray(a)) arr = a; } }catch(e){}
    if(arr.length) await tplBulkPut(arr);
    await metaPut('migrated_v1', true);   // legacy localStorage copy is left in place as a backup
    return { migrated: arr.length };
  }

  window.RStore = { open, tplGetAll, tplPut, tplDelete, tplBulkPut, tplReplaceAll, metaGet, metaPut, migrate, LS_TPL_KEY };
})();
