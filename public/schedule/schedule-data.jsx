/* ============================================================
   REALITY SCHEDULE STUDIO — data layer (the public face)
   Model, date utils, registries, parsers (quick-add / paste /
   CSV), serializers, persistence, brand atoms (wordmark, QR).
   Spec: SCHEDULE-STUDIO-SPEC.md

   This file only gathers the data modules into the one import the
   render engine and the app read from; each lives in its own file:
     data-model.jsx  registries, dates, the document, selectors —
                     eventsOn, the single weekly projection
     data-parse.jsx  quick-add, pasted week, CSV v1 parse + emit
     data-feed.jsx   feed → rows (WP9) and the App→Schedule merge
     data-edit.jsx   pure edits: delete/tombstone, restore, clear, clone
     data-store.jsx  IndexedDB + the localStorage coexistence copy
     data-brand.jsx  the ink mark and the QR (target, labels, glyph)
   ============================================================ */

/* Brand atoms — the neutrals, the three faces and the Year 2 weekday coding
   (MON green · TUE blue · WED purple · THU pink · FRI red · SAT orange (amber)
   · SUN yellow; purple is the one block that takes cream text) — come from
   ../studio-shared/brand.js, which DERIVES the day tables from
   public/tokens/day-colours.json (canon 18.08.26) at build time. A canvas
   renderer can't read CSS custom properties, so the hexes are inlined into
   the bundle rather than read at run time; the verifier checks that one
   source. Keyed by ISO weekday (1=Mon .. 7=Sun). */
export {
  INK_HEX as INK, CREAM_HEX as CREAM, WHITE_HEX as WHITE, MONT, ALT, GROT,
  DAY_COLORS, DAY_TEXT, DAY_ABBR_ISO as DAY_ABBR, DAY_FULL,
  PALETTE, INK_MARK, INK_MARK_CELLS, INK_MARK_DAY_ACCENT, inkMarkCells, inkMarkLayout, inkMarkHex,
} from '../studio-shared/brand.js';
export { WordmarkSVG as Wordmark } from '../studio-shared/wordmark.jsx';
export { qrPatternOf, QUIET_SPEC, QUIET_TIGHT } from '../studio-shared/qr.js';

export {
  LOCATIONS, FLAGS,
  dToDate, dToISO, dAdd, dWeekday, dShort, dShortYr, rangeDates, rangeLabel, nextMonday, thisMonday, todayIso,
  suid, blankEvent, newDoc, starterDoc, normalizeDoc,
  timeKey, eventsOn, dayInfo, timeLabel, usedLegend, partDates,
} from './data-model.jsx';
export { parseQuickLine, parsePasteBlock, parseCSV, serializeCSV } from './data-parse.jsx';
export {
  buildDocFromFeed, mergeFeedIntoDoc, applyFeedToDoc, feedWindow, feedPrefKey, ictHHMM, ictDate,
} from './data-feed.jsx';
export { deleteEventFromDoc, restoreFeedEvent, clearRangeOccurrences, cloneToNextPeriod } from './data-edit.jsx';
export { loadStoredDoc, saveStoredDoc, storeDoc, pickNewerDoc, writeBothDocs } from './data-store.jsx';
export {
  SchQR, QR_TARGET, QR_HOST, QR_LABEL, QR_LABEL_SHORT, QR_CTA, SchInkMark,
} from './data-brand.jsx';
