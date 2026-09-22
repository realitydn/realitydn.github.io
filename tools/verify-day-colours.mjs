#!/usr/bin/env node
// Verifies the studios against the canonical weekday-coding data file,
// public/tokens/day-colours.json, plus the ink-mark pass (canon rev 22.08.26
// — design-system-year2/design_handoff_web_app_ink_pass/tokens/ink-strip.json).
// Canvas/PDF renderers can't read CSS custom properties, so their weekday and
// ink-mark literals are ENFORCED against canon here instead:
//
//   node tools/verify-day-colours.mjs        # exits 1 on any drift
//
// Checks: the shared brand module (public/studio-shared/brand.js) — it must
// derive the day hexes from day-colours.json, and its evaluated tables
// (PALETTE, Schedule DAY_COLORS/DAY_TEXT, Poster ACCENT_DAYS, the INK_MARK
// cells + fixed cell order, contrastInk's answers) must match canon — and no
// Studio source may define its own copy again · the event-report denylist of retired off-palette hexes · site strings · the
// TYPE section: the canon tracking ladder on both studios' text presets
// (print bakes the +.01em offset) and the ticket/footer wordmark staying the
// baked vector, never a font-family re-typeset.
//
// Run it whenever the studios' data files or day-colours.json change (it's
// cheap — wire it wherever the precompile step runs). If canon ever changes
// a hue, update day-colours.json first, then the literals, then re-run.

import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const canon = JSON.parse(readFileSync(join(root, "public/tokens/day-colours.json"), "utf8"));

const DAY_ORDER = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const DAY_FULL = {
  mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday",
  fri: "Friday", sat: "Saturday", sun: "Sunday",
};
// token name ("--green") → accent key used by the studios ("green")
const accentOf = (day) => canon.days[day].token.replace(/^--/, "");

let failures = 0;
const fail = (msg) => { failures++; console.error("DRIFT: " + msg); };
// Sources only: since Phase 1 the studios ship one esbuild bundle built from
// these .jsx files, so the per-file compiled .js twins this used to cross-check
// no longer exist.
const read = (rel) => readFileSync(join(root, rel), "utf8");

// ── 1–4 · The brand module: ONE source, derived from canon (Phase 2) ──
// The palette, the weekday coding (Poster ACCENT_DAYS, Schedule DAY_COLORS /
// DAY_TEXT, the ink mark's day map), contrast and the INK_MARK block used to
// be typed three times — in studio-data.jsx, print-data.jsx and
// schedule-data.jsx — and this file parsed each copy's literals. They now
// live once, in public/studio-shared/brand.js, which DERIVES the hexes from
// day-colours.json at build time (esbuild inlines the JSON). So:
//   a) brand.js must import the token file (a hand-typed hex table there
//      would be the old drift, one level up);
//   b) brand.js is EVALUATED (bundled in memory by the same esbuild the
//      Studios build with) and every table it hands the Studios is checked
//      against canon — so a derivation bug fails here, not just a typo;
//   c) no Studio source may define its own copy of any of those names again.
const BRAND = "public/studio-shared/brand.js";
{
  const src = read(BRAND);
  if (!/import\s+\w+\s+from\s+['"]\.\.\/tokens\/day-colours\.json['"]/.test(src))
    fail(`${BRAND}: no longer imports ../tokens/day-colours.json — the day hexes must be derived from canon, not typed`);
}
let brand = null;
try {
  const { default: esbuild } = await import("esbuild");
  const out = esbuild.buildSync({
    entryPoints: [join(root, BRAND)], bundle: true, format: "esm", platform: "neutral",
    write: false, logLevel: "silent",
  });
  brand = await import("data:text/javascript;base64," + Buffer.from(out.outputFiles[0].text).toString("base64"));
} catch (e) {
  fail(`${BRAND}: could not be bundled + evaluated (${String((e && e.message) || e).split("\n")[0]})`);
}
// Artwork neutrals per ink-strip.json cells: ink #0d0905, stock #fffbf1.
// Print neutrals follow the print substrate (canon.print).
const INK_ARTWORK = { ink: "#0d0905", stock: "#fffbf1" };
// mode → { bands, field (six strip cells), sq (square quadrant-4 field) },
// verbatim from ink-strip.json §modes + src/components/InkMark.jsx.
const INK_ORDER = {
  full:    { bands: "red,blue,yellow", field: "stock,ink,green,pink,purple,amber", sq: "stock,pink,purple,amber" },
  majors:  { bands: "red,blue,yellow", field: "stock,ink,stock,ink,ink,stock",     sq: "stock,ink,stock,ink" },
  daycode: { bands: "day,ink,day",     field: "stock,day,ink,day,day,stock",       sq: "stock,day,day,ink" },
  ink:     { bands: "ink,stock,ink",   field: "ink,stock,stock,ink,ink,stock",     sq: "stock,ink,ink,ink" },
};
const INK_ANCHORED = "stock,pink,green,ink";
if (brand) {
  const B = BRAND;
  const lc = (v) => String(v || "").toLowerCase();
  DAY_ORDER.forEach((day, i) => {
    const iso = i + 1, accent = accentOf(day), want = canon.days[day].hex.toLowerCase();
    const on = canon.days[day].on.toLowerCase();
    // the palette (Poster, Print, Schedule's mark) — accent name → hex
    if (lc(brand.PALETTE[accent]) !== want) fail(`${B}: PALETTE.${accent} is ${brand.PALETTE[accent]}, canon (${DAY_FULL[day]}) says ${want}`);
    // Schedule's ISO-keyed tables
    if (lc(brand.DAY_COLORS[iso]) !== want) fail(`${B}: DAY_COLORS[${iso}] (${DAY_FULL[day]}) is ${brand.DAY_COLORS[iso]}, canon says ${want}`);
    if (lc(brand.DAY_TEXT[iso]) !== on) fail(`${B}: DAY_TEXT[${iso}] (${DAY_FULL[day]}) is ${brand.DAY_TEXT[iso]}, canon says ${on}`);
    if (brand.DAY_FULL[iso] !== DAY_FULL[day]) fail(`${B}: DAY_FULL[${iso}] is ${brand.DAY_FULL[iso]}, should be ${DAY_FULL[day]}`);
    // Poster's accent ↔ weekday pairing
    if (brand.ACCENT_DAYS[accent] !== DAY_FULL[day]) fail(`${B}: ACCENT_DAYS lacks ${accent}:'${DAY_FULL[day]}' (canon pairing)`);
    if (brand.ACCENTS_BY_DAY[i] !== accent) fail(`${B}: ACCENTS_BY_DAY[${i}] is ${brand.ACCENTS_BY_DAY[i]}, canon (${DAY_FULL[day]}) says ${accent}`);
    // the ink mark's daycode map
    if (brand.INK_MARK_DAY_ACCENT[day] !== accent) fail(`${B}: INK_MARK_DAY_ACCENT lacks ${day}:'${accent}' (canon pairing)`);
  });
  // contrastInk must land on canon's `on` for every day accent, on both pairs
  // (artwork: ink/cream; print: the same answer on #111111/white).
  for (const day of DAY_ORDER) {
    const hex = canon.days[day].hex, on = canon.days[day].on.toLowerCase();
    const art = lc(brand.contrastInk(hex));
    if (art !== on) fail(`${B}: contrastInk(${hex}) is ${art} on the artwork pair, canon 'on' says ${on}`);
    const pr = lc(brand.contrastInk(hex, brand.NEUTRALS.print));
    const prWant = on === INK_ARTWORK.stock ? canon.print.stock.toLowerCase() : canon.print.ink.toLowerCase();
    if (pr !== prWant) fail(`${B}: contrastInk(${hex}, print) is ${pr}, canon says ${prWant}`);
  }
  // the neutrals: artwork literals + canon.print
  if (lc(brand.PALETTE.ink) !== INK_ARTWORK.ink || lc(brand.PALETTE.cream) !== INK_ARTWORK.stock)
    fail(`${B}: PALETTE neutrals drifted (ink ${brand.PALETTE.ink}, cream ${brand.PALETTE.cream})`);
  if (lc(brand.NEUTRALS.print.ink) !== canon.print.ink.toLowerCase() || lc(brand.NEUTRALS.print.light) !== canon.print.stock.toLowerCase())
    fail(`${B}: NEUTRALS.print is ${brand.NEUTRALS.print.ink}/${brand.NEUTRALS.print.light}, canon.print says ${canon.print.ink}/${canon.print.stock}`);
  // INK_MARK cells — the seven accents at canon hue, the right neutrals per substrate
  for (const [name, cells, neutrals] of [
    ["INK_MARK_CELLS", brand.INK_MARK_CELLS, INK_ARTWORK],
    ["INK_MARK_CELLS_PRINT", brand.INK_MARK_CELLS_PRINT, { ink: canon.print.ink, stock: canon.print.stock }],
  ]) {
    if (!cells) { fail(`${B}: ${name} is gone`); continue; }
    for (const day of DAY_ORDER) {
      const accent = accentOf(day), want = canon.days[day].hex.toLowerCase();
      if (lc(cells[accent]) !== want) fail(`${B}: ${name}.${accent} is ${cells[accent]}, canon (${DAY_FULL[day]}) says ${want}`);
    }
    for (const n of ["ink", "stock"])
      if (lc(cells[n]) !== neutrals[n].toLowerCase()) fail(`${B}: ${name}.${n} is ${cells[n]}, canon says ${neutrals[n]}`);
  }
  // fixed cell order — every mode's bands/field/sq, plus the anchored field
  const IM = brand.INK_MARK || {};
  for (const [mode, want] of Object.entries(INK_ORDER)) {
    const m = IM.modes && IM.modes[mode];
    if (!m) { fail(`${B}: INK_MARK mode '${mode}' not found`); continue; }
    for (const k of ["bands", "field", "sq"])
      if ((m[k] || []).join(",") !== want[k]) fail(`${B}: INK_MARK ${mode}.${k} order is [${(m[k] || []).join(",")}], canon says [${want[k]}]`);
  }
  if ((IM.anchoredField || []).join(",") !== INK_ANCHORED)
    fail(`${B}: INK_MARK anchoredField is [${(IM.anchoredField || []).join(",")}], canon says [${INK_ANCHORED}]`);
  if (brand.SITE !== canon.site) fail(`${B}: SITE is ${brand.SITE}, canon says ${canon.site}`);
  if (!(brand.WORDMARK_PATHS || []).length || !/^M73\.4,63\.7/.test(brand.WORDMARK_PATHS[0]))
    fail(`${B}: the wordmark's baked letter paths are missing`);
}
// c) No second copy. Every Studio imports these from the shared modules; a
//    local definition is a fork waiting to drift, so it fails the build
//    outright. (Phase 2: brand.js first, then each module as it lands.)
{
  const OWNED = {
    "public/studio-shared/brand.js": ["PALETTE", "ACCENTS", "ACCENT_DAYS", "ACCENT_BY_DAY", "ACCENTS_BY_DAY",
      "DAY_COLORS", "DAY_TEXT", "DAY_FULL", "INK_CHOICES", "INK_MARK", "INK_MARK_CELLS", "INK_MARK_DAY_KEYS",
      "INK_MARK_DAY_ACCENT", "inkMarkCells", "inkMarkLayout", "inkMarkHex", "relLuminance", "contrastRatio",
      "contrastInk", "accentDay", "WORDMARK_PATH", "WORDMARK_PATHS", "WM_PATHS", "PARTNER", "partnerOf",
      "inkTitle", "MONT", "ALT", "GROT"],
    "public/studio-shared/wordmark.jsx": ["WordmarkSVG", "Wordmark"],
    "public/studio-shared/shapes.js": ["SHAPE_KINDS", "shapePath", "shapeClip", "roundedRectPath", "starPath",
      "burstRays", "ruleLayout", "RULE_PATTERNS", "iconLayout", "_poly", "_regPoly", "_starPts", "_star",
      "_scalePath", "_scaleSvgPath"],
    "public/studio-shared/qr.js": ["buildQR", "qrGeometry", "qrTarget", "qrMatrix", "QRGlyph", "nfc",
      "QUIET_SPEC", "QUIET_TIGHT", "qrPatternOf", "QR_DATA_FRAC", "_QR", "_QR_ROWS"],
  };
  const owner = {};
  for (const [mod, names] of Object.entries(OWNED)) for (const n of names) owner[n] = mod;
  const re = new RegExp(`^\\s*(?:export\\s+)?(?:const|let|var|function)\\s+(${Object.keys(owner).join("|")})\\b`, "gm");
  const studioSources = [];
  for (const dir of ["public/studio", "public/print", "public/schedule"])
    for (const f of readdirSync(join(root, dir)))
      if (/\.(jsx|js|mjs)$/.test(f) && !/\.bundle\.js$/.test(f)) studioSources.push(`${dir}/${f}`);
  for (const rel of studioSources) {
    for (const m of read(rel).matchAll(re))
      fail(`${rel}: defines its own ${m[1]} — it lives in ${owner[m[1]]}; import it`);
  }
  // …and the wordmark component draws brand.js's paths, never its own.
  if (!/WORDMARK_PATHS/.test(read("public/studio-shared/wordmark.jsx")))
    fail("public/studio-shared/wordmark.jsx: no longer draws brand.js WORDMARK_PATHS");
}

// ── 5 · Event report: retired off-palette hexes must be gone (22.08.26) ──
// The six pre-canon hexes swept from public/event-report/index.html —
// near-miss brand values and the non-brand indigo/teal/yellow-green.
const RETIRED_HEXES = ["#17a7df", "#ed1b71", "#ed2123", "#3f3785", "#00b7a5", "#91c745"];
{
  const rel = "public/event-report/index.html";
  const src = read(rel).toLowerCase();
  for (const hex of RETIRED_HEXES) {
    if (src.includes(hex))
      fail(`${rel}: carries retired hex ${hex} — replace with its locked-palette hue`);
  }
}

// ── 6 · Site string on artwork = bare host (canon D5) ──
const SITE_FILES = [
  "public/print/print-data.jsx",
  "public/print/print-export.jsx",
  "public/schedule/schedule-render.jsx",
  "public/studio/studio-data.jsx",
  "public/event-report/index.html",
];
for (const rel of SITE_FILES) {
  if (read(rel).includes("www." + canon.site))
    fail(`${rel}: carries www.${canon.site} — artwork site string is the bare host (${canon.site})`);
}

// ── 7 · TYPE: the canon tracking ladder + the ticket's wordmark source ──
// Ladder (reality-tokens.css/.json — baked per role, no size-derived
// formula): display .015 · h1 .025 · h2 .04 · name 0 · label .16 ·
// button .11. One ladder, two offsets: print +.01em, signage +.02em.
// Poster Studio artwork carries the bare ladder (screen/social); Print
// Studio's data BAKES the print offset. Role map — poster: title=display,
// subtitle=h1, stamp=h2, host+list rows=name, when/cost=label; print:
// headline/numeral/bignum=display, kicker=label, body=Grotesk at 0.
// `fact` is not a rung of the Montserrat ladder — it is Space Grotesk, whose
// tracking is 0 by definition (the ladder was derived from Montserrat's wide
// geometric caps and means nothing on Grotesk's lowercase). It sits in the
// same table only so checkRole can guard it with one code path.
const LADDER = { display: 0.015, h1: 0.025, h2: 0.04, name: 0, label: 0.16, button: 0.11, fact: 0 };
const PRINT_OFF = 0.01;
const near = (a, b) => Math.abs(a - b) < 1e-9;
// First `prop: <number>` after the `key: {` that opens the preset. esbuild
// may reprint numbers in exponent form (0.005 → 5e-3) — parseFloat the raw.
const presetNum = (src, rel, key, prop) => {
  const m = src.match(new RegExp(`\\b${key}:\\s*\\{[\\s\\S]*?\\b${prop}:\\s*(-?[0-9.]+(?:e-?[0-9]+)?)`));
  if (!m) { fail(`${rel}: ${key}.${prop} not found`); return null; }
  return parseFloat(m[1]);
};
const checkRole = (src, rel, key, prop, role, off = 0) => {
  const got = presetNum(src, rel, key, prop);
  if (got == null) return;
  const want = LADDER[role] + off;
  if (!near(got, want))
    fail(`${rel}: ${key}.${prop} is ${got} — the ${role} role tracks ${want}em${off ? " (ladder + print offset)" : ""}`);
};
// Poster Studio data — the bare screen ladder.
for (const rel of ["public/studio/studio-data.jsx"]) {
  const src = read(rel);
  checkRole(src, rel, "title", "letterSpacing", "display");
  checkRole(src, rel, "title", "subTracking", "h1");
  checkRole(src, rel, "stamp", "letterSpacing", "h2");
  checkRole(src, rel, "host", "letterSpacing", "name");
  // when + cost moved off the label role (23.08.26). They are FACT chips, and
  // canon M1 "family wins" puts every fact in Space Grotesk in every medium —
  // so they carry Grotesk's natural tracking, not Montserrat's optical ladder.
  // Guard the new value the same way, and guard the FAMILY too: a silent slip
  // back to Montserrat caps is exactly the drift this file exists to catch.
  checkRole(src, rel, "when", "letterSpacing", "fact");
  checkRole(src, rel, "cost", "letterSpacing", "fact");
  for (const key of ["lineup", "sessions", "specials", "agenda"])
    checkRole(src, rel, key, "rowTracking", "name");
}
// ── The tracking ladder inside the RENDERERS (23.08.26) ──
// The ladder used to be checked only on the six DEFAULTS presets, so every
// label and heading hardcoded inside a renderer drifted freely — fourteen
// distinct numbers across studio-element (.2 on the host kicker, .24 on the
// matchup kicker, .18 on two list headings, .14, .12, .1, .08, .06, .03 …).
// They now resolve through a TRACK constant. Guard it two ways: the constant
// must carry the canon rungs, and no off-ladder letterSpacing literal may
// reappear. A value that genuinely needs to sit off the ladder belongs in
// TRACK with a name and a reason, not inline.
for (const rel of ["public/studio/studio-element.jsx"]) {
  const src = read(rel);
  const m = src.match(/const TRACK\s*=\s*\{([^}]*)\}/);
  if (!m) { fail(`${rel}: the TRACK ladder constant is gone`); continue; }
  for (const [role, want] of Object.entries(LADDER)) {
    const got = m[1].match(new RegExp(`\\b${role}\\s*:\\s*(-?[0-9.]+(?:e-?[0-9]+)?)`));
    if (!got) { fail(`${rel}: TRACK is missing the ${role} rung`); continue; }
    if (!near(parseFloat(got[1]), want))
      fail(`${rel}: TRACK.${role} is ${got[1]}, canon says ${want}`);
  }
  const stray = [...new Set(src.match(/letterSpacing:\s*'\.?[0-9][0-9.]*em'/g) || [])];
  if (stray.length)
    fail(`${rel}: off-ladder tracking literal(s) ${stray.join(" ")} — route through TRACK`);
}

// ── Print Studio's ladder, in BOTH renderers (24.08.26) ──
// Same drift as the poster renderers had, and one extra hazard: the screen
// renderer is a PROOF of the vector PDF, so a rung that differs between
// print-element and print-export is a proof that lies. Guard three things —
// the rungs carry the screen ladder plus print's +.01em (canon M6), the two
// files agree exactly, and no off-ladder literal creeps back into the screen
// one. `sign` is print-only: wayfinding type is read across a room.
{
  const PRINT_LADDER = { display: 0.025, h1: 0.035, h2: 0.05, name: 0.01, label: 0.17, button: 0.12, sign: 0.10, fact: 0 };
  const readTrack = (rel) => {
    const m = read(rel).match(/const TRACK\s*=\s*\{([^}]*)\}/);
    if (!m) { fail(`${rel}: the TRACK ladder constant is gone`); return null; }
    const out = {};
    for (const g of m[1].matchAll(/(\w+)\s*:\s*(-?[0-9.]+(?:e-?[0-9]+)?)/g)) out[g[1]] = parseFloat(g[2]);
    return out;
  };
  const seen = {};
  for (const rel of ["public/print/print-element.jsx",
                     "public/print/print-export.jsx"]) {
    const t = readTrack(rel);
    if (!t) continue;
    seen[rel] = t;
    for (const [role, want] of Object.entries(PRINT_LADDER)) {
      if (t[role] == null) { fail(`${rel}: TRACK is missing the ${role} rung`); continue; }
      if (!near(t[role], want))
        fail(`${rel}: TRACK.${role} is ${t[role]}, print canon says ${want} (screen ${want - (role === "fact" || role === "name" ? 0.01 : 0.01)} + the print offset)`);
    }
  }
  const a = seen["public/print/print-element.jsx"], b = seen["public/print/print-export.jsx"];
  if (a && b && JSON.stringify(a) !== JSON.stringify(b))
    fail("print-element.jsx and print-export.jsx carry DIFFERENT TRACK ladders — the screen would stop being a proof of the PDF");
  for (const rel of ["public/print/print-element.jsx"]) {
    const stray = [...new Set(read(rel).match(/letterSpacing:\s*'\.?[0-9][0-9.]*em'/g) || [])];
    if (stray.length)
      fail(`${rel}: off-ladder tracking literal(s) ${stray.join(" ")} — route through TRACK`);
  }
}

// Fact renderers — the family half of M1. Montserrat NAMES, Grotesk STATES
// facts: the when/cost chips and every list's time/price/date cell go through
// the FACT() helper in studio-element, which is the one place the rule lives.
for (const rel of ["public/studio/studio-element.jsx"]) {
  const src = read(rel);
  if (!/const FACT\s*=/.test(src))
    fail(`${rel}: the FACT() type helper is gone — facts are Grotesk in every medium (M1)`);
  const i = src.search(/el\.type\s*===?\s*['"]when['"]/);
  const j = src.search(/el\.type\s*===?\s*['"]host['"]/);
  const chip = i >= 0 && j > i ? src.slice(i, j) : null;
  if (!chip) { fail(`${rel}: when/cost chip renderer not found`); continue; }
  if (/fontFamily:\s*MONT/.test(chip))
    fail(`${rel}: the when/cost chip is back on Montserrat — fact chips are Grotesk (M1)`);
  if (/textTransform:\s*['"]uppercase['"]/.test(chip))
    fail(`${rel}: the when/cost chip uppercases — Grotesk is never uppercased (M3)`);
  if (!/tabular-nums/.test(chip))
    fail(`${rel}: the when/cost chip lost tabular figures — facts in a column are tnum`);
  // The host credit lead-in ("Hosted by" / "With" / "On the decks") is INFO,
  // not an eyebrow — ruled 23.08.26. It is the one label-shaped string that
  // takes Grotesk, because it reads as the first half of a sentence the name
  // completes rather than as a caps signal. Guarded so the generic
  // "eyebrows are Montserrat" rule does not reclaim it later.
  // Bound the slice to the kicker element ITSELF: from `el.kicker &&` to its
  // own text node, which is the second `el.kicker` in both the .jsx and the
  // compiled .js. Anything looser runs into the NAME div that follows, whose
  // uppercase is correct and would read as a false positive here.
  const k = src.search(/el\.kicker\s*&&/);
  const kEnd = src.indexOf("el.kicker", k + 9) + 9;
  if (k < 0 || kEnd <= k) fail(`${rel}: host kicker renderer not found`);
  else {
    const line = src.slice(k, kEnd);
    if (!/FACT\(/.test(line))
      fail(`${rel}: the host kicker is off FACT() — the credit lead-in is info, so it is Grotesk`);
    if (/uppercase/.test(line))
      fail(`${rel}: the host kicker uppercases — Grotesk is never uppercased (M3)`);
    // The NAME that follows it is Grotesk too (24.08) — one credit, one
    // family. Slice from the kicker's end to the name's own text node.
    const nEnd = src.indexOf("el.name", kEnd);
    const nameEl = nEnd > kEnd ? src.slice(kEnd, nEnd + 7) : null;
    if (!nameEl) fail(`${rel}: host name renderer not found`);
    else {
      if (!/FACT\(/.test(nameEl))
        fail(`${rel}: the host name is off FACT() — the whole credit is Grotesk`);
      if (/uppercase/.test(nameEl))
        fail(`${rel}: the host name uppercases — Grotesk is never uppercased (M3)`);
    }
  }
}
// Print Studio data — ladder + the baked print offset; body stays Grotesk 0.
for (const rel of ["public/print/print-data.jsx"]) {
  const src = read(rel);
  checkRole(src, rel, "headline", "tracking", "display", PRINT_OFF);
  checkRole(src, rel, "numeral", "tracking", "display", PRINT_OFF);
  checkRole(src, rel, "bignum", "tracking", "display", PRINT_OFF);
  checkRole(src, rel, "kicker", "tracking", "label", PRINT_OFF);
  const bodyTr = presetNum(src, rel, "body", "tracking");
  if (bodyTr != null && !near(bodyTr, 0))
    fail(`${rel}: body.tracking is ${bodyTr} — body is Grotesk at natural tracking (0)`);
  if (!new RegExp(`\\bbody:\\s*\\{[\\s\\S]*?fam:\\s*['"]grot['"]`).test(src))
    fail(`${rel}: body preset is not fam:'grot' — Grotesk states facts (canon families)`);
}
// The ticket's wordmark must stay the baked VECTOR — never re-typeset from a
// font-family (Alternates is wordmark-only, and only as the A/I/Y
// substitution inside the shipped paths). Its site line is the button role
// (.11em); the banner line is the label role (.16em).
{
  const slice = (src, rel, fromRe, toRe, what) => {
    const i = src.search(fromRe), j = src.search(toRe);
    if (i < 0 || j <= i) { fail(`${rel}: ${what} block not found`); return null; }
    return src.slice(i, j);
  };
  for (const rel of ["public/studio/studio-element.jsx"]) {
    const src = read(rel);
    const block = slice(src, rel, /el\.type\s*===?\s*['"]ticket['"]/, /el\.type\s*===?\s*['"]lineup['"]/, "ticket renderer");
    if (!block) continue;
    if (!/WordmarkSVG/.test(block))
      fail(`${rel}: ticket no longer renders WordmarkSVG — the wordmark stays the baked vector`);
    if (/Alternates/.test(block) || /fontFamily:\s*ALT\b/.test(block))
      fail(`${rel}: ticket sets its mark from a font-family — never re-typeset the wordmark`);
    // The site line's two rungs now resolve through TRACK rather than being
    // written as literals, so guard the reference, not the number.
    if (!/TRACK\.button/.test(block))
      fail(`${rel}: ticket site line lost its button-role tracking (TRACK.button)`);
    if (!/TRACK\.label/.test(block))
      fail(`${rel}: ticket banner line lost its label-role tracking (TRACK.label)`);
    if (!/import\s*\{[^}]*\bWordmarkSVG\b[^}]*\}\s*from\s*['"]\.\.\/studio-shared\/wordmark\.jsx['"]/.test(src))
      fail(`${rel}: WordmarkSVG is not the shared studio-shared/wordmark.jsx (baked letter paths)`);
  }
  for (const rel of ["public/print/print-element.jsx"]) {
    const src = read(rel);
    const block = slice(src, rel, /t\s*===?\s*['"]footer['"]/, /t\s*===?\s*['"]wordmark['"]/, "footer renderer");
    if (!block) continue;
    if (!/WordmarkSVG/.test(block))
      fail(`${rel}: footer no longer renders WordmarkSVG — the wordmark stays the baked vector`);
    if (/Alternates/.test(block) || /FAM_CSS\.alt\b/.test(block))
      fail(`${rel}: footer sets its mark from a font-family — never re-typeset the wordmark`);
  }
  for (const rel of ["public/print/print-export.jsx"]) {
    const src = read(rel);
    const block = slice(src, rel, /t\s*===?\s*['"]footer['"]/, /t\s*===?\s*['"]wordmark['"]/, "footer exporter");
    if (!block) continue;
    if (!/WORDMARK_PATH/.test(block))
      fail(`${rel}: footer PDF no longer draws WORDMARK_PATH — the wordmark stays the baked vector`);
  }
}

// ── 8 · The riso press (22.09.26): one core, canon palette, canon stocks ──
// riso-press.js is the shared separation core (Poster + Print, and vendored
// into the app). It carries literal copies of the accent palette and of the
// stock table because a canvas cannot read tokens; both are guarded here.
{
  const rel = "public/studio-shared/riso-press.js";
  const src = read(rel);
  const stocks = JSON.parse(read("public/tokens/stocks.json"));
  const parseObj = (name) => {
    const m = src.match(new RegExp(`const ${name}\\s*=\\s*\\{([\\s\\S]*?)\\};`));
    if (!m) { fail(`${rel}: ${name} table not found`); return null; }
    const out = {};
    for (const g of m[1].replace(/\/\/[^\n]*/g, "").matchAll(/(\w+)\s*:\s*['"](#[0-9a-fA-F]{6})['"]/g)) out[g[1]] = g[2].toLowerCase();
    return out;
  };
  const pal = parseObj("PAL"), paper = parseObj("PAPER"), ink = parseObj("INK");
  if (pal) {
    for (const day of DAY_ORDER) {
      const accent = accentOf(day), want = canon.days[day].hex.toLowerCase();
      if (pal[accent] !== want) fail(`${rel}: PAL.${accent} is ${pal[accent]}, canon (${DAY_FULL[day]}) says ${want}`);
    }
    if (pal.ink !== "#0d0905" || pal.cream !== "#fffbf1") fail(`${rel}: PAL neutrals drifted (ink ${pal.ink}, cream ${pal.cream})`);
  }
  if (paper && ink) {
    for (const [key, s] of Object.entries(stocks.stocks)) {
      if (paper[key] !== s.hex.toLowerCase()) fail(`${rel}: PAPER.${key} is ${paper[key]}, tokens/stocks.json says ${s.hex}`);
      if (ink[key] !== s.ink.toLowerCase()) fail(`${rel}: INK.${key} is ${ink[key]}, tokens/stocks.json says ${s.ink}`);
    }
    for (const key of Object.keys(paper)) if (!stocks.stocks[key]) fail(`${rel}: PAPER.${key} is not in tokens/stocks.json — add it there first`);
    const order = (src.match(/const STOCKS\s*=\s*\[([^\]]*)\]/) || [])[1];
    if (!order || order.replace(/['"\s]/g, "") !== stocks.order.join(","))
      fail(`${rel}: STOCKS order differs from tokens/stocks.json`);
    if (paper.white !== canon.print.stock.toLowerCase() || ink.white !== canon.print.ink.toLowerCase())
      fail(`${rel}: the white stock must be canon.print (${canon.print.stock} / ${canon.print.ink})`);
  }
  // the partner map is canon too
  const pm = src.match(/const PARTNER\s*=\s*\{([\s\S]*?)\};/);
  if (!pm) fail(`${rel}: PARTNER map not found`);
  else for (const [a, b] of Object.entries(canon.partners))
    if (!new RegExp(`\\b${a}\\s*:\\s*['"]${b}['"]`).test(pm[1])) fail(`${rel}: PARTNER.${a} is not '${b}' (canon)`);
  // and nobody may quietly fork the engine again
  for (const stale of ["public/studio/riso-engine.js", "public/print/riso-engine.js"]) {
    try { readFileSync(join(root, stale)); fail(`${stale} exists — the engine lives in public/studio-shared/ only`); } catch { /* good */ }
  }
}

if (failures) {
  console.error(`\n${failures} drift(s) against public/tokens/day-colours.json`);
  process.exit(1);
}
console.log("day-colours: studios + site strings + type ladder + riso press match canon.");
