// event-audit.js — the figures on the deck's "Events we've held" card and in
// its opened section.
//
// WHERE THEY COME FROM: public/event-report/stats.json, the data behind this
// site's own Event Audit pages (/event-report/). scripts/event-report/
// regenerates that file every week from the calendar and pushes it to main,
// and every push to main rebuilds the site. Nothing here is copied by hand.
//
// WHEN THEY ARE READ: at build time, never in the browser. The
// `reality-event-stats` plugin in vite.config.js reads the file while the
// site is built and hands it over as `virtual:event-stats`. So the
// prerendered HTML and the running page carry the same figures and the count
// never jumps; a new week's figures arrive with that week's build. The card
// still prints the date the count was taken ("as of"), from the file's asOf.
//
// WHEN THE FILE IS NOT THERE (the report's build is not on main yet), cannot
// be read, or is older than the fallback: the bundled snapshot in
// ./event-stats.js is shown instead. That file also holds the mapping from
// stats.json's fields to the names used here, and the checks a file has to
// pass. `npm run build` prints which of the two it used.
//
// The count by day of the week is not on the home page (24.11.26). The audit
// page keeps the days: "The week, as a grid" there places every event by day
// and time of day.
import FILE from 'virtual:event-stats';
import { auditFrom, chooseStats, dmy } from './event-stats';

export const AUDIT = auditFrom(chooseStats(FILE));

export { dmy };
