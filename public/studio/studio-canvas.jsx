/* ============================================================
   REALITY POSTER STUDIO — Canvas (grid, snap, selection, handles)
   Renders the RESOLVED element list for the active format.
   Exports: StudioCanvas
   ============================================================ */
const { FORMATS:SC_FMT, MODULE:SC_MOD, STEP:SC_STEP, PALETTE:SC_PAL,
        themeColors:scTheme, safeRect:scSafe, StudioElement:SCElement } = window;
const SC_MONT = "'Montserrat',sans-serif";

function scSnap(v, step){ return Math.round(v/step)*step; }

/* ============================================================
   IN-PLACE TEXT EDITING
   ============================================================
   Changing a headline used to mean: click the box, find Content
   in the inspector, click into the field, type. Four moves and a
   scroll for the single most common edit in the tool. Now you
   double-click the words on the poster.

   The editor is a textarea laid over the element's own box in
   canvas coordinates and styled to match its type, so it reads
   as editing the artwork rather than a dialog about it. It writes
   through the same onChange the drag handles use, which means the
   Master/override routing is whatever it already was.

   Which prop each type holds its words in — `host` keeps the name
   separate from its kicker, everything else is plain `text`. */
const SC_EDITABLE = {
  title:'text', tagline:'text', info:'text', when:'text', cost:'text', stamp:'text', host:'name',
};
function scEditFont(el){
  const grot = el.type==='tagline'||el.type==='info'||el.type==='when'||el.type==='cost'||el.type==='host';
  return {
    fontFamily: grot ? "'Space Grotesk',sans-serif" : SC_MONT,
    fontWeight: el.weight!=null ? el.weight : (grot?400:800),
    fontSize: (el.fontSize||48),
    lineHeight: el.lineHeight!=null ? el.lineHeight : (el.type==='title'?0.84:1.3),
    letterSpacing: ((el.letterSpacing!=null?el.letterSpacing:0))+'em',
    textAlign: el.align||'left',
    textTransform: (el.type==='title'||el.type==='stamp') ? 'uppercase' : 'none',
  };
}
function ScTextEditor({ el, value, onChange, onDone }){
  const ref = React.useRef(null);
  React.useEffect(()=>{
    const n = ref.current; if(!n) return;
    n.focus(); n.select();
  }, []);
  return (
    <textarea ref={ref} value={value} spellCheck={false}
      onChange={e=>onChange(e.target.value)}
      onBlur={onDone}
      onKeyDown={e=>{
        e.stopPropagation();                                  // never let a nudge/delete key reach the canvas
        if(e.key==='Escape'){ e.preventDefault(); onDone(); }
        // Enter breaks the line (titles are multi-line by design); ⌘/Ctrl-Enter
        // and Escape are how you leave.
        if(e.key==='Enter' && (e.metaKey||e.ctrlKey)){ e.preventDefault(); onDone(); }
      }}
      style={Object.assign({
        position:'absolute', left:el.x, top:el.y, width:el.w, height:el.h,
        transform: el.rot ? 'rotate('+el.rot+'deg)' : null,
        background:'rgba(237,27,114,.10)', border:'2px solid #ed1b72', outline:'none',
        color:'inherit', padding:0, margin:0, resize:'none', overflow:'hidden', zIndex:60,
        caretColor:'#ed1b72', WebkitTextFillColor:'currentColor',
      }, scEditFont(el))} />
  );
}

function StudioCanvas({ elements, format, theme, accent, showGrid, snap, scale,
                        stageRef, canvasRef, selectedId, selectedIds, onSelect, onChange, onCommit, exporting, plateOnly,
                        sliceMode, feedSlice, onSliceChange }){
  const f = SC_FMT[format];
  const t = scTheme(theme);
  const safe = scSafe(format);
  const accentHex = SC_PAL[accent];
  const [guides, setGuides] = React.useState([]);
  const [editId, setEditId] = React.useState(null);
  const dragRef = React.useRef(null);
  // Leaving the element (or the format) drops the editor rather than stranding
  // it over whatever is now in that spot.
  React.useEffect(()=>{ if(editId && editId!==selectedId) setEditId(null); }, [selectedId]);
  React.useEffect(()=>{ setEditId(null); }, [format]);

  function toCanvas(e){
    const r = canvasRef.current.getBoundingClientRect();
    return { x:(e.clientX-r.left)/scale, y:(e.clientY-r.top)/scale };
  }

  function startMove(e, el){
    e.stopPropagation();
    // Shift toggles the element in/out of the multi-selection (for aligning),
    // and does not start a drag.
    if(e.shiftKey){ onSelect(el.id, true); return; }
    /* Grabbing a box that is ALREADY part of a multi-selection drags the whole
       group — collapsing the selection on pointer-down (what this used to do)
       made a group impossible to move. Every member's start position is
       captured here so the drag applies one delta from the originals and can't
       accumulate rounding drift.
       A grab that never moves still collapses to that one box (see onUp), so
       clicking a member to single it out keeps working. */
    const ids = selectedIds || [];
    const asGroup = ids.length > 1 && ids.indexOf(el.id) >= 0;
    if(!asGroup) onSelect(el.id, false);
    const p = toCanvas(e);
    dragRef.current = { mode:'move', id:el.id, ox:p.x-el.x, oy:p.y-el.y, w:el.w, h:el.h,
      x0:el.x, y0:el.y, moved:false,
      group: asGroup ? ids.map(id=>{ const g = elements.find(x=>x.id===id);
        return g ? { id:g.id, x:g.x, y:g.y } : null; }).filter(Boolean) : null };
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
  // Feed-slice band: drag the band (move) or its top/bottom edge (resize). yFrac/hFrac
  // are fractions of the canvas height, so the slice is format-agnostic.
  function startSlice(e, mode){
    e.stopPropagation();
    const p = toCanvas(e);
    const y = (feedSlice && feedSlice.yFrac != null ? feedSlice.yFrac : 0.4) * f.h;
    const h = (feedSlice && feedSlice.hFrac != null ? feedSlice.hFrac : 0.2) * f.h;
    dragRef.current = { mode:'slice-'+mode, oy:p.y - y, y0:y, h0:h };
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
        // On a group drag every member is "self" — snapping the grabbed box to
        // its own travelling companions would fight the drag.
        const moving = d.group ? d.group.map(m=>m.id) : [d.id];
        const xL = [540, safe.x, safe.x+safe.w];
        const yL = [safe.y+safe.h/2, safe.y, safe.y+safe.h];
        elements.forEach(e=>{ if(moving.indexOf(e.id)>=0||e.hidden) return;
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
      if(Math.abs(nx-d.x0)>0.5 || Math.abs(ny-d.y0)>0.5) d.moved = true;
      if(d.group){
        /* one delta, applied to every member's ORIGINAL position — the grabbed
           box carries the snapping and the rest keep their exact offsets */
        const dx = nx - d.x0, dy = ny - d.y0;
        d.group.forEach(m=> onChange(m.id, { x:Math.round(m.x+dx), y:Math.round(m.y+dy) }));
      } else {
        onChange(d.id, { x:Math.round(nx), y:Math.round(ny) });
      }
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
    else if(d.mode==='slice-move'){
      const ny = Math.max(0, Math.min(f.h - d.h0, p.y - d.oy));
      onSliceChange && onSliceChange({ yFrac:ny/f.h, hFrac:d.h0/f.h });
    }
    else if(d.mode==='slice-top'){
      const minH = 80, bottom = d.y0 + d.h0, ny = Math.max(0, Math.min(bottom - minH, p.y));
      onSliceChange && onSliceChange({ yFrac:ny/f.h, hFrac:(bottom - ny)/f.h });
    }
    else if(d.mode==='slice-bot'){
      const minH = 80, nh = Math.max(minH, Math.min(f.h - d.y0, p.y - d.y0));
      onSliceChange && onSliceChange({ yFrac:d.y0/f.h, hFrac:nh/f.h });
    }
  }
  function onUp(){
    const d = dragRef.current;
    /* A grab inside a group that never actually moved was a CLICK — collapse to
       that one box, the way every canvas tool behaves. */
    if(d && d.mode==='move' && d.group && !d.moved) onSelect(d.id, false);
    dragRef.current = null; setGuides([]); removeListeners(); onCommit && onCommit();
  }
  function addListeners(){ window.addEventListener('pointermove', onMove); window.addEventListener('pointerup', onUp); }
  function removeListeners(){ window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); }
  React.useEffect(()=>removeListeners, []);

  const hs = 26/scale, bw = 2.5/scale;
  const sel = elements.find(el=>el.id===selectedId && !el.hidden);
  /* Every box in the live drag gets `dragging` (not just the grabbed one) so
     the whole group has its 160ms glide switched off — otherwise the others
     ease along behind the cursor and the group looks like it's coming apart. */
  const _drag = dragRef.current;
  const isDragging = (id)=> !!_drag && (_drag.group ? _drag.group.some(m=>m.id===id) : _drag.id===id);

  return (
    <div ref={stageRef} className="rs-stage"
      onPointerDown={(e)=>{ if(e.target===stageRef.current || e.target.dataset.bg) onSelect(null); }}>
      {/* data-fmt = commit sentinel: export loops poll it to know the flip landed
          before capturing (React stamps it atomically with the element layout) */}
      <div ref={canvasRef} className="rs-canvas" data-fmt={format}
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
          <div key={el.id} style={ el.hidden ? { opacity:.22, filter:'grayscale(.4)' } : null }
            onDoubleClick={e=>{ if(SC_EDITABLE[el.type]){ e.stopPropagation(); onSelect(el.id, false); setEditId(el.id); } }}>
            <SCElement el={el} theme={theme} posterAccentHex={accentHex} posterAccent={accent}
              selected={el.id===selectedId} dragging={isDragging(el.id)}
              onElPointerDown={startMove} exporting={exporting} />
          </div>
        ))}

        {/* the in-place text editor, above the artwork and below the guides */}
        {!exporting && (()=>{
          const el = editId ? elements.find(x=>x.id===editId) : null;
          const key = el && SC_EDITABLE[el.type];
          if(!el || !key) return null;
          return <ScTextEditor el={el} value={el[key]||''}
            onChange={v=>onChange(el.id, { [key]:v })} onDone={()=>setEditId(null)} />;
        })()}

        {/* Grid + safe-zone guides sit ABOVE the artwork (incl. photos) so they
            actually guide placement over imagery; never captured in exports. */}
        {/* The grid, drawn in three weights so the armature is legible rather
            than a flat mesh: faint MODULE lines, a stronger one-module MARGIN
            frame (x 90 / 990 — the Swiss line every template sits on), and the
            canvas CENTRE cross. At MODULE 90 the master tiles exactly (12×15
            on 4:5, 12×12 on 1:1) and every one of these lines is a multiple of
            STEP, so Snap can actually reach them — which it could not at 108.
            On 9:16 and A4 the last row is a genuine partial; it's drawn as it
            falls rather than faked. */}
        {showGrid && !exporting && <React.Fragment>
          <div style={{ position:'absolute', inset:0, pointerEvents:'none', zIndex:40,
            backgroundImage:`repeating-linear-gradient(to right, ${t.shadow(.24)} 0 1px, transparent 1px ${SC_MOD}px), repeating-linear-gradient(to bottom, ${t.shadow(.24)} 0 1px, transparent 1px ${SC_MOD}px)` }} />
          <div style={{ position:'absolute', left:SC_MOD, top:SC_MOD, width:f.w-SC_MOD*2, height:f.h-SC_MOD*2,
            border:`1px solid ${t.shadow(.5)}`, pointerEvents:'none', zIndex:40 }} />
          <div style={{ position:'absolute', left:f.w/2, top:0, width:1, height:f.h,
            background:t.shadow(.34), pointerEvents:'none', zIndex:40 }} />
          <div style={{ position:'absolute', top:f.h/2, left:0, height:1, width:f.w,
            background:t.shadow(.34), pointerEvents:'none', zIndex:40 }} />
        </React.Fragment>}
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

        {/* Feed-slice selector: a draggable horizontal band; the area outside dims.
            What's inside the band (photos only, no text) becomes the 'feed' export. */}
        {sliceMode && !exporting && (() => {
          const sy = (feedSlice && feedSlice.yFrac != null ? feedSlice.yFrac : 0.4) * f.h;
          const sh = (feedSlice && feedSlice.hFrac != null ? feedSlice.hFrac : 0.2) * f.h;
          const hh = 20 / scale, lw = 2.5 / scale, dim = 'rgba(13,9,5,.5)';
          return (
            <React.Fragment>
              <div style={{ position:'absolute', left:0, top:0, width:f.w, height:sy, background:dim, pointerEvents:'none', zIndex:58 }} />
              <div style={{ position:'absolute', left:0, top:sy+sh, width:f.w, height:Math.max(0, f.h-sy-sh), background:dim, pointerEvents:'none', zIndex:58 }} />
              <div onPointerDown={(e)=>startSlice(e, 'move')} style={{ position:'absolute', left:0, top:sy, width:f.w, height:sh,
                border:`${lw}px solid ${SC_PAL.pink}`, boxSizing:'border-box', cursor:'grab', pointerEvents:'auto', zIndex:59 }}>
                <div style={{ position:'absolute', left:8/scale, top:6/scale, fontFamily:SC_MONT, fontWeight:700,
                  fontSize:13/scale, letterSpacing:'.12em', color:SC_PAL.pink, pointerEvents:'none' }}>FEED SLICE</div>
              </div>
              <div onPointerDown={(e)=>startSlice(e, 'top')} title="Drag to set the slice top" style={{ position:'absolute', left:'50%', top:sy,
                width:hh*2.6, height:hh, marginLeft:-hh*1.3, marginTop:-hh/2, background:'#fff', border:`${lw}px solid ${SC_PAL.pink}`, cursor:'ns-resize', pointerEvents:'auto', zIndex:60 }} />
              <div onPointerDown={(e)=>startSlice(e, 'bot')} title="Drag to set the slice bottom" style={{ position:'absolute', left:'50%', top:sy+sh,
                width:hh*2.6, height:hh, marginLeft:-hh*1.3, marginTop:-hh/2, background:'#fff', border:`${lw}px solid ${SC_PAL.pink}`, cursor:'ns-resize', pointerEvents:'auto', zIndex:60 }} />
            </React.Fragment>
          );
        })()}
      </div>
    </div>
  );
}

window.StudioCanvas = StudioCanvas;
