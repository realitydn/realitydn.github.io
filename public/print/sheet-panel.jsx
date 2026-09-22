/* ============================================================
   REALITY PRINT STUDIO — the sheet panel
   The inspector when nothing is selected: the sheet's size and
   export mode, the safe margin, the layout grid, the shortcuts.
   (Split out of print-app.jsx, Phase 3.)
   ============================================================ */
import { SIZES as AP_SZ } from './print-paper.js';
import { Slider, Chips } from './controls.jsx';

/* ---------- sheet panel — the document, when nothing is selected ---------- */
function SheetPanel({ doc, setDoc, dims, clearAll }){
  const grid = doc.grid||{ cols:0, rows:0, gutter:12 };
  const setGrid = (patch)=> setDoc(d=>({ ...d, grid:Object.assign({ cols:0, rows:0, gutter:12 }, d.grid, patch) }));
  return (
    <React.Fragment>
      <div className="ps-sech">Sheet</div>
      <div className="ps-mini" style={{ marginBottom:10 }}>
        <b>{AP_SZ[doc.size].label} {doc.orient}</b> · {dims.wmm}×{dims.hmm} mm ·{' '}
        {doc.withBleed===true ? 'exporting with 3 mm bleed + crop marks.' : 'exporting the printable area only.'}
        {' '}Everything prints as crisp vector — text rides the black plate only.
      </div>
      <Slider label="Safe margin" val={doc.marginMm!=null?doc.marginMm:6} min={0} max={24} step={0.5}
        onChange={v=>setDoc(d=>({ ...d, marginMm:v }))} suffix="mm" />

      <div className="ps-sech">Layout grid</div>
      <Chips label="Columns" options={[{v:0,l:'Off'},{v:2,l:'2'},{v:3,l:'3'},{v:4,l:'4'},{v:6,l:'6'}]}
        value={grid.cols||0} onChange={v=>setGrid({ cols:v })} />
      <Chips label="Rows" options={[{v:0,l:'Off'},{v:2,l:'2'},{v:3,l:'3'},{v:4,l:'4'},{v:5,l:'5'},{v:6,l:'6'}]}
        value={grid.rows||0} onChange={v=>setGrid({ rows:v })} />
      {(grid.cols>0||grid.rows>0) && <Slider label="Gutter" val={grid.gutter!=null?grid.gutter:12} min={4} max={40} step={1}
        onChange={v=>setGrid({ gutter:v })} suffix="pt" />}
      <div className="ps-mini" style={{ marginBottom:10 }}>
        Boxes snap to every column and row edge while you drag — the Swiss backbone.
        Toggle <b>Grid</b> in the top bar to see it.
      </div>

      <div className="ps-sech">Shortcuts</div>
      <div className="ps-mini" style={{ marginBottom:12 }}>
        <b>Ctrl-Z</b> undo · <b>Ctrl-⇧-Z</b> redo · <b>Ctrl-D</b> duplicate · <b>Ctrl-A</b> select all ·
        arrows nudge 1pt (<b>⇧</b> 10) · <b>⇧-click</b> multi-select · <b>⇧-drag corner</b> keeps aspect ·
        <b>Space-drag</b> or <b>middle-drag</b> pans · <b>Ctrl-scroll</b> zooms at the pointer ·
        <b>Ctrl-0</b> (or the % button) fits and re-centres.
      </div>

      <div className="ps-empty" style={{ paddingTop:4 }}>
        <div className="big">{doc.elements.length} part{doc.elements.length===1?'':'s'} on the sheet</div>
        <p>Click any part to edit it, or drag new ones from the library.</p>
      </div>
      <button className="ps-iconbtn ps-del" style={{ width:'100%', justifyContent:'center' }} onClick={clearAll}>Clear sheet</button>
    </React.Fragment>
  );
}

export { SheetPanel };
