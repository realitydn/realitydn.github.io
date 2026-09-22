// STUDIO SMOKE — does each studio load, and can you click everything in its
// top bar?
//
// For Poster, Print and Schedule, served by their own launchers
// (tools/serve-*.cjs) on test ports, at 1280, 1440 and 1920 wide:
//   · no page errors, no console errors (bar the ones the offline network
//     block causes — the feed, cloud, favicon);
//   · every control in the top bar hit-tests: elementFromPoint at its centre
//     lands on the control itself (or inside it), and the centre is on screen;
//   · at 1440, a few key panels render:
//       Poster   — select the photo → the treatment strip paints every tile,
//                  "The press" and "Proof" folds open without error;
//       Print    — ImageControls (the photo inspector) renders for every
//                  treatment, with its press sections;
//       Schedule — every output channel tab previews.

import { VIEWPORTS, isIgnorableConsoleError, preparePage, sleep, startStudioServer } from './lib/common.mjs';

const STUDIOS = [
  { id: 'studio', label: 'poster', query: '', top: '.rs-top' },
  { id: 'print', label: 'print', query: '', top: '.ps-top' },
  { id: 'schedule', label: 'schedule', query: '?seed=stress', top: '.ss-top' },
];

// Runs in the page. Controls = native controls, anything with a role/tabindex,
// the swatch chips, and anything the CSS marks clickable (cursor:pointer) —
// the studios wire React onClick onto plain divs. Nested hits collapse to the
// outermost clickable, so a <span> inside a <button> isn't tested twice.
function hitTestToolbar(sel) {
  const bar = document.querySelector(sel);
  if (!bar) return { missing: true };
  const CTRL = 'button,select,input:not([type=hidden]),textarea,a[href],[role=button],[tabindex],.rs-sw,.ps-sw,.ss-sw';
  const isCtrl = (el) => el.matches(CTRL) || getComputedStyle(el).cursor === 'pointer';
  const all = [...bar.querySelectorAll('*')].filter(isCtrl);
  const outer = all.filter((el) => { for (let p = el.parentElement; p && p !== bar; p = p.parentElement) if (all.includes(p)) return false; return true; });
  const W = window.innerWidth, H = window.innerHeight;
  const out = [];
  for (const el of outer) {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    if (r.width < 1 || r.height < 1 || cs.visibility === 'hidden' || cs.display === 'none') continue;   // hidden file inputs etc.
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    const name = (el.tagName.toLowerCase() + ' "' + ((el.getAttribute('title') || el.textContent || el.value || el.placeholder || '').trim().replace(/\s+/g, ' ').slice(0, 28)) + '"');
    if (x < 0 || y < 0 || x >= W || y >= H) { out.push({ name, ok: false, why: `centre off screen (${x | 0},${y | 0})` }); continue; }
    const hit = document.elementFromPoint(x, y);
    const ok = !!hit && (hit === el || el.contains(hit));
    const hitName = hit ? hit.tagName.toLowerCase() + (hit.className && typeof hit.className === 'string' ? '.' + hit.className.split(' ').join('.') : '') : 'nothing';
    out.push({ name, ok, why: ok ? '' : 'covered by ' + hitName });
  }
  return { controls: out };
}

async function waitForApp(page, sel) {
  await page.waitForSelector(sel, { timeout: 20000 });
  await page.evaluate(() => (document.fonts ? document.fonts.ready : null));
  await sleep(600);
}

// ---------------------------------------------------------------- panels

async function posterPanels(page) {
  const notes = [], info = [];
  // Select the photo: pointer down/up on the element that holds the press canvas.
  const picked = await page.evaluate(() => {
    const wraps = [...document.querySelectorAll('.rs-canvas [data-elid]')];
    const photo = wraps.find((w) => w.querySelector('canvas'));
    if (!photo) return null;
    const r = photo.getBoundingClientRect();
    const opts = { bubbles: true, clientX: r.left + 8, clientY: r.top + 8, pointerId: 1, button: 0, buttons: 1, isPrimary: true };
    photo.dispatchEvent(new PointerEvent('pointerdown', opts));
    window.dispatchEvent(new PointerEvent('pointerup', opts));
    return photo.getAttribute('data-elid');
  });
  if (!picked) return { notes: ['no photo element on the starter poster'] };
  await page.waitForSelector('.rs-treatgrid', { timeout: 5000 }).catch(() => {});
  // The strip paints after a debounce. Poll until every tile has ink on it
  // (a slow CI box just takes longer), then report whichever never did.
  const stripState = () => {
    const tiles = [...document.querySelectorAll('.rs-treatgrid canvas')];
    const blank = tiles.filter((c) => {
      if (!c.width || !c.height) return true;
      const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
      let lo = 765, hi = 0;
      for (let i = 0; i < d.length; i += 4 * 7) { const l = d[i] + d[i + 1] + d[i + 2]; if (l < lo) lo = l; if (l > hi) hi = l; }
      return hi - lo < 8;
    }).map((c) => (c.closest('button') || {}).title || '?');
    return { n: tiles.length, blank };
  };
  await page.waitForFunction(`(${stripState})().n >= 10 && (${stripState})().blank.length === 0`, { timeout: 15000, polling: 250 }).catch(() => {});
  const strip = await page.evaluate(stripState);
  info.push(`strip ${strip.n} tiles painted`);
  if (strip.n < 10) notes.push(`treatment strip shows ${strip.n} tiles`);
  if (strip.blank.length) notes.push(`blank strip tiles: ${strip.blank.join(', ')}`);
  for (const id of ['ph-sep-press', 'ph-sep-proof']) {
    const opened = await page.evaluate((id) => {
      const f = document.querySelector(`[data-fold="${id}"]`);
      if (!f) return 'missing';
      if (!f.classList.contains('open')) f.querySelector('button').click();
      return 'ok';
    }, id);
    if (opened !== 'ok') { notes.push(`fold ${id} ${opened}`); continue; }
    await sleep(250);
    const body = await page.evaluate((id) => {
      const f = document.querySelector(`[data-fold="${id}"]`);
      return f && f.classList.contains('open') ? f.querySelectorAll('input,button,select,.rs-sw').length : -1;
    }, id);
    if (body < 1) notes.push(`fold ${id} opened empty (${body})`);
    else info.push(`${id}: ${body} controls`);
  }
  return { notes, info };
}

async function printPanels(page) {
  // ImageControls (print-app.jsx) is a window global — one of the test hooks
  // print/main.jsx assigns; render it for every treatment into a scratch root.
  return page.evaluate(async () => {
    const notes = [], info = [];
    const host = document.createElement('div');
    host.style.cssText = 'position:absolute;left:-5000px;top:0;width:300px';
    document.body.appendChild(host);
    const treats = typeof IMG_TREATS !== 'undefined' ? IMG_TREATS : [];
    if (!treats.length) notes.push('IMG_TREATS not found');
    for (const t of treats) {
      const el = Object.assign(window.makeElement('image', 0, 0), { treatment: t.v }, (typeof IMG_TREAT_PRESETS !== 'undefined' && IMG_TREAT_PRESETS[t.v]) || {});
      const root = ReactDOM.createRoot(host);
      try {
        await new Promise((res, rej) => {
          class Guard extends React.Component {
            componentDidCatch(e) { rej(e); }
            render() { return this.props.children; }
          }
          root.render(React.createElement(Guard, null, React.createElement(window.ImageControls, { el, update: () => {}, onFile: () => {}, docAccent: 'pink' })));
          setTimeout(res, 120);
        });
        const txt = host.textContent;
        const n = host.querySelectorAll('input,button,select').length;
        if (n < 3) notes.push(`${t.v}: only ${n} controls`);
        info.push(t.v + ' ' + n);
        if (t.v === 'separation' && !(/The press/.test(txt) && /Proof/.test(txt))) notes.push('separation: no "The press"/"Proof" sections');
      } catch (e) {
        notes.push(`${t.v}: ${e && e.message || e}`);
      }
      root.unmount();
    }
    host.remove();
    return { notes, info: ['ImageControls: ' + info.join(', ')] };
  });
}

async function schedulePanels(page) {
  const notes = [], info = [];
  const tabs = await page.evaluate(() => {
    // the channel tabs are the buttons whose label matches a channel
    const labels = ['IG / FB', 'Stories', 'WhatsApp', 'Print', 'Daily'];
    return labels.filter((l) => [...document.querySelectorAll('button')].some((b) => b.textContent.trim().toLowerCase().startsWith(l.toLowerCase())));
  });
  if (tabs.length < 5) notes.push(`found ${tabs.length}/5 channel tabs`);
  for (const l of tabs) {
    await page.evaluate((l) => {
      const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim().toLowerCase().startsWith(l.toLowerCase()));
      b.click();
    }, l);
    await sleep(350);
    const ok = await page.evaluate(() => {
      // the preview is the largest element in the middle column
      const kids = [...document.querySelectorAll('div')].filter((d) => { const r = d.getBoundingClientRect(); return r.width > 250 && r.height > 250 && r.left > 250 && r.right < window.innerWidth - 250; });
      return kids.length > 0;
    });
    if (!ok) notes.push(`channel ${l}: no preview`);
    else info.push(l);
  }
  return { notes, info: ['previewed ' + info.join(', ')] };
}

// ---------------------------------------------------------------- run

export async function run({ browser, filter }) {
  const results = [];
  for (const s of STUDIOS) {
    if (filter && !filter.test(s.label)) continue;
    const srv = await startStudioServer(s.id);
    try {
      for (const vp of VIEWPORTS) {
        const name = `${s.label}@${vp.width}`;
        const { page, log } = await preparePage(browser, { viewport: vp });
        const notes = [];
        const info = [];
        try {
          await page.goto(srv.url + s.query, { waitUntil: 'networkidle0', timeout: 30000 });
          await waitForApp(page, s.top);
          const hit = await page.evaluate(hitTestToolbar, s.top);
          if (hit.missing) notes.push('top bar not found');
          else {
            info.push(hit.controls.length + ' top-bar controls hit-tested');
            if (hit.controls.length < 5) notes.push(`only ${hit.controls.length} top-bar controls found`);
            hit.controls.filter((c) => !c.ok).forEach((c) => notes.push(`toolbar ${c.name}: ${c.why}`));
          }
          if (vp.width === 1440) {
            const more = s.id === 'studio' ? await posterPanels(page) : s.id === 'print' ? await printPanels(page) : await schedulePanels(page);
            notes.push(...more.notes);
            info.push(...(more.info || []));
            await sleep(300);
          }
          if (log.fontMisses.length) notes.push('fonts not in tests/fixtures/fonts (run with --record-fonts): ' + log.fontMisses.join(' '));
        } catch (e) {
          notes.push('crashed: ' + ((e && e.message) || e));
        }
        log.pageErrors.forEach((e) => notes.push('page error: ' + e.split('\n')[0]));
        log.consoleErrors.filter((c) => !isIgnorableConsoleError(c)).forEach((c) => notes.push('console error: ' + c.text.slice(0, 200)));
        results.push({ name, status: notes.length ? 'fail' : 'pass', pass: !notes.length, note: notes.join('\n') || info.join(', ') });
        await page.close();
      }
    } finally {
      await srv.stop();
    }
  }
  return results;
}
