/* ============================================================
   RISO LAB — prototype: separation, screening, and the press
   ============================================================
   The shipped engine maps ONE luminance channel to colour. A riso
   maps a COLOUR image to N greyscale plates, screens each at its
   own angle, and stacks them as translucent ink on paper. This
   file does the latter, so the two can be compared side by side.

   Exposes window.LAB.render(cv, opts).
   ============================================================ */
window.LAB = (function () {
  "use strict";

  const PAL = {
    blue: '#18a7e0', green: '#43b02a', yellow: '#fddf00',
    amber: '#fdb515', purple: '#6e3179', pink: '#ed1b72', red: '#ed2224',
    ink: '#0d0905', cream: '#fffbf1'
  };
  /* Stock is ink zero. Riso ink is translucent, so the sheet
     multiplies through every plate — pink on a straw stock reads
     orange, and a two-ink job on a tinted sheet gives you four
     tones for the price of two masters. None of these is pure
     white; no printing paper is. */
  const PAPER = {
    day: '#fffbf1', night: '#0a0703',
    kraft: '#d8c3a0',        // recycled brown
    news: '#e8e2d2',         // groundwood, L*~82 and warm
    grey: '#b9b4ac',         // board
    straw: '#e9dcae',        // Cairn Straw
    flint: '#9c9a90',        // Context Flint, warm grey recycled
    salmon: '#e8b9a0',       // Context Salmon
    steel: '#5d6a73'         // a dark-but-not-black stock
  };

  function hex2rgb(h) {
    h = h.replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join('');
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
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

  /* ---------- ink physics -----------------------------------
     A riso ink is a translucent film. At full coverage it passes
     a fraction of the light that reaches the paper — its
     TRANSMITTANCE, one number per channel. Two inks stacked
     multiply their transmittances, which is why pink over blue
     goes navy and pink over yellow goes red. Beer-Lambert makes
     density (= −ln transmittance) linear in how much ink is
     down, and THAT is what turns the separation into a
     least-squares problem instead of a guess.
     -------------------------------------------------------- */
  const EPS = 0.02;
  function inkTrans(key) {
    const c = hex2rgb(PAL[key] || key);
    return [Math.max(EPS, c[0] / 255), Math.max(EPS, c[1] / 255), Math.max(EPS, c[2] / 255)];
  }
  function inkDensity(key) { const t = inkTrans(key); return [-Math.log(t[0]), -Math.log(t[1]), -Math.log(t[2])]; }

  /* ---------- the separation --------------------------------
     Find the coverages a[] that reproduce a target colour when
     these inks are stacked on this paper. In density space:

        d_target − d_paper  ≈  A · a          (A = 3 × N)

     Solved by clamped coordinate descent (N ≤ 5, so this costs
     nothing), with an L2 pull toward zero that acts as GCR: of
     two ink mixes that land on the same colour it takes the one
     that lays down less ink and lets more paper through.
     -------------------------------------------------------- */
  function solveClamped(q, A, N, lambda, out) {
    for (let i = 0; i < N; i++) out[i] = 0;
    const AA = new Float64Array(N);
    for (let i = 0; i < N; i++) { const c = A[i]; AA[i] = c[0] * c[0] + c[1] * c[1] + c[2] * c[2] + lambda; }
    const r = [q[0], q[1], q[2]];
    for (let it = 0; it < 24; it++) {
      for (let i = 0; i < N; i++) {
        const c = A[i], a0 = out[i];
        const step = (c[0] * r[0] + c[1] * r[1] + c[2] * r[2] + lambda * a0) / AA[i];
        let a = a0 + step; if (a < 0) a = 0; else if (a > 1) a = 1;
        const dlt = a - a0;
        if (dlt) { r[0] -= c[0] * dlt; r[1] -= c[1] * dlt; r[2] -= c[2] * dlt; out[i] = a; }
      }
    }
  }

  /* A colour cube → coverages, built once per ink set; the
     per-pixel path is then a trilinear lookup. On dark stock the
     matrix changes rather than the solver: a translucent ink
     cannot print light on black, only an opaque one can — which
     is a silkscreen, not a riso. So dark stock switches physics.
     Coverage becomes how much of the pixel each ink COVERS, the
     mix is linear in RGB against the stock, and the constraint
     is Σa ≤ 1: you cannot cover more than all of it. */
  const LUT_N = 24;
  const lutCache = new Map();
  function sepLUT(inkKeys, paperHex, lambda, tac, boost, opaque) {
    const key = inkKeys.join(',') + '|' + paperHex + '|' + lambda + '|' + tac + '|' + boost + '|' + (opaque ? 'o' : 't');
    const hit = lutCache.get(key); if (hit) return hit;
    const N = inkKeys.length;
    const Praw = hex2rgb(paperHex).map(v => v / 255);
    const A = opaque
      ? inkKeys.map(k => { const c = hex2rgb(PAL[k] || k); return [c[0] / 255 - Praw[0], c[1] / 255 - Praw[1], c[2] / 255 - Praw[2]]; })
      : inkKeys.map(inkDensity);
    const P = Praw.map(v => Math.max(EPS, v));
    const dP = [-Math.log(P[0]), -Math.log(P[1]), -Math.log(P[2])];
    const lut = new Float32Array(LUT_N * LUT_N * LUT_N * N);
    const a = new Float64Array(N), d = new Float64Array(3);
    let q = 0;
    for (let r = 0; r < LUT_N; r++) for (let g = 0; g < LUT_N; g++) for (let b = 0; b < LUT_N; b++) {
      let R = r / (LUT_N - 1), G = g / (LUT_N - 1), B = b / (LUT_N - 1);
      if (boost !== 1) {                                    // push chroma toward the ink gamut first
        const m = (R + G + B) / 3;
        R = m + (R - m) * boost; G = m + (G - m) * boost; B = m + (B - m) * boost;
        R = R < 0 ? 0 : R > 1 ? 1 : R; G = G < 0 ? 0 : G > 1 ? 1 : G; B = B < 0 ? 0 : B > 1 ? 1 : B;
      }
      if (opaque) { d[0] = R - Praw[0]; d[1] = G - Praw[1]; d[2] = B - Praw[2]; }
      else {
        d[0] = -Math.log(Math.max(EPS, R)) - dP[0];
        d[1] = -Math.log(Math.max(EPS, G)) - dP[1];
        d[2] = -Math.log(Math.max(EPS, B)) - dP[2];
      }
      solveClamped(d, A, N, lambda, a);
      let sum = 0; for (let i = 0; i < N; i++) sum += a[i];
      const cap = opaque ? Math.min(1, tac) : tac;          // total area coverage limit
      if (sum > cap) { const k = cap / sum; for (let i = 0; i < N; i++) a[i] *= k; }
      for (let i = 0; i < N; i++) lut[q++] = a[i];
    }
    lutCache.set(key, lut);
    return lut;
  }

  /* ---------- screening -------------------------------------
     AM is the classic Euclidean / "chain" dot: round in the
     highlights, linked at 50 %, round holes in the shadows.
     Computed per pixel from a rotated cosine field rather than
     drawn as circles, so it antialiases for free and any angle
     costs the same. The cosine is tabled — it is periodic in
     both axes, so 512 samples IS the whole screen, and two array
     reads replace two transcendentals on every pixel of every
     plate.
     -------------------------------------------------------- */
  const COS_N = 512, COS_T = new Float32Array(COS_N);
  for (let i = 0; i < COS_N; i++) COS_T[i] = Math.cos(6.283185307 * i / COS_N);
  function cosT(u) { let i = (u * COS_N) | 0; i &= (COS_N - 1); return COS_T[i < 0 ? i + COS_N : i]; }
  function spotSquare(u, v) {
    const fu = Math.abs(u - Math.round(u)) * 2, fv = Math.abs(v - Math.round(v)) * 2;
    return Math.max(fu, fv);
  }
  function spotDiamond(u, v) {
    const fu = Math.abs(u - Math.round(u)) * 2, fv = Math.abs(v - Math.round(v)) * 2;
    return Math.min(1, (fu + fv) * 0.5);
  }
  /* interleaved-gradient noise — a cheap, well-distributed FM
     screen, which is what the machine's own GRAIN mode is */
  function ign(x, y) {
    const t = 0.06711056 * x + 0.00583715 * y;
    return (52.9829189 * (t - Math.floor(t))) % 1;
  }

  /* ---------- tone transfer ---------------------------------
     The naive `a + g·a·(1−a)` bump is nowhere near hard enough.
     ISO 12647-3 measures a 50 % dot printing at 76 % on
     newsprint, and riso is at least newsprint-class — dot gain
     is the thing practitioners say defines the process. This is
     that curve, sampled every tenth, mixed in by `gain` so 0 is
     a plotter and 1 is a newspaper.
     -------------------------------------------------------- */
  const TVI = [0, 0.211, 0.390, 0.539, 0.662, 0.760, 0.838, 0.898, 0.943, 0.976, 1];
  function dotGain(a, g) {
    if (g <= 0) return a;
    const f = a * 10, i = Math.min(9, f | 0), t = f - i;
    return a + (TVI[i] + (TVI[i + 1] - TVI[i]) * t - a) * g;
  }
  /* …and its inverse. A press gains; a RIP hands the press a
     plate pulled DOWN by exactly as much, so the ink lands where
     the separation asked for it. Skip this and you count the
     gain twice — the picture darkens and the midtones close up,
     which is precisely what an uncompensated riso file looks
     like coming off the machine. Worth a switch, not a fix. */
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

  /* ---------- the press -------------------------------------
     Screen every plate, then stack them. The stack is the point:
     where two dots overlap the transmittances multiply (pink
     over blue → navy); where they sit side by side the eye mixes
     them against the paper. That second case is what no amount
     of `multiply` compositing gives you, and it is where riso's
     luminosity comes from.
     -------------------------------------------------------- */
  function render(cv, opts) {
    const o = Object.assign({
      inks: ['pink', 'blue'], paper: 'day',
      lambda: 0.06, tac: 2.2, boost: 1.15,
      /* GRAIN — the stochastic screen — is what a riso actually
         does on 95 % of jobs; the dot screen is the deliberate
         choice, not the default. */
      screen: 'fm', shape: 'am', pitch: 9, opaque: null,
      gain: 0.8, linear: true,
      /* Two different ceilings, and I had them fused.
         `ceiling` is what the PLATE can carry — a master is a
         sheet of holes and the last few per cent close up, so
         ~97 %, not 100. `solidity` is how completely ink covers
         where it does land; the few per cent of stock that always
         shows through is where a riso flat gets its life.
         The 75–85 % figure studios quote is neither: it is design
         advice about big flood areas, because past that the sheet
         sticks to the drum and tide-marks. That is `floodCap`,
         off by default — it is a rule for the artwork, not a
         property of the press, and clamping everything to it is
         why nothing could print dark. */
      solidity: 0.97, ceiling: 0.98, floor: 0.10, floodCap: 0,
      levels: 0,       // quantise the plate to N tones (0 = off)
      angles: null, reg: null,
      /* ---- the press, per plate ---- */
      drift: 0,        // registration wander: design px each plate misses by
      driftSeed: 7,
      skew: 0,         // paper-feed skew, design px of shear top to bottom
      stretch: 0,      // elongation: design px the plate grows ALONG THE FEED
      duo: true,       // dual-drum press — plates 1 & 2 register in one pass
      band: 0,         // once-per-revolution density pulse, across the sheet
      bandPeriod: 90,  // drum circumference in design px
      streak: 0,       // axial streaks — fixed x, the length of the sheet
      starve: 0,       // ink starvation — blotchy under-inking
      wet: 0.25,       // wet-on-wet: how much less ink a later pass transfers
      pull: 0,         // which copy off the run this is
      run: true,       // …and model what that MEANS, not just reseed noise
      invertSource: false,  // print the negative (the studio's own advice for
                            // a dark poster on light stock)
      fountain: null,  // per plate { to, angle, soft } — a split fountain
      screens: null, pitches: null,   // per-plate screen overrides
      only: null, plateGrey: false,   // the proof sheet a shop pulls
      contrast: 1, brightness: 0, src: null, fit: 'cover',
      flat: false      // no screen at all — continuous tone
    }, opts || {});

    const w = cv.width, h = cv.height, cx = cv.getContext('2d');
    const N = o.inks.length;
    const paperHex = PAPER[o.paper] || o.paper;
    const P = hex2rgb(paperHex);
    const K = w / 520;                                      // design px → device px

    /* what the press photographs */
    const sc = document.createElement('canvas'); sc.width = w; sc.height = h;
    const sx = sc.getContext('2d', { willReadFrequently: true });
    sx.fillStyle = paperHex; sx.fillRect(0, 0, w, h);
    if (o.src) {
      const s = o.src, sw = s.naturalWidth || s.width, sh = s.naturalHeight || s.height;
      const k = (o.fit === 'contain' ? Math.min(w / sw, h / sh) : Math.max(w / sw, h / sh)) * (o.zoom || 1);
      /* pan is a fraction of the frame — enough to fake a moving
         source for the temporal tests */
      sx.drawImage(s, (w - sw * k) / 2 + (o.panX || 0) * w, (h - sh * k) / 2 + (o.panY || 0) * h, sw * k, sh * k);
    }
    const src = sx.getImageData(0, 0, w, h).data;

    /* ---- separate ---- */
    const opaque = o.opaque != null ? o.opaque : (P[0] + P[1] + P[2] < 340);   // dark stock ⇒ screen physics
    const lut = sepLUT(o.inks, paperHex, o.lambda, o.tac, o.boost, opaque);
    const plates = []; for (let i = 0; i < N; i++) plates.push(new Float32Array(w * h));
    const S = LUT_N - 1, ct = o.contrast, br = o.brightness;
    const dR = LUT_N * LUT_N * N, dG = LUT_N * N, dB = N;
    for (let p = 0, i = 0; p < w * h; p++, i += 4) {
      let R = src[i] / 255, G = src[i + 1] / 255, B = src[i + 2] / 255;
      if (o.invertSource) { R = 1 - R; G = 1 - G; B = 1 - B; }
      if (ct !== 1 || br) {
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

    /* ---- screen angles ----
       Riso orders them by BRIGHTNESS, not by the offset
       convention. 45° is the angle the eye notices least, so it
       goes to the ink carrying the most contrast; 0° — the worst
       — goes to the one nobody can see anyway. */
    const RISO_ANGLES = [45, 75, 15, 0, 30];
    let ang = o.angles;
    if (!ang) {
      const lum = o.inks.map(function (k, i) {
        const c = hex2rgb(PAL[k] || k);
        return { i: i, L: 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2] };
      }).sort(function (a, b) { return a.L - b.L; });
      ang = new Array(N);
      lum.forEach(function (e, rank) { ang[e.i] = RISO_ANGLES[rank % RISO_ANGLES.length]; });
    }
    const cell = Math.max(2, o.pitch * K);
    const T = o.inks.map(inkTrans);
    const C = o.inks.map(k => { const c = hex2rgb(PAL[k] || k); return [c[0] / 255, c[1] / 255, c[2] / 255]; });

    /* ---- the pull ----
       A poster series is not one print, it is a run: sheet 40 off
       the same master misses register differently from sheet 1,
       its split fountain has blended further, and the drum has
       starved somewhere new. Everything random below is seeded
       from this number, so a run comes out a family, not clones. */
    const pull = o.pull | 0;

    /* What the pull number actually MEANS, rather than just which
       random numbers it draws. A run is not a set of identical
       sheets with different noise on them — it has a shape:

         · the drum inks up. The first sheets off a riso print
           light and come up to density over the first dozen or so,
           which is why studios pull ten and bin them.
         · the miss opens. As the stack drops and the feed tire
           warms, registration wanders wider, not differently.
         · the master wears. Fine detail fills in and the tone
           floor creeps up — a 12 % dot that printed at sheet 1 has
           gone by sheet 300.
         · the sheet picks up ink. Rubber feed tires ride over the
           top ~50 mm of every printed sheet and carry ink onto the
           next one, so track marks BUILD across a run.

       Pull 0 means "not a specific sheet" — the idealised print,
       full density, no wear. Pull 1 is the first sheet off a cold
       drum and prints light, which is why studios pull ten and bin
       them. Off (`run: false`) you get the old behaviour: same
       print, different dice. */
    function ramp(a, b, v) { const t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); }
    const RUN = (o.run && pull > 0) ? {
      density: (0.70 + 0.30 * ramp(0, 14, pull)) * (1 - 0.18 * ramp(90, 450, pull)),
      driftMul: 1 + 0.9 * ramp(0, 320, pull),
      wear: 0.05 * ramp(10, 300, pull),        // the floor creeps up
      tire: 0.55 * ramp(4, 140, pull)          // track marks accumulate
    } : { density: 1, driftMul: 1, wear: 0, tire: 0 };

    /* ---- registration ----
       A riso misses register because the PAPER moves. Each plate
       gets its own rigid miss — a shift, a fraction of a degree,
       a shear that grows down the sheet as the feed skews it, and
       an elongation ALONG THE FEED ONLY, because the write roller
       ran a hair fast. That last one is an anisotropic scale, not
       a shift, and it is why real misregistration is tight at one
       end of the sheet and wide at the other. */
    let regs = o.reg;
    if (!regs) {
      const rnd = mulberry32((o.driftSeed | 0) + pull * 7919);
      regs = [];
      for (let k = 0; k < N; k++) {
        /* a dual-drum press lays plates 1 and 2 in ONE pass, so
           those two register tightly; the rest go through the
           feed again and take the full miss */
        const slop = (o.duo && k < 2) ? 0.15 : 1;
        const dr = o.drift * K * slop * RUN.driftMul;
        regs.push(k === 0 ? { dx: 0, dy: 0, rot: 0, skew: 0, sy: 1 }
          : {
            dx: (rnd() * 2 - 1) * dr,
            dy: (rnd() * 2 - 1) * dr,
            rot: (rnd() * 2 - 1) * o.drift * 0.09 * slop,
            skew: (rnd() * 2 - 1) * o.skew * K * slop,
            sy: 1 + (rnd() * 2 - 1) * (o.stretch * K * slop) / h
          });
      }
    }

    /* ---- the drum ----
       Ink reaches the master through a rotating drum, so its
       density pulses once per revolution; and where the roller
       runs dry along the drum AXIS you get a stripe down the
       length of the sheet — same place on every copy, whatever
       the picture is doing there. Both belong to the PLATE,
       before the stack, which is why they tint: a starved patch
       in the pink plate goes green-ish, not grey. */
    /* Track marks. The feed tires ride the top of every printed
       sheet, so the ink they pick up lands on the next one — which
       is why studios tell you to keep heavy artwork out of the top
       50 mm, and why a long run gets dirtier at the head. */
    const tireOn = RUN.tire > 0.01;
    const tireNz = tireOn ? valueNoise(w, h, Math.max(6, 16 * K), 0x71BE) : null;
    const bandOn = o.band > 0, starveOn = o.starve > 0, streakOn = o.streak > 0;
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
        fT = inkTrans(ft.to);
        const c = hex2rgb(PAL[ft.to] || ft.to); fC = [c[0] / 255, c[1] / 255, c[2] / 255];
        const fa = (ft.angle != null ? ft.angle : 0) * Math.PI / 180;
        fc = Math.cos(fa); fs = Math.sin(fa);
        /* the blend zone widens with every pull — by sheet 50 a
           split fountain that started as two bands is a rainbow */
        const soft = (ft.soft != null ? ft.soft : 1) * (1 + pull * 0.012);
        fD = (w * Math.abs(fc) + h * Math.abs(fs)) / Math.max(0.05, soft) || 1;
      }
      const scr = o.screens ? o.screens[k % o.screens.length] : null;
      const pit = o.pitches ? o.pitches[k % o.pitches.length] : null;
      pre.push({
        cos: Math.cos(a), sin: Math.sin(a), T: T[k], C: C[k],
        reg: regs[k % regs.length],
        phase: k * 2.399 + pull * 0.61, starvePhase: k * 311.7 + pull * 43.1,
        streak: streakT ? streakT[k] : null,
        fT: fT, fC: fC, fc: fc, fs: fs, fD: fD,
        fm: scr ? scr === 'fm' : null,
        cell: pit != null ? Math.max(2, pit * K) : null
      });
    }

    const out = cx.createImageData(w, h), d = out.data;
    const flat = o.flat, shape = o.shape, fm = o.screen === 'fm';
    const g = o.gain, sol = o.solidity, floor = o.floor, wet = o.wet;
    const ceil = o.floodCap > 0 ? Math.min(o.ceiling, o.floodCap) : o.ceiling;
    const inv = (o.linear && g > 0) ? gainInverse(g) : null;
    /* At 600 dpi an AM cell is 600/lpi pixels square, so the screen
       holds only (600/lpi)²+1 tones. 43 lpi has ~195 and you will
       never see the steps; 106 lpi has ~33, which is exactly why a
       fine screen bands on a long gradient and a coarse one does not. */
    const lv = o.levels || 0;

    for (let y = 0, p = 0; y < h; y++) {
      for (let x = 0; x < w; x++, p++) {
        let rr = P[0] / 255, gg = P[1] / 255, bb = P[2] / 255;
        let wetAcc = 0;                                   // ink already on the sheet here
        for (let k = 0; k < N; k++) {
          if (o.only != null && k !== o.only) continue;
          const pr = pre[k], rg = pr.reg;
          let px = x - rg.dx, py = y - rg.dy;
          if (rg.sy !== 1) py = (py - h / 2) / rg.sy + h / 2;        // elongation, feed axis only
          if (rg.skew) px -= rg.skew * (y / h - 0.5) * 2;            // feed skew opens down the sheet
          if (rg.rot) {
            const a = rg.rot * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a);
            const ox = px - w / 2, oy = py - h / 2;
            px = ox * ca - oy * sa + w / 2; py = ox * sa + oy * ca + h / 2;
          }
          const qx = px < 0 ? 0 : px > w - 1 ? w - 1 : px | 0;
          const qy = py < 0 ? 0 : py > h - 1 ? h - 1 : py | 0;
          let cov = plates[k][qy * w + qx];
          if (cov < floor + RUN.wear) continue;             // the master has no hole down here, and it wears
          if (cov > ceil) cov = ceil;                       // and no true solid up there
          if (lv) cov = Math.round(cov * lv) / lv;
          if (inv) cov = inv[(cov * 256) | 0];              // the RIP pulls the plate down…
          cov = dotGain(cov, g) * sol * RUN.density;        // …and the press puts it back
          /* wet-on-wet: a later drum lays its ink onto an oily
             sheet and less of it transfers, which is why swapping
             two inks changes the colour of the overprint */
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
            let t;
            if (kfm) t = ign(x + k * 113.7, y + k * 57.3);
            else {
              const u = (px * pr.cos - py * pr.sin) / kcell, v = (px * pr.sin + py * pr.cos) / kcell;
              t = shape === 'line' ? (1 + cosT(v)) * 0.5
                : shape === 'square' ? spotSquare(u, v)
                  : shape === 'diamond' ? spotDiamond(u, v)
                    : (2 + cosT(u) + cosT(v)) * 0.25;
            }
            const e = 1 / kcell * 1.6 + 0.02;              // one screen-pixel of antialiasing
            ink = (cov - t) / e + 0.5;
            ink = ink < 0 ? 0 : ink > 1 ? 1 : ink;
          }
          if (ink <= 0.002) continue;
          wetAcc += ink;

          /* split fountain — ONE drum loaded with two inks that
             blend across it, so the colour changes with where you
             are on the sheet, not with what the picture is doing */
          let cc = pr.C, tt = pr.T;
          if (pr.fT) {
            let f = 0.5 + ((x - w / 2) * pr.fc + (y - h / 2) * pr.fs) / pr.fD;
            f = f < 0 ? 0 : f > 1 ? 1 : f;
            cc = [cc[0] + (pr.fC[0] - cc[0]) * f, cc[1] + (pr.fC[1] - cc[1]) * f, cc[2] + (pr.fC[2] - cc[2]) * f];
            tt = [tt[0] + (pr.fT[0] - tt[0]) * f, tt[1] + (pr.fT[1] - tt[1]) * f, tt[2] + (pr.fT[2] - tt[2]) * f];
          }
          if (o.plateGrey) { const u = 1 - ink; rr = u; gg = u; bb = u; }
          else if (opaque) {                               // screen ink: covers what is under it
            const u = 1 - ink;
            rr = rr * u + cc[0] * ink; gg = gg * u + cc[1] * ink; bb = bb * u + cc[2] * ink;
          } else {                                         // riso ink: a filter over what is under it
            rr *= (1 - ink) + ink * tt[0];
            gg *= (1 - ink) + ink * tt[1];
            bb *= (1 - ink) + ink * tt[2];
          }
        }
        /* the tires ride the head of the sheet, so what they carry
           lands there — smeared along the feed, strongest at the
           lead edge, and building with every copy pulled */
        if (tireOn) {
          const head = 1 - ramp(0.02, 0.16, y / h);
          if (head > 0.002) {
            const t = RUN.tire * head * Math.pow(tireNz(x, y * 0.25), 2.2) * 0.55;
            if (t > 0.002) { rr *= 1 - t * 0.75; gg *= 1 - t * 0.8; bb *= 1 - t * 0.85; }
          }
        }
        const i = p << 2;
        d[i] = rr * 255; d[i + 1] = gg * 255; d[i + 2] = bb * 255; d[i + 3] = 255;
      }
    }
    cx.putImageData(out, 0, 0);
  }

  return { render: render, PAL: PAL, PAPER: PAPER, inkTrans: inkTrans, sepLUT: sepLUT };
})();
