/* ============================================================
   REALITY SCHEDULE STUDIO — app · useFeedSync: the automatic App→Schedule pull
   Pulls the published Events Feed on open, again whenever the range
   moves (week navigation), and on demand, and merges it through
   applyFeedToDoc (data-feed.jsx: series-keyed presentation,
   tombstones, no accumulation).
   ============================================================ */
import { RCloud } from '../studio-shared/cloud.js';
import { applyFeedToDoc as a_applyFeed, buildDocFromFeed as a_buildFeed, feedWindow as a_feedWindow,
  LOCATIONS as A_LOCS, suid as a_uid } from './schedule-data.jsx';

/* Fetch + build the feed rows for a range. The ONE path every pull takes — the
   auto-pull on open, the re-pull when the range moves, and the Import dialog's
   button — so they can't drift into three different merges again. Fetches the
   range plus two weeks (feedWindow) because the weekly inference needs to see
   next week. Throws on an unreachable feed so the caller can say so. */
async function fetchFeedRows(range){
  if(!RCloud || !RCloud.fetchFeed) throw new Error('Cloud client unavailable.');
  const w = a_feedWindow(range);
  const fd = await RCloud.fetchFeed({ from:w.from, to:w.to });
  if(!fd || !Array.isArray(fd.events)) throw new Error('The REALITY feed could not be reached.');
  const built = a_buildFeed(fd, { locations:A_LOCS, range, makeId:a_uid });
  return { rows:built.events, errors:built.errors, total:fd.events.length };
}

/* bump to re-pull the feed without the range moving (see useFeedSync):
   Retry, New blank, Open JSON, a restored deletion, a cloud load. */
function usePullRequest(){
  const [pullNonce, setPullNonce] = React.useState(0);
  const requestPull = React.useCallback(()=>setPullNonce(n=>n+1), []);
  return [pullNonce, requestPull];
}

function useFeedSync({ doc, docRef, lastFeedRef, setDocQuiet, pullNonce }){
  /* WP9 delta — automatic App→Schedule sync. Pull the published Events Feed for
     the range and idempotently merge it in (mergeFeedIntoDoc: replaces synced
     rows, keeps local rows + your presentation, honours deletions, never
     accumulates). Runs on open AND whenever the range moves (debounced, so
     clicking » three times is one fetch), and on demand (requestPull — Retry,
     New blank, Open JSON, a restored deletion). The feed is a PUBLIC read, so
     this needs no sign-in. A failure leaves the doc untouched and says so in the
     day strip with a Retry; an empty feed is never allowed to wipe the week. */
  const [syncNote, setSyncNote] = React.useState(null);
  const [feedStat, setFeedStat] = React.useState(null);   // null | { state:'loading'|'ok'|'empty'|'error' }
  const pullSeqRef = React.useRef(0);
  const firstPullRef = React.useRef(true);
  React.useEffect(()=>{
    if(!RCloud || !RCloud.fetchFeed) return;
    const range = { start:doc.range.start, days:doc.range.days };
    const seq = ++pullSeqRef.current;
    const wait = firstPullRef.current ? 0 : 450;
    firstPullRef.current = false;
    const t = setTimeout(async ()=>{
      setFeedStat({ state:'loading' });
      try{
        const r = await fetchFeedRows(range);
        if(seq!==pullSeqRef.current) return;                    // the range moved on — a newer pull owns it
        if(!r.total){ setFeedStat({ state:'empty' }); return; }  // empty → no-op (no silent deletes)
        lastFeedRef.current = { range, rows:r.rows };
        const res = a_applyFeed(docRef.current, r.rows).res;
        setFeedStat({ state:'ok', at:Date.now() });
        if(!res.changed) return;
        // re-merge inside the functional update so it composes with the latest doc
        setDocQuiet(d=>(d.range.start===range.start && d.range.days===range.days) ? a_applyFeed(d, r.rows).doc : d);
        const n = res.added + res.updated;
        setSyncNote(n ? ('Synced from the app · '+n+' new/updated') : 'Synced from the app');
        setTimeout(()=>setSyncNote(null), 6000);
      }catch(e){
        if(seq===pullSeqRef.current) setFeedStat({ state:'error' });
        console.info('[Schedule] feed pull failed', e && e.message);
      }
    }, wait);
    return ()=>{ clearTimeout(t); };
  }, [doc.range.start, doc.range.days, pullNonce]);
  return { feedStat, syncNote };
}

export { fetchFeedRows, usePullRequest, useFeedSync };
