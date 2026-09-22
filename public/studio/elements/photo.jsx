/* ============================================================
   REALITY POSTER STUDIO — photo element
   The decode cache, the stand-in photos, the press call and the photo / logo renderer.
   ============================================================ */
import { themeColors as seTheme, shapePath as seShapePath, shapeClip as seShapeClip } from '../studio-data.jsx';
import { seResolve, seShadow } from './style.js';
import { Photos, isRef } from '../photos.js';
/* riso image caches (shared across photo elements).
   The decoded image, keyed by the photo's own data URL. This used to be a
   plain Map that never let go: every photo dropped in during a session stayed
   decoded — swap a photo ten times and all ten sat in memory, and at 2000px a
   decode is ~12MB. It's a small LRU now: 24 covers every photo on a poster
   plus an evening of library thumbnails, and anything evicted simply decodes
   again the next time it's drawn. Concurrent asks for the same source share
   one decode (two frames of one photo used to decode it twice). */
const IMG_CACHE_CAP = 24;
const _imgCache = new Map();
const _imgPending = new Map();
function imgCacheGet(url){
  const im = _imgCache.get(url);
  if(im){ _imgCache.delete(url); _imgCache.set(url, im); }   // re-insert = most recently used
  return im;
}
function imgCachePut(url, im){
  _imgCache.delete(url); _imgCache.set(url, im);
  while(_imgCache.size > IMG_CACHE_CAP) _imgCache.delete(_imgCache.keys().next().value);
}
/* One decode per source, for everything that draws a photo: the press, the
   bleed preview, the treatment strip and the library's thumbnail warm-up.
   `url` is whatever the element holds: a photo reference ('ref:sha256:…',
   resolved to an objectURL by the blob store — ../photos.js) or an inline
   data URL (anything saved before photos went by reference). Either way the
   decode is cached under that same string. */
function loadCachedImage(url){
  const c = imgCacheGet(url); if(c) return Promise.resolve(c);
  if(_imgPending.has(url)) return _imgPending.get(url);
  const p = (isRef(url) ? Photos.url(url) : Promise.resolve(url)).then(u=>window.RISO.loadImage(u)).then(
    im=>{ _imgPending.delete(url); imgCachePut(url, im); return im; },
    e=>{ _imgPending.delete(url); throw e; });
  _imgPending.set(url, p);
  return p;
}
const _sampleCache = {};

function getSample(kind){ kind=kind||'spotlight'; if(!_sampleCache[kind]) _sampleCache[kind]=window.RISO.sampleCanvas(kind,900,1125); return _sampleCache[kind]; }

/* how far the faded overflow preview extends past the frame (1 = none) */
const BLEED_K = 1.7;

/* Every engine-facing dial, by name — undefined props (docs saved before a
   control existed) fall back to the engine's defaults. Module scope, because
   it's also what the riso effect's dependency signature is built from. */
const OPT_KEYS=['contrast','brightness','dot','bands','threshold','angle','softness','balance','shadowTint',
  'invert','spread','shape','split','offset','inkMode','gradMode','gradAngle','gradA','gradB',
  'screenOffset','field','fieldInk','fieldStrength','dotGain','jitter','pucker',
  'spotLo','spotHi','spotSoft','spotInvert','spotBase','transparent','fit',
  'blurUnder','blurOver','grain','grainSize',
  'saturation','hue','temperature','midInk','hiTint','hiInk','ink3','ghost','glyphChar',
  'bandInks','bandJitter','cutEdge','cutEdgeInk','cutSlip','cutSlipAngle','fieldTexture',
  'spotMode','spotHue','spotHueRange','spot2','spot2Lo','spot2Hi','spot2Ink',
  'ditherMode','ditherScale','hatchSpacing','hatchWeight','hatchCross','hatchWobble',
  'toner','copyNoise','streaks','generations','contourWeight','contourFill',
  'contourSmooth','contourTint','contourLine','contourInk','contourSlip','contourSlipAngle',
  'edgeDetail','edgeThick','edgeBackdrop','edgeSmooth','edgeClean','edgeInk','edgeWash',
  'edgeEcho','edgeEchoAngle','edgeEchoInk','cellSize','mosaicDepth','mosaicGap',
  'ditherAngle','mosaicShape','mosaicBond','mosaicJitter','mosaicGrout',
  'toneSmooth','contourEcho','contourEchoAngle','contourEchoInk','edgeSlip','edgeSlipAngle',
  'blurUnderType','blurUnderAngle','blurUnderX','blurUnderY','blurUnderPos','blurUnderWidth',
  'blurOverType','blurOverAngle','blurOverX','blurOverY','blurOverPos','blurOverWidth',
  'grainInk','grainBlend','finBright','finContrast','finSat',
  'treatStrength','treatWhere','treatBlend',
  'compOrig','underBright','underContrast','underSat','underHue','underTemp',
  'vignette','vignetteSoft','paperTex','inkBleed','dust','misprint','misprintAngle',
  'mix2','mix2Mode',
  /* backfilled from the app's Darkroom, 08.09.26 */
  'inkDensity','splitTone','treatRegion','regionX','regionY','regionSize','regionSoft','regionAngle','regionInvert',
  /* the separation press (riso-press.js), 22.09.26 — a dial missing here
     silently falls back to the engine default, so every one is listed */
  'inks','stock','opaque','invertSource','screen','sepShape','pitch','grainPitch','levels',
  'sepGCR','sepBoost','tac','gain','linear','solidity','ceiling','floor','floodCap',
  'drift','driftSeed','skew','stretch','duo','drumBand','bandPeriod','drumStreak','starve','wet',
  'pull','pressRun','pressOff','fountainTo','fountainPlate','fountainAngle','fountainSoft',
  'screens','pitches','proofPlate','proofGrey',
  /* the retrofit: separated plates for off-register / overprint, xerography for the copier,
     and how much of the shadows the night poster's black plate carries */
  'sep','copyEdge','copyHollow','copySatellites','copyDrum','copyDrumPeriod','nightPlate'];
/* One cheap scalar fingerprint of every dial the press reads. Joining ~120
   primitives costs microseconds; re-running the press costs ~25ms, so this is
   what keeps a photo from re-developing on every unrelated re-render.
   Deliberately does NOT include x/y — moving a photo doesn't change its pixels. */
/* The day colours as inks, at the density each wants — the three bright drums
   run under-density (see the engine's inkDensity). Mirrors the app's
   riso-recipe.ts DAY_INK; keep the two in step. */
const SE_DAY_INK = { mon:{ink:'green',inkDensity:0.85}, tue:{ink:'blue'}, wed:{ink:'purple'}, thu:{ink:'pink'},
                     fri:{ink:'red'}, sat:{ink:'amber',inkDensity:0.9}, sun:{ink:'yellow',inkDensity:0.72} };
/* Which weekday a poster is FOR: the linked event's start, read in Đà Nẵng's
   zone. Null when no event is linked — the Day-colour chip then says so. */
function posterDayOf(doc){
  const s = doc && doc.eventRef && doc.eventRef.startsAt; if(!s) return null;
  const d = new Date(s); if(isNaN(d.getTime())) return null;
  const wd = new Intl.DateTimeFormat('en-US',{ timeZone:'Asia/Ho_Chi_Minh', weekday:'short' }).format(d).toLowerCase().slice(0,3);
  return SE_DAY_INK[wd] ? wd : null;
}
function risoSig(el){ let s=''; for(let i=0;i<OPT_KEYS.length;i++) s += '|'+el[OPT_KEYS[i]]; return s; }

/* The decoded sources a photo element prints from, out of the same cache the
   poster uses — so the Inspector's treatment thumbnails and the photo on the
   canvas are never two different decodes of the same file. Resolves
   [main, second]; a logo with no file resolves [null, …] and stays blank. */
function photoSources(el){
  const p1 = el.src ? loadCachedImage(el.src).catch(()=>getSample(el.sample))
                    : Promise.resolve(el.type==='logo'? null : getSample(el.sample));
  const p2 = el.src2 ? loadCachedImage(el.src2).catch(()=>null) : Promise.resolve(null);
  return Promise.all([p1,p2]);
}

/* Put an element's press onto `cv` at whatever size the caller sized it.
   The ONE place the engine's globals (source, second exposure, both
   transforms) are set before a render, so the poster and the Inspector's
   thumbnails cannot drift apart. `patch` overrides dials for a preview of a
   click you haven't made yet — the strip renders each treatment at its own
   TREAT_PRESETS baseline over your paper, inks, framing and exposure. */
function drawPhotoPress(cv, el, inkKey, theme, src, src2, patch){
  const opts={ ink:inkKey, ink2:el.ink2, paper: theme==='night'?'night':'day',
    paperFill: (el.paperFill && el.paperFill!=='fg' && el.paperFill!=='paper') ? seResolve(el.paperFill, null) : null };
  OPT_KEYS.forEach(k=>{ opts[k]=el[k]; });
  if(patch) Object.assign(opts, patch);
  window.RISO.setSource(src);
  if(window.RISO.setSource2) window.RISO.setSource2(src2||null);
  if(window.RISO.setTransform) window.RISO.setTransform({ scale:el.imgScale, x:el.imgX, y:el.imgY, rot:el.imgRot });
  if(window.RISO.setTransform2) window.RISO.setTransform2({ scale:el.img2Scale, x:el.img2X, y:el.img2Y, rot:el.img2Rot });
  window.RISO.render(cv, (patch && patch.treatment) || el.treatment, opts);
}

function PhotoEl({ el, theme, inkKey, inkDensity, selected, exporting }){
  const ref = React.useRef(null);
  const bleedRef = React.useRef(null);

  /* main riso canvas — the kept, in-frame region (clipped).
     While editing, the render is capped at 900px wide for responsiveness; the
     screen shows it scaled DOWN, so it reads crisp. Exports rasterise at
     pixelRatio 2 (up to 2160px wide), and upscaling the 900px render 2.4×
     smears the dots/edges into the paper — colours go visibly flat. So during
     export the riso is re-rendered 1:1 with the capture's pixel grid. */
  React.useEffect(()=>{
    const cv=ref.current; if(!cv||!window.RISO) return; let alive=true;
    /* `exporting` may carry the capture's pixelRatio as a number (A1 print is
       ~3.25×); rendering the riso 1:1 with that grid keeps dots crisp in print. */
    const xr = typeof exporting==='number' ? exporting : 2;
    /* Math.max(1,…): the library's thumbnails pass a ratio well UNDER 1 (an 88px
       card off a 1080px poster is ~0.16), and a zero-width canvas throws out of
       the engine's getImageData. */
    const W = Math.max(1, exporting ? Math.min(Math.round(el.w)*xr, xr>2?3840:2400) : Math.min(Math.round(el.w),900));
    const H=Math.max(1,Math.round(W*(el.h/el.w)));
    cv.width=W; cv.height=H;
    photoSources(el).then(([s1,s2])=>{ if(!alive) return;
      if(!s1){ cv.getContext('2d').clearRect(0,0,cv.width,cv.height); return; }   // empty logo stays transparent
      drawPhotoPress(cv, el, inkKey, theme, s1, s2, inkDensity!=null ? { inkDensity } : undefined); });
    return ()=>{ alive=false; };
  /* Dependencies matter enormously here: this effect IS the press, and it used
     to have none — so every re-render of the app (every frame of dragging ANY
     element, every slider tick anywhere) re-developed every photo on the
     poster. On a 4:5 with two photos that alone was most of the frame.
     Everything the effect reads is listed; x/y are deliberately absent, which
     is what makes dragging cheap. `src`/`src2` stay identities rather than
     going through risoSig — short references now, but an old doc's are data
     URLs, and hashing those each render would just move the cost. */
  }, [el.w, el.h, el.type, el.src, el.src2, el.sample, el.treatment, el.ink2, el.paperFill,
      el.imgScale, el.imgX, el.imgY, el.imgRot, el.img2Scale, el.img2X, el.img2Y, el.img2Rot,
      inkKey, inkDensity, theme, exporting, risoSig(el)]);

  /* editing aid: while this photo is selected, show the cropped image OUTSIDE
     the frame, faded — so it's clear what's kept vs cut. Raw source (not riso),
     drawn at the same scale/position into a canvas BLEED_K× the frame and aligned
     on the frame centre. Not selected (incl. during export) → not rendered. */
  React.useEffect(()=>{
    if(!selected) return;
    const cv=bleedRef.current; if(!cv) return; let alive=true;
    const r = Math.min(Math.round(el.w),700) / el.w;     // px per design-unit
    const BW=Math.max(1,Math.round(el.w*BLEED_K*r)), BH=Math.max(1,Math.round(el.h*BLEED_K*r));
    cv.width=BW; cv.height=BH;
    const cx=cv.getContext('2d'); cx.clearRect(0,0,BW,BH);
    const drawSrc=(src)=>{ if(!alive||!src) return;
      const sw=src.naturalWidth||src.width, sh=src.naturalHeight||src.height;
      const cover=Math.max((el.w*r)/sw,(el.h*r)/sh) * (el.imgScale!=null?el.imgScale:1);
      const dw=sw*cover, dh=sh*cover;
      cx.save();
      cx.translate(BW/2 + (el.imgX||0)*(el.w*r), BH/2 + (el.imgY||0)*(el.h*r));
      if(el.imgRot) cx.rotate(el.imgRot*Math.PI/180);
      cx.drawImage(src, -dw/2, -dh/2, dw, dh);
      cx.restore();
    };
    if(el.src){ const c=imgCacheGet(el.src); if(c) drawSrc(c);
      else loadCachedImage(el.src).then(drawSrc).catch(()=>drawSrc(getSample(el.sample))); }
    else drawSrc(getSample(el.sample));
    return ()=>{ alive=false; };
  /* Same story as the press above: undeclared deps meant this redrew on every
     render, i.e. every frame of dragging the very photo it belongs to. It only
     depends on the crop, not the position. */
  }, [selected, el.src, el.sample, el.w, el.h, el.imgScale, el.imgX, el.imgY, el.imgRot]);

  const t=seTheme(theme);
  const off=`${-(BLEED_K-1)/2*100}%`, span=`${BLEED_K*100}%`;
  /* photo / logo shadow (off by default; a framed piece keeps its press shadow
     below regardless): a transparent logo casts off its own shape (drop-shadow
     on the outer box so it isn't clipped); an opaque photo/paper logo casts off
     its card edge. */
  const lsh = (el.type==='logo'||el.type==='photo') ? seShadow(el, theme) : null;
  /* MASK — the photo frame wearing a shape from the same registry the Shape
     element draws from (circle, arch, blob…). Rectangular boxShadow/border
     would betray the silhouette, so a masked photo casts its shadow as a
     drop-shadow on the OUTER box (which follows the clipped alpha) and draws
     its frame as a stroked copy of the mask path on top. */
  const maskClip = el.type==='photo' ? seShapeClip(el.mask, el.w, el.h) : null;
  const maskPath = maskClip ? seShapePath(el.mask, el.w, el.h) : null;
  const outerFilter = (lsh && (el.transparent || maskClip)) ? lsh.filter : undefined;
  return <div style={{ width:'100%', height:'100%', position:'relative', boxSizing:'border-box',
      filter: outerFilter }}>
    {selected && <canvas ref={bleedRef} aria-hidden="true" style={{ position:'absolute',
      left:off, top:off, width:span, height:span, opacity:0.22, pointerEvents:'none', zIndex:0 }} />}
    <div style={{ position:'absolute', inset:0, overflow:'hidden', zIndex:1,
      clipPath: maskClip||undefined, WebkitClipPath: maskClip||undefined,
      border: (el.frame && !maskClip)? `3px solid ${t.fg}` : 'none',
      boxShadow: maskClip ? 'none'
        : (el.frame? `0 10px 2px ${t.shadow(theme==='night'?0.2:0.16)}` : (lsh && !el.transparent ? lsh.css : 'none')), boxSizing:'border-box' }}>
      <canvas ref={ref} style={{ position:'absolute', inset:0, width:'100%', height:'100%', display:'block' }} />
    </div>
    {maskClip && el.frame && <svg viewBox={`0 0 ${el.w} ${el.h}`} preserveAspectRatio="none" aria-hidden="true"
      style={{ position:'absolute', inset:0, width:'100%', height:'100%', zIndex:2, pointerEvents:'none', display:'block' }}>
      {maskPath
        ? <path d={maskPath} fill="none" stroke={t.fg} strokeWidth={6} strokeLinejoin="round" />
        : <ellipse cx={el.w/2} cy={el.h/2} rx={Math.max(0.5,el.w/2-3)} ry={Math.max(0.5,el.h/2-3)} fill="none" stroke={t.fg} strokeWidth={6} />}
    </svg>}
  </div>;
}

export {
  imgCacheGet, loadCachedImage, getSample, BLEED_K, OPT_KEYS, SE_DAY_INK, posterDayOf, risoSig, photoSources,
  drawPhotoPress, PhotoEl,
};
