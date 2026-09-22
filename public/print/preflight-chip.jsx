/* ============================================================
   REALITY PRINT STUDIO — the preflight chip
   The chip beside Save PDF and its dropdown list (print-preflight.js
   computes the items).
   (Split out of print-app.jsx, Phase 3.)
   ============================================================ */

/* ---------- preflight — the chip next to Save PDF, and its list ----------
   Non-blocking: it never stops an export, it just says what the press will
   show. Recomputed on every edit (print-preflight.js). A row click selects
   the part it names; the bleed row carries its own fix. */
function PreflightChip({ items, onPick, onBleedOn }){
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  React.useEffect(()=>{
    if(!open) return;
    const h = (e)=>{ if(ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const k = (e)=>{ if(e.key==='Escape') setOpen(false); };
    window.addEventListener('pointerdown', h); window.addEventListener('keydown', k);
    return ()=>{ window.removeEventListener('pointerdown', h); window.removeEventListener('keydown', k); };
  }, [open]);
  const errs = items.filter(i=>i.level==='err').length;
  const tone = errs ? ' err' : items.length ? ' warn' : ' ok';
  return (
    <div className="ps-pf" ref={ref}>
      <button className={'ps-pfchip'+tone} onClick={()=>setOpen(o=>!o)}
        title="Preflight — what will go wrong on press, rechecked on every edit. Never blocks an export.">
        {items.length ? '⚠ Preflight · '+items.length : '✓ Preflight'}
        <small>{items.length ? (errs ? errs+' to fix' : 'worth a look') : 'print-ready'}</small>
      </button>
      {open && <div className="ps-pfpanel" role="list">
        <div className="ps-pfhead">Preflight<span>{items.length ? items.length+' note'+(items.length===1?'':'s') : 'clear'}</span></div>
        {items.length===0
          ? <div className="ps-pfok">Nothing to flag — art inside the bleed, photos sharp enough, codes with their quiet zone, text off the trim, every glyph in the fonts.</div>
          : items.map((it,i)=>(
              <div key={i} className={'ps-pfrow '+it.level} role="listitem">
                <button className="ps-pfmain" onClick={()=>{ onPick(it); }} title={it.ids&&it.ids.length?'Select the part':''}>
                  <span className="lv">{it.level==='err'?'Fix':'Check'}</span><span className="tx">{it.text}</span>
                </button>
                {it.kind==='bleed' && <button className="ps-pffix" onClick={onBleedOn}>Bleed on</button>}
              </div>
            ))}
      </div>}
    </div>
  );
}

export { PreflightChip };
