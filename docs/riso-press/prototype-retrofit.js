/* ============================================================
   RISO RETRO — the new physics wired into the OLD treatments
   ============================================================
   Not a new treatment. These are the shipped treatments with
   the separation engine's parts swapped in, so the question
   "does this buff what we already have" can be answered by
   looking rather than by argument.

   window.RETRO.render(cv, name, opts) — names match the engine.
   ============================================================ */
window.RETRO = (function () {
  "use strict";

  const PAL = {
    blue: '#18a7e0', green: '#43b02a', yellow: '#fddf00',
    amber: '#fdb515', purple: '#6e3179', pink: '#ed1b72', red: '#ed2224',
    ink: '#0d0905', cream: '#fffbf1'
  };
  const PAPER = { day: '#fffbf1', night: '#0a0703' };
  const PARTNER = { pink: 'blue', red: 'blue', amber: 'purple', yellow: 'pink', blue: 'pink', green: 'purple', purple: 'amber' };

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

  /* ---- source ---- */
  let SRC = null;
  function setSource(el) { SRC = el; }
  function drawCover(ctx, w, h) {
    if (!SRC) { ctx.fillStyle = '#777'; ctx.fillRect(0, 0, w, h); return; }
    const sw = SRC.naturalWidth || SRC.width, sh = SRC.naturalHeight || SRC.height;
    const k = Math.max(w / sw, h / sh);
    ctx.drawImage(SRC, (w - sw * k) / 2, (h - sh * k) / 2, sw * k, sh * k);
  }
  function rgbBuffer(w, h) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d', { willReadFrequently: true });
    drawCover(x, w, h);
    return x.getImageData(0, 0, w, h).data;
  }
  function lumBuffer(w, h, contrast, bright) {
    const d = rgbBuffer(w, h), L = new Float32Array(w * h), k = contrast || 1, b = bright || 0;
    for (let i = 0, p = 0; p < L.length; i += 4, p++) {
      let l = (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / 255;
      l = (l - 0.5) * k + 0.5 + b;
      L[p] = l < 0 ? 0 : l > 1 ? 1 : l;
    }
    return L;
  }

  /* ---- ink physics (§02 of the pitch, unchanged) ---- */
  const EPS = 0.02;
  function inkTrans(key) {
    const c = hex2rgb(PAL[key] || key);
    return [Math.max(EPS, c[0] / 255), Math.max(EPS, c[1] / 255), Math.max(EPS, c[2] / 255)];
  }
  function inkDensity(key) { const t = inkTrans(key); return [-Math.log(t[0]), -Math.log(t[1]), -Math.log(t[2])]; }

  /* ---- tone transfer (ISO 12647-3) ---- */
  const TVI = [0, 0.211, 0.390, 0.539, 0.662, 0.760, 0.838, 0.898, 0.943, 0.976, 1];
  function dotGain(a, g) {
    if (g <= 0) return a;
    const f = a * 10, i = Math.min(9, f | 0), t = f - i;
    return a + (TVI[i] + (TVI[i + 1] - TVI[i]) * t - a) * g;
  }
  const invCache = new Map();
  function gainInverse(g) {
    const key = g.toFixed(3); const hit = invCache.get(key); if (hit) return hit;
    const N = 256, inv = new Float32Array(N + 1); let j = 0;
    for (let i = 0; i <= N; i++) {
      const target = i / N;
      while (j < N && dotGain((j + 1) / N, g) < target) j++;
      const a0 = j / N, a1 = (j + 1) / N, y0 = dotGain(a0, g), y1 = dotGain(a1, g);
      inv[i] = y1 > y0 ? a0 + (a1 - a0) * (target - y0) / (y1 - y0) : a0;
    }
    invCache.set(key, inv); return inv;
  }
  /* one stop for everything a plate goes through between "how much
     tone is here" and "how much ink lands" */
  function press(cov, tp) {
    if (cov < tp.floor) return 0;
    if (cov > tp.ceiling) cov = tp.ceiling;
    if (tp.inv) cov = tp.inv[(cov * 256) | 0];
    return dotGain(cov, tp.gain) * tp.solidity;
  }
  function pressOpts(o) {
    const gain = o.gain != null ? o.gain : 0.8;
    return {
      gain: gain, inv: (o.linear !== false && gain > 0) ? gainInverse(gain) : null,
      floor: o.floor != null ? o.floor : 0.10,
      /* `ceiling` is what the PLATE can carry (a master's last few
         per cent close up); `solidity` is how completely ink covers
         where it lands. The 75-85 % studios quote is neither - it is
         design advice about big flood areas, and clamping everything
         to it is why nothing could print dark. */
      ceiling: o.ceiling != null ? o.ceiling : 0.98,
      solidity: o.solidity != null ? o.solidity : 0.97
    };
  }

  /* ---- screening ---- */
  const COS_N = 512, COS_T = new Float32Array(COS_N);
  for (let i = 0; i < COS_N; i++) COS_T[i] = Math.cos(6.283185307 * i / COS_N);
  function cosT(u) { let i = (u * COS_N) | 0; i &= (COS_N - 1); return COS_T[i < 0 ? i + COS_N : i]; }
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
  function ign(x, y) {
    const t = 0.06711056 * x + 0.00583715 * y;
    return (52.9829189 * (t - Math.floor(t))) % 1;
  }
  /* riso angles, darkest ink first */
  const RISO_ANGLES = [45, 75, 15, 0, 30];
  function angleSet(inks) {
    const lum = inks.map(function (k, i) {
      const c = hex2rgb(PAL[k] || k);
      return { i: i, L: 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2] };
    }).sort(function (a, b) { return a.L - b.L; });
    const out = new Array(inks.length);
    lum.forEach(function (e, rank) { out[e.i] = RISO_ANGLES[rank % RISO_ANGLES.length]; });
    return out;
  }

  /* ---- a compact 2-ink separation, for the modes that already
     wanted two plates and only had one channel to make them from ---- */
  const S_N = 18, sCache = new Map();
  function sep2LUT(inks, paperHex, lambda, boost) {
    const key = inks.join(',') + paperHex + lambda + boost;
    const hit = sCache.get(key); if (hit) return hit;
    const A = inks.map(inkDensity), N = inks.length;
    const P = hex2rgb(paperHex).map(v => Math.max(EPS, v / 255));
    const dP = [-Math.log(P[0]), -Math.log(P[1]), -Math.log(P[2])];
    const lut = new Float32Array(S_N * S_N * S_N * N);
    const a = new Float64Array(N), d = new Float64Array(3);
    const AA = new Float64Array(N);
    for (let i = 0; i < N; i++) { const c = A[i]; AA[i] = c[0] * c[0] + c[1] * c[1] + c[2] * c[2] + lambda; }
    let q = 0;
    for (let r = 0; r < S_N; r++) for (let g = 0; g < S_N; g++) for (let b = 0; b < S_N; b++) {
      let R = r / (S_N - 1), G = g / (S_N - 1), B = b / (S_N - 1);
      if (boost !== 1) {
        const m = (R + G + B) / 3;
        R = m + (R - m) * boost; G = m + (G - m) * boost; B = m + (B - m) * boost;
        R = R < 0 ? 0 : R > 1 ? 1 : R; G = G < 0 ? 0 : G > 1 ? 1 : G; B = B < 0 ? 0 : B > 1 ? 1 : B;
      }
      d[0] = -Math.log(Math.max(EPS, R)) - dP[0];
      d[1] = -Math.log(Math.max(EPS, G)) - dP[1];
      d[2] = -Math.log(Math.max(EPS, B)) - dP[2];
      for (let i = 0; i < N; i++) a[i] = 0;
      const res = [d[0], d[1], d[2]];
      for (let it = 0; it < 20; it++) for (let i = 0; i < N; i++) {
        const c = A[i], a0 = a[i];
        const step = (c[0] * res[0] + c[1] * res[1] + c[2] * res[2] + lambda * a0) / AA[i];
        let v = a0 + step; if (v < 0) v = 0; else if (v > 1) v = 1;
        const dl = v - a0;
        if (dl) { res[0] -= c[0] * dl; res[1] -= c[1] * dl; res[2] -= c[2] * dl; a[i] = v; }
      }
      for (let i = 0; i < N; i++) lut[q++] = a[i];
    }
    sCache.set(key, lut); return lut;
  }
  /* plates from the real photograph, for N inks */
  function separate(w, h, inks, paperHex, o) {
    const lut = sep2LUT(inks, paperHex, o.sepGCR != null ? o.sepGCR : 0.2, o.sepBoost != null ? o.sepBoost : 1.45);
    const N = inks.length, src = rgbBuffer(w, h);
    const out = []; for (let i = 0; i < N; i++) out.push(new Float32Array(w * h));
    const S = S_N - 1, ct = o.contrast || 1, br = o.brightness || 0;
    const dR = S_N * S_N * N, dG = S_N * N, dB = N;
    for (let p = 0, i = 0; p < w * h; p++, i += 4) {
      let R = src[i] / 255, G = src[i + 1] / 255, B = src[i + 2] / 255;
      if (ct !== 1 || br) {
        R = (R - 0.5) * ct + 0.5 + br; G = (G - 0.5) * ct + 0.5 + br; B = (B - 0.5) * ct + 0.5 + br;
        R = R < 0 ? 0 : R > 1 ? 1 : R; G = G < 0 ? 0 : G > 1 ? 1 : G; B = B < 0 ? 0 : B > 1 ? 1 : B;
      }
      const fr = R * S, fg = G * S, fb = B * S;
      const ir = Math.min(S - 1, fr | 0), ig = Math.min(S - 1, fg | 0), ib = Math.min(S - 1, fb | 0);
      const tr = fr - ir, tg = fg - ig, tb = fb - ib;
      const base = ((ir * S_N + ig) * S_N + ib) * N;
      for (let k = 0; k < N; k++) {
        const c000 = lut[base + k], c001 = lut[base + dB + k];
        const c010 = lut[base + dG + k], c011 = lut[base + dG + dB + k];
        const c100 = lut[base + dR + k], c101 = lut[base + dR + dB + k];
        const c110 = lut[base + dR + dG + k], c111 = lut[base + dR + dG + dB + k];
        const c00 = c000 + (c001 - c000) * tb, c01 = c010 + (c011 - c010) * tb;
        const c10 = c100 + (c101 - c100) * tb, c11 = c110 + (c111 - c110) * tb;
        const c0 = c00 + (c01 - c00) * tg, c1 = c10 + (c11 - c10) * tg;
        out[k][p] = c0 + (c1 - c0) * tr;
      }
    }
    return out;
  }

  /* ---- registration: the model the off-register treatment wants ---- */
  function regSet(N, o, w, h, K) {
    const rnd = mulberry32((o.driftSeed | 0 || 7) + (o.pull | 0) * 7919);
    const regs = [];
    for (let k = 0; k < N; k++) {
      const slop = (o.duo !== false && k < 2) ? 0.15 : 1;
      const dr = (o.drift || 0) * K * slop;
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
  function sampleAt(plate, w, h, x, y, rg) {
    let px = x - rg.dx, py = y - rg.dy;
    if (rg.sy !== 1) py = (py - h / 2) / rg.sy + h / 2;
    if (rg.skew) px -= rg.skew * (y / h - 0.5) * 2;
    if (rg.rot) {
      const a = rg.rot * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a);
      const ox = px - w / 2, oy = py - h / 2;
      px = ox * ca - oy * sa + w / 2; py = ox * sa + oy * ca + h / 2;
    }
    const qx = px < 0 ? 0 : px > w - 1 ? w - 1 : px | 0;
    const qy = py < 0 ? 0 : py > h - 1 ? h - 1 : py | 0;
    return { v: plate[qy * w + qx], px: px, py: py };
  }

  /* ============================================================
     1 · HALFTONE
     Same controls, three swaps: the dot is a per-pixel spot
     function instead of a canvas arc (so it antialiases, links
     into a chain at 50 %, and costs the same at any angle); the
     tone goes through the press curve; and `two` mode gets its
     screens from a real separation instead of one luminance
     buffer read twice.
     ============================================================ */
  function halftone(cv, o) {
    const w = cv.width, h = cv.height, cx = cv.getContext('2d');
    const K = w / 520;
    const night = o.paper === 'night';
    const paper = hex2rgb(PAPER[o.paper]);
    const two = o.inkMode === 'two';
    const inks = two ? [o.ink, o.ink2 || PARTNER[o.ink] || 'blue'] : [o.ink];
    const N = inks.length;
    const cell = Math.max(2, (o.dot || 9) * K);
    const shape = o.shape || 'chain';
    const fm = o.screen === 'fm';
    const tp = pressOpts(o);
    const ang = o.angles || angleSet(inks);
    const T = inks.map(inkTrans);
    const C = inks.map(k => { const c = hex2rgb(PAL[k] || k); return [c[0] / 255, c[1] / 255, c[2] / 255]; });
    const regs = regSet(N, o, w, h, K);

    /* the plates */
    let plates;
    if (two && o.sep !== false) {
      plates = separate(w, h, inks, PAPER[o.paper], o);
    } else {
      const L = lumBuffer(w, h, o.contrast, o.brightness);
      plates = [];
      for (let k = 0; k < N; k++) {
        const pl = new Float32Array(w * h);
        for (let p = 0; p < L.length; p++) { let c = night ? L[p] : 1 - L[p]; if (o.invert) c = 1 - c; pl[p] = c; }
        plates.push(pl);
      }
    }

    const pre = [];
    for (let k = 0; k < N; k++) {
      const a = ang[k % ang.length] * Math.PI / 180;
      pre.push({ cos: Math.cos(a), sin: Math.sin(a), T: T[k], C: C[k], reg: regs[k] });
    }
    const out = cx.createImageData(w, h), d = out.data;
    const wet = o.wet != null ? o.wet : 0.25;
    for (let y = 0, p = 0; y < h; y++) {
      for (let x = 0; x < w; x++, p++) {
        let rr = paper[0] / 255, gg = paper[1] / 255, bb = paper[2] / 255;
        let acc = 0;
        for (let k = 0; k < N; k++) {
          const pr = pre[k];
          const s = sampleAt(plates[k], w, h, x, y, pr.reg);
          let cov = press(s.v, tp);
          if (cov <= 0.002) continue;
          if (wet && acc > 0) cov *= 1 - wet * Math.min(1, acc);
          let t;
          if (fm) t = ign(x + k * 113.7, y + k * 57.3);
          else {
            const u = (s.px * pr.cos - s.py * pr.sin) / cell, v = (s.px * pr.sin + s.py * pr.cos) / cell;
            t = spot(shape, u, v);
          }
          const e = 1 / cell * 1.6 + 0.02;
          let ink = (cov - t) / e + 0.5;
          ink = ink < 0 ? 0 : ink > 1 ? 1 : ink;
          if (ink <= 0.002) continue;
          acc += ink;
          if (night) { const u = 1 - ink, cc = pr.C; rr = rr * u + cc[0] * ink; gg = gg * u + cc[1] * ink; bb = bb * u + cc[2] * ink; }
          else { const tt = pr.T; rr *= (1 - ink) + ink * tt[0]; gg *= (1 - ink) + ink * tt[1]; bb *= (1 - ink) + ink * tt[2]; }
        }
        const i = p << 2;
        d[i] = rr * 255; d[i + 1] = gg * 255; d[i + 2] = bb * 255; d[i + 3] = 255;
      }
    }
    cx.putImageData(out, 0, 0);
  }

  /* ============================================================
     2 · OFF-REGISTER
     The signature treatment. Today it offsets one coverage mask
     from itself by a fixed dx/dy and composites with canvas
     `multiply`. Two swaps: the offset becomes a real registration
     miss (shift + rotation + feed skew + elongation along the
     feed), and the two passes stack as transmittances, so the
     overlap is the colour those two inks actually make.
     `sep` on makes them two genuine plates as well.
     ============================================================ */
  function offRegister(cv, o) {
    const w = cv.width, h = cv.height, cx = cv.getContext('2d');
    const K = w / 520;
    const night = o.paper === 'night';
    const paper = hex2rgb(PAPER[o.paper]);
    const inks = [o.ink, o.ink2 || PARTNER[o.ink] || 'blue'];
    if (o.ink3) inks.push(o.ink3);
    const N = inks.length;
    const tp = pressOpts(o);
    const T = inks.map(inkTrans);
    const C = inks.map(k => { const c = hex2rgb(PAL[k] || k); return [c[0] / 255, c[1] / 255, c[2] / 255]; });

    let plates;
    if (o.sep) plates = separate(w, h, inks, PAPER[o.paper], o);
    else {
      const L = lumBuffer(w, h, o.contrast, o.brightness);
      const sp = o.spread != null ? o.spread : 1.25;
      plates = [];
      for (let k = 0; k < N; k++) {
        const pl = new Float32Array(w * h);
        for (let p = 0; p < L.length; p++) pl[p] = Math.min(1, (night ? L[p] : 1 - L[p]) * sp);
        plates.push(pl);
      }
    }

    /* the legacy `offset`/`angle` pair still drives the miss — it
       just becomes the SIZE of a physical miss rather than a
       literal translation, so the old controls keep working */
    const mag = (o.offset != null ? o.offset : 13);
    const a = (o.angle != null ? o.angle : 47) * Math.PI / 180;
    const regs = regSet(N, Object.assign({}, o, {
      drift: o.drift != null ? o.drift : mag * 0.5,
      skew: o.skew != null ? o.skew : mag * 0.5,
      stretch: o.stretch != null ? o.stretch : mag * 0.9,
      duo: false
    }), w, h, K);
    /* plate 2 keeps the author's chosen direction; the rest wander */
    regs[1] = Object.assign({}, regs[1], { dx: Math.cos(a) * mag * K, dy: Math.sin(a) * mag * K });

    const out = cx.createImageData(w, h), d = out.data;
    const wet = o.wet != null ? o.wet : 0.25;
    for (let y = 0, p = 0; y < h; y++) {
      for (let x = 0; x < w; x++, p++) {
        let rr = paper[0] / 255, gg = paper[1] / 255, bb = paper[2] / 255;
        let acc = 0;
        for (let k = N - 1; k >= 0; k--) {
          const s = sampleAt(plates[k], w, h, x, y, regs[k]);
          let ink = press(s.v, tp);
          if (ink <= 0.002) continue;
          if (wet && acc > 0) ink *= 1 - wet * Math.min(1, acc);
          acc += ink;
          if (night) { const u = 1 - ink, cc = C[k]; rr = rr * u + cc[0] * ink; gg = gg * u + cc[1] * ink; bb = bb * u + cc[2] * ink; }
          else { const tt = T[k]; rr *= (1 - ink) + ink * tt[0]; gg *= (1 - ink) + ink * tt[1]; bb *= (1 - ink) + ink * tt[2]; }
        }
        const i = p << 2;
        d[i] = rr * 255; d[i + 1] = gg * 255; d[i + 2] = bb * 255; d[i + 3] = 255;
      }
    }
    cx.putImageData(out, 0, 0);
  }

  /* ============================================================
     3 · OVERPRINT
     The treatment whose whole point is the third colour in the
     overlap. Today that colour is whatever canvas `multiply`
     produces on sRGB bytes. One swap — stack transmittances, and
     let the later pass transfer less onto wet ink — and the
     overlap becomes the colour those two drums actually make.
     ============================================================ */
  function overprint(cv, o) {
    const w = cv.width, h = cv.height, cx = cv.getContext('2d');
    const K = w / 520;
    const night = o.paper === 'night';
    const paper = hex2rgb(PAPER[o.paper]);
    const inks = [o.ink, o.ink2 || PARTNER[o.ink] || 'blue'];
    if (o.ink3) inks.push(o.ink3);
    const N = inks.length;
    const T = inks.map(inkTrans);
    const C = inks.map(k => { const c = hex2rgb(PAL[k] || k); return [c[0] / 255, c[1] / 255, c[2] / 255]; });
    const tp = pressOpts(o);

    const L = lumBuffer(w, h, o.contrast, o.brightness);
    let mn = 1, mx = 0;
    for (let p = 0; p < L.length; p++) { if (L[p] < mn) mn = L[p]; if (L[p] > mx) mx = L[p]; }
    const rng = Math.max(0.001, mx - mn);
    for (let p = 0; p < L.length; p++) L[p] = (L[p] - mn) / rng;

    const split = o.split != null ? o.split : 0.16;
    const thr = [0.5 + split, 0.5 - split, 0.5];
    const mag = (o.offset != null ? o.offset : 8);
    const a = (o.angle != null ? o.angle : 45) * Math.PI / 180;
    const regs = regSet(N, Object.assign({}, o, {
      drift: o.drift != null ? o.drift : mag * 0.4,
      skew: o.skew != null ? o.skew : mag * 0.5,
      stretch: o.stretch != null ? o.stretch : mag * 0.8,
      duo: false
    }), w, h, K);
    regs[0] = Object.assign({}, regs[0], { dx: -Math.cos(a) * mag * K });
    regs[1] = Object.assign({}, regs[1], { dx: Math.cos(a) * mag * K, dy: Math.sin(a) * mag * K });

    const tex = o.fieldTexture || 0;
    const nz = tex > 0 ? valueNoise(w, h, Math.max(4, 7 * K), 0x0F1E1D) : null;
    const out = cx.createImageData(w, h), d = out.data;
    const wet = o.wet != null ? o.wet : 0.25;
    function smooth(e0, e1, v) { const t = Math.max(0, Math.min(1, (v - e0) / (e1 - e0))); return t * t * (3 - 2 * t); }

    for (let y = 0, p = 0; y < h; y++) {
      for (let x = 0; x < w; x++, p++) {
        let rr = paper[0] / 255, gg = paper[1] / 255, bb = paper[2] / 255;
        let acc = 0;
        for (let k = 0; k < N; k++) {
          const s = sampleAt(L, w, h, x, y, regs[k]);
          const lit = night ? s.v : 1 - s.v;
          let on = smooth(thr[k] - 0.06, thr[k] + 0.06, lit);
          if (nz && on > 0.003) on *= 1 - tex * (0.2 + 0.8 * nz(x, y));
          let ink = press(on, tp);
          if (ink <= 0.002) continue;
          if (wet && acc > 0) ink *= 1 - wet * Math.min(1, acc);
          acc += ink;
          if (night) { const u = 1 - ink, cc = C[k]; rr = rr * u + cc[0] * ink; gg = gg * u + cc[1] * ink; bb = bb * u + cc[2] * ink; }
          else { const tt = T[k]; rr *= (1 - ink) + ink * tt[0]; gg *= (1 - ink) + ink * tt[1]; bb *= (1 - ink) + ink * tt[2]; }
        }
        const i = p << 2;
        d[i] = rr * 255; d[i + 1] = gg * 255; d[i + 2] = bb * 255; d[i + 3] = 255;
      }
    }
    cx.putImageData(out, 0, 0);
  }

  /* ============================================================
     4 · PHOTOCOPY
     The one treatment that is not about riso at all, and the one
     the adjacent-process research helps most. Today: an s-curve
     per generation, noise, and vertical streaks. A xerographic
     engine moves toner by ELECTRIC FIELD, and the field bends at
     every edge of the charge image — so edges over-develop into
     a dark rim while the middles of big solids are starved of
     field and come out grey. Add toner that flies off the edge
     as it transfers (satellites), a drum that repeats its faults
     once per circumference, and a platen that warps a little
     differently each generation.
     ============================================================ */
  function photocopy(cv, o) {
    const w = cv.width, h = cv.height, cx = cv.getContext('2d');
    const K = w / 520;
    const night = o.paper === 'night';
    const inkC = (o.inkMode === 'single') ? hex2rgb(PAL[o.ink]) : hex2rgb(night ? '#fffbf1' : '#0d0905');
    let papC = hex2rgb(PAPER[o.paper]);
    if (o.field === 'tint') {
      const fi = hex2rgb(PAL[o.fieldInk || o.ink]), fs = o.fieldStrength != null ? o.fieldStrength : 0.12;
      papC = [papC[0] + (fi[0] - papC[0]) * fs, papC[1] + (fi[1] - papC[1]) * fs, papC[2] + (fi[2] - papC[2]) * fs];
    }
    const gens = Math.max(1, Math.min(5, (o.generations | 0) || 2));
    const toner = o.toner != null ? o.toner : 0.55;
    const edge = o.edgeBoost != null ? o.edgeBoost : 0.55;      // fringe-field enhancement
    const hollow = o.hollow != null ? o.hollow : 0.35;          // solid-area starvation
    const sat = o.satellites != null ? o.satellites : 0.5;      // toner scatter at edges
    const drumPer = (o.drumPeriod || 150) * K;                  // one OPC circumference
    const drumAmt = o.drumBand != null ? o.drumBand : 0.06;

    let L = lumBuffer(w, h, o.contrast, o.brightness);
    let mn = 1, mx = 0;
    for (let p = 0; p < L.length; p++) { if (L[p] < mn) mn = L[p]; if (L[p] > mx) mx = L[p]; }
    const rr0 = Math.max(0.001, mx - mn);
    for (let p = 0; p < L.length; p++) L[p] = (L[p] - mn) / rr0;

    /* a blurred copy of the tone gives both the edge term and the
       solid-interior term for the price of one pass */
    const bc = document.createElement('canvas'); bc.width = w; bc.height = h;
    const bx = bc.getContext('2d', { willReadFrequently: true });
    const tmp = bx.createImageData(w, h);
    for (let p = 0, i = 0; p < L.length; p++, i += 4) { const v = L[p] * 255; tmp.data[i] = tmp.data[i + 1] = tmp.data[i + 2] = v; tmp.data[i + 3] = 255; }
    bx.putImageData(tmp, 0, 0);
    function blurTo(radius) {
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      const x = c.getContext('2d', { willReadFrequently: true });
      x.filter = 'blur(' + radius + 'px)';
      x.drawImage(bc, 0, 0);
      x.filter = 'none';
      return x.getImageData(0, 0, w, h).data;
    }
    const near = blurTo(Math.max(1, 1.6 * K));      // tight — the fringe field
    const far = blurTo(Math.max(3, 14 * K));        // wide  — "am I inside a big solid?"

    const rnd = mulberry32(0xC0B1E5 + (o.pull | 0) * 331);
    const gw = 520, gh = Math.max(2, Math.round(520 * h / w)), nb = new Float32Array(gw * gh);
    for (let q = 0; q < nb.length; q++) nb[q] = rnd() * 2 - 1;
    const noiseAmt = (o.copyNoise || 0) * 0.30;
    const streaks = o.streaks || 0;
    let sk = null;
    if (streaks > 0) {
      const nz = valueNoise(w, 2, Math.max(8, 26 * K), 0x57EA);
      sk = new Float32Array(w);
      for (let x = 0; x < w; x++) { const v = nz(x, 0); sk[x] = v * v * streaks * 0.5; }
    }
    const cw = 0.5 - toner * 0.22, bias = (toner - 0.5) * 0.24;
    function smooth(e0, e1, v) { const t = Math.max(0, Math.min(1, (v - e0) / (e1 - e0))); return t * t * (3 - 2 * t); }

    const out = cx.createImageData(w, h), d = out.data;
    for (let p = 0, i = 0; p < L.length; p++, i += 4) {
      const x = p % w, y = (p / w) | 0;
      let l = L[p] + nb[Math.min(gh - 1, (y * gh / h) | 0) * gw + Math.min(gw - 1, (x * gw / w) | 0)] * noiseAmt;

      /* FRINGE FIELD. The charge image steps at every edge; the
         field bends across the step, over-developing the dark
         side and starving the light one. That is the crunchy
         dark outline on every photocopy, and it is an unsharp
         mask with a physical cause. */
      const nearV = near[i] / 255;
      l = l - edge * (nearV - l) * 2;

      /* HOLLOW SOLIDS. Inside a large dark area the field is weak
         and perpendicular to the plate, so the middle develops
         LESS toner than the perimeter. Big blacks on a copier
         come out grey-centred with a hard black border. */
      const farV = far[i] / 255;
      if (hollow > 0) {
        const inSolid = (1 - smooth(0.15, 0.55, farV));         // deep inside dark
        l += hollow * inSolid * (1 - smooth(0.0, 0.35, l)) * 0.55;
      }

      for (let g = 0; g < gens; g++) l = smooth(0.5 - cw - bias, 0.5 + cw - bias, l);

      /* SATELLITES. Toner flies off during electrostatic transfer
         and lands just outside the edge it came from. */
      if (sat > 0) {
        const grad = Math.abs(nearV - farV);
        if (grad > 0.04 && rnd() < sat * grad * 0.9) l = l * 0.35;
      }

      /* the drum repeats its faults once per circumference */
      if (drumAmt > 0) l *= 1 - drumAmt * 0.5 * (1 + Math.cos(6.2831853 * y / drumPer));

      if (sk) { const s = sk[x]; l = night ? Math.min(1, l + s) : Math.max(0, l - s); }
      l = l < 0 ? 0 : l > 1 ? 1 : l;
      const t = night ? l : 1 - l;
      d[i] = papC[0] + (inkC[0] - papC[0]) * t;
      d[i + 1] = papC[1] + (inkC[1] - papC[1]) * t;
      d[i + 2] = papC[2] + (inkC[2] - papC[2]) * t;
      d[i + 3] = 255;
    }
    cx.putImageData(out, 0, 0);
  }

  const T = { halftone: halftone, offregister: offRegister, overprint: overprint, photocopy: photocopy };
  function render(cv, name, opts) {
    cv.getContext('2d').clearRect(0, 0, cv.width, cv.height);
    (T[name] || halftone)(cv, opts || {});
  }

  return { render: render, setSource: setSource, PAL: PAL };
})();
