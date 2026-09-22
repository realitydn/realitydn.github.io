/* ============================================================
   REALITY POSTER STUDIO — library cards
   Folding sections, the thumbnail queue and the template cards.
   ============================================================ */
import { RUI } from '../../studio-shared/studio-ui.jsx';
import { FORMATS as AP_FMT, PALETTE as AP_PAL, themeColors } from '../studio-data.jsx';
import { buildTemplate as apBuildTpl } from '../templates.jsx';
import { StudioElement, posterDayOf, loadCachedImage } from '../studio-element.jsx';
/* ============================================================
   LIBRARY CHROME — collapsible sections + real previews.
   ============================================================
   The parts list was 3,195px of always-open rows. Print Studio
   already had the answer (its .ps-sec / .ps-tplcard), so these
   are the same two ideas in Poster's register: every group is a
   button with a count that starts closed, and a template is a
   mini render of itself rather than "4 parts · click to load".

   Open state rides the shared fold store, so it persists — and
   a closed section renders no children, which is also what keeps
   twenty riso thumbnails from being built on page load. */
function Sec({ id, title, count, dot, sub, open, children }){
  const key = 'lib:'+id;
  const folds = RUI.useStore(RUI.foldStore);
  const chosen = folds[key];
  const isOpen = chosen!=null ? chosen : !!open;
  return (
    <React.Fragment>
      <button className={'rs-sec'+(isOpen?' open':'')} onClick={()=>RUI.setFold(key, !isOpen)}>
        <span className="caret">{isOpen?'▾':'▸'}</span>
        {dot && <span className="dot" style={{ background:dot }} />}
        <span className="t">{title}</span>
        {sub && <span style={{ fontSize:10, opacity:.45, flex:'none' }}>{sub}</span>}
        {count!=null && <span className="n">{count}</span>}
      </button>
      {isOpen && children}
    </React.Fragment>
  );
}

/* ---- library thumbnails ----------------------------------------------------
   Rasterising a card is main-thread work, so captures run ONE AT A TIME: open a
   day with eight posters in it and the tiles fill in one after another instead
   of the panel locking up. Ordering also buys every card after the first a long
   settle before its own turn comes round. */
let _thumbQ = Promise.resolve();
function queueThumb(fn){
  _thumbQ = _thumbQ.then(fn, fn).catch(()=>{});
  return _thumbQ;
}
/* html-to-image inlines the web fonts into every capture, and re-reads the
   stylesheets to do it. The answer is the same for all of them, so it's fetched
   once and handed to each.

   Time-boxed, and that matters more than the saving: the fetch is of Google's
   font files, and when they're slow to answer html-to-image simply waits — which
   would park the whole capture queue behind them for as long as the connection
   is bad. Past the deadline (or on an older build with no helper) captures go
   ahead with '' and fall back to system type, which at 88px is a wash. */
let _thumbFontCss = null;
function thumbFontCss(node){
  if(_thumbFontCss) return _thumbFontCss;
  const hti = window.htmlToImage;
  _thumbFontCss = (hti && typeof hti.getFontEmbedCSS==='function')
    ? Promise.race([
        Promise.resolve(hti.getFontEmbedCSS(node)).catch(()=>''),
        new Promise(r=>setTimeout(()=>r(''), 4000)),
      ]).then(css=>typeof css==='string'?css:'')
    : Promise.resolve('');
  return _thumbFontCss;
}
/* The press only paints a photo once its source has decoded, so a capture taken
   on mount catches empty frames. Warm the sources first, then wait one fully
   painted frame — same shape as settleFormat, rAF raced against a timeout so a
   backgrounded tab can't stall the queue.
   The warm-up goes through the element renderer's own image cache
   (loadCachedImage). This comment used to claim RISO.loadImage was cached; it
   isn't, so every card decoded each photo twice — once here, once again in
   the press. Now the press finds the decode waiting for it. */
async function settleThumb(doc){
  try{
    const srcs = [];
    (doc.elements||[]).forEach(el=>{ if(el && el.src) srcs.push(el.src); if(el && el.src2) srcs.push(el.src2); });
    const load = loadCachedImage || (window.RISO && window.RISO.loadImage);
    if(srcs.length && load)
      await Promise.all(srcs.map(s=>load(s).catch(()=>null)));
  }catch(e){}
  await new Promise(r=>{ let done=false; const fin=()=>{ if(!done){ done=true; r(); } };
    requestAnimationFrame(()=>requestAnimationFrame(fin)); setTimeout(fin, 400); });
  await new Promise(r=>setTimeout(r, 180));
}

/* A template drawn at ~1/12 scale by the SAME element renderer the canvas
   uses, so the preview cannot lie about what loading it gives you.

   Drawn ONCE, though. Every card used to be a live poster: its photos went back
   through the riso press on every open, and — because the card passed a bare
   `exporting` — at the export grid's 2x, so an 88px tile paid for a 2,160px
   render. Two things changed. The press is now told the tile's real ratio, and
   the first painted frame is captured to a small JPEG (`onCapture`) that every
   later open draws instead of the poster. `thumb` is that capture; a card
   without one renders live exactly as before and takes its picture. */
function TplThumb({ doc, w, thumb, onCapture }){
  const f = AP_FMT[doc.masterFormat||'4x5'];
  const tw = w||88, sc = tw/f.w, th = Math.round(f.h*sc);
  const t = themeColors(doc.theme||'day');
  const accentHex = AP_PAL[doc.accent] || AP_PAL.blue;
  const inner = React.useRef(null);
  const noop = ()=>{};
  /* Capture the live render once, then hand it up to be filed. Keyed on `thumb`
     alone: a re-render for any other reason must not re-shoot a card, and a
     capture that lands flips this to the <img> branch. */
  React.useEffect(()=>{
    if(thumb || !onCapture || !window.htmlToImage) return;
    let alive = true;
    queueThumb(async ()=>{
      if(!alive || !inner.current) return;
      await settleThumb(doc);
      const node = inner.current;
      if(!alive || !node) return;
      /* Captured at the tile's own scale (pixelRatio sc*2 over the poster's real
         1080px box) — a ~176px JPEG, which is what the card wants and all it
         should ever have cost. */
      const src = await window.htmlToImage.toJpeg(node, {
        width:f.w, height:f.h, pixelRatio:sc*2, quality:0.82, backgroundColor:t.bg,
        fontEmbedCSS: await thumbFontCss(node),
        style:{ transform:'none', transformOrigin:'0 0' } });
      if(alive && src) onCapture({ src, w:tw, h:th });
    });
    return ()=>{ alive=false; };
  }, [thumb]);

  if(thumb && thumb.src){
    /* Height rides the capture, not this doc — a thumbnail shot at another tile
       width still lands on its own aspect rather than being squashed into it. */
    const ih = thumb.w ? Math.round((thumb.h||th) * (tw/thumb.w)) : th;
    return <img className="rs-thumbbox" src={thumb.src} alt="" loading="lazy" decoding="async"
      style={{ width:tw, height:ih, background:t.bg, display:'block' }} />;
  }
  return (
    <div className="rs-thumbbox" style={{ width:tw, height:th }}>
      <div ref={inner} style={{ width:f.w, height:f.h, transform:'scale('+sc+')', transformOrigin:'0 0',
        background:t.bg, position:'relative', overflow:'hidden', pointerEvents:'none' }}>
        {doc.elements.map(el=>(
          <StudioElement key={el.id} el={el} theme={doc.theme||'day'} posterAccentHex={accentHex}
            posterAccent={doc.accent} posterDay={posterDayOf(doc)} selected={false} dragging={false} onElPointerDown={noop} exporting={sc*2} />
        ))}
      </div>
    </div>
  );
}
function TplCard({ tpl, onApply }){
  const built = React.useMemo(()=>apBuildTpl(tpl), [tpl]);
  return (
    <div className="rs-tplcard" onClick={onApply} title={tpl.name}>
      <TplThumb doc={built} w={88} />
      <span className="tn">{tpl.name}</span>
      <span className="ts">{tpl.els.length} parts</span>
    </div>
  );
}
function UserTplCard({ t, onApply, onArchive, onDelete, archived, thumb, onCapture }){
  return (
    <div className="rs-tplcard" onClick={onApply} title={t.name} style={archived?{ opacity:.75 }:null}>
      <TplThumb doc={t.doc} w={88} thumb={thumb} onCapture={onCapture} />
      <span className="tn">{t.name}</span>
      <span className="ts">{archived ? 'archived' : new Date(t.savedAt).toLocaleDateString(undefined,{ day:'numeric', month:'short' })}</span>
      <button className="rs-tplx" style={{ right:28, top:4, width:20, height:20, fontSize:11, borderColor:'#3a2f1f', color:'#b6ab97' }}
        title={archived?'Restore to My templates':'Archive — tuck it into the Archive drawer'}
        onClick={e=>{ e.stopPropagation(); onArchive(); }}>{archived?'↩':'⤓'}</button>
      <button className="rs-tplx" style={{ top:4, width:20, height:20, fontSize:11 }} title="Delete this template"
        onClick={e=>{ e.stopPropagation(); onDelete(); }}>×</button>
    </div>
  );
}

export { Sec, TplThumb, TplCard, UserTplCard };
