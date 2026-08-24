/* ============================================================
   REALITY PRINT STUDIO — Canvas (white artboard, snap, guides)
   Works in points. Shows the trim edge, the safe margin, the
   layout grid (columns/rows), bleed + crop-mark preview, smart
   alignment guides, multi-drag and 8-handle resize.
   The stage scrolls when zoomed past fit.
   Exports: PrintCanvas
   ============================================================ */
const { PALETTE: PC_PAL, INK: PC_INK, PrintElement: PCElement } = window;
const PC_STEP = 6;                     // fallback snap grid (pt)
const PC_GUIDE = '#ed1b72';            // brand pink alignment line
const PC_GRID = '#18a7e0';             // layout grid blue

function pcSnap(v, step){ return Math.round(v/step)*step; }

/* ============================================================
   IN-PLACE TEXT EDITING — matches Poster Studio's.
   ============================================================
   A textarea laid over the element's box in POINT coordinates,
   styled to that element's type so it reads as editing the sheet
   rather than a form about it. Writes through the same onChange
   the drag handles use. */
const PC_EDITABLE = ['headline','body','kicker','bignum','numeral'];
const PC_FAMS = { mont:"'Montserrat',sans-serif", grot:"'Space Grotesk',sans-serif", alt:"'Montserrat Alternates',sans-serif" };
function pcEditFont(el){
  return {
    fontFamily: PC_FAMS[el.fam||'mont'] || PC_FAMS.mont,
    fontWeight: el.weight!=null ? el.weight : ((el.fam||'mont')==='grot' ? 400 : 800),
    fontSize: (el.fontSize||24),
    lineHeight: el.leading!=null ? el.leading : (el.type==='body'?1.32:0.95),
    letterSpacing: ((el.tracking!=null?el.tracking:0))+'em',
    textAlign: el.align||'left',
    textTransform: el.upper!==false ? 'uppercase' : 'none',
  };
}
function PcTextEditor({ el, onChange, onDone }){
  const ref = React.useRef(null);
  React.useEffect(()=>{ const n=ref.current; if(n){ n.focus(); n.select(); } }, []);
  return (
    <textarea ref={ref} value={el.text||''} spellCheck={false}
      onChange={e=>onChange(el.id, { text:e.target.value })}
      onBlur={onDone}
      onKeyDown={e=>{
        e.stopPropagation();                       // keep nudge/delete off the canvas
        if(e.key==='Escape'){ e.preventDefault(); onDone(); }
        if(e.key==='Enter' && (e.metaKey||e.ctrlKey)){ e.preventDefault(); onDone(); }
      }}
      style={Object.assign({
        position:'absolute', left:el.x, top:el.y, width:el.w, height:el.h,
        transform: el.rot ? 'rotate('+el.rot+'deg)' : null,
        background:'rgba(237,27,114,.08)', border:'2px solid '+PC_GUIDE, outline:'none',
        color:'#111111', padding:0, margin:0, resize:'none', overflow:'hidden', zIndex:60,
        caretColor:PC_GUIDE,
      }, pcEditFont(el))} />
  );
}

function PrintCanvas({ elements, wpt, hpt, accent, grid, bleedPt, showGrid, showBleed, snap, scale,
                       stageRef, canvasRef, selectedId, selectedIds, onSelect, onChange, onChangeMany, onCommit, onZoomWheel }){
  const accentHex = PC_PAL[accent] || PC_PAL.pink;
  const [guides, setGuides] = React.useState([]);
  const [editId, setEditId] = React.useState(null);
  const dragRef = React.useRef(null);
  React.useEffect(()=>{ if(editId && editId!==selectedId) setEditId(null); }, [selectedId]);
  const marginPt = grid ? grid.m : 17;

  /* snap target lists — margins, centre, layout grid lines, sibling edges */
  function snapTargets(excludeIds){
    const xL = (grid ? grid.xs.slice() : [wpt/2]);
    const yL = (grid ? grid.ys.slice() : [hpt/2]);
    elements.forEach(e=>{ if(excludeIds.indexOf(e.id)>=0) return;
      xL.push(e.x, e.x+e.w/2, e.x+e.w); yL.push(e.y, e.y+e.h/2, e.y+e.h); });
    return { xL, yL };
  }

  function toCanvas(e){
    const r = canvasRef.current.getBoundingClientRect();
    return { x:(e.clientX-r.left)/scale, y:(e.clientY-r.top)/scale };
  }
  function startMove(e, el){
    e.stopPropagation();
    if(e.shiftKey){ onSelect(el.id, true); return; }
    const multi = selectedIds && selectedIds.length>1 && selectedIds.indexOf(el.id)>=0;
    if(!multi) onSelect(el.id, false);
    const p = toCanvas(e);
    const ids = multi ? selectedIds.slice() : [el.id];
    const orig = {};
    ids.forEach(id=>{ const it=elements.find(x=>x.id===id); if(it) orig[id]={x:it.x, y:it.y}; });
    dragRef.current = { mode:'move', id:el.id, ids, orig, ox:p.x-el.x, oy:p.y-el.y, w:el.w, h:el.h, x0:el.x, y0:el.y };
    addListeners();
  }
  function startRotate(e, el){ e.stopPropagation(); dragRef.current = { mode:'rotate', id:el.id, cx:el.x+el.w/2, cy:el.y+el.h/2 }; addListeners(); }
  function startResize(e, el, handle){
    e.stopPropagation();
    dragRef.current = { mode:'resize', id:el.id, handle,
      x:el.x, y:el.y, w:el.w, h:el.h, aspect:el.w/Math.max(1,el.h) };
    addListeners();
  }

  function onMove(e){
    const d = dragRef.current; if(!d) return;
    const p = toCanvas(e);
    if(d.mode==='move'){
      let nx = p.x - d.ox, ny = p.y - d.oy;
      const g = [];
      if(snap){
        const TH = 7/Math.max(0.2,scale);
        const { xL, yL } = snapTargets(d.ids);
        const myX=[nx, nx+d.w/2, nx+d.w]; let bX=null, bXd=TH;
        myX.forEach((m,i)=>xL.forEach(L=>{ const dd=Math.abs(m-L); if(dd<bXd){ bXd=dd; bX={L,e:i}; } }));
        if(bX){ nx += bX.L - myX[bX.e]; g.push({axis:'v', pos:bX.L}); } else nx = pcSnap(nx, PC_STEP);
        const myY=[ny, ny+d.h/2, ny+d.h]; let bY=null, bYd=TH;
        myY.forEach((m,i)=>yL.forEach(L=>{ const dd=Math.abs(m-L); if(dd<bYd){ bYd=dd; bY={L,e:i}; } }));
        if(bY){ ny += bY.L - myY[bY.e]; g.push({axis:'h', pos:bY.L}); } else ny = pcSnap(ny, PC_STEP);
      }
      setGuides(g);
      const dx = Math.round(nx) - d.x0, dy = Math.round(ny) - d.y0;
      if(d.ids.length>1 && onChangeMany){
        const patches = {};
        d.ids.forEach(id=>{ const o=d.orig[id]; if(o) patches[id]={ x:o.x+dx, y:o.y+dy }; });
        onChangeMany(patches);
      } else {
        onChange(d.id, { x:Math.round(nx), y:Math.round(ny) });
      }
    } else if(d.mode==='rotate'){
      let ang = Math.atan2(p.y-d.cy, p.x-d.cx)*180/Math.PI + 90;
      while(ang>180) ang-=360; while(ang<-180) ang+=360;
      [0,15,-15,30,-30,45,-45,90,-90,180,-180].forEach(s=>{ if(Math.abs(ang-s)<5) ang=s; });
      onChange(d.id, { rot:Math.round(ang) });
    } else if(d.mode==='resize'){
      const h = d.handle;
      let x=d.x, y=d.y, w=d.w, hh=d.h;
      const g=[];
      const snapEdge=(v, list)=>{
        if(!snap) return v;
        const TH = 7/Math.max(0.2,scale);
        let best=null, bd=TH;
        list.forEach(L=>{ const dd=Math.abs(v-L); if(dd<bd){ bd=dd; best=L; } });
        return best!=null ? best : pcSnap(v, PC_STEP);
      };
      const { xL, yL } = snap ? snapTargets([d.id]) : { xL:[], yL:[] };
      if(h.indexOf('e')>=0){ let e1=snapEdge(p.x, xL); w=Math.max(16, e1-d.x); if(snap&&xL.indexOf(e1)>=0) g.push({axis:'v',pos:e1}); }
      if(h.indexOf('s')>=0){ let e1=snapEdge(p.y, yL); hh=Math.max(10, e1-d.y); if(snap&&yL.indexOf(e1)>=0) g.push({axis:'h',pos:e1}); }
      if(h.indexOf('w')>=0){ let e1=snapEdge(p.x, xL); e1=Math.min(e1, d.x+d.w-16); w=d.x+d.w-e1; x=e1; if(snap&&xL.indexOf(e1)>=0) g.push({axis:'v',pos:e1}); }
      if(h.indexOf('n')>=0){ let e1=snapEdge(p.y, yL); e1=Math.min(e1, d.y+d.h-10); hh=d.y+d.h-e1; y=e1; if(snap&&yL.indexOf(e1)>=0) g.push({axis:'h',pos:e1}); }
      /* Shift on a corner keeps the original aspect */
      if(e.shiftKey && h.length===2){
        const byW = Math.abs(w-d.w) >= Math.abs(hh-d.h)*d.aspect;
        if(byW){ hh = Math.max(10, w/d.aspect); if(h.indexOf('n')>=0) y = d.y+d.h-hh; }
        else { w = Math.max(16, hh*d.aspect); if(h.indexOf('w')>=0) x = d.x+d.w-w; }
      }
      setGuides(g);
      onChange(d.id, { x:Math.round(x), y:Math.round(y), w:Math.round(w), h:Math.round(hh) });
    }
  }
  function onUp(){ dragRef.current = null; setGuides([]); removeListeners(); onCommit && onCommit(); }
  function addListeners(){ window.addEventListener('pointermove', onMove); window.addEventListener('pointerup', onUp); }
  function removeListeners(){ window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); }
  React.useEffect(()=>removeListeners, []);

  /* ctrl/⌘-wheel zoom — must be a non-passive listener to preventDefault */
  React.useEffect(()=>{
    const st = stageRef.current; if(!st || !onZoomWheel) return;
    function wheel(e){ if(!(e.ctrlKey||e.metaKey)) return; e.preventDefault(); onZoomWheel(e.deltaY); }
    st.addEventListener('wheel', wheel, { passive:false });
    return ()=>st.removeEventListener('wheel', wheel);
  }, [onZoomWheel]);

  const hs = 20/scale, bw = 2/scale, eh = 14/scale;
  const sel = elements.find(el=>el.id===selectedId);
  const mark = 18, gap = 6;             // crop-mark length / gap (pt)

  const HANDLES = [
    ['nw', 0,   0,   'nwse-resize'], ['n', 0.5, 0,   'ns-resize'], ['ne', 1, 0,   'nesw-resize'],
    ['w',  0,   0.5, 'ew-resize'],                                  ['e',  1, 0.5, 'ew-resize'],
    ['sw', 0,   1,   'nesw-resize'], ['s', 0.5, 1,   'ns-resize'], ['se', 1, 1,   'nwse-resize'],
  ];

  return (
    <div ref={stageRef} className="ps-stage"
      onPointerDown={(e)=>{ const t=e.target; if(t===stageRef.current || t.dataset && (t.dataset.bg||t.dataset.spacer)) onSelect(null); }}>
      <div data-spacer="1" className="ps-spacer" style={{ width:wpt*scale+200, height:hpt*scale+200 }}>
        <div ref={canvasRef} className="ps-canvas"
          style={{ width:wpt, height:hpt, transform:`translate(-50%,-50%) scale(${scale})`,
            left:'50%', top:'50%', position:'absolute', background:'#ffffff',
            boxShadow:`0 ${24/scale}px ${70/scale}px rgba(0,0,0,.45)` }}>

          <div data-bg="1" style={{ position:'absolute', inset:0, background:'#ffffff' }} />

          {elements.map(el=>(
            <div key={el.id}
              onDoubleClick={e=>{ if(PC_EDITABLE.indexOf(el.type)>=0){ e.stopPropagation(); onSelect(el.id, false); setEditId(el.id); } }}>
              <PCElement el={el} docAccentHex={accentHex} docAccent={accent}
                selected={el.id===selectedId} dragging={dragRef.current && dragRef.current.id===el.id}
                onElPointerDown={startMove} />
            </div>
          ))}

          {/* the in-place text editor, above the artwork and below the guides */}
          {(()=>{
            const el = editId ? elements.find(x=>x.id===editId) : null;
            if(!el || PC_EDITABLE.indexOf(el.type)<0) return null;
            return <PcTextEditor el={el} onChange={onChange} onDone={()=>setEditId(null)} />;
          })()}

          {/* layout grid — column/row bands + a fine dot lattice */}
          {showGrid && <div style={{ position:'absolute', inset:0, pointerEvents:'none', zIndex:38 }}>
            <div style={{ position:'absolute', inset:0,
              backgroundImage:`repeating-linear-gradient(to right, rgba(17,17,17,.05) 0 1px, transparent 1px ${PC_STEP*4}px), repeating-linear-gradient(to bottom, rgba(17,17,17,.05) 0 1px, transparent 1px ${PC_STEP*4}px)` }} />
            {grid && grid.colBoxes.map((c,i)=>(
              <div key={'c'+i} style={{ position:'absolute', left:c[0], top:marginPt, width:c[1]-c[0], height:hpt-marginPt*2,
                background:'rgba(24,167,224,.06)', borderLeft:`${1/scale}px solid rgba(24,167,224,.45)`, borderRight:`${1/scale}px solid rgba(24,167,224,.45)` }} />
            ))}
            {grid && grid.rowBoxes.map((c,i)=>(
              <div key={'r'+i} style={{ position:'absolute', top:c[0], left:marginPt, height:c[1]-c[0], width:wpt-marginPt*2,
                borderTop:`${1/scale}px solid rgba(24,167,224,.35)`, borderBottom:`${1/scale}px solid rgba(24,167,224,.35)` }} />
            ))}
          </div>}

          {/* safe margin (dashed) */}
          <div style={{ position:'absolute', left:marginPt, top:marginPt, width:wpt-marginPt*2, height:hpt-marginPt*2,
            border:`${1/scale}px dashed ${accentHex}`, opacity:.5, pointerEvents:'none', zIndex:39 }} />

          {/* bleed outline + crop-mark preview (drawn just inside trim corners) */}
          {showBleed && <React.Fragment>
            <div style={{ position:'absolute', left:-bleedPt, top:-bleedPt, width:wpt+bleedPt*2, height:hpt+bleedPt*2,
              border:`${1/scale}px solid rgba(17,17,17,.35)`, pointerEvents:'none', zIndex:39 }} />
            {[[0,0,1,1],[wpt,0,-1,1],[0,hpt,1,-1],[wpt,hpt,-1,-1]].map((c,i)=>(
              <React.Fragment key={i}>
                <div style={{ position:'absolute', left:c[0]+(c[2]>0?gap:-gap-mark), top:c[1]-0.5/scale, width:mark, height:1/scale, background:'#111', zIndex:41, pointerEvents:'none' }} />
                <div style={{ position:'absolute', left:c[0]-0.5/scale, top:c[1]+(c[3]>0?gap:-gap-mark), width:1/scale, height:mark, background:'#111', zIndex:41, pointerEvents:'none' }} />
              </React.Fragment>
            ))}
          </React.Fragment>}

          {/* alignment guides */}
          {guides.map((g,i)=> g.axis==='v'
            ? <div key={i} style={{ position:'absolute', left:g.pos-1/scale, top:0, width:2/scale, height:hpt, background:PC_GUIDE, pointerEvents:'none', zIndex:50 }} />
            : <div key={i} style={{ position:'absolute', top:g.pos-1/scale, left:0, height:2/scale, width:wpt, background:PC_GUIDE, pointerEvents:'none', zIndex:50 }} />
          )}

          {/* secondary multi-selection outlines */}
          {(selectedIds||[]).filter(id=>id!==selectedId).map(id=>{
            const e = elements.find(x=>x.id===id); if(!e) return null;
            return <div key={'ms-'+id} style={{ position:'absolute', left:0, top:0, width:e.w, height:e.h,
              transform:`translate(${e.x}px,${e.y}px) rotate(${e.rot||0}deg)`, transformOrigin:'center center',
              border:`${bw}px solid ${PC_GUIDE}`, opacity:.5, pointerEvents:'none', zIndex:55 }} />;
          })}

          {sel && (
            <div style={{ position:'absolute', left:0, top:0, width:sel.w, height:sel.h,
              transform:`translate(${sel.x}px,${sel.y}px) rotate(${sel.rot||0}deg)`, transformOrigin:'center center',
              pointerEvents:'none', zIndex:60 }}>
              <div style={{ position:'absolute', inset:-bw, border:`${bw}px solid ${PC_GUIDE}`, boxSizing:'border-box' }} />
              <div onPointerDown={(e)=>startRotate(e, sel)} style={{ position:'absolute', left:'50%', top:-(40/scale),
                width:hs, height:hs, marginLeft:-hs/2, borderRadius:'50%', background:'#fff', border:`${bw}px solid ${PC_GUIDE}`,
                pointerEvents:'auto', cursor:'grab' }} />
              <div style={{ position:'absolute', left:'50%', top:-(40/scale)+hs, width:bw, height:(40/scale)-hs, marginLeft:-bw/2, background:PC_GUIDE }} />
              {HANDLES.map(([hk, fx, fy, cur])=>{
                const corner = hk.length===2;
                const sz = corner ? hs : eh;
                return <div key={hk} onPointerDown={(e)=>startResize(e, sel, hk)}
                  style={{ position:'absolute', left:sel.w*fx, top:sel.h*fy, width:sz, height:sz,
                    marginLeft:-sz/2, marginTop:-sz/2, background:'#fff', border:`${bw}px solid ${PC_GUIDE}`,
                    borderRadius: corner? 0 : '50%',
                    pointerEvents:'auto', cursor:cur }} />;
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

window.PrintCanvas = PrintCanvas;
