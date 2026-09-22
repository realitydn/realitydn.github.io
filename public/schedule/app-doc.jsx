/* ============================================================
   REALITY SCHEDULE STUDIO — app · useDoc: the document, its history, autosave
   The working doc and the two ways to change it (a real edit vs the
   machine's quiet one), undo/redo over ../studio-shared/history.js,
   and the autosave into IndexedDB + the localStorage copy
   (saveStoredDoc — the coexistence period lives in data-store.jsx).
   ============================================================ */
import { useHistory } from '../studio-shared/history.js';
import { applyFeedToDoc as a_applyFeed, newDoc as a_new, normalizeDoc as a_norm,
  saveStoredDoc as a_save, starterDoc as a_starter, thisMonday as a_thisMonday } from './schedule-data.jsx';

/* Undo (../studio-shared/history.js): 60 steps kept; edits closer together
   than 500ms are one step — a typed title is one undo, not twelve. */
const HISTORY = { limit:60, coalesceMs:500 };

/* stored: the doc Boot read (null on a first run). setSelId: the app's
   selection, trimmed when an undo/redo takes the selected event away.
   lastFeedRef: the latest feed pull ({ range, rows }), written by
   useFeedSync and read here so undo can re-base a snapshot on it. */
function useDoc(stored, setSelId){
  /* First run (nothing stored) opens a blank document on the CURRENT week and
     lets the feed pull fill it. The June stress-test week is a dev fixture now:
     ?seed=stress loads it on purpose. */
  const [doc, setDocRaw] = React.useState(()=>{
    try{ if(new URLSearchParams(window.location.search).get('seed')==='stress') return a_norm(a_starter()); }catch(e){}
    return stored || a_norm(a_new(a_thisMonday()));
  });
  /* Two ways to change the document:
     setDoc      — a real edit by the user: stamps savedAt (what cloud sync
                   compares), marks the doc dirty (only a dirty doc is ever
                   pushed), and lands in the undo history.
     setDocQuiet — the machine: a feed merge or a cloud load. No stamp, not
                   dirty, not an undo step (the history just re-bases on it). */
  const dirtyRef = React.useRef(false);
  /* ---- undo / redo — the shared history, the same model as Print Studio's:
     one entry per quiet burst of edits, HISTORY.limit deep. Quiet (machine)
     changes re-base the baseline instead of becoming steps, so undo never
     "undoes a sync". `restore` (below) is what puts a snapshot back. ---- */
  const hist = useHistory(doc, { ...HISTORY, apply:(snap)=>restore(snap) });
  const setDoc = React.useCallback(fn=>setDocRaw(d=>{
    const next = typeof fn==='function' ? fn(d) : fn;
    if(next===d) return d;
    dirtyRef.current = true;
    return Object.assign({}, next, { savedAt:Date.now() });
  }), []);
  const setDocQuiet = React.useCallback(fn=>setDocRaw(d=>{
    const next = typeof fn==='function' ? fn(d) : fn;
    if(next!==d) hist.quiet();
    return next;
  }), []);
  const docRef = React.useRef(doc); docRef.current = doc;

  /* autosave — IndexedDB + the localStorage copy (saveStoredDoc), and SAY when
     neither landed. The first run writes the doc boot adopted, which is how a
     localStorage-only doc reaches IndexedDB. Only the newest save's answer
     moves the badge. */
  const [saveFailed, setSaveFailed] = React.useState(false);
  const saveSeq = React.useRef(0);
  React.useEffect(()=>{
    const n = ++saveSeq.current;
    a_save(doc).then(r=>{ if(n===saveSeq.current) setSaveFailed(!r.ok); });
  }, [doc]);

  /* A snapshot taken before the latest feed pull landed still holds the older
     feed rows; lay that same pull over it (pure, no network) so undo restores
     YOUR edit, not last pull's data. Only for the same range — a different
     range re-pulls on its own once restored. */
  const lastFeedRef = React.useRef(null);
  const rebase = React.useCallback(snap=>{
    const lf = lastFeedRef.current;
    if(!lf || lf.range.start!==snap.range.start || lf.range.days!==snap.range.days) return snap;
    return a_applyFeed(snap, lf.rows).doc;
  }, []);
  /* Put an undo/redo snapshot back: a real edit (dirty, stamped), not a new
     step (the history has already marked it quiet). */
  const restore = React.useCallback(snap=>{
    dirtyRef.current = true;
    const next = Object.assign({}, rebase(snap), { savedAt:Date.now() });
    setDocRaw(next);
    setSelId(id=>next.events.some(e=>e.id===id) ? id : null);
  }, [rebase]);
  return { doc, setDoc, setDocQuiet, docRef, dirtyRef, hist, lastFeedRef, saveFailed };
}

export { useDoc };
