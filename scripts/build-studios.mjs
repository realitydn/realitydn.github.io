// Precompile the Studios' JSX so browsers never have to load Babel.
//
// The three Studios (Poster, Schedule, Print) are hand-rolled classic-script
// React apps that live in public/ and are copied verbatim into dist/ by Vite —
// they never went through the bundler. They used to ship raw .jsx and compile
// it in the browser with @babel/standalone: ~3 MB of Babel, plus a full
// transpile of ~260 KB of JSX, on every single page load. From Vietnam that
// cost seconds on every open.
//
// This turns each .jsx into a sibling .js at build time instead.
//
// Semantics are preserved exactly. esbuild's `transform` (NOT `bundle`) only
// rewrites JSX syntax into React.createElement calls — it does not wrap the
// file in a module, hoist anything, or rename bindings. Top-level `const`/
// `function` declarations stay top-level, so the files keep sharing global
// scope the way ordered classic scripts do, and the explicit
// `Object.assign(window, {...})` exports each library file ends with keep
// working untouched.
//
// Target is deliberately 'esnext' (no downlevelling). Babel was configured
// here with no data-presets, i.e. JSX only — matching that exactly means this
// change cannot alter runtime behaviour of any other syntax.
//
// Run by `npm run prebuild`. Local .bat launchers don't need it: the
// tools/serve-*.cjs dev servers transpile the same .jsx on the fly, so the
// .jsx files remain the single source of truth and local can never drift
// from live.

import { transform } from 'esbuild';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// studio-shared/ holds studio-ui.jsx — the control atoms Poster and Print both
// load. It compiles exactly like a Studio's own sources; it just isn't one.
const STUDIO_DIRS = ['studio', 'schedule', 'print', 'studio-shared'];

// Shared with tools/serve-*.cjs — keep the two in step. Any change to how a
// .jsx is compiled must apply to both the build and the local dev servers, or
// the Studio you test locally stops matching the one that deploys.
export const JSX_TRANSFORM = {
  loader: 'jsx',
  target: 'esnext',
  jsx: 'transform',
  jsxFactory: 'React.createElement',
  jsxFragment: 'React.Fragment',
};

async function compileDir(dir) {
  const abs = path.join(ROOT, 'public', dir);
  let entries;
  try {
    entries = await readdir(abs);
  } catch {
    return { dir, compiled: 0, skipped: true };
  }

  const sources = entries.filter((f) => f.endsWith('.jsx'));
  let compiled = 0;

  for (const file of sources) {
    const src = path.join(abs, file);
    const out = path.join(abs, file.replace(/\.jsx$/, '.js'));
    const code = await readFile(src, 'utf8');

    const result = await transform(code, {
      ...JSX_TRANSFORM,
      sourcefile: `${dir}/${file}`,
    });

    // Leading banner makes it obvious in devtools that this file is generated
    // and that the .jsx beside it is what you edit.
    const banner =
      `// GENERATED from ${file} by scripts/build-studios.mjs — do not edit.\n`;
    await writeFile(out, banner + result.code, 'utf8');
    compiled++;
  }

  return { dir, compiled, total: sources.length };
}

const results = await Promise.all(STUDIO_DIRS.map(compileDir));

let total = 0;
for (const r of results) {
  if (r.skipped) {
    console.warn(`  studios: public/${r.dir}/ not found — skipped`);
    continue;
  }
  total += r.compiled;
  console.log(`  studios: ${r.dir} — compiled ${r.compiled} .jsx → .js`);
}

if (total === 0) {
  console.error('  studios: no .jsx files compiled — is public/ intact?');
  process.exit(1);
}

console.log(`  studios: ${total} file(s) precompiled, Babel not needed at runtime`);
