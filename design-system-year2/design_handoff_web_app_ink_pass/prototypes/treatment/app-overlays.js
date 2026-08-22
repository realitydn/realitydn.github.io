/* REALITY app — the overlay layer. Sheets, dialogs, toasts and banners, each
   on the screen it actually appears over. Loaded after treatment/app.js, which
   exposes window.APP and lays out anything in window.APP_OVERLAYS as a second
   canvas row.

   The mark appears on exactly two of these: the member card (a QR is a square
   frame, so the square butts to the code) and the sign-in sheet (first
   contact). Everything else is near-register UI — a popup that recolours
   beside a decision looks like it is telling you something. */
(function () {
  const A = window.APP;
  const ctx = (id, tag) => A.SCREENS.find((s) => s.id === id).html().replace(/id="app-/g, `id="ov-${tag}-app-`);
  const scrim = (lit) => `<div class="scrim${lit ? ' lit' : ''}"></div>`;
  const head = (t) => `<div class="plate-h"><span class="t">${t}</span><span class="x">✕</span></div>`;
  const sheet = (t, body, foot) => `<div class="plate sheet" data-pass-scope><span class="sheet-grip"></span>${head(t)}<div class="plate-b">${body}</div>${foot ? `<div class="plate-f">${foot}</div>` : ''}</div>`;
  const dlg = (t, body, foot, cls) => `<div class="plate dlg ${cls || 'dlg-sm'}" data-pass-scope>${head(t)}<div class="plate-b">${body}</div>${foot ? `<div class="plate-f">${foot}</div>` : ''}</div>`;

  window.APP_OVERLAYS = [
    { id: 'ov-rsvp', k: 'phone', n: 'RSVP sheet', mark: 'none on the sheet — near register, one decision; the mark below is the screen’s',
      th: 'The one ACTION is red and the sheet holds nothing else that competes. No mark: a plate that recolours beside a decision reads as a status light.',
      html: () => ctx('event', 'rsvp'),
      over: () => scrim() + sheet('Pub Quiz · Fri 21.08',
        `<h2 class="h2">You’re going</h2><p class="body-sm">Teams up to six. We’ll remind you an hour before it starts.</p>
<dl class="facts" style="--dt:86px"><div><dt>Room</dt><dd>2E · Event space</dd></div><div><dt>Going</dt><dd>41 so far</dd></div></dl>`,
        `<a class="btn" href="#">I’m going</a>`) },

    { id: 'ov-remind', k: 'phone', n: 'Reminder picker', mark: 'none on the sheet — the mark visible below belongs to the screen under it',
      th: 'Chips, not a wheel: four states, all visible, 48px each. The sheet keeps the event’s day plate so you never lose which night you are setting.',
      html: () => ctx('event', 'rem'),
      over: () => scrim() + sheet('Remind me',
        `<span class="day-plate d-fri">Fri 21.08</span><div class="chips"><span class="pill is-on">1 hour before</span><span class="pill">2 hours</span><span class="pill">1 day</span><span class="pill">Don’t remind me</span></div>
<ul class="sets" style="margin-top:4px"><li><span>Also notify me about changes</span><span class="tg is-on"></span></li><li><span>Add to my device calendar</span><span class="tg"></span></li></ul>`,
        `<a class="btn" href="#">Save</a><a class="btn btn-2" href="#">Cancel</a>`) },

    { id: 'ov-filter', k: 'phone', n: 'Calendar filter', mark: 'none on the sheet — the mark visible below belongs to the screen under it',
      th: 'A weekday hue is a swatch here and carries no text, so it needs no contrast budget. Selected state is an ink plate — never a hue.',
      html: () => ctx('calendar', 'filt'),
      over: () => scrim() + sheet('Filter the calendar',
        `<div><p class="eyebrow" style="margin-bottom:10px">Kind</p><div class="chips"><span class="pill is-on">Everything</span><span class="pill">Games</span><span class="pill">Music</span><span class="pill">Film</span><span class="pill">Talks</span><span class="pill">Workshops</span></div></div>
<div style="width:100%"><p class="eyebrow" style="margin-bottom:10px">Night</p><div class="rows" style="border-top:0">
${['mon,Mon,Board games', 'tue,Tue,Language exchange', 'wed,Wed,Film Club', 'thu,Thu,Open Mic'].map((r) => { const [d, l, n] = r.split(','); return `<article class="r d-${d}" style="grid-template-columns:20px 1fr auto;padding-left:0"><span class="sw"></span><span class="r-b"><span class="r-n">${l}</span><span class="r-m">${n}</span></span><span class="tg is-on"></span></article>`; }).join('')}</div></div>`,
        `<a class="btn" href="#">Show 14 events</a><a class="btn btn-2" href="#">Reset</a>`) },

    { id: 'ov-card', k: 'phone', n: 'Member card', mark: 'square · full · A2, butted to the QR',
      th: 'The one place the square appears in the app. The code’s four-module quiet zone is already stock, so the mark butts flush; the module is the code’s own module × 8.25, which makes the square exactly as tall as the code.',
      html: () => ctx('you', 'card'),
      over: () => scrim(true) + dlg('Your member card',
        `<div class="qrcard" style="padding:14px"><img src="assets/qr/reality-qr-ink-on-cream.png" alt="Member QR" style="width:132px;height:132px"><span class="im" data-form="square" data-mode="full" data-pass="A2" style="--m:33px"></span></div>
<div style="display:flex;flex-direction:column;gap:3px"><span class="h3">June Trần</span><span class="body-sm">Member since 03.25 · 31 events</span></div>
<p class="body-sm">Show this at the bar for rewards, or to check in to an event.</p>`,
        `<a class="btn btn-2" href="#">Done</a>`, 'dlg-sm') },

    { id: 'ov-call', k: 'phone', n: 'Call staff', mark: 'none on the sheet — the mark visible below belongs to the screen under it',
      th: 'The loudest confirm in the guest app, and still one plate: cream on red at display size only, ink for everything you read.',
      html: () => ctx('menu', 'call'),
      over: () => scrim() + dlg('Call staff',
        `<h2 class="disp disp-sm" style="font-size:26px"><span class="slam">Someone will come find you</span></h2>
<p class="body-sm">Tell us where you are so we don’t hunt the whole building.</p>
<div class="chips"><span class="pill">1L</span><span class="pill is-on">2L</span><span class="pill">2E</span><span class="pill">3P patio</span></div>`,
        `<a class="btn btn-action" href="#">Call staff</a><a class="btn btn-2" href="#">Cancel</a>`) },

    { id: 'ov-void', k: 'phone', n: 'Void a task', mark: 'none on the sheet — the mark visible below belongs to the screen under it',
      th: 'A destructive confirm, staff side. The stamp is ink on paper — a stamp, not a colour — and the red is spent on the verb, once.',
      html: () => ctx('task', 'void'),
      over: () => scrim() + dlg('Void this task',
        `<span class="stamp">Void</span><h2 class="h2">Ice well logged</h2>
<p class="body-sm">Sam logged this at 19:52. Voiding removes the points and puts the task back on the board.</p>
<dl class="facts" style="--dt:104px"><div><dt>Points</dt><dd>−20 from Sam</dd></div><div><dt>Logged by</dt><dd>You, 20:06</dd></div></dl>`,
        `<a class="btn btn-action" href="#">Void it</a><a class="btn btn-2" href="#">Keep it</a>`) },

    { id: 'ov-signin', k: 'phone', n: 'Sign in', mark: 'strip-h · full · A2 quick pass',
      th: 'First contact inside the app, so the sheet gets a pass of its own — the only overlay that does. One field, one ACTION, no password.',
      html: () => ctx('calendar', 'sign'),
      over: () => scrim() + sheet('Sign in',
        `<span class="im" data-form="strip-h" data-mode="full" data-pass="A2" style="--m:11px"></span>
<h2 class="h2">RSVP, reminders and rewards</h2><p class="body-sm">We send a code. No password to forget.</p>
<div style="width:100%;display:flex;flex-direction:column;gap:8px"><span style="font:700 11px/1 var(--mont);letter-spacing:.14em;text-transform:uppercase">Phone or email</span><span style="min-height:52px;border:2px solid var(--fg);display:block"></span></div>
<p class="body-sm">By signing in you agree to be normal in our rooms.</p>`,
        `<a class="btn" href="#">Send me a code</a>`) },

    { id: 'ov-toast', k: 'phone', n: 'Toast & banner', mark: 'none on the sheet — the mark visible below belongs to the screen under it',
      th: 'The two states that are not plates. The banner is a notice and takes yellow with ink on it; the toast is an ink plate and takes no colour at all. Neither is a surface, so neither takes a mark.',
      html: () => `<div class="banner">Offline — showing tonight’s cached calendar<span class="sp">Retry</span></div>` + ctx('menu', 'toast'),
      over: () => `<div class="toast"><span class="t">Reminder set for 19:00</span><span class="a">Undo</span></div>` },

    { id: 'ov-perm', k: 'phone', n: 'Notifications', mark: 'none on the sheet — the mark visible below belongs to the screen under it',
      th: 'The system prompt is not ours, so ours goes first and earns it: what we send, how often, and a way to say no that isn’t buried.',
      html: () => ctx('now', 'perm'),
      over: () => scrim() + dlg('Notifications',
        `<h2 class="h2">We’ll only ping you about nights you said yes to</h2>
<ul class="sets" style="margin-top:0"><li><span>Event reminders</span><span class="tg is-on"></span></li><li><span>Changes to events you RSVP’d</span><span class="tg is-on"></span></li><li><span>Tonight at REALITY, once a day</span><span class="tg"></span></li></ul>`,
        `<a class="btn" href="#">Turn on</a><a class="btn btn-2" href="#">Not now</a>`) }
  ];
})();
