/* ============================================================
   REALITY SCHEDULE STUDIO — app · small shared controls
   The labelled field and chip row every panel uses, the capacity
   colours, and the one confirm that guards deleting a weekly series.
   ============================================================ */

const CAP_COL = { ok:'#3d3526', tight:'#fdb515', over:'#ed2224' };

/* Deleting a weekly series takes every week with it — ask first. One-offs go
   without a prompt: undo is one keystroke away. */
function confirmDelete(ev){
  if(!ev || ev.repeat!=='weekly') return true;
  return window.confirm('Delete the whole weekly series "'+ev.title+'"? It disappears from EVERY week, not just this one.'
    + (ev.notionId ? '\n\nIt comes from the REALITY app, so it will stay hidden from future syncs until you restore it (Document → Hidden from app sync).' : '')
    + '\n\nTo drop a single week, use "Skip the week" instead. Ctrl+Z undoes either way.');
}

/* ---------- small controls ---------- */
function SField({ label, value, onChange, area, ph }){
  return (
    <div className="ss-row">
      {label && <div className="ss-lab">{label}</div>}
      {area
        ? <textarea className="ss-area" value={value||''} placeholder={ph||''} onChange={e=>onChange(e.target.value)} />
        : <input className="ss-input" value={value||''} placeholder={ph||''} onChange={e=>onChange(e.target.value)} />}
    </div>
  );
}
function SChips({ label, options, value, onChange, multi }){
  const isOn = v => multi ? (value||[]).indexOf(v)>=0 : value===v;
  const flip = v => { if(!multi) return onChange(v);
    const cur = value||[]; onChange(isOn(v) ? cur.filter(x=>x!==v) : cur.concat([v])); };
  return (
    <div className="ss-row">
      {label && <div className="ss-lab">{label}</div>}
      <div className="ss-chips">
        {options.map(o=>(
          <button key={String(o.v)} className={'ss-chip'+(isOn(o.v)?' on':'')} onClick={()=>flip(o.v)}>{o.l}</button>
        ))}
      </div>
    </div>
  );
}

export { CAP_COL, confirmDelete, SField, SChips };
