/* ================================================================
   INK MOTION runtime. Two engines, eleven parameter sets, wired by
   data attributes so the site, the app and the studios animate the
   mark from one implementation. Mirrors tokens/ink-strip.json +
   guidelines/ink-strip-motion-applied.html. Requires ink-mark.js.

   <span class="im" data-form="strip-h" data-mode="full"
         data-pass="A1|A2|A3|A4|A5"        arrival / exit
         data-chain=".eyebrow,.disp"       A4 only — outward, never in
         data-swap="B1|B3|B4|B5"           change engines
         data-days="mon,tue,wed"           B1 tick order
         data-sets="1,4|0,6,8"             B5 void sets
   >

   B2 (theme flip) needs no attribute: every mark on the page
   re-plates purple inside the 700ms settle, automatically.
   ================================================================ */
(function () {
  var INK = { red: '#ed2224', blue: '#18a7e0', yellow: '#fddf00', green: '#43b02a', pink: '#ed1b72', purple: '#6e3179', amber: '#fdb515', ink: '#0d0905' };
  var DAY = { mon: '#43b02a', tue: '#18a7e0', wed: '#6e3179', thu: '#ed1b72', fri: '#ed2224', sat: '#fdb515', sun: '#fddf00' };
  var LIFT = { purple: '#9a4faa', wed: '#9a4faa' };
  var MODES = {
    full:    { bands: ['red', 'blue', 'yellow'], field: ['stock', 'ink', 'green', 'pink', 'purple', 'amber'], sq: ['stock', 'pink', 'purple', 'amber'] },
    majors:  { bands: ['red', 'blue', 'yellow'], field: ['stock', 'ink', 'stock', 'ink', 'ink', 'stock'],      sq: ['stock', 'ink', 'stock', 'ink'] },
    daycode: { bands: ['day', 'ink', 'day'],     field: ['stock', 'day', 'ink', 'day', 'day', 'stock'],        sq: ['stock', 'day', 'day', 'ink'] },
    ink:     { bands: ['ink', 'stock', 'ink'],   field: ['ink', 'stock', 'stock', 'ink', 'ink', 'stock'],      sq: ['stock', 'ink', 'ink', 'ink'] }
  };
  /* APPLIED product timing. The canon card's numbers are poster-scale, where a
     mark is read once at distance; on screen the same stagger reads as a blip.
     Everything here is the canon shape, slowed to product speed. */
  var PASS = {
    A1: { stagger: 95, cell: 430 },
    A2: { stagger: 46, cell: 300 },
    A3: { order: 'whole', stagger: 0, cell: 420 },
    A4: { stagger: 95, cell: 430, chain: 150 },
    A5: { stagger: 60, cell: 260, direction: 'out' }
  };
  var VN = { mon: 'thứ hai', tue: 'thứ ba', wed: 'thứ tư', thu: 'thứ năm', fri: 'thứ sáu', sat: 'thứ bảy', sun: 'chủ nhật' };
  var EN = { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun' };
  var RM = window.matchMedia && window.matchMedia('(prefers-reduced-motion:reduce)').matches;
  var E_STAMP = 'cubic-bezier(.2,1.4,.45,1)', E_SNAP = 'cubic-bezier(.3,0,.2,1)';
  var PULL = [{ transform: 'scale(1)' }, { transform: 'scale(0)' }];
  var POP = [{ transform: 'scale(0)' }, { transform: 'scale(1.11)', offset: .62 }, { transform: 'scale(1)' }];

  function cellsOf(el) { return [].slice.call(el.querySelectorAll(':scope > i, :scope > b, .sub > i')); }
  function isNight(el) {
    var s = el.closest('[data-theme-scope]');
    return (s ? s.getAttribute('data-theme') : document.documentElement.getAttribute('data-theme')) === 'dark';
  }
  function valWith(name, day, night) {
    if (name === 'void') return 'transparent';
    if (name === 'stock') return 'var(--stock,#fffbf1)';
    if (name === 'day') { var d = (day || 'fri').toLowerCase(); return (night && LIFT[d]) || DAY[d] || INK.ink; }
    if (name === 'purple' && night) return LIFT.purple;
    return INK[name] || 'transparent';
  }
  function val(name, el, night) { return valWith(name, el.dataset.day, night); }
  /* Mirrors ink-mark.js precedence EXACTLY: explicit data-bands / data-cells
     override the mode. The two modules have to agree about what the mark
     contains, or ground() and the swap engines act on cells that aren't there. */
  var ANCHORED = ['stock', 'pink', 'green', 'ink'];
  function names(el, mode) {
    var m = MODES[mode] || MODES.full;
    var form = el.dataset.form || 'strip-v';
    var sq = form.indexOf('square') === 0 || el.classList.contains('im-square');
    var short = form.indexOf('short') > -1;
    var bands = (el.dataset.bands || '').trim() ? el.dataset.bands.trim().split(/\s+/) : m.bands;
    var field = (el.dataset.cells || '').trim() ? el.dataset.cells.trim().split(/\s+/)
      : sq ? (form === 'square-anchored' && mode === 'full' ? ANCHORED : m.sq)
        : short ? m.field.slice(0, 2) : m.field;
    return bands.concat(field);
  }
  function state(el) {
    if (!el.__ink) el.__ink = { names: names(el, el.dataset.mode || 'full'), night: isNight(el), day: (el.dataset.day || 'fri') };
    return el.__ink;
  }

  /* ── Engine A · press pass ───────────────────────────── */
  function pressPass(el, o) {
    o = o || {};
    var whole = o.order === 'whole', st = whole ? 0 : (o.stagger == null ? 60 : o.stagger), out = o.direction === 'out';
    var c = cellsOf(el), chain = o.chain || [];
    el.classList.add('pp');
    el.classList.toggle('pp-whole', whole);
    el.style.setProperty('--pd', (o.cell || 260) + 'ms');
    (out ? c.slice().reverse() : c).forEach(function (i, k) { i.style.setProperty('--d', (k * st) + 'ms'); });
    var base = whole ? 0 : c.length * st;
    chain.forEach(function (t, k) { t.classList.add('ink-chain'); t.style.setProperty('--d', (base + k * (o.chain || 150)) + 'ms'); });
    el.classList.remove('run', 'out');
    chain.forEach(function (t) { t.classList.remove('run'); });
    void el.offsetWidth;
    el.classList.add(out ? 'out' : 'run');
    if (!out) chain.forEach(function (t) { void t.offsetWidth; t.classList.add('run'); });
  }

  /* ── Engine B · mode swap ────────────────────────────── */
  function anim(i, frames, ms, ease) {
    if (i.__a) i.__a.cancel();
    if (i.animate) i.__a = i.animate(frames, { duration: ms, easing: ease, fill: 'forwards' });
    else i.style.transform = frames[frames.length - 1].transform;
  }
  function modeSwap(el, o) {
    o = o || {};
    var s = state(el), night = o.night == null ? isNight(el) : o.night;
    if (o.day) el.dataset.day = o.day;
    var next = Array.isArray(o.to) ? o.to : names(el, o.to || el.dataset.mode || 'full');
    var c = cellsOf(el);
    if (next.length !== c.length) return;
    var st = o.stagger == null ? 40 : o.stagger, out = o.out || 240, back = o.in || 360;
    var applied = false, apply = function () { if (applied) return; applied = true; if (o.apply) o.apply(); };
    var was = s.names.map(function (n) { return valWith(n, s.day, s.night); });
    var now = next.map(function (n) { return val(n, el, night); });
    s.names = next; s.night = night; s.day = el.dataset.day || s.day;
    if (RM || o.swap === 'cut') {
      c.forEach(function (i, j) { i.style.setProperty('--k', now[j]); });
      apply(); return;
    }
    var changed = now.map(function (v, j) { return v !== was[j]; });
    if (changed.indexOf(true) < 0) { apply(); return; }
    c.forEach(function (i, j) {
      if (!changed[j]) return;
      var wasVoid = was[j] === 'transparent', willVoid = now[j] === 'transparent';
      setTimeout(function () {
        if (wasVoid) { i.style.setProperty('--k', now[j]); apply(); anim(i, POP, back, E_STAMP); return; }
        anim(i, PULL, out, E_SNAP);
        setTimeout(function () {
          i.style.setProperty('--k', now[j]); apply();
          if (willVoid) anim(i, [{ transform: 'none' }], 1, 'linear'); else anim(i, POP, back, E_STAMP);
        }, out);
      }, j * st);
    });
  }

  /* ── wiring ─────────────────────────────────────────── */
  function whenVisible(el, on, off) {
    if (!window.IntersectionObserver) { on(); return; }
    new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) on(); else if (off) off(); });
    }, { threshold: .12 }).observe(el);
  }
  /* composite C1 — a swap on a mark that also arrives waits for the pass to land, plus 400ms. Never both engines in one beat. */
  function passLen(el) {
    var p = PASS[el.dataset.pass];
    if (!p) return 0;
    return 160 + (p.order === 'whole' ? 0 : cellsOf(el).length * (p.stagger || 0)) + (p.cell || 260) + 400;
  }
  /* ── IDLE LIFE ───────────────────────────────────────────
     The press never quite stops. Every few seconds one cell lifts and
     re-prints itself — scale only, no fade, canon timing. Nothing about
     the mark's meaning changes: a cell re-inks in its own colour, and
     only a MINOR slot in `full` mode ever takes a different hue, because
     minors carry mood. Majors, ink and daycode re-print in place.

     Off-screen it stops. A pass or a swap always wins — idle waits. */
  function idleLife(el, opts) {
    opts = opts || {};
    if (RM) return;
    var live = false, t, k = 0;
    var every = opts.every || 5200, spread = opts.spread || 2600;
    var beat = function () {
      var s = state(el), c = cellsOf(el);
      if (!c.length) return;
      var slots = [];
      s.names.forEach(function (n, j) { if (n !== 'void') slots.push(j); });
      if (!slots.length) return;
      var j = slots[k % slots.length];
      k++;
      var cell = c[j];
      anim(cell, PULL, 260, E_SNAP);
      setTimeout(function () { anim(cell, POP, 380, E_STAMP); }, 260);
      if (live) t = setTimeout(beat, every + Math.random() * spread);
    };
    whenVisible(el, function () { if (!live) { live = true; t = setTimeout(beat, passLen(el) + 900 + Math.random() * spread); } },
      function () { live = false; clearTimeout(t); });
  }

  function scopeOf(el) { return el.closest('[data-pass-scope]') || el.parentElement || document; }
  function chainOf(el) {
    if (!el.dataset.chain) return [];
    var root = scopeOf(el);
    return el.dataset.chain.split(',').map(function (s) { return root.querySelector(s.trim()); }).filter(Boolean);
  }

  function wirePass(el) {
    var p = PASS[el.dataset.pass] || PASS.A2;
    var run = function () { pressPass(el, Object.assign({}, p, { chain: chainOf(el) })); };
    el.__pass = run;
    var done = false;
    whenVisible(el, function () { if (!done) { done = true; setTimeout(run, 160); } });
  }

  function wireB1(el) {
    var days = (el.dataset.days || 'mon,tue,wed,thu,fri,sat,sun').split(',');
    var scope = el.closest('[data-day-scope]'), k = days.indexOf((el.dataset.day || days[0]).trim());
    var t, live = false;
    var paint = function (d) {
      if (!scope) return;
      scope.className = scope.className.replace(/\s*\bd-(mon|tue|wed|thu|fri|sat|sun)\b/g, '') + ' d-' + d;
      scope.querySelectorAll('[data-day-label]').forEach(function (n) {
        n.textContent = n.dataset.dayLabel === 'vi' ? VN[d] : EN[d];
      });
    };
    var tick = function () {
      k = (k + 1) % days.length;
      var d = days[k].trim();
      modeSwap(el, { to: 'daycode', day: d, stagger: 0, apply: function () { paint(d); } });
      if (live) t = setTimeout(tick, 4200);
    };
    whenVisible(el, function () { if (!live) { live = true; t = setTimeout(tick, 2200); } },
      function () { live = false; clearTimeout(t); });
  }

  function wireB3(el) {
    var seq = (el.dataset.seq || 'full,majors,ink').split(','), k = 0, t, live = false;
    var tick = function () {
      modeSwap(el, { to: seq[k].trim(), stagger: 40 });
      k = (k + 1) % seq.length;
      if (live) t = setTimeout(tick, 1900);
    };
    whenVisible(el, function () { if (!live) { live = true; t = setTimeout(tick, 900); } },
      function () { live = false; clearTimeout(t); });
  }

  function wireB4(el) {
    var scope = el.closest('[data-hue-scope]');
    if (!scope) return;
    var cur = el.dataset.day, vis = [];
    var mark = function (d) { scope.className = scope.className.replace(/\s*\bd-(mon|tue|wed|thu|fri|sat|sun)\b/g, '') + ' d-' + d; };
    mark(cur);
    var take = function (sec) {
      var d = sec.dataset.hue;
      if (d === cur) return;
      cur = d;
      modeSwap(el, { to: 'daycode', day: d, stagger: 0, apply: function () {
        mark(d);
        scope.querySelectorAll('[data-hue-out]').forEach(function (n) { n.textContent = sec.dataset.hueLabel || EN[d]; });
      } });
    };
    var secs = [].slice.call(scope.querySelectorAll('[data-hue]'));
    /* the topmost section in view owns the hue — crossing a boundary re-plates */
    var pick = function () {
      var top = null;
      vis.forEach(function (s) { if (!top || s.getBoundingClientRect().top < top.getBoundingClientRect().top) top = s; });
      if (top) take(top);
    };
    secs.forEach(function (sec) { sec.addEventListener('mouseenter', function () { take(sec); }); });
    if (window.IntersectionObserver) {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          var k = vis.indexOf(e.target);
          if (e.isIntersecting && k < 0) vis.push(e.target);
          if (!e.isIntersecting && k > -1) vis.splice(k, 1);
        });
        pick();
      }, { threshold: .05 });
      secs.forEach(function (s) { io.observe(s); });
    }
  }

  function wireB5(el) {
    var base = names(el, el.dataset.mode || 'full');
    var sets = (el.dataset.sets || '|1,4|0,6,8|2,5').split('|').map(function (s) {
      return s.trim() ? s.split(',').map(Number) : [];
    });
    var k = 0, t, live = false;
    var tick = function () {
      var v = sets[k];
      modeSwap(el, { to: base.map(function (n, j) { return v.indexOf(j) > -1 && n !== 'stock' ? 'void' : n; }), stagger: 0 });
      k = (k + 1) % sets.length;
      if (live) t = setTimeout(tick, 1400);
    };
    whenVisible(el, function () { if (!live) { live = true; t = setTimeout(tick, 700); } },
      function () { live = false; clearTimeout(t); });
  }

  /* B2 · theme flip. Purple is the one plate whose value changes, so it
     is the one cell that pulls and pops — inside the same 700ms. */
  function watchTheme(node) {
    new MutationObserver(function () {
      var scope = node === document.documentElement ? document : node;
      scope.querySelectorAll('.im').forEach(function (el) {
        if (node !== document.documentElement || !el.closest('[data-theme-scope]')) modeSwap(el, { stagger: 0 });
      });
      setTimeout(function () { groundAll(scope === document ? document : scope); }, 720);
    }).observe(node, { attributes: true, attributeFilter: ['data-theme'] });
  }

  /* ── ground ────────────────────────────────────────── */
  /* GROUND — opt-in only, per G2, closed 22.08.26.

     The stock-on-stock open silhouette is ACCEPTED. Canon's "stock is never
     on an outer corner" holds for print, where the mark is a solid object on
     a sheet; on screen the open corner is wanted — it keeps the mark reading
     as ink laid on the page rather than a badge sitting on it, and it is the
     thing that makes cell-switching legible, because a cell that pulls to
     zero at the edge opens the silhouette further instead of punching a hole
     in a patch.

     So there is no automatic grounding. data-ground="on" is available for the
     case that needs it (a mark on a photo, or a print export), and nothing
     else grounds. Do not restore the background-comparison test. */
  function ground(el) {
    el.classList.toggle('im-ground', el.dataset.ground === 'on');
  }
  function groundAll(root) { (root || document).querySelectorAll('.im').forEach(ground); }

  function wire(root) {
    root = root || document;
    groundAll(root);
    /* idle is the default: a mark with no swap engine still breathes.
       data-idle="off" opts out (marks beside a decision stay dead still). */
    root.querySelectorAll('.im').forEach(function (el) {
      if (el.__idle || el.dataset.idle === 'off' || el.dataset.swap) return;
      el.__idle = 1;
      idleLife(el, el.dataset.idle === 'slow' ? { every: 8200, spread: 3400 } : null);
    });
    root.querySelectorAll('.im[data-pass]').forEach(function (el) { if (!el.__wired) { el.__wired = 1; wirePass(el); } });
    root.querySelectorAll('.im[data-swap]').forEach(function (el) {
      if (el.__wiredB) return;
      el.__wiredB = 1;
      state(el);
      ({ B1: wireB1, B3: wireB3, B4: wireB4, B5: wireB5 })[el.dataset.swap] && ({ B1: wireB1, B3: wireB3, B4: wireB4, B5: wireB5 })[el.dataset.swap](el);
    });
    root.querySelectorAll('[data-theme-scope]').forEach(function (n) { if (!n.__tw) { n.__tw = 1; watchTheme(n); } });
  }

  document.addEventListener('click', function (e) {
    var b = e.target.closest('.js-replay');
    if (!b) return;
    var scope = b.closest('[data-frame]') || document;
    [].slice.call(scope.querySelectorAll('.im[data-pass]')).forEach(function (el, i) {
      setTimeout(function () { el.__pass && el.__pass(); }, i * 140);
    });
  });

  window.InkMotion = { pressPass: pressPass, modeSwap: modeSwap, idleLife: idleLife, wire: wire, ground: groundAll, PASS: PASS, MODES: MODES, DAY: DAY };
  var start = function () { watchTheme(document.documentElement); wire(document); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
