// Pull a top-level `const NAME = <literal>` out of a studio source file and
// evaluate it — so the suites test the presets the app actually ships (the
// finish looks, the treatment presets) instead of a copy that can drift.
//
// Searches every .jsx/.js under the given folders, so the constants can move
// between files during the refactor without the tests noticing. Only plain
// data literals are supported (objects, arrays, strings, numbers, null, and
// references to other constants passed in `scope`).

import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './common.mjs';

function listSources(dirs) {
  const out = [];
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) { if (e.name !== 'vendor') walk(p); }
      // Sources only: skip a .js built from a sibling .jsx, and the Studio
      // bundles (*.bundle.js — build output of scripts/build-studios.mjs).
      else if (/\.bundle\.js$/.test(e.name)) continue;
      else if (/\.jsx$/.test(e.name) || (/\.js$/.test(e.name) && !fs.existsSync(p + 'x'))) out.push(p);
    }
  };
  dirs.forEach((d) => walk(path.join(ROOT, d)));
  return out;
}

// Index of the character that closes the bracket opened at `i`, skipping
// strings, template literals and comments.
function matchBracket(src, i) {
  const open = src[i], close = { '{': '}', '[': ']', '(': ')' }[open];
  let depth = 0;
  for (let k = i; k < src.length; k++) {
    const c = src[k];
    if (c === '/' && src[k + 1] === '/') { k = src.indexOf('\n', k); if (k < 0) break; continue; }
    if (c === '/' && src[k + 1] === '*') { k = src.indexOf('*/', k + 2) + 1; continue; }
    if (c === '"' || c === "'" || c === '`') {
      for (k++; k < src.length && src[k] !== c; k++) if (src[k] === '\\') k++;
      continue;
    }
    if (c === open) depth++;
    else if (c === close) { depth--; if (depth === 0) return k; }
  }
  throw new Error('unbalanced literal');
}

export function extractConst(name, { dirs = ['public/studio'], scope = {} } = {}) {
  const re = new RegExp('^const\\s+' + name + '\\s*=\\s*', 'm');
  for (const file of listSources(dirs)) {
    const src = fs.readFileSync(file, 'utf8');
    const m = re.exec(src);
    if (!m) continue;
    const start = m.index + m[0].length;
    const end = matchBracket(src, start);
    const text = src.slice(start, end + 1);
    const names = Object.keys(scope);
    // eslint-disable-next-line no-new-func
    const value = new Function(...names, '"use strict"; return (' + text + ');')(...names.map((n) => scope[n]));
    return { value, file: path.relative(ROOT, file).split(path.sep).join('/') };
  }
  throw new Error(`const ${name} not found under ${dirs.join(', ')} — did it move or get renamed? Update scripts/test-studios.`);
}
