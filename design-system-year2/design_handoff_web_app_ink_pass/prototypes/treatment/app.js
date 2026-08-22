/* REALITY app — Three-Ink Bands treatment, 12 screens.
   ROLE = COLOUR · NIGHT STAYS SATURATED · DAY-CODING WINS.
   Copy from REALITYApp/messages/en.json; nav glyphs from BottomNav.tsx. */

const ICON = {
  calendar: '<rect x="3" y="5" width="18" height="16"/><line x1="3" y1="9.5" x2="21" y2="9.5"/><line x1="8" y1="3" x2="8" y2="6.5"/><line x1="16" y1="3" x2="16" y2="6.5"/><rect x="6.5" y="12.5" width="3.5" height="3.5" fill="currentColor" stroke="none"/>',
  menu: '<path d="M4 4 H20 L12 12 Z"/><line x1="12" y1="12" x2="12" y2="19"/><line x1="7.5" y1="21" x2="16.5" y2="21"/>',
  you: '<circle cx="12" cy="8" r="3.6"/><path d="M5 20 L7.5 14.5 L16.5 14.5 L19 20"/>',
  staff: '<path d="M4 20 V9 L12 4 L20 9 V20"/><line x1="4" y1="20" x2="20" y2="20"/>',
  tasks: '<rect x="4" y="4" width="16" height="16"/><path d="M8 12 L11 15 L16 9"/>',
  games: '<rect x="3.5" y="6.5" width="17" height="11"/><rect x="7" y="10" width="3" height="3" fill="currentColor" stroke="none"/><rect x="14" y="10" width="3" height="3" fill="currentColor" stroke="none"/>'
};
const svg = (k) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" stroke-linejoin="miter" aria-hidden="true">${ICON[k]}</svg>`;
/* Three tabs, not four. Backstage was a guest-facing tab for a staff tool, so
   the sets split: guests get where-to-go / what-to-drink / who-you-are, staff
   get their own three. Every tab is a real destination in this deck. */
const NAV_GUEST = [['calendar', 'What\u2019s on'], ['menu', 'Menu'], ['you', 'You']];
const NAV_STAFF = [['staff', 'Shift'], ['tasks', 'Sidework'], ['games', 'Games']];

const sbar = () => `<div class="sbar"><span>21:04</span><span>5G ▮▮▮ 82%</span></div>`;
/* the ink mark — one per screen, form chosen by the frame, mode by the job */
const im = (o) => `<span class="im" data-form="${o.form || 'strip-h'}" data-mode="${o.mode || 'full'}"${o.day ? ` data-day="${o.day}"` : ''}${o.pass ? ` data-pass="${o.pass}"` : ''}${o.swap ? ` data-swap="${o.swap}"` : ''}${o.chain ? ` data-chain="${o.chain}"` : ''}${o.idle ? ` data-idle="${o.idle}"` : ''} aria-hidden="true" style="--m:${o.m || 9}px"></span>`;
const hd = (t) => `<header class="ahd"><span class="wm"></span><div class="ahd-r">${t ? `<span class="ahd-t">${t}</span>` : ''}<button class="ico js-theme" type="button" aria-label="Day or night">◐</button><span class="av"></span></div></header>`;
const sub = (t, right) => `<header class="ahd"><a class="ico" href="#">←</a><span class="ahd-t">${t}</span>${right || '<button class="ico js-theme" type="button" aria-label="Day or night">◐</button>'}</header>`;
const nav = (on, set) => { const N = set === 'staff' ? NAV_STAFF : NAV_GUEST; return `<nav class="nav">${N.map(([k, l]) => `<a class="${k === on ? 'is-on' : ''}" href="#" aria-current="${k === on ? 'page' : 'false'}">${svg(k)}<span>${l}</span></a>`).join('')}</nav>`; };
const band = (cls, inner) => `<section class="band ${cls}"><div class="band-in">${inner}</div></section>`;
const slot = (id, label, ratio) => `<div class="slot" style="aspect-ratio:${ratio}"><image-slot id="${id}" shape="rect" fit="cover" placeholder="${label}"></image-slot></div>`;

/* name + qualifier are separate fields (the canon .name-block / .type-sub
   pair) so the name can wrap to three lines without the time, room or arrow
   moving. The QUALIFIER IS OPTIONAL — an empty string renders no line at all
   and the row closes up. Three of these seven have none, deliberately: the
   mixed case is the one the calendar actually has to survive. */
const WEEK = [
  ['wed', 'Wed', '19.08', 'Film Club: In the Mood for Love', 'Screening + discussion, in 2E', '20:00', '2E'],
  ['thu', 'Thu', '20.08', 'Open Mic Night at REALITY', '', '20:00', '1L'],
  ['fri', 'Fri', '21.08', 'The Great Big Đà Nẵng Pub Quiz', 'Six rounds, teams up to six', '20:00', '2E'],
  ['sat', 'Sat', '22.08', 'Live Music: Cỏ Cây + guests', '', '21:00', '1L'],
  ['sun', 'Sun', '23.08', 'Life Drawing with a live model', 'Materials provided, no experience needed', '16:00', '2L'],
  ['mon', 'Mon', '24.08', 'Board Game Night with the REALITY library', 'Sixty-plus games on the shelf', '19:00', '2L'],
  ['tue', 'Tue', '25.08', 'Language Exchange · Tiếng Việt ↔ English', '', '19:00', '2E']
];

const weekRows = () => `<div class="rows rows-ev">${WEEK.map(([d, dy, dt, n, q, tm, rm]) =>
  `<article class="r r-ev d-${d}"><span class="day-spine"></span><span class="r-when"><span class="day-plate">${dy}</span><span class="r-dt">${dt}</span></span><span class="r-b name-block"><span class="r-n">${n}</span>${q ? `<span class="type-sub">${q}</span>` : ''}<span class="r-m">${tm} · ${rm}</span></span><span class="r-go">→</span></article>`).join('')}</div>`;

const SCREENS = [
  { id: 'splash', k: 'phone', n: 'Splash', mark: 'strip-v · full · A1 full pass, chained to the wordmark', th: 'First contact, and the only place the reference parameters are spent: nine plates in token order, one second end to end, then the wordmark and the address register to the mark.',
    html: () => sbar() + `<section class="band b-paper splash" data-pass-scope>${im({ form: 'strip-v', mode: 'full', m: 22, pass: 'A1', chain: '.wm,.splash-t' })}<span class="wm"></span><span class="splash-t">86 Mai Thúc Lân · Đà Nẵng</span></section>` },

  { id: 'now', k: 'phone', n: 'Tonight', mark: 'strip-h · ink · A2 — ink mode, because the field is already the day hue', th: 'The front door. Day-coding wins, so tonight\u2019s field is the weekday hue \u2014 display text only.',
    html: () => sbar() + hd('') +
      band('day-field d-wed', `${im({ form: 'strip-h', mode: 'ink', m: 9, pass: 'A2' })}<p class="eyebrow">Tonight at REALITY</p><h1 class="disp"><span class="thin">wed 19.08 /</span><span class="slam">Film Club</span></h1><p class="body">20:00 · 2E event space · Free entry</p><div class="row"><a class="btn btn-sm" href="#">Details</a><a class="btn btn-2 btn-sm" href="#">See the week</a></div>`) +
      band('b-paper', `<p class="eyebrow">Also open</p><dl class="facts"><div><dt>Kitchen</dt><dd>Till 23:00</dd></div><div><dt>Bar</dt><dd>Till 02:00</dd></div><div><dt>Patio</dt><dd>3P, open late</dd></div></dl>` + slot('app-now', 'The room tonight', '16/10')) +
      band('b-act', `<h2 class="disp disp-sm"><span class="slam">Get the app</span></h2><p class="body">RSVP, reminders, and what\u2019s on tonight \u2014 in your pocket.</p><a class="btn" href="#">Install</a>`) + nav('calendar') },

  { id: 'calendar', k: 'phone', n: 'Calendar', mark: 'strip-h · majors · A2 quick pass', th: 'Paper list; hue carries identity as plate + spine. Blue is spent on the subscribe route, not decoration.',
    html: () => sbar() + hd('') +
      band('b-paper', `${im({ form: 'strip-h', mode: 'majors', m: 9, pass: 'A2' })}<p class="eyebrow">This week</p><h1 class="h2">Upcoming at REALITY</h1><div class="chips"><span class="pill is-on">All</span><span class="pill">Games</span><span class="pill">Music</span><span class="pill">Talks</span></div>` + weekRows()) +
      band('b-wayfind', `<p class="eyebrow">Never miss one</p><h2 class="h2">Subscribe to the calendar</h2><p class="body">Every REALITY event in your own calendar, always up to date.</p><a class="btn" href="#">Subscribe</a>`) + nav('calendar') },

  { id: 'event', k: 'phone', n: 'Event detail', mark: 'strip-h · daycode (fri) · A2, then static', th: 'Poster full-bleed, facts on paper, one red imperative. The title is the largest event name in the app, so it is set at real length: uppercase display wrapping to three lines, with the qualifier carrying the detail underneath.',
    html: () => sbar() + sub('What\u2019s on', '<a class="ico" href="#">↗</a>') +
      `<div class="slot" style="aspect-ratio:4/5;border-width:0 0 3px"><image-slot id="app-poster" shape="rect" fit="cover" placeholder="Event poster \u2014 4:5"></image-slot></div>` +
      band('b-paper', `<span class="day-plate d-fri">Fri 21.08.26</span>${im({ form: 'strip-h', mode: 'daycode', day: 'fri', m: 9, pass: 'A2' })}<h1 class="disp disp-sm ev-title"><span class="slam">The Great Big Đà Nẵng Pub Quiz</span></h1><p class="type-sub">Six rounds, teams up to six</p><p class="body">Teams up to six. Free event \u2014 buy something to support REALITY.</p><dl class="facts"><div><dt>Time</dt><dd>20:00 \u2013 22:30</dd></div><div><dt>Room</dt><dd>2E \u00b7 Event space</dd></div><div><dt>Host</dt><dd>Donald</dd></div><div><dt>Last time</dt><dd>40+ people</dd></div></dl>`) +
      band('b-act', `<h2 class="disp disp-sm"><span class="slam">I\u2019m going</span></h2><p class="body">We\u2019ll remind you an hour before it starts.</p><div class="chips"><span class="pill is-on">1h before</span><span class="pill">2h</span><span class="pill">1 day</span></div><a class="btn" href="#">I\u2019m going</a><a class="btn btn-2" href="#">Go anonymously</a>`) + nav('calendar') },

  { id: 'menu', k: 'phone', n: 'Menu', mark: 'strip-short-h · majors · A3 single plate', th: 'All paper. Yellow appears only where there is an actual deal; red only for the staff call.',
    html: () => sbar() + hd('') +
      band('b-paper', `${im({ form: 'strip-short-h', mode: 'majors', m: 9, pass: 'A3' })}<p class="eyebrow">Have a drink</p><h1 class="h2">Cocktails</h1><div class="chips"><span class="pill is-on">Cocktails</span><span class="pill">Coffee</span><span class="pill">Beer</span><span class="pill">Food</span></div>
<div class="rows">${[['Whiskey Sour', 'Jim Beam Black, Angostura, lemon, eggwhite.', '160k'], ['Cuba Libre', 'Havana 3y, Coca-Cola, lime.', '95k'], ['Old-Fashioned', 'Jim Beam Black, Angostura, citrus oil.', '145k'], ['Long Island Iced Tea', 'All the alcohols + a splash of Coca-Cola.', '180k'], ['Negroni', 'Tanqueray Dry, Campari, Dolin Rouge.', '165k']]
        .map(([n, d, p]) => `<article class="r" style="grid-template-columns:1fr auto;padding-left:0"><span class="r-b"><span class="r-n">${n}</span><span class="r-m">${d}</span></span><span class="r-p">${p}</span></article>`).join('')}</div>`) +
      band('b-notice', `<p class="eyebrow">Deal</p><h2 class="h2">Happy hour 17:00 \u2013 19:00</h2><p class="body">House pours and draft at 60k, every day.</p>`) +
      band('b-act', `<h2 class="disp disp-sm"><span class="slam">Call staff</span></h2><p class="body">In REALITY right now? Tap and we\u2019ll come find you.</p><a class="btn" href="#">Call staff</a>`) + nav('menu') },

  { id: 'you', k: 'phone', n: 'You', th: 'Identity is wayfinding \u2014 blue. Rewards are a notice \u2014 yellow. Settings stay paper.',
    html: () => sbar() + hd('') +
      band('b-wayfind', `<p class="eyebrow">Your profile</p><div class="row"><span class="av av-lg"></span><span><span class="h2" style="display:block">June Tr\u1ea7n</span><span class="body-sm">Member since 03.25</span></span></div><div class="score"><div><span class="score-k">Score</span><span class="score-v">1,240</span></div><div><span class="score-k">Rank</span><span class="score-v">7</span></div><div><span class="score-k">Events</span><span class="score-v">31</span></div></div>`) +
      band('b-paper', `<p class="eyebrow">Your plans</p><div class="rows">
<article class="r r-ev d-fri"><span class="day-spine"></span><span class="r-when"><span class="day-plate">Fri</span><span class="r-dt">21.08</span></span><span class="r-b name-block"><span class="r-n">The Great Big Đà Nẵng Pub Quiz</span><span class="type-sub">Going \u00b7 six rounds, teams up to six</span><span class="r-m">20:00 \u00b7 2E</span></span><span class="r-go">→</span></article>
<article class="r r-ev d-sat"><span class="day-spine"></span><span class="r-when"><span class="day-plate">Sat</span><span class="r-dt">22.08</span></span><span class="r-b name-block"><span class="r-n">Live Music: C\u1ecf C\u00e2y + guests</span><span class="type-sub">Reminder set \u00b7 two sets, doors 20:30</span><span class="r-m">21:00 \u00b7 1L</span></span><span class="r-go">→</span></article></div>`) +
      band('b-notice', `<p class="eyebrow">Rewards</p><h2 class="h2">Two more events unlocks a free coffee</h2><p class="body">Show the code to any staff member. One-time use.</p><a class="btn btn-sm" href="#">Show code</a>`) +
      band('b-paper', `<p class="eyebrow">Settings</p><ul class="sets"><li><span>Display name</span><span class="set-v">June Tr\u1ea7n</span></li><li><span>Language</span><span class="set-v">English</span></li><li><span>REALITY newsletter</span><span class="tg is-on"></span></li><li><span>Event reminders</span><span class="tg is-on"></span></li></ul><a class="btn btn-2" href="#">Sign out</a>`) + nav('you') },

  { id: 'quiz', k: 'phone', n: 'Pub Quiz · live', theme: 'dark', th: 'Night by default — a quiz runs in a dark room and the phone is the brightest thing at the table. One red field, cream display type, ink on the answer plates.',
    html: () => sbar() + `<header class="ahd"><span class="live"><span class="dot"></span>Live now</span><span class="ahd-t">Pub Quiz</span><button class="ico js-theme" type="button" aria-label="Day or night">◐</button></header>` +
      band('b-act', `<p class="eyebrow">Round 2 \u00b7 Question 4</p><h1 class="disp" style="font-size:33px;font-weight:200;text-transform:none;letter-spacing:0;line-height:1.2">Which river runs through \u0110\u00e0 N\u1eb5ng and empties into the bay at Thuận Phước?</h1>
<div class="ans"><button type="button"><span class="ans-k">A</span>S\u00f4ng H\u00e0n</button><button type="button"><span class="ans-k">B</span>S\u00f4ng Thu B\u1ed3n</button><button type="button"><span class="ans-k">C</span>S\u00f4ng C\u1ea9m L\u1ec7</button><button type="button"><span class="ans-k">D</span>S\u00f4ng Cu \u0110\u00ea</button></div>
<div class="timer"><span class="timer-b"></span><span class="timer-t">0:24</span></div>`) +
      band('b-paper', `<div class="score" style="border-top:0;padding-top:0"><div><span class="score-k">Your score</span><span class="score-v">18</span></div><div><span class="score-k">Rank</span><span class="score-v">3</span></div><div><span class="score-k">In the room</span><span class="score-v">34</span></div></div><a class="btn btn-2" href="#">Scoreboard</a>`) + nav('calendar') },

  { id: 'quick', k: 'phone', n: 'Quick fingers round', theme: 'dark', mark: 'strip-h · full · A2, idle life on the minors',
    th: 'Speed round: four choices, four hues, ink text on every one. The hue is a CHOICE TOKEN, like a weekday — it identifies, it never states a status — and it never carries the answer alone: letter, colour and words always travel together.',
    html: () => sbar() + `<header class="ahd"><span class="live"><span class="dot"></span>Quick fingers</span><span class="ahd-t">Round 4 · 8 of 12</span><button class="ico js-theme" type="button" aria-label="Day or night">◐</button></header>` +
      band('b-paper', `${im({ form: 'strip-h', mode: 'full', m: 9, pass: 'A2' })}<p class="eyebrow">Fastest correct answer wins the round</p><h1 class="h2" style="font-weight:500;font-family:var(--grotesk);text-transform:none;letter-spacing:0;font-size:22px;line-height:1.3">Which of these is NOT a bridge over the Hàn?</h1>
<div class="ans ans-quick"><button type="button" class="q-a"><span class="ans-k">A</span>Thận Phưọc</button><button type="button" class="q-b"><span class="ans-k">B</span>Trần Thị Lý</button><button type="button" class="q-c"><span class="ans-k">C</span>Cầu Vàng</button><button type="button" class="q-d"><span class="ans-k">D</span>Cầu Rồng</button></div>
<div class="timer"><span class="timer-b" style="background:linear-gradient(90deg,var(--fg) 22%,transparent 22%)"></span><span class="timer-t">0:06</span></div>`) +
      band('b-paper', `<p class="eyebrow">Room</p><div class="rows"><article class="r" style="padding-left:0"><span class="r-b"><span class="r-n">Locked in</span><span class="r-m">28 of 34 answered</span></span><span class="r-p">6 left</span></article></div><a class="btn btn-2" href="#">Scoreboard</a>`) + nav('calendar') },

  { id: 'board', k: 'phone', n: 'Leaderboard', theme: 'dark', th: 'Weekday hues become rank swatches \u2014 hue as swatch carries no text, so it needs no contrast budget.',
    html: () => sbar() + hd('') +
      band('b-paper', `<p class="eyebrow">Leaderboard</p><h1 class="h2">This month</h1><div class="chips"><span class="pill is-on">Everything</span><span class="pill">Pub Quiz</span><span class="pill">Karaoke</span><span class="pill">Paparazzi</span></div>
<div class="rows">${[['Krisel', '1,480', '12 sessions', 'mon'], ['June Tr\u1ea7n', '1,240', '9 sessions', 'tue'], ['Donald', '1,190', '11 sessions', 'wed'], ['Minh', '980', '7 sessions', 'thu'], ['Hoa', '910', '8 sessions', 'fri'], ['Alex', '860', '6 sessions', 'sat'], ['Th\u1ea3o', '720', '5 sessions', 'sun']]
        .map(([n, p, s, d], i) => `<article class="r d-${d}" style="grid-template-columns:30px 20px 1fr auto;padding-left:0"><span class="pts">${i + 1}</span><span class="sw"></span><span class="r-b"><span class="r-n">${n}</span><span class="r-m">${s}</span></span><span class="r-p">${p}</span></article>`).join('')}</div>`) +
      band('b-wayfind', `<p class="eyebrow">Season</p><h2 class="h2">Play a game this month to land on the board</h2><a class="btn" href="#">What\u2019s on</a>`) + nav('calendar') },

  { id: 'backstage', k: 'phone', n: 'Backstage', th: 'Staff home. Red is reserved for the one thing overdue \u2014 everything else is paper facts.',
    html: () => sbar() + hd('Backstage') +
      band('b-paper', `<p class="eyebrow">Tonight \u00b7 Wed 19.08</p><h1 class="h2">Your shift</h1><dl class="facts"><div><dt>Shift</dt><dd>17:00 \u2013 01:00 \u00b7 Bar</dd></div><div><dt>Lead</dt><dd>Krisel</dd></div><div><dt>On floor</dt><dd>You, Minh, Sam</dd></div><div><dt>Rooms live</dt><dd>2E Film Club \u00b7 1L open</dd></div></dl>`) +
      band('b-act', `<p class="eyebrow">Overdue</p><h2 class="disp disp-sm"><span class="slam">Ice well not logged</span></h2><p class="body">Due 20:00. Two other tasks are close behind.</p><a class="btn" href="#">Open sidework</a>`) +
      band('b-paper', `<p class="eyebrow">Quick</p><div class="rows">
<article class="r" style="padding-left:0"><span class="r-b"><span class="r-n">Sidework board</span><span class="r-m">9 of 14 done</span></span><span class="r-go">→</span></article>
<article class="r" style="padding-left:0"><span class="r-b"><span class="r-n">Start a game session</span><span class="r-m">Pub Quiz \u00b7 Karaoke \u00b7 Paparazzi</span></span><span class="r-go">→</span></article>
<article class="r" style="padding-left:0"><span class="r-b"><span class="r-n">Event check-in</span><span class="r-m">14 RSVPs tonight</span></span><span class="r-go">→</span></article>
<article class="r" style="padding-left:0"><span class="r-b"><span class="r-n">Guides</span><span class="r-m">Open, close, run a room</span></span><span class="r-go">→</span></article></div>`) + nav('staff', 'staff') },

  { id: 'sidework', k: 'phone', n: 'Sidework board', th: 'A whole screen of state with no colour at all until something is late. That restraint is the point.',
    html: () => sbar() + sub('Sidework \u00b7 Wed 17:00') +
      band('b-paper', `<div class="score" style="border-top:0;padding-top:0"><div><span class="score-k">Done</span><span class="score-v">9</span></div><div><span class="score-k">Left</span><span class="score-v">5</span></div><div><span class="score-k">Points</span><span class="score-v">180</span></div></div>`) +
      band('b-notice', `<p class="eyebrow">Before open</p><h2 class="h2">Two tasks close in 40 minutes</h2><p class="body">Ice well and patio reset. Claim them before the room fills.</p>`) +
      band('b-paper', `<p class="eyebrow">Open now</p><div class="rows">
${[['Ice well logged', 'Bar \u00b7 due 20:00', '20', 0], ['Patio reset', '3P \u00b7 due 20:00', '15', 0], ['Glass rack down', 'Bar \u00b7 due 22:00', '10', 0], ['2E chairs to quiz layout', '2E \u00b7 due 19:30', '25', 0], ['Bathroom check', 'All floors \u00b7 hourly', '10', 0]]
          .map(([n, m, p, d]) => `<article class="task"><span class="box${d ? ' is-done' : ''}"></span><span class="r-b"><span class="r-n">${n}</span><span class="r-m">${m}</span></span><span class="pts">${p}</span></article>`).join('')}</div>`) +
      band('b-paper', `<p class="eyebrow">Done this shift</p><div class="rows">
${[['Coffee machine flushed', 'Krisel \u00b7 17:20', '15'], ['Floor swept', 'Minh \u00b7 17:40', '10'], ['Menus wiped', 'You \u00b7 18:05', '10']]
          .map(([n, m, p]) => `<article class="task"><span class="box is-done"></span><span class="r-b"><span class="r-n">${n}</span><span class="r-m">${m}</span></span><span class="pts">${p}</span></article>`).join('')}</div><a class="btn btn-2" href="#">Shift lead: claim</a>`) + nav('tasks', 'staff') },

  { id: 'task', k: 'phone', n: 'Sidework task', th: 'One task, one ACTION. The VOID stamp is ink on paper \u2014 a stamp, not a colour.',
    html: () => sbar() + sub('Task') +
      band('b-paper', `<p class="eyebrow">Bar \u00b7 due 20:00</p><h1 class="disp disp-sm"><span class="slam">Ice well logged</span></h1><dl class="facts"><div><dt>Points</dt><dd>20</dd></div><div><dt>When</dt><dd>Before open, every shift</dd></div><div><dt>Claimed</dt><dd>Unclaimed</dd></div></dl><p class="body">Drain, wipe and refill the well. Log the level so the next shift knows what they inherited.</p>` + slot('app-task', 'Reference photo \u2014 the well, filled', '3/2')) +
      band('b-act', `<h2 class="disp disp-sm"><span class="slam">Mark it done</span></h2><p class="body">This logs you as the person who did it, at 20:04.</p><a class="btn" href="#">Mark done \u00b7 +20</a>`) +
      band('b-paper', `<p class="eyebrow">History</p><div class="rows"><article class="r" style="padding-left:0"><span class="r-b"><span class="r-n">Tue 18.08</span><span class="r-m">Krisel \u00b7 19:52</span></span><span class="r-p">+20</span></article><article class="r" style="padding-left:0"><span class="r-b"><span class="r-n">Mon 17.08</span><span class="r-m">Sam \u00b7 voided by Krisel</span></span><span class="stamp">Void</span></article></div>`) + nav('tasks', 'staff') },

  { id: 'checkin', k: 'phone', n: 'Event check-in', theme: 'dark', th: 'A staff tool at arm\u2019s length: the weekday field identifies the event, the count is the only fact that matters.',
    html: () => sbar() + sub('Check-in') +
      band('day-field d-fri', `<p class="eyebrow">Fri 21.08 \u00b7 2E</p><h1 class="disp"><span class="thin">checking in /</span><span class="slam">Pub Quiz</span></h1><div class="score" style="border-top-color:currentColor"><div><span class="score-k">In</span><span class="score-v">28</span></div><div><span class="score-k">RSVP</span><span class="score-v">41</span></div><div><span class="score-k">Teams</span><span class="score-v">6</span></div></div>`) +
      band('b-paper', `<p class="eyebrow">Scan</p><div class="slot" style="aspect-ratio:1;display:grid;place-items:center"><span class="slot-tag">Camera \u2014 point at a member QR</span></div><a class="btn btn-2" href="#">Enter a name instead</a>`) +
      band('b-paper', `<p class="eyebrow">Just in</p><div class="rows"><article class="r" style="padding-left:0"><span class="r-b"><span class="r-n">June Tr\u1ea7n</span><span class="r-m">20:02 \u00b7 Team Sông Hàn</span></span><span class="r-p">+1</span></article><article class="r" style="padding-left:0"><span class="r-b"><span class="r-n">Alex R.</span><span class="r-m">20:01 \u00b7 guest</span></span><span class="r-p">+1</span></article></div>`) + nav('games', 'staff') },

  { id: 'tv', k: 'tv', n: 'Big screen \u00b7 quiz', theme: 'dark', mark: 'strip-h · C1 composite — A1 pass, 400ms, then the B3 ladder', th: 'The far register: one red field, cream at 52px, answers as cream plates. Read from the back of 2E.',
    html: () => `<section class="band b-act tv-q">
<div style="display:flex;justify-content:space-between;align-items:baseline;gap:24px"><p class="eyebrow" style="font-size:18px">Round 2 \u00b7 Question 4</p><span class="timer-t" style="font-size:40px">0:24</span></div>
<h1 class="disp">Which river runs through \u0110\u00e0 N\u1eb5ng and empties into the bay at Thuận Phước?</h1>
<div class="tv-ans"><div><span>A</span>S\u00f4ng H\u00e0n</div><div><span>B</span>S\u00f4ng Thu B\u1ed3n</div><div><span>C</span>S\u00f4ng C\u1ea9m L\u1ec7</div><div><span>D</span>S\u00f4ng Cu \u0110\u00ea</div></div>
</section>
<div class="tv-foot"><span class="wm"></span><span>Pub Quiz \u00b7 Fri 21.08</span>${im({ form: 'strip-h', mode: 'full', m: 11, pass: 'A1', swap: 'B3' })}<span>realitydn.com</span></div>` },
  { id: 'tvquick', k: 'tv', n: 'Big screen · quick fingers', theme: 'dark', mark: 'strip-h · full · B3 ladder',
    th: 'The same four choice hues at the far register, read from the back of 2E. Caps here, sentence case on the phone — register sets case, not the element.',
    html: () => `<section class="band b-paper tv-q">
<div style="display:flex;justify-content:space-between;align-items:baseline;gap:24px"><p class="eyebrow" style="font-size:18px">Quick fingers · 8 of 12</p><span class="timer-t" style="font-size:40px">0:06</span></div>
<h1 class="disp" style="font-size:40px">Which of these is NOT a bridge over the Hàn?</h1>
<div class="tv-ans tv-quick"><div class="q-a"><span>A</span>Thận Phưọc</div><div class="q-b"><span>B</span>Trần Thị Lý</div><div class="q-c"><span>C</span>Cầu Vàng</div><div class="q-d"><span>D</span>Cầu Rồng</div></div>
</section>
<div class="tv-foot"><span class="wm"></span><span>Pub Quiz · Fri 21.08</span>${im({ form: 'strip-h', mode: 'full', m: 11, swap: 'B3' })}<span>realitydn.com</span></div>` }
];
window.APP = { SCREENS, sbar, hd, sub, nav, band, slot, im, weekRows, svg, WEEK };

function appFrame(s, i, kind) {
  const f = document.createElement('div');
  f.className = 'cv-frame';
  f.setAttribute('data-frame', '');
  const w = s.k === 'tv' ? 1000 : 390;
  f.style.width = w + 'px';
  const n = kind + String(i + 1).padStart(2, '0');
  f.innerHTML = `<div class="cv-label"><span class="cv-num">${n}</span><div><h4>${s.n}</h4><p>${s.th}</p>${s.mark ? `<p class="cv-mark">${s.mark}</p>` : ''}${s.theme === 'dark' ? '<p class="cv-night">Night — default for this screen</p>' : ''}</div></div>
<div class="${s.k} tr app${s.over ? ' stack' : ''}" data-theme-scope data-theme="${s.theme || 'light'}" data-screen-label="${n} ${s.n}">${s.over ? `<div class="screen">${s.html()}</div>${s.over()}` : `<div class="screen">${s.html()}</div>`}</div>`;
  return f;
}
function boot() {
  const GAP = 140, PAD = 80;
  const rows = [[SCREENS, 'S']];
  if (window.APP_OVERLAYS) rows.push([window.APP_OVERLAYS, 'X']);
  const built = rows.map(([list, kind]) => list.map((s, i) => {
    const f = appFrame(s, i, kind);
    document.body.appendChild(f);
    return f;
  }));
  const settle = () => {
    /* bail if a host sheet has replaced these frames — a detached node
       measures 0 and would clobber a correct extent set by that sheet */
    if (!built.length || !built[0].length || !built[0][0].isConnected) return;
    let top = PAD, wide = 0;
    built.forEach((row) => {
      let x = PAD;
      row.forEach((f) => { f.style.left = x + 'px'; f.style.top = top + 'px'; x += parseFloat(f.style.width) + GAP; });
      wide = Math.max(wide, x);
      top += Math.max(...row.map((f) => f.offsetHeight)) + 190;
    });
    document.body.style.width = (wide + PAD) + 'px';
    document.body.style.height = (top + 60) + 'px';
  };
  settle();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(settle);
  setTimeout(settle, 600);
  if (window.renderInkMarks) window.renderInkMarks();
  if (window.InkMotion) window.InkMotion.wire(document);
}
document.addEventListener('DOMContentLoaded', boot);
