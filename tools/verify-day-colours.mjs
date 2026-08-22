#!/usr/bin/env node
// Verifies the studios against the canonical weekday-coding data file,
// public/tokens/day-colours.json, plus the ink-mark pass (canon rev 22.08.26
// — design-system-year2/design_handoff_web_app_ink_pass/tokens/ink-strip.json).
// Canvas/PDF renderers can't read CSS custom properties, so their weekday and
// ink-mark literals are ENFORCED against canon here instead:
//
//   node tools/verify-day-colours.mjs        # exits 1 on any drift
//
// Checks: Schedule Studio day literals · Poster Studio ACCENT_DAYS · Print
// Studio PALETTE hexes · the INK_MARK cell hexes + fixed cell order in BOTH
// studio-data.jsx and print-data.jsx (and their generated .js) · the
// event-report denylist of retired off-palette hexes · site strings · the
// TYPE section: the canon tracking ladder on both studios' text presets
// (print bakes the +.01em offset) and the ticket/footer wordmark staying the
// baked vector, never a font-family re-typeset.
//
// Run it whenever the studios' data files or day-colours.json change (it's
// cheap — wire it wherever the precompile step runs). If canon ever changes
// a hue, update day-colours.json first, then the literals, then re-run.

import { readFileSync } from "node:fs";
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
const read = (rel) => readFileSync(join(root, rel), "utf8");

// ── 1 · Schedule Studio: DAY_COLORS / DAY_TEXT literals (ISO 1=Mon..7=Sun) ──
for (const rel of ["public/schedule/schedule-data.jsx", "public/schedule/schedule-data.js"]) {
  const src = read(rel);
  const colors = src.match(/DAY_COLORS\s*=\s*\{([^}]*)\}/);
  const text = src.match(/DAY_TEXT\s*=\s*\{([^}]*)\}/);
  if (!colors || !text) { fail(`${rel}: DAY_COLORS/DAY_TEXT block not found`); continue; }
  DAY_ORDER.forEach((day, i) => {
    const iso = i + 1;
    const want = canon.days[day].hex.toLowerCase();
    const gotHex = (colors[1].match(new RegExp(`${iso}\\s*:\\s*['"]([^'"]+)['"]`)) || [])[1];
    if ((gotHex || "").toLowerCase() !== want)
      fail(`${rel}: ISO ${iso} (${DAY_FULL[day]}) is ${gotHex}, canon says ${want}`);
    // DAY_TEXT uses INK/CREAM constants; canon "on" of #fffbf1 means CREAM.
    const wantText = canon.days[day].on.toLowerCase() === "#fffbf1" ? "CREAM" : "INK";
    const gotText = (text[1].match(new RegExp(`${iso}\\s*:\\s*(INK|CREAM)`)) || [])[1];
    if (gotText !== wantText)
      fail(`${rel}: ISO ${iso} (${DAY_FULL[day]}) text is ${gotText}, canon says ${wantText}`);
  });
}

// ── 2 · Poster Studio: ACCENT_DAYS (accent name → weekday name) ──
for (const rel of ["public/studio/studio-data.jsx", "public/studio/studio-data.js"]) {
  const src = read(rel);
  const block = src.match(/ACCENT_DAYS\s*=\s*\{([\s\S]*?)\}/);
  if (!block) { fail(`${rel}: ACCENT_DAYS block not found`); continue; }
  for (const day of DAY_ORDER) {
    const accent = accentOf(day);
    const re = new RegExp(`${accent}\\s*:\\s*['"]${DAY_FULL[day]}['"]`);
    if (!re.test(block[1]))
      fail(`${rel}: ACCENT_DAYS lacks ${accent}:'${DAY_FULL[day]}' (canon pairing)`);
  }
}

// ── 3 · Print Studio: PALETTE hexes (accent name → hex) ──
// Parse a `const PALETTE = {...}` object literal into { name: '#hex' }.
const parsePalette = (src, rel) => {
  const block = src.match(/PALETTE\s*=\s*\{([\s\S]*?)\}/);
  if (!block) { fail(`${rel}: PALETTE block not found`); return null; }
  const out = {};
  for (const m of block[1].matchAll(/(\w+)\s*:\s*['"](#[0-9a-fA-F]{6})['"]/g)) out[m[1]] = m[2].toLowerCase();
  return out;
};
for (const rel of ["public/print/print-data.jsx", "public/print/print-data.js"]) {
  const pal = parsePalette(read(rel), rel);
  if (!pal) continue;
  for (const day of DAY_ORDER) {
    const accent = accentOf(day), want = canon.days[day].hex.toLowerCase();
    if (pal[accent] !== want)
      fail(`${rel}: PALETTE.${accent} is ${pal[accent]}, canon (${DAY_FULL[day]}) says ${want}`);
  }
}

// ── 4 · Ink mark (canon rev 22.08.26): cell hexes + fixed cell order ──
// The INK_MARK blocks in BOTH studios must resolve the seven accents to the
// canon hues, keep the right neutrals for their substrate, and carry the
// FIXED cell order (ink-strip.json: order is canon; recolouring is the only
// parameter). Artwork neutrals per ink-strip.json cells: ink #0d0905, stock
// #fffbf1. Print neutrals follow the print substrate (canon.print).
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
const INK_FILES = [
  { rel: "public/studio/studio-data.jsx", neutrals: INK_ARTWORK },
  { rel: "public/studio/studio-data.js",  neutrals: INK_ARTWORK },
  { rel: "public/print/print-data.jsx",   neutrals: { ink: canon.print.ink, stock: canon.print.stock } },
  { rel: "public/print/print-data.js",    neutrals: { ink: canon.print.ink, stock: canon.print.stock } },
];
const stripQ = (s) => s.replace(/['"\s]/g, "");
for (const { rel, neutrals } of INK_FILES) {
  const src = read(rel);
  const pal = parsePalette(src, rel);
  const cellsBlock = src.match(/INK_MARK_CELLS\s*=\s*\{([\s\S]*?)\}/);
  if (!cellsBlock || !pal) { if (!cellsBlock) fail(`${rel}: INK_MARK_CELLS block not found`); continue; }
  // resolve each cell entry: PALETTE.x → parsed hex · INK.rgb/WHITE.rgb →
  // the file's own substrate constants · or a hex literal.
  const constHex = (name) => {
    const m = src.match(new RegExp(`${name}\\s*=\\s*\\{\\s*rgb\\s*:\\s*['"](#[0-9a-fA-F]{6})['"]`));
    return m ? m[1].toLowerCase() : null;
  };
  const cells = {};
  for (const m of cellsBlock[1].matchAll(/(\w+)\s*:\s*(PALETTE\.\w+|INK\.rgb|WHITE\.rgb|['"]#[0-9a-fA-F]{6}['"])/g)) {
    const v = m[2];
    cells[m[1]] = v.startsWith("PALETTE.") ? pal[v.slice(8)]
      : v === "INK.rgb" ? constHex("INK")
      : v === "WHITE.rgb" ? constHex("WHITE")
      : v.slice(1, -1).toLowerCase();
  }
  for (const day of DAY_ORDER) {
    const accent = accentOf(day), want = canon.days[day].hex.toLowerCase();
    if (cells[accent] !== want)
      fail(`${rel}: INK_MARK cell '${accent}' is ${cells[accent]}, canon (${DAY_FULL[day]}) says ${want}`);
  }
  for (const n of ["ink", "stock"]) {
    if (cells[n] !== neutrals[n].toLowerCase())
      fail(`${rel}: INK_MARK cell '${n}' is ${cells[n]}, canon says ${neutrals[n]}`);
  }
  // fixed cell order — every mode's bands/field/sq, plus the anchored field
  for (const [mode, want] of Object.entries(INK_ORDER)) {
    const m = src.match(new RegExp(`${mode}:\\s*\\{\\s*bands:\\s*\\[([^\\]]*)\\]\\s*,\\s*field:\\s*\\[([^\\]]*)\\]\\s*,\\s*sq:\\s*\\[([^\\]]*)\\]`));
    if (!m) { fail(`${rel}: INK_MARK mode '${mode}' not found in canonical shape`); continue; }
    if (stripQ(m[1]) !== want.bands) fail(`${rel}: INK_MARK ${mode}.bands order is [${stripQ(m[1])}], canon says [${want.bands}]`);
    if (stripQ(m[2]) !== want.field) fail(`${rel}: INK_MARK ${mode}.field order is [${stripQ(m[2])}], canon says [${want.field}]`);
    if (stripQ(m[3]) !== want.sq) fail(`${rel}: INK_MARK ${mode}.sq order is [${stripQ(m[3])}], canon says [${want.sq}]`);
  }
  const anch = src.match(/anchoredField\s*:\s*\[([^\]]*)\]/);
  if (!anch || stripQ(anch[1]) !== INK_ANCHORED)
    fail(`${rel}: INK_MARK anchoredField is [${anch ? stripQ(anch[1]) : "missing"}], canon says [${INK_ANCHORED}]`);
}
// Print Studio's literal day→accent map for the daycode mode.
{
  for (const rel of ["public/print/print-data.jsx", "public/print/print-data.js"]) {
    const block = read(rel).match(/INK_MARK_DAY_ACCENT\s*=\s*\{([\s\S]*?)\}/);
    if (!block) { fail(`${rel}: INK_MARK_DAY_ACCENT block not found`); continue; }
    for (const day of DAY_ORDER) {
      const accent = accentOf(day);
      if (!new RegExp(`${day}\\s*:\\s*['"]${accent}['"]`).test(block[1]))
        fail(`${rel}: INK_MARK_DAY_ACCENT lacks ${day}:'${accent}' (canon pairing)`);
    }
  }
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
  "public/print/print-data.jsx", "public/print/print-data.js",
  "public/print/print-export.jsx", "public/print/print-export.js",
  "public/schedule/schedule-render.jsx", "public/schedule/schedule-render.js",
  "public/studio/studio-data.jsx", "public/studio/studio-data.js",
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
const LADDER = { display: 0.015, h1: 0.025, h2: 0.04, name: 0, label: 0.16, button: 0.11 };
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
for (const rel of ["public/studio/studio-data.jsx", "public/studio/studio-data.js"]) {
  const src = read(rel);
  checkRole(src, rel, "title", "letterSpacing", "display");
  checkRole(src, rel, "title", "subTracking", "h1");
  checkRole(src, rel, "stamp", "letterSpacing", "h2");
  checkRole(src, rel, "host", "letterSpacing", "name");
  checkRole(src, rel, "when", "letterSpacing", "label");
  checkRole(src, rel, "cost", "letterSpacing", "label");
  for (const key of ["lineup", "sessions", "specials", "agenda"])
    checkRole(src, rel, key, "rowTracking", "name");
}
// Print Studio data — ladder + the baked print offset; body stays Grotesk 0.
for (const rel of ["public/print/print-data.jsx", "public/print/print-data.js"]) {
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
  for (const rel of ["public/studio/studio-element.jsx", "public/studio/studio-element.js"]) {
    const src = read(rel);
    const block = slice(src, rel, /el\.type\s*===?\s*['"]ticket['"]/, /el\.type\s*===?\s*['"]lineup['"]/, "ticket renderer");
    if (!block) continue;
    if (!/WordmarkSVG/.test(block))
      fail(`${rel}: ticket no longer renders WordmarkSVG — the wordmark stays the baked vector`);
    if (/Alternates/.test(block) || /fontFamily:\s*ALT\b/.test(block))
      fail(`${rel}: ticket sets its mark from a font-family — never re-typeset the wordmark`);
    if (!/\.11em/.test(block))
      fail(`${rel}: ticket site line lost its .11em (button role) tracking`);
    if (!/\.16em/.test(block))
      fail(`${rel}: ticket banner line lost its .16em (label role) tracking`);
    if (!/M73\.4,63\.7/.test(src))
      fail(`${rel}: WordmarkSVG's baked letter paths are missing`);
  }
  for (const rel of ["public/print/print-element.jsx", "public/print/print-element.js"]) {
    const src = read(rel);
    const block = slice(src, rel, /t\s*===?\s*['"]footer['"]/, /t\s*===?\s*['"]wordmark['"]/, "footer renderer");
    if (!block) continue;
    if (!/WordmarkSVG/.test(block))
      fail(`${rel}: footer no longer renders WordmarkSVG — the wordmark stays the baked vector`);
    if (/Alternates/.test(block) || /FAM_CSS\.alt\b/.test(block))
      fail(`${rel}: footer sets its mark from a font-family — never re-typeset the wordmark`);
  }
  for (const rel of ["public/print/print-export.jsx", "public/print/print-export.js"]) {
    const src = read(rel);
    const block = slice(src, rel, /t\s*===?\s*['"]footer['"]/, /t\s*===?\s*['"]wordmark['"]/, "footer exporter");
    if (!block) continue;
    if (!/WORDMARK_PATH/.test(block))
      fail(`${rel}: footer PDF no longer draws WORDMARK_PATH — the wordmark stays the baked vector`);
  }
}

if (failures) {
  console.error(`\n${failures} drift(s) against public/tokens/day-colours.json`);
  process.exit(1);
}
console.log("day-colours: studios + site strings + type ladder match canon.");
