/* ============================================================
   REALITY POSTER STUDIO — inspector · tabs
   ============================================================
   The inspector is split by job rather than being one long scroll:
     photo, logo  Image · Press · Finish · Layout  (the engine's order)
     text & lists Text · Box · Layout
     graphics     Shape · Layout
   Layout is the same tab for everything: size, border, shadow where
   it's a matter of placement, transform, and this-format visibility.

   Which tab is showing is remembered per family (every photo opens on
   the tab you last used on a photo), in this browser. FOLD_TABS says
   which tab each fold lives in, so a Ctrl-K jump to a control in a tab
   that isn't showing brings that tab forward first (RUI.setRevealHook).
   ============================================================ */
import { RUI } from '../../../studio-shared/studio-ui.jsx';

const TAB_SETS = {
  media:   [{ v:'image', l:'Image' }, { v:'press', l:'Press' }, { v:'finish', l:'Finish' }, { v:'layout', l:'Layout' }],
  text:    [{ v:'text',  l:'Text'  }, { v:'box',   l:'Box'   }, { v:'layout', l:'Layout' }],
  graphic: [{ v:'shape', l:'Shape' }, { v:'layout', l:'Layout' }],
};
/* where a family opens until you pick: a photo on Press (the treatment is the
   first decision; a new photo can be dropped or pasted straight onto the box) */
const DEFAULT_TAB = { media:'press', text:'text', graphic:'shape' };
const GRAPHIC = { block:1, shape:1, icon:1, rule:1, burst:1, inkmark:1 };
function familyOf(el, caps){ return caps && caps.media ? 'media' : GRAPHIC[el.type] ? 'graphic' : 'text'; }

const FOLD_TABS = {
  media:   { 'ph-img':'image', 'ph-frame':'image', 'ph-mix':'image', 'ph-compose':'image', 'ph-adjust':'image',
             'ph-treat':'press', 'ph-press':'press', 'ph-sep-press':'press', 'ph-blend':'press', 'ph-sep-proof':'press',
             'ph-finish':'finish', 'ph-mask':'finish',
             'ph-place':'layout', 'sh':'layout', 'f-transform':'layout', 'f-override':'layout' },
  text:    { 'f-content':'text', 'f-type':'text', 'f-sub':'text', 'f-kicker':'text', 'f-rows':'text',
             'f-surface':'box', 'sh':'box', 'f-transform':'layout', 'f-override':'layout' },
  graphic: { 'f-content':'shape', 'sh':'shape', 'f-transform':'layout', 'f-override':'layout' },
};

/* ---- the remembered tab, per family ---- */
const KEY = 'reality-studio:tabs';
let chosen = (()=>{ try{ const v=JSON.parse(localStorage.getItem(KEY)||'{}'); return v && typeof v==='object' ? v : {}; }catch(e){ return {}; } })();
const subs = new Set();
function setTab(family, tab){
  if(chosen[family]===tab) return;
  chosen = Object.assign({}, chosen, { [family]:tab });
  try{ localStorage.setItem(KEY, JSON.stringify(chosen)); }catch(e){}
  subs.forEach(fn=>fn());
}
function useTab(family){
  const [, bump] = React.useState(0);
  React.useEffect(()=>{ const fn=()=>bump(n=>n+1); subs.add(fn); return ()=>{ subs.delete(fn); }; }, []);
  const set = TAB_SETS[family];
  const t = chosen[family];
  return set.some(x=>x.v===t) ? t : DEFAULT_TAB[family];
}

/* the family on screen right now, for the palette hook */
let current = null;
function noteFamily(f){ current = f; }
RUI.setRevealHook && RUI.setRevealHook((foldId)=>{
  const t = current && FOLD_TABS[current] && FOLD_TABS[current][foldId];
  if(t) setTab(current, t);
});

function Tabs({ family, value, counts }){
  return (
    <div className="rs-tabs" role="tablist">
      {TAB_SETS[family].map(x=>(
        <button key={x.v} type="button" role="tab" aria-selected={value===x.v}
          className={'rs-tab'+(value===x.v?' on':'')} onClick={()=>setTab(family, x.v)}>
          {x.l}{counts && counts[x.v] ? <span className="n" title={counts[x.v]+' changed from the default in this tab'}>{counts[x.v]}</span> : null}
        </button>
      ))}
    </div>
  );
}

export { TAB_SETS, FOLD_TABS, familyOf, useTab, setTab, noteFamily, Tabs };
