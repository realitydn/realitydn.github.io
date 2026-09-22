/* ============================================================
   REALITY POSTER STUDIO — photos by reference
   ------------------------------------------------------------
   A photo or logo element's `src` / `src2` holds either
     • a reference, 'ref:sha256:<hex>' — the image lives once in the
       shared blob store (../studio-shared/blobs.js, DB 'reality-blobs'),
       however many posters, templates and undo steps use it; or
     • an inline data URL — everything saved before Phase 5, cloud
       drafts, template files. Still drawn, forever.
   New photos come in as references (takePhoto / adoptResult), and every
   doc that reaches storage is interned (internDoc) — so the working doc,
   the templates and the undo history carry a few dozen bytes per photo
   instead of ~1 MB.

   Anything that leaves for a reader that only knows inline photos gets
   them back inline (inlineDoc): the cloud mirror (re-cut to 860 px, as
   before — see studio-store.js slimDocForCloud) and the template export
   file (full size). So the hub and old builds see exactly what they
   always saw.
   ============================================================ */
import { makeBlobStore, isRef, isInline } from '../studio-shared/blobs.js';
import { processImageFile } from '../studio-shared/image-intake.jsx';

const Photos = makeBlobStore({ owner:'poster' });
const PHOTO_KEYS = ['src', 'src2'];

/* Map every photo field of a doc through `fn` (async, value → value); an
   element nothing changed keeps its identity, and so does the doc. */
async function mapPhotos(doc, fn){
  if(!doc || !Array.isArray(doc.elements)) return doc;
  let changed = false;
  const els = await Promise.all(doc.elements.map(async el=>{
    if(!el) return el;
    let patch = null;
    for(const k of PHOTO_KEYS){
      const v = el[k];
      if(!v) continue;
      let r = v;
      try{ r = await fn(v); }catch(e){ r = v; }
      if(r!==v){ (patch || (patch = {}))[k] = r; }
    }
    if(!patch) return el;
    changed = true;
    return Object.assign({}, el, patch);
  }));
  return changed ? Object.assign({}, doc, { elements: els }) : doc;
}

/* inline photos → references. Never throws; a photo the store refuses stays inline. */
function internDoc(doc){ return mapPhotos(doc, v=> isInline(v) ? Photos.adopt(v) : v); }
async function internTpl(t){
  if(!t || !t.doc) return t;
  const d = await internDoc(t.doc);
  return d===t.doc ? t : Object.assign({}, t, { doc: d });
}
/* references → inline data URLs (`toInline(ref)`, default: the exact data URL
   the image came in as). A reference whose image is missing stays as it is. */
function inlineDoc(doc, toInline){
  const f = toInline || Photos.toDataUrl;
  return mapPhotos(doc, v=> isRef(v) ? f(v) : v);
}
async function inlineTpl(t, toInline){
  if(!t || !t.doc) return t;
  const d = await inlineDoc(t.doc, toInline);
  return d===t.doc ? t : Object.assign({}, t, { doc: d });
}
/* every reference a doc holds, into `into` (a Set) */
function refsOf(doc, into){
  const out = into || new Set();
  if(doc && Array.isArray(doc.elements)) doc.elements.forEach(el=>{
    if(!el) return;
    PHOTO_KEYS.forEach(k=>{ if(isRef(el[k])) out.add(el[k]); });
  });
  return out;
}

/* An intake result ({ data, w, h } from processImageFile) with its data URL
   stored and swapped for a reference. */
function adoptResult(r){
  return Photos.adopt(r.data).then(src=>Object.assign({}, r, { data: src }));
}
/* processImageFile, landing as a reference: every way a photo comes in
   (upload, paste, drop) goes through here. */
function takePhoto(file, onReady, onError){
  processImageFile(file, r=>{ adoptResult(r).then(onReady); }, onError);
}

export { Photos, isRef, isInline, internDoc, internTpl, inlineDoc, inlineTpl, refsOf, adoptResult, takePhoto };
