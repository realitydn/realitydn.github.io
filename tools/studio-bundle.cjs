// The one recipe for turning a Studio's ES modules into the single script its
// index.html loads.
//
// Each Studio (Poster public/studio/, Print public/print/, Schedule
// public/schedule/) has an entry module, main.jsx, that imports its own files
// and the shared ones under public/studio-shared/. esbuild follows those
// imports and writes ONE classic-script bundle (an IIFE) beside index.html:
//
//   public/studio/studio.bundle.js      public/print/print.bundle.js
//   public/schedule/schedule.bundle.js  (+ .map when built; all gitignored)
//
// Two callers, one config — so the Studio you test locally is compiled exactly
// like the one that deploys:
//   · scripts/build-studios.mjs (prebuild) writes the bundles to disk;
//   · tools/serve-*.cjs (the .bat launchers) bundle in memory on every request,
//     so editing a .jsx and hitting refresh is still all it takes.
//
// What is NOT in the bundle, on purpose — index.html loads these as plain
// <script>s first, and the bundle reads them as globals:
//   · vendor/ (React, ReactDOM, html-to-image, jsPDF, JSZip, pdf-lib, fontkit)
//     — self-hosted UMD builds, never imported. (The QR encoder is the
//     exception: studio-shared/vendor/qrcode.cjs is imported by qr.js and
//     bundled as a CommonJS module — `.cjs` so it stays CJS under the root
//     package's "type":"module".) The JSX below compiles
//     to React.createElement against that global React.
//   · studio-shared/riso-press.js + riso-engine.js (window.RisoPress,
//     window.RISO). riso-press.js is vendored verbatim into the REALITY app
//     (its `sync:riso` script) and must stay a standalone UMD file; the engine
//     test harness (scripts/test-studios/harness/engine.html) loads both the
//     same way.

const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const STUDIOS = {
  studio: { dir: 'studio', bundle: 'studio.bundle.js' },
  print: { dir: 'print', bundle: 'print.bundle.js' },
  schedule: { dir: 'schedule', bundle: 'schedule.bundle.js' },
};

// JSX exactly as before the bundle: classic React.createElement calls against
// the global React (no automatic runtime, no import of react from npm).
const JSX = {
  jsx: 'transform',
  jsxFactory: 'React.createElement',
  jsxFragment: 'React.Fragment',
};

/** esbuild options for one Studio. `dev` → in-memory with an inline map. */
function bundleOptions(name, { dev = false } = {}) {
  const s = STUDIOS[name];
  if (!s) throw new Error('unknown studio: ' + name);
  return {
    absWorkingDir: ROOT,
    entryPoints: [path.join(ROOT, 'public', s.dir, 'main.jsx')],
    outfile: path.join(ROOT, 'public', s.dir, s.bundle),
    bundle: true,
    format: 'iife',
    platform: 'browser',
    target: 'es2019',
    loader: { '.jsx': 'jsx', '.js': 'js' },
    ...JSX,
    sourcemap: dev ? 'inline' : 'linked',
    write: !dev,
    logLevel: 'silent',
  };
}

// esbuild ships with Vite (and is a direct devDependency). Resolved lazily and
// cached, including the failure, so a missing install costs one try.
let esbuild;
function loadEsbuild() {
  if (esbuild !== undefined) return esbuild;
  try { esbuild = require('esbuild'); } catch { esbuild = null; }
  return esbuild;
}

function formatErrors(err) {
  const eb = loadEsbuild();
  if (eb && err && Array.isArray(err.errors) && err.errors.length) {
    return eb.formatMessagesSync(err.errors, { kind: 'error', color: false }).join('\n');
  }
  return (err && err.message) || String(err);
}

// Deliver an error to the browser as *executable JS* rather than an HTTP 500:
// a 500 on a <script> tag fails silently and you get a blank Studio with
// nothing in the console. This way the reason shows up in devtools.
function errorScript(message) {
  return `console.error(${JSON.stringify('[Studio] ' + message)});\n`;
}

/**
 * For the local servers: if `rel` (the request path, e.g. "/print.bundle.js")
 * is this Studio's bundle, build it in memory and send it. Returns true when
 * the request was handled.
 */
function serveBundle(name, rel, res) {
  const s = STUDIOS[name];
  if (rel !== '/' + s.bundle) return false;
  const send = (code) => {
    res.writeHead(200, {
      'Content-Type': 'application/javascript; charset=utf-8',
      // Always revalidate: this is a live-editing surface.
      'Cache-Control': 'no-store',
    });
    res.end(code);
  };
  const eb = loadEsbuild();
  if (!eb) {
    send(errorScript(`cannot build ${s.bundle} — esbuild not found. ` +
      'Run "npm install" in the project root and restart the launcher.'));
    return true;
  }
  try {
    const out = eb.buildSync(bundleOptions(name, { dev: true }));
    send(out.outputFiles[0].text);
  } catch (err) {
    // A syntax error or a broken import — surface it instead of a blank page.
    const detail = formatErrors(err);
    console.error(`\n  Could not build ${s.bundle}:\n${detail}\n`);
    send(errorScript(`failed to build ${s.bundle}\n${detail}`));
  }
  return true;
}

module.exports = { STUDIOS, bundleOptions, serveBundle, formatErrors, loadEsbuild };
