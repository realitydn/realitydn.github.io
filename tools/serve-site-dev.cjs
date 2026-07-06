// serve-site-dev.cjs — launch the site's vite dev server from a tool harness
// that can't quote spaced paths ("Main Reality Website" breaks npm.cmd arg
// splitting). Node spawning node sidesteps cmd.exe quoting entirely; vite runs
// with the repo root as cwd so config + entry resolve on the real (long) path.
const { spawn } = require('child_process');
const path = require('path');

const site = path.join(__dirname, '..');
const viteBin = path.join(site, 'node_modules', 'vite', 'bin', 'vite.js');

const child = spawn(process.execPath, [viteBin], { cwd: site, stdio: 'inherit' });
child.on('exit', (code) => process.exit(code ?? 0));
