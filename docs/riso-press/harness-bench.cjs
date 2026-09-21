const puppeteer=require('puppeteer');
const fs=require('fs'),path=require('path');
const REPO=require('path').resolve(__dirname,'../..');
(async()=>{
  const b=await puppeteer.launch({headless:'new',args:['--no-sandbox']});
  const p=await b.newPage();
  p.on('pageerror',e=>console.error('ERR',e.message));
  await p.setContent('<html><body></body></html>');
  await p.evaluate(fs.readFileSync(path.join(REPO,'public/studio-shared/riso-press.js'),'utf8'));
  await p.evaluate(fs.readFileSync(path.join(REPO,'public/studio-shared/riso-engine.js'),'utf8'));
  await p.evaluate(fs.readFileSync(path.join(__dirname,'prototype-separation.js'),'utf8'));
  const img='data:image/jpeg;base64,'+fs.readFileSync(path.join(REPO,'public/images/gallery/g.jpg')).toString('base64');
  const r=await p.evaluate(async(img)=>{
    const im=await new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=rej;i.src=img;});
    const mk=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
    const sizes=[['640x360',640,360],['1080x1080',1080,1080],['1920x1080',1920,1080]];
    const cases=[
      ['sep 2-ink grain',      {inks:['pink','blue']}],
      ['sep 2-ink grain+press',{inks:['pink','blue'],drift:4,skew:6,stretch:9,starve:0.35,streak:0.3}],
      ['sep 3-ink grain',      {inks:['ink','pink','blue']}],
      ['sep 4-ink screen 71',  {inks:['ink','pink','blue','yellow'],screen:'am',pitch:8}],
    ];
    const out={};
    for(const [nm,o] of cases){
      out[nm]={};
      for(const [sn,w,h] of sizes){
        const cv=mk(w,h);
        window.LAB.render(cv,Object.assign({src:im},o));           // warm
        const t0=performance.now();
        for(let i=0;i<3;i++) window.LAB.render(cv,Object.assign({src:im},o));
        out[nm][sn]=Math.round((performance.now()-t0)/3);
      }
    }
    // existing engine, same sizes, for the ratio
    window.RISO.setSource(im); window.RISO.setTransform({scale:1,x:0,y:0,rot:0});
    out['ENGINE halftone']={}; out['ENGINE overprint']={};
    for(const [sn,w,h] of sizes){
      let cv=mk(w,h); window.RISO.render(cv,'halftone',{ink:'pink',paper:'day'});
      let t0=performance.now(); for(let i=0;i<3;i++) window.RISO.render(cv,'halftone',{ink:'pink',paper:'day'});
      out['ENGINE halftone'][sn]=Math.round((performance.now()-t0)/3);
      cv=mk(w,h); window.RISO.render(cv,'overprint',{ink:'pink',ink2:'blue',paper:'day'});
      t0=performance.now(); for(let i=0;i<3;i++) window.RISO.render(cv,'overprint',{ink:'pink',ink2:'blue',paper:'day'});
      out['ENGINE overprint'][sn]=Math.round((performance.now()-t0)/3);
    }
    return out;
  },img);
  const sizes=['640x360','1080x1080','1920x1080'];
  console.log('per frame, ms'.padEnd(26)+sizes.map(s=>s.padStart(12)).join(''));
  console.log('-'.repeat(26+36));
  for(const k in r) console.log(k.padEnd(26)+sizes.map(s=>String(r[k][s]).padStart(12)).join(''));
  console.log('\nthroughput at 1080x1080 with 8 worker lanes (fps):');
  for(const k in r) console.log('  '+k.padEnd(24)+(8000/r[k]['1080x1080']).toFixed(0));
  console.log('\nrealtime preview at 640x360 (fps):');
  for(const k in r) console.log('  '+k.padEnd(24)+(1000/r[k]['640x360']).toFixed(0));
  await b.close();
})();
