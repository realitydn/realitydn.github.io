import React, { useEffect, useRef, useState } from 'react';

/**
 * BandField — the Press Loop, on the live coloured bands.
 *
 * Tuned on design-system-year2/band-motion-lab.html and adopted from there;
 * that page stays the bench if the numbers need moving again.
 *
 * The band's base is UNPRINTED STOCK and the colour is laid on it in blocks,
 * with the content sitting above in ink. That is what makes a permanent loop
 * safe under copy: every cell is ink-on-colour or ink-on-cream at every
 * instant, so there is no frame where a word is lost. The palette is the
 * three majors plus stock — ink is deliberately not in it, because an ink
 * block under ink type is the one fill that would cost a word.
 *
 * ROLE = COLOUR still holds: `lead` is the band's own role ink and carries
 * the field, so the blue wayfinding bands still read blue and the red act
 * band still reads red. The mosaic is the same recipe rotated, not a
 * different band.
 *
 * The flat band is the default and the fallback. This component renders
 * NOTHING until it has decided to run, so the pre-rendered HTML, a crawler,
 * a reduced-motion visitor and anyone without JS all get the plain coloured
 * band that shipped before it.
 */

const INKS = { blue: '#18a7e0', red: '#ed2224', yellow: '#fddf00', stock: '#fffbf1' };
const KEYS = ['blue', 'red', 'yellow', 'stock'];

/* The tuned config. Weights are expressed by ROLE — the band's own ink
   leads, so one recipe serves every coloured band. */
const CFG = {
  cols: 12, rows: 6, jitter: 0,
  cycle: 11000, stagger: 530, hold: 0.3,
  lead: 7, second: 2, third: 1, stock: 0,
};
const SECOND = { blue: 'yellow', red: 'yellow', yellow: 'red' };
const THIRD  = { blue: 'red',    red: 'blue',   yellow: 'blue' };

/* The band these numbers were authored against. Columns and rows are really
   a BLOCK SIZE — 12x6 is a 120x91px block — and it is the block that has to
   survive a phone, not the column count. Holding 12 columns on a 390px band
   would give 33px-wide cells against ~100px rows: slivers, not blocks. */
const REF_W = 1440, REF_H = 545;

/* Canon easing, solved rather than approximated: --ease-stamp overshoots
   past 1, which is the whole point of it. */
function bez(x1, y1, x2, y2) {
  const A = (a, b) => 1 - 3 * b + 3 * a, B = (a, b) => 3 * b - 6 * a, C = (a) => 3 * a;
  const calc = (t, a, b) => ((A(a, b) * t + B(a, b)) * t + C(a)) * t;
  const slope = (t, a, b) => 3 * A(a, b) * t * t + 2 * B(a, b) * t + C(a);
  return (x) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i++) {
      const s = slope(t, x1, x2); if (Math.abs(s) < 1e-6) break;
      const e = calc(t, x1, x2) - x; if (Math.abs(e) < 1e-7) break;
      t -= e / s;
    }
    return calc(t, y1, y2);
  };
}
const EASE_STAMP = bez(0.2, 1.4, 0.45, 1);
const EASE_SNAP = bez(0.3, 0, 0.2, 1);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

/* The un-print has to have frames to happen in, or a block would visibly pop
   from its old colour to its new one instead of swapping while invisible. */
const MIN_SWAP = 220;

/**
 * hold ──▶ un-print ─┬─ re-print ──▶ (repeat)
 *                    └─ RECOLOUR here, at zero
 * `a` is how printed a block is, past 1 while the stamp overshoots.
 */
function phase(delay, t) {
  const cyc = CFG.cycle;
  const h = Math.min(CFG.hold, Math.max(0, 1 - MIN_SWAP / cyc));
  const rel = t - delay;
  const idx = Math.floor(rel / cyc);
  const u = (((rel % cyc) + cyc) % cyc) / cyc;
  if (u < h) return { a: 1, idx, inbound: false };
  const v = (u - h) / (1 - h);
  if (v < 0.45) return { a: 1 - EASE_SNAP(v / 0.45), idx, inbound: false };
  return { a: EASE_STAMP((v - 0.45) / 0.55), idx, inbound: true };
}

function pickColour(lead) {
  const w = {
    [lead]: CFG.lead,
    [SECOND[lead]]: CFG.second,
    [THIRD[lead]]: CFG.third,
    stock: CFG.stock,
  };
  let total = 0;
  for (const k of KEYS) total += Math.max(0, w[k] || 0);
  if (total <= 0) return lead;
  let r = Math.random() * total;
  for (const k of KEYS) {
    r -= Math.max(0, w[k] || 0);
    if (r <= 0) return k;
  }
  return lead;
}

/* ---- one shared ticker for every band on the page ---- */
const rigs = new Set();
let raf = null, clock = 0, last = 0;
function frame(now) {
  raf = requestAnimationFrame(frame);
  const dt = last ? Math.min(now - last, 80) : 16;   /* a backgrounded tab must not jump */
  last = now;
  clock += dt;
  rigs.forEach((r) => { if (r.visible) paint(r, clock); });
}
function start() { if (raf === null) { last = 0; raf = requestAnimationFrame(frame); } }
function stop() { if (raf !== null) { cancelAnimationFrame(raf); raf = null; } }

function layout(rig) {
  const el = rig.el;
  const w = el.clientWidth || REF_W, h = el.clientHeight || REF_H;
  const cols = clamp(Math.round(w / (REF_W / CFG.cols)), 1, 40);
  const rows = clamp(Math.round(h / (REF_H / CFG.rows)), 1, 40);

  let html = '';
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      html += `<i style="left:${(c / cols) * 100}%;top:${(r / rows) * 100}%;` +
              `width:calc(${100 / cols}% + 1px);height:calc(${100 / rows}% + 1px)"></i>`;
    }
  }
  el.innerHTML = html;

  rig.cells = [];
  const nodes = Array.from(el.children);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      rig.cells.push({
        node: nodes[r * cols + c],
        delay: (r + c) * CFG.stagger,          /* diagonal wave */
        col: pickColour(rig.lead),
        mark: -1,
      });
    }
  }
  paint(rig, clock);                            /* never leave the band unpainted */
}

function paint(rig, t) {
  /* First frame back after this band was paused off screen. The clock kept
     running without it, so this draw jumps the phase forward — and a block
     landing mid-print would take its new colour at a visible size. Adopt the
     current cycle instead: colours carry over untouched. */
  const resync = rig.resync; rig.resync = false;
  for (const cell of rig.cells) {
    const p = phase(cell.delay, t);
    if (p.inbound && cell.mark !== p.idx) {
      cell.mark = p.idx;
      if (!resync) cell.col = pickColour(rig.lead);
    }
    const col = INKS[cell.col];
    if (cell.node._c !== col) { cell.node.style.background = col; cell.node._c = col; }
    cell.node.style.transform = `scale(${p.a.toFixed(4)})`;
  }
}

export default function BandField({ lead = 'blue' }) {
  const ref = useRef(null);
  const [live, setLive] = useState(false);

  /* Decide once, on the client. Anything that says "do not animate" leaves
     the band exactly as it shipped before: a flat panel of its role colour. */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.__PRERENDER__) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    setLive(true);
  }, []);

  useEffect(() => {
    if (!live || !ref.current) return;
    const el = ref.current;
    const band = el.closest('.band');
    if (band) band.classList.add('band-live');

    const rig = { el, lead, cells: [], visible: false, resync: true };
    layout(rig);
    rigs.add(rig);

    /* Ambient runs forever, so it must not run where nobody is looking. */
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !rig.visible) rig.resync = true;
        rig.visible = e.isIntersecting;
      },
      { rootMargin: '100px' }
    );
    io.observe(band || el);

    let rt;
    const ro = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(() => { clearTimeout(rt); rt = setTimeout(() => layout(rig), 180); })
      : null;
    if (ro) ro.observe(band || el);

    const vis = () => {
      if (document.hidden) { stop(); }
      else { last = 0; rigs.forEach((r) => { r.resync = true; }); start(); }
    };
    document.addEventListener('visibilitychange', vis);
    start();

    return () => {
      io.disconnect();
      if (ro) ro.disconnect();
      clearTimeout(rt);
      document.removeEventListener('visibilitychange', vis);
      rigs.delete(rig);
      if (!rigs.size) stop();
      if (band) band.classList.remove('band-live');
      el.innerHTML = '';
    };
  }, [live, lead]);

  if (!live) return null;
  return <div className="band-fld" ref={ref} aria-hidden="true" />;
}
