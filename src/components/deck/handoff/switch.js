// The switch — a small control in the bottom-right corner that lists the
// hand-offs. DEV ONLY (see mode.js). Plain DOM, outside the React tree.
//
// Closed it is one 48px button naming the option in use; open it lists all
// six. Picking one reloads the page with ?handoff=<key>.
export function mountSwitch({ options, current, reduced, pick }) {
  const cur = options.find((o) => o.key === current) || options[0];
  const label = (o) => (o.no ? `${o.no} ${o.name}` : o.name);

  const box = document.createElement('div');
  box.className = 'ho-sw';

  const list = document.createElement('div');
  list.className = 'ho-sw-list';
  list.id = 'ho-sw-list';
  options.forEach((o) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'ho-sw-opt';
    b.textContent = label(o);
    if (o.key === cur.key) b.setAttribute('aria-current', 'true');
    b.addEventListener('click', () => pick(o.key));
    list.appendChild(b);
  });
  if (reduced) {
    const note = document.createElement('p');
    note.className = 'ho-sw-note';
    note.textContent = 'Reduced motion is on: no hand-off runs.';
    list.appendChild(note);
  }

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'ho-sw-btn';
  btn.setAttribute('aria-expanded', 'false');
  btn.setAttribute('aria-controls', 'ho-sw-list');
  btn.innerHTML = '<small>Hand-off</small><b></b>';
  btn.querySelector('b').textContent = label(cur);

  const setOpen = (open) => {
    box.classList.toggle('is-open', open);
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  };
  btn.addEventListener('click', () => setOpen(!box.classList.contains('is-open')));
  const onDoc = (e) => { if (!box.contains(e.target)) setOpen(false); };
  const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
  document.addEventListener('pointerdown', onDoc);
  document.addEventListener('keydown', onKey);

  box.appendChild(list);
  box.appendChild(btn);
  document.body.appendChild(box);

  return () => {
    document.removeEventListener('pointerdown', onDoc);
    document.removeEventListener('keydown', onKey);
    box.remove();
  };
}
