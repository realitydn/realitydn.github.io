/* ============================================================
   REALITY POSTER STUDIO — event picker
   ============================================================ */
import { searchNorm, eventMatches, feedDayLabel } from '../feed.js';
/* ---- WP9 event picker — lists upcoming events from the REALITY feed so the
   user can push the current poster's formats onto an event's poster slots.
   Drawn with the shared kit (studio-base.css): the dark modal, .rs-pick rows,
   .rs-input search, .rs-iconbtn buttons. ---- */
function EventPickerModal({ picker, onPick, onClose, onRetry }){
  /* When the poster came off "In queue" (doc.eventRef), that event is pinned
     up top as the obvious one-click send; everything else lists below it.
     ONLY when the ref still names a live upcoming event: a saved template keeps
     the eventRef it was made with, so a weekly series' template can point at an
     instance from months ago. Pinning that sent Modern Jive's new poster to its
     14.07 date — long past, and detached, so the send touched that one row and
     the series kept the old artwork. The feed is loaded `from: today`, so
     "not in picker.events" is exactly "past or gone". */
  const originRef = picker.origin || null;
  const originEv = originRef ? picker.events.find(e=>e.id===originRef.id) : null;
  const origin = originEv ? originRef : null;
  const whenOf = iso => (iso||'').slice(0,16).replace('T',' ');

  /* Search by name. The feed is loaded two months out, so this list is ~300 rows
     deep and the event you want is almost never on screen — scrolling for it was
     the slowest part of a send. Diacritics-blind and token-AND (see
     eventMatches), over both titles, the host and the room code. */
  const [q, setQ] = React.useState('');
  const terms = React.useMemo(()=>{ const n = searchNorm(q).trim(); return n ? n.split(/\s+/) : []; }, [q]);
  const searchRef = React.useRef(null);
  React.useEffect(()=>{ if(!picker.loading){ try{ searchRef.current && searchRef.current.focus(); }catch(e){} } }, [picker.loading]);

  /* seriesId → its upcoming dates, soonest first. Built once so every row can say
     "repeats" without rescanning the feed. */
  const bySeries = React.useMemo(()=>{
    const m = {};
    picker.events.forEach(e=>{ if(e.seriesId) (m[e.seriesId] = m[e.seriesId] || []).push(e); });
    Object.keys(m).forEach(k=>m[k].sort((a,b)=>String(a.startsAt||'').localeCompare(String(b.startsAt||''))));
    return m;
  }, [picker.events]);
  const datesOf = ev => (ev && ev.seriesId && bySeries[ev.seriesId]) || [];

  /* A one-off event sends on the click, exactly as before. A repeating one stops
     for the scope question first: nothing goes series-wide by accident, and
     nothing silently misses the other dates. */
  const [scopeStep, setScopeStep] = React.useState(null);   // null | the picked feed row

  /* Escape closes it, like every other dialog (it used to take a click on
     Cancel or the backdrop). Capture phase, so it wins over the search field's
     own Escape-to-clear. */
  React.useEffect(()=>{
    const onKey = (e)=>{ if(e.key==='Escape'){ e.preventDefault(); e.stopPropagation(); onClose(); } };
    window.addEventListener('keydown', onKey, true);
    return ()=>window.removeEventListener('keydown', onKey, true);
  }, [onClose]);
  function choose(ev){
    if(!ev) return;
    if(datesOf(ev).length > 1) setScopeStep(ev);
    else onPick(ev.id, 'one');
  }

  const rest = (origin ? picker.events.filter(e=>e.id!==origin.id) : picker.events)
    .filter(ev=>eventMatches(ev, terms));
  const originHit = !!(origin && eventMatches(originEv, terms));

  /* ---- step 2: this date, or the whole series? ---- */
  function renderScope(){
    const dates = datesOf(scopeStep);
    const list = dates.slice(0,8).map(d=>feedDayLabel(d.startsAt)).join(' · ')
      + (dates.length>8 ? '  +'+(dates.length-8)+' more' : '');
    return (
      <React.Fragment>
        <div className="rs-pickhead">{scopeStep.title_en || scopeStep.title_vi || '(untitled)'}</div>
        <div className="rs-modalsub" style={{ marginBottom:12 }}>Repeats — {dates.length} upcoming dates in the feed.</div>
        <button className="rs-pick" onClick={()=>onPick(scopeStep.id, 'one')}>
          <div className="pt">This date only</div>
          <div className="pm">{whenOf(scopeStep.startsAt)}</div>
        </button>
        <button className="rs-pick hero" onClick={()=>onPick(scopeStep.id, 'series')}>
          <div className="pt">All {dates.length} dates</div>
          <div className="pm">{list}</div>
        </button>
        <div className="rs-mini">
          “All dates” also becomes the series default, so dates the app mints later inherit this poster — and it overrides dates whose poster was set by hand.
        </div>
      </React.Fragment>
    );
  }

  /* ---- step 1: pick the event ---- */
  function renderList(){
    const listable = !picker.loading && !picker.err && picker.events.length>0;
    return (
      <React.Fragment>
        {picker.loading && <div className="rs-mini">Loading upcoming events…</div>}
        {!picker.loading && picker.err &&
          <div className="rs-mini err" style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span>{picker.err}</span>
            {onRetry && <button className="rs-iconbtn" onClick={onRetry}>Retry</button>}
          </div>}
        {!picker.loading && !picker.err && picker.events.length===0 && !origin &&
          <div className="rs-mini">No upcoming events in the feed.</div>}
        {listable &&
          <input ref={searchRef} className="rs-input" type="search" value={q} placeholder="Search by name…"
            onChange={e=>setQ(e.target.value)} style={{ marginBottom:10 }} />}
        {!picker.loading && originHit && (
          <React.Fragment>
            <div className="rs-pickhead">This poster’s event</div>
            <button className="rs-pick hero" onClick={()=>choose(originEv)}>
              <div className="pt">{(originEv && (originEv.title_en || originEv.title_vi)) || origin.title || '(untitled)'}</div>
              <div className="pm">{whenOf((originEv && originEv.startsAt) || origin.startsAt)}{originEv && originEv.location && originEv.location.code ? ' · '+originEv.location.code : ''}</div>
              <div className="pm">↳ Send here — this poster was queued for this event.</div>
            </button>
            {rest.length>0 && <div className="rs-pickhead">…or another event</div>}
          </React.Fragment>
        )}
        {!picker.loading && rest.map(ev=>{
          const n = datesOf(ev).length;
          return (
            <button key={ev.id} className="rs-pick" onClick={()=>choose(ev)}>
              <div className="pt">{ev.title_en || ev.title_vi || '(untitled)'}</div>
              <div className="pm">
                {whenOf(ev.startsAt)}{ev.location && ev.location.code ? ' · '+ev.location.code : ''}
                {n>1 ? ' · repeats — '+n+' dates' : ''}
              </div>
            </button>
          );
        })}
        {listable && !rest.length && !originHit &&
          <div className="rs-mini">Nothing matches “{q}”.</div>}
      </React.Fragment>
    );
  }

  return (
    <div className="rs-overlay" onClick={onClose}>
      <div className="rs-modal narrow" onClick={e=>e.stopPropagation()}>
        <div className="rs-modalhead" style={{ marginBottom:4 }}>
          <div className="rs-modaltitle">{scopeStep ? 'Update the series?' : 'Export to event'}</div>
        </div>
        {!scopeStep &&
          <div className="rs-modalsub" style={{ marginBottom:12 }}>
            Sends 4:5 → <b>poster4x5</b>, 9:16 → <b>story</b>, 1:1 → <b>square1x1</b>, plus your text-less <b>feed slice</b> → <b>feed</b> onto the chosen event.
          </div>}
        {scopeStep ? renderScope() : renderList()}
        <div className="rs-modalfoot">
          {scopeStep &&
            <button className="rs-iconbtn" onClick={()=>setScopeStep(null)}>‹ Back</button>}
          <button className="rs-iconbtn" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

export { EventPickerModal };
