/* ============================================================
   REALITY STUDIOS — QR codes, once
   ------------------------------------------------------------
   One real encoder for every Studio: text → module matrix (UTF-8,
   EC level M by default), the square-finder-eye geometry Print's PDF
   and screen share, the quiet-zone arithmetic the ticket / footer ink
   square is sized from, and the plain <div>-grid glyph Poster and
   Schedule draw.

   Before this module Print had the real encoder and the Poster drew a
   FIXED matrix for https://realitydn.com (generated once by
   tools/generate-qr.py) — while its ticket and QR block showed an
   editable "Website" field. Editing it changed the caption, not the
   code. The Poster now encodes the element's own text (qrTarget).

   The encoder is the vendored qrcode-generator (Kazuhiko Arase, MIT),
   kept verbatim in ./vendor/qrcode.cjs and bundled as a CommonJS
   module — no global, no <script> tag.
   ============================================================ */
import qrcode from './vendor/qrcode.cjs';

/* UTF-8, always. The encoder's DEFAULT byte encoder keeps only the low byte
   of each UTF-16 unit (`c & 0xff`), so "Đà Nẵng" went into the code as
   garbage and scanned as garbage — a URL survives only because it is ASCII.
   The same file ships a proper 'UTF-8' encoder (the multibyte block at its
   foot); it is switched on here rather than by editing the vendored copy.
   Text is NFC first, so a decomposed "ẵ" encodes as the one code point a
   phone expects. */
if(qrcode && qrcode.stringToBytesFuncs && qrcode.stringToBytesFuncs['UTF-8'])
  qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8'];
function nfc(s){ return (typeof s==='string' && s.normalize) ? s.normalize('NFC') : s; }

const QR_DEFAULT = 'https://realitydn.com';

/* text → square matrix of 0/1 (EC level `ecl`, auto version), or null. */
function buildQR(text, ecl){
  try{
    const q = qrcode(0, ecl||'M');
    q.addData(nfc(text||QR_DEFAULT));
    q.make();
    const n = q.getModuleCount();
    const m = [];
    for(let r=0;r<n;r++){ const row=[]; for(let c=0;c<n;c++) row.push(q.isDark(r,c)?1:0); m.push(row); }
    return m;
  }catch(e){ return null; }
}

/* What a code printed from a "Website" field should OPEN. The field holds
   what the artwork says — canon writes the site as the bare host,
   "realitydn.com" (D5) — but a bare host in a QR is plain text to most
   scanners, not a link. So a host (or host/path) with no scheme gains
   https://; anything with a scheme (https:, mailto:, tel:, WIFI:…) or with
   spaces is encoded exactly as typed; empty falls back to the site. The
   default ticket therefore still encodes https://realitydn.com — the same
   URL the fixed matrix carried. */
function qrTarget(text){
  const t = String(text==null?'':text).trim();
  if(!t) return QR_DEFAULT;
  if(/^[a-z][a-z0-9+.-]*:/i.test(t)) return t;
  if(/^[^\s/]+\.[a-z]{2,}(?:[/?#]\S*)?$/i.test(t)) return 'https://'+t;
  return t;
}

/* Matrices are cached by text: a poster re-renders on every drag, and the
   encoder is not free. Small and bounded — a doc carries a handful of codes. */
const _cache = new Map();
function qrMatrix(text, ecl){
  const key = (ecl||'M')+'|'+text;
  let m = _cache.get(key);
  if(m===undefined){
    m = buildQR(text, ecl);
    if(_cache.size>64) _cache.clear();
    _cache.set(key, m);
  }
  return m;
}

/* QUIET ZONE, in modules per side. The spec asks for 4, and on a light
   substrate that costs nothing: the zone is the same colour as the sheet, so
   it is invisible and the code's PATTERN is the whole visible object.

   On a dark substrate it is not free. The zone has to stay light or the code
   will not scan, so 4 modules draw a cream slab a third wider than the
   pattern — which next to the canon ink square reads as a much heavier mark.
   QUIET_TIGHT is the small safe area for that case: enough margin for a
   reliable read, little enough that the code and the square still balance.
   Two modules is the practical floor: below that, scanners that rely on
   finding the timing patterns against clear space start to miss on a busy
   ground, and this artwork gets printed. */
const QUIET_SPEC = 4, QUIET_TIGHT = 2;
/* Visible PATTERN inside a tile of `tile` px at `quiet` modules per side, for
   an `n`-module code (25 = version 2, what the site URL encodes to). Callers
   size the TILE — it is the thing that has to fit the band — and read the
   pattern back out to size whatever must match the code optically, which in
   practice is always the canon ink square butted against it: match the outer
   boxes instead and the square reads a third heavier, because the QR is
   carrying a light margin the square has no equivalent of. */
function qrPatternOf(tile, quiet, n){
  const q = quiet==null ? QUIET_SPEC : quiet;
  const k = n || 25;
  return tile * k / (k + 2*q);
}

/* The code as a grid of <div>s — Poster and Schedule's screen/PNG glyph.
   `text` is encoded (through qrMatrix); `matrix` draws a fixed matrix
   instead (Schedule's pinned app code). `style` merges onto the tile. */
function QRGlyph({ size, dark, light, quiet, text, matrix, style }){
  const m = matrix || qrMatrix(text==null ? QR_DEFAULT : text) || [];
  const n = m.length;
  const q = quiet==null ? QUIET_SPEC : quiet;
  const pad = size * (q / (n + 2*q));
  const cells = [];
  for(let y=0;y<n;y++) for(let x=0;x<n;x++)
    cells.push(React.createElement('div', { key:x+'-'+y, style:{ background: m[y][x]?dark:light } }));
  return React.createElement('div', {
      style:Object.assign({ width:size, height:size, background:light, padding:pad, boxSizing:'border-box' }, style||null) },
    React.createElement('div', { style:{ width:'100%', height:'100%', display:'grid',
      gridTemplateColumns:`repeat(${n},1fr)`, gridTemplateRows:`repeat(${n},1fr)` } }, cells));
}

/* ---- QR geometry — the styling brain shared by Print's screen (SVG) and PDF
   (vector), so a stylized code is WYSIWYG. Classifies the module matrix into
   data cells and the three finder eyes (which are kept structurally whole —
   solid ring + centre — so any scanner still locks on), applies the chosen
   module shape, and reserves an optional centre-logo knockout. Emits
   renderer-agnostic descriptors in MODULE units (0..tot, quiet zone folded in);
   each renderer just maps kind→primitive and role→colour. A centre logo forces
   ECL H so the codewords it covers are always recoverable. ---- */
function qrGeometry(text, opts){
  opts = opts||{};
  const hasLogo = !!opts.logo && opts.logo!=='none';
  const ecl = hasLogo ? 'H' : (opts.ecl||'M');
  const m = buildQR(text, ecl); if(!m) return null;
  const n = m.length;
  const quiet = opts.quiet!==false ? 4 : 0;
  const tot = n + quiet*2;
  const mod = opts.moduleStyle || 'square';
  const inEye = (r,c)=> (r<7&&c<7) || (r<7&&c>=n-7) || (r>=n-7&&c<7);
  /* centre knockout — an odd-sized module box so it stays centred on the grid */
  let logo=null;
  if(hasLogo){ let s=Math.round(n*0.21); if(s%2===0) s+=1; s=Math.max(5,s);
    const o=Math.floor((n-s)/2); logo={ r0:o, c0:o, s }; }
  const inLogo=(r,c)=> logo && r>=logo.r0 && r<logo.r0+logo.s && c>=logo.c0 && c<logo.c0+logo.s;

  const shapes=[];
  const dataShape=(x,y)=>{
    if(mod==='dot')     return { kind:'circle',    role:'data', cx:x+0.5, cy:y+0.5, r:0.5 };
    if(mod==='rounded') return { kind:'roundrect', role:'data', x, y, w:1, h:1, r:0.32 };
    return { kind:'rect', role:'data', x, y, w:1, h:1 };
  };
  for(let r=0;r<n;r++) for(let c=0;c<n;c++){
    if(!m[r][c] || inEye(r,c) || inLogo(r,c)) continue;
    shapes.push(dataShape(quiet+c, quiet+r));
  }
  /* finder eyes: outer ring (7×7) + light knockout (5×5) + inner pip (3×3),
     three of them. Shapes stacked in order so the ring reads. */
  /* The eyes are SQUARE, whatever the element asks for. There used to be
     'rounded' and 'dot' eyes (a 1.9-module corner radius, a round pip), sold
     here as keeping detection "rock-solid". They didn't: decoding the exported
     PDFs with OpenCV, every rounded/dot eye failed — the radius eats into the
     1:1:3:1:1 run the finder detector locks onto (see the QR standee notes in
     Print's TEMPLATES). Rounded/dot DATA modules and the star centre mark
     decode fine; the eyes must not be styled. The inspector no longer offers
     the option and loadDoc maps old docs to square, but the geometry refuses
     regardless, so no saved file or pasted template can print an unscannable
     code. */
  [[0,0],[0,n-7],[n-7,0]].forEach(([r0,c0])=>{
    const x=quiet+c0, y=quiet+r0;
    shapes.push({ kind:'rect', role:'eye',     x:x,   y:y,   w:7, h:7 });
    shapes.push({ kind:'rect', role:'eyeHole', x:x+1, y:y+1, w:5, h:5 });
    shapes.push({ kind:'rect', role:'eye',     x:x+2, y:y+2, w:3, h:3 });
  });
  /* logo knockout patch (light) — sits above data/eyes to guarantee a clean
     quiet ring around the mark; the mark itself is drawn from `logo` below. */
  if(logo){ shapes.push({ kind:'roundrect', role:'logoBg',
    x:quiet+logo.c0-0.7, y:quiet+logo.r0-0.7, w:logo.s+1.4, h:logo.s+1.4, r:1.4 }); }

  return { n, quiet, tot, shapes, ecl, logoKind: hasLogo ? opts.logo : 'none',
    logo: logo ? { cx:quiet+logo.c0+logo.s/2, cy:quiet+logo.r0+logo.s/2, s:logo.s } : null };
}

export {
  nfc, buildQR, qrTarget, qrMatrix, qrGeometry, QRGlyph,
  QUIET_SPEC, QUIET_TIGHT, qrPatternOf, QR_DEFAULT,
};
