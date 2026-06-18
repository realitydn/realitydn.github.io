/* Export the chosen REALITY avatar concepts as self-contained SVG + transparent 1024 PNG,
   Day + Night. Wordmark vector is inlined into every file (no external refs, no CSS vars). */
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const OUT = path.resolve(__dirname, '..', 'design-system-year2', 'logo-explorations', 'exports');
fs.mkdirSync(OUT, { recursive: true });

const WM_PATHS = `
<path d="M73.4,63.7V13.3h20.7c4.5,0,8.3.7,11.5,2.1,3.2,1.4,5.7,3.5,7.4,6.2,1.7,2.7,2.6,5.9,2.6,9.6s-.9,6.9-2.6,9.5c-1.7,2.6-4.2,4.7-7.4,6.1-3.2,1.4-7,2.2-11.5,2.2h-15.5l4.1-4.2v18.9h-9.4ZM82.7,45.9l-4.1-4.5h15c4.1,0,7.2-.9,9.3-2.7,2.1-1.8,3.1-4.2,3.1-7.4s-1-5.6-3.1-7.4c-2.1-1.8-5.2-2.6-9.3-2.6h-15l4.1-4.6v29.2ZM106.3,63.7l-12.7-18.3h10l12.8,18.3h-10.1Z"/>
<path d="M142.6,55.8h28.4v7.9h-37.8V13.3h36.8v7.9h-27.4v34.6ZM141.8,34.3h25.1v7.7h-25.1v-7.7Z"/>
<path d="M188.2,63.7v-27.9c0-5,.9-9.3,2.8-12.7s4.5-6.1,7.8-7.8c3.4-1.8,7.2-2.6,11.7-2.6s8.4.9,11.8,2.6c3.4,1.8,6,4.4,7.8,7.8,1.8,3.5,2.8,7.7,2.8,12.7v27.9h-9.3v-28.8c0-4.8-1.2-8.3-3.6-10.6-2.4-2.3-5.6-3.5-9.5-3.5s-7.2,1.2-9.5,3.5c-2.4,2.3-3.6,5.9-3.6,10.6v28.8h-9.2ZM194.1,50.7v-7.8h32.8v7.8h-32.8Z"/>
<path d="M253.3,63.7V13.3h9.4v42.5h26.4v7.9h-35.7Z"/>
<path d="M299.8,21.2v-7.9h27.9v7.9h-27.9ZM299.8,63.7v-7.9h27.9v7.9h-27.9ZM309,62.6V14.3h9.4v48.3h-9.4Z"/>
<path d="M354.8,63.7V21.2h-16.7v-7.9h42.8v7.9h-16.7v42.5h-9.4Z"/>
<path d="M415.7,71.4c-4.2,0-8.1-.6-11.5-1.9-3.5-1.2-6.4-3-8.7-5.2l3.8-7.2c2.3,2,4.7,3.5,7.5,4.5,2.7,1,5.7,1.5,9,1.5s7.8-1.2,10.2-3.5c2.3-2.4,3.5-6,3.5-10.9v-9.8l2.7,1.2c-1.6,3.9-4,6.7-7,8.5-3,1.8-6.6,2.7-10.6,2.7-6.3,0-11.3-1.8-14.8-5.4-3.5-3.6-5.3-8.9-5.3-15.7V13.3h9.4v16.5c0,4.5,1.1,7.9,3.3,10.1,2.2,2.2,5.1,3.3,8.8,3.3s7.2-1.2,9.7-3.5c2.5-2.3,3.7-6,3.7-10.9v-15.6h9.4v35c0,5.1-.9,9.3-2.8,12.7s-4.5,6-7.9,7.7c-3.4,1.8-7.5,2.7-12.2,2.7Z"/>`;

const DAY   = { fg:'#0d0905', bg:'#fffbf1', accent:'#ed1b72', hair:'rgba(13,9,5,0.16)', blue:'#18a7e0', yellow:'#fddf00', red:'#ed2224' };
const NIGHT = { fg:'#fffbf1', bg:'#0a0703', accent:'#ed1b72', hair:'#3a2c1c',           blue:'#18a7e0', yellow:'#fddf00', red:'#ed2224' };

const disc = (f)=>`<circle cx="120" cy="120" r="120" fill="${f}"/>`;
const ring = (r,w,s)=>`<circle cx="120" cy="120" r="${r}" fill="none" stroke="${s}" stroke-width="${w}"/>`;
function wm(c,o={}){ const w=o.w||190,h=w/6.0952381,x=(o.x!=null)?o.x:(120-w/2),cy=o.cy||120,y=cy-h/2;
  return `<svg x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${w}" height="${h.toFixed(2)}" viewBox="0 0 512 84"><use href="#wm" fill="${c}"/></svg>`; }
function rmark(c,o={}){ const h=o.h||120,w=h*50/56,x=(o.x!=null)?o.x:(120-w/2),cy=o.cy||120,y=cy-h/2;
  return `<svg x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${w.toFixed(2)}" height="${h}" viewBox="70 10 50 56"><use href="#wm" fill="${c}"/></svg>`; }
function arc(U,which,rad,txt,c,fs=11,ls=1.5){
  const d=which==='top'?`M ${120-rad},120 A ${rad},${rad} 0 0 1 ${120+rad},120`:`M ${120-rad},120 A ${rad},${rad} 0 0 0 ${120+rad},120`;
  return `<path id="${U}${which}" d="${d}" fill="none"/><text font-family="Montserrat, sans-serif" font-weight="700" font-size="${fs}" letter-spacing="${ls}" fill="${c}"><textPath href="#${U}${which}" startOffset="50%" text-anchor="middle">${txt}</textPath></text>`;
}

const BUILD = {
  '03-misregistered-seal': (P,U)=> `<g clip-path="url(#disc)"><rect width="240" height="240" fill="${P.accent}"/><circle cx="113" cy="113" r="120" fill="${P.fg}"/></g>`+ring(106,1.5,P.bg)+arc(U,'top',90,'86 MAI THÚC LÂN',P.bg,10.5,1.5)+arc(U,'bottom',96,'ĐÀ NẴNG · VIỆT NAM',P.bg,10,1)+wm(P.bg,{w:150}),
  '05-equator-banner': (P,U)=> disc(P.bg)+ring(118,1.5,P.hair)+`<g clip-path="url(#disc)"><rect x="0" y="96" width="240" height="48" fill="${P.fg}"/></g>`+wm(P.bg,{w:196}),
  '09-r-coin': (P,U)=> disc(P.fg)+rmark(P.bg,{h:122,cy:104})+wm(P.bg,{w:92,cy:196}),
  '10-r-echo': (P,U)=> disc(P.bg)+ring(118,1.5,P.hair)+`<g transform="translate(8,8)">`+rmark(P.accent,{h:128,cy:108})+`</g>`+rmark(P.fg,{h:128,cy:108})+wm(P.fg,{w:92,cy:198}),
  '11-r-knockout': (P,U)=> `<mask id="${U}k"><rect x="0" y="0" width="240" height="240" fill="#fff"/><svg x="66" y="58" width="107" height="120" viewBox="70 10 50 56"><use href="#wm" fill="#000"/></svg></mask>`+`<circle cx="120" cy="120" r="120" fill="${P.accent}"/>`+`<circle cx="120" cy="120" r="120" fill="${P.fg}" mask="url(#${U}k)"/>`+wm(P.bg,{w:96,cy:206}),
  '12-r-stamp-square': (P,U)=> `<g clip-path="url(#disc)"><rect x="30" y="30" width="180" height="180" fill="${P.fg}"/></g>`+rmark(P.bg,{h:120,cy:104})+wm(P.bg,{w:90,cy:192}),
  '23-minimal': (P,U)=> disc(P.bg)+ring(118,1.5,P.hair)+wm(P.fg,{w:168}),
};
// fixed-colour concept (one variant)
const DAYNIGHT = (U)=> `<g clip-path="url(#disc)"><rect x="0" y="0" width="120" height="240" fill="#fffbf1"/><rect x="120" y="0" width="120" height="240" fill="#0d0905"/></g>`
  +`<clipPath id="${U}L"><rect x="0" y="0" width="120.5" height="240"/></clipPath><clipPath id="${U}R"><rect x="119.5" y="0" width="121" height="240"/></clipPath>`
  +`<g clip-path="url(#${U}L)">`+wm('#0d0905',{w:196})+`</g><g clip-path="url(#${U}R)">`+wm('#fffbf1',{w:196})+`</g>`;

const FILE = (inner)=> `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 240 240">`
  +`<defs><g id="wm">${WM_PATHS}</g><clipPath id="disc"><circle cx="120" cy="120" r="120"/></clipPath></defs>`+inner+`</svg>`;

// ---- write SVGs ----
const jobs = [];
for (const [name, fn] of Object.entries(BUILD)) {
  for (const [tname, P] of [['day', DAY], ['night', NIGHT]]) {
    const file = `reality-pfp-${name}-${tname}`;
    fs.writeFileSync(path.join(OUT, file + '.svg'), FILE(fn(P, 'u_')));
    jobs.push(file);
  }
}
{ const file = 'reality-pfp-24-day-night';
  fs.writeFileSync(path.join(OUT, file + '.svg'), FILE(DAYNIGHT('u_')));
  jobs.push(file); }

// ---- rasterize to transparent 1024 PNGs ----
(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1024, height: 1024, deviceScaleFactor: 1 });
  for (const file of jobs) {
    const svg = fs.readFileSync(path.join(OUT, file + '.svg'), 'utf8');
    await page.setContent(
      `<!doctype html><html><head><meta charset="utf-8">
       <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@700&display=swap" rel="stylesheet">
       <style>html,body{margin:0;padding:0;background:transparent}svg{display:block}</style></head>
       <body>${svg}</body></html>`, { waitUntil: 'networkidle0' });
    await page.evaluate(async () => { await document.fonts.ready; });
    await new Promise(r => setTimeout(r, 250));
    await page.screenshot({ path: path.join(OUT, file + '.png'), omitBackground: true,
      clip: { x: 0, y: 0, width: 1024, height: 1024 } });
  }
  await browser.close();
  console.log('exported', jobs.length, 'concepts ×(svg+png) →', OUT);
  console.log(jobs.join('\n'));
})().catch(e => { console.error(e); process.exit(1); });
