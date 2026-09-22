/* ============================================================
   REALITY PRINT STUDIO — doc hygiene + the preflight
   ------------------------------------------------------------
   Pure checks over a doc: NFC all the way down, old-doc
   migrations, element bounds and the trim test (does the art run
   past the trim? — the bleed question), and the preflight list the
   chip beside Save PDF shows. Used by the app and the exporter.
   (Split out of print-data.jsx, Phase 3.)
   ============================================================ */
import { nfc } from '../studio-shared/qr.js';
import { PT_PER_MM } from './print-paper.js';


/* ============================================================
   DOC HYGIENE + PREFLIGHT — what the sheet will actually print,
   checked before the PDF is. Shared by the app (the preflight
   list next to Save PDF) and the exporter (NFC, the bleed test).
   ============================================================ */

/* Unicode NFC, all the way down. Vietnamese pasted from a Mac, a PDF or some
   web pages arrives DECOMPOSED — "ẵ" as a + ̆ + ̃ — and the exporter sets
   tracked text one code point at a time, so each combining mark became its
   own glyph with its own advance, parked beside its letter. NFC folds every
   Vietnamese letter back to the one precomposed code point the fonts carry. */
function nfcDeep(v){
  if(typeof v==='string') return nfc(v);
  if(Array.isArray(v)) return v.map(nfcDeep);
  if(v && typeof v==='object'){ const o={}; for(const k in v) o[k]=nfcDeep(v[k]); return o; }
  return v;
}

/* Old docs → current rules, on load. Only the QR finder eyes so far: 'rounded'
   and 'dot' eyes never decoded, so a saved code wearing them is put back to
   square rather than carried forward (qrGeometry refuses them anyway — this
   just makes the inspector tell the truth about what prints). */
function migrateElements(elements){
  return (elements||[]).map(e=> (e && e.type==='qr' && e.eyeStyle && e.eyeStyle!=='square') ? Object.assign({}, e, { eyeStyle:'square' }) : e);
}

/* Axis-aligned bounds of an element on the sheet, rotation included (it spins
   about its centre, like both renderers). */
function elBounds(el){
  const r=(el.rot||0)*Math.PI/180, c=Math.abs(Math.cos(r)), s=Math.abs(Math.sin(r));
  const hw=(el.w*c+el.h*s)/2, hh=(el.w*s+el.h*c)/2, cx=el.x+el.w/2, cy=el.y+el.h/2;
  return { x0:cx-hw, y0:cy-hh, x1:cx+hw, y1:cy+hh };
}
const TRIM_EPS = 0.5;   // pt — a hair past the trim is still ON the trim
function onSheet(b, dims){ return b.x1>0 && b.y1>0 && b.x0<dims.wpt && b.y0<dims.hpt; }
/* does any part of the art run past the trim? — the question "should this PDF
   carry bleed?" answers. Parts wholly off the sheet don't count: they print
   nothing either way. */
function crossesTrim(el, dims){
  const b=elBounds(el); if(!onSheet(b, dims)) return false;
  return b.x0<-TRIM_EPS || b.y0<-TRIM_EPS || b.x1>dims.wpt+TRIM_EPS || b.y1>dims.hpt+TRIM_EPS;
}
function artPastTrim(elements, dims){ return (elements||[]).filter(el=>crossesTrim(el, dims)); }

/* The parts that are FILLS — colour meant to meet the edge. One of these
   stopping exactly on the trim is a flood that doesn't bleed: the cut lands a
   hair inside or outside it and shows a white sliver either way. */
function isFill(el){
  if(el.type==='block'||el.type==='slab'||el.type==='image') return true;
  if(el.type==='stripes'||el.type==='dotfield') return el.bg && el.bg!=='none';
  if(el.type==='marquee') return el.surface==='solid'||el.surface==='accent';
  return false;
}
function touchesTrim(el, dims){
  const b=elBounds(el), e=TRIM_EPS;
  return Math.abs(b.x0)<=e || Math.abs(b.y0)<=e || Math.abs(b.x1-dims.wpt)<=e || Math.abs(b.y1-dims.hpt)<=e;
}

/* Every string an element prints, with the family that sets it — the glyph
   check asks the embedded face, not the browser, which falls back silently. */
const TEXT_TYPES = ['headline','body','kicker','bignum','numeral'];
function elStrings(el){
  const out=[], up=(s)=> (s||'').toUpperCase();
  const add=(s, fam)=>{ if(s) out.push({ s:String(s), fam }); };
  const t=el.type;
  if(TEXT_TYPES.indexOf(t)>=0) add(el.upper!==false && t!=='body' ? up(el.text) : el.text, el.fam||'mont');
  else if(t==='pricelist'){ add(el.upper===false?el.heading:up(el.heading),'mont');
    (el.items||[]).forEach(it=>{ add(el.upper===false?it.l:up(it.l),'mont'); add(it.p,'grot'); });
    if(el.listStyle==='bulleted') add(el.marker||'•','mont'); }
  else if(t==='qr') add(up(el.caption),'mont');
  else if(t==='coupon'){ add(el.heading,'mont'); add(el.big,'mont'); add(el.terms,'mont'); add(el.code,'mont'); }
  else if(t==='footer'||t==='contact'){ add(up(el.site),'mont'); add(el.addr,'grot'); }
  else if(t==='badge'||t==='seal'){ add(up(el.top),'mont'); add(t==='seal'?el.big:up(el.big),'mont'); add(up(el.sub),'mont'); }
  else if(t==='marquee'){ add(up(el.text),'mont'); add(el.sep,'mont'); }
  else if(t==='arrow') add(up(el.label),'mont');
  else if(t==='arctext') add(el.upper!==false?up(el.text):el.text, el.fam||'mont');
  else if(t==='punchgrid' && el.bonus) add(el.bonusLabel,'mont');
  return out;
}

/* THE PREFLIGHT. Non-blocking: a list of what will go wrong on press, each
   naming the part so a click can select it. ctx carries what only the app can
   know — { images: id → {w,h} | null (null = gone from storage),
            hasGlyph(fam, weight, codePoint) → bool | null (null = not yet known) }.
   level 'err' = the PDF will be visibly wrong; 'warn' = worth a look. */
const SAFE_MM = 3;
const MIN_DPI = 150;
function preflight(doc, dims, ctx){
  ctx = ctx||{};
  const out=[], els=doc.elements||[], bleed=doc.withBleed===true, safe=SAFE_MM*PT_PER_MM;
  const past = artPastTrim(els, dims);
  if(past.length && !bleed) out.push({ level:'err', kind:'bleed', ids:past.map(e=>e.id),
    text:'Art runs past the trim but bleed is OFF — the page stops at the trim, so the cut shows white. Turn Bleed on.' });
  els.forEach(el=>{
    const b=elBounds(el); if(!onSheet(b, dims)) return;
    const name = el.type;
    if(isFill(el) && touchesTrim(el, dims) && !crossesTrim(el, dims))
      out.push({ level:'warn', kind:'edge', ids:[el.id], text:name+' stops exactly on the trim — run it 12pt past the edge (and export with bleed) or the cut shows a white sliver.' });
    if(el.type==='image'){
      if(!el.imgId) out.push({ level:'err', kind:'img', ids:[el.id], text:'Image frame is empty — it prints as a white box.' });
      else if(ctx.images && ctx.images[el.imgId]===null)
        out.push({ level:'err', kind:'img', ids:[el.id], text:'Image is missing from storage — it prints as a white box. Re-upload it.' });
      else if(ctx.images && ctx.images[el.imgId]){
        const m=ctx.images[el.imgId], zoom=el.imgScale||1;
        const s=(el.fit==='contain' ? Math.min(el.w/m.w, el.h/m.h) : Math.max(el.w/m.w, el.h/m.h))*zoom;   // pt per source px
        const dpi=Math.round(72/s);
        if(dpi<MIN_DPI) out.push({ level:'warn', kind:'dpi', ids:[el.id], text:'Image is '+dpi+' dpi at print size (want '+MIN_DPI+'+) — it will look soft.' });
      }
    }
    if(el.type==='qr' && el.quiet===false)
      out.push({ level:'warn', kind:'qr', ids:[el.id], text:'QR quiet zone is OFF — scanners need 4 clear modules round the code.' });
    const strs = elStrings(el);
    if(strs.length && el.type!=='marquee'){
      if(b.x0<safe || b.y0<safe || b.x1>dims.wpt-safe || b.y1>dims.hpt-safe)
        out.push({ level:'warn', kind:'safe', ids:[el.id], text:name+' text sits within '+SAFE_MM+' mm of the trim — the cut can nick it.' });
    }
    if(ctx.hasGlyph){
      const miss={};
      strs.forEach(({s,fam})=>{
        const w = TEXT_TYPES.indexOf(el.type)>=0||el.type==='arctext' ? (el.weight||700) : 700;
        for(const ch of Array.from(nfc(s))){
          if(ch==='★'||/\s/.test(ch)) continue;   // ★ is drawn as a vector star, never a glyph
          if(ctx.hasGlyph(fam, w, ch.codePointAt(0))===false) miss[ch]=1;
        }
      });
      const ks=Object.keys(miss);
      if(ks.length) out.push({ level:'err', kind:'glyph', ids:[el.id], text:name+': '+ks.map(c=>'“'+c+'”').join(' ')+' not in the embedded font — prints as a blank box.' });
    }
  });
  return out;
}

export { nfcDeep, migrateElements, elBounds, crossesTrim, artPastTrim, elStrings, preflight, SAFE_MM, MIN_DPI };
