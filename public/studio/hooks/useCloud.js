/* ============================================================
   REALITY POSTER STUDIO — useCloud
   useCloudSession: who is signed in (and whether that is running out),
   what didn't reach the hub, and the topbar's progress line.
   useCloud: sign in / out, the working-doc push, and the newer-draft check.
   ============================================================ */
import { RCloud } from '../../studio-shared/cloud.js';
import { RStore } from '../studio-store.js';
import { stampEngine, sortTpls, applyTextRule, bootState } from '../doc.js';
import { internDoc } from '../photos.js';
import { classifyPush, draftIsNewer, listedAt, makeDraftGate } from '../cloud-sync.js';

/* RCloud.authInfo() plus whole minutes left — the topbar's "ends in 9 min"
   has to move on, so the minutes are part of what counts as a change. */
function readAuth(){
  try{
    const a = RCloud && RCloud.authInfo ? RCloud.authInfo() : null;
    if(!a) return null;
    return Object.assign({}, a, { mins: a.expiresAt ? Math.max(0, Math.ceil((a.expiresAt - Date.now())/60000)) : null });
  }catch(e){ return null; }
}
const authKey = (a)=> a ? [a.signedIn, a.email, a.soon, a.mins, a.lapsed && a.lapsed.reason, a.lapsed && a.lapsed.email].join('|') : '';

function useCloudSession(){
  /* ---- WP9 cloud sign-in state (best-effort; this browser's IndexedDB stays
     the source of truth). `cloudUser` is for the toolbar label; null =
     local-only.
     It used to be set on sign-in and sign-out only, so when the 12-hour token
     ran out (or the hub refused it) the topbar went on showing the email while
     every push quietly did nothing. It follows RCloud.onAuth now, and looks
     again every 30s and whenever the tab comes back: a token runs out on the
     clock, not on a request, and reading it is what notices. `auth.lapsed` is
     the account that was signed out without being asked; `auth.soon`, the
     last 15 minutes. ---- */
  const [auth, setAuth] = React.useState(readAuth);
  const refreshAuth = React.useCallback(()=>{
    setAuth(prev=>{ const n = readAuth(); return authKey(n)===authKey(prev) ? prev : n; });
  }, []);
  React.useEffect(()=>{
    if(!RCloud || !RCloud.onAuth) return;
    const off = RCloud.onAuth(refreshAuth);
    const iv = setInterval(refreshAuth, 30000);
    const onVis = ()=>{ if(document.visibilityState==='visible') refreshAuth(); };
    document.addEventListener('visibilitychange', onVis);
    return ()=>{ try{ off(); }catch(e){} clearInterval(iv); document.removeEventListener('visibilitychange', onVis); };
  }, []);
  /* …and on the dot: at the 15-minute mark and the moment it runs out, so the
     chip doesn't wait up to half a minute for the next look. */
  const expiresAt = auth && auth.signedIn ? auth.expiresAt : null;
  React.useEffect(()=>{
    if(!expiresAt) return;
    const ts = [expiresAt - 15*60000, expiresAt + 50].map(at=>at - Date.now())
      .filter(ms=>ms > 0 && ms < 2147483647).map(ms=>setTimeout(refreshAuth, ms));
    return ()=>{ ts.forEach(clearTimeout); };
  }, [expiresAt]);
  const cloudUser = auth && auth.signedIn ? (auth.email || 'signed in') : null;

  /* What didn't reach the hub: templates (RStore keeps those, across reloads)
     and the working draft (this tab's last push). Shown in the topbar. */
  const [tplIssues, setTplIssues] = React.useState({ failed:[], pushing:0 });
  React.useEffect(()=>{
    try{ if(RStore && RStore.onCloudIssues) return RStore.onCloudIssues(setTplIssues); }catch(e){}
  }, []);
  const [draftIssue, setDraftIssue] = React.useState(null);

  /* Restoring a library onto a new computer is one request per template — say so,
     rather than looking idle for a few minutes. */
  const [cloudMsg, setCloudMsg] = React.useState(null);
  const cloudProgress = React.useCallback((done, total)=>{
    setCloudMsg(done>=total ? null : 'Syncing '+done+'/'+total+'…');
  }, []);

  return { cloudUser, auth, refreshAuth, tplIssues, draftIssue, setDraftIssue, cloudMsg, setCloudMsg, cloudProgress };
}

function useCloud({ session, doc, docRef, setDoc, setSelectedIds, setUserTpls, forgetTplThumb }){
  const { cloudUser, refreshAuth, draftIssue, setDraftIssue, setCloudMsg, cloudProgress } = session;
  async function cloudSignIn(){
    try{
      if(!RCloud) return;
      const t = await RCloud.signIn();
      refreshAuth();
      // on connect: migrate THIS browser's templates UP to the account, then pull any
      // the account has that this browser lacks or has an older copy of. Both
      // best-effort; never throw.
      if(t && RStore){
        try{ if(RStore.cloudPushAll) await RStore.cloudPushAll(); }catch(e){}
        try{ if(RStore.cloudPull) await RStore.cloudPull(cloudProgress, forgetTplThumb); }catch(e){}
        /* Re-read the store rather than taking the pull's own list — same reason
           as the loader: that list predates the round-trip, and signing in
           mid-session must not roll the library back over a save made while the
           restore was running. */
        try{ const after = await RStore.tplGetAll();
          if(Array.isArray(after) && after.length) setUserTpls(sortTpls(after)); }catch(e){}
        finally{ setCloudMsg(null); }
      }
    }catch(e){ /* never throws into render */ }
  }
  /* Signing out (or the token running out) re-arms the "newer draft in the
     cloud?" check below: the check effect runs on every cloudUser change, and
     nothing goes up until it has finished again. */
  function cloudSignOut(){ try{ if(RCloud) RCloud.signOut(); }catch(e){}
    setDraftIssue(null); refreshAuth(); }

  /* ---- WP9 working-doc cloud sync — beside the IndexedDB autosave.
     Debounced ~2s push of the working doc to studio_documents (poster/working).
     IndexedDB is the offline source of truth; this is purely additive and
     fully guarded (RCloud no-ops when signed-out / hub dormant). Photos go up
     re-cut to 860px (RStore.slimDocForCloud) — the hub's per-doc cap didn't
     grow when the local photo size did. The doc on screen holds photo
     references; slimDocForCloud sends each as the inline data URL it stands
     for, so the cloud copy is exactly what it always was.
     This used to push 2s after ANY change — the doc that had just loaded
     included — and to compare the hub's draft with the time the tab opened.
     So a laptop opened with yesterday's draft offered nothing (the hub's copy,
     saved this morning on the other machine, was "older" than the tab) and
     then overwrote it. The gate (cloud-sync.js makeDraftGate) holds every push
     until the check against the hub has finished, and then sends only real
     edits; each draft carries its own savedAt. Schedule Studio's rules. ---- */
  const gateRef = React.useRef(null);
  if(!gateRef.current) gateRef.current = makeDraftGate(bootState.at);
  const gate = gateRef.current;
  const [cloudReady, setCloudReady] = React.useState(false);
  const [pushTick, setPushTick] = React.useState(0);
  React.useEffect(()=>{ gate.changed(Date.now()); }, [doc]);   // before the push effect: same commit, declared first
  const cloudPushRef = React.useRef(null);
  React.useEffect(()=>{
    if(!cloudUser || !RCloud || !cloudReady || !gate.dirty) return;
    if(cloudPushRef.current) clearTimeout(cloudPushRef.current);
    cloudPushRef.current = setTimeout(()=>{
      if(!gate.take()) return;
      try{
        const d = stampEngine(docRef.current), at = gate.at || Date.now();
        const slim = RStore && RStore.slimDocForCloud ? RStore.slimDocForCloud(d) : Promise.resolve(d);
        Promise.resolve(slim)
          .then(sd=>RCloud.putDoc('poster','working', d.title||'', Object.assign({}, sd, { savedAt: at }), at, { detail:true }))
          .then(r=>{ const f = classifyPush(r); if(f) gate.failed(); setDraftIssue(f); },
                ()=>{ gate.failed(); setDraftIssue({ why:'offline', status:0 }); })
          .catch(()=>{});
      }catch(e){ gate.failed(); }
    }, 2000);
    return ()=>{ if(cloudPushRef.current) clearTimeout(cloudPushRef.current); };
  }, [doc, cloudUser, cloudReady, pushTick]);
  /* The topbar's Retry: the draft again now (edit or no edit) if it was what
     failed, and every failed template. */
  function cloudRetry(){
    if(draftIssue){ gate.failed(); setPushTick(n=>n+1); }
    try{ if(RStore && RStore.cloudRetry) RStore.cloudRetry(); }catch(e){}
  }

  /* On mount (and on every sign-in), if the hub's working draft was edited
     AFTER the one on screen, offer a one-line confirm before replacing it
     (last-write-wins, no merge). Cancel keeps this copy and pushes nothing
     until you edit here. Guarded so a hub error can't disturb the app; the
     push gate opens when this has finished, however it finished. */
  React.useEffect(()=>{
    gate.reset(); setCloudReady(false);
    if(!cloudUser || !RCloud) return;
    let live = true;
    (async()=>{
      try{
        const remote = await RCloud.getDoc('poster','working');
        if(!live || !remote) return;
        let remoteDoc = remote.json;
        if(typeof remoteDoc==='string'){ try{ remoteDoc = JSON.parse(remoteDoc); }catch(e){ remoteDoc = null; } }
        if(!remoteDoc || !remoteDoc.elements) return;
        /* Same poster as the one on screen (photos aside — the cloud copy's are
           re-cut smaller) → nothing to offer. Catches this tab's own push
           coming back after a sign-out/in, whatever the clocks say. */
        const sig = (d)=>{ try{ return JSON.stringify([d.elements, d.overrides||{}, d.theme, d.accent, d.title||''],
          (k,v)=>(k==='src'||k==='src2') ? (v?1:0) : v); }catch(e){ return Math.random(); } };
        if(sig(remoteDoc)===sig(docRef.current)) return;
        const remoteAt = +remoteDoc.savedAt || listedAt(remote);
        /* older than this copy: this one goes up (an edit made signed out, or
           a push that never landed — the draft's "Retry on the next load") */
        if(!draftIsNewer(remoteDoc, remote.updatedAt, gate.at)){ if(gate.at > remoteAt) gate.ahead(); return; }
        /* house date (d.m.yy, no leading zeros) + the laptop's own time */
        const on = new Date(remoteAt);
        const when = on.getDate()+'.'+(on.getMonth()+1)+'.'+String(on.getFullYear()).slice(2)+' '+on.toLocaleTimeString();
        if(window.confirm('The cloud has a newer Poster Studio draft'+(remoteDoc.title? ', “'+remoteDoc.title+'”' : '')+' (last edited '+when+').\n\nLoad it? This replaces what’s on screen — Ctrl+Z brings this copy back.\n\nCancel keeps this copy; the cloud draft is only overwritten once you edit here.')){
          /* the draft's photos are inline — they come in as references */
          let incoming = remoteDoc;
          try{ incoming = await internDoc(remoteDoc); }catch(e){}
          incoming = applyTextRule(incoming);
          if(!live) return;
          const { savedAt, ...rest } = incoming;   // the stamp rides the push, not the doc
          gate.adopt(remoteAt);
          setDoc(d=>Object.assign({}, d, rest));
          setSelectedIds([]);
        } else gate.keepLocal();
      }catch(e){ /* local-only on any failure */ }
      finally{ if(live){ gate.checked(); setCloudReady(true); } }
    })();
    return ()=>{ live=false; };
  }, [cloudUser]);

  return { cloudSignIn, cloudSignOut, cloudRetry };
}

export { useCloudSession, useCloud };
