/* eslint-disable */
/* ============================================================
   REALITY — THE RISO PRESS (core)
   ============================================================
   Colour separation, screening, ink physics and the press model,
   as PURE functions over pixel buffers. No canvas, no document,
   no DOM — pixels in, pixels out — so the same file runs on the
   Poster Studio main thread, inside Print Studio's PDF rasteriser,
   and in the app's render workers, and every host prints the same
   plate from the same numbers.

   One copy. This file lives at public/studio-shared/riso-press.js
   in the website repo and is COPIED verbatim into the app
   (REALITYApp/src/lib/vendor/riso-press.js) by the app's
   scripts/sync-riso-press.mjs; the app's prebuild fails if the
   copy drifts. Edit it here.

   Loads three ways:
     · classic <script>  → window.RisoPress   (the Studios)
     · CommonJS / bundler → module.exports     (the app, esbuild, node)
     · a worker           → self.RisoPress

   The physics in one page (docs/riso-press/README.md §1 has the
   long version):

   · An ink is a translucent film. At full coverage it passes a
     fraction of the light reaching the paper — its TRANSMITTANCE,
     one number per channel, its hex over 255. Stacked inks
     multiply transmittances: pink over blue is navy, pink over
     yellow is red.
   · A screened plate is AREA coverage — a dot prints or it does
     not — so a plate at coverage a passes (1 − a) + a·T, and the
     stacked plates multiply (Murray-Davies over independent
     screens). "What mix of these inks on this stock makes this
     colour" is then least squares in three equations and N
     unknowns against exactly that model, solved by clamped
     coordinate descent. An L2 pull toward zero is the GCR: of two
     mixes that hit a colour, take the one laying down less ink.
     (The prototype solved in Beer-Lambert density but stacked by
     coverage, and the two disagree hard at low coverage — every
     tone printed light. Same model both sides now.)
   · Dark stock inverts the problem. A translucent ink cannot
     print light on black; only an opaque one can, and that is a
     silkscreen. So a dark stock switches physics: coverage becomes
     how much of the pixel each ink COVERS, the mix is linear in
     RGB against the stock, Σa ≤ 1.
   · Screen angles go by ink brightness: 45° (the angle the eye
     notices least) to the ink carrying the most contrast, 0° (the
     worst) to the one nobody can see. Darkest gets 45, then 75,
     15, 0.
   · Dot gain is enormous and defines the look — ISO 12647-3 puts
     a 50 % dot at 76 % on newsprint, and riso is newsprint-class.
     A RIP compensates by pulling the plate down by what the press
     adds back; simulate the gain AND compensate the plate, or you
     count it twice.
   · Three ceilings, never fused: `ceiling` is what the PLATE can
     carry (a master is a sheet of holes and the last few per cent
     close up), `solidity` is how completely ink covers where it
     lands, and `floodCap` is design advice about big floods — off
     by default, because clamping everything to it is why nothing
     could print dark.
   · Tone floor 0.10, hard: below ~10 % the master has no hole.

   WYSIWYG. A host renders the same picture at a ≤900px preview and
   a 2–4× export, so every size here is DESIGN px on a 520-wide
   frame, scaled by K = w / designW. The stochastic screen samples a
   fixed design-resolution grid for the same reason — a per-device-
   pixel hash would print finer grain on the export than the
   preview showed.
   ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.RisoPress = factory();
})(typeof self !== 'undefined' ? self : (typeof globalThis !== 'undefined' ? globalThis : this), function () {
  "use strict";

  /* Bumped whenever the press's OUTPUT changes. Stamped on documents by the
     hosts (Poster Studio's doc.engineRev) so a future reprint can tell which
     press made a poster. 1 = the tinting engine that shipped before the
     separation. */
  const REV = 2;

  /* ---- the locked palette (mirror of public/tokens/day-colours.json) ----
     Seven accents + the two neutrals. Both neutrals are pickable PLATES:
     `ink` is the black drum; `cream` only means anything as an opaque ink on
     a dark stock (a translucent cream over cream paper prints nothing, and
     the solver knows it). */
  const PAL = {
    blue: '#18a7e0', green: '#43b02a', yellow: '#fddf00',
    amber: '#fdb515', purple: '#6e3179', pink: '#ed1b72', red: '#ed2224',
    ink: '#0d0905', cream: '#fffbf1'
  };
  /* Stock is ink zero. Riso ink is translucent, so the sheet multiplies
     through every plate — pink on straw reads orange, and a two-ink job on a
     tinted sheet gives four tones for the price of two masters. None of these
     is pure white; no printing paper is, except Print Studio's `white`, which
     is the one surface those pieces are actually run on.
     Canon list: public/tokens/stocks.json (the build gate checks this table
     against it). `day` and `night` are the keys the themes map to. */
  const PAPER = {
    day: '#fffbf1', night: '#0a0703',
    white: '#ffffff',        // Print Studio's true-white stock
    kraft: '#d8c3a0',        // recycled brown
    news: '#e8e2d2',         // groundwood, L*~82 and warm
    grey: '#b9b4ac',         // board
    straw: '#e9dcae',        // Cairn Straw
    flint: '#9c9a90',        // Context Flint, warm grey recycled
    salmon: '#e8b9a0',       // Context Salmon
    steel: '#5d6a73'         // a dark-but-not-black stock
  };
  /* What "ink" means on each stock — the mono drum a one-colour job runs.
     Light stocks take the black; dark stocks (opaque physics) take cream.
     Print's white stock takes its own K (canon.print.ink). */
  const INK = {
    day: '#0d0905', night: '#fffbf1', white: '#111111',
    kraft: '#0d0905', news: '#0d0905', grey: '#0d0905', straw: '#0d0905',
    flint: '#0d0905', salmon: '#0d0905', steel: '#fffbf1'
  };
  /* The display order of the stocks a picker offers, light to dark. */
  const STOCKS = ['day', 'white', 'news', 'straw', 'kraft', 'salmon', 'grey', 'flint', 'steel', 'night'];
  /* warm/cool partner for the two-ink passes — canon, from day-colours.json */
  const PARTNER = { pink: 'blue', red: 'blue', amber: 'purple', yellow: 'pink',
                    blue: 'pink', green: 'purple', purple: 'amber' };
  /* The never-pair ADVISORY (day-colours.json, decided 19.08.26): warn in a
     picker, never block. `any,itself` is the fourth row there. */
  const NEVER_PAIR = [['pink', 'red'], ['pink', 'purple'], ['amber', 'yellow']];
  /* Riso screen angles, assigned by ink luminance ascending. */
  const RISO_ANGLES = [45, 75, 15, 0, 30];
  /* Named screens. `pitch` is the AM cell in design px; `levels` the number
     of tones the screen can hold — at 600 dpi a cell is (600/lpi)² px, so
     43 lpi carries ~195 tones and never bands, 106 lpi ~33 and does. Grain is
     the machine's own stochastic mode, and what it does on 95 % of jobs. */
  const SCREENS = {
    grain: { screen: 'fm', pitch: 9,   levels: 0 },
    s43:   { screen: 'am', pitch: 13,  levels: 195 },
    s71:   { screen: 'am', pitch: 8,   levels: 72 },
    s106:  { screen: 'am', pitch: 5.5, levels: 33 }
  };

  /* ---- small helpers, shared with the hosts ---- */
  function hex2rgb(h) {
    h = String(h).replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join('');
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  function inkHex(key, pal) { const p = pal || PAL; return p[key] || PAL[key] || key; }
  function stockHex(key) { return PAPER[key] || key; }
  /* a stock is dark — and therefore prints opaque — below this brightness */
  function isDark(hex) { const c = hex2rgb(hex); return c[0] + c[1] + c[2] < 340; }
  function inkOnStock(key) { return INK[key] || (isDark(stockHex(key)) ? PAL.cream : PAL.ink); }
  function luma(hex) { const c = hex2rgb(hex); return 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]; }
  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  /* seeded value noise 0..1 at (x,y), `cell` px blotches. Always the same
     seed → the same field on every render, and on every frame of a clip. */
  function valueNoise(w, h, cell, seed) {
    const gw = Math.max(2, Math.ceil(w / cell) + 4), gh = Math.max(2, Math.ceil(h / cell) + 4);
    const rnd = mulberry32(seed || 0x51ED), g = new Float32Array(gw * gh);
    for (let i = 0; i < g.length; i++) g[i] = rnd();
    return function (x, y) {
      const fx = x / cell, fy = y / cell;
      let ix = fx | 0, iy = fy | 0; const tx = fx - ix, ty = fy - iy;
      ix = ((ix % (gw - 1)) + (gw - 1)) % (gw - 1); iy = ((iy % (gh - 1)) + (gh - 1)) % (gh - 1);
      const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
      const a = g[iy * gw + ix], b = g[iy * gw + ix + 1], c = g[(iy + 1) * gw + ix], d = g[(iy + 1) * gw + ix + 1];
      return a + (b - a) * sx + (c - a + (d - b - c + a) * sx) * sy;
    };
  }
  function smooth(e0, e1, v) { const t = Math.max(0, Math.min(1, (v - e0) / (e1 - e0))); return t * t * (3 - 2 * t); }
  function ramp(a, b, v) { return smooth(a, b, v); }

  /* ---------- ink physics ------------------------------------
     A riso ink is a translucent film; TRANSMITTANCE is its hex over 255,
     floored at EPS so a black ink still has a logarithm. Two inks stacked
     multiply. Beer-Lambert makes density (−ln T) linear in how much ink is
     down, and THAT turns the separation into least squares instead of a
     guess. */
  const EPS = 0.02;
  function inkTrans(hex) {
    const c = hex2rgb(hex);
    return [Math.max(EPS, c[0] / 255), Math.max(EPS, c[1] / 255), Math.max(EPS, c[2] / 255)];
  }
  function inkDensity(hex) { const t = inkTrans(hex); return [-Math.log(t[0]), -Math.log(t[1]), -Math.log(t[2])]; }

  /* ---------- the separation ---------------------------------
     Find the coverages a[] that reproduce a target colour when these inks
     are stacked on this paper — by inverting EXACTLY the model the press
     below applies, which is the whole trick.

     The prototype solved in Beer-Lambert density space (density linear in
     coverage: T^a) but stacked the plates by area coverage (Murray-Davies:
     (1−a) + a·T, a screened dot either prints or does not). Those disagree
     hard at low coverage — 14 % black is a mid grey in one model and a pale
     tint in the other — so every tone printed light and the chroma boost was
     making up for it. A screen IS area coverage, and ISO 12647-3's TVI
     already carries the optical gain, so the press stacks Murray-Davies and
     the solver inverts Murray-Davies:

        translucent:  R_c / P_c  =  Π_k (1 − a_k·u_kc),   u = s·(1 − T)
        opaque:       each plate covers what is under it, in drum order

     `s` is `solidity`, folded in so the solver asks for the coverage the
     press will actually lay. Both are solved by clamped coordinate descent
     (N ≤ 5, cheap): the translucent one takes Gauss-Newton steps on its
     log-space 1-D subproblem, the opaque one is affine in each plate and
     closes in one step. The L2 pull `lambda` toward zero is the GCR — of two
     mixes that hit a colour it takes the one laying down less ink. */
  function solveTrans(y, U, N, lambda, out) {
    for (let i = 0; i < N; i++) out[i] = 0;
    const r = [y[0], y[1], y[2]];                          // y − Σ ln(1 − a·u)
    for (let it = 0; it < 14; it++) {
      for (let k = 0; k < N; k++) {
        const u = U[k]; let a = out[k];
        const rr0 = r[0] + Math.log(1 - a * u[0]), rr1 = r[1] + Math.log(1 - a * u[1]), rr2 = r[2] + Math.log(1 - a * u[2]);
        for (let n = 0; n < 4; n++) {
          const f0 = 1 - a * u[0], f1 = 1 - a * u[1], f2 = 1 - a * u[2];
          const e0 = rr0 - Math.log(f0), e1 = rr1 - Math.log(f1), e2 = rr2 - Math.log(f2);
          const g0 = u[0] / f0, g1 = u[1] / f1, g2 = u[2] / f2;
          const grad = e0 * g0 + e1 * g1 + e2 * g2 + lambda * a;
          const hess = g0 * g0 + g1 * g1 + g2 * g2 + lambda;
          a -= grad / hess; if (a < 0) a = 0; else if (a > 1) a = 1;
        }
        out[k] = a;
        r[0] = rr0 - Math.log(1 - a * u[0]); r[1] = rr1 - Math.log(1 - a * u[1]); r[2] = rr2 - Math.log(1 - a * u[2]);
      }
    }
  }
  function solveOpaque(target, P, C, N, lambda, out) {
    for (let i = 0; i < N; i++) out[i] = 0;
    const before = [0, 0, 0];
    for (let it = 0; it < 12; it++) {
      for (let k = 0; k < N; k++) {
        /* what is on the sheet under plate k, and how the plates after it
           scale (M) and add (Q) whatever plate k leaves behind */
        before[0] = P[0]; before[1] = P[1]; before[2] = P[2];
        for (let j = 0; j < k; j++) { const a = out[j], c = C[j]; before[0] += a * (c[0] - before[0]); before[1] += a * (c[1] - before[1]); before[2] += a * (c[2] - before[2]); }
        let M = 1, Q0 = 0, Q1 = 0, Q2 = 0;
        for (let j = N - 1; j > k; j--) { const a = out[j], c = C[j]; M *= (1 - a); Q0 = Q0 * (1 - a) + a * c[0]; Q1 = Q1 * (1 - a) + a * c[1]; Q2 = Q2 * (1 - a) + a * c[2]; }
        const c = C[k];
        const A0 = before[0] * M + Q0, A1 = before[1] * M + Q1, A2 = before[2] * M + Q2;
        const B0 = (c[0] - before[0]) * M, B1 = (c[1] - before[1]) * M, B2 = (c[2] - before[2]) * M;
        let a = (B0 * (target[0] - A0) + B1 * (target[1] - A1) + B2 * (target[2] - A2)) / (B0 * B0 + B1 * B1 + B2 * B2 + lambda + 1e-9);
        out[k] = a < 0 ? 0 : a > 1 ? 1 : a;
      }
    }
  }
  /* kept for the harnesses that call it by name — the density-space solve */
  function solveClamped(q, A, N, lambda, out) {
    for (let i = 0; i < N; i++) out[i] = 0;
    const AA = new Float64Array(N);
    for (let i = 0; i < N; i++) { const c = A[i]; AA[i] = c[0] * c[0] + c[1] * c[1] + c[2] * c[2] + lambda; }
    const r = [q[0], q[1], q[2]];
    for (let it = 0; it < 24; it++) {
      for (let i = 0; i < N; i++) {
        const c = A[i], a0 = out[i];
        const step = (c[0] * r[0] + c[1] * r[1] + c[2] * r[2] - lambda * a0) / AA[i];
        let a = a0 + step; if (a < 0) a = 0; else if (a > 1) a = 1;
        const dlt = a - a0;
        if (dlt) { r[0] -= c[0] * dlt; r[1] -= c[1] * dlt; r[2] -= c[2] * dlt; out[i] = a; }
      }
    }
  }

  /* A colour cube → coverages, built once per ink set and cached; the
     per-pixel path is a trilinear lookup. `inkHexes` are resolved hexes,
     `paperHex` the stock. On dark stock the physics switches (see the
     header), not the shape of the table. */
  const LUT_N = 24;
  const lutCache = new Map();
  function sepLUT(inkHexes, paperHex, lambda, tac, boost, opaque, solidity) {
    const s = solidity != null ? solidity : 0.97;
    const key = inkHexes.join(',') + '|' + paperHex + '|' + lambda + '|' + tac + '|' + boost + '|' + s + '|' + (opaque ? 'o' : 't');
    const hit = lutCache.get(key); if (hit) return hit;
    if (lutCache.size > 24) lutCache.clear();
    const N = inkHexes.length;
    const P = hex2rgb(paperHex).map(v => v / 255);
    const Pe = P.map(v => Math.max(EPS, v));
    const C = inkHexes.map(hx => { const c = hex2rgb(hx); return [c[0] / 255, c[1] / 255, c[2] / 255]; });
    /* unit loss per plate: what one full plate takes off each channel, as
       the press lays it (solidity in) — never a full 1, so the log survives */
    const U = inkHexes.map(hx => { const t = inkTrans(hx); return [Math.min(0.985, s * (1 - t[0])), Math.min(0.985, s * (1 - t[1])), Math.min(0.985, s * (1 - t[2]))]; });
    const lut = new Float32Array(LUT_N * LUT_N * LUT_N * N);
    const a = new Float64Array(N), y = new Float64Array(3);
    let q = 0;
    for (let r = 0; r < LUT_N; r++) for (let g = 0; g < LUT_N; g++) for (let b = 0; b < LUT_N; b++) {
      let R = r / (LUT_N - 1), G = g / (LUT_N - 1), B = b / (LUT_N - 1);
      if (boost !== 1) {                                    // push chroma toward the ink gamut first
        const m = (R + G + B) / 3;
        R = m + (R - m) * boost; G = m + (G - m) * boost; B = m + (B - m) * boost;
        R = R < 0 ? 0 : R > 1 ? 1 : R; G = G < 0 ? 0 : G > 1 ? 1 : G; B = B < 0 ? 0 : B > 1 ? 1 : B;
      }
      if (opaque) { y[0] = R; y[1] = G; y[2] = B; solveOpaque(y, P, C, N, lambda, a); }
      else {
        /* the target relative to the stock, in log space; nothing prints
           lighter than the paper, so the ratio caps at 1 */
        y[0] = Math.log(Math.min(1, Math.max(EPS, R) / Pe[0]));
        y[1] = Math.log(Math.min(1, Math.max(EPS, G) / Pe[1]));
        y[2] = Math.log(Math.min(1, Math.max(EPS, B) / Pe[2]));
        solveTrans(y, U, N, lambda, a);
      }
      let sum = 0; for (let i = 0; i < N; i++) sum += a[i];
      const cap = opaque ? Math.min(1, tac) : tac;          // total area coverage limit
      if (sum > cap) { const k = cap / sum; for (let i = 0; i < N; i++) a[i] *= k; }
      for (let i = 0; i < N; i++) lut[q++] = a[i];
    }
    lutCache.set(key, lut);
    return lut;
  }

  /* ---------- screening --------------------------------------
     AM is the classic Euclidean / "chain" dot: round in the highlights,
     linked at 50 %, round holes in the shadows. Computed per pixel from a
     rotated cosine field rather than drawn as circles, so it antialiases for
     free and any angle costs the same. The cosine is tabled — periodic in
     both axes, so 512 samples IS the whole screen. */
  const COS_N = 512, COS_T = new Float32Array(COS_N);
  for (let i = 0; i < COS_N; i++) COS_T[i] = Math.cos(6.283185307 * i / COS_N);
  function cosT(u) { let i = (u * COS_N) | 0; i &= (COS_N - 1); return COS_T[i < 0 ? i + COS_N : i]; }
  /* the spot function: 0 at the cell centre (prints first), 1 at the corner */
  function spot(shape, u, v) {
    if (shape === 'line') return (1 + cosT(v)) * 0.5;
    if (shape === 'square') {
      const fu = Math.abs(u - Math.round(u)) * 2, fv = Math.abs(v - Math.round(v)) * 2;
      return Math.max(fu, fv);
    }
    if (shape === 'diamond') {
      const fu = Math.abs(u - Math.round(u)) * 2, fv = Math.abs(v - Math.round(v)) * 2;
      return Math.min(1, (fu + fv) * 0.5);
    }
    return (2 + cosT(u) + cosT(v)) * 0.25;                // chain / Euclidean
  }
  /* interleaved-gradient noise — a cheap, well-distributed FM screen, which
     is what the machine's own GRAIN mode is. Integer coordinates. */
  function ign(x, y) {
    const t = 0.06711056 * x + 0.00583715 * y;
    return (52.9829189 * (t - Math.floor(t))) % 1;
  }
  /* The GRAIN screen. Interleaved-gradient noise is fine per device pixel
     but at grain scale it streaks diagonally, so the stochastic screen
     thresholds against a 64×64 BLUE-NOISE tile instead — void-and-cluster,
     wraparound, generated once (docs/riso-press/README.md §2) and embedded
     so every host tiles the same grain. Each plate reads it at its own
     offset so the plates' grains do not correlate. */
  const BLUE_B64 =
    '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';
  const BLUE = (function () {
    const bin = typeof atob === "function" ? atob(BLUE_B64) : Buffer.from(BLUE_B64, "base64").toString("binary");
    const out = new Float32Array(4096);
    for (let i = 0; i < 4096; i++) out[i] = (bin.charCodeAt(i) + 0.5) / 256;
    return out;
  })();
  function blue(x, y) { return BLUE[((y & 63) << 6) | (x & 63)]; }

  /* ---------- tone transfer ----------------------------------
     ISO 12647-3's newsprint curve, sampled every tenth, mixed in by `gain`
     so 0 is a plotter and 1 is a newspaper. */
  const TVI = [0, 0.211, 0.390, 0.539, 0.662, 0.760, 0.838, 0.898, 0.943, 0.976, 1];
  function dotGain(a, g) {
    if (g <= 0) return a;
    const f = a * 10, i = Math.min(9, f | 0), t = f - i;
    return a + (TVI[i] + (TVI[i + 1] - TVI[i]) * t - a) * g;
  }
  /* …and its inverse. A press gains; a RIP hands the press a plate pulled
     DOWN by exactly as much, so the ink lands where the separation asked.
     Skip this and you count the gain twice — the picture darkens and the
     midtones close up, which is what an uncompensated riso file looks like
     off the machine. Worth a switch (`linear`), not a fix. */
  const invCache = new Map();
  function gainInverse(g) {
    const key = g.toFixed(3); const hit = invCache.get(key); if (hit) return hit;
    const N = 256, inv = new Float32Array(N + 1);
    let j = 0;
    for (let i = 0; i <= N; i++) {
      const target = i / N;
      while (j < N && dotGain((j + 1) / N, g) < target) j++;
      const a0 = j / N, a1 = (j + 1) / N, y0 = dotGain(a0, g), y1 = dotGain(a1, g);
      inv[i] = y1 > y0 ? a0 + (a1 - a0) * (target - y0) / (y1 - y0) : a0;
    }
    invCache.set(key, inv); return inv;
  }
  /* The press curve as one object, from loose options — everything a plate
     goes through between "how much tone is here" and "how much ink lands".
     The retrofitted treatments call press() on their coverages with this. */
  function pressOpts(o) {
    o = o || {};
    const gain = o.gain != null ? o.gain : 0.8;
    return {
      gain: gain,
      inv: (o.linear !== false && gain > 0) ? gainInverse(gain) : null,
      floor: o.floor != null ? o.floor : 0.10,
      ceiling: o.floodCap > 0 ? Math.min(o.ceiling != null ? o.ceiling : 0.98, o.floodCap) : (o.ceiling != null ? o.ceiling : 0.98),
      solidity: o.solidity != null ? o.solidity : 0.97,
      levels: o.levels || 0,
      wear: 0, density: 1
    };
  }
  function press(cov, tp) {
    if (cov < tp.floor + tp.wear) return 0;              // no hole in the master down here
    if (cov > tp.ceiling) cov = tp.ceiling;              // and no true solid up there
    if (tp.levels) cov = Math.round(cov * tp.levels) / tp.levels;
    if (tp.inv) cov = tp.inv[(cov * 256) | 0];           // the RIP pulls the plate down…
    return dotGain(cov, tp.gain) * tp.solidity * tp.density;   // …and the press puts it back
  }

  /* ---------- angles -----------------------------------------
     Riso orders them by BRIGHTNESS, not by the offset convention. */
  function angleSet(inkHexes) {
    const lum = inkHexes.map(function (hx, i) { return { i: i, L: luma(hx) }; })
      .sort(function (a, b) { return a.L - b.L; });
    const out = new Array(inkHexes.length);
    lum.forEach(function (e, rank) { out[e.i] = RISO_ANGLES[rank % RISO_ANGLES.length]; });
    return out;
  }

  /* ---------- the run ----------------------------------------
     A poster series is not one print, it is a run, and a run has a shape:
       · the drum inks up — the first sheets print light and come up to
         density over the first dozen, which is why studios pull ten and bin
         them;
       · the miss opens — as the stack drops and the feed tire warms,
         registration wanders wider, not differently;
       · the master wears — fine detail fills in and the floor creeps up;
       · the sheet picks up ink — the feed tires ride the top ~50 mm of
         every printed sheet and carry ink onto the next, so track marks
         BUILD across a run.
     Pull 0 = "not a specific sheet": the idealised print. `run:false` keeps
     the reseeding and drops the shape — same print, different dice. */
  function runModel(pull, run) {
    pull = pull | 0;
    return (run !== false && pull > 0) ? {
      density: (0.70 + 0.30 * ramp(0, 14, pull)) * (1 - 0.18 * ramp(90, 450, pull)),
      driftMul: 1 + 0.9 * ramp(0, 320, pull),
      wear: 0.05 * ramp(10, 300, pull),
      tire: 0.55 * ramp(4, 140, pull)
    } : { density: 1, driftMul: 1, wear: 0, tire: 0 };
  }

  /* ---------- registration -----------------------------------
     A riso misses register because the PAPER moves. Each plate gets its own
     rigid miss — a shift, a fraction of a degree, a shear that grows down the
     sheet as the feed skews it, and an elongation ALONG THE FEED ONLY (the
     write roller ran a hair fast). That last one is an anisotropic scale, not
     a shift, and it is why real misregistration is tight at one end of the
     sheet and wide at the other. A dual-drum press lays plates 1 and 2 in one
     pass, so those two register tightly. Sizes are design px; K scales them. */
  function regSet(N, o, w, h, K, RUN) {
    o = o || {}; RUN = RUN || runModel(o.pull, o.run);
    const rnd = mulberry32(((o.driftSeed | 0) || 7) + (o.pull | 0) * 7919);
    const regs = [];
    for (let k = 0; k < N; k++) {
      const slop = (o.duo !== false && k < 2) ? 0.15 : 1;
      const dr = (o.drift || 0) * K * slop * RUN.driftMul;
      regs.push(k === 0 ? { dx: 0, dy: 0, rot: 0, skew: 0, sy: 1 } : {
        dx: (rnd() * 2 - 1) * dr,
        dy: (rnd() * 2 - 1) * dr,
        rot: (rnd() * 2 - 1) * (o.drift || 0) * 0.09 * slop,
        skew: (rnd() * 2 - 1) * (o.skew || 0) * K * slop,
        sy: 1 + (rnd() * 2 - 1) * ((o.stretch || 0) * K * slop) / h
      });
    }
    return regs;
  }
  /* where plate k reads for output pixel (x,y) — the registered coordinate */
  function regXY(x, y, w, h, rg, out) {
    let px = x - rg.dx, py = y - rg.dy;
    if (rg.sy !== 1) py = (py - h / 2) / rg.sy + h / 2;          // elongation, feed axis only
    if (rg.skew) px -= rg.skew * (y / h - 0.5) * 2;              // feed skew opens down the sheet
    if (rg.rot) {
      const a = rg.rot * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a);
      const ox = px - w / 2, oy = py - h / 2;
      px = ox * ca - oy * sa + w / 2; py = ox * sa + oy * ca + h / 2;
    }
    out[0] = px; out[1] = py;
    return out;
  }
  function sampleAt(plate, w, h, x, y, rg) {
    const q = regXY(x, y, w, h, rg, _xy);
    const px = q[0], py = q[1];
    const qx = px < 0 ? 0 : px > w - 1 ? w - 1 : px | 0;
    const qy = py < 0 ? 0 : py > h - 1 ? h - 1 : py | 0;
    return plate[qy * w + qx];
  }
  const _xy = [0, 0];

  /* ---------- stacking ---------------------------------------
     Where two dots overlap the transmittances multiply; where they sit side
     by side the eye mixes them against the paper. That second case is what
     no amount of `multiply` compositing gives you, and it is where riso's
     luminosity comes from. `rgb` is the running pixel (0..1), mutated. */
  function lay(rgb, ink, T, C, opaque) {
    if (opaque) {                                         // screen ink: covers what is under it
      const u = 1 - ink;
      rgb[0] = rgb[0] * u + C[0] * ink; rgb[1] = rgb[1] * u + C[1] * ink; rgb[2] = rgb[2] * u + C[2] * ink;
    } else {                                              // riso ink: a filter over what is under it
      rgb[0] *= (1 - ink) + ink * T[0];
      rgb[1] *= (1 - ink) + ink * T[1];
      rgb[2] *= (1 - ink) + ink * T[2];
    }
  }

  /* ---------- defaults ---------------------------------------
     Every option the separation reads, with the value the plan fixed. The
     hosts spread these under their own dial names. */
  const DEFAULTS = {
    /* plates & stock */
    inks: null,          // ordered plate list (drum order); null = resolved from ink/ink2/paper — see resolveInks
    ink: 'pink', ink2: null, paper: 'day',
    stock: null,         // stock key or hex; null = the press's default for this paper — see resolveStock
    opaque: null,        // null = decide from the stock's darkness
    /* separation — `sepBoost` pushes chroma toward the ink gamut before the
       solve; 1.15 now that the solver reproduces tone honestly (the
       prototype's 1.45 was compensating for the density/coverage mismatch).
       `sepGCR` and `tac` are null = the paper decides: day runs 0.2 / 2.2,
       night presses harder at 0.12 / 2.8 so the black plate is not rationed
       by the ink limit and the shadows reach the Night surface. */
    sepGCR: null, sepBoost: 1.15, tac: null,
    contrast: 1, brightness: 0, saturation: 1, invertSource: false,
    /* screen */
    screen: 'fm', shape: 'chain', pitch: 9, grainPitch: 0.5, levels: 0,
    angles: null, screens: null, pitches: null,
    /* tone transfer */
    gain: 0.8, linear: true, solidity: 0.97, ceiling: 0.98, floor: 0.10, floodCap: 0,
    /* the press */
    drift: 0, driftSeed: 7, skew: 0, stretch: 0, duo: true,
    band: 0, bandPeriod: 90, streak: 0, starve: 0, wet: 0.25,
    pull: 0, run: true, pressOff: false,
    fountain: null, reg: null,
    /* proof */
    only: null, plateGrey: false, flat: false,
    /* scale */
    designW: 520
  };

  /* The plate set when the host has not named one. Day stock runs the accent
     and its partner — the classic two-colour riso. Night is option D: the
     same on CREAM with a BLACK plate ahead of them, so the shadows reach the
     Night surface and the print's darkness tracks the subject's rather than
     being a property of the page. */
  function resolveInks(o, pal) {
    if (Array.isArray(o.inks) && o.inks.length) return o.inks.slice(0, 5);
    const a = o.ink || 'pink';
    const b = o.ink2 || PARTNER[a] || 'blue';
    const list = a === b ? [a] : [a, b];
    return (o.paper === 'night' && a !== 'ink' && b !== 'ink') ? ['ink'].concat(list) : list;
  }
  /* `stock:null` = cream, on either theme (option D). An explicit stock —
     including `night` — is the opaque / screenprint path when it is dark. */
  function resolveStock(o) {
    if (o.stock) return stockHex(o.stock);
    return PAPER.day;
  }

  /* ---------- separate ---------------------------------------
     src: RGBA bytes of the framed, graded, soft-focused photograph, w×h,
     ALREADY composited over the stock (a transparent pixel is paper).
     Returns { plates: Float32Array[N] (coverage 0..1 per pixel), inkHexes,
     paperHex, opaque, o }. Contrast/brightness/saturation are applied here,
     in RGB, before the cube — the same numbers the prototype used. */
  function separate(src, w, h, opts) {
    const o = Object.assign({}, DEFAULTS, opts || {});
    const night = o.paper === 'night';
    if (o.sepGCR == null) o.sepGCR = night ? 0.12 : 0.2;
    if (o.tac == null) o.tac = night ? 2.8 : 2.2;
    const pal = Object.assign({}, PAL, o.palette || {});
    const inkKeys = resolveInks(o, pal);
    const inkHexes = inkKeys.map(k => inkHex(k, pal));
    const paperHex = resolveStock(o);
    const P = hex2rgb(paperHex);
    const opaque = o.opaque != null ? !!o.opaque : (P[0] + P[1] + P[2] < 340);
    const lut = sepLUT(inkHexes, paperHex, o.sepGCR, o.tac, o.sepBoost, opaque, o.solidity);
    const N = inkHexes.length;
    const plates = []; for (let i = 0; i < N; i++) plates.push(new Float32Array(w * h));
    const S = LUT_N - 1, ct = o.contrast != null ? o.contrast : 1, br = o.brightness || 0, sat = o.saturation != null ? o.saturation : 1;
    const dR = LUT_N * LUT_N * N, dG = LUT_N * N, dB = N;
    const inv = !!o.invertSource, grade = (ct !== 1 || br !== 0 || sat !== 1);
    for (let p = 0, i = 0; p < w * h; p++, i += 4) {
      let R = src[i] / 255, G = src[i + 1] / 255, B = src[i + 2] / 255;
      const A = src[i + 3];
      if (A < 255) {                                    // transparent = paper shows
        const t = A / 255;
        R = R * t + (P[0] / 255) * (1 - t); G = G * t + (P[1] / 255) * (1 - t); B = B * t + (P[2] / 255) * (1 - t);
      }
      if (inv) { R = 1 - R; G = 1 - G; B = 1 - B; }
      if (grade) {
        if (sat !== 1) { const y = 0.299 * R + 0.587 * G + 0.114 * B; R = y + (R - y) * sat; G = y + (G - y) * sat; B = y + (B - y) * sat; }
        R = (R - 0.5) * ct + 0.5 + br; G = (G - 0.5) * ct + 0.5 + br; B = (B - 0.5) * ct + 0.5 + br;
        R = R < 0 ? 0 : R > 1 ? 1 : R; G = G < 0 ? 0 : G > 1 ? 1 : G; B = B < 0 ? 0 : B > 1 ? 1 : B;
      }
      const fr = R * S, fg = G * S, fb = B * S;
      const ir = Math.min(S - 1, fr | 0), ig = Math.min(S - 1, fg | 0), ib = Math.min(S - 1, fb | 0);
      const tr = fr - ir, tg = fg - ig, tb = fb - ib;
      const base = ((ir * LUT_N + ig) * LUT_N + ib) * N;
      for (let k = 0; k < N; k++) {
        const c000 = lut[base + k], c001 = lut[base + dB + k];
        const c010 = lut[base + dG + k], c011 = lut[base + dG + dB + k];
        const c100 = lut[base + dR + k], c101 = lut[base + dR + dB + k];
        const c110 = lut[base + dR + dG + k], c111 = lut[base + dR + dG + dB + k];
        const c00 = c000 + (c001 - c000) * tb, c01 = c010 + (c011 - c010) * tb;
        const c10 = c100 + (c101 - c100) * tb, c11 = c110 + (c111 - c110) * tb;
        const c0 = c00 + (c01 - c00) * tg, c1 = c10 + (c11 - c10) * tg;
        plates[k][p] = c0 + (c1 - c0) * tr;
      }
    }
    return { plates: plates, inkKeys: inkKeys, inkHexes: inkHexes, paperHex: paperHex, opaque: opaque, o: o };
  }

  /* ---------- the press --------------------------------------
     Screen every plate, register it, run it through the press curve, and
     stack it on the sheet. `sep` is what separate() returned (or anything
     with the same shape — a retrofitted treatment can hand in its own
     plates). Writes RGBA into `out` (w*h*4 bytes) and returns it. */
  function pressPlates(sep, w, h, out) {
    const o = sep.o, N = sep.plates.length, plates = sep.plates;
    const opaque = sep.opaque, P = hex2rgb(sep.paperHex);
    const pal = Object.assign({}, PAL, o.palette || {});
    const K = w / (o.designW || 520);
    const off = !!o.pressOff;                              // draft render: the idealised sheet
    const pull = off ? 0 : (o.pull | 0);
    const RUN = runModel(pull, o.run);
    const tp = pressOpts(o); tp.wear = RUN.wear; tp.density = RUN.density;

    const ang = o.angles || angleSet(sep.inkHexes);
    const cell = Math.max(2, o.pitch * K);
    const T = sep.inkHexes.map(inkTrans);
    const C = sep.inkHexes.map(hx => { const c = hex2rgb(hx); return [c[0] / 255, c[1] / 255, c[2] / 255]; });
    const regs = o.reg || (off ? null : regSet(N, o, w, h, K, RUN));
    const noReg = { dx: 0, dy: 0, rot: 0, skew: 0, sy: 1 };

    /* the drum: density pulses once per revolution; a dry roller streaks
       down the length of the sheet in the same place on every copy. Both
       belong to the PLATE, before the stack, which is why they tint. */
    const tireOn = RUN.tire > 0.01;
    const tireNz = tireOn ? valueNoise(w, h, Math.max(6, 16 * K), 0x71BE) : null;
    const bandOn = !off && o.band > 0, starveOn = !off && o.starve > 0, streakOn = !off && o.streak > 0;
    const bandPx = Math.max(8, o.bandPeriod * K);
    const starveNz = starveOn ? valueNoise(w, h, Math.max(24, 70 * K), 0xB17E + pull * 131) : null;
    let streakT = null;
    if (streakOn) {
      streakT = [];
      for (let k = 0; k < N; k++) {
        const nz = valueNoise(w, 2, Math.max(10, 30 * K), 0x57EA + k * 977);
        const col = new Float32Array(w);
        for (let x = 0; x < w; x++) { const v = nz(x, 0); col[x] = 1 - o.streak * 0.7 * v * v; }
        streakT.push(col);
      }
    }

    const pre = [];
    for (let k = 0; k < N; k++) {
      const a = ang[k % ang.length] * Math.PI / 180;
      const ft = o.fountain && o.fountain[k];
      let fT = null, fC = null, fc = 0, fs = 0, fD = 1;
      if (ft && ft.to) {
        const toHex = inkHex(ft.to, pal);
        fT = inkTrans(toHex);
        const c = hex2rgb(toHex); fC = [c[0] / 255, c[1] / 255, c[2] / 255];
        const fa = (ft.angle != null ? ft.angle : 0) * Math.PI / 180;
        fc = Math.cos(fa); fs = Math.sin(fa);
        /* the blend zone widens with every pull — by sheet 50 a split
           fountain that started as two bands is a rainbow */
        const soft = (ft.soft != null ? ft.soft : 1) * (1 + pull * 0.012);
        fD = (w * Math.abs(fc) + h * Math.abs(fs)) / Math.max(0.05, soft) || 1;
      }
      const scr = o.screens ? o.screens[k % o.screens.length] : null;
      const pit = o.pitches ? o.pitches[k % o.pitches.length] : null;
      pre.push({
        cos: Math.cos(a), sin: Math.sin(a), T: T[k], C: C[k],
        reg: regs ? regs[k % regs.length] : noReg,
        phase: k * 2.399 + pull * 0.61, starvePhase: k * 311.7 + pull * 43.1,
        streak: streakT ? streakT[k] : null,
        fT: fT, fC: fC, fc: fc, fs: fs, fD: fD,
        fm: scr ? scr === 'fm' : null,
        cell: pit != null ? Math.max(2, pit * K) : null
      });
    }

    const d = out || new Uint8ClampedArray(w * h * 4);
    const flat = !!o.flat, shape = o.shape, fm = o.screen === 'fm';
    const wet = o.wet, plateGrey = !!o.plateGrey, only = o.only;
    /* the grain grid: `grainPitch` design px per grain cell, so the export
       carries the same grain as the preview (a device-pixel hash would not) */
    const gK = 1 / Math.max(0.05, o.grainPitch * K);
    const rgb = [0, 0, 0], xy = [0, 0];

    for (let y = 0, p = 0; y < h; y++) {
      for (let x = 0; x < w; x++, p++) {
        rgb[0] = P[0] / 255; rgb[1] = P[1] / 255; rgb[2] = P[2] / 255;
        let wetAcc = 0;                                   // ink already on the sheet here
        for (let k = 0; k < N; k++) {
          if (only != null && k !== only) continue;
          const pr = pre[k], rg = pr.reg;
          let px = x, py = y;
          if (rg !== noReg) { regXY(x, y, w, h, rg, xy); px = xy[0]; py = xy[1]; }
          const qx = px < 0 ? 0 : px > w - 1 ? w - 1 : px | 0;
          const qy = py < 0 ? 0 : py > h - 1 ? h - 1 : py | 0;
          let cov = press(plates[k][qy * w + qx], tp);
          if (cov <= 0.002) continue;
          /* wet-on-wet: a later drum lays its ink onto an oily sheet and
             less of it transfers, which is why swapping two inks changes
             the colour of the overprint */
          if (wet && wetAcc > 0) cov *= 1 - wet * Math.min(1, wetAcc);
          if (pr.streak) cov *= pr.streak[x];
          if (bandOn) cov *= 1 - o.band * 0.5 * (1 + Math.cos(6.2831853 * y / bandPx + pr.phase));
          if (starveOn) cov *= 1 - o.starve * starveNz(x + pr.starvePhase, y);
          if (cov <= 0.002) continue;

          let ink;
          if (flat) ink = cov;
          else {
            const kfm = pr.fm != null ? pr.fm : fm;
            const kcell = pr.cell != null ? pr.cell : cell;
            let t, e;
            if (kfm) { t = blue(((px * gK) | 0) + k * 17, ((py * gK) | 0) + k * 29); e = 0.25; }
            else {
              const u = (px * pr.cos - py * pr.sin) / kcell, v = (px * pr.sin + py * pr.cos) / kcell;
              t = spot(shape, u, v);
              e = 1 / kcell * 1.6 + 0.02;                 // one screen-pixel of antialiasing
            }
            ink = (cov - t) / e + 0.5;
            ink = ink < 0 ? 0 : ink > 1 ? 1 : ink;
          }
          if (ink <= 0.002) continue;
          wetAcc += ink;

          /* split fountain — ONE drum loaded with two inks that blend
             across it, so the colour changes with where you are on the
             sheet, not with what the picture is doing */
          let cc = pr.C, tt = pr.T;
          if (pr.fT) {
            let f = 0.5 + ((x - w / 2) * pr.fc + (y - h / 2) * pr.fs) / pr.fD;
            f = f < 0 ? 0 : f > 1 ? 1 : f;
            cc = [cc[0] + (pr.fC[0] - cc[0]) * f, cc[1] + (pr.fC[1] - cc[1]) * f, cc[2] + (pr.fC[2] - cc[2]) * f];
            tt = [tt[0] + (pr.fT[0] - tt[0]) * f, tt[1] + (pr.fT[1] - tt[1]) * f, tt[2] + (pr.fT[2] - tt[2]) * f];
          }
          if (plateGrey) { const u = 1 - ink; rgb[0] *= u; rgb[1] *= u; rgb[2] *= u; }   // the proof sheet a shop pulls
          else lay(rgb, ink, tt, cc, opaque);
        }
        /* the tires ride the head of the sheet, so what they carry lands
           there — smeared along the feed, strongest at the lead edge, and
           building with every copy pulled */
        if (tireOn) {
          const head = 1 - ramp(0.02, 0.16, y / h);
          if (head > 0.002) {
            const t = RUN.tire * head * Math.pow(tireNz(x, y * 0.25), 2.2) * 0.55;
            if (t > 0.002) { rgb[0] *= 1 - t * 0.75; rgb[1] *= 1 - t * 0.8; rgb[2] *= 1 - t * 0.85; }
          }
        }
        const i = p << 2;
        d[i] = rgb[0] * 255; d[i + 1] = rgb[1] * 255; d[i + 2] = rgb[2] * 255; d[i + 3] = 255;
      }
    }
    if (plateGrey) {                                     // a proof is paper-white, not stock-coloured
      for (let i = 0; i < d.length; i += 4) {
        const g = (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / (0.299 * P[0] + 0.587 * P[1] + 0.114 * P[2]) * 255;
        d[i] = d[i + 1] = d[i + 2] = g > 255 ? 255 : g;
      }
    }
    return d;
  }

  /* separate + press in one call — the whole treatment. */
  function render(src, w, h, opts, out) {
    return pressPlates(separate(src, w, h, opts), w, h, out);
  }

  /* ---------- for the retrofit -------------------------------
     A two-ink (or N-ink) stack of coverage buffers a treatment already has —
     halftone `two`, off-register, overprint — pressed with real registration
     and transmittance instead of canvas `multiply`. `plates` are coverages
     the treatment computed (already screened if it screens). Same options
     as pressPlates minus the screen. */
  function stackPlates(plates, inkHexes, paperHex, w, h, opts, out) {
    const o = Object.assign({}, DEFAULTS, { flat: true }, opts || {});
    const P = hex2rgb(paperHex);
    const opaque = o.opaque != null ? !!o.opaque : (P[0] + P[1] + P[2] < 340);
    return pressPlates({ plates: plates, inkHexes: inkHexes, inkKeys: null, paperHex: paperHex, opaque: opaque, o: o }, w, h, out);
  }

  /* Measured darkest reachable through each path (L*), for the hint copy:
     cream+black 10.8 · +pink 6.5 · +pink+blue 4.7 · kraft+black+pink 7.7 ·
     black stock opaque 2.0. The Night surface #0a0703 is L* 2.0. */
  return {
    REV: REV,
    PAL: PAL, PAPER: PAPER, INK: INK, STOCKS: STOCKS, PARTNER: PARTNER, NEVER_PAIR: NEVER_PAIR,
    RISO_ANGLES: RISO_ANGLES, SCREENS: SCREENS, DEFAULTS: DEFAULTS, TVI: TVI, LUT_N: LUT_N,
    hex2rgb: hex2rgb, inkHex: inkHex, stockHex: stockHex, isDark: isDark, inkOnStock: inkOnStock, luma: luma,
    mulberry32: mulberry32, valueNoise: valueNoise, smooth: smooth,
    inkTrans: inkTrans, inkDensity: inkDensity, solveClamped: solveClamped, sepLUT: sepLUT,
    cosT: cosT, spot: spot, ign: ign, blue: blue, BLUE: BLUE,
    dotGain: dotGain, gainInverse: gainInverse, pressOpts: pressOpts, press: press,
    angleSet: angleSet, runModel: runModel, regSet: regSet, regXY: regXY, sampleAt: sampleAt, lay: lay,
    resolveInks: resolveInks, resolveStock: resolveStock,
    separate: separate, pressPlates: pressPlates, stackPlates: stackPlates, render: render
  };
});
