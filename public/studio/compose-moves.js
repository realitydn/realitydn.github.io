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
     line — a line across the photo (the scanner drag's start)
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

/* The handle a selected photo's move puts on the canvas, or null. */
function composeHandle(el){
  if(!el || el.type!=='photo') return null;
  const m = COMPOSE_BY[el.compose]; if(!m || m.v==='none') return null;
  if(m.line) return { kind:'line', dir:el.dragDir||'down', pos:el.dragPos!=null?el.dragPos:0.6 };
  if(m.pt && (!m.ptWhen || m.ptWhen(el))) return { kind:'point', keys:m.pt, x:el[m.pt[0]]||0, y:el[m.pt[1]]||0, name:m.ptName };
  return null;
}

export { COMPOSE_MOVES, COMPOSE_BY, composeHandle };
