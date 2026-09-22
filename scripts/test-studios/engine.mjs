// ENGINE GOLDENS — the riso press, alone, pixel for pixel.
//
// Loads riso-press.js + riso-engine.js (nothing else) into a blank harness
// page and renders the committed test photo through:
//   · every treatment × {day, night} × {pink, blue} at its TREAT_PRESETS baseline
//   · every FINISH_LOOKS entry over separation (night) and duotone (day)
//   · a handful of dial combinations the presets never reach
// at 260×325 (the fixture photo's own size, so it is drawn 1:1 — no resample
// to differ across platforms; every engine size is relative to the frame, so a
// quarter-size render exercises the same paths at a quarter of the repo weight),
// then compares each against tests/golden/engine/<case>.png.
//
// The presets are read out of the Poster Studio's own source (lib/extract),
// so this tests what ships. Tolerance: a channel may move by ≤ 3 on ≥ 99.5%
// of pixels — loose enough for another OS's Skia / JPEG decoder. On the
// platform the goldens were rendered on (recorded in _platform.json: OS +
// Chrome build) the match must be EXACT, so a single moved pixel fails.
// --loose forces the cross-platform tolerance anywhere.

import { extractConst } from './lib/extract.mjs';
import { checkGolden, preparePage, startHarnessServer, dataUrlToBuffer, tolerancePlan } from './lib/common.mjs';

const W = 260, H = 325;
export const TOL = { tol: 3, minMatch: 0.995 };   // across platforms; exact where the goldens were made

export function buildCases(treatments) {
  const TP = extractConst('TREAT_PRESETS').value;
  const FN = extractConst('FINISH_NEUTRAL').value;
  const FL = extractConst('FINISH_LOOKS').value;
  const TL = extractConst('TREAT_LOOKS').value;
  const look = (t, v) => ((TL[t] || []).find((l) => l.v === v) || { p: {} }).p;
  const cases = [];
  const add = (name, treatment, opts) => cases.push({ name, treatment, opts });

  for (const t of treatments) {
    for (const paper of ['day', 'night']) {
      for (const ink of ['pink', 'blue']) {
        add(`t-${t}-${paper}-${ink}`, t, { ink, paper, ...(TP[t] || {}) });
      }
    }
  }

  for (const f of FL) {
    add(`finish-${f.v}-separation`, 'separation', { ink: 'pink', paper: 'night', ...TP.separation, ...FN, ...f.p });
    add(`finish-${f.v}-duotone`, 'duotone', { ink: 'blue', paper: 'day', ...TP.duotone, ...FN, ...f.p });
  }

  // Dials the presets never reach — each one a different code path.
  const sep = (paper, ink, p) => ({ ink, paper, ...TP.separation, ...p });
  add('dial-press-misfed', 'separation', sep('night', 'pink', { drift: 8, skew: 9, stretch: 12, starve: 0.35, drumStreak: 0.3, pull: 40 }));
  add('dial-press-four-colour', 'separation', sep('day', 'pink', look('separation', 'four')));
  add('dial-press-screen43', 'separation', sep('day', 'blue', look('separation', 's43')));
  add('dial-press-kraft', 'separation', sep('day', 'pink', look('separation', 'kraft')));
  add('dial-press-proof-plate-1', 'separation', sep('day', 'pink', { proofPlate: 1 }));
  add('dial-halftone-two-ink', 'halftone', { ink: 'pink', paper: 'day', ...TP.halftone, inkMode: 'two' });
  add('dial-halftone-gradient', 'halftone', { ink: 'pink', paper: 'night', ...TP.halftone, inkMode: 'gradient' });
  add('dial-offregister-ghost', 'offregister', { ink: 'pink', paper: 'night', ...TP.offregister, ghost: 0.5 });
  add('dial-offregister-sep', 'offregister', { ink: 'blue', paper: 'day', ...TP.offregister, sep: true });
  add('dial-blend-multiply', 'halftone', { ink: 'pink', paper: 'day', ...TP.halftone, treatBlend: 'multiply', treatStrength: 0.85 });
  add('dial-blur-typed', 'duotone', { ink: 'pink', paper: 'day', ...TP.duotone, blurUnder: 4, blurUnderType: 'motion', blurUnderAngle: 30, blurOver: 2 });
  return cases;
}

export async function run({ browser, update, filter, loose }) {
  const plan = await tolerancePlan(browser, 'engine', TOL, loose);
  const tol = plan.tol;
  const srv = await startHarnessServer();
  const results = [];
  try {
    const { page, log } = await preparePage(browser, {});
    await page.goto(srv.url + 'scripts/test-studios/harness/engine.html', { waitUntil: 'load' });
    await page.evaluate(() => window.harnessReady);
    const treatments = await page.evaluate(() => window.RISO.TREATMENTS);
    const cases = buildCases(treatments).filter((c) => !filter || filter.test(c.name));

    const render = async (c) => {
      const r = await page.evaluate((t, o, w, h) => window.renderCase(t, o, w, h), c.treatment, c.opts, W, H);
      return { width: r.width, height: r.height, data: dataUrlToBuffer(r.rgba), ms: r.ms };
    };

    // Determinism guard: the same case twice in one page must be identical,
    // or every golden below is meaningless.
    if (cases.length) {
      const a = await render(cases[0]), b = await render(cases[0]);
      if (!a.data.equals(b.data)) {
        results.push({ name: 'determinism', status: 'fail', pass: false, note: 'the same render twice gave different pixels (unseeded randomness in the engine?)' });
      }
    }

    for (const c of cases) {
      const img = await render(c);
      const r = checkGolden({ suite: 'engine', name: c.name, image: img, update, ...tol });
      r.ms = img.ms;
      results.push(r);
    }
    if (update) plan.record(results);
    results.push({ name: 'tolerance', status: 'pass', pass: true, note: plan.note });
    if (log.pageErrors.length) results.push({ name: 'page errors', status: 'fail', pass: false, note: log.pageErrors.join('\n') });
    await page.close();
  } finally {
    await srv.stop();
  }
  return results;
}
