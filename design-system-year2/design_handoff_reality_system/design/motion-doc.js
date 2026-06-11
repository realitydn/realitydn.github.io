/* REALITY — Motion spec · live demos (duration bars, chip pop, theme crossfade) */
(function(){
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function runBars(){
    document.querySelectorAll('.dbar').forEach(function(bar){
      var ms = parseInt(bar.dataset.ms,10)||300;
      bar.style.transition='none'; bar.style.width='0%';
      void bar.offsetWidth;
      bar.style.transition='width '+ms+'ms var(--ease-out)';
      bar.style.width='100%';
    });
  }
  function popChips(){
    document.querySelectorAll('.pop-chip').forEach(function(c,i){
      setTimeout(function(){ c.classList.remove('go'); void c.offsetWidth; c.classList.add('go'); }, i*120);
    });
  }
  function flip(){
    document.querySelectorAll('.fade-sw').forEach(function(s){ s.classList.toggle('night'); });
  }
  function replay(){ runBars(); popChips(); }

  var btn=document.getElementById('moReplay');
  if(btn) btn.addEventListener('click', replay);

  // first paint + gentle auto-loop (unless reduced motion)
  setTimeout(replay, 300);
  if(!reduce){
    setInterval(replay, 3000);
    setInterval(flip, 2600);
  }
})();
