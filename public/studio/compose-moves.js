/* ============================================================
   REALITY POSTER STUDIO — the recompose moves
   What the Recompose fold offers and what the canvas draws a handle for.
   The moves themselves live in the engine (riso-engine.js RECOMPOSE);
   this is only their names, copy and which of them take a point or a line.
     cut  — has gaps (so the Gaps print: Paper / Ink choice applies)
     rnd  — has seeded chance in it (so Shuffle does something)
     snap — can line its cuts up with the poster grid
     pt   — [xKey, yKey]: a point you place on the photo (fractions of the
            frame from its centre, -0.5..0.5); ptWhen narrows it to a variant
     line — a line across the photo (the scanner drag's start); see
            composeHandles for every handle a move draws
   ============================================================ */
const COMPOSE_MOVES = [
  { v:'none',   l:'None',   tag:'the photo as framed' },
  { v:'slice',  l:'Slice',  tag:'strips slid along themselves', cut:1, rnd:1, snap:1 },
  { v:'weave',  l:'Weave',  tag:'strips of two photos, in turn', snap:1 },
  { v:'radial', l:'Rings',  tag:'rings turned, or wedges pushed', cut:1, rnd:1, snap:1, pt:['radX','radY'], ptName:'centre' },
  { v:'tiles',  l:'Tiles',  tag:'cut into squares, laid back by hand', cut:1, rnd:1, snap:1 },
  { v:'shards', l:'Shards', tag:'broken glass', cut:1, rnd:1, pt:['shardX','shardY'], ptName:'point of impact' },
  { v:'drag',   l:'Drag',   tag:'pulled across the copier glass', rnd:1, line:1 },
  { v:'echo',   l:'Echo',   tag:'a trail, or the photo inside itself', cut:1, pt:['echoX','echoY'], ptName:'tunnel centre', ptWhen:el=>el.echoMode==='tunnel' },
  { v:'mirror', l:'Mirror', tag:'one half reflected onto the other', snap:1, pt:['mirrorX','mirrorY'], ptName:'mirror line' },
  { v:'panels', l:'Panels', tag:'one photo, several crops', cut:1, snap:1, pt:['panelX','panelY'], ptName:'focus point' },
];
const COMPOSE_BY = {}; COMPOSE_MOVES.forEach(m=>{ COMPOSE_BY[m.v]=m; });

/* The handles a selected photo's move puts on the canvas, in drawing order.
     point — { keys:[xKey,yKey], x, y, name, mul } — x/y are fractions of the
             frame from its centre (-0.5..0.5); the stored value is that × mul
             (the region's centre is stored in half-frames, so mul 2).
     line  — { key, r, pos, lo, hi, name } — a line across the photo at `pos`
             (0..1) measured ALONG direction r (degrees; 0 = down the photo,
             90 = across to the right), the way the engine measures a drag's
             start or a slice band's edge: pos runs over the photo's extent
             on that axis, so the line sits where the engine cuts at any tilt.
   Lines that are only meaningful once switched on (a slice band, a drag's
   end) appear only then — their panel toggle places them. */
const DRAG_ROT = { down:0, up:180, right:90, left:-90 };
function composeHandles(el){
  if(!el || el.type!=='photo') return [];
  const m = COMPOSE_BY[el.compose]; if(!m || m.v==='none') return [];
  const out = [];
  if(m.v==='drag'){
    const r = (DRAG_ROT[el.dragDir||'down']||0) + (el.dragTilt||0);
    const pos = el.dragPos!=null?el.dragPos:0.6, end = el.dragEnd!=null?el.dragEnd:1;
    out.push({ kind:'line', key:'dragPos', r, pos, lo:0.05, hi:Math.min(0.95, end<1 ? end-0.05 : 0.95), name:'drag start' });
    if(end<1) out.push({ kind:'line', key:'dragEnd', r, pos:end, lo:pos+0.05, hi:0.99, name:'drag end' });
  }
  if(m.v==='slice' && ((el.sliceFrom||0)>0 || (el.sliceTo!=null && el.sliceTo<1))){
    const r = -(el.sliceAngle||0), from = el.sliceFrom||0, to = el.sliceTo!=null?el.sliceTo:1;
    out.push({ kind:'line', key:'sliceFrom', r, pos:from, lo:0, hi:to-0.05, name:'band start' });
    out.push({ kind:'line', key:'sliceTo', r, pos:to, lo:from+0.05, hi:1, name:'band end' });
  }
  if(m.pt && (!m.ptWhen || m.ptWhen(el))) out.push({ kind:'point', keys:m.pt, x:el[m.pt[0]]||0, y:el[m.pt[1]]||0, name:m.ptName, mul:1 });
  /* where the move happens — the region's centre (a sweep has no centre to place) */
  if(el.composeRegion==='radial' || el.composeRegion==='band')
    out.push({ kind:'point', keys:['cmpRegX','cmpRegY'], x:(el.cmpRegX||0)/2, y:(el.cmpRegY||0)/2, name:'region centre', mul:2 });
  return out;
}
/* where a line handle sits on a w×h box, and the position a local point maps
   back to — the two halves of one formula, kept together */
function lineHandleGeom(hd, w, h){
  const a = hd.r*Math.PI/180, sx = Math.sin(a), cy = Math.cos(a);
  const E = Math.abs(sx)*w + Math.abs(cy)*h;
  return { E, x:w/2 + (hd.pos-0.5)*E*sx, y:h/2 + (hd.pos-0.5)*E*cy };
}
function linePosAt(hd, w, h, lx, ly){
  const a = hd.r*Math.PI/180, sx = Math.sin(a), cy = Math.cos(a);
  const E = Math.abs(sx)*w + Math.abs(cy)*h;
  return (lx*sx + ly*cy)/(E||1) + 0.5;
}

export { COMPOSE_MOVES, COMPOSE_BY, composeHandles, lineHandleGeom, linePosAt };
