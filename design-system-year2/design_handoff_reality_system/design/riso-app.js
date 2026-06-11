/* ============================================================
   REALITY — PHOTO TREATMENTS · app controller
   ============================================================ */
(function(){
  "use strict";
  const LS='reality-riso-v1';
  const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];

  const state = Object.assign({
    ink:'pink', paper:'night', sample:'spotlight', custom:null,
    contrast:1.18, dot:9, bands:4, grain:true,
    balance:0.5, angle:30, softness:0.12, shape:'circle'
  }, load());

  function load(){ try{ return JSON.parse(localStorage.getItem(LS))||{}; }catch(e){ return {}; } }
  function save(){ try{ localStorage.setItem(LS, JSON.stringify(state)); }catch(e){} }

  /* ---- grain texture (generated once) ---- */
  function makeGrain(){
    const n=180,c=document.createElement('canvas'); c.width=n; c.height=n;
    const x=c.getContext('2d'), id=x.createImageData(n,n), d=id.data;
    for(let i=0;i<d.length;i+=4){ const v=180+Math.random()*75|0; d[i]=d[i+1]=d[i+2]=v; d[i+3]=255; }
    x.putImageData(id,0,0);
    document.documentElement.style.setProperty('--grain-url', `url(${c.toDataURL()})`);
  }

  /* ---- source resolution ---- */
  function applySource(cb){
    if(state.custom){ RISO.loadImage(state.custom).then(im=>{ RISO.setSource(im); cb&&cb(); }).catch(()=>{ setSample(); cb&&cb(); }); }
    else { setSample(); cb&&cb(); }
  }
  function setSample(){ RISO.setSource(RISO.sampleCanvas(state.sample, 900, 1125)); }

  /* ---- render every canvas ---- */
  function opts(over){ return Object.assign({ ink:state.ink, paper:state.paper,
    contrast:state.contrast, dot:state.dot, bands:state.bands,
    balance:state.balance, angle:state.angle, softness:state.softness, shape:state.shape }, over||{}); }

  function drawRaw(cv){ const x=cv.getContext('2d'); x.clearRect(0,0,cv.width,cv.height);
    const s=RISO.source; if(!s) return; const sw=s.naturalWidth||s.width, sh=s.naturalHeight||s.height;
    const sc=Math.max(cv.width/sw,cv.height/sh); x.drawImage(s,(cv.width-sw*sc)/2,(cv.height-sh*sc)/2,sw*sc,sh*sc); }

  function renderAll(){
    $$('canvas[data-treat]').forEach(cv=>{
      const t=cv.dataset.treat;
      if(t==='raw') drawRaw(cv);
      else RISO.render(cv, t, opts({ paper: cv.dataset.paper || state.paper, ink: cv.dataset.ink || state.ink }));
    });
  }
  let raf=null; function renderSoon(){ if(raf) cancelAnimationFrame(raf); raf=requestAnimationFrame(renderAll); }

  /* ---- theme / accent application ---- */
  function applyTheme(){
    document.documentElement.setAttribute('data-theme', state.paper==='night'?'dark':'light');
    document.documentElement.style.setProperty('--accent', RISO.PAL[state.ink]);
    document.body.classList.toggle('grain-on', !!state.grain);
  }

  /* ============================================================
     CONTROLS
     ============================================================ */
  function syncUI(){
    $$('[data-ink]').forEach(b=>b.setAttribute('aria-pressed', b.dataset.ink===state.ink));
    $$('[data-paper]').forEach(b=>b.setAttribute('aria-pressed', b.dataset.paper===state.paper));
    $$('[data-sample]').forEach(b=>b.setAttribute('aria-pressed', !state.custom && b.dataset.sample===state.sample));
    $$('[data-grain]').forEach(b=>b.setAttribute('aria-pressed', state.grain ? b.dataset.grain==='on' : b.dataset.grain==='off'));
    $('#k-contrast').value=state.contrast; $('#v-contrast').textContent=state.contrast.toFixed(2);
    $('#k-dot').value=state.dot; $('#v-dot').textContent=state.dot+'px';
    $('#k-bands').value=state.bands; $('#v-bands').textContent=state.bands;
    $('#k-balance').value=state.balance; $('#v-balance').textContent=state.balance.toFixed(2);
    $('#k-angle').value=state.angle; $('#v-angle').textContent=state.angle+'\u00b0';
    $('#k-soft').value=state.softness; $('#v-soft').textContent=state.softness.toFixed(2);
    $$('[data-shape]').forEach(b=>b.setAttribute('aria-pressed', b.dataset.shape===state.shape));
    const dz=$('#drop'); dz.classList.toggle('has', !!state.custom);
    $('#drop .dz').textContent = state.custom ? 'Your photo' : 'Drop a photo';
  }

  function wire(){
    $$('[data-ink]').forEach(b=>b.onclick=()=>{ state.ink=b.dataset.ink; applyTheme(); syncUI(); renderSoon(); save(); });
    $$('[data-paper]').forEach(b=>b.onclick=()=>{ state.paper=b.dataset.paper; applyTheme(); syncUI(); renderSoon(); save(); });
    $$('[data-sample]').forEach(b=>b.onclick=()=>{ state.sample=b.dataset.sample; state.custom=null; applySource(()=>{ drawRaw($('#drop canvas')); renderSoon(); }); syncUI(); save(); });
    $$('[data-grain]').forEach(b=>b.onclick=()=>{ state.grain=b.dataset.grain==='on'; applyTheme(); syncUI(); save(); });
    $('#k-contrast').oninput=e=>{ state.contrast=parseFloat(e.target.value); $('#v-contrast').textContent=state.contrast.toFixed(2); renderSoon(); save(); };
    $('#k-dot').oninput=e=>{ state.dot=parseInt(e.target.value); $('#v-dot').textContent=state.dot+'px'; renderSoon(); save(); };
    $('#k-bands').oninput=e=>{ state.bands=parseInt(e.target.value); $('#v-bands').textContent=state.bands; renderSoon(); save(); };
    $('#k-balance').oninput=e=>{ state.balance=parseFloat(e.target.value); $('#v-balance').textContent=state.balance.toFixed(2); renderSoon(); save(); };
    $('#k-angle').oninput=e=>{ state.angle=parseInt(e.target.value); $('#v-angle').textContent=state.angle+'\u00b0'; renderSoon(); save(); };
    $('#k-soft').oninput=e=>{ state.softness=parseFloat(e.target.value); $('#v-soft').textContent=state.softness.toFixed(2); renderSoon(); save(); };
    $$('[data-shape]').forEach(b=>b.onclick=()=>{ state.shape=b.dataset.shape; syncUI(); renderSoon(); save(); });

    /* dropzone */
    const dz=$('#drop'), input=$('#file');
    dz.onclick=()=>input.click();
    input.onchange=e=>{ if(e.target.files[0]) ingest(e.target.files[0]); };
    ['dragenter','dragover'].forEach(ev=>dz.addEventListener(ev,e=>{ e.preventDefault(); dz.classList.add('over'); }));
    ['dragleave','drop'].forEach(ev=>dz.addEventListener(ev,e=>{ e.preventDefault(); dz.classList.remove('over'); }));
    dz.addEventListener('drop',e=>{ const f=e.dataTransfer.files[0]; if(f) ingest(f); });
    /* page-wide drop convenience */
    window.addEventListener('dragover',e=>e.preventDefault());
    window.addEventListener('drop',e=>{ e.preventDefault(); const f=e.dataTransfer&&e.dataTransfer.files[0]; if(f && f.type.startsWith('image/')) ingest(f); });
  }

  function ingest(file){
    const fr=new FileReader();
    fr.onload=()=>{ const im=new Image(); im.onload=()=>{
      // downscale for storage sanity
      const max=1100, sc=Math.min(1,max/Math.max(im.width,im.height));
      const c=document.createElement('canvas'); c.width=Math.round(im.width*sc); c.height=Math.round(im.height*sc);
      c.getContext('2d').drawImage(im,0,0,c.width,c.height);
      state.custom=c.toDataURL('image/jpeg',0.86);
      RISO.setSource(im); drawRaw($('#drop canvas')); renderSoon(); syncUI(); save();
    }; im.src=fr.result; };
    fr.readAsDataURL(file);
  }

  /* ---- QR fill for poster atoms ---- */
  function fillQR(){
    let seed=20617; const rnd=()=>(seed=(seed*1103515245+12345)&0x7fffffff)/0x7fffffff;
    $$('.pqr,[data-qr]').forEach(q=>{ q.innerHTML=''; for(let i=0;i<121;i++){ const c=document.createElement('i');
      const x=i%11,y=(i/11)|0, fz=(x<3&&y<3)||(x>7&&y<3)||(x<3&&y>7);
      if(fz? ((x===0||x===2||x===8||x===10)|| (y===0||y===2||y===8||y===10) || (x>=4&&x<=6&&false)) : rnd()>0.5) c.className='on';
      q.appendChild(c); } });
  }

  /* ---- boot ---- */
  makeGrain(); applyTheme(); fillQR();
  applySource(()=>{ drawRaw($('#drop canvas')); renderAll(); });
  wire(); syncUI();
  window.addEventListener('resize', ()=>{ /* canvases are fixed-res; nothing to do */ });
})();
