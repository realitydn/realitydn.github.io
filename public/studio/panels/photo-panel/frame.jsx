/* ============================================================
   REALITY POSTER STUDIO — photo panel · Frame & placement, Mask
   ============================================================ */
import { SHAPE_LABELS as AP_SHAPELAB, MASK_KINDS as AP_MASKS } from '../../studio-data.jsx';
import { Chips, Slider, Fold, Hint } from '../controls.jsx';
import { GfxGrid } from '../gfx-grid.jsx';
function FrameFold({ el, update, frameDirty }){
  return (
      <Fold id="ph-frame" title="Frame & placement" dirty={frameDirty}>
        {el.type==='photo' && <React.Fragment>
          <Chips label="Full bleed" options={[{v:true,l:'Fill format'},{v:false,l:'Free size'}]} value={!!el.bleed} onChange={v=>update({bleed:v})} />
          {el.bleed && <Hint tight>Fills <b>every format</b> edge-to-edge — no resizing per format. Frame the shot with pan/zoom below.</Hint>}
        </React.Fragment>}
        <Chips label="Frame" options={[{v:true,l:'Ink border'},{v:false,l:'Bleed'}]} value={el.frame} onChange={v=>update({frame:v})} />
        {el.type==='logo' && <Hint tight>The whole logo always shows (contain). Zoom <b>below 1×</b> for more paper space around it.</Hint>}
        <Slider label="Zoom" val={el.imgScale!=null?el.imgScale:1} min={0.5} max={3} step={0.02} onChange={v=>update({imgScale:v})} suffix="×" />
        <Slider label="Pan X" val={el.imgX!=null?el.imgX:0} min={-0.5} max={0.5} step={0.01} onChange={v=>update({imgX:v})} />
        <Slider label="Pan Y" val={el.imgY!=null?el.imgY:0} min={-0.5} max={0.5} step={0.01} onChange={v=>update({imgY:v})} />
        <Slider label="Rotate" val={el.imgRot!=null?el.imgRot:0} min={-180} max={180} step={1} onChange={v=>update({imgRot:v})} suffix="°" />
        <button className="rs-addrow" onClick={()=>update({imgScale:1, imgX:0, imgY:0, imgRot:0})}>↺ Reset image</button>
      </Fold>
  );
}
function MaskFold({ el, update }){
  return (
    <React.Fragment>
      {/* MASK — the same shape registry the Shape element draws from, applied
          as the photo's silhouette. Ink border follows the mask, and so does
          the shadow, so a circle photo casts a circle shadow.

          Its own fold, CLOSED by default. Eighteen shape tiles was the tallest
          block in the panel and it sat INSIDE "Frame & placement", pushing
          Zoom / Pan / Rotate off-screen on every photo — and most photos never
          take a mask. The head badge names the active mask, so a set one is
          never hidden by the collapse. */}
      {el.type==='photo' && <Fold id="ph-mask" title="Mask"
        badge={(el.mask&&el.mask!=='none') ? (AP_SHAPELAB[el.mask]||el.mask) : null}>
        <GfxGrid type="shape" prop="kind" value={el.mask||'none'} onPick={v=>update({mask:v})}
          items={AP_MASKS.map(k=> k==='none' ? { k:'none', l:'None' } : { k, l:AP_SHAPELAB[k]||k })} />
        {(el.mask&&el.mask!=='none') && <Hint tight>Cut from the same shape set as the graphics library — pan/zoom in <b>Frame &amp; placement</b> to re-frame inside it.</Hint>}
      </Fold>}
    </React.Fragment>
  );
}

export { FrameFold, MaskFold };
