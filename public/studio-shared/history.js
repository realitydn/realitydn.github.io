/* ============================================================
   REALITY STUDIOS — undo / redo, once
   ------------------------------------------------------------
   Poster, Print and Schedule each carried the same history: every doc
   change starts a timer, and the timer is what files a step — so a
   slider dragged across forty values, or a title typed in one go, is
   ONE undo. They differed only in numbers, which are options here:

     Poster    limit 80, coalesceMs 350
     Print     limit 80, coalesceMs 350
     Schedule  limit 60, coalesceMs 500

   useHistory(doc, { limit, coalesceMs, apply })
     doc     — the doc state; the hook watches it
     apply   — (snapshot) => put that doc on screen. The Studio's own
               setter plus whatever goes with it (selection trimming,
               Schedule's feed re-base and savedAt stamp)
   returns
     undo(), redo()     — stable callbacks
     canUndo, canRedo   — read at render
     quiet()            — the NEXT doc change is not an edit: it becomes
                          the new baseline instead of a step. Poster's
                          export format flips, Schedule's feed merges and
                          cloud loads. Only mark a change that really
                          produces a new doc — an unconsumed mark would
                          swallow the next real edit.
     record(snapshot)   — file `snapshot` as a step of its own right now
                          (Schedule: "load the newer cloud draft" is one
                          Ctrl+Z)
     snapshots()        — every doc the history still holds (Print's
                          orphan-image sweep must not delete their photos)

   historyKey(e, undo, redo) — the shared shortcut: Ctrl/⌘+Z undo,
   Ctrl/⌘+Shift+Z or Ctrl/⌘+Y redo, and NONE of it while typing in a
   field (there Ctrl+Z is the field's own undo). Returns true when the
   key was a history key, so the caller's handler stops there.
   ============================================================ */

function useHistory(doc, opts){
  const limit = opts.limit, coalesceMs = opts.coalesceMs;
  const applyRef = React.useRef(opts.apply); applyRef.current = opts.apply;
  const latest = React.useRef(doc); latest.current = doc;
  const [, setVer] = React.useState(0);
  const bump = ()=>setVer(v=>v+1);
  const hist = React.useRef({ past:[], future:[], prev:null, pending:null, timer:null, skip:false });

  React.useEffect(()=>{
    const h = hist.current;
    if(h.skip){ h.skip=false; h.prev=doc; return; }
    if(h.prev==null){ h.prev=doc; return; }
    if(h.pending==null) h.pending=h.prev;
    h.prev=doc;
    clearTimeout(h.timer);
    h.timer=setTimeout(()=>{
      h.past.push(h.pending); if(h.past.length>limit) h.past.shift();
      h.future=[]; h.pending=null; bump();
    }, coalesceMs);
  }, [doc]);

  const undo = React.useCallback(()=>{
    const h = hist.current;
    clearTimeout(h.timer);
    if(h.pending!=null){ h.past.push(h.pending); h.pending=null; h.future=[]; }
    const prev = h.past.pop(); if(!prev) return;
    h.future.push(latest.current); h.skip=true;
    applyRef.current(prev); bump();
  }, []);
  const redo = React.useCallback(()=>{
    const h = hist.current;
    const nxt = h.future.pop(); if(!nxt) return;
    h.past.push(latest.current); h.skip=true;
    applyRef.current(nxt); bump();
  }, []);
  const quiet = React.useCallback(()=>{ hist.current.skip = true; }, []);
  const record = React.useCallback((snap)=>{
    const h = hist.current;
    h.past.push(snap); h.future = [];
    if(h.past.length>limit) h.past.shift();
    bump();
  }, []);
  const snapshots = React.useCallback(()=>{
    const h = hist.current;
    return h.past.concat(h.future, h.pending ? [h.pending] : []);
  }, []);

  const h = hist.current;
  return { undo, redo, quiet, record, snapshots,
           canUndo: h.past.length>0 || h.pending!=null, canRedo: h.future.length>0 };
}

/* The history shortcut, identical in all three Studios. */
function historyKey(e, undo, redo){
  const mod = e.ctrlKey || e.metaKey;
  if(!mod) return false;
  const k = e.key;
  if(k!=='z' && k!=='Z' && k!=='y' && k!=='Y') return false;
  const ae = document.activeElement;
  const typing = ae && (ae.tagName==='INPUT' || ae.tagName==='TEXTAREA' || ae.tagName==='SELECT' || ae.isContentEditable);
  if(typing) return true;
  e.preventDefault();
  if(k==='y' || k==='Y' || e.shiftKey) redo(); else undo();
  return true;
}

export { useHistory, historyKey };
