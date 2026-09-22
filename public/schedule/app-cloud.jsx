/* ============================================================
   REALITY SCHEDULE STUDIO — app · useCloud: the draft in the REALITY hub
   Sign-in state, the debounced push of real edits, and the newer-copy
   offer on sign-in. Best-effort: every call no-ops when signed out.
   ============================================================ */
import { RCloud } from '../studio-shared/cloud.js';
import { normalizeDoc as a_norm, rangeLabel as a_rangeLabel } from './schedule-data.jsx';

function useCloud({ doc, docRef, dirtyRef, hist, setDocQuiet, setSelId, requestPull }){
  /* ---- WP9 cloud sync (best-effort; localStorage stays the source of truth) ----
     Debounced (~2s) push of the working doc to studio_documents (schedule/working).
     Two rules keep one device from flattening another's newer work:
       1. nothing is pushed until the sign-in pull + compare has FINISHED, and
          then only after a real edit made here (dirtyRef) — opening a stale
          laptop no longer uploads its stale copy two seconds after load;
       2. the compare is savedAt vs savedAt (when each copy was last EDITED),
          not "newer than this session started". A newer cloud copy is offered,
          never applied or overwritten silently.
     Every RCloud call no-ops when signed-out / hub dormant, so local-only
     behaviour is unchanged. ---- */
  const [cloudUser, setCloudUser] = React.useState(()=>{ try{ return RCloud && RCloud.isSignedIn() ? (RCloud.currentEmail()||'signed in') : null; }catch(e){ return null; } });
  const [cloudReady, setCloudReady] = React.useState(false);
  const cloudPushRef = React.useRef(null);
  React.useEffect(()=>{
    if(!cloudUser || !RCloud || !cloudReady || !dirtyRef.current) return;
    if(cloudPushRef.current) clearTimeout(cloudPushRef.current);
    cloudPushRef.current = setTimeout(()=>{
      const d = docRef.current;
      dirtyRef.current = false;   /* an edit during the upload sets it again */
      Promise.resolve(RCloud.putDoc('schedule','working', (d.header&&d.header.title)||'', d, d.savedAt||Date.now()))
        .then(ok=>{ if(!ok) dirtyRef.current = true; })
        .catch(()=>{ dirtyRef.current = true; });
    }, 2000);
    return ()=>{ if(cloudPushRef.current) clearTimeout(cloudPushRef.current); };
  }, [doc, cloudUser, cloudReady]);
  React.useEffect(()=>{
    setCloudReady(false);
    if(!cloudUser || !RCloud) return;
    let live = true;
    (async()=>{
      try{
        const remote = await RCloud.getDoc('schedule','working');
        if(!live || !remote) return;
        let remoteDoc = remote.json;
        if(typeof remoteDoc==='string'){ try{ remoteDoc = JSON.parse(remoteDoc); }catch(e){ remoteDoc=null; } }
        if(!remoteDoc || !remoteDoc.events) return;
        const remoteAt = +remoteDoc.savedAt
          || (typeof remote.updatedAt==='number' ? remote.updatedAt : Date.parse(remote.updatedAt||'')||0);
        const local = docRef.current, localAt = +local.savedAt || 0;
        const same = JSON.stringify(Object.assign({}, remoteDoc, { savedAt:0 })) === JSON.stringify(Object.assign({}, local, { savedAt:0 }));
        if(same || remoteAt <= localAt) return;
        const when = new Date(remoteAt).toLocaleString();
        if(window.confirm('The cloud has a newer Schedule Studio draft (last edited '+when+', '+a_rangeLabel(a_norm(remoteDoc).range)+').\n\nLoad it? This replaces what’s on screen — Ctrl+Z brings this copy back.\n\nCancel keeps this copy; the cloud draft is only overwritten once you edit here.')){
          /* an undo step of its own, so a wrong click is one Ctrl+Z */
          hist.record(local);
          dirtyRef.current = false;
          setDocQuiet(a_norm(remoteDoc)); setSelId(null);
          requestPull();
        }
      }catch(e){ /* local-only on any failure */ }
      finally{ if(live) setCloudReady(true); }
    })();
    return ()=>{ live=false; };
  }, [cloudUser]);

  async function cloudSignIn(){
    try{ if(!RCloud) return; const t = await RCloud.signIn(); setCloudUser(t ? (RCloud.currentEmail()||'signed in') : null); }catch(e){}
  }
  function cloudSignOut(){ try{ if(RCloud) RCloud.signOut(); }catch(e){} setCloudUser(null); }
  return { cloudUser, cloudSignIn, cloudSignOut };
}

export { useCloud };
