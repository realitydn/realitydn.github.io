/* REALITY icon exploration — one core glyph set, three style treatments.
   Glyphs are authored once as simple geometric primitives (the brand is
   hard-edged + geometric, so icons stay primitive). A `linear` flag marks
   strokes that must stay strokes even in solid mode. */

// ---- core glyph geometry · 24×24 viewBox ----
const GLYPHS = {
  home: [
    { t: 'path', d: 'M3.5 11 L12 3.5 L20.5 11 V20.5 H3.5 Z' },
  ],
  live: [ { t: 'poly', points: '7 4.5 7 19.5 19.5 12' } ],
  scan: [
    { t: 'path', d: 'M4 8.5 V4 H8.5', linear: true },
    { t: 'path', d: 'M15.5 4 H20 V8.5', linear: true },
    { t: 'path', d: 'M4 15.5 V20 H8.5', linear: true },
    { t: 'path', d: 'M20 15.5 V20 H15.5', linear: true },
    { t: 'line', x1: 5, y1: 12, x2: 19, y2: 12, linear: true },
  ],
  leaders: [
    { t: 'rect', x: 4, y: 13, w: 4, h: 7 },
    { t: 'rect', x: 10, y: 9, w: 4, h: 11 },
    { t: 'rect', x: 16, y: 5, w: 4, h: 15 },
  ],
  music: [
    { t: 'ellipse', cx: 9.5, cy: 17, rx: 3, ry: 2.4 },
    { t: 'line', x1: 12.5, y1: 16.6, x2: 12.5, y2: 5, linear: true },
    { t: 'poly', points: '12.5 5 19.5 7 19.5 10.5 12.5 8.5' },
  ],
  calendar: [
    { t: 'rect', x: 4, y: 5.5, w: 16, h: 14.5, linear: true },
    { t: 'line', x1: 4, y1: 10, x2: 20, y2: 10, linear: true },
    { t: 'line', x1: 8, y1: 3.5, x2: 8, y2: 6.5, linear: true },
    { t: 'line', x1: 16, y1: 3.5, x2: 16, y2: 6.5, linear: true },
    { t: 'rect', x: 7, y: 13, w: 3.2, h: 3.2 },
  ],
  user: [
    { t: 'ellipse', cx: 12, cy: 8.5, rx: 3.7, ry: 3.7 },
    { t: 'poly', points: '5.5 20 6.8 14.5 17.2 14.5 18.5 20' },
  ],
  drink: [
    { t: 'poly', points: '5 6 19 6 12 13.5' },
    { t: 'line', x1: 12, y1: 13.5, x2: 12, y2: 19, linear: true },
    { t: 'line', x1: 8, y1: 19.5, x2: 16, y2: 19.5, linear: true },
    { t: 'ellipse', cx: 13.6, cy: 8.4, rx: 1.05, ry: 1.05 },
  ],
  check: [ { t: 'path', d: 'M4.5 12.5 L9.5 17.5 L19.5 6.5', linear: true } ],
  alert: [
    { t: 'line', x1: 12, y1: 4.5, x2: 12, y2: 14, linear: true },
    { t: 'rect', x: 10.8, y: 17, w: 2.4, h: 2.4 },
  ],
  info: [
    { t: 'rect', x: 10.9, y: 5, w: 2.2, h: 2.2 },
    { t: 'line', x1: 12, y1: 10, x2: 12, y2: 19, linear: true },
  ],
  bell: [
    { t: 'path', d: 'M6 17 V11 a6 6 0 0 1 12 0 V17 H6 Z', linear: true },
    { t: 'line', x1: 4, y1: 17, x2: 20, y2: 17, linear: true },
    { t: 'rect', x: 10.6, y: 19, w: 2.8, h: 1.8 },
  ],

  /* ---- bar · drinks ---- */
  martini: [
    { t: 'poly', points: '5 6 19 6 12 13.5' },
    { t: 'line', x1: 12, y1: 13.5, x2: 12, y2: 19, linear: true },
    { t: 'line', x1: 8, y1: 19.5, x2: 16, y2: 19.5, linear: true },
    { t: 'ellipse', cx: 13.6, cy: 8.6, rx: 1.05, ry: 1.05 },
  ],
  coupe: [
    { t: 'poly', points: '5 7 19 7 15.5 11.5 8.5 11.5' },
    { t: 'line', x1: 12, y1: 11.5, x2: 12, y2: 19, linear: true },
    { t: 'line', x1: 8, y1: 19.5, x2: 16, y2: 19.5, linear: true },
  ],
  flute: [
    { t: 'poly', points: '10 4 14 4 13.1 13 10.9 13' },
    { t: 'line', x1: 12, y1: 13, x2: 12, y2: 19, linear: true },
    { t: 'line', x1: 9, y1: 19.5, x2: 15, y2: 19.5, linear: true },
    { t: 'ellipse', cx: 12, cy: 7, rx: 0.7, ry: 0.7 },
    { t: 'ellipse', cx: 12, cy: 9.6, rx: 0.6, ry: 0.6 },
  ],
  wine: [
    { t: 'path', d: 'M7.5 4 H16.5 C16.5 9.5 14 12 12 12 C10 12 7.5 9.5 7.5 4 Z' },
    { t: 'line', x1: 12, y1: 12, x2: 12, y2: 19.2, linear: true },
    { t: 'line', x1: 8, y1: 19.5, x2: 16, y2: 19.5, linear: true },
  ],
  rocks: [
    { t: 'poly', points: '6.5 8 17.5 8 16.5 19 7.5 19', linear: true },
    { t: 'poly', points: '12 11 15.5 13.5 12 16 8.5 13.5' },
  ],
  highball: [
    { t: 'rect', x: 8, y: 4, w: 8, h: 16, linear: true },
    { t: 'line', x1: 14, y1: 4.5, x2: 15.5, y2: 11, linear: true },
    { t: 'ellipse', cx: 11, cy: 9.5, rx: 1, ry: 1 },
    { t: 'ellipse', cx: 12.5, cy: 14, rx: 1, ry: 1 },
  ],
  shot: [
    { t: 'poly', points: '8 11 16 11 14.5 19 9.5 19', linear: true },
    { t: 'line', x1: 9, y1: 14, x2: 15, y2: 14, linear: true },
  ],
  tiki: [
    { t: 'poly', points: '7.5 7 16.5 7 15.5 20 8.5 20' },
    { t: 'rect', x: 9.6, y: 10, w: 1.8, h: 1.8 },
    { t: 'rect', x: 12.6, y: 10, w: 1.8, h: 1.8 },
    { t: 'path', d: 'M9.5 14.5 L11 16.5 L13 14.5 L14.5 16.5', linear: true },
  ],
  beer_can: [
    { t: 'rect', x: 7.5, y: 5, w: 9, h: 15, linear: true },
    { t: 'line', x1: 7.5, y1: 8, x2: 16.5, y2: 8, linear: true },
    { t: 'rect', x: 11, y: 3.4, w: 2, h: 1.8 },
  ],
  beer_bottle: [
    { t: 'poly', points: '10.5 3.5 13.5 3.5 13.5 8 15 11 15 20 9 20 9 11 10.5 8' },
    { t: 'rect', x: 10.7, y: 2.4, w: 2.6, h: 1.6 },
    { t: 'rect', x: 9.6, y: 12.5, w: 4.8, h: 3.4, linear: true },
  ],
  beer_stubby: [
    { t: 'poly', points: '9.5 5.5 14.5 5.5 14.5 8 16 10.5 16 20 8 20 8 10.5 9.5 8' },
    { t: 'rect', x: 10.7, y: 4, w: 2.6, h: 1.6 },
  ],
  pint: [
    { t: 'poly', points: '8 5 16 5 15.2 20 8.8 20', linear: true },
    { t: 'path', d: 'M8 8 Q10 6.6 12 8 T16 8', linear: true },
    { t: 'ellipse', cx: 11, cy: 12.5, rx: 0.85, ry: 0.85 },
    { t: 'ellipse', cx: 13, cy: 16, rx: 0.85, ry: 0.85 },
  ],
  stein: [
    { t: 'rect', x: 6.5, y: 6, w: 9, h: 14, linear: true },
    { t: 'path', d: 'M15.5 9 h2.5 v7 h-2.5', linear: true },
    { t: 'line', x1: 6.5, y1: 9, x2: 15.5, y2: 9, linear: true },
  ],
  wine_bottle: [
    { t: 'path', d: 'M11 3 H13 V7.5 C13 9 15 10 15 12.5 V20 H9 V12.5 C9 10 11 9 11 7.5 Z' },
    { t: 'rect', x: 9.3, y: 13.5, w: 5.4, h: 3.2, linear: true },
  ],
  coffee: [
    { t: 'poly', points: '6.5 9 16 9 15 18 7.5 18' },
    { t: 'path', d: 'M16 11 h2 a1.5 1.5 0 0 1 0 4 H15.4', linear: true },
    { t: 'line', x1: 6, y1: 20, x2: 17, y2: 20, linear: true },
    { t: 'line', x1: 9.5, y1: 4.5, x2: 9.5, y2: 7, linear: true },
    { t: 'line', x1: 12.5, y1: 4.5, x2: 12.5, y2: 7, linear: true },
  ],
  soda_can: [
    { t: 'rect', x: 7.5, y: 5, w: 9, h: 15, linear: true },
    { t: 'line', x1: 7.5, y1: 8, x2: 16.5, y2: 8, linear: true },
    { t: 'line', x1: 13, y1: 2.5, x2: 14.5, y2: 9, linear: true },
  ],

  /* ---- games + trivia ---- */
  dice: [
    { t: 'rect', x: 5, y: 5, w: 14, h: 14, linear: true },
    { t: 'ellipse', cx: 9, cy: 9, rx: 1.1, ry: 1.1 },
    { t: 'ellipse', cx: 12, cy: 12, rx: 1.1, ry: 1.1 },
    { t: 'ellipse', cx: 15, cy: 15, rx: 1.1, ry: 1.1 },
  ],
  cards: [
    { t: 'rect', x: 4.5, y: 6, w: 8.5, h: 13, linear: true },
    { t: 'rect', x: 11, y: 6, w: 8.5, h: 13, linear: true },
    { t: 'ellipse', cx: 15.2, cy: 12.5, rx: 1.2, ry: 1.2 },
  ],
  gamepad: [
    { t: 'rect', x: 4, y: 9, w: 16, h: 8, linear: true },
    { t: 'line', x1: 7, y1: 11, x2: 7, y2: 15, linear: true },
    { t: 'line', x1: 5, y1: 13, x2: 9, y2: 13, linear: true },
    { t: 'ellipse', cx: 16, cy: 12, rx: 1, ry: 1 },
    { t: 'ellipse', cx: 17.3, cy: 14.5, rx: 1, ry: 1 },
  ],
  trivia: [
    { t: 'path', d: 'M9.4 9.4 a2.6 2.6 0 1 1 2.8 2.6 v1.4', linear: true },
    { t: 'rect', x: 11.1, y: 16, w: 1.9, h: 1.9 },
  ],

  /* ---- language + conversation ---- */
  speech: [
    { t: 'rect', x: 4, y: 5, w: 16, h: 10, linear: true },
    { t: 'poly', points: '8 15 8 19 12 15' },
  ],
  chat: [
    { t: 'rect', x: 4, y: 4, w: 12, h: 9, linear: true },
    { t: 'rect', x: 10, y: 10, w: 10, h: 7, linear: true },
  ],
  globe: [
    { t: 'ellipse', cx: 12, cy: 12, rx: 8, ry: 8, linear: true },
    { t: 'line', x1: 4, y1: 12, x2: 20, y2: 12, linear: true },
    { t: 'line', x1: 12, y1: 4, x2: 12, y2: 20, linear: true },
    { t: 'ellipse', cx: 12, cy: 12, rx: 3.4, ry: 8, linear: true },
  ],

  /* ---- creative arts ---- */
  palette: [
    { t: 'ellipse', cx: 12, cy: 12, rx: 8, ry: 7, linear: true },
    { t: 'ellipse', cx: 9, cy: 10, rx: 1, ry: 1 },
    { t: 'ellipse', cx: 13, cy: 8.5, rx: 1, ry: 1 },
    { t: 'ellipse', cx: 16, cy: 11.5, rx: 1, ry: 1 },
    { t: 'ellipse', cx: 13, cy: 16, rx: 1.7, ry: 1.7, linear: true },
  ],
  brush: [
    { t: 'line', x1: 17.5, y1: 5, x2: 10.5, y2: 12, linear: true },
    { t: 'poly', points: '7 14 10 11 12.5 13.5 9.5 16.5' },
    { t: 'poly', points: '7 14 9.5 16.5 6 18.5 6.5 15' },
  ],
  pencil: [
    { t: 'poly', points: '16.5 4.5 19.5 7.5 9.5 17.5 6.5 14.5', linear: true },
    { t: 'poly', points: '6.5 14.5 9.5 17.5 5 19' },
    { t: 'line', x1: 14.5, y1: 6.5, x2: 17.5, y2: 9.5, linear: true },
  ],

  /* ---- music + dance + performance ---- */
  mic: [
    { t: 'rect', x: 9.5, y: 4, w: 5, h: 9, linear: true },
    { t: 'path', d: 'M7 11 a5 5 0 0 0 10 0', linear: true },
    { t: 'line', x1: 12, y1: 16, x2: 12, y2: 19, linear: true },
    { t: 'line', x1: 9, y1: 19.5, x2: 15, y2: 19.5, linear: true },
  ],
  vinyl: [
    { t: 'ellipse', cx: 12, cy: 12, rx: 8, ry: 8, linear: true },
    { t: 'ellipse', cx: 12, cy: 12, rx: 3, ry: 3, linear: true },
    { t: 'ellipse', cx: 12, cy: 12, rx: 0.9, ry: 0.9 },
  ],
  speaker: [
    { t: 'rect', x: 6, y: 4, w: 12, h: 16, linear: true },
    { t: 'ellipse', cx: 12, cy: 14, rx: 3, ry: 3, linear: true },
    { t: 'ellipse', cx: 12, cy: 7.5, rx: 1.3, ry: 1.3 },
  ],
  dance: [
    { t: 'ellipse', cx: 14, cy: 5, rx: 2, ry: 2 },
    { t: 'path', d: 'M13.5 7 L12 12 L9 14.5', linear: true },
    { t: 'path', d: 'M12 12 L14 15 L13 20', linear: true },
    { t: 'line', x1: 13, y1: 8.5, x2: 17, y2: 7, linear: true },
    { t: 'line', x1: 12.6, y1: 9.5, x2: 9.5, y2: 12, linear: true },
  ],

  /* ---- wellness + growth ---- */
  meditate: [
    { t: 'ellipse', cx: 12, cy: 6.5, rx: 2.2, ry: 2.2 },
    { t: 'poly', points: '5.5 18.5 18.5 18.5 12 11' },
    { t: 'line', x1: 6, y1: 15.5, x2: 18, y2: 15.5, linear: true },
  ],
  leaf: [
    { t: 'path', d: 'M12 3 C16.5 7 16.5 15 12 21 C7.5 15 7.5 7 12 3 Z' },
    { t: 'line', x1: 12, y1: 5.5, x2: 12, y2: 19, linear: true },
  ],
  sprout: [
    { t: 'line', x1: 12, y1: 20, x2: 12, y2: 11.5, linear: true },
    { t: 'path', d: 'M12 13 C9.5 13.2 7.2 11.5 6.5 8.8 C9.2 9 11.4 10.6 12 13 Z' },
    { t: 'path', d: 'M12 13 C14.5 13.2 16.8 11.5 17.5 8.8 C14.8 9 12.6 10.6 12 13 Z' },
  ],
  heart: [
    { t: 'path', d: 'M12 19 L5.5 12 A3.4 3.4 0 0 1 12 8 A3.4 3.4 0 0 1 18.5 12 Z' },
  ],

  /* ---- tech + business ---- */
  laptop: [
    { t: 'rect', x: 5, y: 5, w: 14, h: 9, linear: true },
    { t: 'poly', points: '3 18 21 18 22 20 2 20' },
  ],
  chart: [
    { t: 'line', x1: 4, y1: 4, x2: 4, y2: 20, linear: true },
    { t: 'line', x1: 4, y1: 20, x2: 20, y2: 20, linear: true },
    { t: 'path', d: 'M5 16 L9 12 L13 14 L19 6', linear: true },
  ],
  briefcase: [
    { t: 'rect', x: 4, y: 8, w: 16, h: 11, linear: true },
    { t: 'path', d: 'M9 8 V6 a1 1 0 0 1 1-1 h4 a1 1 0 0 1 1 1 V8', linear: true },
    { t: 'line', x1: 4, y1: 13, x2: 20, y2: 13, linear: true },
  ],
  bulb: [
    { t: 'ellipse', cx: 12, cy: 9, rx: 5, ry: 5, linear: true },
    { t: 'line', x1: 9.6, y1: 13, x2: 9.6, y2: 15.5, linear: true },
    { t: 'line', x1: 14.4, y1: 13, x2: 14.4, y2: 15.5, linear: true },
    { t: 'rect', x: 9.8, y: 15.5, w: 4.4, h: 2.4, linear: true },
    { t: 'line', x1: 10.5, y1: 18.6, x2: 13.5, y2: 18.6, linear: true },
  ],

  /* ---- film + screenings ---- */
  clapper: [
    { t: 'rect', x: 4, y: 9, w: 16, h: 10, linear: true },
    { t: 'poly', points: '4 9 20 9 19.5 5.5 6 5.5' },
    { t: 'line', x1: 9, y1: 5.7, x2: 7.5, y2: 9, linear: true },
    { t: 'line', x1: 13, y1: 5.7, x2: 11.5, y2: 9, linear: true },
    { t: 'line', x1: 17, y1: 5.7, x2: 15.5, y2: 9, linear: true },
  ],
  reel: [
    { t: 'ellipse', cx: 12, cy: 12, rx: 8, ry: 8, linear: true },
    { t: 'ellipse', cx: 12, cy: 8, rx: 1.4, ry: 1.4 },
    { t: 'ellipse', cx: 8.5, cy: 13.5, rx: 1.4, ry: 1.4 },
    { t: 'ellipse', cx: 15.5, cy: 13.5, rx: 1.4, ry: 1.4 },
    { t: 'ellipse', cx: 12, cy: 12, rx: 1.3, ry: 1.3 },
  ],
  playframe: [
    { t: 'rect', x: 4, y: 4, w: 16, h: 16, linear: true },
    { t: 'poly', points: '10 8 16 12 10 16' },
  ],

  /* ---- social + community ---- */
  group: [
    { t: 'ellipse', cx: 12, cy: 8, rx: 2.6, ry: 2.6 },
    { t: 'poly', points: '7 17.5 8 13 16 13 17 17.5' },
    { t: 'ellipse', cx: 5.5, cy: 9.5, rx: 1.9, ry: 1.9 },
    { t: 'ellipse', cx: 18.5, cy: 9.5, rx: 1.9, ry: 1.9 },
  ],
  pair: [
    { t: 'ellipse', cx: 8.5, cy: 8, rx: 2.4, ry: 2.4 },
    { t: 'ellipse', cx: 15.5, cy: 8, rx: 2.4, ry: 2.4 },
    { t: 'poly', points: '4.5 18 5.5 13 11.5 13 12.5 18' },
    { t: 'poly', points: '11.5 18 12.5 13 18.5 13 19.5 18' },
  ],
  network: [
    { t: 'ellipse', cx: 12, cy: 5, rx: 2, ry: 2 },
    { t: 'ellipse', cx: 5, cy: 17, rx: 2, ry: 2 },
    { t: 'ellipse', cx: 19, cy: 17, rx: 2, ry: 2 },
    { t: 'line', x1: 11, y1: 6.5, x2: 6, y2: 15.5, linear: true },
    { t: 'line', x1: 13, y1: 6.5, x2: 18, y2: 15.5, linear: true },
    { t: 'line', x1: 7, y1: 17, x2: 17, y2: 17, linear: true },
  ],

  /* ---- parties + special events ---- */
  popper: [
    { t: 'poly', points: '4.5 20.5 10.5 12.5 13 15 7 23' },
    { t: 'line', x1: 10.5, y1: 12.5, x2: 13, y2: 15, linear: true },
    { t: 'line', x1: 13.5, y1: 10.5, x2: 16, y2: 8.5, linear: true },
    { t: 'rect', x: 17, y: 11, w: 1.6, h: 1.6 },
    { t: 'ellipse', cx: 15.5, cy: 5.5, rx: 1, ry: 1 },
    { t: 'rect', x: 19, y: 6.5, w: 1.5, h: 1.5 },
  ],
  balloon: [
    { t: 'ellipse', cx: 12, cy: 8.5, rx: 5, ry: 6, linear: true },
    { t: 'poly', points: '10.8 14.2 13.2 14.2 12 16' },
    { t: 'path', d: 'M12 16 C12 18 13.6 19 12.5 21', linear: true },
  ],
  cake: [
    { t: 'rect', x: 5, y: 12, w: 14, h: 7, linear: true },
    { t: 'line', x1: 5, y1: 15, x2: 19, y2: 15, linear: true },
    { t: 'line', x1: 8, y1: 8.5, x2: 8, y2: 11, linear: true },
    { t: 'line', x1: 12, y1: 8.5, x2: 12, y2: 11, linear: true },
    { t: 'line', x1: 16, y1: 8.5, x2: 16, y2: 11, linear: true },
    { t: 'ellipse', cx: 8, cy: 7.4, rx: 0.9, ry: 1.1 },
    { t: 'ellipse', cx: 12, cy: 7.4, rx: 0.9, ry: 1.1 },
    { t: 'ellipse', cx: 16, cy: 7.4, rx: 0.9, ry: 1.1 },
  ],
  sparkle: [
    { t: 'poly', points: '12 3 13.6 10.4 21 12 13.6 13.6 12 21 10.4 13.6 3 12 10.4 10.4' },
  ],

  /* ---- added: more drinks ---- */
  beer_bomber: [
    { t: 'poly', points: '9.5 3.5 14.5 3.5 14.5 8 16.5 11.5 16.5 20 7.5 20 7.5 11.5 9.5 8' },
    { t: 'rect', x: 9.7, y: 2.3, w: 4.6, h: 1.7 },
  ],
  beer_belgian: [
    { t: 'path', d: 'M10.5 3 H13.5 V7 C13.5 9 16 10.5 16 13.5 C16 17.5 14.5 20 12 20 C9.5 20 8 17.5 8 13.5 C8 10.5 10.5 9 10.5 7 Z' },
    { t: 'rect', x: 10.5, y: 2, w: 3, h: 1.4 },
    { t: 'line', x1: 10.5, y1: 5, x2: 13.5, y2: 5, linear: true },
  ],
  beer_growler: [
    { t: 'rect', x: 7.5, y: 8, w: 8.5, h: 12, linear: true },
    { t: 'rect', x: 10, y: 4, w: 3.5, h: 4, linear: true },
    { t: 'rect', x: 9.8, y: 2.6, w: 3.9, h: 1.6 },
    { t: 'path', d: 'M16 10 h2.5 v5 h-2.5', linear: true },
  ],
  dropshot: [
    { t: 'poly', points: '7 7 17 7 16 20 8 20', linear: true },
    { t: 'poly', points: '10.5 8.5 13.5 8.5 13 12 11 12', linear: true },
    { t: 'line', x1: 7.5, y1: 6.5, x2: 6, y2: 4.5, linear: true },
    { t: 'line', x1: 16.5, y1: 6.5, x2: 18, y2: 4.5, linear: true },
  ],

  /* ---- added: board games ---- */
  boardgame: [
    { t: 'rect', x: 4, y: 4, w: 16, h: 16, linear: true },
    { t: 'rect', x: 8, y: 8, w: 4, h: 4 },
    { t: 'rect', x: 12, y: 12, w: 4, h: 4 },
  ],
  chess: [
    { t: 'ellipse', cx: 12, cy: 6, rx: 2.2, ry: 2.2 },
    { t: 'poly', points: '8.5 19 10 12 14 12 15.5 19' },
    { t: 'line', x1: 9.5, y1: 12.5, x2: 14.5, y2: 12.5, linear: true },
    { t: 'line', x1: 7.5, y1: 19.5, x2: 16.5, y2: 19.5, linear: true },
  ],
  dominoes: [
    { t: 'rect', x: 8, y: 4, w: 8, h: 16, linear: true },
    { t: 'line', x1: 8, y1: 12, x2: 16, y2: 12, linear: true },
    { t: 'ellipse', cx: 12, cy: 7.5, rx: 1, ry: 1 },
    { t: 'ellipse', cx: 10.5, cy: 15.5, rx: 0.9, ry: 0.9 },
    { t: 'ellipse', cx: 13.5, cy: 17, rx: 0.9, ry: 0.9 },
  ],

  /* ---- added: DJ decks ---- */
  decks: [
    { t: 'ellipse', cx: 10, cy: 13, rx: 5.5, ry: 5.5, linear: true },
    { t: 'ellipse', cx: 10, cy: 13, rx: 1, ry: 1 },
    { t: 'line', x1: 18.5, y1: 6.5, x2: 12, y2: 11.5, linear: true },
    { t: 'rect', x: 16.8, y: 5, w: 2.6, h: 2.6, linear: true },
    { t: 'line', x1: 19, y1: 15, x2: 19, y2: 19.5, linear: true },
  ],

  /* ---- added: film + screenings ---- */
  projector: [
    { t: 'rect', x: 3.5, y: 9, w: 13, h: 8, linear: true },
    { t: 'ellipse', cx: 8, cy: 13, rx: 2.4, ry: 2.4, linear: true },
    { t: 'poly', points: '16.5 11 21 8.5 21 17.5 16.5 15' },
    { t: 'line', x1: 5.5, y1: 17, x2: 5.5, y2: 19, linear: true },
    { t: 'line', x1: 14.5, y1: 17, x2: 14.5, y2: 19, linear: true },
  ],
  popcorn: [
    { t: 'poly', points: '7 9 17 9 16 20 8 20', linear: true },
    { t: 'line', x1: 9.7, y1: 9, x2: 9, y2: 20, linear: true },
    { t: 'line', x1: 14.3, y1: 9, x2: 15, y2: 20, linear: true },
    { t: 'ellipse', cx: 9, cy: 7.5, rx: 1.6, ry: 1.6 },
    { t: 'ellipse', cx: 12, cy: 6.5, rx: 1.8, ry: 1.8 },
    { t: 'ellipse', cx: 15, cy: 7.5, rx: 1.6, ry: 1.6 },
  ],
  ticket: [
    { t: 'rect', x: 3.5, y: 7.5, w: 17, h: 9, linear: true },
    { t: 'line', x1: 14, y1: 7.5, x2: 14, y2: 16.5, linear: true },
    { t: 'poly', points: '6.5 10 9.5 12 6.5 14' },
  ],

  /* ---- added: dating ---- */
  dating: [
    { t: 'path', d: 'M9 16 L5 12 A2.4 2.4 0 0 1 9 8.6 A2.4 2.4 0 0 1 13 12 Z' },
    { t: 'path', d: 'M15.5 18.5 L11.6 14.6 A2.2 2.2 0 0 1 15.5 11.4 A2.2 2.2 0 0 1 19.4 14.6 Z' },
  ],
};

const LABELS = {
  home: 'Home', live: 'Live', scan: 'Scan', leaders: 'Leaders', music: 'Music', calendar: 'Events',
  user: 'You', drink: 'Bar', check: 'Check', alert: 'Alert', info: 'Info', bell: 'Alerts',
  // drinks
  martini: 'Martini', coupe: 'Coupe', flute: 'Flute', wine: 'Wine', rocks: 'Rocks', highball: 'Highball',
  shot: 'Shot', tiki: 'Tiki', beer_can: 'Beer Can', beer_bottle: 'Longneck', beer_stubby: 'Stubby',
  pint: 'Pint', stein: 'Stein', wine_bottle: 'Wine Bottle', coffee: 'Coffee', soda_can: 'Soda',
  // games + trivia
  dice: 'Dice', cards: 'Cards', gamepad: 'Gamepad', trivia: 'Trivia',
  // language + conversation
  speech: 'Speech', chat: 'Chat', globe: 'Languages',
  // creative arts
  palette: 'Palette', brush: 'Brush', pencil: 'Pencil',
  // music + dance + performance
  mic: 'Mic', vinyl: 'Vinyl', speaker: 'Speaker', dance: 'Dance',
  // wellness + growth
  meditate: 'Meditate', leaf: 'Leaf', sprout: 'Growth', heart: 'Wellbeing',
  // tech + business
  laptop: 'Laptop', chart: 'Chart', briefcase: 'Business', bulb: 'Ideas',
  // film + screenings
  clapper: 'Clapper', reel: 'Reel', playframe: 'Screening',
  // social + community
  group: 'Group', pair: 'Meet', network: 'Network',
  // parties + special events
  popper: 'Popper', balloon: 'Balloon', cake: 'Cake', sparkle: 'Sparkle',
  // added
  beer_bomber: 'Bomber', beer_belgian: 'Belgian', beer_growler: 'Growler', dropshot: 'Drop Shot',
  boardgame: 'Board Game', chess: 'Chess', dominoes: 'Dominoes',
  decks: 'DJ Decks', projector: 'Projector', popcorn: 'Popcorn', ticket: 'Ticket', dating: 'Dating',
};

/* the original core nav/system set — used by the directions explorer */
const CORE = ['home', 'live', 'scan', 'leaders', 'music', 'calendar', 'user', 'drink', 'check', 'alert', 'info', 'bell'];

/* the full library, grouped for the catalog page */
const CATEGORIES = [
  { group: 'Bar · Drinks', items: ['martini','coupe','flute','wine','rocks','highball','shot','dropshot','tiki','beer_can','beer_bottle','beer_stubby','beer_bomber','beer_belgian','beer_growler','pint','stein','wine_bottle','coffee','soda_can'] },
  { group: 'Games + Trivia', items: ['dice','cards','gamepad','trivia','boardgame','chess','dominoes'] },
  { group: 'Language + Conversation', items: ['speech','chat','globe'] },
  { group: 'Creative Arts', items: ['palette','brush','pencil'] },
  { group: 'Music + Dance + Performance', items: ['music','mic','vinyl','speaker','decks','dance'] },
  { group: 'Wellness + Growth', items: ['meditate','leaf','sprout','heart'] },
  { group: 'Tech + Business', items: ['laptop','chart','briefcase','bulb'] },
  { group: 'Film + Screenings', items: ['clapper','reel','playframe','projector','popcorn','ticket'] },
  { group: 'Social + Community', items: ['group','pair','network','dating'] },
  { group: 'Parties + Special Events', items: ['popper','balloon','cake','sparkle'] },
];

function prim(p, i, mode) {
  const isLinear = p.linear || p.t === 'line';
  const sw = mode === 'solid' ? 2.6 : 2;
  const strokeProps = { fill: 'none', stroke: 'currentColor', strokeWidth: sw, strokeLinejoin: 'miter', strokeLinecap: 'square', vectorEffect: 'non-scaling-stroke' };
  const fillProps = mode === 'solid' && !isLinear
    ? { fill: 'currentColor', stroke: 'none' }
    : strokeProps;
  const sp = isLinear ? strokeProps : fillProps;
  switch (p.t) {
    case 'rect': return <rect key={i} x={p.x} y={p.y} width={p.w} height={p.h} {...sp} />;
    case 'poly': return <polygon key={i} points={p.points} {...sp} />;
    case 'ellipse': return <ellipse key={i} cx={p.cx} cy={p.cy} rx={p.rx} ry={p.ry} {...sp} />;
    case 'line': return <line key={i} x1={p.x1} y1={p.y1} x2={p.x2} y2={p.y2} {...sp} />;
    case 'path': return <path key={i} d={p.d} {...sp} />;
    default: return null;
  }
}

// A single glyph in a given treatment.
// dir: 'stroke' | 'solid' | 'echo' (solid + offset) | 'echo-line' (stroke + offset)
function Icon({ name, dir = 'stroke', size = 30, color = 'var(--fg)', echo = 'var(--accent)' }) {
  const baseMode = (dir === 'stroke' || dir === 'echo-line') ? 'stroke' : 'solid';
  const isEcho = dir === 'echo' || dir === 'echo-line';
  const svg = (c) => (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: 'block', color: c, overflow: 'visible' }}>
      {GLYPHS[name].map((p, i) => prim(p, i, baseMode))}
    </svg>
  );
  if (isEcho) {
    return (
      <span style={{ position: 'relative', display: 'inline-block', width: size, height: size }}>
        <span style={{ position: 'absolute', left: 1.6, top: 1.8 }}>{svg(echo)}</span>
        <span style={{ position: 'relative' }}>{svg(color)}</span>
      </span>
    );
  }
  return svg(color);
}

window.Icon = Icon;
window.ICON_NAMES = Object.keys(GLYPHS);
window.ICON_LABELS = LABELS;
window.ICON_CORE = CORE;
window.ICON_CATEGORIES = CATEGORIES;
