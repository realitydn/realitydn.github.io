/* ============================================================
   REALITY PRINT STUDIO — the PDF kit (pdf-lib + fontkit)
   ------------------------------------------------------------
   The low-level pieces every drawer and every page uses: the
   pdf-lib global, the embedded TTFs (fetched once, subset on
   embed), the photo raster (the riso render at a size-aware dpi →
   JPEG), the CMYK colours (K-only ink, paper = no ink, accents
   from PALETTE_CMYK) and text measuring with the embedded faces
   (★ drawn as a vector, so measured to match).
   Used by print-export.jsx (the element drawers) and
   print-imposition.js (pages, bleed, marks, gang).
   (Split out of print-export.jsx, Phase 3.)
   ============================================================ */
import { PrintImg } from './print-store.js';
import { FACES as FACES_, faceFor, PALETTE_CMYK, PT_PER_MM } from './print-paper.js';
import { risoOpts } from './print-layout.js';
import { ACCENTS, contrastInk, NEUTRALS } from '../studio-shared/brand.js';

function L(){ return window.PDFLib; }

/* ---- fonts ---- */
async function loadFontBytes(){
  if(loadFontBytes._cache) return loadFontBytes._cache;
  const FACES = FACES_, out = {};
  await Promise.all(Object.keys(FACES).map(async key=>{
    const res = await fetch(FACES[key].file);
    if(!res.ok) throw new Error('font fetch failed: '+FACES[key].file);
    out[key] = await res.arrayBuffer();
  }));
  loadFontBytes._cache = out; return out;
}
async function embedFonts(pdf){
  pdf.registerFontkit(window.fontkit);
  const bytes = await loadFontBytes(), fonts = {};
  for(const key of Object.keys(bytes)) fonts[key] = await pdf.embedFont(bytes[key], { subset:true });
  return (fam, weight)=> fonts[faceFor(fam, weight)];
}

/* ---- raster (photo) embedding ----
   The image element is the one non-vector part: render its RISO treatment to a
   canvas at a size-aware DPI TARGET (small pieces 300 · A3-ish 200 · larger
   150), then embed as a JPEG. RGB, not CMYK — fine for a photo; the
   K-only-text guarantee is unaffected (no rgb() touches the text).
   The target is capped at RASTER_CAP px on the long side, so it is NOT 150 dpi
   everywhere: a full-width A1 photo (841 mm) comes out at ~121 dpi, an A2 one
   (594 mm) at the full 150. The cap sits above the upload cap (3500 px in
   image-controls.jsx) so the export never throws away pixels the upload kept — past
   that, resolution is the source's, and the preflight reports the dpi the
   SOURCE actually gives at print size. */
const RASTER_CAP = 4000;
function dataURLtoBytes(u){ const b=atob((u.split(',')[1])||''); const a=new Uint8Array(b.length); for(let i=0;i<b.length;i++) a[i]=b.charCodeAt(i); return a; }
async function rasterizeImage(pdf, el, accentName, report){
  if(typeof document==='undefined' || !window.RISO) return null;
  let img=null;
  if(el.imgId && PrintImg){ img = PrintImg.peek(el.imgId) || await PrintImg.load(el.imgId).catch(()=>null); }
  const longMM=Math.max(el.w,el.h)/PT_PER_MM;
  const dpi = longMM<=210 ? 300 : longMM<=420 ? 200 : 150;
  let pxW=Math.round(el.w/72*dpi), pxH=Math.round(el.h/72*dpi);
  const cap=RASTER_CAP, mx=Math.max(pxW,pxH); if(mx>cap){ const k=cap/mx; pxW=Math.round(pxW*k); pxH=Math.round(pxH*k); }
  const cv=document.createElement('canvas'); cv.width=Math.max(1,pxW); cv.height=Math.max(1,pxH);
  if(img){ window.RISO.setSource(img);
    if(window.RISO.setTransform) window.RISO.setTransform({ scale:el.imgScale||1, x:el.imgX||0, y:el.imgY||0, rot:el.imgRot||0 });
    window.RISO.render(cv, el.treatment||'none', risoOpts(el, accentName)); }
  else {
    /* no pixels — the frame prints blank. Say so: the report goes back to the
       app, which shows it, instead of a console line nobody reads. */
    if(report) report.missingImages.push({ id:el.id, imgId:el.imgId||null });
    return null;
  }
  return await pdf.embedJpg(dataURLtoBytes(cv.toDataURL('image/jpeg',0.92)));
}

/* ---- colour ---- */
function cmykArr(a){ return L().cmyk(a[0],a[1],a[2],a[3]); }
function inkColor(){ return cmykArr([0,0,0,1]); }
function whiteColor(){ return cmykArr([0,0,0,0]); }
function tintK(k){ return cmykArr([0,0,0,k]); }
function accentColor(name){ const c=PALETTE_CMYK[name]; return c?cmykArr(c):inkColor(); }
function isAccent(name){ return ACCENTS.indexOf(name)>=0; }
function colorForKey(key, fallback){
  if(key==null || key==='auto') return fallback || inkColor();
  if(key==='ink') return inkColor();
  if(key==='white') return whiteColor();
  if(isAccent(key)) return accentColor(key);
  return inkColor();
}
/* auto text colour on a surfaced box — contrast is judged against the box's OWN
   fill accent (accentHex), not the doc accent, so it matches the screen when the
   surface accent is customised. */
function surfTextFallback(surface, accentHex){
  if(surface==='solid') return whiteColor();
  if(surface==='accent') return contrastInk(accentHex, NEUTRALS.print)===NEUTRALS.print.light ? whiteColor() : inkColor();
  return inkColor();
}

/* ---- text layout ---- */
function chars(s){ return Array.from(s); }
/* ★ (U+2605) isn't in any embedded face, so as a font glyph it exports as tofu.
   We draw it as a vector star instead (see drawLineStr); measure it with a
   matching advance so centring/wrapping stay WYSIWYG with the screen. */
const STAR_CH = '★';
function starGlyphW(size){ return size*0.9; }
function measure(str, font, size, tracking){
  if(!str) return 0;
  const cs=chars(str); let w=0;
  for(const ch of cs) w += ch===STAR_CH ? starGlyphW(size) : font.widthOfTextAtSize(ch,size);
  return w + Math.max(0,cs.length-1)*tracking*size;
}
function wrapText(text, font, size, tracking, maxW){
  const lines=[];
  (text||'').split('\n').forEach(par=>{
    const words=par.split(/\s+/).filter(w=>w.length);
    if(!words.length){ lines.push(''); return; }
    let cur='';
    for(const w of words){ const t=cur?cur+' '+w:w; if(!cur||measure(t,font,size,tracking)<=maxW) cur=t; else { lines.push(cur); cur=w; } }
    if(cur) lines.push(cur);
  });
  return lines;
}

export {
  L, loadFontBytes, embedFonts, RASTER_CAP, rasterizeImage,
  cmykArr, inkColor, whiteColor, tintK, accentColor, isAccent, colorForKey, surfTextFallback,
  chars, STAR_CH, starGlyphW, measure, wrapText,
};
