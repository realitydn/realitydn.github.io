/* ================================================================
   INK MARK renderer. Mirrors tokens/ink-strip.json so canvas, PDF
   and DOM renderers agree. Cell ORDER is fixed — this file exposes
   recolouring and never reordering.

   <span class="im" data-form="strip-v" data-mode="full"></span>
     data-form      strip-v | strip-h | strip-short-v | strip-short-h
                    | square | square-anchored
     data-mode      full | majors | daycode | ink
     data-day       mon..sun            (daycode only)
     data-substrate paper | lit | ink   (sets stock + purple; lit forces keylines)
     data-voids     "2,4"               (field indices; max 3, never the stock cell)
     data-below-floor="demo"            (silences the size-floor warning — for
                    canon cards that deliberately show an undersized mark)
     style          --m: module px, --kw: keyline px
   Explicit data-bands / data-cells override the mode, for the
   canon cards that need to show a specific recolouring.
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
  var ANCHORED = ['stock', 'pink', 'green', 'ink'];
  var FLOOR = { 'strip-v': 8, 'strip-h': 8, 'strip-short-v': 6, 'strip-short-h': 6, square: 6, 'square-anchored': 6 };

  function paint(el) {
    var form = el.dataset.form || 'strip-v';
    var mode = MODES[el.dataset.mode] ? el.dataset.mode : 'full';
    var sub = el.dataset.substrate || 'paper';
    var day = (el.dataset.day || 'fri').toLowerCase();
    var lit = sub === 'lit';
    var m = MODES[mode];

    function val(name) {
      if (name === 'void') return 'transparent';
      if (name === 'stock') return lit ? '#ffffff' : 'var(--stock,#fffbf1)';
      if (name === 'day') return (lit || sub === 'ink' ? LIFT[day] : null) || DAY[day] || INK.ink;
      if (name === 'purple' && (lit || sub === 'ink')) return LIFT.purple;
      return INK[name] || 'transparent';
    }
    function cells(list) {
      var voids = (el.dataset.voids || '').split(',').map(function (n) { return parseInt(n, 10); });
      return list.map(function (n, i) { return voids.indexOf(i) > -1 && n !== 'stock' ? 'void' : n; });
    }

    var square = form.indexOf('square') === 0;
    var short = form.indexOf('short') > -1;
    var bands = (el.dataset.bands || '').trim() ? el.dataset.bands.trim().split(/\s+/) : m.bands;
    var field = (el.dataset.cells || '').trim() ? el.dataset.cells.trim().split(/\s+/)
      : square ? (form === 'square-anchored' && mode === 'full' ? ANCHORED : m.sq)
        : short ? m.field.slice(0, 2) : m.field;
    field = cells(field);

    el.classList.remove('im-strip-v', 'im-strip-h', 'im-square');
    el.classList.add('im', square ? 'im-square' : form.indexOf('-h') > 0 ? 'im-strip-h' : 'im-strip-v');
    if (lit || el.dataset.keylines) el.classList.add('im-key');

    var html = '';
    bands.forEach(function (n) { html += '<i class="b" style="--k:' + val(n) + '"></i>'; });
    if (square) {
      html += '<div class="sub">';
      field.forEach(function (n) { html += '<i style="--k:' + val(n) + '"></i>'; });
      html += '</div>';
    } else {
      field.forEach(function (n) { html += '<i style="--k:' + val(n) + '"></i>'; });
    }
    el.innerHTML = html;

    var mod = parseFloat(getComputedStyle(el).getPropertyValue('--m'));
    if (mod && mod < FLOOR[form] && el.dataset.belowFloor !== 'demo') console.warn('[ink-mark] module ' + mod + 'px is below the ' + form + ' floor of ' + FLOOR[form] + 'px', el);
  }

  function render(root) { (root || document).querySelectorAll('.im').forEach(paint); }
  window.renderInkMarks = render;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { render(); });
  else render();
})();
