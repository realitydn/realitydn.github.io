/* ============================================================
   REALITY SCHEDULE STUDIO — data · editing helpers
   Pure document edits the app wraps in one setDoc: delete (leaving
   a tombstone for a synced event), restore, clear a range before a
   Replace import, clone onto the next period.
   ============================================================ */
import { dAdd, rangeDates, suid, eventsOn } from './data-model.jsx';

/* ---- editing helpers (pure; the app wraps each in one setDoc) ---- */
/* Delete an event. A synced event also leaves a tombstone so the next pull
   doesn't put it straight back: a weekly series is tombstoned by SERIES (every
   week stays gone), a one-off by its occurrence id. Restorable from the
   Document panel (restoreFeedEvent). */
function deleteEventFromDoc(doc, id){
  const ev = doc.events.filter(e=>e.id===id)[0];
  if(!ev) return doc;
  const events = doc.events.filter(e=>e.id!==id);
  if(!ev.notionId) return Object.assign({}, doc, { events });
  const key = (ev.repeat==='weekly' && ev.seriesId) ? 's:'+ev.seriesId : 'e:'+ev.notionId;
  const feedDeleted = (doc.feedDeleted||[]).filter(t=>t.key!==key)
    .concat([{ key, title:ev.title, date:ev.date, weekly:ev.repeat==='weekly' }]);
  return Object.assign({}, doc, { events, feedDeleted });
}
function restoreFeedEvent(doc, key){
  return Object.assign({}, doc, { feedDeleted:(doc.feedDeleted||[]).filter(t=>t.key!==key) });
}
/* Clear what occurs in `range` before a Replace import, WITHOUT duplicating
   weekly series. A one-off dated in the range goes. A local weekly series
   anchored before the range would otherwise keep projecting into it beside the
   replacement rows — so instead of deleting the series (it still owns every
   other week) its in-range dates become skipped weeks. A synced row (weekly or
   not) that shows in the range is simply dropped: the feed re-delivers it.
   localOnly: leave synced rows alone (the feed Replace path, where the merge
   replaces them anyway). */
function clearRangeOccurrences(events, range, localOnly){
  const ds = rangeDates(range);
  const out = [];
  (events||[]).forEach(e=>{
    const feed = !!e.notionId;
    if(localOnly && feed){ out.push(e); return; }
    const hits = e.repeat==='weekly' ? ds.filter(d=>eventsOn({ events:[e] }, d).length) : (ds.indexOf(e.date)>=0 ? [e.date] : []);
    if(!hits.length){ out.push(e); return; }
    if(e.repeat==='weekly' && !feed){
      const exc = (e.exceptions||[]).slice();
      hits.forEach(d=>{ if(exc.indexOf(d)<0) exc.push(d); });
      out.push(Object.assign({}, e, { exceptions:exc.sort() }));
    }
  });
  return out;
}
/* Clone → next period. One-offs you typed in shift forward with the range;
   weekly series stay put (they already project into the new range). Synced
   ONE-OFFS do not clone: they're specific to their week, and a local copy of
   last week's workshop is a ghost the sync never removes — the new week's own
   events arrive from the feed. */
function cloneToNextPeriod(doc){
  const n = doc.range.days;
  return Object.assign({}, doc, {
    range:{ start:dAdd(doc.range.start, n), days:n },
    splits:doc.splits.map(s=>dAdd(s, n)),
    days:Object.keys(doc.days).reduce((o,k)=>{ o[dAdd(k, n)] = doc.days[k]; return o; }, {}),
    events:doc.events.filter(e=>e.repeat==='weekly').concat(
      doc.events.filter(e=>e.repeat!=='weekly' && !e.notionId)
        .map(e=>Object.assign({}, e, { id:suid(), date:dAdd(e.date, n), notionId:null, seriesId:null }))),
  });
}

export { deleteEventFromDoc, restoreFeedEvent, clearRangeOccurrences, cloneToNextPeriod };
