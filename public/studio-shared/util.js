/* ============================================================
   REALITY STUDIOS — small helpers, once
   ------------------------------------------------------------
   The little functions Poster and Print each had a byte-identical copy
   of. What differs between the Studios is a parameter:
     · element ids — Poster mints 'e…', Print 'p…' (setIdPrefix, once per
       Studio; each bundle has its own copy of this module, so its own
       counter). Ids only need to be unique within a doc; the prefix just
       tells you at a glance which Studio made one.
     · the type scale — Poster snaps px sizes, Print pt sizes; the ladder
       is the Studio's, the snapping is this.
   ============================================================ */

/* ---- element ids ---- */
let _prefix = 'e';
let _id = 1;
function setIdPrefix(p){ _prefix = String(p||'e'); }
function uid(){ return _prefix+(_id++)+'_'+Math.random().toString(36).slice(2,6); }

/* ---- names → filename slugs ----
   Vietnamese-safe: đ/Đ are mapped by hand (they don't decompose under NFD),
   the rest of the diacritics strip normally.
   "Đêm Trò Chơi" → "dem-tro-choi"; "Board Game Night" → "board-game-night". */
function slugify(s){
  return (s||'').replace(/đ/g,'d').replace(/Đ/g,'D')
    .normalize('NFD').replace(new RegExp('[\\u0300-\\u036f]','g'),'')
    .toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-+|-+$)/g,'');
}

/* ---- a modular type scale ----
   makeTypeScale(steps) → { steps, snap(v), step(v, dir) }: snap to the
   nearest rung (ties go to the smaller), step one rung up/down, clamped. */
function makeTypeScale(steps){
  const snap = (v)=>{
    let best = steps[0], d = Infinity;
    for(const s of steps){ const dd = Math.abs(s-v); if(dd<d){ d=dd; best=s; } }
    return best;
  };
  const step = (v, dir)=>{
    let i = steps.indexOf(snap(v));
    i = Math.max(0, Math.min(steps.length-1, i+dir));
    return steps[i];
  };
  return { steps, snap, step };
}

/* ---- CSS em value ---- */
const EM = (v)=> v+'em';

export { setIdPrefix, uid, slugify, makeTypeScale, EM };
