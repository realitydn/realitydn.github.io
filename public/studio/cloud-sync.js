/* ============================================================
   REALITY POSTER STUDIO — cloud sync, the decisions
   ------------------------------------------------------------
   What studio-store.js, hooks/useCloud.js and the topbar decide about the hub,
   kept apart from the IndexedDB and React that carry it out — so the
   rules can be read in one place and tested in node
   (scripts/selftest.mjs imports this file as it ships). No window,
   no React, no imports: plain values in, plain values out.

   The one fact everything here works around: the hub stamps a doc's
   `updated_at` as max(the client's time, the hub's own clock) — see
   REALITYApp src/lib/studio-documents.ts. So `updated_at` says when a
   copy REACHED the hub, never when it was edited. A template saved
   while signed out and pushed on Friday reads Friday, though nothing
   changed since Tuesday. Comparing it with a local savedAt would
   call every late push "newer" and pull the whole library down on
   every load. Two things stand in for it:
     • per template, the `updated_at` this browser last pushed or
       pulled ('csync:' in the store) — the hub moving past that is a
       change made somewhere else;
     • the copy's own stamp, carried INSIDE the doc (tplStamp below;
       the working draft's `savedAt`) — the last word on which of two
       copies was edited later.
   ============================================================ */

/* A hub copy reached the hub this long after its save and still counts as
   that save's own push: uploads get up to 5 min (cloud.js uploadBudgetMs). */
const PUSH_SLACK_MS = 10 * 60000;

/* When a template was last CHANGED. savedAt moves on Save only (the library
   sorts by it); changedAt moves on every write to the record — archive,
   restore, import — so those reach the other machines too. Archiving used to
   leave savedAt alone, which made a failed archive push look up to date
   forever. */
function tplStamp(t){
  if(!t) return 0;
  return Math.max(+t.changedAt || 0, +t.savedAt || 0);
}

/* A listing row's (or a fetched doc's) updated_at as epoch ms; 0 if none. */
function listedAt(d){
  if(!d) return 0;
  const u = d.updated_at != null ? d.updated_at : d.updatedAt;
  return typeof u==='number' ? u : (Date.parse(u||'') || 0);
}

/* 'tpl:<id>' → '<id>'; anything else (the working draft) → null. */
function tplIdOf(d){
  const docId = d && (d.doc_id || d.docId);
  return (typeof docId==='string' && docId.indexOf('tpl:')===0) ? docId.slice(4) : null;
}

/* What a pull should fetch. `docs` is the hub's metadata list, `local` this
   browser's templates, `synced` { id: updated_at last pushed or pulled here }.
     missing — not on this disk;
     changed — the hub has moved past what this browser last synced;
     check   — no record yet (a library from before records were kept) and
               the hub copy landed well after the local save: maybe an edit
               from elsewhere, maybe only a late push. Fetched once to see.
   Everything else is in step; a template with no record yet is ADOPTED at
   the listed time, so the next pull has something to compare against.
   Newest first, like the listing. → { fetch:[{id, docId, at, why}], adopt:{id:at} } */
function planPull(docs, local, synced){
  const have = {};
  (local||[]).forEach(t=>{ if(t && t.id) have[t.id] = t; });
  synced = synced || {};
  const fetch = [], adopt = {};
  (docs||[]).forEach(d=>{
    const id = tplIdOf(d);
    if(!id) return;
    const at = listedAt(d), t = have[id];
    const row = { id, docId:'tpl:'+id, at };
    if(!t){ fetch.push(Object.assign(row, { why:'missing' })); return; }
    const last = synced[id];   // a number, or no record (anything else counts as none)
    if(typeof last==='number'){ if(at > last) fetch.push(Object.assign(row, { why:'changed' })); return; }
    if(at > tplStamp(t) + PUSH_SLACK_MS) fetch.push(Object.assign(row, { why:'check' }));
    else adopt[id] = at;
  });
  fetch.sort((a,b)=>b.at - a.at);
  return { fetch, adopt };
}

/* Does the hub's copy replace the one on this disk? Only when it was changed
   later. Equal stamps are the same save (or a tie nobody can call): keep
   what's here. */
function isNewerCopy(local, incoming){
  if(!incoming) return false;
  if(!local) return true;
  return tplStamp(incoming) > tplStamp(local);
}

/* The hub keeps photos cut to 860px; this disk keeps them full size. When a
   newer copy of a template comes down, every photo in it that is the 860px
   cut of one this disk already has for that template goes back to the local
   full-size reference — an edit to the words elsewhere mustn't shrink the
   pictures here. A photo replaced elsewhere matches nothing and comes in as
   sent. `slimOf(ref)` → the exact data URL that photo goes up to the hub as
   (studio-store's slimSrc, so cut the same way, on this machine). Never
   throws. → { tpl, kept } */
const PHOTO_KEYS = ['src', 'src2'];
const isRefSrc = (v)=> typeof v==='string' && v.indexOf('ref:')===0;
async function keepLocalPhotos(local, incoming, slimOf){
  const none = { tpl: incoming, kept: 0 };
  try{
    const ld = local && local.doc, inc = incoming && incoming.doc;
    if(!ld || !Array.isArray(ld.elements) || !inc || !Array.isArray(inc.elements)) return none;
    const refs = new Set();
    ld.elements.forEach(el=>{ if(el) PHOTO_KEYS.forEach(k=>{ if(isRefSrc(el[k])) refs.add(el[k]); }); });
    if(!refs.size) return none;
    const bySlim = new Map();
    for(const r of refs){
      try{ const s = await slimOf(r); if(typeof s==='string' && s && s!==r) bySlim.set(s, r); }catch(e){}
    }
    if(!bySlim.size) return none;
    let kept = 0;
    const els = inc.elements.map(el=>{
      if(!el) return el;
      let patch = null;
      PHOTO_KEYS.forEach(k=>{
        const v = el[k];
        if(typeof v==='string' && bySlim.has(v)){ (patch || (patch = {}))[k] = bySlim.get(v); kept++; }
      });
      return patch ? Object.assign({}, el, patch) : el;
    });
    if(!kept) return none;
    return { tpl: Object.assign({}, incoming, { doc: Object.assign({}, inc, { elements: els }) }), kept };
  }catch(e){ return none; }
}

/* A putDoc result (with { detail:true }) → null on success, else why it
   failed: tooBig (413, over the hub's 5M-character cap) · signedOut (401) ·
   timeout · offline (never answered) · server (anything else). */
function classifyPush(r){
  if(r && r.ok !== false) return null;
  const status = (r && r.status) || 0;
  const why = !r ? 'offline'
    : r.tooBig || status===413 ? 'tooBig'
    : r.signedOut || status===401 ? 'signedOut'
    : r.timedOut ? 'timeout'
    : status===0 ? 'offline'
    : 'server';
  const out = { why, status };
  if(r && r.bytes) out.bytes = r.bytes;
  return out;
}

/* Is the hub's working draft newer than the one on screen? savedAt (stamped
   into every draft this build pushes) against the time the local copy was
   last edited — not against when this tab opened, which never offered a draft
   saved elsewhere before the tab was opened, and so let this tab's stale copy
   overwrite it. A draft from an older build has no savedAt; its updated_at
   (the hub's clock, never earlier than the edit) stands in, which leans
   towards offering — the safe way to be wrong. */
function draftIsNewer(remoteDoc, remoteUpdatedAt, localAt){
  const remoteAt = +(remoteDoc && remoteDoc.savedAt) || listedAt({ updatedAt: remoteUpdatedAt });
  return remoteAt > (+localAt || 0);
}

/* When the working draft may go up. Two rules, Schedule Studio's (app-cloud.jsx):
     1. nothing goes up until the sign-in check against the hub's draft has
        FINISHED — opening a stale laptop no longer uploads its stale copy
        two seconds after load;
     2. then only after a real edit made here. The doc as it loaded is not
        one, nor is the hub's draft being loaded, nor what was on screen when
        "Load the newer draft?" was cancelled. The one exception: the check
        found the hub's draft OLDER than this one (ahead) — an edit made
        while signed out, or a push that never landed — and that goes up.
   `at` is when the poster on screen was last edited — the boot record's time,
   then every edit's — and goes up inside the draft as its savedAt. */
function makeDraftGate(bootAt){
  const g = {
    ready: false, dirty: false, at: +bootAt || 0,
    skip: 1,                                   // the first doc the hook sees is the boot doc
    changed(now){                              // the doc changed; true if that was an edit
      if(g.skip > 0){ g.skip--; return false; }
      g.dirty = true; g.at = +now || Date.now(); return true;
    },
    reset(){ g.ready = false; },               // signed out / in again: check before pushing
    checked(){ g.ready = true; },
    adopt(at){ g.dirty = false; g.skip = 1; g.at = +at || g.at; },   // loading the hub's draft
    keepLocal(){ g.dirty = false; },           // "Load it?" cancelled
    ahead(){ g.dirty = true; },                // the hub's draft is older than this one
    take(){ if(!g.ready || !g.dirty) return false; g.dirty = false; return true; },
    failed(){ g.dirty = true; },               // a push that didn't land goes again
  };
  return g;
}

/* ---- the topbar's cloud chip (panels/topbar.jsx) -------------------------
   SaveState's cloud half. Sync used to fail in silence three ways:
   the 12-hour sign-in ran out and the topbar went on showing the email; a
   template over the hub's size cap stayed local with a console line; a push
   that timed out or hit a hub error just didn't happen. Each now gets one
   chip here, the worst first — and nothing when all is well. Everything it
   reports is still saved in this browser; only the cloud copy is behind.
   → { cls, label, tip, act } or null. act = 'signin' | 'retry' | null. */
const quote = (n)=>'“'+(n || 'Untitled')+'”';
function listNames(arr){
  const n = arr.map(f=>quote(f.name));
  return n.length<=3 ? n.join(', ') : n.slice(0,3).join(', ')+' and '+(n.length-3)+' more';
}
const WHY_TEXT = { timeout:'it timed out', offline:'no connection', signedOut:'the hub refused the sign-in', server:'hub error' };
function cloudState(auth, issues, draftIssue){
  if(auth && !auth.signedIn && auth.lapsed){
    const who = auth.lapsed.email ? ' ('+auth.lapsed.email+')' : '';
    return { cls:'error', label:'Signed out', act:'signin',
      tip: (auth.lapsed.reason==='rejected'
        ? 'The REALITY hub stopped accepting this sign-in'+who+', so nothing has gone to the cloud since.'
        : 'The sign-in to the REALITY hub'+who+' ran out (it lasts 12 hours), so nothing has gone to the cloud since.')
        +' Everything is still saved in this browser. Sign in again and it catches up.' };
  }
  if(!auth || !auth.signedIn) return null;
  const failed = (issues && issues.failed) || [];
  const big = failed.filter(f=>f.why==='tooBig'), other = failed.filter(f=>f.why!=='tooBig');
  const draftBig = draftIssue && draftIssue.why==='tooBig';
  if(other.length || (draftIssue && !draftBig)){
    const parts = [];
    if(other.length) parts.push(listNames(other)+' didn’t reach the cloud ('+Array.from(new Set(other.map(f=>WHY_TEXT[f.why]||f.why))).join(', ')+').');
    if(draftIssue && !draftBig) parts.push('The poster on screen didn’t reach the cloud ('+(WHY_TEXT[draftIssue.why]||draftIssue.why)+').');
    return { cls:'error', label:'Sync failed', act:'retry',
      tip: parts.join(' ')+' It’s all saved in this browser. Retry sends it again; so does the next load.' };
  }
  if(big.length || draftBig){
    const mb = (f)=> f.bytes ? ' ('+(f.bytes/1e6).toFixed(1)+'M characters with its photos; the hub takes 5M)' : '';
    /* the topbar has room for the consequence and the name; why is on hover */
    const label = big.length===1 && !draftBig ? 'Not in cloud: '+quote(big[0].name)
      : !big.length ? 'Not in cloud: this poster'
      : 'Not in cloud: '+(big.length + (draftBig?1:0))+' posters';
    const lines = big.map(f=>quote(f.name)+mb(f));
    if(draftBig) lines.push('the poster on screen'+mb(draftIssue));
    return { cls:'fallback', label, act:null,
      tip: 'Too big for the hub: '+lines.join('; ')+'. Saved in this browser only. Fewer or smaller photos will get it under; it goes up on the next save.' };
  }
  if(auth.soon){
    const ends = auth.expiresAt ? new Date(auth.expiresAt).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' }) : '';
    return { cls:'fallback', label:'Sign-in ends in '+(auth.mins||0)+' min', act:'signin',
      tip: 'The sign-in to the REALITY hub ends'+(ends? ' at '+ends : ' soon')+'. Sign in again now to keep syncing without a gap.' };
  }
  return null;
}

export { PUSH_SLACK_MS, cloudState, tplStamp, listedAt, tplIdOf, planPull, isNewerCopy, keepLocalPhotos,
         classifyPush, draftIsNewer, makeDraftGate };
