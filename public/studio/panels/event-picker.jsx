/* ============================================================
   REALITY POSTER STUDIO — event picker
   ============================================================ */
import { searchNorm, eventMatches, feedDayLabel } from '../feed.js';
/* ---- WP9 event picker — lists upcoming events from the REALITY feed so the
   user can push the current poster's formats onto an event's poster slots.
   Reuses the studio's overlay/modal CSS atoms; fully additive UI. ---- */
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
  const kicker = { fontFamily:'Montserrat', fontWeight:700, fontSize:10, letterSpacing:'.09em',
    textTransform:'uppercase', opacity:.55, margin:'2px 0 6px' };

  /* ---- step 2: this date, or the whole series? ---- */
  function renderScope(){
    const dates = datesOf(scopeStep);
    const list = dates.slice(0,8).map(d=>feedDayLabel(d.startsAt)).join(' · ')
      + (dates.length>8 ? '  +'+(dates.length-8)+' more' : '');
    const opt = { display:'block', width:'100%', textAlign:'left', cursor:'pointer', font:'inherit',
      color:'#0d0905', borderRadius:6, marginBottom:8, padding:'10px 12px' };
    return (
      <React.Fragment>
        <div style={{ fontWeight:800, fontSize:14, marginBottom:2 }}>{scopeStep.title_en || scopeStep.title_vi || '(untitled)'}</div>
        <div style={{ fontSize:12, opacity:.7, marginBottom:12 }}>Repeats — {dates.length} upcoming dates in the feed.</div>
        <button onClick={()=>onPick(scopeStep.id, 'one')}
          style={Object.assign({}, opt, { border:'1px solid rgba(120,110,90,.45)', background:'transparent' })}>
          <div style={{ fontFamily:'Montserrat', fontWeight:800, fontSize:13 }}>This date only</div>
          <div style={{ fontSize:11, opacity:.65, marginTop:2 }}>{whenOf(scopeStep.startsAt)}</div>
        </button>
        <button onClick={()=>onPick(scopeStep.id, 'series')}
          style={Object.assign({}, opt, { border:'2px solid #0d0905', background:'#fddf00' })}>
          <div style={{ fontFamily:'Montserrat', fontWeight:800, fontSize:13 }}>All {dates.length} dates</div>
          <div style={{ fontSize:11, opacity:.7, marginTop:2 }}>{list}</div>
        </button>
        <div style={{ fontSize:11, opacity:.6, lineHeight:1.45 }}>
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
        {picker.loading && <div style={{ fontSize:12, opacity:.7 }}>Loading upcoming events…</div>}
        {!picker.loading && picker.err &&
          <div style={{ fontSize:12, color:'#b00' }}>
            {picker.err}
            {onRetry &&
              <button onClick={onRetry}
                style={{ marginLeft:8, padding:'4px 10px', border:'2px solid #0d0905', background:'#fddf00', color:'#0d0905', borderRadius:6, fontFamily:'Montserrat', fontWeight:700, fontSize:11, cursor:'pointer' }}>
                Retry
              </button>}
          </div>}
        {!picker.loading && !picker.err && picker.events.length===0 && !origin &&
          <div style={{ fontSize:12, opacity:.7 }}>No upcoming events in the feed.</div>}
        {listable &&
          <input ref={searchRef} type="search" value={q} placeholder="Search by name…"
            onChange={e=>setQ(e.target.value)}
            style={{ width:'100%', padding:'8px 10px', marginBottom:10, borderRadius:6,
              border:'2px solid #0d0905', background:'#fff', color:'#0d0905',
              fontFamily:'Space Grotesk, sans-serif', fontSize:13 }} />}
        {!picker.loading && originHit && (
          <React.Fragment>
            <div style={kicker}>This poster’s event</div>
            <div onClick={()=>choose(originEv)}
              style={{ cursor:'pointer', padding:'10px 12px', borderRadius:6, marginBottom:10, border:'2px solid #0d0905', background:'rgba(120,110,90,.07)' }}
              onMouseEnter={e=>e.currentTarget.style.background='rgba(120,110,90,.16)'}
              onMouseLeave={e=>e.currentTarget.style.background='rgba(120,110,90,.07)'}>
              <div style={{ fontWeight:800, fontSize:13 }}>{(originEv && (originEv.title_en || originEv.title_vi)) || origin.title || '(untitled)'}</div>
              <div style={{ fontSize:11, opacity:.6 }}>{whenOf((originEv && originEv.startsAt) || origin.startsAt)}{originEv && originEv.location && originEv.location.code ? ' · '+originEv.location.code : ''}</div>
              <div style={{ fontSize:11, opacity:.75, marginTop:3 }}>↳ Send here — this poster was queued for this event.</div>
            </div>
            {rest.length>0 && <div style={kicker}>…or another event</div>}
          </React.Fragment>
        )}
        {!picker.loading && rest.map(ev=>{
          const n = datesOf(ev).length;
          return (
            <div key={ev.id} onClick={()=>choose(ev)}
              style={{ cursor:'pointer', padding:'8px 10px', borderRadius:6, marginBottom:4, border:'1px solid rgba(120,110,90,.2)' }}
              onMouseEnter={e=>e.currentTarget.style.background='rgba(120,110,90,.08)'}
              onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
              <div style={{ fontWeight:700, fontSize:13 }}>{ev.title_en || ev.title_vi || '(untitled)'}</div>
              <div style={{ fontSize:11, opacity:.6 }}>
                {whenOf(ev.startsAt)}{ev.location && ev.location.code ? ' · '+ev.location.code : ''}
                {n>1 ? ' · repeats — '+n+' dates' : ''}
              </div>
            </div>
          );
        })}
        {listable && !rest.length && !originHit &&
          <div style={{ fontSize:12, opacity:.7 }}>Nothing matches “{q}”.</div>}
      </React.Fragment>
    );
  }

  return (
    <div className="rs-overlay" onClick={onClose}
      style={{ position:'fixed', inset:0, background:'rgba(10,7,3,.55)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999 }}>
      <div className="rs-modal" onClick={e=>e.stopPropagation()}
        style={{ width:420, maxWidth:'92vw', maxHeight:'80vh', overflow:'auto', background:'#fffbf1', color:'#0d0905', borderRadius:10, padding:18, boxShadow:'0 30px 70px rgba(0,0,0,.5)' }}>
        <div style={{ fontFamily:'Montserrat', fontWeight:800, letterSpacing:'.04em', fontSize:14, marginBottom:4 }}>
          {scopeStep ? 'Update the series?' : 'Export to event'}
        </div>
        {!scopeStep &&
          <div style={{ fontSize:12, opacity:.7, marginBottom:12 }}>
            Sends 4:5 → <b>poster4x5</b>, 9:16 → <b>story</b>, 1:1 → <b>square1x1</b>, plus your text-less <b>feed slice</b> → <b>feed</b> onto the chosen event.
          </div>}
        {scopeStep ? renderScope() : renderList()}
        <div style={{ marginTop:12, display:'flex', justifyContent:'flex-end', gap:8 }}>
          {scopeStep &&
            <button className="rs-addrow" onClick={()=>setScopeStep(null)} style={{ display:'inline-block', width:'auto' }}>‹ Back</button>}
          <button className="rs-addrow" onClick={onClose} style={{ display:'inline-block', width:'auto' }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

export { EventPickerModal };
