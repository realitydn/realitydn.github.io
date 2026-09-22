// Build the Studios' bundles so browsers never have to load Babel.
//
// The three Studios (Poster, Schedule, Print) are hand-rolled React apps that
// live in public/ and are copied verbatim into dist/ by Vite — they never go
// through Vite's own bundler. They used to ship raw .jsx and compile it in the
// browser with @babel/standalone (~3 MB of Babel plus a full transpile on
// every load); then a file-by-file JSX transform whose outputs index.html
// listed as a row of ordered classic <script>s sharing window globals.
//
// Now each Studio is ES modules with one entry, public/<studio>/main.jsx, and
// this script bundles it with esbuild into ONE classic script beside
// index.html (public/studio/studio.bundle.js, public/print/print.bundle.js,
// public/schedule/schedule.bundle.js, each with a linked .map). The bundler
// resolves every import, so a missing or renamed export fails the build
// instead of breaking a Studio at runtime. The recipe (IIFE, es2019, classic
// React.createElement JSX against the vendored global React) lives in
// tools/studio-bundle.cjs, shared with the local servers (tools/serve-*.cjs),
// which bundle the same entry in memory on every request — so the Studio you
// test locally is compiled exactly like the one that deploys.
//
// Run by `npm run prebuild`. The .bat launchers don't need it.
//
// Cache-busting is NOT done here. The bundle names are stable, so the deployed
// studio index.html files get ?v=<content hash> stamped onto every local
// script/stylesheet — but that happens on the dist/ copies, in the
// reality-studio-cache-bust plugin in vite.config.js, after Vite has copied
// public/ over. Stamping public/*/index.html here would rewrite tracked files
// on every build and leave the git tree dirty.
//
// esbuild is a direct devDependency in package.json (pinned to the version
// Vite ships) — this script imports it, so it mustn't rely on Vite pulling it
// in transitively.

import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { STUDIOS, bundleOptions, formatErrors } = require('../tools/studio-bundle.cjs');

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function bundle(name) {
  const opts = bundleOptions(name);
  try {
    await build(opts);
  } catch (err) {
    console.error(`  studios: ${name} — bundle FAILED\n${formatErrors(err)}`);
    process.exitCode = 1;
    return;
  }
  const kb = ((await stat(opts.outfile)).size / 1024).toFixed(0);
  console.log(`  studios: ${name} — ${path.relative(ROOT, opts.outfile).split(path.sep).join('/')} (${kb} KB)`);
}

await Promise.all(Object.keys(STUDIOS).map(bundle));

if (process.exitCode) {
  console.error('  studios: a bundle failed to build — see above');
  process.exit(1);
} else {
  console.log(`  studios: ${Object.keys(STUDIOS).length} Studio(s) built, Babel not needed at runtime`);
}
