/* ============================================================
   REALITY POSTER STUDIO — useCloud
   useCloudSession: who is signed in, and the topbar's progress line.
   useCloud: sign in / out, the working-doc push, and the newer-draft check.
   ============================================================ */
import { RCloud } from '../../studio-shared/cloud.js';
import { RStore } from '../studio-store.js';
import { stampEngine, sortTpls } from '../doc.js';
function useCloudSession(){
  /* ---- WP9 cloud sign-in state (best-effort; this browser's IndexedDB stays
     the source of truth). `cloudUser` is just for the toolbar label; null =
     local-only. ---- */
  const [cloudUser, setCloudUser] = React.useState(()=>{ try{ return RCloud && RCloud.isSignedIn() ? (RCloud.currentEmail()||'signed in') : null; }catch(e){ return null; } });
  /* Restoring a library onto a new computer is one request per template — say so,
     rather than looking idle for a few minutes. */
  const [cloudMsg, setCloudMsg] = React.useState(null);
  const cloudProgress = React.useCallback((done, total)=>{
    setCloudMsg(done>=total ? null : 'Restoring '+done+'/'+total+'…');
  }, []);

  return { cloudUser, setCloudUser, cloudMsg, setCloudMsg, cloudProgress };
}

function useCloud({ session, doc, docRef, setDoc, setSelectedIds, setUserTpls }){
  const { cloudUser, setCloudUser, setCloudMsg, cloudProgress } = session;
  async function cloudSignIn(){
    try{
      if(!RCloud) return;
      const t = await RCloud.signIn();
      const email = t ? (RCloud.currentEmail()||'signed in') : null;
      setCloudUser(email);
      // on connect: migrate THIS browser's templates UP to the account, then pull any
      // the account has that this browser lacks. Both best-effort; never throw.
      if(email && RStore){
        try{ if(RStore.cloudPushAll) await RStore.cloudPushAll(); }catch(e){}
        try{ if(RStore.cloudPull) await RStore.cloudPull(cloudProgress); }catch(e){}
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
  /* Signing out re-arms the "newer draft in the cloud?" check below. It used to
     run once per page load, full stop, so signing out and back in (say, into
     the other account) never looked for that account's draft. The session
     clock restarts too: a draft this tab pushed before signing out is not
     "newer" than what's on screen. */
  function cloudSignOut(){ try{ if(RCloud) RCloud.signOut(); }catch(e){}
    cloudPullDoneRef.current = false; sessionStartRef.current = Date.now();
    setCloudUser(null); }

  /* ---- WP9 working-doc cloud sync — beside the IndexedDB autosave above.
     Debounced ~2s push of the working doc to studio_documents (poster/working).
     IndexedDB is the offline source of truth; this is purely additive and
     fully guarded (RCloud no-ops when signed-out / hub dormant). Photos go up
     re-cut to 860px (RStore.slimDocForCloud) — the hub's per-doc cap didn't
     grow when the local photo size did. ---- */
  const cloudPushRef = React.useRef(null);
  React.useEffect(()=>{
    if(!cloudUser || !RCloud) return;
    if(cloudPushRef.current) clearTimeout(cloudPushRef.current);
    cloudPushRef.current = setTimeout(()=>{
      try{
        const d = stampEngine(docRef.current);
        const slim = RStore && RStore.slimDocForCloud ? RStore.slimDocForCloud(d) : Promise.resolve(d);
        Promise.resolve(slim).then(sd=>RCloud.putDoc('poster','working', d.title||'', sd, Date.now())).catch(()=>{});
      }catch(e){}
    }, 2000);
    return ()=>{ if(cloudPushRef.current) clearTimeout(cloudPushRef.current); };
  }, [doc, cloudUser]);

  /* On mount (and on sign-in), if the cloud has a working doc saved AFTER this
     session loaded the local copy, offer a one-line confirm before replacing
     (last-write-wins, no merge). We compare against the session start: a cloud
     doc newer than that came from another device/tab. Guarded so a hub error
     can't disturb the app. */
  const sessionStartRef = React.useRef(Date.now());
  const cloudPullDoneRef = React.useRef(false);
  React.useEffect(()=>{
    if(!cloudUser || !RCloud || cloudPullDoneRef.current) return;
    cloudPullDoneRef.current = true;
    let live = true;
    (async()=>{
      try{
        const remote = await RCloud.getDoc('poster','working');
        if(!live || !remote) return;
        const remoteAt = typeof remote.updatedAt==='number' ? remote.updatedAt : Date.parse(remote.updatedAt||'')||0;
        let remoteDoc = remote.json;
        if(typeof remoteDoc==='string'){ try{ remoteDoc = JSON.parse(remoteDoc); }catch(e){ remoteDoc = null; } }
        /* Same poster as the one on screen (photos aside — the cloud copy's are
           re-cut smaller) → nothing to offer. Catches this tab's own push
           coming back after a sign-out/in, whatever the clocks say. */
        const sig = (d)=>{ try{ return JSON.stringify([d.elements, d.overrides||{}, d.theme, d.accent, d.title||''],
          (k,v)=>(k==='src'||k==='src2') ? (v?1:0) : v); }catch(e){ return Math.random(); } };
        if(remoteDoc && remoteDoc.elements && sig(remoteDoc)===sig(docRef.current)) return;
        if(remoteDoc && remoteDoc.elements && remoteAt > sessionStartRef.current){
          if(window.confirm('A newer Poster Studio working draft was found in the cloud. Load it? (Replaces what’s on screen.)')){
            setDoc(d=>Object.assign({}, d, remoteDoc));
            setSelectedIds([]);
          }
        }
      }catch(e){ /* local-only on any failure */ }
    })();
    return ()=>{ live=false; };
  }, [cloudUser]);

  return { cloudSignIn, cloudSignOut };
}

export { useCloudSession, useCloud };
