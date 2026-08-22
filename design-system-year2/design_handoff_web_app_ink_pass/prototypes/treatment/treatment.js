/* Shared runtime for the treatment pages: inline the wordmark so it inherits
   ink/cream, and wire the ◐ Day/Night flip through the 700ms settle. */
(function () {
  const base = document.currentScript.src.replace(/treatment\/treatment\.js.*$/, '');
  const ready = (fn) => document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', fn) : fn();
  Promise.all([
    fetch(base + 'assets/wordmark/reality-wordmark.svg').then(r => r.ok ? r.text() : Promise.reject()),
    new Promise(res => ready(res))
  ]).then(([svg]) => {
    svg = svg.replace(/fill="#0d0905"/g, 'fill="currentColor"');
    document.querySelectorAll('.wm').forEach(el => { el.innerHTML = svg; el.classList.add('is-inline'); });
  }).catch(() => {});

  const KEY = 'reality-treatment-theme';
  const root = document.documentElement;
  const apply = (t) => {
    root.setAttribute('data-theme', t);
    root.classList.add('theme-settling');
    setTimeout(() => root.classList.remove('theme-settling'), 700);
  };
  try { const s = localStorage.getItem(KEY); if (s) root.setAttribute('data-theme', s); } catch (e) {}

  document.addEventListener('click', (e) => {
    const b = e.target.closest('.js-theme');
    if (!b) return;
    const scoped = b.closest('[data-theme-scope]');
    if (scoped) {
      const night = scoped.getAttribute('data-theme') === 'dark';
      scoped.setAttribute('data-theme', night ? 'light' : 'dark');
      scoped.classList.add('theme-settling');
      setTimeout(() => scoped.classList.remove('theme-settling'), 700);
      return;
    }
    const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    apply(next);
    try { localStorage.setItem(KEY, next); } catch (e) {}
  });
})();
