// On-the-fly JSX compilation for the local Studio launchers.
//
// The Studios used to ship raw .jsx and let @babel/standalone compile it in
// the browser. That's gone (see scripts/build-studios.mjs) — index.html now
// asks for plain .js. The deployed site gets those .js from the build, but the
// .bat launchers serve public/<studio>/ straight off disk with no build step,
// so they compile the .jsx here instead.
//
// The .jsx stays the single source of truth. Whenever a .jsx exists we compile
// THAT and ignore any .js sitting beside it, so a stale build artefact can
// never be served in place of what you just edited — the property the old
// "local and live can never drift apart" comment was protecting.

const fs = require('fs');
const path = require('path');

// Must stay identical to JSX_TRANSFORM in scripts/build-studios.mjs. If these
// two drift, the Studio you test locally stops matching the one that deploys.
const JSX_TRANSFORM = {
  loader: 'jsx',
  target: 'esnext',
  jsx: 'transform',
  jsxFactory: 'React.createElement',
  jsxFragment: 'React.Fragment',
};

// esbuild ships with Vite, so it's already in node_modules. Resolved lazily
// and cached (including the failure) so a missing install costs one try.
let esbuild;
function loadEsbuild() {
  if (esbuild !== undefined) return esbuild;
  try {
    esbuild = require('esbuild');
  } catch {
    esbuild = null;
  }
  return esbuild;
}

// Deliver an error to the browser as *executable JS* rather than an HTTP 500:
// a 500 on a <script> tag fails silently and you get a blank Studio with
// nothing in the console. This way the reason shows up in devtools.
function errorScript(message) {
  return `console.error(${JSON.stringify('[Studio] ' + message)});\n`;
}

/**
 * If `filePath` is a .js whose .jsx source exists, compile and serve it.
 * Returns true when the request was handled, false to fall through to the
 * server's normal static handling.
 */
function serveCompiledJsx(filePath, res) {
  if (path.extname(filePath).toLowerCase() !== '.js') return false;

  const source = filePath.slice(0, -3) + '.jsx';
  if (!fs.existsSync(source)) return false;

  const send = (code) => {
    res.writeHead(200, {
      'Content-Type': 'application/javascript; charset=utf-8',
      // Always revalidate: this is a live-editing surface.
      'Cache-Control': 'no-store',
    });
    res.end(code);
  };

  const build = loadEsbuild();
  if (!build) {
    send(errorScript(
      `cannot compile ${path.basename(source)} — esbuild not found. ` +
      'Run "npm install" in the project root and restart the launcher.'
    ));
    return true;
  }

  try {
    const code = fs.readFileSync(source, 'utf8');
    const out = build.transformSync(code, {
      ...JSX_TRANSFORM,
      sourcefile: path.basename(source),
    });
    send(out.code);
  } catch (err) {
    // Syntax error in the .jsx — surface it instead of serving a broken page.
    const detail = (err && err.message) ? err.message : String(err);
    console.error(`\n  JSX error in ${path.basename(source)}:\n  ${detail}\n`);
    send(errorScript(`failed to compile ${path.basename(source)} — ${detail}`));
  }
  return true;
}

module.exports = { serveCompiledJsx, JSX_TRANSFORM };
