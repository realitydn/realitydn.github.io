/* ============================================================
   REALITY PRINT STUDIO — Canvas (white artboard, snap, guides)
   Works in points. Shows the trim edge, a dashed safe margin,
   and (optionally) the bleed outline + crop-mark preview.
   Exports: PrintCanvas
   ============================================================ */
const { PALETTE: PC_PAL, INK: PC_INK, PrintElement: PCElement } = window;
const PC_STEP = 6;                     // snap grid (pt)
const PC_GUIDE = '#ed1b72';            // brand pink alignment line

function pcSnap(v, step){ return Math.round(v/step)*step; }

function PrintCanvas({ elements, wpt, hpt, accent, marginPt, bleedPt, showGrid, showBleed, snap, scale,
                       stageRef, canvasRef, selectedId, selectedIds, onSelect, onChange, onCommit }){
  const accentHex = PC_PAL[accent] || PC_PAL.pink;
  const [guides, setGuides] = React.useState([]);
  const dragRef = React.useRef(null);

  function toCanvas(e){
    const r = canvasRef.current.getBoundingClientRect();
    return { x:(e.clientX-r.left)/scale, y:(e.clientY-r.top)/scale };
  }
  function startMove(e, el){
    e.stopPropagation();
    if(e.shiftKey){ onSelect(el.id, true); return; }
    onSelect(el.id, false);
    const p = toCanvas(e);
    dragRef.current = { mode:'move', id:el.id, ox:p.x-el.x, oy:p.y-el.y, w:el.w, h:el.h };
    addListeners();
  }
  function startRotate(e, el){ e.stopPropagation(); dragRef.current = { mode:'rotate', id:el.id, cx:el.x+el.w/2, cy:el.y+el.h/2 }; addListeners(); }
  function startResize(e, el){ e.stopPropagation(); dragRef.current = { mode:'resize', id:el.id, x:el.x, y:el.y }; addListeners(); }

  function onMove(e){
    const d = dragRef.current; if(!d) return;
    const p = toCanvas(e);
    if(d.mode==='move'){
      let nx = p.x - d.ox, ny = p.y - d.oy;
      const g = [];
      if(snap){
        const TH = 7;
        const xL = [wpt/2, marginPt, wpt-marginPt];
        const yL = [hpt/2, marginPt, hpt-marginPt];
        elements.forEach(e=>{ if(e.id===d.id) return; xL.push(e.x, e.x+e.w/2, e.x+e.w); yL.push(e.y, e.y+e.h/2, e.y+e.h); });
        const myX=[nx, nx+d.w/2, nx+d.w]; let bX=null, bXd=TH;
        myX.forEach((m,i)=>xL.forEach(L=>{ const dd=Math.abs(m-L); if(dd<bXd){ bXd=dd; bX={L,e:i}; } }));
        if(bX){ nx += bX.L - myX[bX.e]; g.push({axis:'v', pos:bX.L}); } else nx = pcSnap(nx, PC_STEP);
        const myY=[ny, ny+d.h/2, ny+d.h]; let bY=null, bYd=TH;
        myY.forEach((m,i)=>yL.forEach(L=>{ const dd=Math.abs(m-L); if(dd<bYd){ bYd=dd; bY={L,e:i}; } }));
        if(bY){ ny += bY.L - myY[bY.e]; g.push({axis:'h', pos:bY.L}); } else ny = pcSnap(ny, PC_STEP);
      }
      setGuides(g);
      onChange(d.id, { x:Math.round(nx), y:Math.round(ny) });
    } else if(d.mode==='rotate'){
      let ang = Math.atan2(p.y-d.cy, p.x-d.cx)*180/Math.PI + 90;
      while(ang>180) ang-=360; while(ang<-180) ang+=360;
      [0,15,-15,30,-30,45,-45,90,-90].forEach(s=>{ if(Math.abs(ang-s)<5) ang=s; });
      onChange(d.id, { rot:Math.round(ang) });
    } else if(d.mode==='resize'){
      let nw = Math.max(16, p.x - d.x), nh = Math.max(10, p.y - d.y);
      if(snap){ nw = pcSnap(nw, PC_STEP); nh = pcSnap(nh, PC_STEP); }
      onChange(d.id, { w:Math.round(nw), h:Math.round(nh) });
    }
  }
  function onUp(){ dragRef.current = null; setGuides([]); removeListeners(); onCommit && onCommit(); }
  function addListeners(){ window.addEventListener('pointermove', onMove); window.addEventListener('pointerup', onUp); }
  function removeListeners(){ window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); }
  React.useEffect(()=>removeListeners, []);

  const hs = 22/scale, bw = 2/scale;
  const sel = elements.find(el=>el.id===selectedId);
  const mark = 18, gap = 6;             // crop-mark length / gap (pt)

  return (
    <div ref={stageRef} className="ps-stage"
      onPointerDown={(e)=>{ if(e.target===stageRef.current || e.target.dataset.bg) onSelect(null); }}>
      <div ref={canvasRef} className="ps-canvas"
        style={{ width:wpt, height:hpt, transform:`translate(-50%,-50%) scale(${scale})`,
          left:'50%', top:'50%', position:'absolute', background:'#ffffff',
          boxShadow:`0 24px 70px rgba(0,0,0,.45)` }}>

        <div data-bg="1" style={{ position:'absolute', inset:0, background:'#ffffff' }} />

        {elements.map(el=>(
          <PCElement key={el.id} el={el} docAccentHex={accentHex} docAccent={accent}
            selected={el.id===selectedId} dragging={dragRef.current && dragRef.current.id===el.id}
            onElPointerDown={startMove} />
        ))}

        {/* optional light grid */}
        {showGrid && <div style={{ position:'absolute', inset:0, pointerEvents:'none', zIndex:38,
          backgroundImage:`repeating-linear-gradient(to right, rgba(17,17,17,.07) 0 1px, transparent 1px ${PC_STEP*4}px), repeating-linear-gradient(to bottom, rgba(17,17,17,.07) 0 1px, transparent 1px ${PC_STEP*4}px)` }} />}

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
            <div onPointerDown={(e)=>startResize(e, sel)} style={{ position:'absolute', left:sel.w, top:sel.h,
              width:hs, height:hs, marginLeft:-hs/2, marginTop:-hs/2, background:'#fff', border:`${bw}px solid ${PC_GUIDE}`,
              pointerEvents:'auto', cursor:'nwse-resize' }} />
          </div>
        )}
      </div>
    </div>
  );
}

window.PrintCanvas = PrintCanvas;
