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

  /* ---- WP9 best-effort cloud mirror (window.RCloud) -------------------------
     IndexedDB stays the source of truth. After a successful LOCAL write we
     fire-and-forget a mirror to the hub: each template is its own doc
     doc_id='tpl:'+id, studio='poster'. Every call is wrapped so it can NEVER
     throw into the caller — if RCloud is absent, not signed in, or the hub is
     dormant, these silently no-op. TODO(WP9): photos are stored inline as data
     URLs (content-addressing is out of scope) — large photo-heavy templates may
     hit the hub's ~5MB doc cap (413) and simply stay local; that's acceptable.
     ------------------------------------------------------------------------ */
  function _rc(){ return (typeof window!=='undefined' && window.RCloud) ? window.RCloud : null; }
  function cloudPutTpl(t){
    try{
      const rc = _rc();
      if(!rc || !rc.isSignedIn() || !t || !t.id) return;
      Promise.resolve(rc.putDoc('poster', 'tpl:'+t.id, t.name||'', t, t.savedAt||Date.now()))
        .catch(()=>{});
    }catch(e){}
  }
  function cloudDelTpl(id){
    try{
      const rc = _rc();
      if(!rc || !rc.isSignedIn() || !id) return;
      if(typeof rc.delDoc==='function') Promise.resolve(rc.delDoc('poster','tpl:'+id)).catch(()=>{});
    }catch(e){}
  }
  function cloudPutMany(arr){ (arr||[]).forEach(cloudPutTpl); }

  /* Pull cloud templates and upsert any the local store is missing (by id).
     Returns the merged, locally-stored list (or the local list unchanged on any
     failure). Best-effort: never throws, returns local-only when RCloud is
     absent / signed-out / dormant.

     TWO STEPS, deliberately. The hub's list is metadata only — a template embeds
     its photos as data URLs (~2.5 MB each), so asking for a whole library's
     bodies in one response killed the query on the hub side and this returned
     local-only forever: sign in on a second computer, see an empty library. So:
     list (cheap), then fetch ONLY the ids this browser is missing, one at a time,
     newest first, writing each one down as it lands. A failure part-way through
     keeps everything already fetched, and the next pull picks up the rest.
     `onProgress(done, total)` is optional. */
  async function cloudPull(onProgress){
    let local = [];
    try{ local = await tplGetAll(); }catch(e){ local = []; }
    try{
      const rc = _rc();
      if(!rc || !rc.isSignedIn() || typeof rc.listDocs!=='function') return local;
      const docs = await rc.listDocs('poster');
      if(!Array.isArray(docs) || !docs.length) return local;
      const haveIds = {}; local.forEach(t=>{ if(t&&t.id) haveIds[t.id]=1; });
      const wanted = [];
      docs.forEach(d=>{
        try{
          const docId = d && (d.doc_id || d.docId);
          if(!docId || docId.indexOf('tpl:')!==0) return;
          const id = docId.slice(4);
          if(haveIds[id]) return;
          wanted.push({ id: id, docId: docId, meta: d });
        }catch(e3){}
      });
      if(!wanted.length) return local;
      let done = 0, fetched = 0;
      for(let i=0;i<wanted.length;i++){
        const w = wanted[i];
        try{
          // The list carries no body — one doc per request is the only way up.
          const full = await rc.getDoc('poster', w.docId);
          const tpl = _tplFromDoc(full || w.meta, w.id);
          if(tpl){ await tplBulkPut([tpl]); fetched++; }
        }catch(e4){ /* skip this one; the rest still come down */ }
        done++;
        if(typeof onProgress==='function'){ try{ onProgress(done, wanted.length); }catch(e5){} }
      }
      if(fetched) return await tplGetAll();
    }catch(e){ /* any failure → local-only */ }
    return local;
  }

  /* A hub doc → a template record, or null if it isn't one we can use. The hub
     returns snake_case (`updated_at`) and `json` as a string. */
  function _tplFromDoc(d, id){
    try{
      if(!d) return null;
      let tpl = d.json;
      if(typeof tpl==='string'){ try{ tpl = JSON.parse(tpl); }catch(e){ return null; } }
      if(!tpl || !tpl.doc || !Array.isArray(tpl.doc.elements)) return null;
      if(!tpl.id) tpl.id = id;
      if(!tpl.savedAt){
        const u = d.updated_at != null ? d.updated_at : d.updatedAt;
        tpl.savedAt = typeof u==='number' ? u : (Date.parse(u||'')||Date.now());
      }
      return tpl;
    }catch(e){ return null; }
  }

  /* Push local templates UP to the account (best-effort upsert) — the inverse of
     cloudPull. Used on sign-in / load so a browser's existing library migrates
     into the account, not only templates saved after signing in.

     It pushes only what the account is MISSING or holds an older copy of. This
     runs on every load, and a full library is ~86 MB of inline photo data: sending
     all of it every time cost real bandwidth on a Vietnamese connection and wrote
     the same rows over and over. The cheap metadata list makes the comparison
     free. If that list can't be had, fall back to pushing everything — that's the
     old behaviour, and it's better than a template that never reaches the cloud. */
  async function cloudPushAll(){
    try{
      const rc = _rc();
      if(!rc || !rc.isSignedIn()) return;
      let local = []; try{ local = await tplGetAll(); }catch(e){ local = []; }
      if(!local.length) return;
      let remoteAt = null;
      try{
        if(typeof rc.listDocs==='function'){
          const docs = await rc.listDocs('poster');
          if(Array.isArray(docs)){
            remoteAt = {};
            docs.forEach(d=>{
              const docId = d && (d.doc_id || d.docId);
              if(!docId || docId.indexOf('tpl:')!==0) return;
              const u = d.updated_at != null ? d.updated_at : d.updatedAt;
              remoteAt[docId.slice(4)] = typeof u==='number' ? u : (Date.parse(u||'')||0);
            });
          }
        }
      }catch(e){ remoteAt = null; }
      local.forEach(t=>{
        if(!t || !t.id) return;
        if(remoteAt){
          const have = remoteAt[t.id];
          // putDoc stamps max(client, now) server-side, so a doc that round-tripped
          // reads back NEWER than its savedAt — only push when we're clearly ahead.
          if(have != null && have >= (t.savedAt||0)) return;
        }
        cloudPutTpl(t);
      });
    }catch(e){}
  }

  async function tplGetAll(){ await open(); return reqVal(store(T_STORE, 'readonly').getAll()); }

  async function tplPut(t){ await open(); const s = store(T_STORE, 'readwrite'); s.put(t); await txDone(s.transaction); cloudPutTpl(t); }

  async function tplDelete(id){ await open(); const s = store(T_STORE, 'readwrite'); s.delete(id); await txDone(s.transaction);
    try{ await thumbDelete(id); }catch(e){}   // the card's cached picture goes with the record
    cloudDelTpl(id); }

  /* Upsert many in one transaction without clearing — used by migrate() so a
     re-run can never drop records added after the first migration. */
  async function tplBulkPut(arr){
    await open();
    const s = store(T_STORE, 'readwrite');
    (arr||[]).forEach(t=>s.put(t));
    return txDone(s.transaction);
  }

  /* Fold `incoming` into the library and remove exactly the ids in `dropIds`,
     in one transaction. Nothing else is touched.

     This replaces tplReplaceAll, which Import used to call: that CLEARED the
     store and wrote back whatever list it was handed. The list came from the
     on-screen library, and the on-screen library could be short — it stayed
     empty for the whole of a cloud restore, and any sync could leave it behind.
     So an import run at the wrong moment permanently deleted every template
     that wasn't on screen at that instant, with no dialog and no way back. A
     clear() has no business anywhere near this store; there is no longer one.

     Dropped ids are NOT deleted from the hub. The caller stashes them in the
     bin first, so a bad import stays recoverable from two places rather than
     none. */
  async function tplApply(incoming, dropIds){
    await open();
    const s = store(T_STORE, 'readwrite');
    (dropIds||[]).forEach(id=>{ if(id) s.delete(id); });
    (incoming||[]).forEach(t=>{ if(t && t.id) s.put(t); });
    await txDone(s.transaction);
    cloudPutMany(incoming);   // best-effort mirror of the imported set
  }

  /* ---- recently deleted ----------------------------------------------------
     Every way a saved poster can leave the library — Delete, saving over it,
     being displaced by an import — puts a copy in here first, capped and oldest
     out. A template is a couple of hours of work and until now every one of
     those routes was final. Same meta-store trick as the thumbnails: a 'bin:'
     key, no schema change, local only. */
  const BIN_PREFIX = 'bin:', BIN_CAP = 10;
  function binRange(){ return IDBKeyRange.bound(BIN_PREFIX, BIN_PREFIX + '\uffff'); }
  async function binRows(){ await open(); return reqVal(store(M_STORE, 'readonly').getAll(binRange())); }
  async function binPut(t, reason){
    if(!t || !t.id) return;
    await metaPut(BIN_PREFIX + t.id, { at: Date.now(), reason: reason || 'removed', tpl: t });
    try{
      const rows = await binRows();
      if(rows.length > BIN_CAP){
        rows.sort((a,b)=>((a.v&&a.v.at)||0)-((b.v&&b.v.at)||0));
        const s = store(M_STORE, 'readwrite');
        rows.slice(0, rows.length - BIN_CAP).forEach(r=>s.delete(r.k));
        await txDone(s.transaction);
      }
    }catch(e){ /* an over-full bin is not worth failing a delete over */ }
  }
  async function binGetAll(){
    const rows = await binRows();
    return (rows||[]).filter(r=>r && r.v && r.v.tpl)
      .map(r=>({ id: r.k.slice(BIN_PREFIX.length), at: r.v.at||0, reason: r.v.reason||'removed', tpl: r.v.tpl }))
      .sort((a,b)=>b.at-a.at);
  }
  async function binDelete(id){
    if(!id) return;
    await open();
    const s = store(M_STORE, 'readwrite'); s.delete(BIN_PREFIX + id);
    return txDone(s.transaction);
  }

  /* ---- restore from the account, on demand ---------------------------------
     cloudPull does this quietly on load and gives up silently on any failure;
     this is the button you press when something is missing, and it reports what
     it actually found so "the hub hasn't got it either" is an answer you can
     see rather than infer. Throws on a hub error — the caller says so. */
  async function cloudRestore(onProgress){
    const report = { signedIn:false, hub:0, missing:0, restored:0, failed:0 };
    const rc = _rc();
    if(!rc || !rc.isSignedIn() || typeof rc.listDocs!=='function') return report;
    report.signedIn = true;
    let local = []; try{ local = await tplGetAll(); }catch(e){}
    const have = {}; local.forEach(t=>{ if(t && t.id) have[t.id]=1; });
    const docs = await rc.listDocs('poster');
    const wanted = [];
    (docs||[]).forEach(d=>{
      const docId = d && (d.doc_id || d.docId);
      if(!docId || docId.indexOf('tpl:')!==0) return;
      report.hub++;
      const id = docId.slice(4);
      if(!have[id]) wanted.push({ id: id, docId: docId, meta: d });
    });
    report.missing = wanted.length;
    for(let i=0;i<wanted.length;i++){
      const w = wanted[i];
      try{
        const full = await rc.getDoc('poster', w.docId);
        const tpl = _tplFromDoc(full || w.meta, w.id);
        if(tpl){ await tplBulkPut([tpl]); report.restored++; }
        else report.failed++;
      }catch(e){ report.failed++; }
      if(typeof onProgress==='function'){ try{ onProgress(i+1, wanted.length); }catch(e){} }
    }
    return report;
  }

  /* ---- library thumbnails (derived, local-only) ----------------------------
     A card in "My templates" used to be a LIVE render of the poster: opening a
     day re-developed every photo in it through the riso press just to fill an
     88px tile. A card is captured once now — a small JPEG — and read back from
     here on every later open.

     Thumbnails are DERIVED data, so they sit apart from the template record:
     • They ride the `meta` store behind a 'thumb:' key rather than a store of
       their own, so this needs no DB_VER bump — and therefore no upgrade that
       a second open tab could block (see open()'s onblocked).
     • They are LOCAL ONLY, never mirrored to the hub. A thumbnail is ~10 KB and
       regenerates itself on any machine that hasn't got one, whereas attaching
       it to the record would mean re-uploading that template's whole ~2.5 MB
       body (photos and all) every time a card first drew.
     -------------------------------------------------------------------------- */
  const TH_PREFIX = 'thumb:';
  function thumbRange(){ return IDBKeyRange.bound(TH_PREFIX, TH_PREFIX + '\uffff'); }
  async function thumbRows(mode){ await open(); return reqVal(store(M_STORE, mode||'readonly').getAll(thumbRange())); }

  /* { [templateId]: {src,w,h} } for the whole library — one read on load. */
  async function thumbGetAll(){
    const rows = await thumbRows();
    const out = {};
    (rows||[]).forEach(r=>{ if(r && r.k && r.v) out[r.k.slice(TH_PREFIX.length)] = r.v; });
    return out;
  }
  async function thumbPut(id, thumb){ if(!id || !thumb) return; return metaPut(TH_PREFIX + id, thumb); }
  async function thumbDelete(id){
    if(!id) return;
    await open();
    const s = store(M_STORE, 'readwrite'); s.delete(TH_PREFIX + id);
    return txDone(s.transaction);
  }
  /* Keep only the ids the library still holds. Import can put DIFFERENT artwork
     under an id that already has a thumbnail, and a card that goes on showing
     the poster it replaced is worse than no card picture at all. */
  async function thumbPrune(keepIds){
    const keep = {}; (keepIds||[]).forEach(id=>{ if(id) keep[id]=1; });
    const rows = await thumbRows();
    const drop = (rows||[]).map(r=>r && r.k).filter(k=>k && !keep[k.slice(TH_PREFIX.length)]);
    if(!drop.length) return;
    const s = store(M_STORE, 'readwrite');
    drop.forEach(k=>s.delete(k));
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

  window.RStore = { open, tplGetAll, tplPut, tplDelete, tplBulkPut, tplApply,
                    binPut, binGetAll, binDelete,
                    thumbGetAll, thumbPut, thumbDelete, thumbPrune,
                    metaGet, metaPut, migrate, cloudPull, cloudPushAll, cloudRestore, LS_TPL_KEY };
})();
