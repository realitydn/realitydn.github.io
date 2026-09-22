/* ============================================================
   REALITY STUDIOS — browser storage, once
   ------------------------------------------------------------
   The IndexedDB plumbing every Studio stood on, written once. Poster
   (studio-store.js → window.RStore) and Print (print-store.js) each
   had their own open / transaction / request wrappers; Schedule was
   still on localStorage. Each Studio keeps ITS OWN database — this
   module owns none of them and never migrates one:

     Poster    'reality-studio'  v1  templates{keyPath:id} · meta{keyPath:k}
     Print     'reality-print'   v2  images{keyPath:id} · kv (out-of-line)
     Schedule  'reality-schedule' v1 kv (out-of-line)

   Those names, stores, keys and record shapes ARE the owner's library
   — a code change here must never touch them. A Studio describes its
   schema (name, version, upgrade) and gets back a handle:

     openDB({ name, version, upgrade(db, oldVersion), blockedMessage,
              errorEvent })
       .open()                      → Promise<IDBDatabase>; one open per
                                      page, concurrent callers share it;
                                      steps aside (closes) when a newer
                                      tab needs to upgrade
       .get(store, key) · .getAll(store, query?) · .getAllKeys(store)
       .put(store, value, key?)     → resolves when the transaction commits
       .putMany(store, values)      → one transaction
       .delete(store, key)
       .tx(stores, mode, fn)        → fn(objectStore | {name: store}) runs
                                      inside one transaction; resolves with
                                      fn's return value once it COMMITS
       .report(kind, message)       → dispatches `errorEvent` (if the Studio
                                      named one) so the chrome can show it

   Plus the pieces around it:
     describeStoreError(e)  — a failed write, in words ("storage full")
     persistStorage()       — navigator.storage.persist(), best-effort
     makeWriter(write)      — one write in flight, the newest value queued
     watchOtherTabs(opts)   — "another tab has this Studio open"

   Every write RESOLVES only when the data is on disk and REJECTS when
   it isn't (quota, a blocked upgrade, a private window). Swallowing
   that is how a Studio used to look saved while keeping nothing.
   ============================================================ */

/* ---- request / transaction → promise ---- */
function reqVal(r){ return new Promise((res, rej)=>{ r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error); }); }
function txDone(t){
  return new Promise((res, rej)=>{
    t.oncomplete=()=>res();
    t.onerror=()=>rej(t.error);
    t.onabort=()=>rej(t.error || new Error('transaction aborted'));
  });
}

function openDB(schema){
  const { name, version, upgrade } = schema;
  const blockedMessage = schema.blockedMessage || 'IndexedDB open blocked';
  let _db = null, _opening = null;

  function open(){
    if(_db) return Promise.resolve(_db);
    if(_opening) return _opening;
    _opening = new Promise((res, rej)=>{
      let rq;
      try{ rq = indexedDB.open(name, version); }catch(e){ rej(e); return; }
      rq.onupgradeneeded = (ev)=>{ if(upgrade) upgrade(rq.result, ev.oldVersion); };
      rq.onsuccess = ()=>{
        _db = rq.result;
        /* a newer tab wants to upgrade — step aside rather than block it */
        _db.onversionchange = ()=>{ try{ _db.close(); }catch(e){} _db = null; };
        res(_db);
      };
      rq.onerror   = ()=>rej(rq.error);
      /* an older tab still holds the previous version open — the upgrade waits on it */
      rq.onblocked = ()=>rej(new Error(blockedMessage));
    });
    _opening.catch(()=>{}).then(()=>{ _opening = null; });
    return _opening;
  }

  function objectStore(store, mode){ return _db.transaction(store, mode).objectStore(store); }

  async function get(store, key){ await open(); return reqVal(objectStore(store, 'readonly').get(key)); }
  async function getAll(store, query){ await open(); return reqVal(objectStore(store, 'readonly').getAll(query)); }
  async function getAllKeys(store){ await open(); return reqVal(objectStore(store, 'readonly').getAllKeys()); }
  async function put(store, value, key){
    await open();
    const s = objectStore(store, 'readwrite');
    if(key===undefined) s.put(value); else s.put(value, key);
    return txDone(s.transaction);
  }
  async function putMany(store, values){
    await open();
    const s = objectStore(store, 'readwrite');
    (values||[]).forEach(v=>s.put(v));
    return txDone(s.transaction);
  }
  async function del(store, key){
    await open();
    const s = objectStore(store, 'readwrite'); s.delete(key);
    return txDone(s.transaction);
  }
  /* Several operations, one transaction: all land or none do. `stores` is a
     name (fn gets that object store) or a list (fn gets { name: store }). */
  async function tx(stores, mode, fn){
    await open();
    const t = _db.transaction(stores, mode);
    const arg = Array.isArray(stores)
      ? stores.reduce((o, n)=>{ o[n] = t.objectStore(n); return o; }, {})
      : t.objectStore(stores);
    const out = fn(arg);
    await txDone(t);
    return out;
  }
  function report(kind, message){
    if(!schema.errorEvent) return;
    try{ window.dispatchEvent(new CustomEvent(schema.errorEvent, { detail:{ kind, message } })); }catch(e){}
  }

  return { name, open, get, getAll, getAllKeys, put, putMany, delete: del, tx, report };
}

/* ---- a failed write, in words a person can act on (the topbar badges) ---- */
function describeStoreError(e){
  const n = (e && e.name) || '', m = (e && e.message) || '';
  if(n==='QuotaExceededError' || /quota/i.test(m) || (e && e.code===22)) return 'storage full';
  return m || n || (e ? String(e) : '') || 'write failed';
}

/* ---- ask the browser not to evict this origin's storage under pressure ----
   The library and the working docs are the only copy of a lot of work. The
   answer doesn't change anything a Studio does, so it is only returned. */
function persistStorage(){
  try{
    if(navigator.storage && navigator.storage.persist) return navigator.storage.persist().catch(()=>false);
  }catch(e){}
  return Promise.resolve(false);
}

/* ---- one write in flight, the newest value queued behind it ----
   A drag fires a doc change per frame; this lands the LAST one without a
   transaction per pixel. `write(value)` returns a promise. Each caller's
   promise settles with the write that carried its value (or a newer one). */
function makeWriter(write){
  let busy=false, has=false, next, waiters=[];
  async function pump(){
    busy=true;
    while(has){
      const v=next, ws=waiters; has=false; waiters=[];
      try{ await write(v); ws.forEach(w=>w.res()); }
      catch(e){ ws.forEach(w=>w.rej(e)); }
    }
    busy=false;
  }
  return (v)=> new Promise((res, rej)=>{ next=v; has=true; waiters.push({ res, rej }); if(!busy) pump(); });
}

/* ---- two tabs, one working doc ----
   Both autosave to the same record, so the last one to change anything wins.
   Tabs announce themselves on a BroadcastChannel; any other voice on it calls
   onChange(true) (and a `storage` event whose key starts with storagePrefix
   covers a localStorage fallback, where a write from the other tab fires one
   here). Returns { peers() → how many other tabs answered, stop() }. */
function watchOtherTabs({ channel, storagePrefix, onChange }){
  const me = Math.random().toString(36).slice(2);
  const peers = new Set();
  const onStorage = (e)=>{ if(storagePrefix && e.key && e.key.indexOf(storagePrefix)===0) onChange(true); };
  window.addEventListener('storage', onStorage);
  if(!('BroadcastChannel' in window)){
    return { peers:()=>peers.size, stop:()=>window.removeEventListener('storage', onStorage) };
  }
  const bc = new BroadcastChannel(channel);
  bc.onmessage = (e)=>{
    const m = e.data||{}; if(!m.id || m.id===me) return;
    if(m.t==='hello'){ peers.add(m.id); bc.postMessage({ t:'here', id:me }); }
    else if(m.t==='here') peers.add(m.id);
    else if(m.t==='bye') peers.delete(m.id);
    onChange(peers.size>0);
  };
  bc.postMessage({ t:'hello', id:me });
  const bye = ()=>{ try{ bc.postMessage({ t:'bye', id:me }); }catch(err){} };
  window.addEventListener('pagehide', bye);
  return {
    peers: ()=>peers.size,
    stop: ()=>{ bye(); window.removeEventListener('pagehide', bye); window.removeEventListener('storage', onStorage); bc.close(); },
  };
}

export { openDB, reqVal, txDone, describeStoreError, persistStorage, makeWriter, watchOtherTabs };
