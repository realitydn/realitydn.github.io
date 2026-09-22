/* ============================================================
   REALITY STUDIOS — photos by reference (content-addressed blobs)
   ------------------------------------------------------------
   Each image is stored ONCE, as a Blob keyed by the SHA-256 of its
   bytes; a doc, a template or an undo step keeps only a short
   reference to it:

       el.src = 'ref:sha256:<64 hex>'

   — a string no browser treats as a URL, so it can never be mistaken
   for one (an old build handed it would fail to load it, not fetch
   something). Everything that draws a photo resolves it through
   url(ref) (one objectURL per image, cached, revoked on eviction) and
   still accepts an inline data URL, forever: old docs, old templates
   and cloud drafts all carry them.

   The blobs live in their OWN database, so no Studio's existing
   database changes shape (an old tab may still have it open, and an
   upgrade it can't perform would block):

     'reality-blobs'  v1  images{keyPath:hash}
       { hash, blob, head, size, at, owners:['poster', …] }

   `head` is the data URL's own header ('data:image/jpeg;base64'), so
   an image turns back into EXACTLY the data URL it came in as — the
   cloud payloads and the template export depend on that. `at` is the
   last time anything stored it (a re-paste of the same photo refreshes
   it), which is what the sweep's age test reads. `owners` lets two
   Studios share one image: a sweep only lets go of its own claim, and
   the record goes when nobody claims it.

   makeBlobStore({ owner })
     .adopt(dataUrl)   → Promise<ref> — store an inline image; RESOLVES
                          WITH THE DATA URL ITSELF if it can't (no
                          crypto.subtle, storage refused, not base64), so
                          a photo is never lost to the store failing
     .put(blob, head)  → Promise<ref>
     .get(ref)         → Promise<Blob|null>
     .url(ref)         → Promise<objectURL> (LRU, revoked on eviction)
     .toDataUrl(ref)   → Promise<string> — the original data URL
     .gc(keep, { minAgeMs }) → Promise<{ deleted, released, kept }>
     .stats()          → Promise<{ count, bytes }> (this owner's)
   isRef(s), isInline(s), REF_PREFIX
   ============================================================ */
import { openDB } from './store.js';

const REF_PREFIX = 'ref:sha256:';
const REF_RE = /^ref:sha256:[0-9a-f]{64}$/;
function isRef(s){ return typeof s==='string' && REF_RE.test(s); }
function isInline(s){ return typeof s==='string' && s.indexOf('data:')===0; }
function hashOf(ref){ return ref.slice(REF_PREFIX.length); }

const DB_NAME = 'reality-blobs', DB_VER = 1, STORE = 'images';
let _db = null;
function db(){
  if(!_db) _db = openDB({
    name: DB_NAME, version: DB_VER, blockedMessage: 'IndexedDB open blocked (image store)',
    upgrade(d){ if(!d.objectStoreNames.contains(STORE)) d.createObjectStore(STORE, { keyPath:'hash' }); },
  });
  return _db;
}

function hex(buf){
  const b = new Uint8Array(buf); let s = '';
  for(let i=0;i<b.length;i++) s += (b[i]<16?'0':'') + b[i].toString(16);
  return s;
}
function canHash(){ try{ return !!(window.crypto && window.crypto.subtle && window.crypto.subtle.digest); }catch(e){ return false; } }

/* 'data:image/jpeg;base64,AAAA' → { head:'data:image/jpeg;base64', type:'image/jpeg', bytes } —
   base64 only (every photo a canvas encodes is); anything else stays inline. */
function parseDataUrl(s){
  const comma = s.indexOf(',');
  if(comma<0) return null;
  const head = s.slice(0, comma);
  if(!/;base64$/i.test(head)) return null;
  const type = head.slice(5).split(';')[0] || 'application/octet-stream';
  let bin;
  try{ bin = atob(s.slice(comma+1)); }catch(e){ return null; }
  const bytes = new Uint8Array(bin.length);
  for(let i=0;i<bin.length;i++) bytes[i] = bin.charCodeAt(i);
  return { head, type, bytes };
}
function blobToBase64(blob){
  return new Promise((res, rej)=>{
    const fr = new FileReader();
    fr.onload = ()=>{ const s = String(fr.result||''); res(s.slice(s.indexOf(',')+1)); };
    fr.onerror = ()=>rej(fr.error || new Error('read failed'));
    fr.readAsDataURL(blob);
  });
}

function makeBlobStore({ owner, urlCap }){
  const CAP = urlCap || 40;

  /* ---- write: one record per distinct image ---- */
  async function putBytes(bytes, type, head){
    const hash = hex(await window.crypto.subtle.digest('SHA-256', bytes));
    const now = Date.now();
    await db().tx(STORE, 'readwrite', s=>{
      const rq = s.get(hash);
      rq.onsuccess = ()=>{
        const have = rq.result;
        if(have && have.blob instanceof Blob){
          /* already stored — claim it and refresh its age; the bytes are the same by definition */
          const owners = Array.isArray(have.owners) ? have.owners.slice() : [];
          if(owners.indexOf(owner)<0) owners.push(owner);
          s.put(Object.assign({}, have, { owners, at: now }));
        } else {
          s.put({ hash, blob: new Blob([bytes], { type }), head: head || ('data:'+type+';base64'),
                  size: bytes.byteLength, at: now, created: now, owners: [owner] });
        }
      };
    });
    return REF_PREFIX + hash;
  }
  async function put(blob, head){
    const bytes = new Uint8Array(await blob.arrayBuffer());
    return putBytes(bytes, blob.type || 'application/octet-stream', head);
  }

  /* inline data URL → ref, remembered by the string itself (a doc interned on
     every save re-hashes nothing it has seen this session) */
  const _adopted = new Map();
  function adopt(dataUrl){
    if(!isInline(dataUrl) || !canHash()) return Promise.resolve(dataUrl);
    if(_adopted.has(dataUrl)) return _adopted.get(dataUrl);
    const p = (async ()=>{
      const d = parseDataUrl(dataUrl);
      if(!d) return dataUrl;
      return putBytes(d.bytes, d.type, d.head);
    })().catch(e=>{ _adopted.delete(dataUrl); console.warn('[blobs] kept a photo inline — the image store refused it', e); return dataUrl; });
    _adopted.set(dataUrl, p);
    while(_adopted.size > 64) _adopted.delete(_adopted.keys().next().value);
    return p;
  }

  /* ---- read ---- */
  async function getRec(ref){
    if(!isRef(ref)) return null;
    const r = await db().get(STORE, hashOf(ref));
    return (r && r.blob instanceof Blob) ? r : null;
  }
  async function get(ref){ const r = await getRec(ref); return r ? r.blob : null; }

  /* ref → objectURL. Small LRU; the evicted URL is revoked. Whatever already
     decoded from it keeps its pixels — revoking only stops NEW loads, and the
     next draw of an evicted image simply asks here again. */
  const _urls = new Map(), _pendingUrl = new Map();
  function url(ref){
    const have = _urls.get(ref);
    if(have){ _urls.delete(ref); _urls.set(ref, have); return Promise.resolve(have); }
    if(_pendingUrl.has(ref)) return _pendingUrl.get(ref);
    const p = get(ref).then(blob=>{
      _pendingUrl.delete(ref);
      if(!blob) throw new Error('image not in storage: '+ref);
      const u = URL.createObjectURL(blob);
      _urls.set(ref, u);
      while(_urls.size > CAP){
        const k = _urls.keys().next().value, old = _urls.get(k);
        _urls.delete(k); try{ URL.revokeObjectURL(old); }catch(e){}
      }
      return u;
    }, e=>{ _pendingUrl.delete(ref); throw e; });
    _pendingUrl.set(ref, p);
    return p;
  }

  /* ref → the data URL it was adopted from, byte for byte */
  const _inline = new Map();
  function toDataUrl(ref){
    if(!isRef(ref)) return Promise.resolve(ref);
    if(_inline.has(ref)) return _inline.get(ref);
    const p = getRec(ref).then(async r=>{
      if(!r) throw new Error('image not in storage: '+ref);
      return r.head + ',' + await blobToBase64(r.blob);
    });
    p.catch(()=>_inline.delete(ref));
    _inline.set(ref, p);
    while(_inline.size > 8) _inline.delete(_inline.keys().next().value);
    return p;
  }

  /* ---- sweep ----
     Lets go of this owner's claim on every image NOT in `keep` (a Set of refs
     or hashes) that nothing has stored for minAgeMs, and deletes the records
     nobody claims any more. The caller decides when it is safe (everything
     that holds refs read cleanly, no other tab open) — see the Studio. */
  async function gc(keep, opts){
    const minAge = (opts && opts.minAgeMs) || 0;
    const keepH = new Set(); (keep||[]).forEach(r=>{ if(isRef(r)) keepH.add(hashOf(r)); else if(r) keepH.add(r); });
    const out = await db().tx(STORE, 'readwrite', s=>{
      const now = Date.now(), res = { deleted:0, released:0, kept:0 };
      const rq = s.openCursor();
      rq.onsuccess = ()=>{
        const c = rq.result; if(!c) return;
        const v = c.value || {};
        const owners = Array.isArray(v.owners) ? v.owners : [];
        const mine = owners.indexOf(owner)>=0;
        const young = (now - (v.at||0)) < minAge;
        if(mine && !keepH.has(c.key) && !young){
          const rest = owners.filter(o=>o!==owner);
          if(rest.length){ c.update(Object.assign({}, v, { owners: rest })); res.released++; }
          else { c.delete(); res.deleted++; }
          _forget(REF_PREFIX + c.key);
        } else if(mine) res.kept++;
        c.continue();
      };
      return res;
    });
    return out;
  }
  function _forget(ref){
    const u = _urls.get(ref); if(u){ _urls.delete(ref); try{ URL.revokeObjectURL(u); }catch(e){} }
    _inline.delete(ref);
  }

  async function stats(){
    const all = await db().getAll(STORE);
    const mine = (all||[]).filter(v=>v && Array.isArray(v.owners) && v.owners.indexOf(owner)>=0);
    return { count: mine.length, bytes: mine.reduce((n, v)=>n + (v.size||0), 0) };
  }

  return { owner, adopt, put, get, url, toDataUrl, gc, stats, open: ()=>db().open() };
}

export { makeBlobStore, isRef, isInline, REF_PREFIX, parseDataUrl };
