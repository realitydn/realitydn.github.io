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
  S: "var(--stock,#fffbf1)"
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
var ab = (r, s) => Rr(4.5 + (r.x - 4.5) * s, 1 + (r.y - 1) * s, r.w * s, r.h * s);
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
var { rows: ROWS } = geo(9);
var HALF = [];
for (let hx = 0; hx < 18; hx++) for (let hy = 0; hy < 4; hy++) HALF.push({ c: colAt(hx >> 1, hy >> 1), r: Rr(hx / 2, hy / 2, 0.5, 0.5), hx, hy });
var HCOL = Array.from({ length: 18 }, (_, hx) => {
  const x = hx / 2, mx = hx >> 1;
  return { p: mx < 6 ? [{ c: colAt(mx, 0), r: Rr(x, 0, 0.5, 2) }] : [{ c: colAt(mx, 0), r: Rr(x, 0, 0.5, 1) }, { c: colAt(mx, 1), r: Rr(x, 1, 0.5, 1) }] };
});
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
var shuffleRows = (seed) => {
  const rand = rng(seed), rows = [];
  for (let hy = 0; hy < 4; hy++) {
    const xs = [...Array(18).keys()];
    for (let i = 17; i > 0; i--) {
      const k = Math.floor(rand() * (i + 1));
      [xs[i], xs[k]] = [xs[k], xs[i]];
    }
    rows.push(xs);
  }
  return rows;
};
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
    uses: { wait: "loop", prog: seg(0, 0.47), gest: seg(0, 0.47) },
    make: () => {
      const path = [];
      for (let c = 0; c < 9; c++) path.push(...c % 2 ? [[c, 1], [c, 0]] : [[c, 0], [c, 1]]);
      const st = 0.4 / 18;
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
    clip: "strip",
    uses: { wait: "loop", amb: FULL },
    make: () => {
      const S = [0, 1, 2, 3, 4, 3, 2, 1, 0, 0], out = [];
      segs(4).forEach((o) => [-9, 0, 9].forEach((cp) => {
        const d = o.k % 2 ? -1 : 1;
        out.push(P(o.c, [...S.map((s, i) => F(i / 10, mv(o.r, cp + d * s * 0.5, 0), E.snap)), F(1, mv(o.r, cp, 0))]));
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
    clip: "strip",
    uses: { arrive: seg(0, 0.42), trans: seg(0.58, 1.42), gest: seg(0, 0.42), wait: "loop" },
    make: () => ROWS.map((o) => {
      const L = o.y ? 10 : -10, s = (o.y ? o.r.x : 8 - o.r.x) * 0.014, a = mv(o.r, L, 0), b = mv(o.r, -L, 0);
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
    uses: { arrive: seg(0, 0.42), success: seg(0, 0.42), gest: seg(0, 0.42), wait: "loop" },
    make: () => HALF.map((o) => {
      const cx = o.hx / 2 + 0.25, cy = o.hy / 2 + 0.25;
      const d = Math.min(1, (Math.abs(cx - 4.5) + Math.abs(cy - 1) * 0.5) / 4.6);
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
    uses: { trans: FULL, amb: FULL, wait: "loop" },
    make: () => segs(4).map((o) => {
      const s = o.r.x / 9 * 0.08, z = Rr(o.r.x, o.r.y + o.r.h / 2, o.r.w, 0);
      const a = 0.08 + o.k * 0.05 + s, b = 0.5 + (3 - o.k) * 0.05 + s;
      return P(o.c, [F(0, o.r), F(a, o.r, E.in), F(a + 0.1, z), F(b, z, E.out), F(b + 0.14, o.r), F(1, o.r)]);
    })
  },
  /* Cascade — half columns drop out and the same column drops back in. */
  {
    id: 40,
    name: "Cascade",
    dur: 3e3,
    grid: "half",
    clip: "strip",
    uses: { trans: seg(0, 0.72), prog: seg(0.06, 0.72), wait: "loop" },
    make: () => {
      const out = [];
      HCOL.forEach((col, hx) => col.p.forEach((p) => {
        const t = 0.08 + hx * 0.025, dn = mv(p.r, 0, 2.2), up = mv(p.r, 0, -2.2);
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
    uses: { trans: seg(0, 0.9), wait: "loop" },
    make: () => {
      const out = [];
      HCOL.forEach((col, hx) => col.p.forEach((p) => {
        const z = Rr(4.5, p.r.y, 0, p.r.h);
        out.push(P(p.c, hx >= 9 ? [F(0, p.r), F(0.08, p.r, E.in), F(0.22, z), F(0.74, z, E.el), F(0.88, p.r), F(1, p.r)] : [F(0, p.r), F(0.3, p.r, E.in), F(0.44, z), F(0.56, z, E.out), F(0.7, p.r), F(1, p.r)]));
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
    clip: "strip",
    uses: { trans: FULL, gest: seg(0.45, 0.86), wait: "loop" },
    make: () => {
      const rand = rng(8);
      return HALF.map((o) => {
        const b = (3 - o.hy) * 0.03, t = 0.04 + rand() * 0.24 + b, t2 = 0.52 + rand() * 0.24 + b;
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
    uses: { gest: seg(0, 0.45), wait: "loop" },
    make: () => HALF.map((o) => {
      const r = o.r, ta = 0.02 + o.hx * 0.022, z0 = Rr(r.x, r.y, 0, r.h), m = mv(r, o.hy % 2 ? -0.5 : 0.5, 0), q = Rr(r.x, 1, r.w, 0);
      return P(o.c, [
        F(0, z0),
        F(ta, z0, E.snap),
        F(ta + 0.02, r),
        F(0.46, r, E.snap),
        F(0.49, ab(r, 1.06), E.snap),
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
    })
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
    uses: { prog: seg(0.52, 0.88), arrive: seg(0.52, 0.88), wait: "loop" },
    make: () => {
      const B = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]], out = [];
      for (let qx = 0; qx < 36; qx++) for (let qy = 0; qy < 8; qy++) {
        const r = Rr(qx / 4, qy / 4, 0.25, 0.25), b = B[qy % 4][qx % 4] / 16;
        const to = 0.06 + b * 0.18 + qx / 35 * 0.16, ti = 0.52 + b * 0.18 + qx / 35 * 0.16, z = sc(r, 0);
        out.push(P(colAt(qx >> 2, qy >> 2), [F(0, r), F(to, r, E.snap), F(to + 0.03, z), F(ti, z, E.snap), F(ti + 0.03, r), F(1, r)]));
      }
      return out;
    }
  },
  /* Fill — half-cells drop in column by column and stack into the strip. */
  {
    id: 44,
    name: "Fill",
    dur: 4800,
    grid: "half",
    clip: "stage",
    uses: { prog: seg(0, 0.66), gest: seg(0, 0.66), wait: "loop" },
    make: () => {
      const rand = rng(14);
      return HALF.map((o) => {
        const r = o.r, tl = 0.06 + (o.hx * 4 + 3 - o.hy) / 71 * 0.58, up = mv(r, 0, -2.5), dn = mv(r, 0, 2.5), td = 0.8 + rand() * 0.1;
        return P(o.c, [F(0, up), F(tl - 0.05, up, E.in), F(tl, r), F(0.68, r, E.snap), F(0.71, ab(r, 1.05), E.snap), F(0.74, r), F(td, r, E.in), F(td + 0.06, dn, E.step), F(1, up)]);
      });
    }
  },
  /* Sort — starts scrambled; order emerges one half-column at a time. */
  {
    id: 45,
    name: "Sort",
    dur: 5200,
    grid: "half",
    uses: { prog: seg(0, 0.71), wait: "loop" },
    make: () => {
      const out = [];
      shuffleRows(21).forEach((xs, hy) => {
        const pos = xs.slice(), cur = [];
        pos.forEach((p, h) => cur[p] = h);
        const f = xs.map((p) => [F(0, Rr(p / 2, hy / 2, 0.5, 0.5))]);
        for (let i = 0; i < 18; i++) {
          const ts = 0.04 + i * 0.037, p = pos[i];
          if (p === i) continue;
          const q = cur[i];
          f[i].push(F(ts, Rr(p / 2, hy / 2, 0.5, 0.5), E.io), F(ts + 0.03, Rr(i / 2, hy / 2, 0.5, 0.5)));
          f[q].push(F(ts, Rr(i / 2, hy / 2, 0.5, 0.5), E.io), F(ts + 0.03, Rr(p / 2, hy / 2, 0.5, 0.5)));
          pos[i] = i;
          pos[q] = p;
          cur[i] = i;
          cur[p] = q;
        }
        for (let h = 0; h < 18; h++) {
          const r = Rr(h / 2, hy / 2, 0.5, 0.5), s = Rr(xs[h] / 2, hy / 2, 0.5, 0.5);
          f[h].push(F(0.8, r, E.io), F(0.94, s), F(1, s));
          out.push(P(colAt(h >> 1, hy >> 1), f[h]));
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
    clip: "stage",
    uses: { success: seg(0, 0.66), arrive: seg(0, 0.66), gest: seg(0, 0.66), wait: "loop" },
    make: () => {
      const ord = [0, 2, 1, 7, 3, 8, 5, 4, 6];
      return CELLS.map((o, j) => {
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
    uses: { amb: FULL, success: seg(0, 0.92), wait: "loop" },
    make: () => {
      const rows = shuffleRows(21);
      return HALF.map((o) => {
        const t = Rr(rows[o.hy][o.hx] / 2, o.r.y, 0.5, 0.5), s = o.hx / 17 * 0.08;
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
    uses: { amb: FULL },
    make: () => {
      const rand = rng(41), at = {}, pos = HALF.map((o) => [o.hx, o.hy]);
      const f = HALF.map((o) => [F(0, o.r)]), sw = [];
      HALF.forEach((o, i) => at[o.hx + "," + o.hy] = i);
      for (let n = 0; n < 6; n++) {
        let a = -1, b = -1;
        for (let tr = 0; tr < 400 && a < 0; tr++) {
          const hx = Math.floor(rand() * 18), hy = Math.floor(rand() * 4), hor = rand() < 0.6;
          const bx = hor ? hx + 1 : hx, by = hor ? hy : hy + 1;
          if (bx > 17 || by > 3) continue;
          const A = at[hx + "," + hy], B = at[bx + "," + by];
          if (HALF[A].c !== HALF[B].c) {
            a = A;
            b = B;
          }
        }
        const pa = pos[a], pb = pos[b];
        sw.push([a, b, pa, pb]);
        pos[a] = pb;
        pos[b] = pa;
        at[pb[0] + "," + pb[1]] = a;
        at[pa[0] + "," + pa[1]] = b;
      }
      sw.forEach(([a, b, pa, pb], n) => {
        const t = 0.05 + n * 0.07;
        f[a].push(F(t, hr(pa), E.io), F(t + 0.05, hr(pb)));
        f[b].push(F(t, hr(pb), E.io), F(t + 0.05, hr(pa)));
      });
      sw.slice().reverse().forEach(([a, b, pa, pb], n) => {
        const t = 0.55 + n * 0.07;
        f[a].push(F(t, hr(pb), E.io), F(t + 0.05, hr(pa)));
        f[b].push(F(t, hr(pa), E.io), F(t + 0.05, hr(pb)));
      });
      return HALF.map((o, i) => {
        f[i].push(F(1, o.r));
        return P(o.c, f[i]);
      });
    }
  }
];
var MIN_MODULE = { whole: 6, half: 16, quarter: 24 };
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
function intactAt(pieces, t, w = 9) {
  for (let qx = 0; qx < 4 * w; qx++) for (let qy = 0; qy < 8; qy++) {
    if (colorAt(pieces, t, (qx + 0.5) / 4, (qy + 0.5) / 4) !== colAt(qx >> 2, qy >> 2)) return false;
  }
  return true;
}
function overflow(v, w = 9) {
  if (v.clip === "strip") return { left: 0, right: 0, top: 0, bottom: 0 };
  let x0 = 0, x1 = w, y0 = 0, y1 = 2;
  for (const p of v.make(w)) for (const f of p.f) {
    if (f.r.w <= 0 || f.r.h <= 0) continue;
    x0 = Math.min(x0, f.r.x);
    x1 = Math.max(x1, f.r.x + f.r.w);
    y0 = Math.min(y0, f.r.y);
    y1 = Math.max(y1, f.r.y + f.r.h);
  }
  if (v.clip === "stage") {
    y0 = Math.max(y0, -1);
    y1 = Math.min(y1, 3);
  }
  return { left: -x0, right: x1 - w, top: -y0, bottom: y1 - 2 };
}
var segEnd = (s) => {
  const e = s.start + s.span;
  return e > 1 ? e - 1 : e;
};

// src/lib/ink-motion/pick.ts
function poolFor(use, o) {
  return VARIANTS.filter((v) => {
    var _a;
    const w = (_a = o.width) != null ? _a : 9;
    if (!v.uses[use]) return false;
    if (w !== 9 && !v.short) return false;
    if (o.module < MIN_MODULE[v.grid]) return false;
    if (o.lite && v.grid !== "whole") return false;
    if (o.restStart && !intactAt(v.make(w), startOf(v, use), w)) return false;
    if (o.maxOverflow != null && Object.values(overflow(v, w)).some((d) => d > o.maxOverflow + 1e-9)) return false;
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
  S: "var(--stock,#fffbf1)"
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
    __publicField(this, "offResize");
    var _a, _b, _c, _d;
    const m = o.module;
    const palette = (_a = o.palette) != null ? _a : APP_PALETTE;
    const remap = MODE_MAP[(_b = o.mode) != null ? _b : "full"];
    const w = (_c = o.width) != null ? _c : 9;
    this.dur = variant.dur;
    const layer = document.createElement("span");
    layer.setAttribute("aria-hidden", "true");
    const clip = variant.clip === "strip" ? "overflow:hidden;" : variant.clip === "stage" ? `clip-path:inset(-${m}px 0 -${m}px 0);` : "";
    layer.style.cssText = `position:absolute;left:0;top:0;width:${w * m}px;height:${2 * m}px;pointer-events:none;${clip}`;
    for (const p of variant.make(w)) {
      const [bw, bh] = baseSize(p);
      const el = document.createElement("i");
      el.style.cssText = `position:absolute;left:0;top:0;display:block;transform-origin:0 0;width:${bw * m + 1}px;height:${bh * m + 1}px;background:${palette[(_d = remap[p.c]) != null ? _d : p.c]};` + (p.z ? `z-index:${p.z};` : "");
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
    const snap = () => {
      layer.style.transform = "";
      const r = layer.getBoundingClientRect(), d = window.devicePixelRatio || 1;
      layer.style.transform = `translate(${round(Math.round(r.x * d) / d - r.x)}px,${round(Math.round(r.y * d) / d - r.y)}px)`;
    };
    snap();
    window.addEventListener("resize", snap);
    this.offResize = () => window.removeEventListener("resize", snap);
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
    this.offResize();
    for (const a of this.anims) a.cancel();
    this.anims = [];
    this.layer.remove();
  }
};
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
  InkPlayer,
  MIN_MODULE,
  VARIANTS,
  colAt,
  colorAt,
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
  startOf,
  watchVisibility
};
