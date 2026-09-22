/* ============================================================
   REALITY POSTER STUDIO — library · In queue
   App-calendar events that still need a poster (state: hooks/useQueue.js).
   ============================================================ */
import { PALETTE as AP_PAL, ACCENTS_BY_DAY as AP_ABYDAY, DAY_ABBR as AP_DABBR } from '../studio-data.jsx';
import { feedDayIdx, feedDayLabel, feedTime } from '../feed.js';
import { QUEUE_DAYS } from '../hooks/useQueue.js';
function QueueList({ queue }){
  const { queueOpen, setQueueOpen, queueFeed, queueItems, applyQueueItem, dismissQueueItem } = queue;
  return (
    <React.Fragment>
          {/* ---- In queue — upcoming app events still missing a poster ---- */}
          <div className="rs-sech" onClick={()=>setQueueOpen(o=>!o)}
            style={{ cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span>In queue</span>
            <span style={{ fontSize:11, opacity:.6 }}>
              {queueItems.length>0 && <b style={{ marginRight:6 }}>{queueItems.length}</b>}{queueOpen?'▾':'▸'}
            </span>
          </div>
          {queueOpen && <React.Fragment>
            {queueFeed==null &&
              <div className="rs-mini" style={{ margin:'4px 0 10px' }}>Checking the calendar…</div>}
            {queueFeed && queueFeed.err &&
              <div className="rs-mini" style={{ margin:'4px 0 10px' }}>Couldn’t reach the events feed — the queue appears once it loads (check the connection and reload).</div>}
            {queueFeed && !queueFeed.err && queueItems.length===0 &&
              <div className="rs-mini" style={{ margin:'4px 0 10px' }}>All caught up — every event in the next {QUEUE_DAYS===35?'5 weeks':QUEUE_DAYS+' days'} has a poster.</div>}
            {queueItems.map(ev=>{
              const di = feedDayIdx(ev.startsAt);
              const accent = di!=null ? AP_ABYDAY[di] : null;
              const stale = !!ev.posterStaleAt;
              return (
                <div key={ev.id} className="rs-libitem" onClick={()=>applyQueueItem(ev)}
                  style={{ cursor:'pointer', position:'relative', paddingRight:36 }}>
                  <span className="ln" style={{ display:'flex', alignItems:'center', gap:7 }}>
                    {accent && <span style={{ width:9, height:9, flex:'none', background:AP_PAL[accent], border:'1px solid rgba(0,0,0,.25)' }} />}
                    <span>{ev.title_en || ev.title_vi || '(untitled)'}</span>
                    {stale && <span title="The name, host, price or day/time changed after this poster was made — the artwork still shows the old one."
                      className="rs-tag">out of date</span>}
                  </span>
                  {/* cost rides the feed (hub 0033) so the price makes it onto the poster */}
                  <span className="lh">{ev.seriesId?'weekly · ':''}{di!=null?AP_DABBR[di]+' ':''}{feedDayLabel(ev.startsAt)} · {feedTime(ev.startsAt)}{ev.cost?' · '+ev.cost:''} · click for a starter</span>
                  <button className="rs-tplx" title={stale?'Dismiss — keep the current poster despite the rename':'Dismiss — this event doesn’t need a poster'}
                    onClick={e=>{ e.stopPropagation(); dismissQueueItem(ev); }}>×</button>
                </div>
              );
            })}
            {queueFeed && !queueFeed.err && queueItems.length>0 &&
              <div className="rs-mini" style={{ margin:'2px 0 12px' }}>Events created in the app’s calendar that still need a poster. Click one for a prefilled Classic starter (or, when that series already has a saved poster, the newest one restamped with this date) — saving it as a template, or sending the poster to the event, clears it from the queue. Events whose name, host, price or day/time changed after the poster was made re-appear (“out of date”) until a fresh poster is sent or you dismiss them.</div>}
          </React.Fragment>}
    </React.Fragment>
  );
}

export { QueueList };
