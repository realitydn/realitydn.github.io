/* ============================================================
   REALITY PRINT STUDIO — the top bar
   Two rows: sheet (size dropdown, orientation, accent, save status,
   undo, zoom) and view + export (guides / grid / snap / hints, Trim
   or Bleed, preflight, file name, Save PDF, Gang on A4).
   (Split out of print-app.jsx, Phase 3.)
   ============================================================ */
import { PALETTE as AP_PAL, ACCENTS as AP_ACC } from '../studio-shared/brand.js';
import { SIZES as AP_SZ, SIZE_ORDER as AP_ORD, GANG as AP_GANG, sizeDims as apDims } from './print-paper.js';
import { PrintExport } from './print-imposition.js';
import { HintsToggle } from './controls.jsx';
import { PreflightChip } from './preflight-chip.jsx';

/* ---------- topbar ----------
   Two rows, no overlap. It used to be one 60px row with overflow-x and the
   export group stuck to the right edge — at 1440 px the row measured 2062 px,
   so the sticky group painted over the accent, undo, zoom and view toggles and
   they could not be clicked. The twelve-button size strip (the widest thing
   in it) is a dropdown now; the sheet controls take the top row, the view
   toggles and the whole export group the bottom one. Each row may still wrap
   under ~1200 px — it wraps, it never overlaps. */
function Topbar({ doc, setDoc, onResize, onExport, exporting, exportMsg, zoomPct, onZoomFit, onZoomStep, canUndo, canRedo, onUndo, onRedo,
                  preflight, onPickIssue, pastTrim, status }){
  const [name, setName] = React.useState(doc.title||'');
  React.useEffect(()=>{ setName(doc.title||''); }, [doc.title]);
  const commit = ()=> setDoc(d=> d.title===name ? d : ({...d, title:name}));
  const gang = AP_GANG[doc.size];
  const dims = apDims(doc.size, doc.orient);
  /* Straight from the exporter, not recomputed here. */
  const pg = PrintExport.pageMm(doc.size, doc.orient, doc.withBleed===true);
  const pageMm = pg.wmm+'×'+pg.hmm+' mm';
  const bleedOn = doc.withBleed===true;
  /* art past the trim with bleed off: the one export setting that silently
     ruins a flood — so the Trim button itself says it, in the warning colour. */
  const bleedTrap = pastTrim>0 && !bleedOn;
  return (
    <div className="ps-top">
      <div className="ps-brand">Reality<small>PRINT STUDIO</small></div>
      <div className="ps-trows">
        <div className="ps-trow">
          <div className="ps-tgroup"><span className="gl">Size</span>
            <select className="ps-select" value={doc.size} onChange={e=>onResize(e.target.value)} title="Paper size — the layout rescales in place">
              {AP_ORD.map(sz=>(
                <option key={sz} value={sz}>{AP_SZ[sz].label} · {AP_SZ[sz].sub} — {AP_SZ[sz].mm.join('×')} mm</option>
              ))}
            </select>
          </div>
          <div className="ps-tgroup">
            <div className="ps-seg">
              {[{v:'portrait',l:'Portrait'},{v:'landscape',l:'Landscape'}].map(o=>(
                <button key={o.v} className={doc.orient===o.v?'on':''} onClick={()=>setDoc(d=>({...d, orient:o.v}))}>{o.l}</button>
              ))}
            </div>
          </div>
          <div className="ps-tgroup"><span className="gl">Accent</span>
            <div className="ps-swatches">
              {AP_ACC.map(a=>(
                <div key={a} className={'ps-sw'+(doc.accent===a?' on':'')} style={{ background:AP_PAL[a], width:22, height:22 }}
                  onClick={()=>setDoc(d=>({...d, accent:a}))} title={a} />
              ))}
            </div>
          </div>
          <div className="ps-tgroup ps-status">{status}</div>
          <div className="spacer" />
          <div className="ps-tgroup">
            <div className="ps-seg">
              <button disabled={!canUndo} onClick={onUndo} title="Undo (Ctrl-Z)">↶</button>
              <button disabled={!canRedo} onClick={onRedo} title="Redo (Ctrl-⇧-Z)">↷</button>
            </div>
          </div>
          <div className="ps-tgroup">
            <div className="ps-seg">
              <button onClick={()=>onZoomStep(-1)} title="Zoom out">−</button>
              <button onClick={onZoomFit} title="Fit and re-centre the sheet (Ctrl-0) · Space-drag or middle-drag pans">{zoomPct}</button>
              <button onClick={()=>onZoomStep(1)} title="Zoom in">＋</button>
            </div>
          </div>
        </div>

        <div className="ps-trow">
          <div className="ps-tgroup ps-view">
            <button className={'ps-iconbtn'+(doc.showBleed?' on':'')} onClick={()=>setDoc(d=>({...d,showBleed:!d.showBleed}))} title="Show the bleed + crop-mark guide on the canvas (a guide only — the Trim / Bleed switch decides the PDF)">Guides</button>
            <button className={'ps-iconbtn'+(doc.showGrid?' on':'')} onClick={()=>setDoc(d=>({...d,showGrid:!d.showGrid}))} title="Show the layout grid">Grid</button>
            <button className={'ps-iconbtn'+(doc.snap?' on':'')} onClick={()=>setDoc(d=>({...d,snap:!d.snap}))} title="Snap to grid + guides">Snap</button>
            <HintsToggle />
          </div>
          <div className="spacer" />

          <div className="ps-tgroup ps-export"><span className="gl">{exporting? (exportMsg||'Rendering…') : ('PDF · '+pageMm)}</span>
            {/* What the PDF measures. Trim-only hands the shop a page that IS the
                A-size; Bleed grows the page and names the A-size in its TrimBox. */}
            <div className="ps-seg">
              {[{v:false,l:'Trim',s: bleedTrap ? '⚠ art past trim' : dims.wmm+'×'+dims.hmm},{v:true,l:'Bleed',s:'+3mm'}].map(o=>(
                <button key={String(o.v)} className={(bleedOn===o.v?'on':'')+(!o.v && bleedTrap?' warn':'')}
                  onClick={()=>setDoc(d=>({...d, withBleed:o.v}))}
                  title={o.v ? 'Page grows to carry a 3 mm bleed + crop marks. TrimBox still says '+AP_SZ[doc.size].label+'. For floods the shop will trim.'
                             : (bleedTrap ? pastTrim+' part'+(pastTrim===1?' runs':'s run')+' past the trim — a trim-only page cuts them off at the edge and the guillotine shows white. Switch to Bleed.'
                                          : 'Page is exactly '+dims.wmm+'×'+dims.hmm+' mm — the printable area, nothing around it.')}>
                  {o.l}<small>{o.s}</small>
                </button>
              ))}
            </div>
            <PreflightChip items={preflight} onPick={onPickIssue} onBleedOn={()=>setDoc(d=>({...d, withBleed:true}))} />
            <input className="ps-tname" placeholder="File name…" value={name} spellCheck={false}
              onChange={e=>setName(e.target.value)} onBlur={commit}
              onKeyDown={e=>{ if(e.key==='Enter'){ commit(); e.currentTarget.blur(); } }} />
            <button className="ps-savebtn" disabled={exporting} onClick={()=>{ commit(); onExport('single'); }}
              title={'One print-ready PDF at '+pageMm+', K-only black text'+(bleedOn?' — 3 mm bleed + crop marks outside the trim':' — the printable area only')}>
              Save PDF<small>1 UP · {AP_SZ[doc.size].label}{bleedOn?' · BLEED':''}</small>
            </button>
            <button className="ps-savebtn alt" disabled={exporting || !gang} onClick={()=>{ commit(); onExport('gang'); }}
              title={gang ? ('Gang '+gang.per+'× '+AP_SZ[doc.size].label+' onto one A4 sheet, trim-only (A-sizes tile A4 edge to edge — no room for bleed), short cut ticks at the corners') : 'Ganging is for A5–A8 (they tile an A4 sheet)'}>
              Gang on A4<small>{gang ? gang.per+' UP' : '—'}</small>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- status: what the save / the other tab / the store is doing, in
   the top row, where it can't be missed (use-storage.js feeds it) ---------- */
function SaveStatus({ st }){
  const { saveSt, saveErr, tplErr, otherTab, storeErr, dismissStoreErr, backend } = st;
  return (<React.Fragment>
    {saveSt==='failed'
      ? <span className="ps-stat bad" title={'The last change did not reach storage: '+saveErr+'. Keep this tab open, free space (or export a PDF), and it retries on the next edit.'}>NOT SAVED — {saveErr}</span>
      : <span className="ps-stat" title={backend==='ls' ? 'Autosaved to browser localStorage' : 'Autosaved to this browser (IndexedDB)'}>{saveSt==='saving' ? 'Saving…' : '✓ Saved'}</span>}
    {tplErr && <span className="ps-stat bad" title="The My templates list did not save">TEMPLATES NOT SAVED — {tplErr}</span>}
    {otherTab && <span className="ps-stat warn" title="Both tabs autosave the same sheet — the last one edited wins, and the other's changes are lost on reload. Close one.">⚠ Open in another tab</span>}
    {storeErr && <span className="ps-stat warn" title={storeErr}>⚠ {storeErr.length>44 ? storeErr.slice(0,42)+'…' : storeErr}
      <button className="ps-statx" onClick={dismissStoreErr} title="Dismiss">×</button></span>}
  </React.Fragment>);
}

export { Topbar, SaveStatus };
