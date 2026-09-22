/* ============================================================
   REALITY POSTER STUDIO — top bar
   ============================================================ */
import { RCloud } from '../../studio-shared/cloud.js';
import { slugify } from '../../studio-shared/util.js';
import {
  FORMATS as AP_FMT, OUTPUT_FORMATS as AP_OUT, STANDEE_FORMATS as AP_STD, HANDOUT_FORMATS as AP_HND,
  PALETTE as AP_PAL, ACCENT_DAYS as AP_DAYS, ACCENTS_BY_DAY as AP_ABYDAY, accentDay as apAccentDay,
} from '../studio-data.jsx';
import { storyStem } from '../doc.js';
import { HintsToggle } from './controls.jsx';
/* ---------- save state ----------
   The working doc's autosave, said out loud. It used to fail in silence (see
   bootDoc); now a failed write is a red NOT SAVED you can't miss, with the
   reason on hover. 'fallback' = IndexedDB refused and the copy went to
   localStorage instead — kept, but in the small box, so it says so. */
function SaveState({ state, msg }){
  const st = state || 'saved';
  const label = st==='saving' ? 'Saving…'
    : st==='error'    ? (msg && /full|quota/i.test(msg) ? 'NOT SAVED — storage full' : 'NOT SAVED')
    : st==='fallback' ? 'Saved · backup box'
    : 'Saved';
  const tip = st==='error'
    ? 'The last change could NOT be written to this browser’s storage'+(msg?' ('+msg+')':'')+'. Save a template or export before closing this tab. Clearing old templates or site data frees room.'
    : st==='fallback'
      ? 'IndexedDB refused the write'+(msg?' ('+msg+')':'')+', so the poster was kept in localStorage instead. It is saved, but that box is small — big photos may not fit next time.'
      : st==='saving' ? 'Writing the poster to this browser…'
      : 'The poster on screen is kept in this browser (IndexedDB) and comes back on reload.';
  return <span className={'rs-savestate '+st} title={tip} role="status" aria-live="polite">{label}</span>;
}

/* ---------- topbar ---------- */
function Topbar({ doc, setDoc, overrideCount, resetFormat, onExport, exporting, exportMsg, cloudUser, cloudMsg, onCloudSignIn, onCloudSignOut, onExportToEvent,
                  onSaveTpl, canUndo, canRedo, onUndo, onRedo, zoomPct, onZoomStep, onZoomFit, saveState, saveMsg }){
  const isOutput = doc.activeFormat!=='master';
  const hasCloud = typeof window!=='undefined' && !!RCloud;
  /* Poster name is held locally while typing and committed on blur/Enter/Save —
     committing per keystroke would re-render the riso canvases on every key. */
  const [name, setName] = React.useState(doc.title||'');
  React.useEffect(()=>{ setName(doc.title||''); }, [doc.title]);
  const commit = ()=> setDoc(d=> d.title===name ? d : ({...d, title:name}));
  const slug = slugify(name) || 'reality-poster';
  const kind = doc.exportFormat||'png';
  const printDef = (AP_FMT[doc.activeFormat]||{}).print;   // A1 / standee print-res descriptor
  const printOn = ['a4','a1'].concat(AP_STD).concat(AP_HND).indexOf(doc.activeFormat)>=0;
  const scope = isOutput ? AP_FMT[doc.activeFormat].label+' only' : 'All formats';
  const outName = isOutput
    ? `${storyStem(doc.activeFormat, slug, doc.accent)}.${kind}`
    : (kind==='pdf' ? `${slugify(name)? slug+'-poster' : 'reality-posters'}.pdf`
                    : `${slugify(name)? slug+'-poster' : 'reality-posters'}.zip`);
  return (
    <div className="rs-top">
      <div className="rs-brand">Reality<small>POSTER STUDIO</small></div>
      {/* TWO ROWS. This was one row that had long since run out of room: at
          1440px its contents were ~1930px wide, and the sticky export block
          painted OVER zoom, Grid, Snap, Hints and Sign in — they looked like
          buttons and couldn't be clicked unless you found the hidden sideways
          scroll. Now the top row is what you're MAKING (formats, then the
          save/export block you finish on) and the second is how you're
          VIEWING it (palette, day, history, zoom, guides, save state, cloud).
          Both rows wrap rather than overlap if a window is narrower still. */}
      <div className="rs-toprow">
        <div className="rs-tgroup"><span className="gl">View</span>
          <div className="rs-seg">
            <button className={'master'+(doc.activeFormat==='master'?' on':'')} onClick={()=>setDoc(d=>({...d, activeFormat:'master'}))}>
              Master<small>SOURCE</small>
            </button>
          </div>
          <div className="rs-seg">
            {AP_OUT.filter(fmt=>fmt!=='a4').map(fmt=>(
              <button key={fmt} className={doc.activeFormat===fmt?'on':''} onClick={()=>setDoc(d=>({...d, activeFormat:fmt}))}>
                {AP_FMT[fmt].label}<small>{AP_FMT[fmt].sub}</small>
              </button>
            ))}
          </div>
          {/* Print options — A4 / A1 XL / standees / handouts collapsed into one menu
              to save menubar space. A4 stays in the Save-All bundle; the rest are
              on-demand print views captured at true print resolution. */}
          {/* The label used to read "Print options…" even while you were LOOKING at
              an A1 — the selected size was only discoverable by opening the menu.
              Now the closed state names what's active. */}
          <select className={'rs-stsel'+(printOn?' on':'')}
            aria-label="Print options"
            value={printOn ? doc.activeFormat : ''}
            onChange={e=>{ if(e.target.value) setDoc(d=>({...d, activeFormat:e.target.value})); }}
            title="Print outputs — A4, A1 XL, roll-up standees, and handout flyers. A4 rides the Save-All bundle; the rest are on-demand at true print resolution (PDF as a real-world mm page a shop runs 1:1).">
            <option value="">{printOn ? 'Print · '+AP_FMT[doc.activeFormat].label : 'Print options…'}</option>
            <option value="a4">{AP_FMT['a4'].label} · {AP_FMT['a4'].sub}</option>
            <option value="a1">{AP_FMT['a1'].label} · {AP_FMT['a1'].sub}</option>
            <optgroup label="Standees">{AP_STD.map(fmt=>(<option key={fmt} value={fmt}>{AP_FMT[fmt].label} cm</option>))}</optgroup>
            <optgroup label="Handouts">{AP_HND.map(fmt=>(<option key={fmt} value={fmt}>{AP_FMT[fmt].label}</option>))}</optgroup>
          </select>
          {isOutput && <button className="rs-iconbtn" disabled={!overrideCount} onClick={resetFormat}
            title="Clear all overrides for this format">↺ {overrideCount||0}</button>}
        </div>
        <div className="spacer" />
        {/* Keeping the poster and exporting it are the two things you finish on, so
            they share the right-hand end of the top row — Save template used to
            live only at the foot of the template list, a scroll away down the
            library. (No longer sticky: nothing scrolls under it now.) */}
        <div className="rs-export">
          <div className="rs-tgroup">
            <button className="rs-iconbtn" onClick={onSaveTpl} disabled={!doc.elements.length}
              title="Keep this poster in My templates — filed under the weekday its accent codes for (also the ＋ at the foot of the template list)">
              ⤓ Save template</button>
          </div>
          <div className="rs-tgroup"><span className="gl">{exporting? (exportMsg||'Exporting…') : 'Export'}</span>
            <input className="rs-tname" placeholder="Poster name…" value={name} spellCheck={false}
              onChange={e=>setName(e.target.value)} onBlur={commit}
              onKeyDown={e=>{ if(e.key==='Enter'){ commit(); e.currentTarget.blur(); } }}
              title='Names the exported files — "Board Game Night" → board-game-night-4x5.png' />
            <select className="rs-tsel" value={kind} disabled={exporting} aria-label="Image format"
              onChange={e=>{ const v=e.target.value; setDoc(d=>({...d, exportFormat:v})); }}>
              <option value="png">PNG</option>
              <option value="jpg">JPG</option>
              <option value="pdf">PDF</option>
            </select>
            <button className="rs-savebtn" disabled={exporting} onClick={()=>{ commit(); onExport(name); }}
              title={(printDef
                ? `Print-resolution ${AP_FMT[doc.activeFormat].label} — ${Math.round(printDef.wmm/25.4*printDef.dpi)}px wide (${printDef.dpi} dpi)`+(kind==='pdf'?`, a true ${printDef.wmm}×${printDef.hmm}mm PDF a shop runs 1:1`:'')
                : isOutput
                  ? 'Export the format you’re viewing'
                  : 'Master view — export all five formats'+(kind==='pdf'?' as one PDF':' as a ZIP'))+' → '+outName}>
              Save Images<small>{scope}</small>
            </button>
          </div>
        </div>
      </div>
      <div className="rs-toprow rs-toprow2">
        <div className="rs-tgroup">
          <div className="rs-seg">
            {[{v:'day',l:'Day'},{v:'night',l:'Night'}].map(o=>(
              <button key={o.v} className={doc.theme===o.v?'on':''} onClick={()=>setDoc(d=>({...d, theme:o.v}))}>{o.l}</button>
            ))}
          </div>
        </div>
        <div className="rs-tgroup"><span className="gl">Accent</span>
          <div className="rs-swatches">
            {AP_ABYDAY.map(a=>{ const di=apAccentDay(a); return (
              <div key={a} className={'rs-sw'+(doc.accent===a?' on':'')} style={{ background:AP_PAL[a], width:22, height:22 }}
                onClick={()=>setDoc(d=>({...d, accent:a}))}
                title={(di? di.n+' · '+di.abbr+' — ' : '') + a + (AP_DAYS[a] ? ' (' + AP_DAYS[a] + '’s colour on the weekly schedule)' : '')} />
            ); })}
          </div>
        </div>
        <div className="rs-tgroup">
          <div className="rs-seg">
            <button disabled={!canUndo} onClick={onUndo} title="Undo (Ctrl-Z)">↶</button>
            <button disabled={!canRedo} onClick={onRedo} title="Redo (Ctrl-⇧-Z)">↷</button>
          </div>
        </div>
        <div className="rs-tgroup">
          <div className="rs-seg">
            <button onClick={()=>onZoomStep(-1)} title="Zoom out">−</button>
            <button onClick={onZoomFit} title="Fit the poster to the pane and re-centre it (Space-drag or middle-drag pans · Ctrl/⌘-wheel zooms at the pointer)">{zoomPct}</button>
            <button onClick={()=>onZoomStep(1)} title="Zoom in">＋</button>
          </div>
        </div>
        <button className={'rs-iconbtn'+(doc.showGrid?' on':'')} onClick={()=>setDoc(d=>({...d,showGrid:!d.showGrid}))}>Grid</button>
        <button className={'rs-iconbtn'+(doc.snap?' on':'')} onClick={()=>setDoc(d=>({...d,snap:!d.snap}))}>Snap</button>
        <HintsToggle />
        <div className="spacer" />
        <SaveState state={saveState} msg={saveMsg} />
        {/* WP9: cloud sync + poster write-back. Hidden entirely if RCloud failed to
            load; otherwise a sign-in toggle + an "Export to event…" affordance.
            Sign-in/out and the picker are fully best-effort (no-op when dormant). */}
        {hasCloud && <div className="rs-tgroup">
          {/* The group label names the ACCOUNT once signed in. Templates are stored
              per account, so signing in with the other Google account looks exactly
              like an empty library — this is where you notice. */}
          <span className="gl" title={cloudUser ? 'Signed in as '+cloudUser : undefined}>
            {cloudMsg || (cloudUser ? String(cloudUser).split('@')[0] : 'Cloud')}</span>
          {cloudUser
            ? <React.Fragment>
                <button className="rs-iconbtn on" disabled={exporting} onClick={onExportToEvent}
                  title="Send this poster's 4:5 / 9:16 / 1:1 to an event's poster slots">→ Event</button>
                <button className="rs-iconbtn" onClick={onCloudSignOut}
                  title={'Signed in as '+cloudUser+' — click to sign out (stays local-only)'}>Sign out</button>
              </React.Fragment>
            : <button className="rs-iconbtn" onClick={onCloudSignIn}
                title="Sign in to the REALITY hub to sync drafts/templates and export to events">Sign in</button>}
        </div>}
      </div>
    </div>
  );
}

export { SaveState, Topbar };
