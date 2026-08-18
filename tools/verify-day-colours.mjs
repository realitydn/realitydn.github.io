#!/usr/bin/env node
// Verifies the three studios against the canonical weekday-coding data file,
// public/tokens/day-colours.json (canon 18.08.26 — the single source of truth
// for weekday hues, the ink partner map, the per-theme accent pair and the
// site string). Canvas/PDF renderers can't read CSS custom properties, so
// their weekday literals are ENFORCED against the json here instead:
//
//   node tools/verify-day-colours.mjs        # exits 1 on any drift
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

// ── 3 · Site string on artwork = bare host (canon D5) ──
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

if (failures) {
  console.error(`\n${failures} drift(s) against public/tokens/day-colours.json`);
  process.exit(1);
}
console.log("day-colours: studios + site strings match canon.");
