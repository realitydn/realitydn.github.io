/* ============================================================
   REALITY POSTER STUDIO — the working doc
   Its storage shape and the helpers the autosave, the library and the
   export share: the starter, normalising a stored doc, booting it out of
   IndexedDB (or the old localStorage copy), filenames, ids, the engine stamp.
   ============================================================ */
import { RStore } from './studio-store.js';
import { internDoc } from './photos.js';
import { FORMATS as AP_FMT, accentDay as apAccentDay, makeElement as apMake, STEP } from './studio-data.jsx';
const LS_KEY = 'reality-studio-doc-v2';
const TPL_KEY = 'reality-studio-templates-v1';

function starterDoc(){
  return {
    /* 4:5 (1080×1350) is the primary format — IG feed + the site pipeline */
    activeFormat:'master', masterFormat:'4x5',
    theme:'night', accent:'pink', showGrid:true, snap:true, overrides:{},
    title:'', exportFormat:'png', storyBoost:true, storyScale:1.15,
    /* The empty-Studio demo, re-cut onto the 90/45 frame (23.08) — it used to
       sit on 80/96/150/280/1014, none of which Snap could reach, so the first
       thing anyone dragged jumped. Text still overlaps the photo on purpose;
       every edge is just a multiple of the step now. */
    elements:[
      Object.assign(apMake('photo', 90, 90), { w:900, h:900, treatment:'separation', frame:false }),
      apMake('when', 360, 270),
      Object.assign(apMake('title', 135, 405), { text:'Pulse\nSessions', color:'fg' }),
      Object.assign(apMake('host', 270, 720), { kicker:'On the decks', name:'DJ Milk' }),
      apMake('ticket', 90, 1125),
    ]
  };
}
/* A stored working doc → one the app can run on (defaults for fields added
   since it was saved). Null if it isn't a doc at all. */
function normalizeDoc(d){
  if(!d || !Array.isArray(d.elements)) return null;
  const doc=Object.assign({overrides:{},activeFormat:'master',masterFormat:'4x5',title:'',exportFormat:'png',storyBoost:true,storyScale:1.15}, d);
  if(doc.storyScale===1.3) doc.storyScale=1.15; /* old default bled off the story sides; 1.15 keeps the column in-frame */
  if(doc.activeFormat!=='master' && !AP_FMT[doc.activeFormat]) doc.activeFormat='master'; /* retired view (e.g. the old FB cover) saved as active → back to Master */
  delete doc._savedAt;   // the localStorage fallback's timestamp — storage bookkeeping, not part of the poster
  return doc;
}
/* Why a storage write failed, in words for the topbar: describeStoreError,
   ../studio-shared/store.js (the one Print's badges use too). */
/* Arrow-key nudge: a ninth of the grid step (5px at STEP 45), so nine presses
   walk exactly one step and a nudged box can always be walked back onto the
   armature a drag snaps to. Shift moves one whole step. */
const NUDGE = Math.round((STEP||45)/9);
/* The pre-IndexedDB autosave (and the fallback copy, if IndexedDB ever
   refuses a write) — read once on boot, then retired. */
function loadLegacyDoc(){ try{ const r=localStorage.getItem(LS_KEY); if(r) return JSON.parse(r); }catch(e){} return null; }

/* ============================================================
   THE WORKING DOC — where the poster on screen is kept.
   ============================================================
   It used to be written whole to localStorage on every change,
   photos and all, into the ~5MB box it shares with the old
   template backup, Print Studio and Schedule Studio. Once that
   box was full every write threw, the throw was swallowed, and
   the Studio went on looking saved: close the tab and the poster
   was whatever it was the last time a write fitted.

   It lives in IndexedDB now (RStore 'doc:working'), written
   ~500ms after the last change and flushed on the way out, with a
   save-state in the topbar that goes red when a write fails. On
   boot: the IndexedDB copy, else the old localStorage one — which
   is then moved across and removed. If both exist (IndexedDB once
   refused a write and the fallback kept it) the newer one wins. */
/* `bootState.clean` — the IndexedDB read went through without an error. The
   photo sweep (hooks/usePhotoSweep.js) only runs when it did: a working doc
   that couldn't be read may still hold references it must not lose. */
const bootState = { clean:false };
async function bootDoc(){
  let rec = null;
  bootState.clean = false;
  try{ if(RStore && RStore.docGet){ rec = await RStore.docGet('working'); bootState.clean = true; } }catch(e){ rec = null; }
  if(rec && rec.from==='v1') console.info('[studio] took the working doc from the older build’s store (it was saved there more recently).');
  const legacy = loadLegacyDoc();
  const legacyAt = (legacy && legacy._savedAt) || 0;    // only the fallback writer stamps this
  if(rec && (!legacy || rec.at >= legacyAt)){
    if(legacy){ try{ localStorage.removeItem(LS_KEY); }catch(e){} }
    return normalizeDoc(rec.doc) || starterDoc();
  }
  /* the localStorage copy is an old build's (inline photos) or this one's
     fallback (references) — either way it comes in referenced */
  let legacyIn = legacy;
  try{ legacyIn = await internDoc(legacy); }catch(e){}
  const d = normalizeDoc(legacyIn);
  if(d){
    /* Move it across; only drop the localStorage copy once IndexedDB holds it. */
    try{ await RStore.docPut('working', d); localStorage.removeItem(LS_KEY); }catch(e){}
    return d;
  }
  return starterDoc();
}

/* Poster name → filename slug: util.js slugify (Vietnamese-safe; "Đêm Trò
   Chơi" → "dem-tro-choi"), the one Print Studio names its PDFs with. */
/* Export filename stem per format. Two formats lead with the accent's weekday
   (e.g. purple → "3-wed-…") so files sort Mon→Sun and the day is legible:
     • 9:16 Story — "3-wed-pulse-sessions"        (phone-post naming)
     • 4:5 Feed   — "3-wed-pulse-sessions-4x5"    (the website carousel pipeline
                     reads this token in Poster Manager to auto-tag the day)
   Every other format keeps "<name>-<format>". */
function storyStem(fmt, base, accent){
  const di = apAccentDay(accent);
  if(fmt==='9x16'){ if(di) return di.n+'-'+di.abbr.toLowerCase()+'-'+base; }
  else if(fmt==='4x5'){ if(di) return di.n+'-'+di.abbr.toLowerCase()+'-'+base+'-'+fmt; }
  return base+'-'+fmt;
}

/* A template's id is a PERSISTED primary key: two records sharing one means the
   second silently overwrites the first, and there is no way back. uid() is not
   good enough for that — its counter restarts at 1 on every page load, so the
   Nth element of one session and the Nth of the next differ only by four random
   characters. Elements are fine with that (they live and die inside one doc);
   a saved poster is not. */
function tplId(){
  try{ if(window.crypto && window.crypto.randomUUID) return 'tpl_'+window.crypto.randomUUID(); }catch(e){}
  return 'tpl_'+Date.now().toString(36)+'_'
    +Math.random().toString(36).slice(2,10)+Math.random().toString(36).slice(2,10);
}
/* Same keys, same values (by identity) — enough to know a resolved element
   hasn't changed, since every edit replaces what it touches. */
function shallowSame(a, b){
  if(a===b) return true;
  if(!a || !b) return false;
  const ka = Object.keys(a);
  if(ka.length!==Object.keys(b).length) return false;
  for(let i=0;i<ka.length;i++){ if(a[ka[i]]!==b[ka[i]]) return false; }
  return true;
}
/* Newest first — the library's one order, in one place. */
function sortTpls(list){ return (list||[]).slice().sort((a,b)=>(b.savedAt||0)-(a.savedAt||0)); }

/* Which press made this poster. `engineRev` is the riso engine's revision
   (riso-press.js REV), stamped on every save — the working doc, the cloud
   copy and each template. Nothing reads it yet; it exists so a reprint years
   on can tell which press a poster was made on, which is impossible to add
   retroactively. Absent means "before the separation shipped" (rev 1). */
function stampEngine(doc){
  const rev = window.RISO && window.RISO.REV;
  return rev ? Object.assign({}, doc, { engineRev: rev }) : doc;
}

/* My-templates store — full poster snapshots (elements, overrides, theme),
   saved by name in localStorage, separate from the working doc. */
function loadUserTpls(){ try{ const r=localStorage.getItem(TPL_KEY); if(r){ const a=JSON.parse(r); if(Array.isArray(a)) return a; } }catch(e){} return []; }

export {
  LS_KEY, TPL_KEY, starterDoc, normalizeDoc, NUDGE, loadLegacyDoc, bootDoc, bootState, storyStem, tplId, shallowSame,
  sortTpls, stampEngine, loadUserTpls,
};
