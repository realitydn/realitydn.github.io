/* ============================================================
   REALITY PRINT STUDIO — imposition: pages, bleed, marks, gang
   ------------------------------------------------------------
   Puts the drawn elements on a page: the exact A-size by default,
   bleed + vector crop marks opt-in and declared in TrimBox /
   BleedBox, the art clipped to the bleed, and Gang on A4 with
   short cut ticks. Also what the page will measure (pageMm, read
   by the topbar), the font warm-up and the glyph check the
   preflight asks. The element drawers are print-export.jsx.
   Exports: PrintExport { single, gang, ready, pageMm, glyphChecker, report, RASTER_CAP }
   (Split out of print-export.jsx, Phase 3.)
   ============================================================ */
import { L, loadFontBytes, embedFonts, RASTER_CAP, rasterizeImage, inkColor, whiteColor } from './print-pdf.js';
import { renderElement } from './print-export.jsx';
import { sizeDims, GANG, PT_PER_MM, faceFor } from './print-paper.js';
import { nfcDeep } from './print-preflight.js';

/* THE PAGE GEOMETRY, in mm. A printer's prepress reads three boxes: MediaBox
   (the sheet in the file), BleedBox (how far the flood runs) and TrimBox (the
   A-size — where the guillotine lands). Only TrimBox answers "is this A6?",
   so it is always written, even on a trim-only file where all three coincide.
   Marks sit OUTSIDE the bleed, which is why a marked page's media is bigger
   than trim+bleed: a mark drawn inside the media edge is a mark the RIP keeps. */
const BLEED_MM    = 3;   // flood runs this far past the trim
const MARK_GAP_MM = 3;   // marks begin here, out from the trim — clear of the bleed
const MARK_LEN_MM = 4;   // and run this far further out
const MARK_PAD_MM = 1;   // breathing room so no tick dies on the media edge

function drawCropMarks(page, O, trimW, trimH, pageH){
  const gap=MARK_GAP_MM*PT_PER_MM, len=MARK_LEN_MM*PT_PER_MM, th=0.5, col=inkColor();
  const corners=[[O,O],[O+trimW,O],[O,O+trimH],[O+trimW,O+trimH]];
  corners.forEach(([cxp,cyTop],i)=>{ const right=(i%2)===1, bottom=i>=2;
    const hx=right?cxp+gap:cxp-gap-len; page.drawRectangle({ x:hx, y:pageH-cyTop-th/2, width:len, height:th, color:col });
    const vyTop=bottom?cyTop+gap:cyTop-gap-len; page.drawRectangle({ x:cxp-th/2, y:pageH-(vyTop+len), width:th, height:len, color:col }); });
}

/* What the last export could NOT do, for the app to show — a photo with no
   pixels, a part whose renderer threw. These used to be console.warn lines:
   the PDF came out with a blank box and nobody was told. */
function newReport(){ return { missingImages:[], failed:[] }; }
let lastReport = newReport();

async function buildPiece(doc, { bleed, marks }, report){
  const { PDFDocument, pushGraphicsState, popGraphicsState, rectangle, clip, endPath } = L();
  report = report || newReport();
  /* every string NFC before a glyph is placed — decomposed Vietnamese would
     otherwise set its combining marks as separate, advancing glyphs (see
     nfcDeep in print-preflight). The caller's doc is not touched. */
  doc = Object.assign({}, doc, { elements: nfcDeep(doc.elements||[]) });
  const dims=sizeDims(doc.size,doc.orient);
  const withMarks = !!(bleed && marks);
  const B = bleed ? BLEED_MM*PT_PER_MM : 0;                  // trim edge → bleed edge
  /* O = media edge → trim edge. Trim-only puts them on top of each other, so
     the file IS the A-size: 105×148 mm out, not 111×154 mm with a note. */
  const O = withMarks ? Math.max(B, (MARK_GAP_MM+MARK_LEN_MM+MARK_PAD_MM)*PT_PER_MM) : B;
  const pageW=dims.wpt+O*2, pageH=dims.hpt+O*2;
  const pdf=await PDFDocument.create(); const fontFor=await embedFonts(pdf);
  const page=pdf.addPage([pageW,pageH]);
  page.setTrimBox(O, O, dims.wpt, dims.hpt);
  if(B) page.setBleedBox(O-B, O-B, dims.wpt+B*2, dims.hpt+B*2);
  page.drawRectangle({ x:0,y:0,width:pageW,height:pageH,color:whiteColor() });
  /* embed photo rasters up front (async) so renderElement can stay synchronous */
  const imgMap={};
  for(const el of (doc.elements||[])){ if(el.type==='image'){ try{ const r=await rasterizeImage(pdf, el, doc.accent, report); if(r) imgMap[el.id]=r; }
    catch(e){ console.warn('image embed failed', e); report.missingImages.push({ id:el.id, imgId:el.imgId||null, error:String(e&&e.message||e) }); } } }
  const ctx={ B:O, pageH, fontFor, accentName:doc.accent, imgMap };
  /* CLIP THE ART TO THE BLEED BOX. Nothing clipped to the artboard, and the
     flood templates run 12pt (4.2mm) past the trim by design — so with bleed
     on, colour ran 1.2mm beyond the 3mm BleedBox and on into the crop marks,
     which start 3mm out: the marks sat IN the flood. One clip path round the
     content keeps the art inside the BleedBox the file declares; the marks are
     drawn after the clip is popped, on bare paper. Trim-only pages need no
     clip — the page edge IS the trim. */
  const clipped = B>0 && O>B;
  if(clipped) page.pushOperators(pushGraphicsState(), rectangle(O-B, O-B, dims.wpt+B*2, dims.hpt+B*2), clip(), endPath());
  (doc.elements||[]).forEach(el=>{ try{ renderElement(page,el,ctx); }catch(e){ console.warn('el render failed',el&&el.type,e); report.failed.push({ id:el&&el.id, type:el&&el.type, error:String(e&&e.message||e) }); } });
  if(clipped) page.pushOperators(popGraphicsState());
  if(withMarks) drawCropMarks(page,O,dims.wpt,dims.hpt,pageH);
  return { pdf, dims, B, O, pageW, pageH, report };
}

/* Default is the printable area alone — the page reports the A-size and
   nothing else. Ask for bleed when the piece floods and the shop trims it. */
async function single(doc, opts){
  opts=opts||{}; const bleed=opts.bleed===true;
  lastReport = newReport();
  const { pdf }=await buildPiece(doc,{ bleed, marks:bleed&&opts.marks!==false }, lastReport);
  return await pdf.save();
}

/* GANG ON A4. The A-sizes tile A4 exactly (2×A6 = 210 mm), so the pieces butt
   edge to edge with at most a millimetre of slack round the sheet — there is
   no room for bleed at true size, and none for gutters. That is why the piece
   is built trim-only here, and why the cut guides can't sit in a margin that
   isn't there. They used to be full-length hairlines across the whole sheet,
   printed down every shared edge; a guillotine a hair off the line then left
   a black rule along the piece. Now each cut line gets only a short tick
   (GANG_TICK_MM) either side of every corner it meets — so ink touches only
   the outer 3 mm of a piece's corners, the zone the preflight already keeps
   text out of — and nothing runs along the middle of an edge. Where a sheet
   DOES leave a real margin (≥ 2 mm), classic crop marks go in it, clear of
   the art entirely. */
const GANG_TICK_MM = 3;
async function gang(doc, opts){
  opts=opts||{}; const { PDFDocument, degrees }=L();
  const g=GANG[doc.size]; if(!g) throw new Error('Size '+doc.size+' cannot be ganged on A4');
  lastReport = newReport();
  const piece=await buildPiece(doc,{ bleed:false, marks:false }, lastReport); const pieceBytes=await piece.pdf.save();
  const a4=await PDFDocument.create(); const A4=sizeDims('a4','portrait');
  const sheet=a4.addPage([A4.wpt,A4.hpt]); sheet.drawRectangle({ x:0,y:0,width:A4.wpt,height:A4.hpt,color:whiteColor() });
  const [embedded]=await a4.embedPdf(pieceBytes);
  const cellW=A4.wpt/g.cols, cellH=A4.hpt/g.rows;
  const pieceLandscape=piece.dims.wpt>piece.dims.hpt, cellLandscape=g.cell==='landscape', rotate=pieceLandscape!==cellLandscape;
  const pw=rotate?piece.dims.hpt:piece.dims.wpt, ph=rotate?piece.dims.wpt:piece.dims.hpt;
  /* Never scale ABOVE 1. A-paper halves leave a fraction of a mm of slack per
     cell, and filling it would hand the guillotine an A8 that is 0.3% too wide
     — the same lie as a "A6" that measures 111 mm. Pieces stay true size and
     the grid is centred on the sheet; the cut guides ride the real edges. */
  const sc=Math.min(1,cellW/pw,cellH/ph);
  const stepX=pw*sc, stepY=ph*sc;
  const originX=(A4.wpt-g.cols*stepX)/2, originY=(A4.hpt-g.rows*stepY)/2;
  for(let rr=0;rr<g.rows;rr++) for(let cc=0;cc<g.cols;cc++){
    const cellX=originX+cc*stepX, cellY=originY+(g.rows-1-rr)*stepY;
    if(rotate) sheet.drawPage(embedded,{ x:cellX+stepX, y:cellY, xScale:sc, yScale:sc, rotate:degrees(90) });
    else sheet.drawPage(embedded,{ x:cellX, y:cellY, xScale:sc, yScale:sc });
  }
  if(opts.marks!==false){
    const tick=GANG_TICK_MM*PT_PER_MM, th=0.4, col=inkColor(), margin=2*PT_PER_MM;
    const xs=[], ys=[];
    for(let c=0;c<=g.cols;c++) xs.push(originX+c*stepX);
    for(let rr=0;rr<=g.rows;rr++) ys.push(originY+rr*stepY);
    const clampY=v=>Math.max(0,Math.min(A4.hpt,v)), clampX=v=>Math.max(0,Math.min(A4.wpt,v));
    const vseg=(x,y0,y1)=>{ y0=clampY(y0); y1=clampY(y1); if(y1>y0) sheet.drawLine({ start:{x,y:y0}, end:{x,y:y1}, thickness:th, color:col }); };
    const hseg=(y,x0,x1)=>{ x0=clampX(x0); x1=clampX(x1); if(x1>x0) sheet.drawLine({ start:{x:x0,y}, end:{x:x1,y}, thickness:th, color:col }); };
    /* interior cut lines: a tick either side of every row/column line they cross
       (the sheet-edge ends included — those run out into the slack) */
    for(let c=1;c<g.cols;c++) ys.forEach(y=> vseg(xs[c], y-tick, y+tick));
    for(let rr=1;rr<g.rows;rr++) xs.forEach(x=> hseg(ys[rr], x-tick, x+tick));
    /* the outer boundary is the sheet edge unless there is a real margin — then
       crop marks in it, stopping 1 mm short of the art */
    const gap=1*PT_PER_MM;
    if(originX>=margin) ys.forEach(y=>{ hseg(y, 0, originX-gap); hseg(y, xs[g.cols]+gap, A4.wpt); });
    if(originY>=margin) xs.forEach(x=>{ vseg(x, 0, originY-gap); vseg(x, ys[g.rows]+gap, A4.hpt); });
  }
  return await a4.save();
}

/* What the emitted page will actually measure, in mm — the topbar reads this
   rather than doing the sum again, so the label can't claim a size the
   exporter doesn't write. `offsetMm` is media edge → trim edge. */
function pageMm(size, orient, bleed){
  const d=sizeDims(size,orient);
  const O=bleed ? Math.max(BLEED_MM, MARK_GAP_MM+MARK_LEN_MM+MARK_PAD_MM) : 0;
  return { wmm:+(d.wmm+O*2).toFixed(1), hmm:+(d.hmm+O*2).toFixed(1), trimWmm:d.wmm, trimHmm:d.hmm, offsetMm:O };
}

async function ready(){ await loadFontBytes(); return true; }

/* Glyph coverage, asked of the SAME TTFs the PDF embeds — the browser
   falls back to a system face for a missing character, so the screen can't be
   trusted to show one; the PDF prints tofu. Parsed once (fontkit), then a
   cmap lookup per character: cheap enough to run on every edit. */
let _faces=null;
async function glyphChecker(){
  if(!_faces){
    const bytes=await loadFontBytes(), fk=window.fontkit, out={};
    for(const key of Object.keys(bytes)){ try{ out[key]=fk.create(new Uint8Array(bytes[key])); }catch(e){ out[key]=null; } }
    _faces=out;
  }
  return (fam, weight, cp)=>{ const f=_faces[faceFor(fam, weight)]; return f ? f.hasGlyphForCodePoint(cp) : null; };
}
const PrintExport = { single, gang, ready, pageMm, glyphChecker, report:()=>lastReport, RASTER_CAP };

export { PrintExport };
