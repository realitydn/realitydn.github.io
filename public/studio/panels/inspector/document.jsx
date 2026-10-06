/* ============================================================
   REALITY POSTER STUDIO — inspector · nothing selected
   The whole-poster panel: day, story sizing, canvas, shortcuts.
   ============================================================ */
import { ACCENTS_BY_DAY as AP_ABYDAY, DAY_ABBR as AP_DABBR, PALETTE as AP_PAL, STEP } from '../../studio-data.jsx';
import { NUDGE } from '../../doc.js';
import { Slider, Chips, Fold, Hint } from '../controls.jsx';
function DocumentPanel({ doc, setDoc, isOutput, clearAll }){
  const DAYS = AP_ABYDAY.map((a,i)=>({ n:i+1, abbr:AP_DABBR[i], accent:a }));
  return (
    <React.Fragment>
      {/* The day picker stays bare — it's the single most-used control in the
          tool and putting it behind a disclosure would be a joke. */}
      <div className="rs-sech">Day — pick the accent</div>
      <div className="rs-vibe rs-days">
        {DAYS.map(d=>(
          <button key={d.abbr} className={doc.accent===d.accent?'on':''} onClick={()=>setDoc(x=>({...x, accent:d.accent}))}
            title={d.abbr+'’s colour'}>
            <span className="dot" style={{ background:AP_PAL[d.accent] }} />{d.n} · {d.abbr}
          </button>
        ))}
      </div>
      <Hint>Each weekday has its colour. Picking one sets the poster accent — and names the Story export (e.g. <b>3-Wed-…</b>).</Hint>

      <div className="rs-empty" style={{ padding:'22px 12px 16px' }}>
        <div className="big">Nothing selected</div>
        <p>Drag a part from the left onto the poster, or click one to select it. {isOutput? 'Move it here to override just this format.' : 'You’re on Master — edits flow to every format.'}</p>
      </div>

      {isOutput && doc.activeFormat==='9x16' &&
        <Fold id="d-story" title="Story sizing" dirty={doc.storyBoost===false||((doc.storyScale||1.15)!==1.15)?1:0}>
          <Chips options={[{v:true,l:'Boost on'},{v:false,l:'Off'}]} value={doc.storyBoost!==false} onChange={v=>setDoc(d=>({...d, storyBoost:v}))} />
          {doc.storyBoost!==false &&
            <Slider label="Scale" val={doc.storyScale||1.15} min={1} max={1.8} step={0.05} onChange={v=>setDoc(d=>({...d, storyScale:v}))} suffix="×" />}
          <Hint tight>Scales every element + its text up so the story reads on a phone — applies to all your templates. Anything you hand-size in 9:16 keeps its size.</Hint>
        </Fold>}

      <Fold id="d-canvas" title="Canvas">
        <div className="rs-mini" style={{ textAlign:'center', marginBottom:12 }}>{doc.elements.length} element{doc.elements.length===1?'':'s'} placed</div>
        <button className="rs-iconbtn rs-del" style={{ width:'100%', justifyContent:'center', marginBottom:10 }} onClick={clearAll}>Clear poster</button>
      </Fold>

      <Fold id="d-keys" title="Shortcuts">
        <div className="rs-mini" style={{ marginBottom:10 }}>
          <b>Ctrl-K</b> find any control · <b>Ctrl-Z</b> undo · <b>Ctrl-⇧-Z</b> redo · <b>Ctrl-D</b> duplicate ·
          <b> Ctrl-A</b> select all · <b>Ctrl-S</b> save as template · <b>Ctrl-E</b> save images ·
          arrows nudge {NUDGE}px (<b>⇧</b> one grid step, {STEP}px) · <b>[</b> / <b>]</b> send backward / bring forward
          (<b>⇧</b> to back / front) · <b>Delete</b> removes it — or, on an output format, hides it there only ·
          <b> ⇧-click</b> multi-select · <b>double-click</b> text to edit it on the poster ·
          <b> Ctrl-V</b> paste an image onto a photo · <b>drop</b> an image on a photo to replace it, anywhere else to add one ·
          <b> click</b> a part to drop it in the middle.
        </div>
        <div className="rs-mini" style={{ marginBottom:10 }}>
          <b>Space-drag</b> or <b>middle-drag</b> pans the poster · <b>Ctrl/⌘-wheel</b> (or a pinch) zooms at the pointer ·
          the <b>wheel</b> scrolls a zoomed-in poster (<b>⇧</b> for sideways) · click the <b>%</b> in the top bar to fit and re-centre.
        </div>
      </Fold>
    </React.Fragment>
  );
}

export { DocumentPanel };
