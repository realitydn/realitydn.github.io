/* The ink strip / ink square — REALITY's second mark, the locked palette
   printed as a grid. Canon rev 22.08.26:
   design-system-year2/design_handoff_web_app_ink_pass/tokens/ink-strip.json.
   Geometry + motion CSS live in index.css (search "INK-MARK PASS").

   Props mirror the canon contract:
     form       strip-v | strip-h | strip-short-v | strip-short-h | square | square-anchored
     mode       full | majors | daycode | ink
     day        mon..sun          (daycode only)
     module     px — floors: strip 8, short 6, square 6
     voids      field-cell indices left open (max 3, never the stock cell)
     pass       A1 | A2 | A3      arrival (IntersectionObserver-gated)
     idle       "on" | "slow" | "off" — idle life; OFF beside any decision

   Invariants (load-bearing): cell ORDER is fixed — recolouring is the only
   parameter; the mark is decorative (aria-hidden, no UI job, no info); one
   mark per surface (the poster hero-strip + footer-QR-square pair is the
   single exception, and the home page is exactly that pair).

   Colours ride the site's theme-aware vars (--purple lifts in Night for
   free); stock stays substrate-pinned via --stock, never theme-aware. Ink
   cells are LITERAL ink — on a dark ground they drop out, and that open
   silhouette IS the Night form (G2). */

import { useEffect, useMemo, useRef } from 'react';

const MODES = {
  full: { bands: ['red', 'blue', 'yellow'], field: ['stock', 'ink', 'green', 'pink', 'purple', 'amber'], sq: ['stock', 'pink', 'purple', 'amber'] },
  majors: { bands: ['red', 'blue', 'yellow'], field: ['stock', 'ink', 'stock', 'ink', 'ink', 'stock'], sq: ['stock', 'ink', 'stock', 'ink'] },
  daycode: { bands: ['day', 'ink', 'day'], field: ['stock', 'day', 'ink', 'day', 'day', 'stock'], sq: ['stock', 'day', 'day', 'ink'] },
  ink: { bands: ['ink', 'stock', 'ink'], field: ['ink', 'stock', 'stock', 'ink', 'ink', 'stock'], sq: ['stock', 'ink', 'ink', 'ink'] },
};
const ANCHORED = ['stock', 'pink', 'green', 'ink'];
const DAY_VAR = {
  mon: 'var(--green)', tue: 'var(--blue)', wed: 'var(--purple)', thu: 'var(--pink)',
  fri: 'var(--red)', sat: 'var(--amber)', sun: 'var(--yellow)',
};
/* Screen timing — canon G4. Poster/print renderers keep the card's numbers. */
const PASS = {
  A1: { stagger: 95, cell: 430 },
  A2: { stagger: 46, cell: 300 },
  A3: { stagger: 0, cell: 420, whole: true },
};
const E_STAMP = 'cubic-bezier(.2,1.4,.45,1)';
const E_SNAP = 'cubic-bezier(.3,0,.2,1)';
const PULL = [{ transform: 'scale(1)' }, { transform: 'scale(0)' }];
const POP = [{ transform: 'scale(0)' }, { transform: 'scale(1.11)', offset: 0.62 }, { transform: 'scale(1)' }];

function cellNames(form, mode, voids) {
  const m = MODES[mode] || MODES.full;
  const square = form.startsWith('square');
  const short = form.includes('short');
  const field = square
    ? (form === 'square-anchored' && mode === 'full' ? ANCHORED : m.sq)
    : short ? m.field.slice(0, 2) : m.field;
  return { bands: m.bands, field: field.map((n, i) => (voids.includes(i) && n !== 'stock' ? 'void' : n)) };
}

function cellColor(name, day) {
  if (name === 'void') return 'transparent';
  if (name === 'stock') return 'var(--stock,#fffbf1)';
  if (name === 'day') return DAY_VAR[day] || '#0d0905';
  if (name === 'ink') return '#0d0905';
  return `var(--${name})`;
}

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function animate(el, frames, ms, ease) {
  if (el.__a) el.__a.cancel();
  el.__a = el.animate(frames, { duration: ms, easing: ease, fill: 'forwards' });
}

export default function InkMark({
  form = 'strip-h', mode = 'full', day = 'fri', module: modulePx = 9,
  voids = [], pass, idle = 'on', className = '',
}) {
  const ref = useRef(null);
  const { bands, field } = useMemo(() => cellNames(form, mode, voids), [form, mode, JSON.stringify(voids)]);
  const formClass = form.startsWith('square') ? 'im-square' : form.endsWith('-h') ? 'im-strip-h' : 'im-strip-v';
  const square = form.startsWith('square');

  /* Engine A — arrival, fires once when the mark scrolls into view. */
  useEffect(() => {
    const el = ref.current;
    if (!el || !pass || reducedMotion()) return undefined;
    let done = false;
    const run = () => {
      if (done) return;
      done = true;
      window.setTimeout(() => el.classList.add('run'), 160);
    };
    if (!('IntersectionObserver' in window)) { run(); return undefined; }
    const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && run()), { threshold: 0.12 });
    io.observe(el);
    return () => io.disconnect();
  }, [pass]);

  /* Idle life — one cell lifts and re-prints ITSELF (never a recolour: a hue
     changing on a timer would be saying something). Stops off-screen. */
  useEffect(() => {
    const el = ref.current;
    if (!el || idle === 'off' || reducedMotion()) return undefined;
    const every = idle === 'slow' ? 8200 : 5200;
    const spread = idle === 'slow' ? 3400 : 2600;
    const p = pass ? PASS[pass] : null;
    const passWait = p ? 160 + (p.whole ? 0 : 11 * p.stagger) + p.cell + 400 : 0;
    let live = false;
    let t = 0;
    let k = 0;
    const flat = [...bands, ...field];
    const beat = () => {
      const cells = Array.from(el.querySelectorAll(':scope > i, .sub > i'));
      const slots = flat.map((n, j) => (n !== 'void' ? j : -1)).filter((j) => j >= 0);
      if (slots.length) {
        const cell = cells[slots[k % slots.length]];
        k += 1;
        if (cell && cell.animate) {
          animate(cell, PULL, 260, E_SNAP);
          window.setTimeout(() => animate(cell, POP, 380, E_STAMP), 260);
        }
      }
      if (live) t = window.setTimeout(beat, every + Math.random() * spread);
    };
    const start = () => { if (!live) { live = true; t = window.setTimeout(beat, passWait + 900 + Math.random() * spread); } };
    const stop = () => { live = false; window.clearTimeout(t); };
    if (!('IntersectionObserver' in window)) { start(); return stop; }
    const io = new IntersectionObserver((es) => es.forEach((e) => (e.isIntersecting ? start() : stop())), { threshold: 0.12 });
    io.observe(el);
    return () => { stop(); io.disconnect(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idle, pass]);

  const p = pass ? PASS[pass] : null;
  const stagger = p && !p.whole ? p.stagger : 0;
  const style = { '--m': `${modulePx}px`, ...(p ? { '--pd': `${p.cell}ms` } : null) };
  const cellStyle = (name, j) => ({ '--k': cellColor(name, day), ...(p ? { '--d': `${j * stagger}ms` } : null) });

  return (
    <span
      ref={ref}
      className={['im', formClass, p ? 'pp' : '', p && p.whole ? 'pp-whole' : '', className].filter(Boolean).join(' ')}
      style={style}
      aria-hidden="true"
    >
      {bands.map((n, j) => <i key={`b${j}`} className="b" style={cellStyle(n, j)} />)}
      {square ? (
        <span className="sub">
          {field.map((n, j) => <i key={`f${j}`} style={cellStyle(n, bands.length + j)} />)}
        </span>
      ) : (
        field.map((n, j) => <i key={`f${j}`} style={cellStyle(n, bands.length + j)} />)
      )}
    </span>
  );
}
