/* ============================================================
   REALITY SCHEDULE STUDIO — app · the top bar
   Range label, undo / redo, the NOT SAVED badge, import, export,
   cloud sign-in.
   ============================================================ */
import { RCloud } from '../studio-shared/cloud.js';
import { normalizeDoc as a_norm, rangeLabel as a_rangeLabel } from './schedule-data.jsx';

/* ---------- topbar ---------- */
function Topbar({ doc, setDoc, onImport, onExport, exporting, exportMsg, hubMsg, count, cloudUser, onCloudSignIn, onCloudSignOut,
                  canUndo, canRedo, onUndo, onRedo, saveFailed, requestPull }){
  const fileRef = React.useRef(null);
  const hasCloud = typeof window!=='undefined' && !!RCloud;
  return (
    <div className="ss-top">
      <div className="ss-brand">Reality<small>SCHEDULE STUDIO</small></div>
      <div className="ss-tgroup"><span className="gl">Range</span>
        <span className="ss-range">{a_rangeLabel(doc.range)}</span>
      </div>
      <div className="ss-tgroup"><span className="gl">Edit</span>
        <div className="ss-seg">
          <button disabled={!canUndo} onClick={onUndo} title="Undo (Ctrl/⌘+Z)">↶ Undo</button>
          <button disabled={!canRedo} onClick={onRedo} title="Redo (Ctrl/⌘+Shift+Z or Ctrl+Y)">↷ Redo</button>
        </div>
      </div>
      {/* The autosave write failed — neither IndexedDB nor the localStorage
          copy took it (see saveStoredDoc). Stays up until a write lands again. */}
      {saveFailed && <span className="ss-unsaved" role="alert"
        title="The browser refused to save this schedule — its storage (shared with Poster + Print Studio) is full. Your edits live only in this tab: Save JSON now, then free space (e.g. delete old Poster Studio templates).">
        NOT SAVED — storage full</span>}
      <div className="ss-tgroup"><span className="gl">Import</span>
        <div className="ss-seg">
          <button onClick={onImport}>Paste / CSV</button>
          <button onClick={()=>fileRef.current.click()}>Open JSON</button>
        </div>
        <input ref={fileRef} type="file" accept=".json,application/json" style={{ display:'none' }}
          onChange={e=>{ const f=e.target.files[0]; if(!f) return;
            const fr=new FileReader(); fr.onload=()=>{ try{ setDoc(a_norm(JSON.parse(String(fr.result)))); if(requestPull) requestPull(); }catch(err){ alert('Not a schedule JSON file.'); } };
            fr.readAsText(f, 'utf-8'); e.target.value=''; }} />
      </div>
      <div className="spacer" />
      <div className="ss-tgroup"><span className="gl">{exporting ? (exportMsg||'Exporting…') : 'Export'}</span>
        <div className="ss-seg">
          <button disabled={exporting} onClick={()=>onExport('channel')}>This channel</button>
          <button disabled={exporting} onClick={()=>onExport('all')} title="Every channel + dailies + archive, zipped">Everything</button>
        </div>
        {/* Says what the last export sent to the app's daily digest. Left standing
            until the next export rather than timed out — it describes that export,
            and "did the cards go?" is a question you ask minutes later. */}
        {!exporting && hubMsg && <span className="ss-mini" style={{ marginLeft:10 }}>{hubMsg}</span>}
      </div>
      {/* WP9: cloud sign-in toggle (drives doc sync + the feed pull). Hidden if
          RCloud failed to load; best-effort, no-op when the hub is dormant. */}
      {hasCloud && <div className="ss-tgroup"><span className="gl">Cloud</span>
        {cloudUser
          ? <button onClick={onCloudSignOut} className="ss-iconbtn"
              title={'Signed in as '+cloudUser+' — click to sign out (stays local-only)'}>Sign out</button>
          : <button onClick={onCloudSignIn} className="ss-iconbtn"
              title="Sign in to the REALITY hub to sync this draft and pull from the feed">Sign in</button>}
      </div>}
      <span className="ss-count">{count} EV</span>
    </div>
  );
}

export { Topbar };
