/* REALITY app — the states nobody designs until they ship broken.
   Empty, loading, error, offline, permission-denied, end-of-list.

   The system rule that decides all of them: a state is a FACT, not a mood.
   No illustration, no shrug emoji, no apologetic tone. An ink plate says
   what is true and offers exactly one way out.

   Skeletons use --surface-2 / --paper-shade — the two shades of unprinted
   stock. This is precisely the case CLAUDE.md warns about: collapse those
   onto --bg and every skeleton on this page becomes invisible in Day. */
(function () {
  const A = window.APP;
  const { sbar, hd, sub, nav, band, im } = A;

  /* a skeleton row mirrors the real .r-ev geometry so nothing jumps on load */
  const sk = (w) => `<span class="sk" style="width:${w}"></span>`;
  const skRow = () => `<article class="r r-ev is-sk"><span class="r-when">${sk('42px')}${sk('30px')}</span><span class="r-b name-block">${sk('92%')}${sk('64%')}${sk('40%')}</span></article>`;

  /* the one shape every state shares */
  const state = (o) => `<div class="st">
${o.mark ? im({ form: 'strip-short-h', mode: 'ink', m: 8, pass: 'A3', idle: 'off' }) : ''}
<h2 class="st-t">${o.t}</h2>
<p class="st-b">${o.b}</p>
${o.facts ? `<dl class="facts" style="--dt:96px">${o.facts.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>` : ''}
${o.act ? `<div class="row">${o.act.map((a, i) => `<a class="btn${i ? ' btn-2' : ''}" href="#">${a}</a>`).join('')}</div>` : ''}
</div>`;

  window.APP_STATES = [
    { id: 'st-load', k: 'phone', n: 'Loading · calendar', mark: 'none — a mark cannot stamp on a surface that has no content yet',
      th: 'Skeletons at the exact geometry of the real rows, so nothing moves when data lands. They are --surface-2 blocks: on a site that collapsed --surface-2 onto --bg this screen renders as a blank page, which is the pre-audit bug in the wild.',
      html: () => sbar() + hd('Aug 2026') + band('b-paper', `<p class="eyebrow">This week</p><h1 class="h2">Upcoming at REALITY</h1><div class="rows rows-ev">${[0, 1, 2, 3, 4].map(skRow).join('')}</div>`) + nav('calendar') },

    { id: 'st-empty', k: 'phone', n: 'Empty · no events', mark: 'strip-short-h · ink · A3',
      th: 'A quiet week is not an error and does not apologise. It states the fact, gives the next real date, and offers the one action that fixes it — propose something.',
      html: () => sbar() + hd('Aug 2026') + band('b-paper', `<p class="eyebrow">This week</p><h1 class="h2">Upcoming at REALITY</h1>` +
        state({ mark: 1, t: 'Nothing on the calendar this week', b: 'The bar is open as usual — 11:00 to 02:00, every day. The kitchen runs till 23:00.', facts: [['Next event', 'Fri 28.08 · 20:00'], ['Open', 'Daily 11:00 – 02:00']], act: ['Jump to next week', 'Propose an event'] })) + nav('calendar') },

    { id: 'st-empty-filter', k: 'phone', n: 'Empty · filtered to nothing', mark: 'none — the filter chips are the subject',
      th: 'The other empty. The filters stay visible and stay on, because the user has to see what they did to get here; the way out is removing a filter, not a generic retry.',
      html: () => sbar() + hd('Aug 2026') + band('b-paper', `<p class="eyebrow">This week</p><div class="chips"><span class="pill">Everything</span><span class="pill is-on">Film</span><span class="pill is-on">Workshops</span><span class="pill">Music</span></div>` +
        state({ t: 'No film or workshop events this week', b: 'There are five other events on. Clear a filter to see them.', act: ['Clear filters', 'Show everything'] })) + nav('calendar') },

    { id: 'st-err', k: 'phone', n: 'Error · load failed', mark: 'none — nothing to celebrate',
      th: 'Failure gets an ink plate, not red: red is the imperative, and a failed fetch is not commanding anything. The retry is the ACTION. The technical line stays, quietly, because staff read these over the bar.',
      html: () => sbar() + hd('Aug 2026') + band('b-paper', `<p class="eyebrow">This week</p><h1 class="h2">Upcoming at REALITY</h1>` +
        state({ t: 'Couldn’t load the calendar', b: 'The app reached the network but the calendar didn’t answer. Nothing is wrong with your phone.', facts: [['Last updated', 'Today, 18:42'], ['Reference', 'CAL-504']], act: ['Try again', 'Show what I had'] })) + nav('calendar') },

    { id: 'st-offline', k: 'phone', n: 'Offline · cached', mark: 'strip-h · ink · A2, idle off',
      th: 'Offline is a banner and not a takeover, because the cached calendar is genuinely useful. Yellow with ink on it — a notice, in the major that carries notices. Every row is still readable; only the freshness is qualified.',
      html: () => `<div class="banner">Offline — showing tonight’s cached calendar<span class="sp">Retry</span></div>` + sbar() + hd('Aug 2026') +
        band('b-paper', `${im({ form: 'strip-h', mode: 'ink', m: 9, pass: 'A2', idle: 'off' })}<p class="eyebrow">Cached · last updated 18:42</p><h1 class="h2">Upcoming at REALITY</h1>${A.weekRows()}`) + nav('calendar') },

    { id: 'st-stale', k: 'phone', n: 'Stale · event may have changed', mark: 'none — beside a decision',
      th: 'The state that matters most in practice: the guest is looking at an event detail the app can no longer verify. It does not hide the content and it does not let the RSVP look safe — the ACTION drops to secondary until the data is fresh.',
      html: () => `<div class="banner is-ink">Couldn’t check for changes<span class="sp">Refresh</span></div>` + sbar() + sub('Event') +
        band('b-paper', `<span class="day-plate d-fri">Fri 21.08.26</span><h1 class="disp disp-sm ev-title"><span class="slam">The Great Big Đà Nẵng Pub Quiz</span></h1><p class="type-sub">Six rounds, teams up to six</p>
<dl class="facts" style="--dt:96px"><div><dt>Time</dt><dd>20:00 · as of 18:42</dd></div><div><dt>Room</dt><dd>2E</dd></div><div><dt>Checked</dt><dd>2 hours ago</dd></div></dl>
<div class="row"><a class="btn btn-2" href="#">Refresh, then RSVP</a></div><p class="body-sm">Rooms and times move. We’ll enable the RSVP once we can confirm this one.</p>`) + nav('calendar') },

    { id: 'st-denied', k: 'phone', n: 'Permission denied · notifications', mark: 'none',
      th: 'The user said no to the system prompt, which we cannot re-ask. So this states what they lose, and routes to the only place that can undo it — the OS. No nagging, no second modal.',
      html: () => sbar() + sub('Notifications') + band('b-paper',
        state({ t: 'Notifications are off', b: 'You turned these off in your phone’s settings, so we can’t send reminders for events you’ve RSVP’d to.', facts: [['Affects', '3 upcoming RSVPs'], ['Fix', 'Phone settings → REALITY']], act: ['Open settings', 'Keep them off'] })) + nav('you') },

    { id: 'st-end', k: 'phone', n: 'End of list · past events', mark: 'strip-short-h · ink · A3',
      th: 'The bottom of an infinite list is a state too. Past events grey to --fg-faint (.56 in Day, which is the corrected value and the reason it is still readable here), and the list terminates with a fact instead of a spinner that never resolves.',
      html: () => sbar() + sub('Past events') + band('b-paper', `<p class="eyebrow">Earlier</p><div class="rows rows-ev is-past">
${[['fri', 'Fri', '14.08', 'The Great Big Đà Nẵng Pub Quiz', '', '20:00', '2E'], ['wed', 'Wed', '12.08', 'Film Club: Perfect Days', 'Screening + discussion', '20:00', '2E'], ['sun', 'Sun', '09.08', 'Life Drawing with a live model', '', '16:00', '2L']].map(([d, dy, dt, n, q, tm, rm]) => `<article class="r r-ev d-${d}"><span class="day-spine"></span><span class="r-when"><span class="day-plate">${dy}</span><span class="r-dt">${dt}</span></span><span class="r-b name-block"><span class="r-n">${n}</span>${q ? `<span class="type-sub">${q}</span>` : ''}<span class="r-m">${tm} · ${rm}</span></span><span class="r-go">→</span></article>`).join('')}</div>
<div class="st st-end">${im({ form: 'strip-short-h', mode: 'ink', m: 8, pass: 'A3', idle: 'off' })}<p class="st-b">That’s everything we have. The app keeps six months.</p></div>`) + nav('calendar') }
  ];
})();
