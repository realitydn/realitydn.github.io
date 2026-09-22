/* ============================================================
   REALITY SCHEDULE STUDIO — app · small shared controls
   The shared control kit (RUI, ../studio-shared/studio-ui.jsx — the
   same copy Poster and Print use) set to Schedule's parameters, the
   capacity colours, and the one confirm that guards deleting a
   weekly series.
   ============================================================ */
import { RUI } from '../studio-shared/studio-ui.jsx';

/* prefix ss- (schedule.css + studio-base.css), fold state + hints under
   reality-schedule:*. Hints start ON here: the Schedule's notes were always on
   screen before it had the toggle, so nobody loses them by surprise. */
RUI.configure({ prefix:'ss', storeKey:'reality-schedule', hintsDefault:true });
const { Chips, Fold, Hint, HintsToggle } = RUI;
/* Schedule's fields are prose (event titles, the support note) — keep the
   browser's spellcheck on, as it always was here. */
const Field = (p)=><RUI.Field spellCheck {...p} />;

const CAP_COL = { ok:'#3d3526', tight:'#fdb515', over:'#ed2224' };

/* Deleting a weekly series takes every week with it — ask first. One-offs go
   without a prompt: undo is one keystroke away. */
function confirmDelete(ev){
  if(!ev || ev.repeat!=='weekly') return true;
  return window.confirm('Delete the whole weekly series "'+ev.title+'"? It disappears from EVERY week, not just this one.'
    + (ev.notionId ? '\n\nIt comes from the REALITY app, so it will stay hidden from future syncs until you restore it (Document → Hidden from app sync).' : '')
    + '\n\nTo drop a single week, use "Skip the week" instead. Ctrl+Z undoes either way.');
}

export { RUI, CAP_COL, confirmDelete, Field, Chips, Fold, Hint, HintsToggle };
