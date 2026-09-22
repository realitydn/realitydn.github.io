/* ============================================================
   REALITY POSTER STUDIO — useLibrary
   My templates (IndexedDB), Recently deleted, card pictures, import / export, the starters.
   ============================================================ */
import { RCloud } from '../../studio-shared/cloud.js';
import { RStore } from '../studio-store.js';
import { uid, buildTemplate as apBuildTpl } from '../studio-data.jsx';
import { tplId, sortTpls, stampEngine, loadUserTpls } from '../doc.js';
function useLibrary({ docRef, setDoc, setSelectedIds, setCloudMsg, cloudProgress }){
  /* ---- My templates — save / load / delete full poster snapshots.
     The library lives in IndexedDB (window.RStore) — room for gigabytes, so
     it no longer hits localStorage's ~5MB wall. On first load it copies any
     old localStorage library in and keeps that copy untouched as a backup;
     if IndexedDB is unavailable it falls back to showing the localStorage
     copy read-only so nothing is ever hidden. ---- */
  const [userTpls, setUserTpls] = React.useState([]);
  const userTplsRef = React.useRef([]); userTplsRef.current = userTpls;   // read by the queue / deep link
  const [tplReady, setTplReady] = React.useState(false);
  /* Non-null when the IndexedDB library could not be read — the panel is then
     showing the legacy localStorage backup, and says so. */
  const [tplStoreErr, setTplStoreErr] = React.useState(null);
  /* Recently deleted — the last few templates that left the library by any
     route (Delete, saved over, displaced by an import). */
  const [tplBin, setTplBin] = React.useState([]);
  const refreshBin = React.useCallback(async ()=>{
    try{ const b = await RStore.binGetAll(); setTplBin(Array.isArray(b)?b:[]); }catch(e){}
  }, []);
  /* Put one back. If its id has since been taken by a different template, the
     restored copy gets a new one rather than overwriting the sitting tenant. */
  async function restoreFromBin(entry){
    if(!entry || !entry.tpl) return;
    const taken = userTpls.some(t=>t.id===entry.tpl.id);
    const t = Object.assign({}, entry.tpl, taken ? { id: tplId() } : null);
    try{ await RStore.tplPut(t); }
    catch(e){ console.error(e); window.alert('Couldn’t put that template back right now — try again.'); return; }
    try{ await RStore.binDelete(entry.id); }catch(e){}
    setUserTpls(prev=>{
      const i = prev.findIndex(p=>p.id===t.id);
      if(i<0) return [t, ...prev];
      const next = prev.slice(); next[i]=t; return next;
    });
    refreshBin();
  }
  /* Ask the account for everything it has that this browser hasn't. The load
     path already tries this quietly and gives up silently on any hub error;
     this one reports what it found, so "the hub hasn't got it either" is
     something you can see rather than infer. */
  const [restoring, setRestoring] = React.useState(false);
  async function restoreFromCloud(){
    if(restoring) return;
    if(!RCloud || !RCloud.isSignedIn()){
      window.alert('Sign in to the REALITY hub first (top right) — that’s where the off-machine copies live.');
      return;
    }
    setRestoring(true); setCloudMsg('Checking the hub…');
    try{
      const r = await RStore.cloudRestore((done,total)=>setCloudMsg('Restoring '+done+'/'+total+'…'));
      try{ const after = await RStore.tplGetAll();
        if(Array.isArray(after) && after.length) setUserTpls(sortTpls(after)); }catch(e){}
      window.alert(r.restored
        ? 'Restored '+r.restored+' template'+(r.restored===1?'':'s')+' from the hub.'
          +(r.failed? ' '+r.failed+' couldn’t be read.':'')
        : 'Nothing to restore — the hub holds '+r.hub+' template'+(r.hub===1?'':'s')
          +' and this browser already has all of them.'
          +(r.hub? '\n\nIf something is still missing it was never mirrored to the hub (a photo-heavy template can exceed the hub’s per-document cap) or it was deleted from both. Check Recently deleted.' : ''));
    }catch(e){
      console.error(e);
      window.alert('Couldn’t reach the hub just now — nothing was changed. Check the connection and try again.');
    }finally{ setRestoring(false); setCloudMsg(null); }
  }
  /* Card pictures, { [id]: {src,w,h} } — a derived, local-only cache (see
     RStore's thumbnail notes). Missing ones are shot by the card that wants
     them, so an existing library fills itself in as you open its days. */
  const [tplThumbs, setTplThumbs] = React.useState({});
  const captureTplThumb = React.useCallback((id, thumb)=>{
    if(!id || !thumb) return;
    setTplThumbs(m => m[id] ? m : Object.assign({}, m, { [id]:thumb }));
    try{ Promise.resolve(RStore.thumbPut(id, thumb)).catch(()=>{}); }catch(e){}
  }, []);
  /* Forget a card's picture — the template it drew is gone or has been saved
     over, and a stale thumbnail showing the poster it replaced is worse than a
     card that simply redraws itself. */
  const forgetTplThumb = React.useCallback((id)=>{
    setTplThumbs(m=>{ if(!m[id]) return m; const n = Object.assign({}, m); delete n[id]; return n; });
  }, []);
  React.useEffect(()=>{ let live=true; (async()=>{
    try{
      const m = await RStore.migrate();
      const local = await RStore.tplGetAll();
      /* Show what's on THIS disk immediately, before the cloud round-trip.
         That trip spends one request per template it has to restore and can run
         for minutes; the library used to stay empty for all of it, and two
         things went wrong in that window. A save made during it was checked for
         a name clash against an empty list — so it made a SECOND copy under the
         same name instead of replacing the first — and was then wiped off the
         list by `setUserTpls(all)`, a snapshot read before the save happened.
         From the outside that is a save that didn't take. Local disk is the
         source of truth and it is right here, so it goes up first. */
      if(!live) return;
      setUserTpls(sortTpls(local));
      setTplReady(true);
      if(m && m.migrated) console.info('[studio] moved '+m.migrated+' template(s) into IndexedDB; the old localStorage copy is kept as a backup.');
      /* That backup has sat in localStorage ever since — megabytes, in the box
         Print and Schedule Studio still write to. Once it's provably filed in
         IndexedDB (verbatim, read back, every id present) it's freed there.
         Best-effort: anything it can't prove, it leaves exactly where it is. */
      try{
        const rt = RStore.retireLegacyTpls ? await RStore.retireLegacyTpls() : null;
        if(rt && rt.retired) console.info('[studio] filed the localStorage template backup ('+rt.retired+' templates, '
          +Math.round(rt.bytes/1024)+' KB; '+rt.live+' still live) in IndexedDB and freed it from localStorage.');
        else if(rt && rt.kept) console.info('[studio] kept the localStorage template backup where it is: '+rt.kept+'.');
      }catch(e){ console.warn('[studio] could not retire the localStorage template backup — left in place.', e); }
      /* One read for the whole library's card pictures. Best-effort: without
         them every card just renders itself live, exactly as it used to. */
      try{ const thumbs = await RStore.thumbGetAll(); if(live && thumbs) setTplThumbs(thumbs); }catch(e){}
      if(live) refreshBin();
      /* WP9: migrate this browser's library UP to the account, then pull any cloud
         templates this browser is missing. IndexedDB stays the source of truth —
         both calls never throw and no-op when signed-out / hub dormant. */
      try{ if(RStore.cloudPushAll) await RStore.cloudPushAll(); }catch(e){}
      try{ if(RStore.cloudPull) await RStore.cloudPull(cloudProgress); }catch(e){}
      if(live) setCloudMsg(null);
      /* Re-READ rather than trust what the pull returned: its list was taken
         before the round-trip, so a template saved while it ran is on disk but
         not in it. A non-empty read is the disk and replaces the list outright;
         an empty one is left alone, since Delete and Import are the only ways to
         empty the store and both update the list themselves. */
      try{
        const after = await RStore.tplGetAll();
        if(live && Array.isArray(after) && after.length) setUserTpls(sortTpls(after));
      }catch(e){}
    }catch(e){
      console.error('[studio] IndexedDB template store unavailable — showing the localStorage copy read-only.', e);
      /* Say so on screen. This used to be a console line only, so a single
         IndexedDB hiccup silently swapped the real library for the pre-migration
         localStorage copy — every template saved since the move to IndexedDB
         just wasn't there, with nothing on screen to say why. */
      if(live){ setTplStoreErr(String((e && e.message) || e || 'unknown error')); setUserTpls(loadUserTpls()); }
    }finally{ if(live){ setTplReady(true); setCloudMsg(null); } }
  })(); return ()=>{ live=false; }; }, []);

  async function saveUserTpl(){
    const d = docRef.current;
    if(!d.elements.length){ window.alert('Nothing on the poster to save yet.'); return; }
    const name = (window.prompt('Save this poster as a template called:', d.title || 'My layout') || '').trim();
    if(!name) return;
    /* The name match decides replace-vs-new, so it has to be made against the
       REAL library. Normally that's the on-screen list; if it hasn't landed yet
       ask the store instead of matching against nothing, which is how you end up
       with two templates under one name and one of them apparently missing. */
    let library = userTpls;
    if(!tplReady){
      try{ const fresh = await RStore.tplGetAll(); if(Array.isArray(fresh)) library = fresh; }catch(e){}
    }
    const existing = library.find(t=>t.name.toLowerCase()===name.toLowerCase());
    if(existing && !window.confirm('A template called “'+existing.name+'” already exists. Replace it?')) return;
    const snap = JSON.parse(JSON.stringify(stampEngine({ elements:d.elements, overrides:d.overrides||{},
      masterFormat:d.masterFormat, theme:d.theme, accent:d.accent, title:d.title||'',
      eventRef:d.eventRef||null })));
    /* eventId claims the queue entry that spawned this poster — saving files the
       template under its day and takes the event off "In queue". Saving always
       lands the template in the active library (never straight into Archive). */
    const t = { id: existing? existing.id : tplId(), name, savedAt: Date.now(),
      eventId: (d.eventRef && d.eventRef.key) || (existing && existing.eventId) || null,
      archived: false, doc: snap };
    /* Saving over a template overwrites a finished poster. Keep the version it
       replaces in Recently deleted first, so "replace it?" is undoable. */
    if(existing){ try{ await RStore.binPut(existing, 'saved over'); }catch(e){} }
    try{ await RStore.tplPut(t); }
    catch(e){ console.error(e); window.alert('Couldn’t save the template — the browser blocked writing to storage. Your other templates are unaffected.'); return; }
    /* Saving over a template replaces its artwork, so its card picture is now a
       photo of the poster you just overwrote — drop it and let the card reshoot.
       (Which also makes re-saving the way to fix a thumbnail you don't like.) */
    try{ await RStore.thumbDelete(t.id); }catch(e){}
    forgetTplThumb(t.id);
    /* Functional, like every other list write below. `userTpls` here is whatever
       this handler closed over when it started — and a save waits on a prompt, a
       confirm and an IndexedDB write, which is plenty of time for the loader or
       a sign-in to have replaced the list underneath it. Folding into `prev`
       means the two can't overwrite each other. */
    setUserTpls(prev=>{
      const i = prev.findIndex(p=>p.id===t.id);
      if(i<0) return [t, ...prev];
      const next = prev.slice(); next[i] = t; return next;
    });
    if(existing) refreshBin();
  }
  function applyUserTpl(t){
    if(docRef.current.elements.length &&
       !window.confirm('Replace the current poster with “'+t.name+'”?')) return;
    const snap = JSON.parse(JSON.stringify(t.doc));
    /* fresh element ids (and remapped overrides) so the loaded copy can never
       collide with anything else made this session */
    const idMap = {};
    snap.elements.forEach(e=>{ const nid=uid(); idMap[e.id]=nid; e.id=nid; });
    const overrides = {};
    Object.keys(snap.overrides||{}).forEach(f=>{ const fo=snap.overrides[f]||{}; const nfo={};
      Object.keys(fo).forEach(id=>{ if(idMap[id]) nfo[idMap[id]]=fo[id]; }); overrides[f]=nfo; });
    setDoc(d=>({ ...d, activeFormat:'master', masterFormat:snap.masterFormat||'4x5',
      elements:snap.elements, overrides, theme:snap.theme, accent:snap.accent,
      title: snap.title || d.title,
      /* restore the template's own event link (or none) — never inherit the
         previous poster's, or the cloud send would offer the wrong event */
      eventRef: snap.eventRef || null }));
    setSelectedIds([]);
  }
  /* Archive / restore — archived templates leave the day-filed library and sit
     in the collapsible Archive drawer below it. The flag rides the same record
     (and its cloud mirror), so nothing about storage changes shape. */
  async function setTplArchived(id, val){
    const t = userTpls.find(x=>x.id===id); if(!t) return;
    const next = Object.assign({}, t, { archived: !!val });
    try{ await RStore.tplPut(next); }
    catch(e){ console.error(e); window.alert('Couldn’t update that template right now — try again.'); return; }
    setUserTpls(prev=>prev.map(x=>x.id===id? next : x));
  }
  async function delUserTpl(id){
    const t = userTpls.find(x=>x.id===id);
    if(t && !window.confirm('Delete the template “'+t.name+'”?')) return;
    /* Into Recently deleted first — a mis-click on a 20px × next to a 20px ⤓
       used to be the end of that poster. */
    if(t){ try{ await RStore.binPut(t, 'deleted'); }catch(e){} }
    try{ await RStore.tplDelete(id); }
    catch(e){ console.error(e); window.alert('Couldn’t delete that template right now — try again.'); return; }
    forgetTplThumb(id);
    setUserTpls(prev=>prev.filter(x=>x.id!==id));
    refreshBin();
  }

  /* ---- template portability — templates live in this browser's localStorage
     only, so Export writes the whole "My templates" list to a .json (photo
     data URLs included) and Import merges a file back in on another machine.
     Same name or id replaces; anything else is added. */
  const tplFileRef = React.useRef(null);
  async function exportUserTpls(){
    /* Read the STORE. This used to write out whatever the panel was showing, so
       a backup taken while the library was still syncing was short — and a short
       backup imported later used to take the rest of the library with it. */
    let all = userTpls;
    try{ const fresh = await RStore.tplGetAll(); if(Array.isArray(fresh) && fresh.length) all = fresh; }
    catch(e){ console.error(e); }
    if(!all.length){ window.alert('No saved templates to export yet.'); return; }
    const payload = { kind:'reality-studio-templates', version:1,
      exportedAt:new Date().toISOString(), templates:sortTpls(all) };
    const blob = new Blob([JSON.stringify(payload)], { type:'application/json' });
    const url = URL.createObjectURL(blob);
    const d = new Date(), pad = n=>(n<10?'0':'')+n;
    const a = document.createElement('a'); a.href = url;
    a.download = 'reality-poster-templates-'+d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())+'.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(url), 4000);
  }
  function importUserTpls(file){
    const fr = new FileReader();
    fr.onload = async ()=>{
      let list = null;
      try{
        const data = JSON.parse(fr.result);
        list = Array.isArray(data) ? data : (data && Array.isArray(data.templates) ? data.templates : null);
      }catch(e){}
      if(!list){ window.alert('Couldn’t read that file — it doesn’t look like a Poster Studio template export.'); return; }
      const incoming = list
        .filter(t=>t && typeof t.name==='string' && t.name.trim() && t.doc && Array.isArray(t.doc.elements))
        .map(t=>({ id: t.id || tplId(), name: t.name.trim(), savedAt: t.savedAt || Date.now(),
                   eventId: t.eventId || null, archived: !!t.archived,
                   doc: Object.assign({ masterFormat:'4x5', theme:'day', accent:'blue', overrides:{}, title:'' }, t.doc) }));
      if(!incoming.length){ window.alert('No usable templates in that file.'); return; }
      const skipped = list.length - incoming.length;
      /* Merge against the STORE, never against the on-screen list.
         This used to build its result from `userTpls` and hand it to
         tplReplaceAll, which CLEARED the store and wrote back exactly that
         list — so importing while the library was short (it stayed empty for
         the whole of a cloud restore) permanently deleted every template that
         wasn't on screen at that instant. Nothing here clears anything, and
         an unreadable library aborts rather than guessing. */
      let current = [];
      try{ current = await RStore.tplGetAll(); }
      catch(e){ console.error(e);
        window.alert('Couldn’t read your library, so nothing was imported and nothing was changed. Reload the page and try again.');
        return; }
      /* A record the import supersedes by NAME under a different id has to go,
         or the same name sits in the library twice. Those go to Recently
         deleted first, and their cloud copies are left alone. */
      const drop = [];
      incoming.forEach(t=>{
        const clash = current.find(p=>p.id!==t.id && p.name.toLowerCase()===t.name.toLowerCase());
        if(clash && drop.indexOf(clash.id)<0) drop.push(clash.id);
      });
      const replaced = drop.length + incoming.filter(t=>current.some(p=>p.id===t.id)).length;
      for(const id of drop){
        const old = current.find(p=>p.id===id);
        if(old){ try{ await RStore.binPut(old, 'replaced by an import'); }catch(e){} }
      }
      try{ await RStore.tplApply(incoming, drop); }
      catch(e){ console.error(e); window.alert('Couldn’t save the imported templates to storage — nothing was changed.'); return; }
      /* Everything the file touched carries new artwork under an id that may
         already have a card picture — drop those, keep the rest. */
      try{
        const after = await RStore.tplGetAll();
        const touched = {}; incoming.forEach(t=>{ touched[t.id]=1; }); drop.forEach(id=>{ touched[id]=1; });
        const keep = after.filter(t=>!touched[t.id]).map(t=>t.id);
        await RStore.thumbPrune(keep);
        setTplThumbs(m=>{ const n={}; keep.forEach(id=>{ if(m[id]) n[id]=m[id]; }); return n; });
        setUserTpls(sortTpls(after));
      }catch(e){ console.error(e); }
      await refreshBin();
      window.alert('Imported '+incoming.length+' template'+(incoming.length===1?'':'s')
        +(replaced? ' — '+replaced+' replaced an existing one'+(replaced===1?'':'s'):'')
        +(skipped? ' ('+skipped+' unreadable, skipped)':'')
        +'.\n\nNothing else in your library was touched'
        +(drop.length? ', and the '+drop.length+' it replaced went to Recently deleted.':'.'));
    };
    fr.readAsText(file);
  }

  /* load a starting layout (replaces the current elements) */
  function applyTemplate(tpl){
    if(docRef.current.elements.length &&
       !window.confirm('Replace the current poster with the “'+tpl.name+'” layout?')) return;
    const built = apBuildTpl(tpl);
    /* keep the template's authored per-format nudges (they used to be dropped
       here), and detach any event link — this is a fresh, unqueued poster */
    setDoc(d=>({ ...d, masterFormat:'4x5', activeFormat:'master', overrides:built.overrides||{},
      elements:built.elements, theme:built.theme, accent:built.accent, eventRef:null }));
    setSelectedIds([]);
  }

  return { userTpls, setUserTpls, userTplsRef, tplReady, tplStoreErr, tplBin, restoreFromBin, restoring, restoreFromCloud,
    tplThumbs, captureTplThumb, saveUserTpl, applyUserTpl, setTplArchived, delUserTpl, tplFileRef, exportUserTpls,
    importUserTpls, applyTemplate };
}

export { useLibrary };
