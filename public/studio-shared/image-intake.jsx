/* ============================================================
   REALITY STUDIOS — image intake, once
   ------------------------------------------------------------
   File / clipboard / drop → a sized image, for every Studio that
   takes photos (Poster, Print). One implementation of: read the file,
   decode it, downscale to the host's long-edge cap, re-encode (PNG
   keeps its alpha, for partner logos; everything else is JPEG), and —
   when the browser can't open it — SAY WHY instead of failing in
   silence. The commonest such file is an iPhone HEIC, which Chrome on
   Windows can't decode.

   Per host, as configuration (like RUI.configure — each Studio's bundle
   has its own copy of this module, so it is set once at load):
     maxEdge     — long-edge cap in px. Poster 2000 (a 4:5 export is
                   2160 wide; the working doc lives in IndexedDB, and
                   what goes to the hub is re-cut to 860 on the way out).
                   Print 3500: 150 dpi across 593 mm — an A2's long side,
                   an A1's short one; its pixels live in IndexedDB too.
     jpegQuality — Poster 0.82, Print 0.86 (print keeps a little more).
     uploadLabel — the upload button's default wording.

   Before this module the two copies had drifted: Print had no error
   path at all (an undecodable file just did nothing), no HEIC message,
   and ignored a HEIC dropped from Windows Explorer (empty MIME type);
   Poster had no zero-size guard. Both now get all of it.
   ============================================================ */
import { RUI } from './studio-ui.jsx';

const CFG = { maxEdge:2000, jpegQuality:0.82, uploadLabel:'⬆ Upload / replace photo…' };
function configure(opts){ Object.assign(CFG, opts||{}); }

/* The words for a file the browser couldn't open. */
function imageErrorMessage(file){
  const name = (file && file.name) || 'that file';
  const heic = /\.(heic|heif)$/i.test(name) || /hei[cf]/i.test((file && file.type)||'');
  return heic
    ? 'Couldn’t open “'+name+'” — this browser can’t read HEIC (iPhone) photos. Convert it to JPEG first, or screenshot it. (On the iPhone, Settings → Camera → Formats → Most Compatible stops new photos being HEIC.)'
    : 'Couldn’t open “'+name+'” as an image — it may be damaged, or a format this browser can’t read. JPEG, PNG and WebP always work.';
}

/* Read an image File/Blob, downscale to ≤ maxEdge on the long side and hand
   back { data (a data URL), w, h }. `onError(message)` hears about a file
   that can't be decoded (an alert if the caller didn't pass one). */
function processImageFile(file, onReady, onError){
  if(!file) return;
  const fail = ()=>{ const m = imageErrorMessage(file); if(typeof onError==='function') onError(m); else window.alert(m); };
  const png = file.type==='image/png';
  const fr = new FileReader();
  fr.onerror = fail;
  fr.onload = ()=>{ const im = new Image();
    im.onerror = fail;
    im.onload = ()=>{
      if(!im.width || !im.height){ fail(); return; }
      const sc = Math.min(1, CFG.maxEdge/Math.max(im.width, im.height));
      const w = Math.max(1, Math.round(im.width*sc)), h = Math.max(1, Math.round(im.height*sc));
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      c.getContext('2d').drawImage(im, 0, 0, w, h);
      onReady({ data: png ? c.toDataURL('image/png') : c.toDataURL('image/jpeg', CFG.jpegQuality), w, h });
    };
    im.src = fr.result; };
  fr.readAsDataURL(file);
}

/* Is this dropped/pasted file meant to be a picture? By type, or — because
   Windows hands HEIC over with an empty type — by name, so an iPhone photo
   reaches processImageFile and gets told why it won't open instead of being
   ignored. */
function looksLikeImage(f){
  if(!f) return false;
  if(f.type && f.type.indexOf('image/')===0) return true;
  return /\.(jpe?g|png|webp|gif|avif|bmp|heic|heif)$/i.test(f.name||'');
}

/* Pull the first image out of a paste payload (DataTransfer), or null. */
function imageFromClipboard(cd){
  if(!cd) return null;
  const items = cd.items;
  if(items){ for(let i=0;i<items.length;i++){ const it = items[i];
    if(it.kind==='file' && it.type && it.type.indexOf('image/')===0) return it.getAsFile(); } }
  const files = cd.files;
  if(files){ for(let i=0;i<files.length;i++){ if(looksLikeImage(files[i])) return files[i]; } }
  return null;
}

/* The upload button. `onFile(file)` gets the raw File (the host decides what
   to do with it); or pass `onImage(result)` and the button runs
   processImageFile itself. Styled by the host's RUI prefix (`…-addrow`). */
function PhotoUpload({ onFile, onImage, label }){
  const inp = React.useRef(null);
  function handle(e){
    const f = e.target.files[0];
    if(f){ if(onImage) processImageFile(f, onImage); else if(onFile) onFile(f); }
    e.target.value = '';
  }
  return (<React.Fragment>
    <button className={RUI.cls('addrow')} onClick={()=>inp.current.click()}>{label||CFG.uploadLabel}</button>
    <input ref={inp} type="file" accept="image/*" style={{ display:'none' }} onChange={handle} />
  </React.Fragment>);
}

const ImageIntake = { configure };
export { ImageIntake, processImageFile, imageFromClipboard, looksLikeImage, imageErrorMessage, PhotoUpload };
