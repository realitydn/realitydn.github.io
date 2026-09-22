/* ============================================================
   REALITY SCHEDULE STUDIO — data · persistence
   The working doc in IndexedDB (../studio-shared/store.js) plus the
   localStorage copy kept during the coexistence period.
   ============================================================ */
import { makeWriter, openDB } from '../studio-shared/store.js';
import { normalizeDoc } from './data-model.jsx';

/* ---- persistence ----
   The working doc lives in IndexedDB (../studio-shared/store.js — the layer
   Poster and Print stand on) in Schedule's own database: 'reality-schedule',
   object store 'kv', key 'doc', the doc object exactly as it is (the shape
   Save JSON writes; savedAt is already part of it). It used to live ONLY in
   localStorage under SCH_LS — one ~5MB box per origin that Poster + Print
   fill too, so a full box meant NOT SAVED.

   COEXISTENCE, while tabs still running the old code may be open (added
   23.09.26). Old code reads and writes localStorage only; this code:
     • on load, reads BOTH copies and adopts the one with the newer savedAt
       (a tie goes to IndexedDB — they are the same save). The app's first
       autosave then writes the adopted doc to both, so it lands in IDB;
     • on every save, writes IndexedDB AND the localStorage copy.
   So an old tab's edits (localStorage, newer savedAt) win the next load here,
   and this code's edits are in the box the old tab reads. Neither loses the
   other's work. The localStorage copy is also what survives a tab closed
   mid-IDB-write (setItem is synchronous).
   FOLLOW-UP: once every Schedule tab has reloaded onto this code (a later
   release — see docs/REFACTOR-PLAN.md, "Schedule localStorage copy"), drop the
   storeDoc() call in saveStoredDoc and the readLSDoc() fallback in
   loadStoredDoc, and remove SCH_LS from localStorage. */
const SCH_LS = 'reality-schedule-doc-v2';
const SCH_DB = 'reality-schedule', SCH_KV = 'kv', SCH_KEY = 'doc';
let _schDb = null;
function schDb(){
  return _schDb || (_schDb = openDB({ name:SCH_DB, version:1,
    upgrade(d){ if(!d.objectStoreNames.contains(SCH_KV)) d.createObjectStore(SCH_KV); } }));
}
/* One IDB write in flight, the newest doc queued behind it (a typed title is a
   change per key). */
let _idbWrite = null;
function writeIDBDoc(doc){
  if(!_idbWrite) _idbWrite = makeWriter(d=>schDb().put(SCH_KV, d, SCH_KEY));
  return _idbWrite(doc);
}
function readLSDoc(){
  try{ const r = localStorage.getItem(SCH_LS); if(r){ const d = JSON.parse(r); if(d && d.events) return d; } }catch(e){}
  return null;
}
/* true when the localStorage write landed (false when that box is full). */
function storeDoc(doc){ try{ localStorage.setItem(SCH_LS, JSON.stringify(doc)); return true; }catch(e){ return false; } }

/* Newer savedAt wins; a tie goes to IndexedDB; anything without an events
   list isn't a doc. Pure: → { doc, from:'idb'|'ls'|null }. */
function pickNewerDoc(idbDoc, lsDoc){
  const a = (idbDoc && idbDoc.events) ? idbDoc : null;
  const b = (lsDoc && lsDoc.events) ? lsDoc : null;
  if(!a && !b) return { doc:null, from:null };
  if(!b) return { doc:a, from:'idb' };
  if(!a) return { doc:b, from:'ls' };
  return (+b.savedAt||0) > (+a.savedAt||0) ? { doc:b, from:'ls' } : { doc:a, from:'idb' };
}
/* Both writes, every save: writeLS(doc) → bool (synchronous, first),
   writeIDB(doc) → Promise. Resolves { ls, idb, ok }, ok when EITHER copy
   landed — the next load adopts whichever is newer. Pure over its writers. */
function writeBothDocs(doc, writeLS, writeIDB){
  let ls = false;
  try{ ls = !!writeLS(doc); }catch(e){ ls = false; }
  let p;
  try{ p = Promise.resolve(writeIDB(doc)); }catch(e){ p = Promise.reject(e); }
  return p.then(()=>true, ()=>false).then(idb=>({ ls, idb, ok: ls || idb }));
}

/* The stored document, or null on a first run (nothing stored) — the app then
   opens a blank document on the current week and lets the feed fill it. A
   wedged IndexedDB (a second tab mid-upgrade) gets 3 s, then the
   localStorage copy is used alone. */
async function loadStoredDoc(){
  const ls = readLSDoc();
  let idb = null;
  try{
    idb = await Promise.race([
      schDb().get(SCH_KV, SCH_KEY),
      new Promise((_, rej)=>setTimeout(()=>rej(new Error('IndexedDB read timed out')), 3000)),
    ]);
  }catch(e){ console.warn('[schedule] IndexedDB unavailable — using the localStorage copy.', e); idb = null; }
  const pick = pickNewerDoc(idb, ls);
  return pick.doc ? normalizeDoc(pick.doc) : null;
}
/* Save the working doc: IndexedDB + the localStorage copy (see COEXISTENCE).
   → Promise<{ ls, idb, ok }>; the app shows NOT SAVED when !ok. */
function saveStoredDoc(doc){ return writeBothDocs(doc, storeDoc, writeIDBDoc); }

export { storeDoc, pickNewerDoc, writeBothDocs, loadStoredDoc, saveStoredDoc };
