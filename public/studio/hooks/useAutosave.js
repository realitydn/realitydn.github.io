/* ============================================================
   REALITY POSTER STUDIO — useAutosave
   ============================================================ */
import { RStore } from '../studio-store.js';
import { describeStoreError } from '../../studio-shared/store.js';
import { LS_KEY, stampEngine } from '../doc.js';
function useAutosave({ doc, docRef }){
  /* ---- autosave — the working doc into IndexedDB (see bootDoc) ----
     ~500ms after the last change, so a drag or a slider sweep is one write
     rather than sixty, and flushed at once when the tab is hidden or closed.
     `saveState` drives the topbar badge. beforeunload objects ONLY while a
     write is pending or has failed, so a saved Studio closes without asking. */
  const [saveState, setSaveState] = React.useState('saved');
  const [saveMsg, setSaveMsg] = React.useState('');
  const saveRef = React.useRef({ timer:null, dirty:false, busy:false, failed:false, first:true });
  const writeDoc = React.useCallback(async ()=>{
    const sv = saveRef.current;
    clearTimeout(sv.timer); sv.timer = null;
    if(sv.busy || !sv.dirty) return;          // a write in flight re-checks `dirty` when it lands
    sv.busy = true;
    try{
      while(sv.dirty){
        sv.dirty = false;
        const snap = stampEngine(docRef.current);
        let err = null;
        try{
          if(!RStore || !RStore.docPut) throw new Error('IndexedDB store not loaded');
          await RStore.docPut('working', snap);
        }catch(e){ err = e || new Error('write failed'); }
        if(!err){
          sv.failed = false;
          // a fallback copy from an earlier refusal is now stale — free the small box
          try{ if(localStorage.getItem(LS_KEY)!=null) localStorage.removeItem(LS_KEY); }catch(e){}
          if(!sv.dirty){ setSaveState('saved'); setSaveMsg(''); }
          continue;
        }
        const why = describeStoreError(err);
        /* IndexedDB refused. Try the old box before giving up — a poster with
           small photos still fits there, and kept-but-cramped beats lost. */
        let fellBack = false;
        try{ localStorage.setItem(LS_KEY, JSON.stringify(Object.assign({}, snap, { _savedAt: Date.now() }))); fellBack = true; }catch(e){}
        sv.failed = !fellBack;
        setSaveState(fellBack ? 'fallback' : 'error'); setSaveMsg(why);
        if(!fellBack) console.error('[studio] autosave failed — the poster is NOT saved', err);
      }
    }finally{ sv.busy = false; }
  }, []);
  React.useEffect(()=>{
    const sv = saveRef.current;
    if(sv.first){ sv.first = false; return; }   // the doc boot just read — nothing new to keep
    sv.dirty = true;
    // a standing failure stays on screen until a write actually succeeds
    setSaveState(s=> (s==='error'||s==='fallback') ? s : 'saving');
    clearTimeout(sv.timer);
    sv.timer = setTimeout(writeDoc, 500);
  }, [doc]);
  React.useEffect(()=>{
    const onVis = ()=>{ if(document.visibilityState==='hidden') writeDoc(); };
    const onPageHide = ()=>{ writeDoc(); };
    const onBeforeUnload = (e)=>{
      const sv = saveRef.current;
      if(!(sv.dirty || sv.busy || sv.failed)) return;
      writeDoc();
      e.preventDefault(); e.returnValue = ''; return '';
    };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('pagehide', onPageHide);
    window.addEventListener('beforeunload', onBeforeUnload);
    return ()=>{
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('pagehide', onPageHide);
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, [writeDoc]);

  return { saveState, saveMsg };
}

export { useAutosave };
