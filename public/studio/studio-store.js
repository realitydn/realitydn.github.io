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
     (key 'reality-studio-templates-v1') in and never deletes it
     itself (retireLegacyTpls, later, files that backup verbatim in
     IndexedDB and only then frees the localStorage copy). A one-time flag
     means it copies once (so templates you later delete can't
     come back) and it's idempotent if interrupted.
   • The {getAll,put,delete,replaceAll} surface is deliberately
     the shape a future cloud sync would expose, so the cloud
     step bolts on without rewriting callers.
   • The IndexedDB plumbing (open, transactions, requests) is
     ../studio-shared/store.js, shared with Print and Schedule.
     This file is the Poster's schema and what it keeps there;
     the database, its stores, keys and records are unchanged.
   ============================================================ */
import { openDB } from '../studio-shared/store.js';

(function(){
  const DB_NAME = 'reality-studio', DB_VER = 1;
  const T_STORE = 'templates';     // keyPath 'id' — one record per saved template
  const M_STORE = 'meta';          // keyPath 'k'  — { k, v } flags (migration, etc.)
  const LS_TPL_KEY = 'reality-studio-templates-v1';   // the legacy localStorage library
  const db = openDB({
    name: DB_NAME, version: DB_VER, blockedMessage: 'IndexedDB open blocked',
    upgrade(d){
      if(!d.objectStoreNames.contains(T_STORE)) d.createObjectStore(T_STORE, { keyPath:'id' });
      if(!d.objectStoreNames.contains(M_STORE)) d.createObjectStore(M_STORE, { keyPath:'k' });
    },
  });
  const open = db.open;

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

  /* ---- the cloud copy keeps the OLD photo size ------------------------------
     Photos used to be cut to 860px on the long edge as they came in, because
     the working doc lived in localStorage and every byte counted. The working
     doc lives in IndexedDB now, so they come in at 2000px — what Print Studio
     keeps, and enough for a 2160px export without a soft upscale.
     The hub didn't get any bigger, though: a doc over its ~5MB cap is refused
     (413), and a template is pushed whole, every photo inline. So everything
     that leaves this browser is re-cut to the 860px it always was — the cloud
     payload is exactly what it was before the change, and the full-size photo
     stays on this disk. A template restored from the hub onto another machine
     comes back at 860px, same as it always did.
     Cached by source, so a working doc pushed every few seconds re-encodes each
     photo once, not once per push. */
  const SLIM_EDGE = 860, SLIM_MIN_LEN = 300000;   // below ~220KB of image it isn't worth a decode
  const _slim = new Map();
  function slimSrc(src){
    if(typeof src!=='string' || src.indexOf('data:image/')!==0 || src.length < SLIM_MIN_LEN) return Promise.resolve(src);
    if(_slim.has(src)) return _slim.get(src);
    const p = new Promise(res=>{
      try{
        const im = new Image();
        im.onload = ()=>{
          try{
            const long = Math.max(im.width, im.height);
            if(!long || long <= SLIM_EDGE){ res(src); return; }
            const sc = SLIM_EDGE/long, c = document.createElement('canvas');
            c.width = Math.round(im.width*sc); c.height = Math.round(im.height*sc);
            c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
            res(src.indexOf('data:image/png')===0 ? c.toDataURL('image/png') : c.toDataURL('image/jpeg', 0.82));
          }catch(e){ res(src); }
        };
        im.onerror = ()=>res(src);
        im.src = src;
      }catch(e){ res(src); }
    });
    _slim.set(src, p);
    if(_slim.size > 32) _slim.delete(_slim.keys().next().value);
    return p;
  }
  /* A doc with every inline photo re-cut for the hub. Never throws; anything it
     can't shrink goes up as it is, which is what happened before. */
  async function slimDocForCloud(doc){
    try{
      if(!doc || !Array.isArray(doc.elements)) return doc;
      const els = await Promise.all(doc.elements.map(async el=>{
        if(!el || (!el.src && !el.src2)) return el;
        const patch = {};
        if(el.src){ const s = await slimSrc(el.src); if(s!==el.src) patch.src = s; }
        if(el.src2){ const s = await slimSrc(el.src2); if(s!==el.src2) patch.src2 = s; }
        return Object.keys(patch).length ? Object.assign({}, el, patch) : el;
      }));
      return Object.assign({}, doc, { elements: els });
    }catch(e){ return doc; }
  }

  function cloudPutTpl(t){
    try{
      const rc = _rc();
      if(!rc || !rc.isSignedIn() || !t || !t.id) return;
      Promise.resolve(slimDocForCloud(t.doc))
        .then(d=>rc.putDoc('poster', 'tpl:'+t.id, t.name||'', d===t.doc ? t : Object.assign({}, t, { doc:d }), t.savedAt||Date.now()))
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

  async function tplGetAll(){ return db.getAll(T_STORE); }

  async function tplPut(t){ await db.put(T_STORE, t); cloudPutTpl(t); }

  async function tplDelete(id){ await db.delete(T_STORE, id);
    try{ await thumbDelete(id); }catch(e){}   // the card's cached picture goes with the record
    cloudDelTpl(id); }

  /* Upsert many in one transaction without clearing — used by migrate() so a
     re-run can never drop records added after the first migration. */
  async function tplBulkPut(arr){ return db.putMany(T_STORE, arr); }

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
    await db.tx(T_STORE, 'readwrite', s=>{
      (dropIds||[]).forEach(id=>{ if(id) s.delete(id); });
      (incoming||[]).forEach(t=>{ if(t && t.id) s.put(t); });
    });
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
  async function binRows(){ return db.getAll(M_STORE, binRange()); }
  async function binPut(t, reason){
    if(!t || !t.id) return;
    await metaPut(BIN_PREFIX + t.id, { at: Date.now(), reason: reason || 'removed', tpl: t });
    try{
      const rows = await binRows();
      if(rows.length > BIN_CAP){
        rows.sort((a,b)=>((a.v&&a.v.at)||0)-((b.v&&b.v.at)||0));
        await db.tx(M_STORE, 'readwrite', s=>{ rows.slice(0, rows.length - BIN_CAP).forEach(r=>s.delete(r.k)); });
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
    return db.delete(M_STORE, BIN_PREFIX + id);
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
       a second open tab could block (see store.js open()'s onblocked).
     • They are LOCAL ONLY, never mirrored to the hub. A thumbnail is ~10 KB and
       regenerates itself on any machine that hasn't got one, whereas attaching
       it to the record would mean re-uploading that template's whole ~2.5 MB
       body (photos and all) every time a card first drew.
     -------------------------------------------------------------------------- */
  const TH_PREFIX = 'thumb:';
  function thumbRange(){ return IDBKeyRange.bound(TH_PREFIX, TH_PREFIX + '\uffff'); }
  async function thumbRows(){ return db.getAll(M_STORE, thumbRange()); }

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
    return db.delete(M_STORE, TH_PREFIX + id);
  }
  /* Keep only the ids the library still holds. Import can put DIFFERENT artwork
     under an id that already has a thumbnail, and a card that goes on showing
     the poster it replaced is worse than no card picture at all. */
  async function thumbPrune(keepIds){
    const keep = {}; (keepIds||[]).forEach(id=>{ if(id) keep[id]=1; });
    const rows = await thumbRows();
    const drop = (rows||[]).map(r=>r && r.k).filter(k=>k && !keep[k.slice(TH_PREFIX.length)]);
    if(!drop.length) return;
    return db.tx(M_STORE, 'readwrite', s=>{ drop.forEach(k=>s.delete(k)); });
  }

  async function metaGet(k){ const v = await db.get(M_STORE, k); return v ? v.v : undefined; }
  async function metaPut(k, v){ return db.put(M_STORE, { k, v }); }

  /* ---- the working doc ------------------------------------------------------
     The poster on screen autosaved to localStorage on every change — photos
     and all — into the same ~5MB box as the legacy template backup, Print
     Studio and Schedule Studio. When that box filled, setItem threw, the throw
     was swallowed, and the Studio carried on looking saved while nothing was
     being kept. It lives here now, behind a 'doc:' key in the meta store: no
     DB_VER bump (same reasoning as the thumbnails), and the quota is the
     disk's rather than 5MB. Stored as { at, doc } so a reader can tell which of
     two copies is newer. Rejects on failure — the caller shows it. */
  const DOC_PREFIX = 'doc:';
  async function docGet(k){
    const v = await metaGet(DOC_PREFIX + (k||'working'));
    return (v && v.doc && Array.isArray(v.doc.elements)) ? v : null;
  }
  async function docPut(k, doc){ return metaPut(DOC_PREFIX + (k||'working'), { at: Date.now(), doc: doc }); }

  /* ---- retire the legacy localStorage template backup ----------------------
     migrate() deliberately left the old library in localStorage as a backup,
     and it has sat there ever since — often megabytes of inline photos, in the
     one box the working doc (then) and two other Studios all write to. This
     files that backup inside IndexedDB, VERBATIM, reads it back, checks that
     every template id in it is accounted for, and only then frees the
     localStorage copy. Nothing is ever lost: the exact string is kept under
     'legacy:<key>', and the report says how many of its ids are still live
     templates (the rest were deleted on purpose since the move — they're in
     the archived copy, and some in Recently deleted).
     Refuses — and leaves localStorage alone — on anything it can't prove:
     not migrated yet, unparseable, a record without an id, or an archive that
     doesn't read back identical. */
  const LEGACY_PREFIX = 'legacy:';
  async function retireLegacyTpls(){
    let raw = null;
    try{ raw = localStorage.getItem(LS_TPL_KEY); }catch(e){ return { kept:'localStorage unreadable' }; }
    if(!raw) return { none:true };
    await open();
    if(!(await metaGet('migrated_v1'))) return { kept:'not migrated yet' };
    let arr = null;
    try{ arr = JSON.parse(raw); }catch(e){ return { kept:'backup is not JSON' }; }
    if(!Array.isArray(arr)) return { kept:'backup is not a list' };
    if(arr.some(t=>!t || !t.id)) return { kept:'a backed-up template has no id' };
    const key = LEGACY_PREFIX + LS_TPL_KEY;
    const prior = await metaGet(key);
    if(!prior || prior.raw !== raw) await metaPut(key, { at: Date.now(), raw: raw });
    const back = await metaGet(key);
    if(!back || back.raw !== raw) return { kept:'archive did not read back identical' };
    let archived = null;
    try{ archived = JSON.parse(back.raw); }catch(e){ return { kept:'archive unreadable' }; }
    const inArchive = {}; (archived||[]).forEach(t=>{ if(t && t.id) inArchive[t.id]=1; });
    if(arr.some(t=>!inArchive[t.id])) return { kept:'an id is missing from the archive' };
    const live = {}; (await tplGetAll()).forEach(t=>{ if(t && t.id) live[t.id]=1; });
    const liveCount = arr.filter(t=>live[t.id]).length;
    try{ localStorage.removeItem(LS_TPL_KEY); }catch(e){ return { kept:'localStorage refused the delete' }; }
    return { retired: arr.length, live: liveCount, bytes: raw.length };
  }

  /* One-time copy of the legacy localStorage library into IndexedDB.
     • Keeps the localStorage entry intact (an untouched backup) —
       retireLegacyTpls moves it, once it is provably filed here.
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
                    metaGet, metaPut, migrate, cloudPull, cloudPushAll, cloudRestore, LS_TPL_KEY,
                    docGet, docPut, retireLegacyTpls, slimDocForCloud };
})();

// An ES module in Poster Studio's bundle: the app imports RStore from here.
// window.RStore stays set too — a permanent global (see main.jsx).
export const RStore = window.RStore;
