/* REALITY — Vietnamese at real length. A STRESS TEST, not copy.

   Donald writes all copy and all translations. Every Vietnamese string
   below is a test fixture chosen for its typographic properties, not a
   translation to ship: long compounds, stacked diacritics on uppercase,
   proper names that must keep their own capitalisation, and the ↔ / ·
   separators the calendar actually uses.

   What this sheet is checking, per token:
     type.vietnamese.lineHeight     1.3 on uppercase VI
     type.vietnamese.displayWeight  200 under :lang(vi) at display size
     type.vietnamese.properNames    never uppercased or normalised
     type.vietnamese.diacritics     never stripped
     type.floor.informational       12px holds after VI runs longer
   Rule of thumb VI runs 15–30% longer than EN and stacks vertically. */
(function () {
  const A = window.APP;
  const { sbar, hd, sub, nav, band, im } = A;

  /* the same seven events, VI titles at real length. Fixtures. */
  const WEEK_VI = [
    ['wed', 'Th 4', '19.08', 'Câu lạc bộ Điện ảnh: Tâm trạng khi yêu', 'Buổi chiếu và thảo luận, tại phòng 2E', '20:00', '2E'],
    ['thu', 'Th 5', '20.08', 'Đêm nhạc Mở — ai cũng lên hát được', '', '20:00', '1L'],
    ['fri', 'Th 6', '21.08', 'Đại hội Đố vui Đà Nẵng', 'Sáu vòng, mỗi đội tối đa sáu người', '20:00', '2E'],
    ['sat', 'Th 7', '22.08', 'Nhạc sống: Cỏ Cây và những người bạn', '', '21:00', '1L'],
    ['sun', 'CN', '23.08', 'Vẽ người thật với người mẫu tại chỗ', 'Có sẵn dụng cụ, không cần kinh nghiệm', '16:00', '2L'],
    ['mon', 'Th 2', '24.08', 'Đêm Board Game với thư viện của REALITY', 'Hơn sáu mươi trò trên giá', '19:00', '2L'],
    ['tue', 'Th 3', '25.08', 'Giao lưu ngôn ngữ · Tiếng Việt ↔ English', '', '19:00', '2E']
  ];
  const rows = (list, cls) => `<div class="rows rows-ev ${cls || ''}">${list.map(([d, dy, dt, n, q, tm, rm]) =>
    `<article class="r r-ev d-${d}"><span class="day-spine"></span><span class="r-when"><span class="day-plate">${dy}</span><span class="r-dt">${dt}</span></span><span class="r-b name-block"><span class="r-n">${n}</span>${q ? `<span class="type-sub">${q}</span>` : ''}<span class="r-m">${tm} · ${rm}</span></span><span class="r-go">→</span></article>`).join('')}</div>`;

  window.APP_VI = [
    { id: 'vi-cal', k: 'phone', lang: 'vi', n: 'Calendar · Vietnamese', mark: 'strip-h · majors · A2',
      th: 'The load case. Every title is longer than its English twin and two wrap to three lines. The day plate goes Th 2 – CN, which is WIDER than Mon–Sun, so the when-column is sized for VI and English simply has room to spare — never the other way round.',
      html: () => sbar() + hd('Th 8 2026') + band('b-paper', `${im({ form: 'strip-h', mode: 'majors', m: 9, pass: 'A2' })}<p class="eyebrow">Tuần này</p><h1 class="h2">Sắp diễn ra tại REALITY</h1>${rows(WEEK_VI)}`) + nav('calendar') },

    { id: 'vi-disp', k: 'phone', lang: 'vi', n: 'Display type · uppercase VI', mark: 'strip-h · daycode (fri) · A2, idle off',
      th: 'The case the tokens exist for. Uppercase Vietnamese stacks diacritics above cap height, so line-height goes to 1.3 and display weight drops to 200 — at weight 100 the hairline strokes on Đ, Ố and ậ disappear, and at 1.05 they clip into the line above.',
      html: () => sbar() + sub('Sự kiện') + band('b-paper', `<span class="day-plate d-fri">Th 6 · 21.08.26</span>${im({ form: 'strip-h', mode: 'daycode', day: 'fri', m: 9, pass: 'A2', idle: 'off' })}
<h1 class="disp disp-sm ev-title"><span class="slam">Đại hội Đố vui Đà Nẵng</span></h1><p class="type-sub">Sáu vòng, mỗi đội tối đa sáu người</p>
<dl class="facts" style="--dt:104px"><div><dt>Giờ</dt><dd>20:00 – 22:30</dd></div><div><dt>Phòng</dt><dd>2E · Không gian sự kiện</dd></div><div><dt>Chủ trì</dt><dd>Donald</dd></div><div><dt>Giá</dt><dd>Miễn phí</dd></div></dl>
<div class="row"><a class="btn btn-action" href="#">Tôi sẽ tham gia</a></div>`) + nav('calendar') },

    { id: 'vi-mixed', k: 'phone', lang: 'vi', n: 'Mixed VI / EN', mark: 'strip-short-h · ink · A3',
      th: 'What the room is actually like. Proper names keep their own capitalisation inside Vietnamese sentences — REALITY, Board Game, Cỏ Cây, English — so no string can be run through a blanket text-transform. The uppercase is on the CONTAINER, never the data.',
      html: () => sbar() + hd('Th 8 2026') + band('b-paper', `${im({ form: 'strip-short-h', mode: 'ink', m: 8, pass: 'A3' })}<p class="eyebrow">Tuần này · This week</p><h1 class="h2">Sắp diễn ra</h1>
${rows([WEEK_VI[5], WEEK_VI[6], WEEK_VI[1]])}
<p class="body-sm">Tên riêng giữ nguyên cách viết: REALITY, Cỏ Cây, Board Game, English.</p>`) + nav('calendar') },

    { id: 'vi-far', k: 'tv', lang: 'vi', n: 'Big screen · Vietnamese', theme: 'dark', mark: 'strip-h · full · B3 ladder',
      th: 'The far register, where the diacritic problem is worst: caps, display size, and read from the back of 2E. Weight 200 and line-height 1.3 together are the only reason the marks above the caps survive. Nothing here is set tighter than the English version — VI sets the floor.',
      html: () => `<section class="band b-paper tv-q">
<div style="display:flex;justify-content:space-between;align-items:baseline;gap:24px"><p class="eyebrow" style="font-size:18px">Vòng 2 · Câu 4</p><span class="timer-t" style="font-size:40px">0:24</span></div>
<h1 class="disp" style="font-size:44px">Cầu nào KHÔNG bắc qua sông Hàn?</h1>
<div class="tv-ans"><div><span>A</span>Thuận Phước</div><div><span>B</span>Trần Thị Lý</div><div><span>C</span>Cầu Vàng</div><div><span>D</span>Cầu Rồng</div></div>
</section>
<div class="tv-foot"><span class="wm"></span><span>Đố vui · Th 6 21.08</span>${im({ form: 'strip-h', mode: 'full', m: 11, swap: 'B3' })}<span>realitydn.com</span></div>` },

    { id: 'vi-overflow', k: 'phone', lang: 'vi', n: 'Overflow · the worst case', mark: 'none — nothing to celebrate',
      th: 'Deliberately past the limit: the longest plausible VI title, an unbreakable proper name, and a qualifier that also runs long. The name wraps to four lines and the row still holds — time, room and arrow have not moved. This is the row Code should test against, not the tidy one.',
      html: () => sbar() + hd('Th 8 2026') + band('b-paper', `<p class="eyebrow">Trường hợp xấu nhất</p>${rows([
        ['wed', 'Th 4', '19.08', 'Câu lạc bộ Điện ảnh Đà Nẵng trình chiếu: Tâm trạng khi yêu (bản phục chế 4K)', 'Buổi chiếu có thảo luận sau phim, tại phòng 2E trên tầng hai', '20:00', '2E'],
        ['sun', 'CN', '23.08', 'Workshop vẽ ký họa chân dung người thật', '', '16:00', '2L']
      ], 'is-stress')}
<p class="body-sm">Tên dài nhất xuống bốn dòng. Giờ, phòng và mũi tên không di chuyển.</p>`) + nav('calendar') }
  ];
})();
