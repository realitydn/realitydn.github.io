/**
 * Day ↔ accent scheme — mirrors the LOCKED Poster Studio mapping
 * (public/studio/studio-data.jsx → ACCENT_DAYS). Kept in sync by hand; both are
 * marked "LOCKED" so drift is unlikely.
 *
 * Day numbering is Mon=1 … Sun=7, matching Studio's accentDay().n and the
 * weekday token Studio writes into 4×5 export filenames ("3-wed-…-4x5.png").
 */

// 1-indexed (index 0 unused) so day numbers map directly.
const DAY_ABBR  = ['', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const DAY_NAMES = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
// Studio's ACCENT_DAYS inverted to day-number → palette accent name.
const ACCENT_BY_N = ['', 'green', 'blue', 'purple', 'pink', 'red', 'amber', 'yellow'];

function slugify(s) {
  return (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

/**
 * Pull a leading "<n>-<abbr>-" weekday token off a filename basename (written by
 * Poster Studio's 4×5 export). Returns the day number (1–7), that day's accent,
 * and the slug with the token stripped so published URLs stay clean. When no
 * token is present, returns nulls and the plain slug.
 */
function parseDayToken(base) {
  const slug = slugify(base);
  const m = slug.match(/^([1-7])-(mon|tue|wed|thu|fri|sat|sun)-(.+)$/);
  if (m) {
    const day = Number(m[1]);
    return { day, accent: ACCENT_BY_N[day] || null, slug: m[3] };
  }
  return { day: null, accent: null, slug };
}

module.exports = { DAY_ABBR, DAY_NAMES, ACCENT_BY_N, slugify, parseDayToken };
