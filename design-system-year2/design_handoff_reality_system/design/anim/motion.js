/* REALITY DS — Motion section player (ported from the Animation Lab).
   Scoped to #motion so it never touches the rest of the page. */
(function(){
  var section=document.getElementById('motion');
  if(!section) return;

  var _kfSeen=new Set(), _kfStyle=null;
  function ensureKf(name, endPx, over){
    if(_kfSeen.has(name)) return;
    _kfSeen.add(name);
    if(!_kfStyle){_kfStyle=document.createElement('style');document.head.appendChild(_kfStyle);}
    _kfStyle.textContent +=
      '@keyframes '+name+'{0%{transform:translateY(0)}'+
      '80%{transform:translateY('+(endPx-over)+'px)}'+
      '100%{transform:translateY('+endPx+'px)}}';
  }

  function counter(stage){
    stage.querySelectorAll('.d-counter').forEach(function(el){
      var to=String(parseInt(el.dataset.to,10));
      var digits=to.split('');
      el.innerHTML='';
      var fs=parseFloat(getComputedStyle(el).fontSize);
      digits.forEach(function(d,i){
        var target=parseInt(d,10);
        var col=document.createElement('div'); col.className='col';
        var roll=document.createElement('div'); roll.className='col-roll';
        var spins=2+i, seq=[], s,n;
        for(s=0;s<spins;s++){for(n=0;n<10;n++)seq.push(n);}
        for(n=0;n<=target;n++)seq.push(n);
        seq.push(target);
        seq.forEach(function(num){var sp=document.createElement('span');sp.textContent=num;roll.appendChild(sp);});
        var targetIdx=seq.length-2;
        var endPx=-targetIdx*fs;
        var over=0.2*fs;
        var dur=700+i*140;
        var name='cr_'+targetIdx+'_'+Math.round(fs);
        ensureKf(name, endPx, over);
        col.style.setProperty('--dur', dur+'ms');
        roll.style.animation=name+' '+dur+'ms cubic-bezier(0.16,1,0.3,1) forwards';
        col.appendChild(roll); el.appendChild(col);
      });
    });
  }

  function kinetic(stage){
    var el=stage.querySelector('.d-kinetic');
    if(!el) return;
    var words=el.dataset.words.split('|');
    var layers=[].slice.call(el.querySelectorAll('.k-layer'));
    var cream=el.querySelector('.k-cream');
    words.forEach(function(w,i){
      setTimeout(function(){
        layers.forEach(function(L){L.textContent=w;});
        cream.style.color = (i===words.length-1) ? 'var(--yellow)' : 'var(--cream)';
        el.classList.remove('go'); void el.offsetWidth; el.classList.add('go');
      }, i*700);
    });
  }

  function play(stage){
    stage.classList.remove('play');
    void stage.offsetWidth;
    stage.classList.add('play');
    counter(stage);
    kinetic(stage);
  }

  section.querySelectorAll('.tile').forEach(function(tile){
    var stage=tile.querySelector('.tile-stage');
    if(!stage) return;
    tile.addEventListener('click',function(){play(stage);});
    tile.addEventListener('mouseenter',function(){play(stage);});
  });

  var replayAll=section.querySelector('#moReplayAll');
  if(replayAll) replayAll.addEventListener('click',function(){
    section.querySelectorAll('.tile-stage').forEach(function(s,i){
      setTimeout(function(){play(s);}, i*90);
    });
  });

  /* continuous auto-loop — staggered so the grid ripples, not pulses */
  var stages=[].slice.call(section.querySelectorAll('.tile-stage'));
  var CADENCE=3800, autoOn=true, timers=[];
  var reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function startAuto(){
    stopAuto();
    stages.forEach(function(s,i){
      var phase=i*240;
      timers.push(setTimeout(function tick(){
        if(!autoOn) return;
        play(s);
        timers.push(setTimeout(tick, CADENCE));
      }, phase));
    });
  }
  function stopAuto(){ timers.forEach(clearTimeout); timers=[]; }

  var toggle=section.querySelector('#moAutoToggle');
  function setToggle(){
    if(!toggle) return;
    toggle.setAttribute('aria-pressed', String(autoOn));
    toggle.textContent = autoOn ? 'Auto-loop · On' : 'Auto-loop · Off';
  }
  if(toggle) toggle.addEventListener('click',function(){
    autoOn=!autoOn; setToggle();
    if(autoOn) startAuto(); else stopAuto();
  });

  /* only auto-run when the section is on-screen, to stay light */
  var started=false;
  function kick(){
    if(started) return; started=true;
    stages.forEach(function(s,i){setTimeout(function(){play(s);}, 120+i*80);});
    if(!reduce) setTimeout(startAuto, 1500); else { autoOn=false; setToggle(); }
  }
  if(reduce){ autoOn=false; setToggle(); }

  if(window.IntersectionObserver){
    var io=new IntersectionObserver(function(entries){
      entries.forEach(function(e){ if(e.isIntersecting){ kick(); io.disconnect(); } });
    },{threshold:0.08});
    io.observe(section);
  } else {
    window.addEventListener('load',kick);
  }
})();
