/* ============================================================
   REALITY POSTER STUDIO — inspector · ink mark
   ============================================================ */
import { INK_MARK, PALETTE, INK_MARK_DAY_KEYS, DAY_NAMES, DAY_ABBR } from '../../studio-data.jsx';
import { InkMarkSwatch } from '../../studio-element.jsx';
import { Chips, Slider, Hint } from '../controls.jsx';
/* Ink mark — form · mode · day · module · ground. The mark is the canon grid
   (studio-data INK_MARK): the panel only ever RECOLOURS (mode/day) or resizes
   by whole modules; cell order is untouchable. Form/module changes resize the
   element box to exact module multiples so cells stay square; a free drag-
   resize still fits-and-centres without distortion. v1 has no voids/dropout. */
/* ============================================================
   INK MARK EDITOR — the mark on its own terms.

   The Inspector's chips can set form and mode, but they read as words, and
   the one dial that matters most — the DAY hue — hid behind picking "Day
   code" first. Designing a Monday strip meant switching mode, switching day,
   then squinting at a 60px mark on the canvas.

   This is the same controls rendered as the thing they produce: every form,
   every mode and all seven days drawn live at a legible size, on a ground you
   can flip between paper, ink and the poster's accent so the ground decision
   is made by looking rather than guessing. Edits apply straight to the
   selected element — no apply step, no separate copy of the state.

   Cell ORDER is still canon and still not editable here. The panel recolours;
   it never reorders.
   ============================================================ */
const MARK_FORMS = [
  { v:'strip-v',       l:'Strip',    h:'2×9 · vertical' },
  { v:'strip-h',       l:'Strip ↔',  h:'9×2 · horizontal' },
  { v:'strip-short-v', l:'Short',    h:'2×7 · vertical' },
  { v:'strip-short-h', l:'Short ↔',  h:'7×2 · horizontal' },
  { v:'square',        l:'Square',   h:'4×4' },
  { v:'square-anchored', l:'Anchored', h:'4×4 · ink corner' },
];
const MARK_MODES = [
  { v:'full',    l:'Full',     h:'all seven hues' },
  { v:'majors',  l:'Majors',   h:'three bands, neutral field' },
  { v:'daycode', l:'Day code', h:'one weekday hue' },
  { v:'ink',     l:'Ink',      h:'ink + stock only' },
];
const MARK_GROUNDS = [
  { v:'paper',  l:'Paper',  bg:'#fffbf1' },
  { v:'ink',    l:'Ink',    bg:'#0d0905' },
  { v:'accent', l:'Accent', bg:null },
];
function InkMarkEditor({ el, doc, update, onClose }){
  const IM = INK_MARK;
  const Swatch = InkMarkSwatch;
  const [ground, setGround] = React.useState('paper');
  const form = el.form||'strip-v';
  const mode = el.mode||'full';
  const day  = el.day||'fri';
  const anchored = form==='square-anchored';
  const plate = el.ground===true && !anchored;
  const accentHex = PALETTE[doc.accent] || '#18a7e0';
  const bg = ground==='accent' ? accentHex : MARK_GROUNDS.filter(g=>g.v===ground)[0].bg;
  /* the preview's theme drives only the paper-shade plate tone, so it follows
     the ground you are previewing on, not the poster's theme */
  const previewTheme = ground==='ink' ? 'night' : 'day';
  const f = IM.forms[form] || IM.forms['strip-v'];
  const floor = IM.floors[form.indexOf('short')>=0 ? 'short' : f.square ? 'square' : 'strip'];
  const pad = plate ? 2 : 0;
  const m = Math.max(1, Math.round(Math.min(el.w/(f.cols+pad), el.h/(f.rows+pad))));
  /* resize the box to exact module multiples whenever form/ground/module move,
     so the mark never renders letterboxed inside its own element */
  const fit = (patch, mod)=>{
    const nf = IM.forms[patch.form!=null?patch.form:form] || f;
    const na = (patch.form!=null?patch.form:form)==='square-anchored';
    const ng = (patch.ground!=null?patch.ground:el.ground)===true && !na;
    const np = ng?2:0;
    return Object.assign(patch, { w:Math.round((nf.cols+np)*mod), h:Math.round((nf.rows+np)*mod) });
  };
  /* Thumbnail modules are fitted to the tile's ACTUAL box — ~52×28 for a
     normal tile, ~40×28 for a wide one — constraining width and height
     separately. Sizing off the longer axis alone made the 4×4 square 48px
     tall in a 30px well, so it sat on top of its own label. */
  const thumbM = (fm, wBudget)=>{ const ff = IM.forms[fm]||f;
    return Math.max(2, Math.floor(Math.min((wBudget||52)/ff.cols, 28/ff.rows))); };
  const dayM = thumbM(form, 40);
  /* the preview gets the panel's full width rather than a square budget, so a
     9×2 strip reads at its real proportion instead of shrinking to fit a
     dimension it does not use */
  const previewM = Math.max(6, Math.floor(Math.min(258/f.cols, 168/f.rows)));
  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(10,7,3,.62)',
      display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999 }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:'#171109', border:'2px solid #3a2c1c',
        width:'min(860px, 94vw)', maxHeight:'92vh', overflow:'auto', padding:'20px 22px 22px',
        boxShadow:'0 18px 0 rgba(0,0,0,.35)' }}>
        <div style={{ display:'flex', alignItems:'baseline', gap:12, marginBottom:16 }}>
          <div style={{ fontFamily:'Montserrat', fontWeight:800, fontSize:15, letterSpacing:'.04em',
            textTransform:'uppercase', color:'#fffbf1' }}>Ink mark editor</div>
          <div style={{ fontFamily:'Space Grotesk', fontSize:12, color:'#8a7f6c' }}>
            Cell order is canon — this recolours and resizes, it never reorders.</div>
          <button onClick={onClose} style={{ marginLeft:'auto', background:'none', border:'2px solid #3a2c1c',
            color:'#e9ddc5', padding:'5px 12px', cursor:'pointer', fontFamily:'Montserrat', fontWeight:700,
            fontSize:11, letterSpacing:'.08em', textTransform:'uppercase' }}>Done</button>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'minmax(220px,300px) 1fr', gap:22, alignItems:'start' }}>
          {/* ---- live preview ---- */}
          <div>
            <div style={{ background:bg, border:'2px solid #3a2c1c', minHeight:210, padding:20,
              display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Swatch form={form} mode={mode} day={day} grounded={plate} theme={previewTheme}
                m={previewM} />
            </div>
            <div style={{ display:'flex', gap:5, marginTop:8 }}>
              {MARK_GROUNDS.map(g=>(
                <button key={g.v} onClick={()=>setGround(g.v)}
                  style={{ flex:1, padding:'6px 0', cursor:'pointer', fontFamily:'Montserrat', fontWeight:700,
                    fontSize:9.5, letterSpacing:'.08em', textTransform:'uppercase',
                    background: ground===g.v ? '#2a1620' : 'transparent',
                    border:'2px solid '+(ground===g.v ? '#ed1b72' : '#3a2c1c'),
                    color: ground===g.v ? '#ed1b72' : '#8a7f6c' }}>{g.l}</button>
              ))}
            </div>
            <div className="rs-mini" style={{ marginTop:8 }}>
              Preview grounds only — they are not applied to the poster. Check the mark on the
              substrate it will actually print on: stock cells vanish on paper, ink cells vanish on ink.
            </div>
          </div>

          {/* ---- dials ---- */}
          <div>
            <div className="rs-sech" style={{ marginTop:0 }}>Form</div>
            <div className="rs-gfxgrid">
              {MARK_FORMS.map(o=>(
                <button key={o.v} title={o.h} className={'rs-gfxtile'+(form===o.v?' on':'')}
                  onClick={()=>update(fit({ form:o.v }, m))}>
                  <span className="gp" style={{ display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <Swatch form={o.v} mode={mode} day={day} grounded={false} theme="night" m={thumbM(o.v)} />
                  </span>
                  <span className="gl">{o.l}</span>
                </button>
              ))}
            </div>

            <div className="rs-sech">Mode</div>
            <div className="rs-gfxgrid">
              {MARK_MODES.map(o=>(
                <button key={o.v} title={o.h} className={'rs-gfxtile'+(mode===o.v?' on':'')}
                  onClick={()=>update({ mode:o.v })}>
                  <span className="gp" style={{ display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <Swatch form={form} mode={o.v} day={day} grounded={false} theme="night" m={thumbM(form)} />
                  </span>
                  <span className="gl">{o.l}</span>
                </button>
              ))}
            </div>

            {/* All seven, always visible — clicking one IS the "make me a
                Tuesday strip" action, so it switches to daycode itself rather
                than making you find the mode first. */}
            <div className="rs-sech">Day strip — the weekday hue</div>
            <div className="rs-gfxgrid wide">
              {INK_MARK_DAY_KEYS.map((d,i)=>(
                <button key={d} title={DAY_NAMES[i]}
                  className={'rs-gfxtile'+((mode==='daycode' && day===d)?' on':'')}
                  onClick={()=>update({ mode:'daycode', day:d })}>
                  <span className="gp" style={{ display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <Swatch form={form} mode="daycode" day={d} grounded={false} theme="night" m={dayM} />
                  </span>
                  <span className="gl">{DAY_ABBR[i]}</span>
                </button>
              ))}
            </div>

            <div className="rs-sech">Size &amp; ground</div>
            <Slider label="Module" val={m} min={floor} max={90} step={1} suffix="px"
              onChange={v=>update(fit({}, v))} />
            {anchored
              ? <div className="rs-mini">Anchored needs no ground — its ink cell takes the outer corner itself.</div>
              : <React.Fragment>
                  <Chips label="Ground — paper-shade plate" options={[{v:false,l:'Off'},{v:true,l:'On'}]}
                    value={el.ground===true} onChange={v=>update(fit({ground:v}, m))} />
                  <div className="rs-mini">Off by default. The plate is canon G2's guard for a stock cell landing on an
                    outer edge — turn it on when the mark sits directly on artwork with no ground of its own.</div>
                </React.Fragment>}
          </div>
        </div>
      </div>
    </div>
  );
}

function InkmarkControls({ el, doc, update }){
  const IM = INK_MARK;
  const form = el.form||'strip-v';
  const f = IM.forms[form] || IM.forms['strip-v'];
  const anchored = form==='square-anchored';
  const grounded = el.ground===true && !anchored;
  const pad = grounded?2:0;
  const gw = f.cols+pad, gh = f.rows+pad;
  const m = Math.max(1, Math.round(Math.min(el.w/gw, el.h/gh)));
  const floor = IM.floors[form.indexOf('short')>=0 ? 'short' : f.square ? 'square' : 'strip'];
  /* resize the box to exact module multiples for a target form/ground/module */
  const fit = (patch, mod)=>{
    const nf = IM.forms[patch.form!=null?patch.form:form] || f;
    const na = (patch.form!=null?patch.form:form)==='square-anchored';
    const ng = (patch.ground!=null?patch.ground:el.ground)===true && !na;
    const np = ng?2:0;
    return Object.assign(patch, { w:Math.round((nf.cols+np)*mod), h:Math.round((nf.rows+np)*mod) });
  };
  const days = INK_MARK_DAY_KEYS.map((d,i)=>({ v:d, l:DAY_ABBR[i] }));
  const [editing, setEditing] = React.useState(false);
  return (
    <React.Fragment>
      {editing && <InkMarkEditor el={el} doc={doc} update={update} onClose={()=>setEditing(false)} />}
      <div className="rs-sech">Ink mark</div>
      {/* The full editor: every form, every mode and all seven day hues drawn
          live, on a ground you can flip. The chips below stay for a quick nudge
          when you already know what you want. */}
      <button className="rs-addrow" onClick={()=>setEditing(true)}
        style={{ marginBottom:10 }}>⧉ Open mark editor — forms, modes, day strips</button>
      <Chips label="Form" options={[
        {v:'strip-v',l:'Strip'},{v:'strip-h',l:'Strip ↔'},
        {v:'strip-short-v',l:'Short'},{v:'strip-short-h',l:'Short ↔'},
        {v:'square',l:'Square'},{v:'square-anchored',l:'Anchored'}]}
        value={form} onChange={v=>update(fit({form:v}, m))} />
      <Chips label="Mode" options={[{v:'full',l:'Full'},{v:'majors',l:'Majors'},{v:'daycode',l:'Day code'},{v:'ink',l:'Ink'}]}
        value={el.mode||'full'} onChange={v=>update({mode:v})} />
      {el.mode==='daycode' && <Chips label="Day — sets the hue" options={days}
        value={el.day||'fri'} onChange={v=>update({day:v})} />}
      <Slider label="Module" val={m} min={floor} max={90} step={1} suffix="px"
        onChange={v=>update(fit({}, v))} />
      {anchored
        ? <div className="rs-mini" style={{ marginTop:2 }}>Anchored needs no ground — its ink cell takes the outer corner itself.</div>
        : <React.Fragment>
            <Chips label="Ground — paper-shade plate" options={[{v:true,l:'On'},{v:false,l:'Off'}]}
              value={el.ground===true} onChange={v=>update(fit({ground:v}, m))} />
            <div className="rs-mini" style={{ marginTop:2 }}>On a poster the ground keeps stock off the outer corners (canon G2) — one module of clear space, baked in.</div>
          </React.Fragment>}
      <Hint tight>Cell order is canon — the panel recolours (mode / day), never reorders. One mark per surface.</Hint>
    </React.Fragment>
  );
}

export { InkMarkEditor, InkmarkControls };
