// EXPORT GOLDENS — what each studio actually hands you, template by template.
//
// Driven through the real UI and the real export code, with the download
// intercepted (an <a download> click is caught before it leaves the page):
//   Poster   — every built-in starter: click its card, switch to the 4:5
//              view, press Save Images. The app's own export path runs
//              (exporting flag, settle, html-to-image) — only the capture's
//              pixelRatio is pinned to 1 to keep it quick.
//   Print    — every built-in template: click its card, press Save PDF. The
//              real pdf-lib file is rasterised (page 1, 100 dpi, PyMuPDF), and
//              every QR on it is decoded (OpenCV) and checked against the
//              payload the template asked for.
//   Schedule — the ?seed=stress week under a fixed clock, Export → Everything:
//              every feed / story / WhatsApp / daily / cover PNG, the print PDF
//              (rasterised), and the CSV (compared as text).
//
// Poster and Schedule PNGs are compared at half size (a 2×2 box average) so
// the goldens stay a reasonable size in git; the engine suite already pins
// the press pixel for pixel. On the platform the goldens were made on
// (_platform.json) the match must be exact; elsewhere, or with --loose, a
// channel may move by ≤ 16 on ≥ 99.5% of pixels (text rasterisation moves
// with the OS).
//
// Local only — needs Python with PyMuPDF + OpenCV, and text raster differs
// between Windows and Linux (see README).

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  GOLDEN, ROOT, checkGolden, dataUrlToBuffer, ensureDir, imageFromPng, preparePage, sleep, slug,
  startStudioServer, tolerancePlan, writeOut,
} from './lib/common.mjs';
import { decodePng } from './lib/png.mjs';

export const TOL = { tol: 16, minMatch: 0.995 };

// ---------------------------------------------------------------- helpers

// Catch every <a download> click (the studios' only way out) and keep the URL.
function downloadTrap() {
  window.__downloads = [];
  const click = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () {
    if (this.hasAttribute('download')) { window.__downloads.push({ name: this.download, href: this.href }); return; }
    return click.call(this);
  };
}

async function exportPage(browser, url) {
  const { page, log } = await preparePage(browser, { viewport: { width: 1440, height: 900 } });
  await page.evaluateOnNewDocument(downloadTrap);
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
  await page.evaluate(() => (document.fonts ? document.fonts.ready : null));
  // Captures at pixelRatio 1: the same code path, a quarter of the pixels.
  await page.evaluate(() => {
    const h = window.htmlToImage; if (!h) return;
    for (const k of ['toPng', 'toJpeg', 'toBlob', 'toCanvas']) {
      const orig = h[k];
      h[k] = (node, opts) => orig.call(h, node, Object.assign({}, opts, { pixelRatio: 1 }));
    }
  });
  return { page, log };
}

/** Wait for the next intercepted download and return {name, bytes}. */
async function nextDownload(page, before, timeout = 60000) {
  await page.waitForFunction((n) => window.__downloads.length > n, { timeout, polling: 100 }, before);
  const d = await page.evaluate(async (n) => {
    const { name, href } = window.__downloads[n];
    const buf = new Uint8Array(await (await fetch(href)).arrayBuffer());
    let s = ''; for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
    return { name, b64: btoa(s) };
  }, before);
  return { name: d.name, bytes: Buffer.from(d.b64, 'base64') };
}

const downloadCount = (page) => page.evaluate(() => window.__downloads.length);

async function clickButton(page, scopeSel, textStart) {
  const ok = await page.evaluate((sel, t) => {
    const b = [...document.querySelectorAll(sel + ' button')].find((x) => x.textContent.trim().toLowerCase().startsWith(t.toLowerCase()));
    if (!b || b.disabled) return false;
    b.click(); return true;
  }, scopeSel, textStart);
  if (!ok) throw new Error(`no enabled "${textStart}" button in ${scopeSel}`);
}

/** 2×2 box average — halves an RGBA image. */
function halve(img) {
  const w = img.width >> 1, h = img.height >> 1, s = img.data, W = img.width;
  const out = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const a = ((y * 2) * W + x * 2) * 4, b = a + 4, c = a + W * 4, d = c + 4, o = (y * w + x) * 4;
    for (let k = 0; k < 4; k++) out[o + k] = (s[a + k] + s[b + k] + s[c + k] + s[d + k] + 2) >> 2;
  }
  return { width: w, height: h, data: out };
}

function python() {
  for (const p of ['python', 'python3', 'py']) {
    const r = spawnSync(p, ['-c', 'import fitz'], { encoding: 'utf8' });
    if (r.status === 0) return p;
  }
  return null;
}

/** Rasterise PDFs (and decode QRs) in one Python run. jobs: [{pdf, png, dpi, qr}] */
function rasterise(jobs) {
  const py = python();
  if (!py) throw new Error('Python with PyMuPDF not found (pip install pymupdf opencv-python)');
  const r = spawnSync(py, [path.join(ROOT, 'scripts', 'test-studios', 'pdf_raster.py')], {
    input: JSON.stringify(jobs), encoding: 'utf8', maxBuffer: 64 << 20,
  });
  if (r.status !== 0) throw new Error('pdf_raster.py failed:\n' + r.stderr);
  return JSON.parse(r.stdout);
}

function pageNotes(log) {
  return [
    ...log.pageErrors.map((e) => 'page error: ' + e.split('\n')[0]),
    ...log.fontMisses.map((u) => 'font not cached (run --record-fonts): ' + u),
  ];
}

// ---------------------------------------------------------------- poster

async function poster(browser, { update, filter, loose }) {
  const results = [];
  const plan = await tolerancePlan(browser, 'poster', TOL, loose);
  const srv = await startStudioServer('studio');
  try {
    const { page, log } = await exportPage(browser, srv.url);
    await page.waitForSelector('.rs-top');
    // The stand-in photos are drawn once per kind with Math.random and cached;
    // draw all of them now, in a fixed order, so a template's photo can't
    // depend on which templates ran before it (or on --grep).
    await page.evaluate(() => ['spotlight', 'crowd', 'portrait'].forEach((k) => getSample(k)));
    // Open the starter library, every group.
    const list = await page.evaluate(() => {
      const head = [...document.querySelectorAll('.rs-sech')].find((h) => /^Templates/.test(h.textContent.trim()));
      if (head && !document.querySelector('.rs-tplgrid')) head.click();
      window.TEMPLATE_GROUPS.forEach((g) => RUI.setFold('lib:t:' + g, true));
      return window.TEMPLATE_GROUPS.flatMap((g) => window.TEMPLATES.filter((t) => t.group === g)).map((t) => ({ id: t.id, name: t.name }));
    });
    await sleep(800);
    const nCards = await page.evaluate(() => document.querySelectorAll('.rs-tplgrid .rs-tplcard').length);
    if (nCards !== list.length) results.push({ name: 'poster: starter cards', status: 'fail', pass: false, note: `${nCards} cards on screen, ${list.length} templates` });

    for (let i = 0; i < list.length; i++) {
      const tpl = list[i];
      const name = 'poster-' + tpl.id;
      if (filter && !filter.test(name)) continue;
      try {
        await page.evaluate((i) => document.querySelectorAll('.rs-tplgrid .rs-tplcard')[i].click(), i);
        await sleep(250);
        await clickButton(page, '.rs-top', '4:5');
        await sleep(250);
        const before = await downloadCount(page);
        await page.evaluate(() => document.querySelector('.rs-savebtn').click());
        const dl = await nextDownload(page, before);
        await page.waitForFunction(() => !document.querySelector('.rs-savebtn').disabled, { timeout: 20000 });
        const img = halve(imageFromPng(dl.bytes));
        results.push(checkGolden({ suite: 'poster', name, image: img, update, ...plan.tol }));
      } catch (e) {
        results.push({ name, status: 'fail', pass: false, note: String((e && e.message) || e) });
      }
    }
    const notes = pageNotes(log);
    if (notes.length) results.push({ name: 'poster: page', status: 'fail', pass: false, note: notes.join('\n') });
    await page.close();
    if (update) plan.record(results);
    results.push({ name: 'tolerance', status: 'pass', pass: true, note: plan.note });
  } finally {
    await srv.stop();
  }
  return results;
}

// ---------------------------------------------------------------- print

async function print(browser, { update, filter, loose }) {
  const results = [];
  const plan = await tolerancePlan(browser, 'print', TOL, loose);
  const srv = await startStudioServer('print');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-print-'));
  try {
    const { page, log } = await exportPage(browser, srv.url);
    await page.waitForSelector('.ps-top');
    const list = await page.evaluate(() => {
      document.querySelectorAll('.ps-lib .ps-sec').forEach((b) => {
        if (!b.classList.contains('open') && !/My templates/.test(b.textContent)) b.click();
      });
      // What each template's QR codes should say, from the built elements:
      // a QR part carries `data`; a part with showQR prints qrData (or the site).
      return window.TEMPLATE_GROUPS.flatMap((g) => window.TEMPLATES.filter((t) => t.group === g)).map((t) => {
        const b = window.buildTemplate(t);
        const qrs = [];
        b.elements.forEach((e) => {
          if (e.hidden) return;
          if (e.type === 'qr' && e.data) qrs.push(e.data);
          else if (e.showQR) qrs.push(e.qrData || 'https://realitydn.com');
        });
        return { id: t.id, name: t.name, qrs: [...new Set(qrs)].sort() };
      });
    });
    await sleep(600);
    const nCards = await page.evaluate(() => document.querySelectorAll('.ps-tplgrid .ps-tplcard').length);
    if (nCards !== list.length) results.push({ name: 'print: template cards', status: 'fail', pass: false, note: `${nCards} cards on screen, ${list.length} templates` });

    const jobs = [];
    for (let i = 0; i < list.length; i++) {
      const tpl = list[i];
      const name = 'print-' + tpl.id;
      if (filter && !filter.test(name)) continue;
      try {
        await page.evaluate((i) => document.querySelectorAll('.ps-tplgrid .ps-tplcard')[i].click(), i);
        await sleep(300);
        const before = await downloadCount(page);
        await clickButton(page, '.ps-top', 'Save PDF');
        const dl = await nextDownload(page, before);
        await page.waitForFunction(() => {
          const b = [...document.querySelectorAll('.ps-top button')].find((x) => /^Save PDF/i.test(x.textContent.trim()));
          return b && !b.disabled;
        }, { timeout: 20000 });
        const pdf = path.join(tmp, name + '.pdf');
        fs.writeFileSync(pdf, dl.bytes);
        jobs.push({ tpl, name, pdf, png: path.join(tmp, name + '.png'), dpi: 100, qr: true, file: dl.name });
      } catch (e) {
        results.push({ name, status: 'fail', pass: false, note: String((e && e.message) || e) });
      }
    }
    const notes = pageNotes(log);
    if (notes.length) results.push({ name: 'print: page', status: 'fail', pass: false, note: notes.join('\n') });
    await page.close();

    const raster = jobs.length ? rasterise(jobs.map(({ pdf, png, dpi, qr }) => ({ pdf, png, dpi, qr }))) : [];
    jobs.forEach((j, k) => {
      const r = checkGolden({ suite: 'print', name: j.name, image: decodePng(fs.readFileSync(j.png)), update, ...plan.tol });
      const info = raster[k];
      const qrNote = [];
      if (info.qrs === null) qrNote.push('QR not checked (no OpenCV)');
      else if (j.tpl.qrs.length || info.qrs.length) {
        const want = j.tpl.qrs.join(' '), got = info.qrs.join(' ');
        if (want !== got) { qrNote.push(`QR payloads: want [${want}] got [${got}]`); r.pass = false; r.status = 'fail'; }
        else r.note = `QR ok: ${info.qrs.join(' ')}`;
      }
      if (qrNote.length) r.note = qrNote.join('; ');
      if (!r.pass) writeOut('print', j.name + '.pdf', fs.readFileSync(j.pdf));
      results.push(r);
    });
    if (update) plan.record(results);
    results.push({ name: 'tolerance', status: 'pass', pass: true, note: plan.note });
  } finally {
    await srv.stop();
    fs.rmSync(tmp, { recursive: true, force: true });
  }
  return results;
}

// ---------------------------------------------------------------- schedule

async function schedule(browser, { update, filter, loose }) {
  const results = [];
  const plan = await tolerancePlan(browser, 'schedule', TOL, loose);
  const srv = await startStudioServer('schedule');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-schedule-'));
  try {
    const { page, log } = await exportPage(browser, srv.url + '?seed=stress');
    await page.waitForSelector('.ss-top');
    await sleep(500);
    const before = await downloadCount(page);
    await clickButton(page, '.ss-top', 'Everything');
    const dl = await nextDownload(page, before, 180000);
    // unzip in the page — the studio ships JSZip
    const files = await page.evaluate(async (b64) => {
      const zip = await window.JSZip.loadAsync(b64, { base64: true });
      const out = {};
      for (const n of Object.keys(zip.files)) if (!zip.files[n].dir) out[n] = await zip.files[n].async('base64');
      return out;
    }, dl.bytes.toString('base64'));
    const notes = pageNotes(log);
    if (notes.length) results.push({ name: 'schedule: page', status: 'fail', pass: false, note: notes.join('\n') });
    await page.close();

    const names = Object.keys(files).sort();
    const expectKinds = ['-feed', '-stories', '-wa', '-print.pdf', '-story.png', '-cover.png', '.csv'];
    const missing = expectKinds.filter((k) => !names.some((n) => n.includes(k)));
    if (missing.length) results.push({ name: 'schedule: channels', status: 'fail', pass: false, note: 'zip has no ' + missing.join(', ') + '\n  got: ' + names.join(' ') });

    const stem = (n) => 'schedule-' + slug(n.replace(/^reality-(schedule-)?/, '').replace(/\.(png|pdf|csv|json)$/, ''));
    const pdfJobs = [];
    for (const n of names) {
      const name = stem(n) + (n.endsWith('.pdf') ? '-pdf' : '');
      if (filter && !filter.test(name)) continue;
      const buf = Buffer.from(files[n], 'base64');
      if (n.endsWith('.png')) {
        results.push(checkGolden({ suite: 'schedule', name, image: halve(decodePng(buf)), update, ...plan.tol }));
      } else if (n.endsWith('.pdf')) {
        const pdf = path.join(tmp, name + '.pdf');
        fs.writeFileSync(pdf, buf);
        pdfJobs.push({ name, pdf, png: path.join(tmp, name + '.png'), dpi: 100 });
      } else if (n.endsWith('.csv')) {
        // the CSV is text: exact, bar line endings
        const file = path.join(GOLDEN, 'schedule', name + '.csv');
        const got = buf.toString('utf8').replace(/\r\n/g, '\n');
        if (update || !fs.existsSync(file)) {
          if (!update) { results.push({ name, status: 'missing', pass: false }); continue; }
          const existed = fs.existsSync(file);
          const same = existed && fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n') === got;
          if (!same) { ensureDir(path.dirname(file)); fs.writeFileSync(file, got); }
          results.push({ name, status: same ? 'kept' : (existed ? 'updated' : 'created'), pass: true });
        } else {
          const want = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
          const ok = want === got;
          if (!ok) writeOut('schedule', name + '.actual.csv', got);
          results.push({ name, status: ok ? 'pass' : 'fail', pass: ok, note: ok ? undefined : 'CSV differs from golden' });
        }
      }
      // the .json is the document itself (with a savedAt stamp) — not compared
    }
    if (pdfJobs.length) {
      rasterise(pdfJobs.map(({ pdf, png, dpi }) => ({ pdf, png, dpi })));
      for (const j of pdfJobs) results.push(checkGolden({ suite: 'schedule', name: j.name, image: decodePng(fs.readFileSync(j.png)), update, ...plan.tol }));
    }
    if (update) plan.record(results);
    results.push({ name: 'tolerance', status: 'pass', pass: true, note: plan.note });
  } finally {
    await srv.stop();
    fs.rmSync(tmp, { recursive: true, force: true });
  }
  return results;
}

// ---------------------------------------------------------------- run

export async function run({ browser, update, filter, loose }) {
  const results = [];
  // one studio crashing must not hide the other two
  for (const [label, fn] of [['poster', poster], ['print', print], ['schedule', schedule]]) {
    try { results.push(...await fn(browser, { update, filter, loose })); }
    catch (e) { results.push({ name: label + ' (crashed)', status: 'fail', pass: false, note: String((e && e.stack) || e) }); }
  }
  return results;
}
