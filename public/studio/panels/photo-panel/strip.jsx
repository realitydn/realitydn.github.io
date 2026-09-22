/* ============================================================
   REALITY POSTER STUDIO — photo panel · treatment strip
   ============================================================ */
import { risoSig, photoSources, drawPhotoPress } from '../../studio-element.jsx';
import { TREATS, TREAT_PRESETS } from './looks.js';
/* ============================================================
   TREATMENT STRIP — every press, live on YOUR photo.
   ============================================================
   Fourteen words in a row of chips ask you to already know what
   "Overprint" looks like. Fourteen thumbnails of the photo in your
   hand do not. Ported from the app's Darkroom, which puts the same
   strip first because picking the press IS the first decision.

   A thumbnail previews the CLICK, not the current state: each one
   renders its treatment at the TREAT_PRESETS baseline the chip
   would apply, over your paper, inks, framing and exposure. So it
   shows what you would actually get, and nudging a halftone's dot
   size does not turn the chooser into a second preview.

   Sizes in this engine are design px on a 520-wide frame, so a dot
   covers the same fraction of a 128px thumbnail as of a 900px
   render — the strip is honest at any width. 128 is simply where
   fourteen of them stop costing anything: about a quarter of one
   full photo render, behind a debounce that a slider drag resets.
   ============================================================ */
const THUMB_W = 128;
const THUMB_DEBOUNCE_MS = 200;
function TreatmentStrip({ el, inkKey, theme, onPick }){
  const refs = React.useRef({});
  /* Everything a thumbnail is a preview OF. risoSig covers every engine dial
     (the per-treatment ones are overridden by the patch, so they only ever
     redraw the same image — cheap, and it can never go stale); the rest is
     what lives outside it: the source, the framing, and the ink. */
  const sig = [risoSig?risoSig(el):'', el.src, el.src2, el.sample, el.type,
    inkKey, theme, el.imgScale, el.imgX, el.imgY, el.imgRot,
    el.img2Scale, el.img2X, el.img2Y, el.img2Rot, Math.round((el.h/el.w)*1000)].join('|');
  React.useEffect(()=>{
    if(!window.RISO || !photoSources || !drawPhotoPress) return;
    let alive=true;
    const timer=setTimeout(()=>{
      photoSources(el).then(([s1,s2])=>{
        if(!alive || !s1) return;
        const H=Math.max(24, Math.round(THUMB_W*(el.h/el.w)));
        for(let i=0;i<TREATS.length;i++){
          const key=TREATS[i].v, cv=refs.current[key];
          if(!cv) continue;
          cv.width=THUMB_W; cv.height=H;
          /* the engine's globals are set inside drawPhotoPress and consumed
             synchronously by render(), so these fourteen calls cannot
             interleave with the poster's own press */
          drawPhotoPress(cv, el, inkKey, theme, s1, s2,
            Object.assign({ treatment:key }, TREAT_PRESETS[key]||{}));
        }
      });
    }, THUMB_DEBOUNCE_MS);
    return ()=>{ alive=false; clearTimeout(timer); };
  }, [sig]);
  return (
    <div className="rs-gfxgrid rs-treatgrid">
      {TREATS.map(tr=>(
        <button key={tr.v} type="button" title={tr.l+' — '+tr.tag}
          className={'rs-gfxtile'+(el.treatment===tr.v?' on':'')} onClick={()=>onPick(tr.v)}>
          <canvas className="tp" ref={c=>{ refs.current[tr.v]=c; }} />
          <span className="gl">{tr.l}</span>
        </button>
      ))}
    </div>
  );
}

export { TreatmentStrip };
