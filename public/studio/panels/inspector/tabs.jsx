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
   The machinery is shared with Print: studio-shared/inspector-tabs.jsx.
   ============================================================ */
import { makeTabs } from '../../../studio-shared/inspector-tabs.jsx';

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
             'ph-treat':'press', 'ph-press':'press', 'ph-sep-press':'press', 'ph-lines':'press', 'ph-blend':'press', 'ph-sep-proof':'press',
             'ph-finish':'finish', 'ph-mask':'finish',
             'ph-place':'layout', 'sh':'layout', 'f-transform':'layout', 'f-override':'layout' },
  text:    { 'f-content':'text', 'f-type':'text', 'f-sub':'text', 'f-kicker':'text', 'f-rows':'text',
             'f-surface':'box', 'f-fx':'box', 'sh':'box', 'f-transform':'layout', 'f-override':'layout' },
  graphic: { 'f-content':'shape', 'sh':'shape', 'f-transform':'layout', 'f-override':'layout' },
};

const { useTab, setTab, noteFamily, Tabs } = makeTabs({ prefix:'rs', key:'reality-studio:tabs', sets:TAB_SETS, defaults:DEFAULT_TAB, foldTabs:FOLD_TABS });

export { TAB_SETS, FOLD_TABS, familyOf, useTab, setTab, noteFamily, Tabs };
