#!/usr/bin/env node
// The studio safety net — one entry for every suite.
//
//   node scripts/test-studios/run.mjs                 run everything
//   node scripts/test-studios/run.mjs --only engine   one suite (engine | smoke | exports)
//   node scripts/test-studios/run.mjs --update        re-render goldens that moved
//   node scripts/test-studios/run.mjs --grep halftone only cases whose name matches
//   node scripts/test-studios/run.mjs --record-fonts  fill tests/fixtures/fonts from Google (network)
//   node scripts/test-studios/run.mjs --loose         engine: cross-platform tolerance even here
//
// Exit code 0 = all green. On a failure the offending renders land in
// tests/out/<suite>/ as <case>.actual.png / .golden.png / .diff.png.
// See scripts/test-studios/README.md.

import fs from 'node:fs';
import { OUT, launchBrowser, fmtStat, rel, settings } from './lib/common.mjs';

const args = process.argv.slice(2);
const flag = (f) => args.includes(f);
const opt = (f) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : null; };

const update = flag('--update');
const recordFonts = flag('--record-fonts');
settings.recordFonts = recordFonts;
const only = (opt('--only') || '').split(',').filter(Boolean);
const grep = opt('--grep');
const filter = grep ? new RegExp(grep, 'i') : null;
const verbose = flag('--verbose') || flag('-v');
const loose = flag('--loose');

const SUITES = {
  engine: () => import('./engine.mjs'),
  smoke: () => import('./smoke.mjs'),
  exports: () => import('./exports.mjs'),
};
const pick = only.length ? only : Object.keys(SUITES);
for (const s of pick) if (!SUITES[s]) { console.error(`unknown suite "${s}" — one of: ${Object.keys(SUITES).join(', ')}`); process.exit(2); }

// A stale tests/out/ from an earlier run would read as this run's failures.
fs.rmSync(OUT, { recursive: true, force: true });

const t0 = Date.now();
const browser = await launchBrowser();
let failed = 0;
const summary = [];
try {
  for (const name of pick) {
    const t = Date.now();
    const mod = await SUITES[name]();
    console.log(`\n── ${name} ${'─'.repeat(60 - name.length)}`);
    let results;
    try {
      results = await mod.run({ browser, update, filter, recordFonts, verbose, loose });
    } catch (e) {
      results = [{ name: name + ' (crashed)', status: 'fail', pass: false, note: String((e && e.stack) || e) }];
    }
    let bad = 0;
    const counts = {};
    for (const r of results) {
      counts[r.status] = (counts[r.status] || 0) + 1;
      const ok = r.pass !== false;
      if (!ok) bad++;
      if (!ok || verbose || (update && r.status !== 'kept' && r.status !== 'same')) {
        console.log(`  ${ok ? '✓' : '✗'} ${r.name.padEnd(44)} ${fmtStat(r)}${r.note ? '\n      ' + String(r.note).replace(/\n/g, '\n      ') : ''}`);
      }
    }
    const secs = ((Date.now() - t) / 1000).toFixed(1);
    const line = `${name}: ${results.length - bad}/${results.length} ok (${Object.entries(counts).map(([k, v]) => v + ' ' + k).join(', ')}) in ${secs}s`;
    console.log('  ' + line);
    summary.push(line);
    failed += bad;
  }
} finally {
  await browser.close();
}

console.log('\n' + summary.join('\n'));
console.log(`total ${((Date.now() - t0) / 1000).toFixed(1)}s`);
if (failed) {
  console.log(`\n${failed} failing — renders + diffs in ${rel(OUT)}/ (red = pixels past tolerance).`);
  if (!update) console.log('If the change was intended: eyeball the diffs, then run with --update and commit the new goldens.');
  process.exit(1);
}
