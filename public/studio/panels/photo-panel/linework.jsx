/* ============================================================
   REALITY POSTER STUDIO — photo panel · Linework
   Outline or Contour lines as their own plate, printed over whatever
   the treatment made (riso-engine linework). Shipped 13.10.26 from the
   Linework proposal: it replaces the Outline and Contour treatments for
   new work, built from the dials those two were actually used with —
   Detail, De-speckle, Bands, Smoothing, Weight — plus the line ink and
   a fade that stands in for their old backdrops and fills.
   ============================================================ */
import { InkRow } from '../../../studio-shared/press-panels.jsx';
import { inkTitle } from '../../../studio-shared/brand.js';
import { Chips, Slider, Fold, Hint } from '../controls.jsx';

const LINE_KINDS = [{v:'none',l:'Off'},{v:'outline',l:'Outline'},{v:'contour',l:'Contour'}];
/* the dials the fold's badge and the Press tab's count read */
const LINE_KEYS = ['lines','lineDetail','lineClean','lineBands','lineSmooth','lineWeight','lineInk','lineFade'];

function LineworkFold({ el, update, inkKey }){
  const kind = el.lines||'none';
  const on = kind!=='none';
  const RP = window.RISO && window.RISO.press;
  /* what Auto prints in — the engine's partnerRGB: the second ink if one is
     set, else the main ink's warm/cool partner */
  const autoInk = el.ink2 || (RP && RP.PARTNER && RP.PARTNER[inkKey]) || 'blue';
  return (
    <Fold id="ph-lines" title="Linework" badge={on ? (kind==='outline'?'Outline':'Contour') : null}
      hint={<React.Fragment>Lines traced from the photo and printed as <b>their own plate</b>, opaque, over whatever the treatment made — the raw photo included. They follow Recompose, and miss register with the press.</React.Fragment>}>
      {/* switching kind hands Simplify / Smoothing back to that kind's own default */}
      <Chips label="Lines" options={LINE_KINDS} value={kind} onChange={v=>update({ lines:v, lineSmooth:null })} />
      {kind==='outline' && <React.Fragment>
        <Slider label="Detail" val={el.lineDetail!=null?el.lineDetail:0.3} min={0} max={1} step={0.02} onChange={v=>update({lineDetail:v})} />
        <Slider label="Simplify" val={el.lineSmooth!=null?el.lineSmooth:1.6} min={0} max={8} step={0.1} onChange={v=>update({lineSmooth:v})} />
        <Slider label="De-speckle" val={el.lineClean!=null?el.lineClean:20} min={0} max={200} step={2} onChange={v=>update({lineClean:v})} />
      </React.Fragment>}
      {kind==='contour' && <React.Fragment>
        <Slider label="Bands" val={el.lineBands!=null?el.lineBands:5} min={2} max={12} step={1} onChange={v=>update({lineBands:v})} />
        <Slider label="Smoothing" val={el.lineSmooth!=null?el.lineSmooth:2.2} min={0} max={10} step={0.2} onChange={v=>update({lineSmooth:v})} />
      </React.Fragment>}
      {on && <React.Fragment>
        <Slider label="Weight" val={el.lineWeight!=null?el.lineWeight:2} min={1} max={6} step={0.5} onChange={v=>update({lineWeight:v})} suffix="px" />
        <InkRow label="Line ink" value={el.lineInk||null} onChange={v=>update({lineInk:v})} autoTitle={'Auto — '+inkTitle(autoInk)+', the second ink'} />
        {!el.lineInk && <Hint tight>Auto prints the lines in <b>{inkTitle(autoInk)}</b>, the second ink. Pick black for a keyline, or cream to knock the lines out of a dark print.</Hint>}
        <Slider label="Fade the print" val={el.lineFade||0} min={0} max={1} step={0.02} onChange={v=>update({lineFade:v})} />
        <Hint tight>Fades whatever is under the lines toward the paper. All the way up is lines on bare paper.</Hint>
      </React.Fragment>}
    </Fold>
  );
}

export { LineworkFold, LINE_KEYS };
