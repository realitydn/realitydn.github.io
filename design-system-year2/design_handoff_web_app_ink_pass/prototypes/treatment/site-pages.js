/* REALITY website — full layout. Every page and every popup, with the ink
   mark placed and the two motion engines wired.

   ONE MARK PER PAGE. The frame decides the form (long edge → strip, square
   or tiny frame → square); the page's job decides the mode. Home is the one
   page that carries two, and only under the poster exception: the hero
   strip and the footer QR's square are separate objects.

   Copy is lifted from the existing site pages — no new brand copy. */

const IM = (o) => `<span class="im${o.cls ? ' ' + o.cls : ''}" data-form="${o.form || 'strip-h'}" data-mode="${o.mode || 'full'}"${o.day ? ` data-day="${o.day}"` : ''}${o.pass ? ` data-pass="${o.pass}"` : ''}${o.swap ? ` data-swap="${o.swap}"` : ''}${o.chain ? ` data-chain="${o.chain}"` : ''}${o.days ? ` data-days="${o.days}"` : ''}${o.idle ? ` data-idle="${o.idle}"` : ''} aria-hidden="true" style="--m:${o.m || 11}px"></span>`;
const ISLOT = (id, label) => `<image-slot id="fl-${id}" shape="rect" fit="cover" placeholder="${label}"></image-slot>`;
const SLOT = (id, label, style) => `<div class="slot" style="${style || ''}">${ISLOT(id, label)}</div>`;
const BAND = (cls, inner, attrs) => `<section class="band ${cls}"${attrs || ''}><div class="band-in">${inner}</div></section>`;

const NAVLINKS = [['Events', 'events'], ['Menus', 'menus'], ['Visit', 'visit'], ['Host an event', 'host']];
const mast = (cur) => `<header class="mast"><a href="#" aria-label="REALITY"><span class="wm"></span></a>
<nav class="mast-nav">${NAVLINKS.map(([l, k]) => `<a href="#"${k === cur ? ' aria-current="page"' : ''}>${l}</a>`).join('')}</nav>
<div class="mast-act"><a class="btn btn-action btn-sm" href="#">Get the app</a><a class="ico" href="#" aria-label="WhatsApp">WA</a><a class="ico" href="#" aria-label="Instagram">IG</a><button class="ico js-theme" type="button" aria-label="Switch day or night">◐</button></div></header>`;

const ft = (square) => `<footer class="ft"><div><span class="wm"></span><p class="body-sm">86 Mai Thúc Lân, Đà Nẵng · Open daily 11:00 – 2:00</p><p class="ft-site">realitydn.com</p></div>
<nav class="ft-nav"><a href="#">Events</a><a href="#">Info</a><a href="#">Menus</a><a href="#">Visit</a><a href="#">Host an event</a><a href="#">Event guidelines</a></nav>
<div class="ft-qr">${square ? `<div class="qrcard" style="padding:12px;gap:0"><img src="assets/qr/reality-qr-ink-on-cream.png" alt="QR code to realitydn.com" style="width:104px;height:104px">${IM({ form: 'square', mode: 'full', m: 26, pass: 'A2' })}</div>` : `<img src="assets/qr/reality-qr-ink-on-cream.png" alt="QR code to realitydn.com">`}<span>realitydn.com</span></div></footer>`;

/* Titles at real length. name and qualifier are separate fields so a
   three-line name never shifts the time, the room or the link. The QUALIFIER
   IS OPTIONAL: empty renders no line and the row closes up. Three of the seven
   have none on purpose — a calendar where every event has a subtitle is not
   the calendar we have. */
const WEEK = [
  ['wed', 'Wed', '19.08.26', 'Film Club: In the Mood for Love', 'Screening + discussion, in 2E', '20:00', '2E'],
  ['thu', 'Thu', '20.08.26', 'Open Mic Night at REALITY', '', '20:00', '1L'],
  ['fri', 'Fri', '21.08.26', 'The Great Big Đà Nẵng Pub Quiz', 'Six rounds, teams up to six', '20:00', '2E'],
  ['sat', 'Sat', '22.08.26', 'Live Music: Cỏ Cây + guests', '', '21:00', '1L'],
  ['sun', 'Sun', '23.08.26', 'Life Drawing with a live model', 'Materials provided, no experience needed', '16:00', '2L'],
  ['mon', 'Mon', '24.08.26', 'Board Game Night with the REALITY library', 'Sixty-plus games on the shelf', '19:00', '2L'],
  ['tue', 'Tue', '25.08.26', 'Language Exchange · Tiếng Việt ↔ English', '', '19:00', '2E']
];
const evRow = (e) => `<article class="ev d-${e[0]}"><span class="day-spine"></span><div class="ev-when"><span class="day-plate">${e[1]}</span><span class="ev-date">${e[2]}</span></div><div class="ev-b name-block"><h3 class="name">${e[3]}</h3>${e[4] ? `<p class="ev-qual type-sub">${e[4]}</p>` : ''}</div><div class="ev-meta"><span class="ev-time">${e[5]}</span><span class="ev-room">${e[6]}</span></div><a class="ev-go" href="#">Details</a></article>`;

const QAS = [
  ['Do I need to know anyone to join events?', 'Nope! Unless marked as private, all our events welcome newcomers. Bring yourself or bring a crew.'],
  ['Can I do work here?', 'Sure! Lots of people do. We can’t always guarantee privacy or quiet, and it’s not ideal for long video calls, but we have AC and lots of outlets.'],
  ['Can I smoke here?', 'Only on the third floor patio, and only tobacco.'],
  ['Do I need to buy something to use the space?', 'Please do! We need to pay rent, employees, our landlord, etc., etc., etc.'],
  ['Can I host an event here?', 'Talk to management about your idea. If it fits our space, community, and calendar, we’ll make it happen.'],
  ['Other rules?', 'Respect guests and staff. Don’t leave kids unattended. Only tiny, leashed pets right with you. No outside food or drink unless pre-approved.']
];
const DRINKS = [
  ['Whiskey Sour', 'An important source of protein, and whiskey.', 'Jim Beam Black, Angostura, lemon, eggwhite.', '160k'],
  ['Cuba Libre', 'The original Rum + Coke, done correct.', 'Havana 3y, Coca-Cola, lime.', '95k'],
  ['Old-Fashioned', 'For when you’re feeling too little or too much.', 'Jim Beam Black, Angostura, citrus oil.', '145k'],
  ['Long Island Iced Tea', 'For getting real fucked up real quick.', 'All the alcohols + a splash of Coca-Cola.', '180k'],
  ['Mojito', 'Classic cocktail that also freshens breath.', 'Havana 3y, lime, mint, soda.', '125k'],
  ['Negroni', 'The anytime drink for every reason.', 'Tanqueray Dry, Campari, Dolin Rouge.', '165k']
];
const drRow = (d) => `<article class="dr"><div class="dr-l"><h3 class="name">${d[0]}</h3><p class="dr-t">${d[1]}</p><p class="dr-d">${d[2]}</p></div><p class="dr-p">${d[3]}</p></article>`;

/* ── pages ──────────────────────────────────────────────────────── */
const PAGES = [];

PAGES.push({
  n: 'Home', w: 1200,
  th: 'The mark’s first contact. Ink mode, because a full-mode strip on a blue field loses its blue cell and opens the silhouette. It prints before the type and hands the stagger outward (A4); the footer QR carries the square as a separate object — the only page that gets two.',
  mark: 'strip-h · ink · A4 chained pass (ink mode — the field is blue)  +  square · full · A2',
  html: () => mast('events') + `<main>` +
    BAND('b-wayfind hero', `<div class="hero-l" data-pass-scope>${IM({ form: 'strip-h', mode: 'ink', m: 13, pass: 'A4', chain: '.eyebrow,.disp,.body' })}
<p class="eyebrow">86 Mai Thúc Lân, Đà Nẵng</p>
<h1 class="disp"><span class="thin">coffee / cocktails /</span><span class="slam">community</span></h1>
<p class="body">We’re on a mission to become the easiest place in Đà Nẵng to make friends.</p>
<div class="row"><a class="btn" href="#">What’s on</a><a class="btn btn-2" href="#">Menus</a></div>
<p class="hero-hours">Open daily · 11:00 – 2:00</p></div>
<div class="hero-img slot">${ISLOT('hero', 'Room shot — main bar, evening')}</div>`) +
    BAND('b-paper', `<p class="eyebrow">What’s on</p><h2 class="h2">This week at REALITY</h2>
<div class="wk">${WEEK.map(evRow).join('')}</div>
<div class="row"><a class="btn btn-2" href="#">Add our calendar to yours</a><a class="btn btn-2" href="#">Host an event</a></div>`) +
    BAND('b-notice', `<p class="eyebrow">Notice</p><h2 class="h2">Happy hour, every day 17:00 – 19:00</h2><p class="body">House pours and draft beer at 60k. Third floor patio stays open late.</p>`) +
    BAND('b-paper', `<p class="eyebrow">Info</p><h2 class="h2">Your questions, answered</h2>
<div class="qas">${QAS.map(([q, a]) => `<article class="qa"><h3 class="h3">${q}</h3><p class="body-sm">${a}</p></article>`).join('')}</div>`) +
    BAND('b-act act', `<h2 class="disp"><span class="slam">Come find out.</span></h2><p class="body">The full calendar in your pocket — RSVP, reminders, and what’s on tonight.</p><a class="btn" href="#">Open the app</a>`) +
    BAND('b-paper', `<p class="eyebrow">Have a drink</p><h2 class="h2">Menus</h2>
<div class="mtabs"><span class="pill is-on">Cocktails</span><span class="pill">Coffee</span><span class="pill">Beer</span><span class="pill">Food</span></div>
<div class="drs">${DRINKS.map(drRow).join('')}</div><a class="btn btn-2" href="#">Download the full drinks list</a>`) +
    BAND('b-wayfind visit', `<div class="visit-l"><p class="eyebrow">Find us</p><h2 class="h2">86 Mai Thúc Lân, Đà Nẵng</h2>
<dl class="facts"><div><dt>Hours</dt><dd>Open daily · 11:00 – 2:00</dd></div><div><dt>Rooms</dt><dd>1L · 2L · 2E · 3P patio</dd></div><div><dt>Getting here</dt><dd>An Thượng, five minutes from the beach</dd></div><div><dt>Web</dt><dd>realitydn.com</dd></div></dl>
<div class="row"><a class="btn" href="#">Open in Maps</a><a class="btn btn-2" href="#">Join our WhatsApp community</a></div></div>
<div class="visit-map slot">${ISLOT('map', 'Map — 86 Mai Thúc Lân')}</div>`) +
    BAND('b-paper', `<p class="eyebrow">Gallery</p><h2 class="h2">The room, most nights</h2>
<div class="gal">${['Bar with illuminated ceiling', 'Friends with flags on faces', 'Drawing workshop at tables', 'Cocktails with citrus garnish', 'Trivia night, projected question'].map((l, i) => SLOT('g' + i, l)).join('')}</div>`) +
    `</main>` + ft(true)
});

PAGES.push({
  n: 'Events', w: 1200,
  th: 'Seven day-owned sections and one mark in the rail. Section hue (B4) re-plates the day cells as you cross a boundary — wayfinding by mood, never by state. Hover a section to trigger it.',
  mark: 'strip-v · daycode · B4 section hue',
  html: () => mast('events') + `<main>` +
    BAND('b-paper', `<p class="eyebrow">What’s on</p><h1 class="h1">The calendar</h1><p class="body" style="max-width:56ch">Every event at 86 Mai Thúc Lân. Free unless it says otherwise; buy something to keep the room open.</p>
<div class="chips"><span class="pill is-on">Everything</span><span class="pill">Games</span><span class="pill">Music</span><span class="pill">Film</span><span class="pill">Talks</span><span class="pill">Workshops</span></div>`) +
    BAND('b-paper', `<div class="ev-page" data-hue-scope>
<aside class="ev-rail">${IM({ form: 'strip-v', mode: 'daycode', day: 'wed', m: 15, swap: 'B4', pass: 'A2' })}
<span class="rail-day" data-hue-out>Wed</span><span class="rail-note">Week of 19.08 – 25.08.26</span>
<button class="js-replay" type="button">↻ Replay the pass</button></aside>
<div class="ev-days">${WEEK.map((e) => `<section class="ev-day d-${e[0]}" data-hue="${e[0]}" data-hue-label="${e[1]}">
<header class="ev-dh"><span class="day-plate">${e[1]}</span><span class="ev-dh-d">${e[2]}</span><span class="day-swatch"></span></header>
<article class="ev-card"><div class="ev-card-b"><h3 class="h3">${e[3]}</h3>${e[4] ? `<p class="body-sm type-sub">${e[4]}</p>` : ''}<dl class="facts"><div><dt>Time</dt><dd>${e[5]}</dd></div><div><dt>Room</dt><dd>${e[6]}</dd></div></dl><a class="ev-go" href="#">Details</a></div>${SLOT('ev' + e[0], e[3] + ' — poster 4:5', 'aspect-ratio:4/5')}</article></section>`).join('')}</div></div>`) +
    BAND('b-wayfind', `<p class="eyebrow">Never miss one</p><h2 class="h2">Subscribe to the calendar</h2><p class="body">Every REALITY event in your own calendar, always up to date.</p><div class="row"><a class="btn" href="#">Subscribe</a><a class="btn btn-2" href="#">Get the app</a></div>`) +
    `</main>` + ft()
});

PAGES.push({
  n: 'Event detail', w: 1200,
  th: 'A near-register page: the mark is day-coded and static. No swap runs beside copy a person is reading — recolouring next to facts looks like the UI is telling them something.',
  mark: 'strip-h · daycode (fri) · A2 quick pass, then static',
  html: () => mast('events') + `<main>` +
    BAND('b-paper', `<div class="ev-hero"><div class="ev-hero-l" data-pass-scope>${IM({ form: 'strip-h', mode: 'daycode', day: 'fri', m: 12, pass: 'A2' })}
<span class="day-plate d-fri">Fri 21.08.26</span>
<h1 class="h1">The Great Big Đà Nẵng Pub Quiz</h1><p class="body">Teams up to six. Free event — buy something to support REALITY.</p>
<dl class="facts"><div><dt>Time</dt><dd>20:00 – 22:30</dd></div><div><dt>Room</dt><dd>2E · Event space</dd></div><div><dt>Host</dt><dd>Donald</dd></div><div><dt>Last time</dt><dd>40+ people</dd></div><div><dt>Cost</dt><dd>Free</dd></div></dl>
<div class="row"><a class="btn btn-action" href="#">I’m going</a><a class="btn btn-2" href="#">Add to calendar</a></div></div>
${SLOT('poster', 'Event poster — 4:5', 'aspect-ratio:4/5')}</div>`) +
    BAND('b-notice', `<p class="eyebrow">Notice</p><h2 class="h2">Doors at 19:30, first question at 20:00</h2><p class="body">Late teams can join at the round break. Six players max per team.</p>`) +
    BAND('b-paper', `<p class="eyebrow">Also this week</p><h2 class="h2">More at REALITY</h2><div class="wk">${WEEK.slice(3, 6).map(evRow).join('')}</div>`) +
    BAND('b-act act', `<h2 class="disp"><span class="slam">See you Friday.</span></h2><p class="body">RSVP in the app and we’ll remind you an hour before.</p><a class="btn" href="#">Open the app</a>`) +
    `</main>` + ft()
});

PAGES.push({
  n: 'Menus', w: 1200,
  th: 'The nearest register on the site. One short strip on the section rule, single-plate pass (A3) — at that module the field cells cannot sequence without smearing. Majors, not ink: the short field is the neutral pair, and ink mode would put stock on the outer end where it vanishes into the paper.',
  mark: 'strip-short-h · majors · A3 single plate',
  html: () => mast('menus') + `<main>` +
    BAND('b-paper', `<div class="menu-h" data-pass-scope>${IM({ form: 'strip-short-h', mode: 'majors', m: 10, pass: 'A3' })}<div><p class="eyebrow">Have a drink</p><h1 class="h1">Menus</h1></div></div>
<div class="mtabs"><span class="pill is-on">Cocktails</span><span class="pill">Coffee</span><span class="pill">Beer</span><span class="pill">Food</span></div>
<div class="drs">${DRINKS.map(drRow).join('')}</div>`) +
    BAND('b-notice', `<p class="eyebrow">Deal</p><h2 class="h2">Happy hour 17:00 – 19:00</h2><p class="body">House pours and draft at 60k, every day. Third floor patio stays open late.</p>`) +
    BAND('b-paper', `<p class="eyebrow">Coffee</p><h2 class="h2">All day, from 11:00</h2>
<div class="drs">${[['Cà phê sữa đá', 'The reason you got up.', 'Robusta, condensed milk, ice.', '45k'], ['Americano', 'Black, long, honest.', 'House espresso, water.', '50k'], ['Cold brew', 'Sixteen hours of patience.', 'Single origin, no sugar.', '65k'], ['Cappuccino', 'Foam you can stand a spoon in.', 'House espresso, milk.', '60k']].map(drRow).join('')}</div>
<dl class="facts" style="max-width:640px"><div><dt>Kitchen</dt><dd>Till 23:00</dd></div><div><dt>Bar</dt><dd>Till 02:00</dd></div><div><dt>Order</dt><dd>At the bar, or call staff in the app</dd></div></dl>`) +
    BAND('b-paper', `<p class="eyebrow">Take it with you</p><h2 class="h2">The full list</h2><div class="row"><a class="btn btn-2" href="#">Download the drinks list</a><a class="btn btn-2" href="#">Food menu</a></div>`) +
    `</main>` + ft()
});

PAGES.push({
  n: 'Visit', w: 1200,
  th: 'A square, not a strip — the QR is a square frame and the code’s four-module quiet zone is already stock, so the mark butts flush against it. Quick pass on arrival.',
  mark: 'square · full · A2 quick pass, butted to the QR',
  html: () => mast('visit') + `<main>` +
    BAND('b-wayfind', `<div class="visit-l"><p class="eyebrow">Find us</p><h1 class="h1">86 Mai Thúc Lân</h1><p class="body">An Thượng, five minutes from the beach. Three floors, four rooms, one patio.</p>
<dl class="facts"><div><dt>Hours</dt><dd>Open daily · 11:00 – 2:00</dd></div><div><dt>Rooms</dt><dd>1L · 2L · 2E · 3P patio</dd></div><div><dt>Phone</dt><dd>+84 000 000 000</dd></div><div><dt>Web</dt><dd>realitydn.com</dd></div></dl>
<div class="row"><a class="btn" href="#">Open in Maps</a><a class="btn btn-2" href="#">Join our WhatsApp community</a></div></div>
<div class="visit-map slot">${ISLOT('map2', 'Map — An Thượng, Đà Nẵng')}</div>`) +
    BAND('b-paper', `<p class="eyebrow">The rooms</p><h2 class="h2">What is where</h2>
<div class="rooms">${[['1L', 'Ground floor lounge', 'Bar, street tables, most nights'], ['2L', 'Second floor lounge', 'Quiet-ish, games shelf, workshops'], ['2E', 'Event space', 'Quiz, film, talks — seats 40'], ['3P', 'Patio', 'Open late, the only place to smoke']].map(([k, n, d]) => `<article class="room"><span class="room-k">${k}</span><h3 class="h3">${n}</h3><p class="body-sm">${d}</p></article>`).join('')}</div>`) +
    BAND('b-paper', `<div class="visit-qr" data-pass-scope><div><p class="eyebrow">Take us with you</p><h2 class="h2">realitydn.com</h2><p class="body" style="max-width:44ch">The calendar, the menus and the app, all from one code. Point a camera at it.</p></div>
<div class="qrcard"><img src="assets/qr/reality-qr-ink-on-cream.png" alt="QR code to realitydn.com">${IM({ form: 'square', mode: 'full', m: 42, pass: 'A2' })}</div></div>`) +
    BAND('b-paper', `<p class="eyebrow">Info</p><h2 class="h2">Your questions, answered</h2><div class="qas">${QAS.map(([q, a]) => `<article class="qa"><h3 class="h3">${q}</h3><p class="body-sm">${a}</p></article>`).join('')}</div>`) +
    `</main>` + ft()
});

PAGES.push({
  n: 'Host an event', w: 1200,
  th: 'A working page: majors mode, quick pass, no swap. Red appears once, on the one ACTION — the proposal.',
  mark: 'strip-h · majors · A2 quick pass',
  html: () => mast('host') + `<main>` +
    BAND('b-paper', `<div class="menu-h" data-pass-scope>${IM({ form: 'strip-h', mode: 'majors', m: 12, pass: 'A2' })}<div><p class="eyebrow">Host an event</p><h1 class="h1">Bring us your idea</h1></div></div>
<p class="body" style="max-width:60ch">If it fits our space, our community and our calendar, we’ll make it happen. Here’s how it goes.</p>
<div class="steps"><div class="step"><h3 class="h3">Tell us the idea</h3><p class="body-sm">What it is, who it’s for, how long it runs, what you need from the room.</p></div><div class="step"><h3 class="h3">We find a night</h3><p class="body-sm">We check the calendar and the room, and come back with a date and a room code.</p></div><div class="step"><h3 class="h3">We make the poster</h3><p class="body-sm">You get artwork, a listing on the site and the app, and a spot in the week.</p></div></div>`) +
    BAND('b-notice', `<p class="eyebrow">Before you write</p><h2 class="h2">We can’t host ticketed sales, MLM, or anything that needs the room closed</h2><p class="body">Everything else is a conversation.</p>`) +
    BAND('b-paper', `<p class="eyebrow">Event guidelines</p><h2 class="h2">The rules, all of them</h2>
<div class="rules">${[['Free to attend, unless we agreed otherwise. People buy drinks; that pays for the room.', 'The room stays public'], ['You run it, we host it. Bring your own materials and your own host.', 'You’re the host'], ['Start on time, end on time. 2E turns over at 22:30 most nights.', 'Time is the shared resource'], ['No outside food or drink unless pre-approved.', 'Bar and kitchen are ours'], ['We photograph events. Tell us if that’s a problem and we’ll work around it.', 'Photos happen']].map(([d, t], i) => `<div class="rule-i"><span class="rule-n">${String(i + 1).padStart(2, '0')}</span><div><h3 class="h3">${t}</h3><p class="body-sm">${d}</p></div></div>`).join('')}</div>`) +
    BAND('b-paper', `<p class="eyebrow">Propose it</p><h2 class="h2">Tell us what you want to run</h2>
<div class="form"><div class="field"><label>Your name</label><span class="in"></span></div><div class="field"><label>WhatsApp or email</label><span class="in"></span></div><div class="field"><label>Event name</label><span class="in"></span></div><div class="field"><label>Preferred night</label><span class="in"></span></div><div class="field wide"><label>What happens in the room</label><span class="in" style="min-height:120px;display:block"></span></div></div>
<a class="btn btn-action" href="#">Send the proposal</a>`) +
    BAND('b-act act', `<h2 class="disp"><span class="slam">We answer in a day or two.</span></h2><p class="body">If it’s time-sensitive, come find us at the bar.</p><a class="btn" href="#">Message us on WhatsApp</a>`) +
    `</main>` + ft()
});

/* ── popups ─────────────────────────────────────────────────────── */
const ctx = (inner) => `<div class="ctx">${mast('events')}${inner}</div>`;
const ctxList = () => BAND('b-paper', `<p class="eyebrow">What’s on</p><h2 class="h2">This week at REALITY</h2><div class="wk">${WEEK.slice(0, 4).map(evRow).join('')}</div>`);

const POPS = [];

POPS.push({
  n: 'Mobile nav', w: 390, h: 780,
  th: 'The drawer is the whole surface, so it takes the page’s one mark: quick pass on open, and the pass belongs to the drawer, not the masthead behind it.',
  mark: 'strip-h · full · A2',
  html: () => `<div class="stack ph" data-theme-scope data-theme="light" data-screen-label="Mobile nav">
<header class="mast mast-m"><a href="#" aria-label="REALITY"><span class="wm"></span></a><div class="mast-act"><button class="ico" type="button" aria-label="Menu">≡</button></div></header>${ctxList()}
<div class="scrim"></div>
<div class="plate drawer" data-pass-scope><div class="plate-h"><span class="wm" style="width:132px"></span><span class="x">✕</span></div>
<div class="plate-b" style="gap:22px">${IM({ form: 'strip-h', mode: 'full', m: 13, pass: 'A2' })}
<nav class="drawer-nav">${['Events', 'Menus', 'Visit', 'Host an event', 'Event guidelines'].map((l) => `<a href="#">${l}<span class="go">→</span></a>`).join('')}</nav>
<div class="row" style="width:100%"><a class="btn btn-action" href="#" style="flex:1">Get the app</a></div>
<div class="row"><a class="ico" href="#">WA</a><a class="ico" href="#">IG</a><button class="ico js-theme" type="button">◐</button></div>
<p class="body-sm">86 Mai Thúc Lân · Open daily 11:00 – 2:00</p></div></div></div>`
});

POPS.push({
  n: 'Subscribe to the calendar', w: 900, h: 640,
  th: 'A dialog is a surface: it gets its own quick pass in the plate header. Blue is spent on the route out, not on the plate.',
  mark: 'strip-h · majors · A2',
  html: () => `<div class="stack" data-theme-scope data-theme="light" data-screen-label="Subscribe dialog">${ctx(ctxList())}
<div class="scrim"></div>
<div class="plate dlg" data-pass-scope><div class="plate-h"><span class="t">Subscribe</span><span class="x">✕</span></div>
<div class="plate-b">${IM({ form: 'strip-h', mode: 'majors', m: 9, pass: 'A2' })}
<h2 class="h2">Every REALITY event, in your own calendar</h2>
<p class="body-sm">One link, always up to date. Cancellations and room changes come through automatically.</p>
<div class="chips"><span class="pill is-on">Google</span><span class="pill">Apple</span><span class="pill">Outlook</span><span class="pill">.ics link</span></div>
<dl class="facts" style="--dt:96px"><div><dt>Updates</dt><dd>Hourly</dd></div><div><dt>Includes</dt><dd>All public events, all rooms</dd></div></dl></div>
<div class="plate-f"><a class="btn" href="#">Add the calendar</a><a class="btn btn-2" href="#">Copy the link</a></div></div></div>`
});

POPS.push({
  n: 'RSVP', w: 900, h: 660,
  th: 'The one ACTION on the surface is red, and the mark stays out of it: day-coded, static, sitting with the facts. No swap next to a decision.',
  mark: 'strip-h · daycode (fri) · A2, then static',
  html: () => `<div class="stack" data-theme-scope data-theme="light" data-screen-label="RSVP dialog">${ctx(ctxList())}
<div class="scrim"></div>
<div class="plate dlg" data-pass-scope><div class="plate-h"><span class="t">The Great Big Đà Nẵng Pub Quiz · Fri 21.08</span><span class="x">✕</span></div>
<div class="plate-b">${IM({ form: 'strip-h', mode: 'daycode', day: 'fri', m: 9, pass: 'A2' })}
<h2 class="h2">You’re going</h2><p class="body-sm">We’ll remind you before it starts. Teams up to six; come early if you want a good table.</p>
<div><p class="eyebrow" style="margin-bottom:10px">Remind me</p><div class="chips"><span class="pill is-on">1h before</span><span class="pill">2h</span><span class="pill">1 day</span><span class="pill">Don’t</span></div></div>
<dl class="facts" style="--dt:96px"><div><dt>Room</dt><dd>2E · Event space</dd></div><div><dt>Going</dt><dd>41 so far</dd></div></dl></div>
<div class="plate-f"><a class="btn btn-action" href="#">I’m going</a><a class="btn btn-2" href="#">Go anonymously</a></div></div></div>`
});

POPS.push({
  n: 'Gallery lightbox', w: 900, h: 640,
  th: 'An ink plate over an ink scrim, so the mark would land on its own field — it doesn’t appear at all. Photography is the subject; the mark stays off it.',
  mark: 'none — the photo is the surface',
  html: () => `<div class="stack" data-theme-scope data-theme="light" data-screen-label="Lightbox">${ctx(BAND('b-paper', `<p class="eyebrow">Gallery</p><h2 class="h2">The room, most nights</h2><div class="gal">${['Bar with illuminated ceiling', 'Friends with flags on faces', 'Drawing workshop'].map((l, i) => SLOT('lb' + i, l)).join('')}</div>`))}
<div class="scrim lit"></div>
<div class="plate lbx"><div class="frame">${SLOT('lbmain', 'Photo — the room, Friday night', 'position:absolute;inset:0;border:0')}</div>
<div class="cap"><span>Friday, 2E · quiz night from the back of the room</span><span class="n">04 / 26</span><span class="arrows"><span>←</span><span>→</span></span></div></div></div>`
});

POPS.push({
  n: 'Community join', w: 900, h: 660,
  th: 'The square again, butted to the code — a QR is a square frame, so the strip never goes here. This is the one popup that carries a mark at full mode.',
  mark: 'square · full · A2, butted to the QR',
  html: () => `<div class="stack" data-theme-scope data-theme="light" data-screen-label="Community join">${ctx(ctxList())}
<div class="scrim"></div>
<div class="plate dlg" data-pass-scope><div class="plate-h"><span class="t">Join the community</span><span class="x">✕</span></div>
<div class="plate-b" style="flex-direction:row;align-items:flex-start;gap:24px">
<div style="display:flex;flex-direction:column;gap:12px;align-items:flex-start"><h2 class="h2">Scan to join the WhatsApp group</h2><p class="body-sm">Event announcements, last-minute changes, and whoever is at the bar tonight.</p><dl class="facts" style="--dt:88px"><div><dt>Members</dt><dd>600+</dd></div><div><dt>Rules</dt><dd>Be normal</dd></div></dl></div>
<div class="qrcard" style="flex:none;padding:14px"><img src="assets/qr/reality-qr-ink-on-cream.png" alt="QR" style="width:132px;height:132px">${IM({ form: 'square', mode: 'full', m: 33, pass: 'A2' })}</div></div>
<div class="plate-f"><a class="btn" href="#">Open WhatsApp</a><a class="btn btn-2" href="#">Copy the invite</a></div></div></div>`
});

POPS.push({
  n: 'Banners & toast', w: 900, h: 640,
  th: 'The two states that are not dialogs. Yellow is a notice and carries ink; the toast is an ink plate and carries no colour at all. Neither takes a mark — they are not surfaces, they are sentences.',
  mark: 'none',
  html: () => `<div class="stack" data-theme-scope data-theme="light" data-screen-label="Banners and toast">
<div class="ctx"><div class="banner">Tonight’s Film Club has moved to 2E<span class="sp">See the change</span></div>${mast('events')}${ctxList()}</div>
<div class="toast is-site"><span class="t">Calendar link copied</span><span class="a">Undo</span></div></div>`
});

/* ── canvas ─────────────────────────────────────────────────────── */
function frame(o, i, kind) {
  const f = document.createElement('div');
  f.className = 'cv-frame';
  f.setAttribute('data-frame', '');
  f.style.width = o.w + 'px';
  f.innerHTML = `<div class="cv-label"><span class="cv-num">${kind}${String(i + 1).padStart(2, '0')}</span><div><h4>${o.n}</h4><p>${o.th}</p><p class="cv-mark">${o.mark}</p></div></div>
<div class="pageframe tr" data-theme-scope data-theme="light" data-screen-label="${kind}${String(i + 1).padStart(2, '0')} ${o.n}"${o.h ? ` style="height:${o.h}px;overflow:hidden"` : ''}>${o.html()}</div>`;
  return f;
}
function boot() {
  const GAP = 150, PAD = 80;
  let x = PAD;
  const row1 = PAGES.map((p, i) => frame(p, i, 'P'));
  row1.forEach((f) => { f.style.left = x + 'px'; f.style.top = PAD + 'px'; x += parseFloat(f.style.width) + GAP; document.body.appendChild(f); });
  const w1 = x;
  const settle = () => {
    /* bail if a host sheet has replaced these frames — a detached node
       measures 0 and would clobber a correct extent set by that sheet */
    if (!row1.length || !row1[0].isConnected) return;
    const top2 = PAD + Math.max(...row1.map((f) => f.offsetHeight)) + 190;
    let x2 = PAD;
    row2.forEach((f) => { f.style.left = x2 + 'px'; f.style.top = top2 + 'px'; x2 += parseFloat(f.style.width) + GAP; });
    document.body.style.width = Math.max(w1, x2) + PAD + 'px';
    document.body.style.height = top2 + Math.max(...row2.map((f) => f.offsetHeight)) + 200 + 'px';
  };
  const row2 = POPS.map((p, i) => frame(p, i, 'X'));
  row2.forEach((f) => document.body.appendChild(f));
  settle();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(settle);
  setTimeout(settle, 600);
  if (window.renderInkMarks) window.renderInkMarks();
  if (window.InkMotion) window.InkMotion.wire(document);
}
window.SITE_PAGES = PAGES;
window.SITE_POPS = POPS;
document.addEventListener('DOMContentLoaded', boot);
