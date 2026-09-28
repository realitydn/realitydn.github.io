/* ============================================================
   REALITY POSTER STUDIO — photo panel · Recompose
   ============================================================
   A move changes WHERE the picture is — cut into strips and slid,
   broken into pieces, dragged across the copier glass, repeated,
   reframed — before the press prints it (riso-engine RECOMPOSE), so
   whatever treatment is chosen prints the recomposed photo as one.

   Like the treatment strip, the moves are live thumbnails of YOUR
   photo under YOUR treatment, each at its own dials — so choosing is
   looking, not reading. Moves with a point or a line (a centre, the
   point of impact, the mirror line, the drag line) also get a handle
   on the canvas while the photo is selected (studio-canvas.jsx).
   ============================================================ */
import { risoSig, photoSources, drawPhotoPress } from '../../studio-element.jsx';
import { COMPOSE_MOVES, COMPOSE_BY, composeHandle } from '../../compose-moves.js';
import { Chips, Slider, Fold, Hint } from '../controls.jsx';

const THUMB_W = 104;
const THUMB_DEBOUNCE_MS = 260;

function MoveStrip({ el, inkKey, theme, onPick }){
  const refs = React.useRef({});
  const sig = [risoSig?risoSig(el):'', el.src, el.src2, el.sample, el.treatment, inkKey, theme,
    el.imgScale, el.imgX, el.imgY, el.imgRot, el.img2Scale, el.img2X, el.img2Y, el.img2Rot,
    Math.round((el.h/el.w)*1000)].join('|');
  React.useEffect(()=>{
    if(!window.RISO || !drawPhotoPress) return;
    let alive=true;
    const timer=setTimeout(()=>{
      photoSources(el).then(([s1,s2])=>{
        if(!alive || !s1) return;
        const H=Math.max(24, Math.round(THUMB_W*(el.h/el.w)));
        for(const m of COMPOSE_MOVES){
          const cv=refs.current[m.v]; if(!cv) continue;
          cv.width=THUMB_W; cv.height=H;
          /* the thumbnail previews the CLICK: this move at the element's dials,
             the snap off (a 104px frame has no poster grid to meet) */
          drawPhotoPress(cv, el, inkKey, theme, s1, s2, { compose:m.v, composeSnap:false });
        }
      });
    }, THUMB_DEBOUNCE_MS);
    return ()=>{ alive=false; clearTimeout(timer); };
  }, [sig]);
  return (
    <div className="rs-gfxgrid rs-treatgrid">
      {COMPOSE_MOVES.map(m=>(
        <button key={m.v} type="button" title={m.l+' — '+m.tag}
          className={'rs-gfxtile'+((el.compose||'none')===m.v?' on':'')} onClick={()=>onPick(m.v)}>
          <canvas className="tp" ref={c=>{ refs.current[m.v]=c; }} />
          <span className="gl">{m.l}</span>
        </button>
      ))}
    </div>
  );
}

const PATTERNS = [{v:'random',l:'Random'},{v:'stairs',l:'Stairs'},{v:'alternate',l:'Alternate'},{v:'wave',l:'Wave'}];
const num = (v,d)=> v!=null ? v : d;

function MoveDials({ el, update }){
  const m = el.compose||'none';
  const S = (k,l,min,max,step,def,suffix)=>
    <Slider label={l} val={num(el[k],def)} min={min} max={max} step={step} suffix={suffix} onChange={v=>update({[k]:v})} />;
  if(m==='slice') return <React.Fragment>
    <Chips label="Pattern" options={PATTERNS} value={el.slicePattern||'random'} onChange={v=>update({slicePattern:v})} />
    {S('sliceCount','Strips',2,30,1,12)}
    {S('sliceShift','Slide',0,160,1,40,'px')}
    <Chips label="Cut" options={[{v:0,l:'Across'},{v:90,l:'Down'},{v:-12,l:'Tilted'}]} value={num(el.sliceAngle,0)} onChange={v=>update({sliceAngle:v})} />
    {S('sliceAngle','Angle',-90,90,1,0,'°')}
    {S('sliceGap','Gap',0,16,0.5,0,'px')}
  </React.Fragment>;
  if(m==='weave') return <React.Fragment>
    {S('weaveCount','Pairs',2,30,1,12)}
    {S('weaveRatio','Share',0.1,0.9,0.02,0.5)}
    <Chips label="Strips run" options={[{v:90,l:'Down'},{v:0,l:'Across'},{v:45,l:'Diagonal'}]} value={num(el.weaveAngle,90)} onChange={v=>update({weaveAngle:v})} />
    <Hint tight>{el.src2
      ? <span>Strips alternate between the photo and the <b>Second exposure</b> (its blend is set aside while you weave).</span>
      : <span>No second image yet, so the strips alternate with the photo's own mirror image. Add one under <b>Second exposure</b> to weave two photos.</span>}</Hint>
  </React.Fragment>;
  if(m==='radial') return <React.Fragment>
    <Chips label="Cut" options={[{v:'rings',l:'Rings'},{v:'wedges',l:'Wedges'}]} value={el.radMode||'rings'} onChange={v=>update({radMode:v})} />
    {(el.radMode||'rings')==='rings'
      ? <React.Fragment>{S('ringWidth','Ring width',10,90,1,32,'px')}{S('radTurn','Turn',0,90,1,26,'°')}</React.Fragment>
      : <React.Fragment>{S('wedgeCount','Wedges',3,36,1,14)}{S('wedgePush','Push',0,80,1,28,'px')}</React.Fragment>}
    <Chips label="Pattern" options={PATTERNS.slice(0,3)} value={el.radPattern||'random'} onChange={v=>update({radPattern:v})} />
    {S('radGap','Gap',0,10,0.5,0,'px')}
  </React.Fragment>;
  if(m==='tiles') return <React.Fragment>
    {S('tileSize','Tile size',24,160,1,72,'px')}
    {S('tileMove','Nudge',0,30,0.5,6,'px')}
    {S('tileTurn','Turn',0,20,0.5,5,'°')}
    {S('tileShuffle','Swap',0,1,0.02,0)}
    {S('tileGrout','Grout',0,16,0.5,4,'px')}
  </React.Fragment>;
  if(m==='shards') return <React.Fragment>
    {S('shardCount','Pieces',6,90,1,42)}
    {S('shardPush','Push',0,40,0.5,14,'px')}
    {S('shardTurn','Turn',0,12,0.5,3,'°')}
    {S('shardCrack','Crack',0,5,0.1,1.6,'px')}
  </React.Fragment>;
  if(m==='drag') return <React.Fragment>
    <Chips label="Direction" options={[{v:'down',l:'↓ Down'},{v:'up',l:'↑ Up'},{v:'right',l:'→ Right'},{v:'left',l:'← Left'}]} value={el.dragDir||'down'} onChange={v=>update({dragDir:v})} />
    {S('dragPos','Starts at',0.05,0.95,0.01,0.6)}
    {S('dragSpeed','Speed',0.02,1,0.01,0.22)}
    {S('dragWobble','Wobble',0,1,0.02,0.4)}
    {S('dragFade','Fade',0,1,0.02,0.35)}
    <Hint tight>Slow is streaks, fast is a stretched copy. Try it under the <b>Copier</b>.</Hint>
  </React.Fragment>;
  if(m==='echo') return <React.Fragment>
    <Chips label="Kind" options={[{v:'trail',l:'Trail'},{v:'tunnel',l:'Tunnel'}]} value={el.echoMode||'trail'} onChange={v=>update({echoMode:v})} />
    {S('echoCount','Copies',2,8,1,4)}
    {(el.echoMode||'trail')==='trail'
      ? <React.Fragment>
          {S('echoStep','Step',0,80,1,36,'px')}
          {S('echoAngle','Angle',-180,180,1,0,'°')}
          <Chips label="Wins" options={[{v:'lighten',l:'Lightest'},{v:'darken',l:'Darkest'}]} value={el.echoBlend||'lighten'} onChange={v=>update({echoBlend:v})} />
          {S('echoFade','Fade',0.4,1,0.02,0.78)}
          <Hint tight><b>Lightest</b> repeats the bright parts (a flash on a dark room); <b>Darkest</b> the dark ones (a figure on a light wall).</Hint>
        </React.Fragment>
      : <React.Fragment>
          {S('echoScale','Scale',0.5,0.92,0.01,0.76)}
          {S('echoBorder','Border',0,14,0.5,5,'px')}
        </React.Fragment>}
  </React.Fragment>;
  if(m==='mirror') return <React.Fragment>
    <Chips label="Kind" options={[{v:'book',l:'Book'},{v:'quad',l:'Quad'}]} value={el.mirrorMode||'book'} onChange={v=>update({mirrorMode:v})} />
    <Chips label="Keep" options={[{v:false,l:(el.mirrorMode==='quad'?'Top left':'Left')},{v:true,l:(el.mirrorMode==='quad'?'Bottom right':'Right')}]}
      value={!!el.mirrorFlip} onChange={v=>update({mirrorFlip:v})} />
  </React.Fragment>;
  if(m==='panels') return <React.Fragment>
    {S('panelCount','Panels',2,5,1,3)}
    <Chips label="Split" options={[{v:'across',l:'Side by side'},{v:'down',l:'Stacked'}]} value={el.panelDir||'across'} onChange={v=>update({panelDir:v})} />
    {S('panelZoom','Zoom step',1,3,0.05,1.8,'×')}
    {S('panelGutter','Gutter',0,20,0.5,6,'px')}
  </React.Fragment>;
  return null;
}

function RecomposeFold({ el, update, inkKey, theme }){
  const move = COMPOSE_BY[el.compose||'none'] || COMPOSE_BY.none;
  const active = move.v!=='none';
  const h = composeHandle(el);
  const pick = v=>update({ compose:v });
  return (
    <Fold id="ph-compose" title="Recompose" badge={active ? move.l : null}
      hint={<React.Fragment>Change <b>where</b> the picture is before the press prints it. Every treatment prints the recomposed photo as one picture.</React.Fragment>}>
      <MoveStrip el={el} inkKey={inkKey} theme={theme} onPick={pick} />
      {active && <Hint tight><b>{move.l}</b> · {move.tag}</Hint>}
      {active && <MoveDials el={el} update={update} />}
      {active && h && <div className="rs-mini" style={{ margin:'2px 0 8px' }}>
        Drag the cyan {h.kind==='line' ? 'line' : 'point'} on the photo to move the {h.kind==='line' ? 'drag line' : h.name}.{' '}
        {h.kind==='point' && <button className="rs-linkbtn" onClick={()=>update({ [h.keys[0]]:0, [h.keys[1]]:0 })}>Centre it</button>}
      </div>}
      {active && move.cut && <Chips label="Gaps print" options={[{v:'paper',l:'Paper'},{v:'ink',l:'Ink'}]}
        value={el.composeGap||'paper'} onChange={v=>update({ composeGap:v })} />}
      {active && move.snap && <React.Fragment>
        <Chips label="Poster grid" options={[{v:false,l:'Free'},{v:true,l:'Snap cuts'}]} value={!!el.composeSnap} onChange={v=>update({ composeSnap:v })} />
        <Hint tight>Snap makes strip, tile, ring and panel sizes whole grid steps and lines the cuts up with the grid, so they meet the type placed on it.</Hint>
      </React.Fragment>}
      {active && move.rnd && <button className="rs-addrow" onClick={()=>update({ composeSeed:((el.composeSeed|0)||1)+1 })}>⟳ Shuffle</button>}
    </Fold>
  );
}

export { RecomposeFold };
