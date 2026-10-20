/* ============================================================
   REALITY STUDIOS — the inspector's header row + tabs
   ============================================================
   Shared by Poster and Print (21.10.26 — Print took Poster's
   organisation). Two pieces:

   HeadIcon — the header row's buttons, drawn rather than typed:
   ⤓/⤒ and ⧉ fall back to whatever symbol font the machine has, at
   whatever weight it has them. Square caps and mitres, like the rest
   of the chrome. The one-step pair stay the filled ▼ ▲.

   makeTabs — the inspector split by job rather than one long scroll.
   Each Studio passes its own tab sets per element family, the tab
   each family opens on, which tab every Fold lives in, and where to
   remember the choice. Which tab is showing is remembered per family
   (every photo opens on the tab you last used on a photo), in this
   browser; FOLD_TABS lets a Ctrl-K jump to a control in a hidden tab
   bring that tab forward first (RUI.setRevealHook).
   The CSS is studio-base.css (.rs-tabs / .ps-tabs, .rs-hbtn / .ps-hbtn).
   ============================================================ */
import { RUI } from './studio-ui.jsx';

const HEAD_ICONS = {
  back:  <path d="M7 1.5v7.5M3.8 5.8L7 9l3.2-3.2M2 12.5h10" />,
  down:  <path d="M2.5 4.5h9L7 10z" fill="currentColor" stroke="none" />,
  up:    <path d="M2.5 9.5h9L7 4z" fill="currentColor" stroke="none" />,
  front: <path d="M2 1.5h10M7 12.5V5M3.8 8.2L7 5l3.2 3.2" />,
  dup:   <path d="M2 9.5V2h7.5M4.5 4.5h7.5V12H4.5z" />,
  del:   <path d="M1.5 3.5h11M5.2 3.5V1.8h3.6v1.7M3 3.5l.8 9h6.4l.8-9M5.8 6v4.5M8.2 6v4.5" />,
};
function HeadIcon({ k }){
  return <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter" aria-hidden="true">{HEAD_ICONS[k]}</svg>;
}

/* { prefix:'rs', key:'reality-studio:tabs', sets:{family:[{v,l}]},
     defaults:{family:tab}, foldTabs:{family:{foldId:tab}} } */
function makeTabs({ prefix, key, sets, defaults, foldTabs }){
  let chosen = (()=>{ try{ const v=JSON.parse(localStorage.getItem(key)||'{}'); return v && typeof v==='object' ? v : {}; }catch(e){ return {}; } })();
  const subs = new Set();
  function setTab(family, tab){
    if(chosen[family]===tab) return;
    chosen = Object.assign({}, chosen, { [family]:tab });
    try{ localStorage.setItem(key, JSON.stringify(chosen)); }catch(e){}
    subs.forEach(fn=>fn());
  }
  function useTab(family){
    const [, bump] = React.useState(0);
    React.useEffect(()=>{ const fn=()=>bump(n=>n+1); subs.add(fn); return ()=>{ subs.delete(fn); }; }, []);
    const set = sets[family] || [];
    const t = chosen[family];
    return set.some(x=>x.v===t) ? t : defaults[family];
  }
  /* the family on screen right now, for the palette hook */
  let current = null;
  function noteFamily(f){ current = f; }
  RUI.setRevealHook && RUI.setRevealHook((foldId)=>{
    const t = current && foldTabs[current] && foldTabs[current][foldId];
    if(t) setTab(current, t);
  });
  function Tabs({ family, value, counts }){
    return (
      <div className={prefix+'-tabs'} role="tablist">
        {(sets[family]||[]).map(x=>(
          <button key={x.v} type="button" role="tab" aria-selected={value===x.v}
            className={prefix+'-tab'+(value===x.v?' on':'')} onClick={()=>setTab(family, x.v)}>
            {x.l}{counts && counts[x.v] ? <span className="n" title={counts[x.v]+' changed from the default in this tab'}>{counts[x.v]}</span> : null}
          </button>
        ))}
      </div>
    );
  }
  return { useTab, setTab, noteFamily, Tabs };
}

export { HEAD_ICONS, HeadIcon, makeTabs };
