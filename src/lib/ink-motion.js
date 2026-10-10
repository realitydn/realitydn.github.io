// REALITY ink strip motion engine — the 29 motion-lab scores (10.10.26).
// GENERATED from the app's src/lib/ink-motion by
// reality-app/scripts/gen-website-ink-motion.mjs — DO NOT EDIT HERE. Edit the
// app's scores and re-run the generator so both surfaces play the same marks.
var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

// src/lib/ink-motion/scores.ts
var seg = (start, end) => ({ start, span: end - start });
var FULL = seg(0, 1);
var CELL_COLOR = {
  R: "var(--color-red)",
  B: "var(--color-blue)",
  Y: "var(--color-yellow)",
  G: "var(--color-green)",
  P: "var(--color-pink)",
  A: "var(--color-amber)",
  U: "var(--color-purple)",
  K: "#0d0905",
  S: "transparent"
};
var E = {
  snap: "cubic-bezier(.3,0,.2,1)",
  stamp: "cubic-bezier(.2,1.4,.45,1)",
  io: "cubic-bezier(.65,0,.35,1)",
  lin: "linear",
  out: "cubic-bezier(.2,.8,.2,1)",
  in: "cubic-bezier(.6,0,.9,.4)",
  el: "cubic-bezier(.3,1.3,.5,1)",
  spring: "cubic-bezier(.3,1.6,.5,1)",
  step: "steps(1,end)"
};
var Rr = (x, y, w, h) => ({ x, y, w, h });
var colAt = (x, y) => x < 2 ? "R" : x < 4 ? "B" : x < 6 ? "Y" : [["S", "K"], ["G", "P"], ["U", "A"]][x - 6][y];
var sc = (r, s) => Rr(r.x + r.w * (1 - s) / 2, r.y + r.h * (1 - s) / 2, r.w * s, r.h * s);
var ab = (r, s, cx = 4.5) => Rr(cx + (r.x - cx) * s, 1 + (r.y - 1) * s, r.w * s, r.h * s);
var mv = (r, dx, dy) => Rr(r.x + dx, r.y + dy, r.w, r.h);
var hr = ([x, y]) => Rr(x / 2, y / 2, 0.5, 0.5);
var F = (t, r, e) => ({ t, r, e });
var P = (c, f, z) => z == null ? { c, f } : { c, f, z };
var CELLS = [
  ["R", 0, 0, 2, 2],
  ["B", 2, 0, 2, 2],
  ["Y", 4, 0, 2, 2],
  ["S", 6, 0, 1, 1],
  ["K", 6, 1, 1, 1],
  ["G", 7, 0, 1, 1],
  ["P", 7, 1, 1, 1],
  ["U", 8, 0, 1, 1],
  ["A", 8, 1, 1, 1]
].map(([c, x, y, w, h]) => ({ c, r: Rr(x, y, w, h) }));
var geo = (w) => {
  const cells = CELLS.slice(0, 3 + 2 * (w - 6));
  const mods = [];
  for (let x = 0; x < w; x++) for (let y = 0; y < 2; y++) mods.push({ c: colAt(x, y), r: Rr(x, y, 1, 1) });
  const cols = Array.from({ length: w }, (_, x) => ({
    x,
    p: x < 6 ? [{ c: colAt(x, 0), r: Rr(x, 0, 1, 2) }] : [{ c: colAt(x, 0), r: Rr(x, 0, 1, 1) }, { c: colAt(x, 1), r: Rr(x, 1, 1, 1) }]
  }));
  const rows = [];
  for (const y of [0, 1]) {
    for (const x of [0, 2, 4]) rows.push({ c: colAt(x, y), r: Rr(x, y, 2, 1), y });
    for (let x = 6; x < w; x++) rows.push({ c: colAt(x, y), r: Rr(x, y, 1, 1), y });
  }
  return { cells, mods, cols, rows };
};
var HALF = [];
for (let hx = 0; hx < 18; hx++) for (let hy = 0; hy < 4; hy++) HALF.push({ c: colAt(hx >> 1, hy >> 1), r: Rr(hx / 2, hy / 2, 0.5, 0.5), hx, hy });
var segs = (n) => {
  const out = [], h = 2 / n;
  for (let k = 0; k < n; k++) {
    const y = k * h, my = y < 1 ? 0 : 1;
    for (const [x, w] of [[0, 2], [2, 2], [4, 2], [6, 1], [7, 1], [8, 1]]) out.push({ c: colAt(x, my), r: Rr(x, y, w, h), k });
  }
  return out;
};
var ks = (o, l) => P(o.c, [F(0, o.r, E.io), ...l.map(([t, r]) => F(t, r != null ? r : o.r, E.io)), F(1, o.r)]);
var rng = (seed) => {
  let s = seed;
  return () => {
    s = s + 1831565813 | 0;
    let t = Math.imul(s ^ s >>> 15, 1 | s);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
};
var shuffleRows = (seed, cols = 18, rows = 4) => {
  const rand = rng(seed), out = [];
  for (let hy = 0; hy < rows; hy++) {
    const xs = [...Array(cols).keys()];
    for (let i = cols - 1; i > 0; i--) {
      const k = Math.floor(rand() * (i + 1));
      [xs[i], xs[k]] = [xs[k], xs[i]];
    }
    out.push(xs);
  }
  return out;
};
var cellsOf = (w, g) => {
  const o = [], C = Math.round(w / g), Rn = Math.round(2 / g);
  for (let cx = 0; cx < C; cx++) for (let cy = 0; cy < Rn; cy++)
    o.push({ c: colAt(Math.floor(cx * g + 1e-9), Math.floor(cy * g + 1e-9)), r: Rr(cx * g, cy * g, g, g), cx, cy });
  return o;
};
var columnsOf = (w, g) => Array.from({ length: Math.round(w / g) }, (_, cx) => {
  const x = cx * g, mx = Math.floor(x + 1e-9);
  return { cx, p: mx < 6 ? [{ c: colAt(mx, 0), r: Rr(x, 0, g, 2) }] : [{ c: colAt(mx, 0), r: Rr(x, 0, g, 1) }, { c: colAt(mx, 1), r: Rr(x, 1, g, 1) }] };
});
var rowsOf = (w, n) => {
  const out = [], h = 2 / n;
  for (let k = 0; k < n; k++) {
    const y = k * h, my = y < 1 ? 0 : 1;
    for (const [x, ww] of [[0, 2], [2, 2], [4, 2]]) out.push({ c: colAt(x, my), r: Rr(x, y, ww, h), k });
    for (let x = 6; x < w; x++) out.push({ c: colAt(x, my), r: Rr(x, y, 1, h), k });
  }
  return out;
};
var HW = ["half", "whole"];
var VARIANTS = [
  /* Handoff — each band swells over its neighbour, then gives the space back. */
  {
    id: 4,
    name: "Handoff",
    dur: 3400,
    grid: "whole",
    short: true,
    uses: { wait: "loop", trans: FULL, amb: FULL },
    make: (w = 9) => geo(w).cells.map((o, j) => {
      if (j == 0) return ks(o, [[0.04], [0.16, Rr(0, 0, 4, 2)], [0.2, Rr(0, 0, 4, 2)], [0.32]]);
      if (j == 1) return ks(o, [[0.04], [0.16, Rr(4, 0, 0, 2)], [0.2, Rr(4, 0, 0, 2)], [0.32], [0.36], [0.48, Rr(2, 0, 4, 2)], [0.52, Rr(2, 0, 4, 2)], [0.64]]);
      if (j == 2) return ks(o, [[0.36], [0.48, Rr(6, 0, 0, 2)], [0.52, Rr(6, 0, 0, 2)], [0.64], [0.68], [0.8, Rr(4, 0, w - 4, 2)], [0.84, Rr(4, 0, w - 4, 2)], [0.96]]);
      const z = Rr(w, o.r.y, 0, 1);
      return ks(o, [[0.68], [0.8, z], [0.84, z], [0.96]]);
    })
  },
  /* Snake — one blocky line draws the strip boustrophedon, then erases it. */
  {
    id: 6,
    name: "Snake",
    dur: 3600,
    grid: "whole",
    short: true,
    uses: { wait: "loop", prog: seg(0, 0.47), gest: seg(0, 0.47), amb: seg(0.47, 1.47) },
    make: (w = 9) => {
      const path = [];
      for (let c = 0; c < w; c++) path.push(...c % 2 ? [[c, 1], [c, 0]] : [[c, 0], [c, 1]]);
      const st = 0.4 / (2 * w);
      return path.map(([x, y], i) => {
        const first = i % 2 == 0, full = Rr(x, y, 1, 1);
        const a = first ? Rr(x, y, 0, 1) : Rr(x, 1, 1, 0), b = first ? Rr(x, 1, 1, 0) : Rr(x + 1, y, 0, 1);
        const t0 = 0.04 + i * st, e0 = 0.54 + i * st;
        return P(colAt(x, y), [F(0, a), F(t0, a, E.lin), F(t0 + st, full), F(e0, full, E.lin), F(e0 + st, b), F(1, b)]);
      });
    }
  },
  /* Conveyor — every module rides the strip's perimeter one step at a time. */
  {
    id: 13,
    name: "Conveyor",
    dur: 5400,
    grid: "whole",
    short: true,
    uses: { wait: "loop", amb: FULL },
    make: (w = 9) => {
      const ring = [], n = 2 * w;
      for (let x = 0; x < w; x++) ring.push([x, 0]);
      for (let x = w - 1; x >= 0; x--) ring.push([x, 1]);
      return geo(w).mods.map((o) => {
        const i = ring.findIndex(([x, y]) => x == o.r.x && y == o.r.y), f = [];
        for (let k = 0; k < n; k++) {
          const a = ring[(i + k) % n], b = ring[(i + k + 1) % n];
          f.push(F(k / n, Rr(a[0], a[1], 1, 1), E.snap), F(k / n + 0.6 / n, Rr(b[0], b[1], 1, 1)));
        }
        f.push(F(1, o.r));
        return P(o.c, f);
      });
    }
  },
  /* Weave — half-height rows slide against each other like knitting. */
  {
    id: 25,
    name: "Weave",
    dur: 3600,
    grid: "half",
    grains: HW,
    short: true,
    clip: "strip",
    uses: { wait: "loop", amb: FULL },
    make: (w = 9, g = 0.5) => {
      const S = [0, 1, 2, 3, 4, 3, 2, 1, 0, 0], out = [];
      rowsOf(w, Math.round(2 / g)).forEach((o) => [-w, 0, w].forEach((cp) => {
        const d = o.k % 2 ? -1 : 1;
        out.push(P(o.c, [...S.map((s, i) => F(i / 10, mv(o.r, cp + d * s * g, 0), E.snap)), F(1, mv(o.r, cp, 0))]));
      }));
      return out;
    }
  },
  /* Inchworm — the strip squeezes and stretches its way across, wrapping. */
  {
    id: 34,
    name: "Inchworm",
    dur: 4400,
    grid: "whole",
    clip: "strip",
    short: true,
    uses: { wait: "loop", amb: FULL },
    make: (w = 9) => {
      const sp = [], out = [];
      for (let i = 0; i < 4; i++) {
        const a = 3 * i, t = i / 4;
        sp.push([t, a, a + w, E.io], [t + 0.1, a + 3, a + w, E.el], [t + 0.13, a + 3, a + w, E.el], [t + 0.23, a + 3, a + w + 3, E.io]);
      }
      sp.push([1, 12, 12 + w]);
      [-12, 0].forEach((cp) => geo(w).cells.forEach((o) => out.push(P(o.c, sp.map(([t, a, b, e]) => {
        const k = (b - a) / w;
        return F(t, Rr(cp + a + o.r.x * k, o.r.y, o.r.w * k, o.r.h), e);
      })))));
      return out;
    }
  },
  /* Gears — two belts of half-cells counter-rotate, meshing at the midline. */
  {
    id: 35,
    name: "Gears",
    dur: 5400,
    grid: "half",
    uses: { wait: "loop", amb: FULL },
    make: () => {
      const T = [], B = [];
      for (let x = 0; x < 18; x++) {
        T.push([x, 0]);
        B.push([x, 2]);
      }
      for (let x = 17; x >= 0; x--) {
        T.push([x, 1]);
        B.push([x, 3]);
      }
      return HALF.map((o) => {
        const ring = o.hy < 2 ? T : B, dir = o.hy < 2 ? 1 : -1;
        const i = ring.findIndex(([x, y]) => x == o.hx && y == o.hy), f = [];
        const at = (k) => ring[((i + dir * k) % 36 + 36) % 36];
        for (let k = 0; k < 36; k++) f.push(F(k / 36, hr(at(k)), E.snap), F(k / 36 + 0.6 / 36, hr(at(k + 1))));
        f.push(F(1, o.r));
        return P(o.c, f);
      });
    }
  },
  /* Fold — strip folds into the ink square (the app icon) and back. Its
     arrival is the second half: icon → strip. */
  {
    id: 2,
    name: "Fold",
    dur: 3600,
    grid: "whole",
    uses: { arrive: seg(0.6, 0.96), trans: FULL, amb: FULL, wait: "loop" },
    make: () => {
      const T = { R: Rr(2.5, -1, 2, 2), B: Rr(4.5, -1, 2, 2), Y: Rr(2.5, 1, 2, 2), S: Rr(4.5, 1, 1, 1), P: Rr(5.5, 1, 1, 1), U: Rr(4.5, 2, 1, 1), A: Rr(5.5, 2, 1, 1) };
      return CELLS.map((o, j) => {
        const t = T[o.c];
        if (!t) return P(o.c, [F(0, o.r), F(0.08, o.r, E.snap), F(0.18, sc(o.r, 0)), F(0.8, sc(o.r, 0), E.stamp), F(0.92, o.r), F(1, o.r)]);
        const s = j * 0.012, s2 = (8 - j) * 0.012;
        return P(o.c, [F(0, o.r), F(0.1 + s, o.r, E.io), F(0.38 + s, t), F(0.6 + s2, t, E.io), F(0.86 + s2, o.r), F(1, o.r)]);
      });
    }
  },
  /* Zip — top row in from the left, bottom from the right, teeth first. */
  {
    id: 12,
    name: "Zip",
    dur: 3200,
    grid: "whole",
    short: true,
    clip: "strip",
    uses: { arrive: seg(0, 0.42), trans: seg(0.58, 1.42), gest: seg(0, 0.42), wait: "loop", amb: seg(0.58, 1.42) },
    make: (w = 9) => geo(w).rows.map((o) => {
      const L = o.y ? w + 1 : -(w + 1), s = (o.y ? o.r.x : w - 1 - o.r.x) * 0.014, a = mv(o.r, L, 0), b = mv(o.r, -L, 0);
      return P(o.c, [F(0, a), F(0.04 + s, a, "cubic-bezier(.15,.9,.25,1)"), F(0.3 + s, o.r), F(0.58 + s, o.r, "cubic-bezier(.6,0,.85,.3)"), F(0.8 + s, b, E.step), F(1, a)]);
    })
  },
  /* Pour — the ink square streams half-cell by half-cell into the strip. */
  {
    id: 36,
    name: "Pour",
    dur: 4400,
    grid: "half",
    uses: { arrive: seg(0, 0.58), wait: "loop" },
    make: () => {
      const SQ = { R: [2.5, -1], B: [4.5, -1], Y: [2.5, 1], S: [4.5, 1], P: [5.5, 1], U: [4.5, 2], A: [5.5, 2] };
      const cellOf = (o) => CELLS.find((c) => o.hx / 2 >= c.r.x && o.hx / 2 < c.r.x + c.r.w && o.hy / 2 >= c.r.y && o.hy / 2 < c.r.y + c.r.h);
      return HALF.map((o) => {
        const c = cellOf(o), q = SQ[c.c], z = sc(o.r, 0);
        if (!q) return P(o.c, [F(0, z), F(0.5, z, E.stamp), F(0.56, o.r), F(0.7, o.r, E.snap), F(0.76, z), F(1, z)]);
        const s = Rr(q[0] + o.hx / 2 - c.r.x, q[1] + o.hy / 2 - c.r.y, 0.5, 0.5), t = 0.08 + (o.hx * 4 + o.hy) * 5e-3;
        return P(o.c, [F(0, s), F(t, s, E.io), F(t + 0.12, o.r), F(0.7, o.r, E.io), F(0.86, s), F(1, s)]);
      });
    }
  },
  /* Interlace — half rows thread in from alternate sides. */
  {
    id: 37,
    name: "Interlace",
    dur: 3200,
    grid: "half",
    clip: "strip",
    uses: { arrive: seg(0, 0.47), trans: seg(0.62, 1.47), gest: seg(0, 0.47), wait: "loop" },
    make: () => segs(4).map((o) => {
      const ev = o.k % 2 == 0, a = mv(o.r, ev ? -10 : 10, 0), b = mv(o.r, ev ? 10 : -10, 0);
      const ta = 0.06 + o.k * 0.08, te = 0.62 + o.k * 0.05;
      return P(o.c, [F(0, a), F(ta, a, E.out), F(ta + 0.16, o.r), F(te, o.r, E.in), F(te + 0.12, b, E.step), F(1, a)]);
    })
  },
  /* Iris — half-cells stamp in from the centre outward. */
  {
    id: 38,
    name: "Iris",
    dur: 3e3,
    grid: "half",
    grains: HW,
    short: true,
    uses: { arrive: seg(0, 0.42), success: seg(0, 0.42), gest: seg(0, 0.42), wait: "loop", amb: seg(0.42, 1.42) },
    make: (w = 9, g = 0.5) => cellsOf(w, g).map((o) => {
      const cx = o.r.x + g / 2, cy = o.r.y + g / 2;
      const d = Math.min(1, (Math.abs(cx - w / 2) + Math.abs(cy - 1) * 0.5) / (w / 2 + 0.1));
      const ti = 0.04 + d * 0.3, te = 0.6 + (1 - d) * 0.24, z = sc(o.r, 0);
      return P(o.c, [F(0, z), F(ti, z, E.stamp), F(ti + 0.08, o.r), F(te, o.r, E.in), F(te + 0.06, z), F(1, z)]);
    })
  },
  /* Louvres — columns flip like slats, a wave out and a wave back. */
  {
    id: 7,
    name: "Louvres",
    dur: 2600,
    grid: "whole",
    short: true,
    uses: { trans: FULL, wait: "loop", amb: FULL },
    make: (w = 9) => {
      const out = [];
      geo(w).cols.forEach((col) => col.p.forEach((p) => {
        const t0 = 0.08 + col.x * 0.03, t1 = 0.54 + (w - 1 - col.x) * 0.03, z = Rr(p.r.x + 0.5, p.r.y, 0, p.r.h);
        out.push(P(p.c, [F(0, p.r), F(t0, p.r, E.in), F(t0 + 0.09, z, E.out), F(t0 + 0.18, p.r), F(t1, p.r, E.in), F(t1 + 0.09, z, E.out), F(t1 + 0.18, p.r), F(1, p.r)]));
      }));
      return out;
    }
  },
  /* Blinds — half rows close top-down and reopen bottom-up. */
  {
    id: 39,
    name: "Blinds",
    dur: 2800,
    grid: "half",
    grains: HW,
    short: true,
    uses: { trans: FULL, amb: FULL, wait: "loop" },
    make: (w = 9, g = 0.5) => {
      const n = Math.round(2 / g), step = 0.15 / (n - 1);
      return rowsOf(w, n).map((o) => {
        const s = o.r.x / w * 0.08, z = Rr(o.r.x, o.r.y + o.r.h / 2, o.r.w, 0);
        const a = 0.08 + o.k * step + s, b = 0.5 + (n - 1 - o.k) * step + s;
        return P(o.c, [F(0, o.r), F(a, o.r, E.in), F(a + 0.1, z), F(b, z, E.out), F(b + 0.14, o.r), F(1, o.r)]);
      });
    }
  },
  /* Cascade — half columns drop out and the same column drops back in. */
  {
    id: 40,
    name: "Cascade",
    dur: 3e3,
    grid: "half",
    grains: HW,
    short: true,
    clip: "strip",
    uses: { trans: seg(0, 0.72), prog: seg(0.06, 0.72), wait: "loop", amb: seg(0, 0.72) },
    make: (w = 9, g = 0.5) => {
      const out = [], cols = columnsOf(w, g), C = cols.length;
      cols.forEach((col) => col.p.forEach((p) => {
        const t = 0.08 + col.cx / (C - 1) * 0.425, dn = mv(p.r, 0, 2.2), up = mv(p.r, 0, -2.2);
        out.push(P(p.c, [F(0, p.r), F(t, p.r, E.in), F(t + 0.08, dn, E.step), F(t + 0.1, up, E.out), F(t + 0.2, p.r), F(1, p.r)]));
      }));
      return out;
    }
  },
  /* Book — the right half closes on the spine, then the left; then it opens. */
  {
    id: 41,
    name: "Book",
    dur: 3200,
    grid: "half",
    grains: HW,
    short: true,
    uses: { trans: seg(0, 0.9), wait: "loop", amb: seg(0, 0.9) },
    make: (w = 9, g = 0.5) => {
      const out = [];
      columnsOf(w, g).forEach((col) => col.p.forEach((p) => {
        const z = Rr(w / 2, p.r.y, 0, p.r.h);
        out.push(P(p.c, p.r.x >= w / 2 - 1e-9 ? [F(0, p.r), F(0.08, p.r, E.in), F(0.22, z), F(0.74, z, E.el), F(0.88, p.r), F(1, p.r)] : [F(0, p.r), F(0.3, p.r, E.in), F(0.44, z), F(0.56, z, E.out), F(0.7, p.r), F(1, p.r)]));
      }));
      return out;
    }
  },
  /* Shear — the two rows slide against each other and re-knit. */
  {
    id: 11,
    name: "Shear",
    dur: 3200,
    grid: "whole",
    clip: "strip",
    short: true,
    uses: { gest: seg(0.22, 0.5), wait: "loop", amb: FULL },
    make: (w = 9) => {
      const T = [[0, 0], [0.08, 0], [0.22, -3], [0.36, -3], [0.5, 0], [0.58, 0], [0.72, 3], [0.86, 3], [1, 0]], out = [];
      geo(w).rows.forEach((o) => [-w, 0, w].forEach((cp) => {
        const sg = o.y ? -1 : 1;
        out.push(P(o.c, T.map(([t, v]) => F(t, mv(o.r, cp + sg * v, 0), E.io))));
      }));
      return out;
    }
  },
  /* Sift — half-cells drain out of the bottom and refill from the top. */
  {
    id: 24,
    name: "Sift",
    dur: 4e3,
    grid: "half",
    grains: HW,
    short: true,
    clip: "strip",
    uses: { trans: FULL, gest: seg(0.45, 0.86), wait: "loop", amb: FULL },
    make: (w = 9, g = 0.5) => {
      const rand = rng(8), Rn = Math.round(2 / g);
      return cellsOf(w, g).map((o) => {
        const b = (Rn - 1 - o.cy) * 0.03, t = 0.04 + rand() * 0.24 + b, t2 = 0.52 + rand() * 0.24 + b;
        const dn = mv(o.r, 0, 3), up = mv(o.r, 0, -3);
        return P(o.c, [F(0, o.r), F(t, o.r, E.in), F(t + 0.08, dn, E.step), F(t2 - 0.08, up, E.in), F(t2, o.r), F(1, o.r)]);
      });
    }
  },
  /* Pull cycle — the whole pull-to-refresh: reveal, threshold stamp, a weave
     while it works, then tuck away. `gest` scrubs the reveal. */
  {
    id: 42,
    name: "Pull cycle",
    dur: 4800,
    grid: "half",
    grains: HW,
    short: true,
    uses: { gest: seg(0, 0.45), wait: "loop", amb: seg(0.45, 1.45) },
    make: (w = 9, g = 0.5) => {
      const C = Math.round(w / g);
      return cellsOf(w, g).map((o) => {
        const r = o.r, ta = 0.02 + o.cx / (C - 1) * 0.374, z0 = Rr(r.x, r.y, 0, r.h), m = mv(r, o.cy % 2 ? -g : g, 0), q = Rr(r.x, 1, r.w, 0);
        return P(o.c, [
          F(0, z0),
          F(ta, z0, E.snap),
          F(ta + 0.02, r),
          F(0.46, r, E.snap),
          F(0.49, ab(r, 1.06, w / 2), E.snap),
          F(0.52, r),
          F(0.56, r, E.snap),
          F(0.6, m),
          F(0.64, m, E.snap),
          F(0.68, r),
          F(0.72, r, E.snap),
          F(0.76, m),
          F(0.8, m, E.snap),
          F(0.84, r),
          F(0.88, r, E.in),
          F(0.96, q),
          F(1, q)
        ]);
      });
    }
  },
  /* Rubber band — the strip stretches past an edge and springs back. */
  {
    id: 43,
    name: "Rubber band",
    dur: 2600,
    grid: "whole",
    uses: { amb: FULL, wait: "loop" },
    make: () => {
      const fR = (u) => u + 3 * Math.pow(u / 9, 2), fL = (u) => u - 3 * Math.pow((9 - u) / 9, 2);
      const map = (r, f) => {
        const a = f(r.x), b = f(r.x + r.w);
        return Rr(a, r.y, b - a, r.h);
      };
      return CELLS.map((o) => P(o.c, [
        F(0, o.r),
        F(0.08, o.r, E.out),
        F(0.34, map(o.r, fR)),
        F(0.42, map(o.r, fR), E.spring),
        F(0.56, o.r),
        F(0.62, o.r, E.out),
        F(0.8, map(o.r, fL)),
        F(0.86, map(o.r, fL), E.spring),
        F(0.98, o.r),
        F(1, o.r)
      ]));
    }
  },
  /* Dither — quarter-cells fade out and back through an ordered-dither
     screen. Its progress/arrival is the fade-IN half. */
  {
    id: 31,
    name: "Dither",
    dur: 3400,
    grid: "quarter",
    grains: ["quarter", "half", "whole"],
    short: true,
    uses: { prog: seg(0.52, 0.88), arrive: seg(0.52, 0.88), wait: "loop", amb: seg(0, 0.88) },
    make: (w = 9, g = 0.25) => {
      const B = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]], C = Math.round(w / g);
      return cellsOf(w, g).map((o) => {
        const b = B[o.cy % 4][o.cx % 4] / 16, x = o.cx / (C - 1) * 0.16;
        const to = 0.06 + b * 0.18 + x, ti = 0.52 + b * 0.18 + x, z = sc(o.r, 0);
        return P(o.c, [F(0, o.r), F(to, o.r, E.snap), F(to + 0.03, z), F(ti, z, E.snap), F(ti + 0.03, o.r), F(1, o.r)]);
      });
    }
  },
  /* Fill — half-cells drop in column by column and stack into the strip. */
  {
    id: 44,
    name: "Fill",
    dur: 4800,
    grid: "half",
    grains: HW,
    short: true,
    clip: "stage",
    clipTight: true,
    uses: { prog: seg(0, 0.66), gest: seg(0, 0.66), wait: "loop", amb: seg(0.74, 1.66) },
    make: (w = 9, g = 0.5) => {
      const rand = rng(14), C = Math.round(w / g), Rn = Math.round(2 / g);
      return cellsOf(w, g).map((o) => {
        const r = o.r, tl = 0.06 + (o.cx * Rn + Rn - 1 - o.cy) / (C * Rn - 1) * 0.58, up = mv(r, 0, -2.5), dn = mv(r, 0, 2.5), td = 0.8 + rand() * 0.1;
        return P(o.c, [F(0, up), F(tl - 0.05, up, E.in), F(tl, r), F(0.68, r, E.snap), F(0.71, ab(r, 1.05, w / 2), E.snap), F(0.74, r), F(td, r, E.in), F(td + 0.06, dn, E.step), F(1, up)]);
      });
    }
  },
  /* Sort — starts scrambled; order emerges one half-column at a time. */
  {
    id: 45,
    name: "Sort",
    dur: 5200,
    grid: "half",
    grains: HW,
    short: true,
    uses: { prog: seg(0, 0.71), wait: "loop", amb: seg(0.8, 1.71) },
    make: (w = 9, g = 0.5) => {
      const out = [], C = Math.round(w / g), Rn = Math.round(2 / g);
      shuffleRows(21, C, Rn).forEach((xs, hy) => {
        const at = (x) => Rr(x * g, hy * g, g, g);
        const pos = xs.slice(), cur = [];
        pos.forEach((p, h) => cur[p] = h);
        const f = xs.map((p) => [F(0, at(p))]);
        for (let i = 0; i < C; i++) {
          const ts = 0.04 + i / (C - 1) * 0.629, p = pos[i];
          if (p === i) continue;
          const q = cur[i];
          f[i].push(F(ts, at(p), E.io), F(ts + 0.03, at(i)));
          f[q].push(F(ts, at(i), E.io), F(ts + 0.03, at(p)));
          pos[i] = i;
          pos[q] = p;
          cur[i] = i;
          cur[p] = q;
        }
        for (let h = 0; h < C; h++) {
          f[h].push(F(0.8, at(h), E.io), F(0.94, at(xs[h])), F(1, at(xs[h])));
          out.push(P(colAt(Math.floor(h * g + 1e-9), Math.floor(hy * g + 1e-9)), f[h]));
        }
      });
      return out;
    }
  },
  /* Drop — cells fall in one by one and bounce into place. */
  {
    id: 9,
    name: "Drop",
    dur: 3e3,
    grid: "whole",
    short: true,
    clip: "stage",
    clipTight: true,
    uses: { success: seg(0, 0.66), arrive: seg(0, 0.66), gest: seg(0, 0.66), wait: "loop", amb: seg(0.66, 1.66) },
    make: (w = 9) => {
      const cells = geo(w).cells, ord = [0, 2, 1, 7, 3, 8, 5, 4, 6].filter((i) => i < cells.length);
      return cells.map((o, j) => {
        const tl = 0.1 + ord.indexOf(j) * 0.06, up = mv(o.r, 0, -4), dn = mv(o.r, 0, 4);
        return P(o.c, [F(0, up), F(tl - 0.09, up, E.in), F(tl, o.r, E.out), F(tl + 0.025, mv(o.r, 0, -0.3), E.in), F(tl + 0.05, o.r), F(0.8, o.r, E.in), F(0.9, dn, E.step), F(1, up)]);
      });
    }
  },
  /* Shake — rows wiggle against each other: no. */
  {
    id: 47,
    name: "Shake",
    dur: 2400,
    grid: "half",
    uses: { error: seg(0, 0.4) },
    make: () => segs(4).map((o) => {
      const d = o.k % 2 ? -1 : 1, S = [0, 0.5, -0.5, 0.375, -0.25, 0.125, 0];
      return P(o.c, [F(0, o.r), ...S.map((s, i) => F(0.06 + i * 0.05, mv(o.r, d * s, 0), E.out)), F(1, o.r)]);
    })
  },
  /* Fountain — half-cells jet up from the centre and rain back into place. */
  {
    id: 48,
    name: "Fountain",
    dur: 3600,
    grid: "half",
    uses: { success: seg(0, 0.62), amb: seg(0, 0.62), wait: "loop" },
    make: () => {
      const rand = rng(30);
      return HALF.map((o) => {
        const r = o.r, cx = r.x + 0.25, s = Math.abs(cx - 4.5) / 4.5 * 0.12, h = 1 + rand() * 0.7, dx = (cx - 4.5) * 0.12 + (rand() - 0.5) * 0.4;
        const t = 0.08 + s, ap = mv(r, dx, -h);
        return P(o.c, [F(0, r), F(t, r, E.out), F(t + 0.16, ap, E.in), F(t + 0.34, r, E.out), F(t + 0.37, mv(r, 0, -0.12), E.in), F(t + 0.4, r), F(1, r)]);
      });
    }
  },
  /* Accordion — width moves from the three majors to the six minors and back. */
  {
    id: 3,
    name: "Accordion",
    dur: 2800,
    grid: "whole",
    short: true,
    uses: { amb: FULL, wait: "loop" },
    make: (w = 9) => {
      const fw = (w - 3) / (w - 6), cells = geo(w).cells;
      const T = cells.map((_, j) => j < 3 ? Rr(j, 0, 1, 2) : Rr(3 + (j - 3 >> 1) * fw, (j - 3) % 2, fw, 1));
      return cells.map((o, j) => P(o.c, [F(0, o.r), F(0.12, o.r, E.el), F(0.4, T[j]), F(0.6, T[j], E.el), F(0.88, o.r), F(1, o.r)]));
    }
  },
  /* Ticker — the strip steps along a module at a time, wrapping. */
  {
    id: 10,
    name: "Ticker",
    dur: 4e3,
    grid: "whole",
    clip: "strip",
    short: true,
    uses: { amb: FULL, wait: "loop" },
    make: (w = 9) => {
      const out = [], n = w + 1;
      [0, n].forEach((dx) => geo(w).cells.forEach((o) => {
        const f = [];
        for (let k = 0; k < n; k++) f.push(F(k / n, mv(o.r, dx - k, 0), E.snap), F(k / n + 0.45 / n, mv(o.r, dx - k - 1, 0)));
        f.push(F(1, mv(o.r, dx - n, 0)));
        out.push(P(o.c, f));
      }));
      return out;
    }
  },
  /* Mosaic — half-cells shuffle along their rows, then sort themselves out. */
  {
    id: 23,
    name: "Mosaic",
    dur: 4400,
    grid: "half",
    grains: HW,
    short: true,
    uses: { amb: FULL, success: seg(0, 0.92), wait: "loop" },
    make: (w = 9, g = 0.5) => {
      const C = Math.round(w / g), rows = shuffleRows(21, C, Math.round(2 / g));
      return cellsOf(w, g).map((o) => {
        const t = Rr(rows[o.cy][o.cx] * g, o.r.y, g, g), s = o.cx / (C - 1) * 0.08;
        return P(o.c, [F(0, o.r), F(0.08 + s, o.r, E.io), F(0.3 + s, t), F(0.56 + s, t, E.el), F(0.8 + s, o.r), F(1, o.r)]);
      });
    }
  },
  /* Swap — now and then two neighbouring half-cells trade places. */
  {
    id: 49,
    name: "Swap",
    dur: 9600,
    grid: "half",
    grains: HW,
    short: true,
    uses: { amb: FULL },
    make: (w = 9, g = 0.5) => {
      const C = Math.round(w / g), Rn = Math.round(2 / g), cells = cellsOf(w, g);
      const rand = rng(41), at = {}, pos = cells.map((o) => [o.cx, o.cy]);
      const sq = ([x, y]) => Rr(x * g, y * g, g, g);
      const f = cells.map((o) => [F(0, o.r)]), sw = [];
      cells.forEach((o, i) => at[o.cx + "," + o.cy] = i);
      for (let n = 0; n < 6; n++) {
        let a = -1, b = -1;
        for (let tr = 0; tr < 400 && a < 0; tr++) {
          const hx = Math.floor(rand() * C), hy = Math.floor(rand() * Rn), hor = rand() < 0.6;
          const bx = hor ? hx + 1 : hx, by = hor ? hy : hy + 1;
          if (bx > C - 1 || by > Rn - 1) continue;
          const A = at[hx + "," + hy], B = at[bx + "," + by];
          if (cells[A].c !== cells[B].c) {
            a = A;
            b = B;
          }
        }
        if (a < 0) break;
        const pa = pos[a], pb = pos[b];
        sw.push([a, b, pa, pb]);
        pos[a] = pb;
        pos[b] = pa;
        at[pb[0] + "," + pb[1]] = a;
        at[pa[0] + "," + pa[1]] = b;
      }
      sw.forEach(([a, b, pa, pb], n) => {
        const t = 0.05 + n * 0.07;
        f[a].push(F(t, sq(pa), E.io), F(t + 0.05, sq(pb)));
        f[b].push(F(t, sq(pb), E.io), F(t + 0.05, sq(pa)));
      });
      sw.slice().reverse().forEach(([a, b, pa, pb], n) => {
        const t = 0.55 + n * 0.07;
        f[a].push(F(t, sq(pb), E.io), F(t + 0.05, sq(pa)));
        f[b].push(F(t, sq(pa), E.io), F(t + 0.05, sq(pb)));
      });
      return cells.map((o, i) => {
        f[i].push(F(1, o.r));
        return P(o.c, f[i]);
      });
    }
  }
];
var MIN_MODULE = { whole: 6, half: 16, quarter: 24 };
var GRAIN_SIZE = { whole: 1, half: 0.5, quarter: 0.25 };
function grainFor(v, o) {
  var _a;
  for (const g of (_a = v.grains) != null ? _a : [v.grid]) {
    if (o.module < MIN_MODULE[g]) continue;
    if (o.lite && g !== "whole") continue;
    return g;
  }
  return null;
}
function rectAt(p, t) {
  var _a;
  const f = p.f;
  if (t <= f[0].t) return f[0].r;
  for (let i = 0; i < f.length - 1; i++) {
    const a = f[i], b = f[i + 1];
    if (t > b.t) continue;
    if (t === b.t) return b.r;
    if (((_a = a.e) == null ? void 0 : _a.startsWith("steps(")) || b.t === a.t) return a.r;
    const k = (t - a.t) / (b.t - a.t);
    return Rr(a.r.x + (b.r.x - a.r.x) * k, a.r.y + (b.r.y - a.r.y) * k, a.r.w + (b.r.w - a.r.w) * k, a.r.h + (b.r.h - a.r.h) * k);
  }
  return f[f.length - 1].r;
}
function colorAt(pieces, t, x, y) {
  let hit = null, best = -Infinity;
  pieces.forEach((p, i) => {
    var _a;
    const r = rectAt(p, t), z = ((_a = p.z) != null ? _a : 0) * 1e4 + i;
    if (r.w > 0 && r.h > 0 && x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h && z > best) {
      best = z;
      hit = p.c;
    }
  });
  return hit;
}
function intactAt(pieces, t, w = 9, h = 2, cell = colAt) {
  for (let qx = 0; qx < 4 * w; qx++) for (let qy = 0; qy < 4 * h; qy++) {
    if (colorAt(pieces, t, (qx + 0.5) / 4, (qy + 0.5) / 4) !== cell(qx >> 2, qy >> 2)) return false;
  }
  return true;
}
function overflow(v, w = 9, g) {
  if (v.clip === "strip") return { left: 0, right: 0, top: 0, bottom: 0 };
  const W = v.square ? 4 : w, H = v.square ? 4 : 2;
  let x0 = 0, x1 = W, y0 = 0, y1 = H;
  for (const p of v.make(w, g)) for (const f of p.f) {
    if (f.r.w <= 0 || f.r.h <= 0) continue;
    x0 = Math.min(x0, f.r.x);
    x1 = Math.max(x1, f.r.x + f.r.w);
    y0 = Math.min(y0, f.r.y);
    y1 = Math.max(y1, f.r.y + f.r.h);
  }
  if (v.clip === "stage") {
    y0 = Math.max(y0, -1);
    y1 = Math.min(y1, H + 1);
  }
  return { left: -x0, right: x1 - W, top: -y0, bottom: y1 - H };
}
var segEnd = (s) => {
  const e = s.start + s.span;
  return e > 1 ? e - 1 : e;
};

// src/lib/ink-motion/square.ts
var seg2 = (start, end) => ({ start, span: end - start });
var FULL2 = seg2(0, 1);
var E2 = {
  snap: "cubic-bezier(.3,0,.2,1)",
  stamp: "cubic-bezier(.2,1.4,.45,1)",
  io: "cubic-bezier(.65,0,.35,1)",
  out: "cubic-bezier(.2,.8,.2,1)",
  in: "cubic-bezier(.6,0,.9,.4)",
  el: "cubic-bezier(.3,1.3,.5,1)",
  step: "steps(1,end)"
};
var Rr2 = (x, y, w, h) => ({ x, y, w, h });
var sc2 = (r, s) => Rr2(r.x + r.w * (1 - s) / 2, r.y + r.h * (1 - s) / 2, r.w * s, r.h * s);
var mv2 = (r, dx, dy) => Rr2(r.x + dx, r.y + dy, r.w, r.h);
var F2 = (t, r, e) => ({ t, r, e });
var P2 = (c, f) => ({ c, f });
var rng2 = (seed) => {
  let s = seed;
  return () => {
    s = s + 1831565813 | 0;
    let t = Math.imul(s ^ s >>> 15, 1 | s);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
};
var colSq = (x, y) => x < 2 && y < 2 ? "R" : y < 2 ? "B" : x < 2 ? "Y" : [["S", "U"], ["P", "A"]][x - 2][y - 2];
var QUADS = [{ c: "R", r: Rr2(0, 0, 2, 2) }, { c: "B", r: Rr2(2, 0, 2, 2) }, { c: "Y", r: Rr2(0, 2, 2, 2) }];
var FIELD = [{ c: "S", r: Rr2(2, 2, 1, 1) }, { c: "P", r: Rr2(3, 2, 1, 1) }, { c: "U", r: Rr2(2, 3, 1, 1) }, { c: "A", r: Rr2(3, 3, 1, 1) }];
var CELLS2 = [...QUADS, ...FIELD];
var gridOf = (g) => {
  const o = [];
  for (let x = 0; x < 4 / g; x++) for (let y = 0; y < 4 / g; y++) o.push({ c: colSq(Math.floor(x * g + 1e-9), Math.floor(y * g + 1e-9)), r: Rr2(x * g, y * g, g, g), x, y });
  return o;
};
var MOD = gridOf(1);
var ROWS = [0, 1, 2, 3].map(
  (y) => y < 2 ? [{ c: "R", r: Rr2(0, y, 2, 1) }, { c: "B", r: Rr2(2, y, 2, 1) }] : [{ c: "Y", r: Rr2(0, y, 2, 1) }, { c: colSq(2, y), r: Rr2(2, y, 1, 1) }, { c: colSq(3, y), r: Rr2(3, y, 1, 1) }]
);
var ks2 = (o, l) => P2(o.c, [F2(0, o.r, E2.io), ...l.map(([t, r]) => F2(t, r != null ? r : o.r, E2.io)), F2(1, o.r)]);
var pathPieces = (path, t0, t1, e0, e1) => {
  const n = path.length, st = (t1 - t0) / n, se = (e1 - e0) / n;
  return path.map(([x, y], i) => {
    var _a, _b;
    const pv = (_a = path[i - 1]) != null ? _a : [x - 1, y], nx = (_b = path[i + 1]) != null ? _b : [x + (x - pv[0]), y + (y - pv[1])];
    const din = [x - pv[0], y - pv[1]], dout = [nx[0] - x, nx[1] - y];
    const grow = din[0] > 0 ? Rr2(x, y, 0, 1) : din[0] < 0 ? Rr2(x + 1, y, 0, 1) : din[1] > 0 ? Rr2(x, y, 1, 0) : Rr2(x, y + 1, 1, 0);
    const shrink = dout[0] > 0 ? Rr2(x + 1, y, 0, 1) : dout[0] < 0 ? Rr2(x, y, 0, 1) : dout[1] > 0 ? Rr2(x, y + 1, 1, 0) : Rr2(x, y, 1, 0);
    const full = Rr2(x, y, 1, 1), a = t0 + i * st, b = e0 + i * se;
    return P2(colSq(x, y), [F2(0, grow), F2(a, grow, "linear"), F2(a + st, full), F2(b, full, "linear"), F2(b + se, shrink), F2(1, shrink)]);
  });
};
var HQ = ["half", "whole"];
var SQUARES = [
  /* S02 Quarter turn — the whole square turns a quarter at a time, piece by piece. */
  {
    id: 102,
    name: "Quarter turn",
    dur: 4e3,
    grid: "whole",
    square: true,
    uses: { amb: FULL2, wait: "loop" },
    make: () => {
      const rot = (r) => Rr2(4 - r.y - r.h, r.x, r.h, r.w);
      return CELLS2.map((o) => {
        let r = o.r;
        const f = [F2(0, r)];
        for (let k = 0; k < 4; k++) {
          const t = 0.06 + k * 0.22, n = rot(r);
          f.push(F2(t, r, E2.io), F2(t + 0.15, n));
          r = n;
        }
        f.push(F2(1, o.r));
        return P2(o.c, f);
      });
    }
  },
  /* S04 Crosshair — the cross between the quadrants wanders; they resize around it. */
  {
    id: 104,
    name: "Crosshair",
    dur: 4e3,
    grid: "whole",
    square: true,
    uses: { amb: FULL2, wait: "loop" },
    make: () => {
      const path = [[2, 2], [1, 1], [3, 1], [3, 3], [1, 3], [2, 2]];
      const at = ([cx, cy]) => {
        const fw = 4 - cx, fh = 4 - cy;
        return { R: Rr2(0, 0, cx, cy), B: Rr2(cx, 0, fw, cy), Y: Rr2(0, cy, cx, fh), S: Rr2(cx, cy, fw / 2, fh / 2), P: Rr2(cx + fw / 2, cy, fw / 2, fh / 2), U: Rr2(cx, cy + fh / 2, fw / 2, fh / 2), A: Rr2(cx + fw / 2, cy + fh / 2, fw / 2, fh / 2) };
      };
      return CELLS2.map((o) => P2(o.c, [...path.map((p, i) => F2(i / (path.length - 1) * 0.9 + (i > 0 ? 0.05 : 0), at(p)[o.c], E2.io)), F2(1, o.r)]));
    }
  },
  /* S06 Rubik — rows and columns slip a module (wrapping), then slip back. */
  {
    id: 106,
    name: "Rubik",
    dur: 4400,
    grid: "whole",
    square: true,
    clip: "strip",
    uses: { amb: FULL2, wait: "loop" },
    make: () => {
      const moves = [["row", 1, 1], ["col", 2, 1], ["row", 3, -1], ["col", 0, -1]];
      const seq = [...moves, ...moves.slice().reverse().map(([a, i, d]) => [a, i, -d])];
      const ps = MOD.map((o) => ({ c: o.c, x: o.x, y: o.y, f: [F2(0, o.r)] }));
      const sd = 0.86 / seq.length;
      seq.forEach(([ax, idx, d], s) => {
        const t = 0.06 + s * sd, dur = sd * 0.7;
        for (const p of ps) {
          if (ax == "row" && p.y !== idx || ax == "col" && p.x !== idx) continue;
          const fx = p.x, fy = p.y, tx = ax == "row" ? (p.x + d + 4) % 4 : p.x, ty = ax == "col" ? (p.y + d + 4) % 4 : p.y;
          const wrap = ax == "row" ? Math.abs(tx - fx) > 1 : Math.abs(ty - fy) > 1;
          if (!wrap) p.f.push(F2(t, Rr2(fx, fy, 1, 1), E2.io), F2(t + dur, Rr2(tx, ty, 1, 1)));
          else {
            const ox = ax == "row" ? fx + d : fx, oy = ax == "col" ? fy + d : fy, ix = ax == "row" ? tx - d : tx, iy = ax == "col" ? ty - d : ty;
            p.f.push(F2(t, Rr2(fx, fy, 1, 1), E2.in), F2(t + dur / 2, Rr2(ox, oy, 1, 1), E2.step), F2(t + dur / 2 + 5e-4, Rr2(ix, iy, 1, 1), E2.out), F2(t + dur, Rr2(tx, ty, 1, 1)));
          }
          p.x = tx;
          p.y = ty;
        }
      });
      return ps.map((p) => P2(p.c, [...p.f, F2(1, Rr2(p.x, p.y, 1, 1))]));
    }
  },
  /* S07 Gears — the outer ring and the inner ring turn against each other. */
  {
    id: 107,
    name: "Gears",
    dur: 5400,
    grid: "whole",
    square: true,
    uses: { amb: FULL2, wait: "loop" },
    make: () => {
      const outer = [[0, 0], [1, 0], [2, 0], [3, 0], [3, 1], [3, 2], [3, 3], [2, 3], [1, 3], [0, 3], [0, 2], [0, 1]], inner = [[1, 1], [2, 1], [2, 2], [1, 2]], N = 12;
      return MOD.map((o) => {
        let ring = outer, dir = 1, i = outer.findIndex(([x, y]) => x == o.x && y == o.y);
        if (i < 0) {
          ring = inner;
          dir = -1;
          i = inner.findIndex(([x, y]) => x == o.x && y == o.y);
        }
        const L = ring.length, at = (k) => ring[((i + dir * k) % L + L) % L], f = [];
        for (let k = 0; k < N; k++) f.push(F2(k / N, Rr2(at(k)[0], at(k)[1], 1, 1), E2.snap), F2(k / N + 0.6 / N, Rr2(at(k + 1)[0], at(k + 1)[1], 1, 1)));
        return P2(o.c, [...f, F2(1, o.r)]);
      });
    }
  },
  /* S09 Snake — one line runs the columns down and up; erases, redraws. */
  {
    id: 109,
    name: "Snake",
    dur: 3600,
    grid: "whole",
    square: true,
    uses: { amb: seg2(0.47, 1.47), wait: "loop" },
    make: () => {
      const p = [];
      for (let x = 0; x < 4; x++) for (let k = 0; k < 4; k++) p.push([x, x % 2 ? 3 - k : k]);
      return pathPieces(p, 0.04, 0.44, 0.54, 0.94);
    }
  },
  /* S10 Iris — cells open from the centre outward (closes, reopens). */
  {
    id: 110,
    name: "Iris",
    dur: 3e3,
    grid: "half",
    grains: HQ,
    square: true,
    uses: { amb: seg2(0.42, 1.42), wait: "loop" },
    make: (_w, g = 0.5) => gridOf(g).map((o) => {
      const cx = o.r.x + g / 2, cy = o.r.y + g / 2, d = Math.min(1, Math.max(Math.abs(cx - 2), Math.abs(cy - 2)) / (2 - g / 2));
      const ti = 0.04 + d * 0.3, te = 0.6 + (1 - d) * 0.24, z = sc2(o.r, 0);
      return P2(o.c, [F2(0, z), F2(ti, z, E2.stamp), F2(ti + 0.08, o.r), F2(te, o.r, E2.in), F2(te + 0.06, z), F2(1, z)]);
    })
  },
  /* S12 Handoff — each quadrant swells over the next, clockwise. */
  {
    id: 112,
    name: "Handoff",
    dur: 4e3,
    grid: "whole",
    square: true,
    uses: { amb: FULL2, wait: "loop" },
    make: () => CELLS2.map((o) => {
      if (o.c == "R") return ks2(o, [[0.03], [0.13, Rr2(0, 0, 4, 2)], [0.17, Rr2(0, 0, 4, 2)], [0.27], [0.78], [0.88, Rr2(0, 0, 2, 0)], [0.92, Rr2(0, 0, 2, 0)], [0.99]]);
      if (o.c == "B") return ks2(o, [[0.03], [0.13, Rr2(4, 0, 0, 2)], [0.17, Rr2(4, 0, 0, 2)], [0.27], [0.28], [0.38, Rr2(2, 0, 2, 4)], [0.42, Rr2(2, 0, 2, 4)], [0.52]]);
      if (o.c == "Y") return ks2(o, [[0.53], [0.63, Rr2(0, 2, 0, 2)], [0.67, Rr2(0, 2, 0, 2)], [0.77], [0.78], [0.88, Rr2(0, 0, 2, 4)], [0.92, Rr2(0, 0, 2, 4)], [0.99]]);
      const sx = (o.r.x - 2) / 2;
      return ks2(o, [[0.28], [0.38, Rr2(o.r.x, 4, 1, 0)], [0.42, Rr2(o.r.x, 4, 1, 0)], [0.52], [0.53], [0.63, Rr2(sx * 4, o.r.y, 2, 1)], [0.67, Rr2(sx * 4, o.r.y, 2, 1)], [0.77]]);
    })
  },
  /* S14 Blinds — module rows close top-down and reopen bottom-up. */
  {
    id: 114,
    name: "Blinds",
    dur: 2800,
    grid: "whole",
    square: true,
    uses: { amb: FULL2, wait: "loop" },
    make: () => ROWS.flatMap((row, y) => row.map((p) => {
      const s = p.r.x / 4 * 0.08, z = Rr2(p.r.x, p.r.y + 0.5, p.r.w, 0), a = 0.08 + y * 0.05 + s, b = 0.5 + (3 - y) * 0.05 + s;
      return P2(p.c, [F2(0, p.r), F2(a, p.r, E2.in), F2(a + 0.1, z), F2(b, z, E2.out), F2(b + 0.14, p.r), F2(1, p.r)]);
    }))
  },
  /* S15 Checker — a checkerboard of cells blinks out, then the other half. */
  {
    id: 115,
    name: "Checker",
    dur: 2800,
    grid: "half",
    grains: HQ,
    square: true,
    uses: { amb: FULL2, wait: "loop" },
    make: (_w, g = 0.5) => {
      const n = 4 / g;
      return gridOf(g).map((o) => {
        const z = sc2(o.r, 0), t = ((o.x + o.y) % 2 ? 0.52 : 0.08) + (o.x + o.y) / (2 * n - 2) * 0.1;
        return P2(o.c, [F2(0, o.r), F2(t, o.r, E2.snap), F2(t + 0.12, z), F2(t + 0.22, z, E2.stamp), F2(t + 0.36, o.r), F2(1, o.r)]);
      });
    }
  },
  /* S16 Dither — an ordered-dither screen fades it out and back in. */
  {
    id: 116,
    name: "Dither",
    dur: 3400,
    grid: "quarter",
    grains: ["quarter", "half", "whole"],
    square: true,
    uses: { amb: seg2(0, 0.9), wait: "loop" },
    make: (_w, g = 0.25) => {
      const B = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]], n = 4 / g;
      return gridOf(g).map((o) => {
        const b = B[o.y % 4][o.x % 4] / 16, d = (o.x + o.y) / (2 * n - 2) * 0.16, to = 0.06 + b * 0.18 + d, ti = 0.52 + b * 0.18 + d, z = sc2(o.r, 0);
        return P2(o.c, [F2(0, o.r), F2(to, o.r, E2.snap), F2(to + 0.03, z), F2(ti, z, E2.snap), F2(ti + 0.03, o.r), F2(1, o.r)]);
      });
    }
  },
  /* S18 Mosaic — cells shuffle along their rows, then sort themselves out. */
  {
    id: 118,
    name: "Mosaic",
    dur: 4400,
    grid: "half",
    grains: HQ,
    square: true,
    uses: { amb: FULL2, wait: "loop" },
    make: (_w, g = 0.5) => {
      const n = 4 / g, rand = rng2(21), out = [];
      for (let y = 0; y < n; y++) {
        const xs = [...Array(n).keys()];
        for (let i = n - 1; i > 0; i--) {
          const k = Math.floor(rand() * (i + 1));
          [xs[i], xs[k]] = [xs[k], xs[i]];
        }
        for (const o of gridOf(g).filter((c) => c.y == y)) {
          const t = Rr2(xs[o.x] * g, o.r.y, g, g), s = o.x / (n - 1) * 0.08;
          out.push(P2(o.c, [F2(0, o.r), F2(0.08 + s, o.r, E2.io), F2(0.3 + s, t), F2(0.56 + s, t, E2.el), F2(0.8 + s, o.r), F2(1, o.r)]));
        }
      }
      return out;
    }
  },
  /* S19 Sift — cells drain out of the bottom and refill from the top. */
  {
    id: 119,
    name: "Sift",
    dur: 4e3,
    grid: "half",
    grains: HQ,
    square: true,
    clip: "strip",
    uses: { amb: FULL2, wait: "loop" },
    make: (_w, g = 0.5) => {
      const n = 4 / g, rand = rng2(8);
      return gridOf(g).map((o) => {
        const b = (n - 1 - o.y) / (n - 1) * 0.105, t = 0.04 + rand() * 0.24 + b, t2 = 0.52 + rand() * 0.24 + b, dn = mv2(o.r, 0, 5), up = mv2(o.r, 0, -5);
        return P2(o.c, [F2(0, o.r), F2(t, o.r, E2.in), F2(t + 0.08, dn, E2.step), F2(t2 - 0.08, up, E2.in), F2(t2, o.r), F2(1, o.r)]);
      });
    }
  },
  /* S20 Drop — cells fall in one by one and bounce home (fall out, fall in). */
  {
    id: 120,
    name: "Drop",
    dur: 3200,
    grid: "whole",
    square: true,
    clip: "stage",
    clipTight: true,
    uses: { amb: seg2(0.6, 1.6), wait: "loop" },
    make: () => {
      const ord = ["R", "B", "Y", "A", "S", "P", "U"];
      return CELLS2.map((o) => {
        const tl = 0.1 + ord.indexOf(o.c) * 0.07, up = mv2(o.r, 0, -5), dn = mv2(o.r, 0, 5);
        return P2(o.c, [F2(0, up), F2(tl - 0.09, up, E2.in), F2(tl, o.r, E2.out), F2(tl + 0.025, mv2(o.r, 0, -0.25), E2.in), F2(tl + 0.05, o.r), F2(0.8, o.r, E2.in), F2(0.9, dn, E2.step), F2(1, up)]);
      });
    }
  },
  /* S24 Zip — module rows zip in from alternate sides (out, then in). */
  {
    id: 124,
    name: "Zip",
    dur: 3200,
    grid: "whole",
    square: true,
    clip: "strip",
    uses: { amb: seg2(0.58, 1.42), wait: "loop" },
    make: () => ROWS.flatMap((row, y) => row.map((p) => {
      const L = y % 2 ? 5 : -5, s = (y % 2 ? p.r.x : 3 - p.r.x) * 0.03, a = mv2(p.r, L, 0), b = mv2(p.r, -L, 0);
      return P2(p.c, [F2(0, a), F2(0.04 + s, a, "cubic-bezier(.15,.9,.25,1)"), F2(0.3 + s, p.r), F2(0.58 + s, p.r, "cubic-bezier(.6,0,.85,.3)"), F2(0.8 + s, b, E2.step), F2(1, a)]);
    }))
  }
];

// src/lib/ink-motion/pick.ts
function poolFor(use, o) {
  return (o.square ? SQUARES : VARIANTS).filter((v) => {
    var _a;
    const w = (_a = o.width) != null ? _a : 9;
    if (!v.uses[use]) return false;
    if (!o.square && w !== 9 && !v.short) return false;
    const gr = grainFor(v, o);
    if (!gr) return false;
    const g = GRAIN_SIZE[gr];
    if (o.restStart && !(o.square ? intactAt(v.make(4, g), startOf(v, use), 4, 4, colSq) : intactAt(v.make(w, g), startOf(v, use), w))) return false;
    if (o.maxOverflow != null && !v.clipTight && Object.values(overflow(v, w, g)).some((d) => d > o.maxOverflow + 1e-9)) return false;
    return true;
  });
}
function pick(use, o) {
  var _a;
  const pool = poolFor(use, o);
  if (!pool.length) return null;
  const fresh = pool.length > 1 ? pool.filter((v) => v.id !== o.last) : pool;
  return fresh[Math.floor(((_a = o.random) != null ? _a : Math.random)() * fresh.length)];
}
function startOf(v, use) {
  const u = v.uses[use];
  return !u || u === "loop" ? 0 : u.start;
}
function isLiteDevice() {
  var _a;
  if (typeof navigator === "undefined") return false;
  const n = navigator;
  return n.deviceMemory != null && n.deviceMemory <= 2 || n.hardwareConcurrency != null && n.hardwareConcurrency <= 2 || ((_a = n.connection) == null ? void 0 : _a.saveData) === true;
}

// src/lib/ink-motion/player.ts
var MODE_MAP = {
  full: {},
  majors: { G: "S", P: "K", U: "K", A: "S" },
  ink: { R: "K", B: "S", Y: "K", S: "K", K: "S", G: "S", P: "K", U: "K", A: "S" }
};
var APP_PALETTE = {
  R: "var(--color-red)",
  B: "var(--color-blue)",
  Y: "var(--color-yellow)",
  G: "var(--color-green)",
  P: "var(--color-pink)",
  A: "var(--color-amber)",
  U: "var(--color-purple)",
  K: "#0d0905",
  /* Stock is EMPTY on screen (Donald 10.10.26: "cream on a cream background
     and ink on an ink background") — the cell shows the ground. Print
     renderers keep it cream: on paper the ground is the stock. */
  S: "transparent"
};
function baseSize(p) {
  var _a;
  const n = /* @__PURE__ */ new Map();
  let best = "1x1", m = 0;
  for (const fr of p.f) {
    if (fr.r.w <= 0 || fr.r.h <= 0) continue;
    const k = `${fr.r.w}x${fr.r.h}`, c = ((_a = n.get(k)) != null ? _a : 0) + 1;
    n.set(k, c);
    if (c > m) {
      m = c;
      best = k;
    }
  }
  const [w, h] = best.split("x").map(Number);
  return [w, h];
}
var round = (n) => Math.round(n * 1e3) / 1e3;
var InkPlayer = class {
  constructor(host, variant, o) {
    this.variant = variant;
    __publicField(this, "layer");
    __publicField(this, "anims", []);
    __publicField(this, "dur");
    __publicField(this, "cover");
    var _a, _b, _c, _d, _e, _f, _g, _h;
    const m = o.module;
    const palette = (_a = o.palette) != null ? _a : APP_PALETTE;
    const remap = MODE_MAP[(_b = o.mode) != null ? _b : "full"];
    const w = variant.square ? 4 : (_c = o.width) != null ? _c : 9;
    const h = variant.square ? 4 : 2;
    this.dur = variant.dur;
    const layer = document.createElement("span");
    layer.setAttribute("aria-hidden", "true");
    const clip = variant.clip === "strip" ? "overflow:hidden;" : variant.clip === "stage" ? `clip-path:inset(-${m}px 0 -${m}px 0);` : "";
    layer.style.cssText = `position:absolute;left:0;top:0;width:${w * m}px;height:${h * m}px;pointer-events:none;${clip}`;
    const pieces = variant.make(w, GRAIN_SIZE[(_d = o.grain) != null ? _d : variant.grid]);
    const empty = (c) => {
      var _a2;
      return c != null && palette[(_a2 = remap[c]) != null ? _a2 : c] === "transparent";
    };
    for (const p of pieces) {
      if (empty(p.c)) continue;
      const [bw, bh] = baseSize(p);
      const at = (_e = o.restAt) != null ? _e : 0;
      const rest = o.restAt != null ? rectAt(p, o.restAt) : (_f = p.f.find((fr) => fr.r.w > 0 && fr.r.h > 0)) == null ? void 0 : _f.r;
      const br = !rest || Math.abs(rest.x + rest.w - w) < 1e-6 || empty(colorAt(pieces, at, rest.x + rest.w + 0.01, rest.y + rest.h / 2)) ? 0 : 1;
      const bb = !rest || Math.abs(rest.y + rest.h - h) < 1e-6 || empty(colorAt(pieces, at, rest.x + rest.w / 2, rest.y + rest.h + 0.01)) ? 0 : 1;
      const el = document.createElement("i");
      el.style.cssText = `position:absolute;left:0;top:0;display:block;transform-origin:0 0;width:${bw * m + br}px;height:${bh * m + bb}px;background:${palette[(_g = remap[p.c]) != null ? _g : p.c]};` + (p.z ? `z-index:${p.z};` : "");
      layer.appendChild(el);
      let prev = 0;
      const frames = p.f.map((fr) => {
        var _a2;
        const t = Math.min(1, Math.max(prev, fr.t));
        prev = t;
        return {
          offset: t,
          easing: (_a2 = fr.e) != null ? _a2 : "linear",
          transform: `translate(${round(fr.r.x * m)}px,${round(fr.r.y * m)}px) scale(${round(Math.max(fr.r.w, 0) / bw)},${round(Math.max(fr.r.h, 0) / bh)})`
        };
      });
      const a = el.animate(frames, { duration: variant.dur, fill: "both" });
      a.pause();
      this.anims.push(a);
    }
    host.appendChild(layer);
    this.layer = layer;
    this.cover = (_h = o.cover) != null ? _h : null;
    if (this.cover) this.cover.style.visibility = "hidden";
  }
  time(iterationStart, iterations) {
    var _a;
    for (const a of this.anims) (_a = a.effect) == null ? void 0 : _a.updateTiming({ iterationStart, iterations });
  }
  /** The whole score, repeating, until destroyed. */
  loop() {
    this.time(0, Infinity);
    for (const a of this.anims) {
      a.currentTime = 0;
      a.play();
    }
  }
  /** Play one slice of the score; resolves when it lands (holds the end). */
  once(s) {
    this.time(s.start, s.span);
    for (const a of this.anims) {
      a.currentTime = 0;
      a.play();
    }
    const first = this.anims[0];
    return first ? first.finished.then(() => void 0, () => void 0) : Promise.resolve();
  }
  /** Hold the slice at progress p (0..1) — a finger or a real percentage. */
  scrub(s, p) {
    this.time(s.start, s.span);
    const at = Math.min(1, Math.max(0, p)) * s.span * this.dur;
    for (const a of this.anims) {
      a.pause();
      a.currentTime = Math.min(at, s.span * this.dur - 0.5);
    }
  }
  pause() {
    for (const a of this.anims) if (a.playState === "running") a.pause();
  }
  resume() {
    for (const a of this.anims) if (a.playState === "paused") a.play();
  }
  destroy() {
    if (this.cover) this.cover.style.visibility = "";
    for (const a of this.anims) a.cancel();
    this.anims = [];
    this.layer.remove();
  }
};
function snapToPixels(el) {
  const snap = () => {
    el.style.transform = "";
    const r = el.getBoundingClientRect(), d = window.devicePixelRatio || 1;
    const dx = round(Math.round(r.x * d) / d - r.x), dy = round(Math.round(r.y * d) / d - r.y);
    el.style.transform = dx || dy ? `translate(${dx}px,${dy}px)` : "";
  };
  snap();
  window.addEventListener("resize", snap);
  return () => {
    window.removeEventListener("resize", snap);
    el.style.transform = "";
  };
}
function segmentFor(v, use) {
  const u = v.uses[use];
  return !u || u === "loop" ? { start: 0, span: 1 } : u;
}
function prefersReducedMotion() {
  var _a;
  return typeof window !== "undefined" && !!((_a = window.matchMedia) == null ? void 0 : _a.call(window, "(prefers-reduced-motion: reduce)").matches);
}
function watchVisibility(el, cb) {
  let inView = true;
  const emit = () => cb(inView && document.visibilityState === "visible");
  const io = "IntersectionObserver" in window ? new IntersectionObserver((es) => {
    inView = es.some((e) => e.isIntersecting);
    emit();
  }) : null;
  io == null ? void 0 : io.observe(el);
  document.addEventListener("visibilitychange", emit);
  return () => {
    io == null ? void 0 : io.disconnect();
    document.removeEventListener("visibilitychange", emit);
  };
}
var KEY = "ink-motion:last:";
function lastSeen(use) {
  try {
    const v = sessionStorage.getItem(KEY + use);
    return v ? Number(v) : null;
  } catch {
    return null;
  }
}
function remember(use, id) {
  try {
    sessionStorage.setItem(KEY + use, String(id));
  } catch {
  }
}
export {
  APP_PALETTE,
  CELL_COLOR,
  GRAIN_SIZE,
  InkPlayer,
  MIN_MODULE,
  SQUARES,
  VARIANTS,
  colAt,
  colSq,
  colorAt,
  grainFor,
  intactAt,
  isLiteDevice,
  lastSeen,
  overflow,
  pick,
  poolFor,
  prefersReducedMotion,
  rectAt,
  remember,
  segEnd,
  segmentFor,
  snapToPixels,
  startOf,
  watchVisibility
};
