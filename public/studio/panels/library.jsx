/* ============================================================
   REALITY POSTER STUDIO — library · templates, parts, graphics
   The left column below the queue (state: hooks/useLibrary.js).
   ============================================================ */
import {
  CATALOG as AP_CAT, PALETTE as AP_PAL, ACCENT_DAYS as AP_DAYS, ACCENTS_BY_DAY as AP_ABYDAY, DAY_ABBR as AP_DABBR,
  DAY_NAMES as AP_DNAMES, GRAPHICS as AP_GFX,
} from '../studio-data.jsx';
import { TEMPLATES as AP_TPL, TEMPLATE_GROUPS as AP_TPLG } from '../templates.jsx';
import { Hint } from './controls.jsx';
import { GfxGrid, IconPicker } from './gfx-grid.jsx';
import { Sec, TplThumb, TplCard, UserTplCard } from './library-cards.jsx';
function Library({ lib, startSpawn }){
  const [tplOpen, setTplOpen] = React.useState(false);
  const { userTpls, tplReady, tplStoreErr, tplBin, restoreFromBin, restoring, restoreFromCloud, tplThumbs, captureTplThumb,
          saveUserTpl, applyUserTpl, setTplArchived, delUserTpl, tplFileRef, exportUserTpls, importUserTpls, applyTemplate } = lib;
  return (
    <React.Fragment>
          {AP_TPL && AP_TPL.length>0 && <React.Fragment>
            <div className="rs-sech" onClick={()=>setTplOpen(o=>!o)}
              style={{ cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span>Templates</span><span style={{ fontSize:11, opacity:.6 }}>{tplOpen?'▾':'▸'}</span>
            </div>
            {tplOpen && <React.Fragment>
              {/* A count of everything saved, and of the two places a template
                  goes when it ISN'T under the weekday you expect: the Archive
                  drawer (one click of ⤓ on a card puts it there) and Other (the
                  poster's accent isn't a day colour). Without this, a template
                  that had merely moved read as a template that was gone. */}
              {(()=>{
                const arch = userTpls.filter(t=>t.archived).length;
                const other = userTpls.filter(t=>!t.archived && !AP_DAYS[t.doc && t.doc.accent]).length;
                return (
                  <div className="rs-mini" style={{ margin:'6px 0 2px', opacity:.7 }}>
                    My templates · filed by day (accent colour)
                    {tplReady && <React.Fragment> · {userTpls.length} saved
                      {arch>0 && <span title="Archived — open the Archive drawer below to restore them">, {arch} archived</span>}
                      {other>0 && <span title="No day colour — these are under Other">, {other} in Other</span>}
                    </React.Fragment>}
                  </div>
                );
              })()}
              {tplStoreErr &&
                <div className="rs-mini" style={{ margin:'4px 0 8px', padding:'7px 9px', borderRadius:7,
                  border:'1px solid #5a2326', background:'#2a1416', color:'#ffb3b8', opacity:1 }}>
                  <b>This browser couldn’t open the template store</b> ({tplStoreErr}). What’s listed below is
                  the older localStorage backup, not your full library — anything saved since the move to
                  IndexedDB is missing from it. Don’t delete or import over these; reload the page first, and
                  if it says this again, tell Donald before saving anything else.
                </div>}
              {!tplReady &&
                <div className="rs-mini" style={{ margin:'2px 0 6px' }}>Loading your templates…</div>}
              {tplReady && userTpls.length===0 &&
                <div className="rs-mini" style={{ margin:'2px 0 6px' }}>None yet — build a poster, then keep it here for next time.</div>}
              {/* A saved preset is filed under the weekday its accent codes for
                  (green→Mon … yellow→Sun), plus drawers for the ones with no day
                  colour and the ones tucked away. All three are the same Sec the
                  rest of the library uses now, and the card is a real render of
                  the poster rather than a line of text about it. */}
              {tplReady && userTpls.length>0 && AP_DNAMES.map((day,di)=>{
                const dayAccent = AP_ABYDAY[di];
                const items = userTpls.filter(t=> !t.archived && AP_DAYS[t.doc && t.doc.accent] === day);
                return (
                  <Sec key={day} id={'my:'+day} title={AP_DABBR[di]} sub={day} count={items.length}
                    dot={AP_PAL[dayAccent]} open={items.length>0}>
                    {items.length>0
                      ? <div className="rs-tplgrid">
                          {items.map(t=>(
                            <UserTplCard key={t.id} t={t} onApply={()=>applyUserTpl(t)}
                              thumb={tplThumbs[t.id]} onCapture={th=>captureTplThumb(t.id, th)}
                              onArchive={()=>setTplArchived(t.id, true)} onDelete={()=>delUserTpl(t.id)} />
                          ))}
                        </div>
                      : <div className="rs-mini" style={{ margin:'3px 0 8px 12px', opacity:.45 }}>Set a poster’s accent to {dayAccent} to file it here.</div>}
                  </Sec>
                );
              })}
              {tplReady && (()=>{
                const items = userTpls.filter(t=> !t.archived && !AP_DAYS[t.doc && t.doc.accent]);
                if(!items.length) return null;
                return (
                  <Sec id="my:other" title="Other" sub="no day colour" count={items.length} open>
                    <div className="rs-tplgrid">
                      {items.map(t=>(
                        <UserTplCard key={t.id} t={t} onApply={()=>applyUserTpl(t)}
                          thumb={tplThumbs[t.id]} onCapture={th=>captureTplThumb(t.id, th)}
                          onArchive={()=>setTplArchived(t.id, true)} onDelete={()=>delUserTpl(t.id)} />
                      ))}
                    </div>
                  </Sec>
                );
              })()}
              {tplReady && (()=>{
                const arch = userTpls.filter(t=>t.archived);
                return (
                  <Sec id="my:archive" title="Archive" sub="tucked away" count={arch.length}>
                    {arch.length
                      ? <div className="rs-tplgrid">
                          {arch.map(t=>(
                            <UserTplCard key={t.id} t={t} archived onApply={()=>applyUserTpl(t)}
                              thumb={tplThumbs[t.id]} onCapture={th=>captureTplThumb(t.id, th)}
                              onArchive={()=>setTplArchived(t.id, false)} onDelete={()=>delUserTpl(t.id)} />
                          ))}
                        </div>
                      : <div className="rs-mini" style={{ margin:'3px 0 8px 12px', opacity:.45 }}>Nothing archived — the ⤓ on any template tucks it away here.</div>}
                  </Sec>
                );
              })()}
              {/* Recently deleted — every route out of the library now leaves a
                  copy here first, so Delete, "replace it?" and a bad import are
                  all undoable. Capped at the last 10; oldest out. */}
              {tplReady && tplBin.length>0 &&
                <Sec id="my:bin" title="Recently deleted" sub="restorable" count={tplBin.length}>
                  <div className="rs-tplgrid">
                    {tplBin.map(e=>(
                      <div key={e.id} className="rs-tplcard" title={e.tpl.name+' — '+e.reason}
                        onClick={()=>restoreFromBin(e)} style={{ opacity:.8 }}>
                        <TplThumb doc={e.tpl.doc} w={88} />
                        <span className="tn">{e.tpl.name}</span>
                        <span className="ts">{e.reason} · {new Date(e.at).toLocaleDateString(undefined,{ day:'numeric', month:'short' })}</span>
                        <button className="rs-tplx" style={{ top:4, width:20, height:20, fontSize:11, borderColor:'#3a2f1f', color:'#b6ab97' }}
                          title={'Put “'+e.tpl.name+'” back in My templates'}
                          onClick={ev=>{ ev.stopPropagation(); restoreFromBin(e); }}>↩</button>
                      </div>
                    ))}
                  </div>
                  <div className="rs-mini" style={{ margin:'0 0 8px 12px', opacity:.45 }}>Click one to put it back. Only the last 10 are kept.</div>
                </Sec>}

              <button className="rs-addrow" onClick={saveUserTpl} style={{ marginBottom:6, marginTop:8 }}>＋ Save current poster as template</button>
              <div className="rs-rowflex" style={{ marginBottom:6 }}>
                <button className="rs-addrow" onClick={exportUserTpls} title="Download every saved template (photos included) as one .json — read straight from storage, not from what's on screen">⬇ Export all</button>
                <button className="rs-addrow" onClick={()=>tplFileRef.current.click()} title="Merge templates in from an exported .json — same name updates, new names add, nothing else is touched">⬆ Import…</button>
              </div>
              <button className="rs-addrow" onClick={restoreFromCloud} disabled={restoring}
                style={{ marginBottom:6 }}
                title="Ask your REALITY hub account for every template this browser hasn't got, and say what it found">
                {restoring ? '↻ Checking the hub…' : '↻ Restore from cloud'}</button>
              <input ref={tplFileRef} type="file" accept=".json,application/json" style={{ display:'none' }}
                onChange={e=>{ const f=e.target.files[0]; if(f) importUserTpls(f); e.target.value=''; }} />
              <Hint tight>Saved in this browser (IndexedDB — room for plenty now). Export a .json to back them up or carry them to another computer, photos and all.</Hint>
              <div className="rs-libtitle" style={{ marginTop:14 }}>Starters<span className="hint">click to load</span></div>
              {AP_TPLG.map(grp=>{
                const items = AP_TPL.filter(tp=>tp.group===grp);
                return (
                  <Sec key={grp} id={'t:'+grp} title={grp} count={items.length}>
                    <div className="rs-tplgrid">
                      {items.map(tp=><TplCard key={tp.id} tpl={tp} onApply={()=>applyTemplate(tp)} />)}
                    </div>
                  </Sec>
                );
              })}
              <Hint>Loading a starter replaces the poster.</Hint>
            </React.Fragment>}
          </React.Fragment>}
          <div className="rs-libtitle">Parts<span className="hint">drag in, or click</span></div>
          {AP_CAT.map(g=>(
            <Sec key={g.group} id={'c:'+g.group} title={g.group} count={g.items.length}>
              {g.items.map(it=>(
                <div key={it.label} className="rs-libitem" onPointerDown={e=>startSpawn(e, it)}>
                  <span className="ln">{it.label}</span>
                  <span className="lh">{it.hint}</span>
                </div>
              ))}
            </Sec>
          ))}

          {/* GRAPHICS — four families that differ only by one prop, so they're
              grids of silhouettes rather than 60 more library rows. Drag a tile
              out exactly like a part; it lands with that kind preset. */}
          <div className="rs-libtitle">Graphics<span className="hint">drag in, or click</span></div>
          {AP_GFX.map(g=>(
            <Sec key={g.id} id={'g:'+g.id} title={g.title} count={g.items?g.items.length:null}>
              {g.groups
                ? <IconPicker value={null} onSpawn={startSpawn} />
                : <GfxGrid type={g.type} prop={g.prop} items={g.items} onSpawn={startSpawn} />}
              <Hint>{g.hint}</Hint>
            </Sec>
          ))}

          <Hint>Drag a part onto the poster — it snaps to the grid and joins the Master layout. A click drops it in the middle of the canvas.</Hint>
    </React.Fragment>
  );
}

export { Library };
