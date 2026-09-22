/* ============================================================
   REALITY SCHEDULE STUDIO — app · the import dialog
   Paste a week, load Schedule Studio CSV v1, or pull the range from
   the REALITY feed — which goes through the same merge as the auto-pull.
   ============================================================ */
import { RCloud } from '../studio-shared/cloud.js';
import { SChips } from './app-controls.jsx';
import { fetchFeedRows } from './app-feed.jsx';
import { applyFeedToDoc as a_applyFeed, clearRangeOccurrences as a_clearRange, parseCSV as a_csv,
  rangeDates as a_dates, normalizeDoc as a_norm, parsePasteBlock as a_paste, dToDate } from './schedule-data.jsx';

/* ---------- import modal ---------- */
function ImportModal({ doc, setDoc, onClose }){
  const [text, setText] = React.useState('');
  const [mode, setMode] = React.useState('merge');
  const [feed, setFeed] = React.useState(null);   // null | { loading } | { events, errors } — WP9 feed pull
  const fileRef = React.useRef(null);
  const isCSV = /^[^\n]*\bdate\b[^\n]*\btitle\b/i.test(text.split('\n')[0]||'');
  const hasCloud = typeof window!=='undefined' && !!RCloud;
  /* Feed-pulled events (when present) supersede the paste/CSV box — they carry
     the same blankEvent() shape, so the existing merge/replace + range-clamp
     reuse unchanged. */
  const parsed = React.useMemo(()=>{
    if(feed && Array.isArray(feed.events)) return { events:feed.events, errors:feed.errors||[], notes:{}, fromFeed:true };
    if(!text.trim()) return { events:[], errors:[], notes:{} };
    if(isCSV){ const r = a_csv(text); return { events:r.events, errors:r.errors, notes:{} }; }
    return a_paste(text, doc);
  }, [text, doc.range.start, doc.range.days, feed]);

  async function pullFromFeed(){
    setFeed({ loading:true });
    try{
      const r = await fetchFeedRows({ start:doc.range.start, days:doc.range.days });
      setFeed({ events:r.rows, errors:r.errors });
    }catch(e){ setFeed({ events:[], errors:[(e && e.message) || 'Could not load the feed.'] }); }
  }

  function run(){
    const dates = a_dates(doc.range);
    let evs = parsed.events, skipped = 0;
    if(parsed.fromFeed){
      /* Feed rows go through the SAME merge as the auto-pull — never a blind
         append, which stacked a second copy of every event on each press.
         Merge = sync (local rows kept, presentation kept, deletions honoured).
         Replace = also clear this range's hand-made rows first; a local weekly
         series skips these dates rather than projecting in beside the feed. */
      const rows = evs;
      setDoc(d=>{
        const base = mode==='replace'
          ? Object.assign({}, d, { events:a_clearRange(d.events, d.range, true) }) : d;
        return a_applyFeed(base, rows).doc;
      });
      onClose(0);
      return;
    }
    if(mode==='replace' && isCSV && evs.length){
      const ds = evs.map(e=>e.date).sort();
      const span = Math.round((dToDate(ds[ds.length-1]) - dToDate(ds[0]))/86400000) + 1;
      const range = { start:ds[0], days:Math.max(1, Math.min(10, span)) };
      const keep = evs.filter(e=>a_dates(range).indexOf(e.date)>=0);
      skipped = evs.length - keep.length;
      setDoc(d=>a_norm(Object.assign({}, d, { range, splits:[], events:keep, days:{} })));
    } else {
      evs = evs.filter(e=>dates.indexOf(e.date)>=0);
      skipped = parsed.events.length - evs.length;
      setDoc(d=>{
        const days = Object.assign({}, d.days, parsed.notes);
        /* replace: clear what occurs in the range — weekly series skip these
           dates instead of projecting in beside the pasted rows */
        const events = (mode==='replace' ? a_clearRange(d.events, d.range, false) : d.events).concat(evs);
        return Object.assign({}, d, { events, days });
      });
    }
    onClose(skipped);
  }
  return (
    <div className="ss-overlay" onClick={()=>onClose(null)}>
      <div className="ss-modal" onClick={e=>e.stopPropagation()}>
        <div className="ss-sech" style={{ marginTop:0 }}>Import — paste a week, a CSV, or pull from the REALITY feed</div>
        <textarea className="ss-area" style={{ minHeight:190 }} autoFocus value={text}
          placeholder={'MON\n17:00: How to DJ 2E $\n19:00 - ALL NIGHT: Board Game Night 1L/2L/2E/3P\nTUE\n…\n\n— or paste / load Schedule Studio CSV v1 —\ndate,start,end,title,title_short,locations,flags,emphasis'}
          onChange={e=>{ setText(e.target.value); if(feed) setFeed(null); }} />
        <div className="ss-actions" style={{ marginTop:10 }}>
          <button className="ss-iconbtn" onClick={()=>fileRef.current.click()}>Load .csv / .txt file…</button>
          {hasCloud && <button className="ss-iconbtn" onClick={pullFromFeed}
            title="Build this range's events from the published REALITY Events Feed (best-effort; no-op if the feed is unavailable)">
            {feed && feed.loading ? 'Pulling…' : 'Pull from REALITY feed'}</button>}
          <button className="ss-iconbtn" onClick={()=>{
              const n = doc.events.filter(e=>!e.notionId).length;
              if(!n){ window.alert('No un-synced events — everything here came from the REALITY app.'); return; }
              if(!window.confirm('Remove '+n+' un-synced (local) event'+(n===1?'':'s')+'? Only events synced from the app remain. Anything typed in by hand here is removed.')) return;
              setDoc(d=>Object.assign({}, d, { events:d.events.filter(e=>e.notionId) }));
              onClose(null);
            }}
            title="Remove events added locally (not from the app), leaving only the app-synced ones — clears stray duplicates">Remove un-synced events</button>
          <input ref={fileRef} type="file" accept=".csv,.txt,text/csv,text/plain" style={{ display:'none' }}
            onChange={e=>{ const f=e.target.files[0]; if(!f) return;
              const fr=new FileReader(); fr.onload=()=>{ setFeed(null); setText(String(fr.result)); }; fr.readAsText(f, 'utf-8'); e.target.value=''; }} />
        </div>
        <SChips label="Mode" options={[{v:'merge',l:parsed.fromFeed?'Sync (keep my rows)':'Add to current'},{v:'replace',l:(isCSV&&!parsed.fromFeed)?'Replace (range follows the file)':(parsed.fromFeed?'Replace my rows in range':'Replace range events')}]}
          value={mode} onChange={setMode} />
        {parsed.fromFeed && <div className="ss-mini">
          Sync is what happens automatically on open and whenever the range moves — app events are
          updated in place, never duplicated. Replace also clears the rows you added by hand in this range.</div>}
        <div className="ss-mini" style={{ margin:'8px 0' }}>
          {parsed.fromFeed
            ? <b>{parsed.events.length} event{parsed.events.length===1?'':'s'} from the feed{parsed.errors.length?' · '+parsed.errors.length+' problem'+(parsed.errors.length===1?'':'s'):''}</b>
            : text.trim()
              ? <b>{parsed.events.length} event{parsed.events.length===1?'':'s'} parsed{isCSV?' (CSV)':''}{parsed.errors.length?' · '+parsed.errors.length+' problem'+(parsed.errors.length===1?'':'s'):''}</b>
              : 'Day headers (MON / 8.6 / 2026-06-08) assign the days in paste mode. Or pull this range straight from the published feed.'}
        </div>
        {parsed.errors.slice(0,5).map((er,i)=><div key={i} className="ss-mini err">{er}</div>)}
        <div className="ss-actions" style={{ marginTop:12 }}>
          <button className="ss-iconbtn ss-go" disabled={!parsed.events.length && !Object.keys(parsed.notes||{}).length}
            onClick={run}>Import</button>
          <button className="ss-iconbtn" onClick={()=>onClose(null)}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

export { ImportModal };
