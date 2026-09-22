/* ============================================================
   REALITY PRINT STUDIO — useStorage: autosave + the store wiring
   ------------------------------------------------------------
   Everything between the app and print-store.js: the autosave of
   the working doc (and saying so when a write fails), "My
   templates", the image store's own error events, the other-tab
   warning, and the once-per-load sweep of orphaned photos. The
   status badges that show all this are topbar.jsx SaveStatus.
   Storage errors are in words a person can act on: storeErrText is
   store.js's describeStoreError (the Poster's badge reads the same).
   (Split out of print-app.jsx, Phase 3.)
   ============================================================ */
import { describeStoreError as storeErrText, watchOtherTabs } from '../studio-shared/store.js';
import { PrintDocs, PrintStore } from './print-store.js';
import { migrateElements as apMigrate } from './print-preflight.js';

/* "My templates" as stored, brought up to the current rules (old QR eyes go
   back to square) — the doc's own hydrate is use-doc.js hydrateDoc. */
function hydrateTpls(a){
  if(!Array.isArray(a)) return [];
  return a.filter(t=>t && t.doc && Array.isArray(t.doc.elements))
          .map(t=>Object.assign({}, t, { doc:Object.assign({}, t.doc, { elements:apMigrate(t.doc.elements) }) }));
}

function useStorage(boot, { doc, docRef, hist }){
  const [userTpls, setUserTpls] = React.useState(()=>hydrateTpls(boot.tpls));
  const [saveSt, setSaveSt] = React.useState('saved');    // saved | saving | failed
  const [saveErr, setSaveErr] = React.useState(null);
  const [tplErr, setTplErr] = React.useState(null);
  const [storeErr, setStoreErr] = React.useState(boot.backend==='ls' ? 'IndexedDB unavailable — saving to localStorage (shared, ~5 MB)' : null);
  const [otherTab, setOtherTab] = React.useState(false);

  /* ---- autosave. Every doc change goes to PrintDocs (IndexedDB; one write in
     flight, the newest queued), and a failed write SAYS so — the old
     localStorage write swallowed the error, so a full bucket (shared with
     Poster and Schedule) meant edits silently stopped persisting. The first
     render is the doc we just loaded; writing it back would only let a second
     tab clobber the first by opening. ---- */
  const saveSeq = React.useRef(0);
  const firstSave = React.useRef(true);
  React.useEffect(()=>{
    if(firstSave.current){ firstSave.current=false; return; }
    if(!PrintDocs) return;
    const n = ++saveSeq.current;
    setSaveSt('saving');
    PrintDocs.saveDoc(doc).then(()=>{ if(n===saveSeq.current){ setSaveSt('saved'); setSaveErr(null); } })
      .catch(e=>{ console.error('autosave failed', e); if(n===saveSeq.current){ setSaveSt('failed'); setSaveErr(storeErrText(e)); } });
  }, [doc]);
  const persistTpls = (next)=>{
    setUserTpls(next);
    if(!PrintDocs) return;
    PrintDocs.saveTpls(next).then(()=>setTplErr(null))
      .catch(e=>{ console.error('template save failed', e); setTplErr(storeErrText(e)); });
  };
  /* the image store reports its own failures (a photo kept in memory only) */
  React.useEffect(()=>{
    const h = (e)=>{ const d=e.detail||{}; setStoreErr(d.message||'storage error'); };
    window.addEventListener('printstore:error', h); return ()=>window.removeEventListener('printstore:error', h);
  }, []);

  /* ---- two tabs, one working doc. Both autosave to the same record, so the
     last one to change anything wins and the other's work is gone on reload.
     Tabs announce themselves on a BroadcastChannel; any other voice on it
     raises the warning (and a `storage` event covers the localStorage
     fallback, where a write from the other tab fires one here) — store.js
     watchOtherTabs. ---- */
  const tabs = React.useRef(null);
  React.useEffect(()=>{
    tabs.current = watchOtherTabs({ channel:'reality-print-studio', storagePrefix:'reality-print', onChange:setOtherTab });
    return ()=>{ tabs.current.stop(); tabs.current = null; };
  }, []);

  /* ---- orphaned photos. Nothing ever called delImage, so every upload stayed
     in IDB for good. Once per load, and only when the doc AND the templates
     both came out of IndexedDB cleanly and no other tab answered the hello:
     delete stored images nothing references (the working doc, every "My
     template", this session's undo history) that are over a day old. ---- */
  const tplsRef = React.useRef(userTpls); tplsRef.current = userTpls;
  React.useEffect(()=>{
    if(boot.backend!=='idb' || boot.error || !PrintStore || !PrintStore.gcImages) return;
    const t = setTimeout(()=>{
      if(tabs.current && tabs.current.peers()>0) return;
      const keep = new Set();
      const take = (els)=> (els||[]).forEach(e=>{ if(e && e.imgId) keep.add(e.imgId); });
      take(docRef.current.elements);
      tplsRef.current.forEach(tp=> take(tp.doc && tp.doc.elements));
      hist.snapshots().forEach(d=>take(d && d.elements));
      PrintStore.gcImages(keep, 24*3600*1000)
        .then(n=>{ if(n) console.info('Print Studio: removed '+n+' orphaned image'+(n===1?'':'s')+' from storage'); })
        .catch(e=>console.warn('image sweep skipped', e));
    }, 2500);
    return ()=>clearTimeout(t);
  }, []);

  /* warm the image store */
  React.useEffect(()=>{ if(PrintStore) PrintStore.open().catch(()=>{}); }, []);

  return {
    userTpls, persistTpls, saveSt, saveErr, tplErr, storeErr, dismissStoreErr:()=>setStoreErr(null), otherTab,
    backend:boot.backend,
  };
}

export { useStorage, hydrateTpls };
