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
import { COMPOSE_MOVES, COMPOSE_BY, composeHandles } from '../../compose-moves.js';
import { InkRow } from '../../../studio-shared/press-panels.jsx';
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
          drawPhotoPress(cv, el, inkKey, theme, s1, s2, { compose:m.v, composeSnap:false, lines:'none' });   // lines: see strip.jsx
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
  const sliceBand = (el.sliceFrom||0)>0 || num(el.sliceTo,1)<1;
  const dragBand = num(el.dragEnd,1)<1;
  if(m==='slice') return <React.Fragment>
    <Chips label="Pattern" options={PATTERNS} value={el.slicePattern||'random'} onChange={v=>update({slicePattern:v})} />
    {S('sliceCount','Strips',2,30,1,12)}
    {S('sliceShift','Slide',0,160,1,40,'px')}
    <Chips label="Cut" options={[{v:0,l:'Across'},{v:90,l:'Down'},{v:-12,l:'Tilted'}]} value={num(el.sliceAngle,0)} onChange={v=>update({sliceAngle:v})} />
    {S('sliceAngle','Angle',-90,90,1,0,'°')}
    {S('sliceGap','Gap',0,16,0.5,0,'px')}
    {S('sliceUneven','Uneven',0,1,0.02,0)}
    {S('sliceSpread','Spread',-12,40,0.5,0,'px')}
    {S('sliceWave','Wave',0,40,0.5,0,'px')}
    {num(el.sliceWave,0)>0 && S('sliceWaveLen','Wave length',30,300,5,120,'px')}
    <Chips label="Slice" options={[{v:false,l:'Whole photo'},{v:true,l:'A band'}]} value={sliceBand}
      onChange={v=>update(v ? { sliceFrom:0.3, sliceTo:0.7 } : { sliceFrom:0, sliceTo:1 })} />
    {sliceBand && <Hint tight>Drag the two cyan lines on the photo to set the band; outside it the photo stays whole.</Hint>}
    <Hint tight><b>Uneven</b> cuts strips by hand, wide and narrow. <b>Spread</b> parts them from the middle; below zero they overlap. <b>Wave</b> curves the cuts.</Hint>
  </React.Fragment>;
  if(m==='weave') return <React.Fragment>
    {S('weaveCount','Pairs',2,30,1,12)}
    {S('weaveRatio','Share',0.1,0.9,0.02,0.5)}
    <Chips label="Strips run" options={[{v:90,l:'Down'},{v:0,l:'Across'},{v:45,l:'Diagonal'}]} value={num(el.weaveAngle,90)} onChange={v=>update({weaveAngle:v})} />
    <Hint tight>{el.src2
      ? <span>Strips alternate between the photo and the <b>Second exposure</b> (its blend is set aside while you weave).</span>
      : <span>The strips alternate with the photo's own mirror image.</span>}</Hint>
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
    {S('shardMissing','Missing',0,0.8,0.02,0)}
    {S('shardFall','Fall',0,80,1,0,'px')}
    {S('shardZoom','Thick glass',0,0.4,0.01,0)}
    {num(el.shardCrack,1.6)>0 && <InkRow label="Crack ink" value={el.shardCrackInk||null} onChange={v=>update({shardCrackInk:v})} autoTitle="Off — the cracks show the gap" />}
    <Hint tight><b>Missing</b> knocks pieces out to the gap. <b>Fall</b> slides them down, more toward the bottom. <b>Thick glass</b> magnifies each piece. A <b>crack ink</b> prints the cracks as a line over the finished print.</Hint>
  </React.Fragment>;
  if(m==='drag') return <React.Fragment>
    <Chips label="Direction" options={[{v:'down',l:'↓ Down'},{v:'up',l:'↑ Up'},{v:'right',l:'→ Right'},{v:'left',l:'← Left'}]} value={el.dragDir||'down'} onChange={v=>update({dragDir:v})} />
    {S('dragPos','Starts at',0.05,0.95,0.01,0.6)}
    {S('dragSpeed','Speed',0.02,1,0.01,0.22)}
    {S('dragWobble','Wobble',0,1,0.02,0.4)}
    {S('dragTilt','Tilt',-45,45,1,0,'°')}
    {S('dragFade','Fade',0,1,0.02,0.35)}
    {S('dragStutter','Stutter',0,1,0.02,0)}
    {S('dragSlip','Colour slip',0,1,0.02,0)}
    <Chips label="Stops" options={[{v:false,l:'At the edge'},{v:true,l:'At a line'}]} value={dragBand}
      onChange={v=>update({ dragEnd: v ? Math.min(0.98, num(el.dragPos,0.6)+0.25) : 1 })} />
    <Hint tight>Slow is streaks, fast is a stretched copy. Try it under the <b>Copier</b>. <b>Tilt</b> turns the drag off its direction; <b>Stutter</b> stops and restarts the head in hard bands; <b>Colour slip</b> drags red, green and blue at different speeds.</Hint>
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
          {S('echoGrow','Grow',-0.3,0.3,0.01,0)}
          {S('echoTurn','Turn',-45,45,1,0,'°')}
          <Hint tight><b>Lightest</b> repeats the bright parts (a flash on a dark room); <b>Darkest</b> the dark ones (a figure on a light wall).</Hint>
        </React.Fragment>
      : <React.Fragment>
          {S('echoScale','Scale',0.5,0.92,0.01,0.76)}
          {S('echoBorder','Border',0,14,0.5,5,'px')}
          {S('echoSpin','Spin',-30,30,0.5,0,'°')}
          <Chips label="Frame" options={[{v:'rect',l:'Photo'},{v:'circle',l:'Oval'},{v:'arch',l:'Arch'},{v:'diamond',l:'Diamond'}]}
            value={el.echoShape||'rect'} onChange={v=>update({echoShape:v})} />
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
  const hs = composeHandles(el);
  const own = hs.find(x=>x.kind==='point' && x.mul===1);   // the move's own point (Centre it)
  const pick = v=>update({ compose:v });
  /* where the move happens — the How-the-ink-sits region chips, onto
     composeRegion + cmpRegInvert (Centre and Edges are one disc, flipped) */
  const reg = el.composeRegion||'none';
  const regChip = reg==='radial' ? (el.cmpRegInvert?'edges':'centre') : reg;
  const pickReg = v=>update(v==='none' ? { composeRegion:'none' } : v==='centre' ? { composeRegion:'radial', cmpRegInvert:false }
    : v==='edges' ? { composeRegion:'radial', cmpRegInvert:true } : { composeRegion:v, cmpRegInvert:false });
  return (
    <Fold id="ph-compose" title="Recompose" badge={active ? move.l : null}
      hint={<React.Fragment>Change <b>where</b> the picture is before the press prints it. Every treatment prints the recomposed photo as one picture.</React.Fragment>}>
      <MoveStrip el={el} inkKey={inkKey} theme={theme} onPick={pick} />
      {active && <Hint tight><b>{move.l}</b> · {move.tag}</Hint>}
      {active && <MoveDials el={el} update={update} />}
      {active && hs.length>0 && <div className="rs-mini" style={{ margin:'2px 0 8px' }}>
        Drag the cyan {hs.length>1 ? 'handles' : hs[0].kind==='line' ? 'line' : 'point'} on the photo to move the {hs.map(x=>x.name).join(', ')}.{' '}
        {own && <button className="rs-linkbtn" onClick={()=>update({ [own.keys[0]]:0, [own.keys[1]]:0 })}>Centre it</button>}
      </div>}
      {active && <React.Fragment>
        <div className="rs-sech">Where and how much</div>
        <Chips label="Where" options={[{v:'none',l:'Everywhere'},{v:'centre',l:'Centre'},{v:'edges',l:'Edges'},{v:'band',l:'Band'},{v:'linear',l:'Sweep'}]}
          value={regChip} onChange={pickReg} />
        {reg!=='none' && <React.Fragment>
          {reg!=='linear' && <Slider label={reg==='band'?'Width':'Radius'} val={num(el.cmpRegSize,0.6)} min={0.1} max={1.4} step={0.02} onChange={v=>update({cmpRegSize:v})} />}
          {reg!=='radial' && <Slider label="Angle" val={el.cmpRegAngle||0} min={-180} max={180} step={5} onChange={v=>update({cmpRegAngle:v})} suffix="°" />}
          <Slider label="Feather" val={num(el.cmpRegSoft,0.5)} min={0} max={1} step={0.02} onChange={v=>update({cmpRegSoft:v})} />
          {reg!=='radial' && <Chips label="Flip" options={[{v:false,l:'As drawn'},{v:true,l:'Flipped'}]} value={!!el.cmpRegInvert} onChange={v=>update({cmpRegInvert:v})} />}
        </React.Fragment>}
        <Slider label="Mix" val={num(el.composeMix,1)} min={0} max={1} step={0.02} onChange={v=>update({composeMix:v})} />
        <Hint tight><b>Where</b> keeps the move to part of the photo; the rest stays as framed. <b>Mix</b> lays the moved photo back over the original, so a move can be a ghost.</Hint>
      </React.Fragment>}
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
