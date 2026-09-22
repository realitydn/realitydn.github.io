/* docs/riso-press/harness-sides.cjs — shared plumbing for harness-compare.cjs
   and harness-diff.cjs. Not a CLI.

   Loads the riso engine TWICE into one puppeteer page: OLD from a git ref
   (git show <ref>:…) and NEW from the working tree, each inside its own
   sandbox so the two window.RISO / window.RisoPress never collide.

   Per side, in load order:
     public/studio-shared/riso-press.js   if present (the engine will depend on window.RisoPress)
     public/studio-shared/riso-engine.js  if present, else public/studio/riso-engine.js

   The sandbox: a side's files are concatenated into ONE function body whose
   parameters shadow `window`, `self` and `globalThis` with a namespace object —
   a Proxy that keeps writes (window.RISO = …) on itself and reads everything
   else (document, Image, OffscreenCanvas, devicePixelRatio…) from the real
   window. Bare `document` etc. still resolve lexically to the page. One body
   per side also lets a bare top-level declaration in riso-press.js reach the
   engine, the way two classic <script> tags would share it.

   Page side: window.__sides.old.RISO / window.__sides.new.RISO, and the
   helpers in window.__riso (render, diff, hasTreatment, loadImages).

   Dials come from TREAT_PRESETS / TREAT_LOOKS in public/studio/panels/photo-panel/looks.js
   (working tree), read by slicing the two object literals out of the source —
   the same tables feed both sides, since it is the engine under test. */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const REPO = path.resolve(__dirname, '../..');

/* the engine's fourteen, in the order its TREATMENTS map declares them */
const TREATMENTS14 = ['duotone', 'offregister', 'halftone', 'posterize', 'cutout', 'overprint', 'none',
                      'spot', 'dither', 'hatch', 'photocopy', 'contour', 'edges', 'mosaic'];
/* both papers, each proofed in the ink the harness spec names */
const PAPERS = [{ paper: 'day', ink: 'blue' }, { paper: 'night', ink: 'pink' }];
const TILE_ASPECT = 1.27;

const PRESS_PATH    = 'public/studio-shared/riso-press.js';
const ENGINE_SHARED = 'public/studio-shared/riso-engine.js';
const ENGINE_STUDIO = 'public/studio/riso-engine.js';
const APP_JSX       = 'public/studio/panels/photo-panel/looks.js';   // TREAT_PRESETS / TREAT_LOOKS since the Phase 3 split

/* ---------------------------------------------------------------- CLI ---- */
function parseArgs(argv, defaults, usage) {
  const out = Object.assign({}, defaults);
  const fail = m => { console.error(m + '\n\n' + usage); process.exit(2); };
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t === '-h' || t === '--help') { console.log(usage); process.exit(0); }
    if (!t.startsWith('--')) fail('unexpected argument: ' + t);
    let k = t.slice(2), v;
    const eq = k.indexOf('=');
    if (eq >= 0) { v = k.slice(eq + 1); k = k.slice(0, eq); }
    if (!(k in defaults)) fail('unknown option --' + k);
    if (typeof defaults[k] === 'boolean') out[k] = v == null ? true : v !== 'false';
    else {
      if (v == null) v = argv[++i];
      if (v == null) fail('--' + k + ' needs a value');
      out[k] = typeof defaults[k] === 'number' ? Number(v) : v;
    }
  }
  return out;
}
function splitList(s) { return String(s || '').split(',').map(x => x.trim()).filter(Boolean); }

/* ---------------------------------------------------------------- git ---- */
function git(args, opts) {
  return execFileSync('git', args, Object.assign({ cwd: REPO, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }, opts || {}));
}
function gitHas(ref, p) {
  try { git(['cat-file', '-e', ref + ':' + p], { stdio: 'ignore' }); return true; } catch (e) { return false; }
}
function gitShow(ref, p) { return git(['show', ref + ':' + p]); }
function gitShort(ref) { try { return git(['rev-parse', '--short', ref]).trim(); } catch (e) { return '?'; } }

/* ------------------------------------------- which files make up a side ---- */
function sideFiles(side, ref) {
  const files = [];
  if (side === 'new') {
    const has = p => fs.existsSync(path.join(REPO, p));
    const read = p => ({ path: p, text: fs.readFileSync(path.join(REPO, p), 'utf8') });
    if (has(PRESS_PATH)) files.push(read(PRESS_PATH));
    const eng = has(ENGINE_SHARED) ? ENGINE_SHARED : ENGINE_STUDIO;
    if (!has(eng)) throw new Error('new side: no engine at ' + ENGINE_SHARED + ' or ' + ENGINE_STUDIO);
    files.push(read(eng));
  } else {
    const read = p => ({ path: p, text: gitShow(ref, p) });
    if (gitHas(ref, PRESS_PATH)) files.push(read(PRESS_PATH));
    const eng = gitHas(ref, ENGINE_SHARED) ? ENGINE_SHARED : ENGINE_STUDIO;
    if (!gitHas(ref, eng)) throw new Error('old side: no engine at ' + ref + ':' + ENGINE_SHARED + ' or ' + ref + ':' + ENGINE_STUDIO);
    files.push(read(eng));
  }
  return files;
}

/* One script per side. `ns` is that side's namespace; the wrapper's parameters
   shadow every spelling of the global the files might publish through. */
function sandboxSource(side, files) {
  const body = files.map(f => '/* ==== ' + f.path + ' ==== */\n' + f.text.replace(/^﻿/, '') + '\n;\n').join('');
  return '(function(ns){ (function(window, self, globalThis){\n' + body +
    /* a file that declares its API as a bare top-level binding rather than
       assigning window.X still gets published to the namespace */
    ';(function(){ try{ if(typeof RisoPress!=="undefined" && window.RisoPress==null) window.RisoPress=RisoPress; }catch(e){}' +
    ' try{ if(typeof RISO!=="undefined" && window.RISO==null) window.RISO=RISO; }catch(e){} })();\n' +
    '}).call(ns, ns, ns, ns); })(window.__risoNS(' + JSON.stringify(side) + '));\n' +
    '//# sourceURL=riso-' + side + '.js';
}

/* -------------------------------------------- page-side boot + helpers ---- */
/* Serialised by puppeteer and run in the page: must reference nothing from
   this module. */
function pageBoot() {
  window.__sides = window.__sides || {};
  window.__risoNS = function (name) {
    if (window.__sides[name]) return window.__sides[name];
    const real = window, own = Object.create(null);
    const ns = new Proxy(own, {
      get(t, k) {
        if (k in t) return t[k];
        const v = real[k];
        /* web-API methods (no own .prototype) want the real window as `this`;
           constructors (Image, OffscreenCanvas, typed arrays) stay unbound so
           `new` keeps working */
        return (typeof v === 'function' && !Object.prototype.hasOwnProperty.call(v, 'prototype')) ? v.bind(real) : v;
      },
      set(t, k, v) { t[k] = v; return true; },
      has(t, k) { return (k in t) || (k in real); },
      deleteProperty(t, k) { return delete t[k]; }
    });
    /* window.window / window.self / window.globalThis stay inside the sandbox */
    own.window = ns; own.self = ns; own.globalThis = ns;
    window.__sides[name] = ns;
    return ns;
  };
  window.__imgs = {};
  window.__riso = {
    loadImages(map) {
      const jobs = Object.keys(map).filter(k => !window.__imgs[k]).map(k => new Promise((res, rej) => {
        const im = new Image();
        im.onload = () => { window.__imgs[k] = im; res(); };
        im.onerror = () => rej(new Error('photo "' + k + '" failed to decode'));
        im.src = map[k];
      }));
      return Promise.all(jobs).then(() => Object.keys(window.__imgs));
    },
    engine(side) {
      const ns = window.__sides[side], R = ns && ns.RISO;
      if (!R || typeof R.render !== 'function') throw new Error(side + ' side: window.RISO.render is not there');
      return R;
    },
    canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; },
    render(side, cv, photo, treatment, opts) {
      const R = this.engine(side), img = window.__imgs[photo];
      if (!img) throw new Error('photo "' + photo + '" not loaded');
      R.setSource(img);
      if (R.setSource2) R.setSource2(null);
      if (R.setTransform) R.setTransform({ scale: 1, x: 0, y: 0, rot: 0 });
      R.render(cv, treatment, opts);
      return cv;
    },
    /* pixels that differ in any channel, and the largest single-channel delta */
    diff(a, b) {
      const total = a.width * a.height;
      if (a.width !== b.width || a.height !== b.height) return { px: total, max: 255, total, sizeMismatch: true };
      const A = a.getContext('2d').getImageData(0, 0, a.width, a.height).data;
      const B = b.getContext('2d').getImageData(0, 0, b.width, b.height).data;
      let px = 0, max = 0;
      for (let i = 0; i < A.length; i += 4) {
        let d = 0;
        for (let c = 0; c < 4; c++) { const e = Math.abs(A[i + c] - B[i + c]); if (e > d) d = e; }
        if (d) { px++; if (d > max) max = d; }
      }
      return { px, max, total };
    },
    /* Does this side know a treatment by name? Use the registry when the
       engine exports one. Otherwise render it beside duotone: render() swaps
       duotone in for ANY unknown name, silently, so try/catch alone cannot tell. */
    hasTreatment(side, name, photo, opts) {
      try {
        const R = this.engine(side);
        if (R.TREATMENTS) return Array.isArray(R.TREATMENTS) ? R.TREATMENTS.includes(name) : !!R.TREATMENTS[name];
        const a = this.render(side, this.canvas(48, 61), photo, name, opts);
        const b = this.render(side, this.canvas(48, 61), photo, 'duotone', opts);
        return this.diff(a, b).px > 0;
      } catch (e) { return false; }
    }
  };
}

async function openPage() {
  const puppeteer = require('puppeteer');
  /* Software rasterisation only: Chrome's GPU-accelerated 2D canvas is not
     bit-repeatable (halftone re-rendered twice with the SAME code drifts by a
     dozen pixels at Δ1), which would make a zero-pixel gate lie. Both sides
     render in this one page, so the choice is fair to both. */
  const browser = await puppeteer.launch({
    headless: true, protocolTimeout: 10 * 60 * 1000,
    args: ['--no-sandbox', '--disable-gpu', '--disable-accelerated-2d-canvas', '--disable-gpu-compositing']
  });
  const page = await browser.newPage();
  page.on('pageerror', e => console.error('PAGEERR:', e.message));
  page.on('console', m => { if (m.type() === 'error') console.error('PAGE:', m.text()); });
  await page.setContent('<!doctype html><html><body></body></html>');
  await page.evaluate(pageBoot);
  return { browser, page };
}

/* Evaluate one side into its sandbox and prove it renders. Returns
   { side, files, label, treatments, press }. */
async function loadSide(page, side, ref) {
  const files = sideFiles(side, ref);
  await page.evaluate(sandboxSource(side, files));
  const info = await page.evaluate(side => {
    const R = window.__riso.engine(side);
    const T = R.TREATMENTS;
    return { treatments: T ? (Array.isArray(T) ? T.slice() : Object.keys(T)) : null,
             press: !!window.__sides[side].RisoPress, keys: Object.keys(R) };
  }, side);
  const where = side === 'new' ? 'working tree' : ref + '@' + gitShort(ref);
  const label = where + ' → ' + files.map(f => f.path).join(' + ');
  return Object.assign({ side, files, label }, info);
}

/* ------------------------------------------------------------- photos ---- */
function photoFile(key) {
  if (/[\\/]|\.(jpe?g|png|webp)$/i.test(key)) return path.isAbsolute(key) ? key : path.join(REPO, key);
  return path.join(REPO, 'public/images/gallery', key + '.jpg');
}
function photoDataURL(file) {
  const ext = path.extname(file).toLowerCase();
  const mime = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
  return 'data:' + mime + ';base64,' + fs.readFileSync(file).toString('base64');
}
async function loadPhotos(page, keys) {
  const map = {};
  for (const k of keys) map[k] = photoDataURL(photoFile(k));
  return page.evaluate(map => window.__riso.loadImages(map), map);
}

/* ------------------------------------------------------ preset tables ---- */
function extractTable(src, name) {
  const head = 'const ' + name + ' = {';
  const i = src.indexOf(head);
  if (i < 0) throw new Error(name + ' not found in ' + APP_JSX);
  const start = i + head.length - 1;
  const end = src.indexOf('\n};', start);
  if (end < 0) throw new Error(name + ': closing "};" not found');
  return new Function('return (' + src.slice(start, end + 2) + ');')();
}
function readTables() {
  const src = fs.readFileSync(path.join(REPO, APP_JSX), 'utf8').replace(/\r\n/g, '\n');
  return { presets: extractTable(src, 'TREAT_PRESETS'), looks: extractTable(src, 'TREAT_LOOKS') };
}
/* the rows a treatment gets: the bare preset, then (optionally) every named look */
function looksFor(tables, t, all) {
  const rows = [{ v: 'preset', l: 'Preset', p: {} }];
  if (all) for (const lk of (tables.looks[t] || [])) rows.push({ v: lk.v, l: lk.l, p: lk.p || {} });
  return rows;
}
/* what Poster Studio would send render(): baseline, then the look's patch, then
   ink + paper (drawPhotoPress builds it the same way) */
function renderOpts(tables, t, look, pp, extra) {
  return Object.assign({}, tables.presets[t] || {}, (look && look.p) || {}, { ink: pp.ink, paper: pp.paper }, extra || {});
}

function stamp() { return new Date().toISOString().slice(0, 10); }

module.exports = { REPO, TREATMENTS14, PAPERS, TILE_ASPECT, parseArgs, splitList, gitShort,
                   openPage, loadSide, loadPhotos, readTables, looksFor, renderOpts, stamp };
