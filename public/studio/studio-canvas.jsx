/* ============================================================
   REALITY POSTER STUDIO — Canvas (grid, snap, selection, handles)
   Renders the RESOLVED element list for the active format.
   Exports: StudioCanvas
   ============================================================ */
const { FORMATS:SC_FMT, MODULE:SC_MOD, STEP:SC_STEP, PALETTE:SC_PAL,
        themeColors:scTheme, safeRect:scSafe, StudioElement:SCElement } = window;
const SC_MONT = "'Montserrat',sans-serif";

function scSnap(v, step){ return Math.round(v/step)*step; }

function StudioCanvas({ elements, format, theme, accent, showGrid, snap, scale,
                        stageRef, canvasRef, selectedId, selectedIds, onSelect, onChange, onCommit, exporting, plateOnly }){
  const f = SC_FMT[format];
  const t = scTheme(theme);
  const safe = scSafe(format);
  const accentHex = SC_PAL[accent];
  const [guides, setGuides] = React.useState([]);
  const dragRef = React.useRef(null);

  function toCanvas(e){
    const r = canvasRef.current.getBoundingClientRect();
    return { x:(e.clientX-r.left)/scale, y:(e.clientY-r.top)/scale };
  }

  function startMove(e, el){
    e.stopPropagation();
    // Shift toggles the element in/out of the multi-selection (for aligning),
    // and does not start a drag.
    if(e.shiftKey){ onSelect(el.id, true); return; }
    onSelect(el.id, false);
    const p = toCanvas(e);
    dragRef.current = { mode:'move', id:el.id, ox:p.x-el.x, oy:p.y-el.y, w:el.w, h:el.h };
    addListeners();
  }
  function startRotate(e, el){
    e.stopPropagation();
    dragRef.current = { mode:'rotate', id:el.id, cx:el.x+el.w/2, cy:el.y+el.h/2 };
    addListeners();
  }
  function startResize(e, el){
    e.stopPropagation();
    dragRef.current = { mode:'resize', id:el.id, x:el.x, y:el.y };
    addListeners();
  }

  function onMove(e){
    const d = dragRef.current; if(!d) return;
    const p = toCanvas(e);
    if(d.mode==='move'){
      let nx = p.x - d.ox, ny = p.y - d.oy;
      const g = [];
      if(snap){
        const TH = 14;   // snap threshold in design units
        // Candidate alignment lines: the spine, the safe edges, and every
        // OTHER element's left/centre/right (x) and top/middle/bottom (y).
        // Snapping the moving box's nearest edge to these is what makes the
        // Swiss vertical-line alignment effortless.
        const xL = [540, safe.x, safe.x+safe.w];
        const yL = [safe.y+safe.h/2, safe.y, safe.y+safe.h];
        elements.forEach(e=>{ if(e.id===d.id||e.hidden) return;
          xL.push(e.x, e.x+e.w/2, e.x+e.w); yL.push(e.y, e.y+e.h/2, e.y+e.h); });
        const myX=[nx, nx+d.w/2, nx+d.w]; let bX=null, bXd=TH;
        myX.forEach((m,i)=>xL.forEach(L=>{ const dd=Math.abs(m-L); if(dd<bXd){ bXd=dd; bX={L,e:i}; } }));
        if(bX){ nx += bX.L - myX[bX.e]; g.push({axis:'v', pos:bX.L}); }
        else nx = scSnap(nx, SC_STEP);
        const myY=[ny, ny+d.h/2, ny+d.h]; let bY=null, bYd=TH;
        myY.forEach((m,i)=>yL.forEach(L=>{ const dd=Math.abs(m-L); if(dd<bYd){ bYd=dd; bY={L,e:i}; } }));
        if(bY){ ny += bY.L - myY[bY.e]; g.push({axis:'h', pos:bY.L}); }
        else ny = scSnap(ny, SC_STEP);
      }
      setGuides(g);
      onChange(d.id, { x:Math.round(nx), y:Math.round(ny) });
    }
    else if(d.mode==='rotate'){
      let ang = Math.atan2(p.y-d.cy, p.x-d.cx)*180/Math.PI + 90;
      while(ang>180) ang-=360; while(ang<-180) ang+=360;
      [0,15,-15,30,-30,45,-45,90,-90].forEach(s=>{ if(Math.abs(ang-s)<5) ang=s; });
      onChange(d.id, { rot:Math.round(ang) });
    }
    else if(d.mode==='resize'){
      let nw = Math.max(120, p.x - d.x), nh = Math.max(70, p.y - d.y);
      if(snap){ nw = scSnap(nw, SC_STEP); nh = scSnap(nh, SC_STEP); }
      onChange(d.id, { w:Math.round(nw), h:Math.round(nh) });
    }
  }
  function onUp(){ dragRef.current = null; setGuides([]); removeListeners(); onCommit && onCommit(); }
  function addListeners(){ window.addEventListener('pointermove', onMove); window.addEventListener('pointerup', onUp); }
  function removeListeners(){ window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); }
  React.useEffect(()=>removeListeners, []);

  const hs = 26/scale, bw = 2.5/scale;
  const sel = elements.find(el=>el.id===selectedId && !el.hidden);

  return (
    <div ref={stageRef} className="rs-stage"
      onPointerDown={(e)=>{ if(e.target===stageRef.current || e.target.dataset.bg) onSelect(null); }}>
      <div ref={canvasRef} className="rs-canvas"
        style={{ width:f.w, height:f.h, transform:`translate(-50%,-50%) scale(${scale})`,
          left:'50%', top:'50%', position:'absolute',
          background:t.bg, boxShadow:`0 30px 80px rgba(0,0,0,.45)` }}>

        <div data-bg="1" style={{ position:'absolute', inset:0, overflow:'hidden',
          background: exporting ? t.bg : (theme==='night'
            ? 'radial-gradient(130% 90% at 50% 10%, rgba(120,90,160,.32), transparent 55%), radial-gradient(120% 100% at 50% 108%, rgba(0,0,0,.55), transparent 55%), repeating-linear-gradient(54deg, rgba(0,0,0,.24) 0 26px, rgba(0,0,0,.42) 26px 52px)'
            : 'radial-gradient(130% 90% at 50% 12%, rgba(255,255,255,.16), transparent 58%), radial-gradient(120% 100% at 50% 108%, rgba(13,9,5,.30), transparent 55%), repeating-linear-gradient(54deg, rgba(13,9,5,.05) 0 26px, rgba(13,9,5,.11) 26px 52px)'),
          backgroundColor: exporting ? t.bg : (theme==='night'?'#221a26':'#9c9488') }}>
          {!exporting && <div data-bg="1" style={{ position:'absolute', left:'50%', bottom:26, transform:'translateX(-50%)',
            fontFamily:SC_MONT, fontWeight:700, letterSpacing:'.26em', fontSize:13, color:'rgba(255,255,255,.4)', pointerEvents:'none' }}>▲ DROP YOUR PHOTO — FULL BLEED</div>}
        </div>

        {/* plateOnly = image-only / text-less export: keep ONLY photo elements
            (drop all text + design elements) for the clean 'feed' hero image. */}
        {(plateOnly ? elements.filter(el=>el.type==='photo') : elements).map(el=>(
          /* hidden-in-this-format: ghosted while editing as an aid, but fully
             dropped from exports (don't bake a 22% element into the image) */
          (exporting && el.hidden) ? null :
          <div key={el.id} style={ el.hidden ? { opacity:.22, filter:'grayscale(.4)' } : null }>
            <SCElement el={el} theme={theme} posterAccentHex={accentHex} posterAccent={accent}
              selected={el.id===selectedId} dragging={dragRef.current && dragRef.current.id===el.id}
              onElPointerDown={startMove} exporting={exporting} />
          </div>
        ))}

        {/* Grid + safe-zone guides sit ABOVE the artwork (incl. photos) so they
            actually guide placement over imagery; never captured in exports. */}
        {showGrid && !exporting && <div style={{ position:'absolute', inset:0, pointerEvents:'none', zIndex:40,
          backgroundImage:`repeating-linear-gradient(to right, ${t.shadow(.28)} 0 1px, transparent 1px ${SC_MOD}px), repeating-linear-gradient(to bottom, ${t.shadow(.28)} 0 1px, transparent 1px ${SC_MOD}px)` }} />}
        {/* Safe-zone guide — deliberately NOT the accent (it has to read over a
            full-bleed photo or an accent fill): a dashed cream stroke sandwiched
            by a 1px ink outline so it stays legible on light, dark, or busy art. */}
        {!exporting && <div style={{ position:'absolute', left:safe.x, top:safe.y, width:safe.w, height:safe.h,
          border:'2px dashed rgba(255,251,241,.95)', boxShadow:'0 0 0 1px rgba(13,9,5,.55), inset 0 0 0 1px rgba(13,9,5,.55)',
          pointerEvents:'none', zIndex:40 }} />}

        {guides.map((g,i)=> g.axis==='v'
          ? <div key={i} style={{ position:'absolute', left:g.pos-1/scale, top:0, width:2/scale, height:f.h, background:SC_PAL.pink, pointerEvents:'none', zIndex:50 }} />
          : <div key={i} style={{ position:'absolute', top:g.pos-1/scale, left:0, height:2/scale, width:f.w, background:SC_PAL.pink, pointerEvents:'none', zIndex:50 }} />
        )}

        {/* secondary multi-selection — thin outlines, no handles (handles live
            on the primary/last-clicked box below) */}
        {!exporting && (selectedIds||[]).filter(id=>id!==selectedId).map(id=>{
          const e = elements.find(x=>x.id===id && !x.hidden); if(!e) return null;
          return <div key={'ms-'+id} style={{ position:'absolute', left:0, top:0, width:e.w, height:e.h,
            transform:`translate(${e.x}px,${e.y}px) rotate(${e.rot||0}deg)`, transformOrigin:'center center',
            border:`${bw}px solid ${SC_PAL.pink}`, opacity:.5, pointerEvents:'none', zIndex:55 }} />;
        })}

        {sel && !exporting && (
          <div style={{ position:'absolute', left:0, top:0, width:sel.w, height:sel.h,
            transform:`translate(${sel.x}px,${sel.y}px) rotate(${sel.rot||0}deg)`, transformOrigin:'center center',
            pointerEvents:'none', zIndex:60 }}>
            <div style={{ position:'absolute', inset:-bw, border:`${bw}px solid ${SC_PAL.pink}`, boxSizing:'border-box' }} />
            <div onPointerDown={(e)=>startRotate(e, sel)} style={{ position:'absolute', left:'50%', top:-(46/scale),
              width:hs, height:hs, marginLeft:-hs/2, borderRadius:'50%', background:'#fff', border:`${bw}px solid ${SC_PAL.pink}`,
              pointerEvents:'auto', cursor:'grab', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <div style={{ width:hs*0.42, height:hs*0.42, borderRadius:'50%', borderWidth:`${1.5/scale}px`, borderStyle:'solid', borderColor:`${SC_PAL.pink} ${SC_PAL.pink} transparent ${SC_PAL.pink}` }} />
            </div>
            <div style={{ position:'absolute', left:'50%', top:-(46/scale)+hs, width:bw, height:(46/scale)-hs, marginLeft:-bw/2, background:SC_PAL.pink }} />
            <div onPointerDown={(e)=>startResize(e, sel)} style={{ position:'absolute', left:sel.w, top:sel.h,
              width:hs, height:hs, marginLeft:-hs/2, marginTop:-hs/2, background:'#fff', border:`${bw}px solid ${SC_PAL.pink}`,
              pointerEvents:'auto', cursor:'nwse-resize' }} />
          </div>
        )}
      </div>
    </div>
  );
}

window.StudioCanvas = StudioCanvas;
