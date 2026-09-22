/* ============================================================
   REALITY POSTER STUDIO — inspector · block, shape, icon, rule, burst
   ============================================================ */
import { InkRow } from '../../../studio-shared/press-panels.jsx';
import {
  PALETTE as AP_PAL, SHAPE_KINDS as AP_SHAPES, SHAPE_LABELS as AP_SHAPELAB, RULE_PATTERNS as AP_RULES, RULE_TERMS as AP_TERMS,
} from '../../studio-data.jsx';
import { Chips, Slider, Hint, Swatches } from '../controls.jsx';
import { GfxGrid, IconPicker } from '../gfx-grid.jsx';
function BlockControls({ el, doc, update }){
  return (
    <React.Fragment>
      <div className="rs-sech">Fill</div>
      <Swatches value={el.fill!=null?el.fill:el.color} onChange={v=>update({fill:v})}
        autoTitle="Auto — the poster accent" autoBg={AP_PAL[doc.accent]} />
      <Slider label="Opacity" val={el.opacity!=null?el.opacity:1} min={0.08} max={1} step={0.02} onChange={v=>update({opacity:v})} />
      <div className="rs-sech">Texture</div>
      <Slider label="Grain" val={el.grain!=null?el.grain:0} min={0} max={1} step={0.02} onChange={v=>update({grain:v})} />
      {el.grain>0 && <React.Fragment>
        <Slider label="Grain size" val={el.grainSize!=null?el.grainSize:2} min={0.5} max={5} step={0.25} onChange={v=>update({grainSize:v})} suffix="px" />
        <InkRow label="Grain ink" value={el.grainInk} onChange={v=>update({grainInk:v})} autoTitle="Auto — neutral tooth" />
        <Chips label="Character" options={[{v:'soft',l:'Soft'},{v:'dirty',l:'Dirty'}]} value={el.grainBlend||'soft'} onChange={v=>update({grainBlend:v})} />
      </React.Fragment>}
      <Hint tight>A pinch of grain makes a flat field feel printed, not digital.</Hint>
      <div className="rs-sech">Edge</div>
      <Chips options={[{v:true,l:'Ink border'},{v:false,l:'Bleed'}]} value={!!el.outline} onChange={v=>update({outline:v})} />
    </React.Fragment>
  );
}

/* ============================================================
   GRAPHICAL ELEMENT PANELS — shape · icon · rule · burst.
   Each opens with the kind picker (the same grid as the library, so
   swapping a circle for a hexagon is one click and never needs a
   re-drag), then that family's own dials. Colour is always the shared
   Swatches, so Auto keeps them on the poster accent.
   ============================================================ */
function ShapeControls({ el, doc, update }){
  const hollow = el.style==='outline';
  return (
    <React.Fragment>
      {/* "Silhouette", not "Shape" — the row above already says the element
          type, and two SHAPE headings in a row read like a bug. */}
      <div className="rs-sech">Silhouette</div>
      <GfxGrid type="shape" items={AP_SHAPES.map(k=>({ k, l:AP_SHAPELAB[k]||k }))} prop="kind"
        value={el.kind||'circle'} onPick={v=>update({kind:v})} />
      <div className="rs-sech">Fill</div>
      {/* Outline needs a line to draw — dial one in on the way there rather
          than leaving the shape invisible at stroke 0. */}
      <Chips options={[{v:'solid',l:'Solid'},{v:'outline',l:'Outline'}]} value={hollow?'outline':'solid'}
        onChange={v=>update(v==='outline' && !(el.stroke>0) ? { style:v, stroke:10 } : { style:v })} />
      <Swatches value={el.fill!=null?el.fill:el.color} onChange={v=>update({fill:v})}
        autoTitle="Auto — the poster accent" autoBg={AP_PAL[doc.accent]} />
      <Slider label="Opacity" val={el.opacity!=null?el.opacity:1} min={0.08} max={1} step={0.02} onChange={v=>update({opacity:v})} />
      {hollow
        ? <Slider label="Line weight" val={el.stroke!=null?el.stroke:8} min={1} max={60} step={1} onChange={v=>update({stroke:v})} suffix="px" />
        : <React.Fragment>
            <div className="rs-sech">Keyline</div>
            <Slider label="Weight" val={el.stroke!=null?el.stroke:0} min={0} max={40} step={1} onChange={v=>update({stroke:v})} suffix="px" />
            {el.stroke>0 && <Swatches label="Keyline colour" value={el.strokeColor||'fg'} onChange={v=>update({strokeColor:v})}
              autoTitle="Auto — the theme ink" />}
          </React.Fragment>}
      {!hollow && <React.Fragment>
        <div className="rs-sech">Texture</div>
        <Slider label="Grain" val={el.grain!=null?el.grain:0} min={0} max={1} step={0.02} onChange={v=>update({grain:v})} />
        {el.grain>0 && <React.Fragment>
          <Slider label="Grain size" val={el.grainSize!=null?el.grainSize:2} min={0.5} max={5} step={0.25} onChange={v=>update({grainSize:v})} suffix="px" />
          <InkRow label="Grain ink" value={el.grainInk} onChange={v=>update({grainInk:v})} autoTitle="Auto — neutral tooth" />
          <Chips label="Character" options={[{v:'soft',l:'Soft'},{v:'dirty',l:'Dirty'}]} value={el.grainBlend||'soft'} onChange={v=>update({grainBlend:v})} />
        </React.Fragment>}
        <Hint tight>Grain is clipped to the silhouette, so a grained hexagon stays a hexagon.</Hint>
      </React.Fragment>}
    </React.Fragment>
  );
}

function IconControls({ el, doc, update }){
  return (
    <React.Fragment>
      <div className="rs-sech">Icon</div>
      <IconPicker value={el.kind} onPick={v=>update({kind:v})} />
      <div className="rs-sech">Ink</div>
      <Chips options={[{v:false,l:'Line'},{v:true,l:'Solid'}]} value={!!el.solid} onChange={v=>update({solid:v})} />
      <Swatches value={el.fill!=null?el.fill:el.color} onChange={v=>update({fill:v})}
        autoTitle="Auto — the poster accent" autoBg={AP_PAL[doc.accent]} />
      <Slider label="Stroke weight" val={el.strokeScale!=null?el.strokeScale:1} min={0.4} max={3} step={0.1} onChange={v=>update({strokeScale:v})} suffix="×" />
      <Slider label="Opacity" val={el.opacity!=null?el.opacity:1} min={0.08} max={1} step={0.02} onChange={v=>update({opacity:v})} />
      <Hint tight>The Year 2 glyph set — the same vectors the app and Print Studio draw.</Hint>
    </React.Fragment>
  );
}

function RuleControls({ el, doc, update }){
  const pat = el.pattern||'solid';
  const shaped = pat==='zigzag'||pat==='wave'||pat==='square';
  const spaced = pat!=='solid'&&pat!=='double'&&pat!=='triple';
  return (
    <React.Fragment>
      <div className="rs-sech">Pattern</div>
      <GfxGrid type="rule" items={AP_RULES.map(p=>({ k:p.v, l:p.l }))} prop="pattern"
        value={pat} onPick={v=>update({pattern:v})} />
      <div className="rs-sech">Line</div>
      <Swatches value={el.fill!=null?el.fill:el.color} onChange={v=>update({fill:v})}
        autoTitle="Auto — the poster accent" autoBg={AP_PAL[doc.accent]} />
      <Slider label="Weight" val={el.weight!=null?el.weight:6} min={1} max={40} step={1} onChange={v=>update({weight:v})} suffix="px" />
      {spaced && <Slider label="Spacing" val={el.spacing!=null?el.spacing:20} min={4} max={120} step={1} onChange={v=>update({spacing:v})} suffix="px" />}
      {pat==='dashed' && <Slider label="Dash length" val={el.dashRatio!=null?el.dashRatio:0.55} min={0.1} max={0.9} step={0.05} onChange={v=>update({dashRatio:v})} />}
      {shaped && <Slider label="Amplitude" val={el.amp!=null?el.amp:10} min={1} max={80} step={1} onChange={v=>update({amp:v})} suffix="px" />}
      {(pat==='double'||pat==='triple') && <Slider label="Line gap" val={el.gap!=null?el.gap:12} min={2} max={80} step={1} onChange={v=>update({gap:v})} suffix="px" />}
      {pat==='ticks' && <React.Fragment>
        <Slider label="Tick length" val={el.tickLen!=null?el.tickLen:10} min={2} max={60} step={1} onChange={v=>update({tickLen:v})} suffix="px" />
        <Chips label="Tick direction" options={[{v:'both',l:'Both'},{v:'up',l:'Up'},{v:'down',l:'Down'}]} value={el.tickDir||'both'} onChange={v=>update({tickDir:v})} />
      </React.Fragment>}
      <div className="rs-sech">Ends</div>
      <Chips options={AP_TERMS} value={el.term||'none'} onChange={v=>update({term:v})} />
      {el.term && el.term!=='none' && <React.Fragment>
        <Chips label="Which end" options={[{v:'end',l:'End'},{v:'start',l:'Start'},{v:'both',l:'Both'}]} value={el.termAt||'end'} onChange={v=>update({termAt:v})} />
        <Slider label="Terminal size" val={el.termScale!=null?el.termScale:1} min={0.4} max={3} step={0.1} onChange={v=>update({termScale:v})} suffix="×" />
      </React.Fragment>}
      <Chips label="Caps" options={[{v:'round',l:'Round'},{v:'butt',l:'Flat'}]} value={el.cap||'round'} onChange={v=>update({cap:v})} />
      <Slider label="Opacity" val={el.opacity!=null?el.opacity:1} min={0.08} max={1} step={0.02} onChange={v=>update({opacity:v})} />
      <Hint tight>Rotate the element 90° for a vertical rule — the geometry always runs along the box.</Hint>
    </React.Fragment>
  );
}

function BurstControls({ el, doc, update }){
  return (
    <React.Fragment>
      <div className="rs-sech">Burst</div>
      <Swatches value={el.fill!=null?el.fill:el.color} onChange={v=>update({fill:v})}
        autoTitle="Auto — the poster accent" autoBg={AP_PAL[doc.accent]} />
      <Slider label="Rays" val={el.rays!=null?el.rays:16} min={3} max={64} step={1} onChange={v=>update({rays:v})} />
      <Slider label="Spin" val={el.spin!=null?el.spin:0} min={0} max={90} step={1} onChange={v=>update({spin:v})} suffix="°" />
      <Slider label="Hub" val={el.hub!=null?el.hub:0} min={0} max={0.9} step={0.02} onChange={v=>update({hub:v})} />
      {el.hub>0 && <Swatches label="Hub colour" value={el.hubFill||'paper'} onChange={v=>update({hubFill:v})} autoTitle="Auto — the paper" />}
      <Slider label="Opacity" val={el.opacity!=null?el.opacity:1} min={0.08} max={1} step={0.02} onChange={v=>update({opacity:v})} />
      <Hint tight>Send it behind a title (▼) and knock the hub out to ring a photo.</Hint>
    </React.Fragment>
  );
}

export { BlockControls, ShapeControls, IconControls, RuleControls, BurstControls };
