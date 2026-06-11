/* REALITY DS — theme + accent + poster scaling + QR placeholders */
(function(){
  var root=document.documentElement, body=document.body;
  var LS='reality-ds-v2';
  var state=Object.assign({theme:'light',accent:'pink'},
    JSON.parse(localStorage.getItem(LS)||'{}'));

  /* lead accent -> {var, second misregistration layer} */
  var ACCENTS={
    yellow:{a:'var(--yellow)', b:'var(--red)'},
    red:   {a:'var(--red)',    b:'var(--yellow)'},
    blue:  {a:'var(--blue)',   b:'var(--pink)'},
    pink:  {a:'var(--pink)',   b:'var(--blue)'},
    amber: {a:'var(--amber)',  b:'var(--red)'},
    green: {a:'var(--green)',  b:'var(--purple)'},
    purple:{a:'var(--purple)', b:'var(--amber)'}
  };

  function save(){try{localStorage.setItem(LS,JSON.stringify(state));}catch(e){}}

  function apply(){
    root.setAttribute('data-theme',state.theme);
    var ac=ACCENTS[state.accent]||ACCENTS.pink;
    root.style.setProperty('--accent',ac.a);
    root.style.setProperty('--accent-2',ac.b);
    document.querySelectorAll('[data-theme-btn]').forEach(function(b){
      b.setAttribute('aria-pressed', String(b.dataset.themeBtn===state.theme));
    });
    document.querySelectorAll('[data-accent-btn]').forEach(function(b){
      b.setAttribute('aria-pressed', String(b.dataset.accentBtn===state.accent));
    });
    save();
  }

  document.addEventListener('click',function(e){
    var t=e.target.closest('[data-theme-btn],[data-accent-btn]');
    if(!t) return;
    if(t.dataset.themeBtn) state.theme=t.dataset.themeBtn;
    else if(t.dataset.accentBtn) state.accent=t.dataset.accentBtn;
    apply();
  });

  /* responsive poster scaling: design @1080 wide, fit frame */
  function scalePosters(){
    document.querySelectorAll('.frame').forEach(function(frame){
      var p=frame.querySelector('.poster'); if(!p) return;
      p.style.transform='scale('+(frame.clientWidth/1080)+')';
    });
  }
  window.addEventListener('resize',scalePosters);
  if(window.ResizeObserver){
    var ro=new ResizeObserver(scalePosters);
    document.querySelectorAll('.frame').forEach(function(f){ro.observe(f);});
  }

  /* fake QR placeholder — grid of squares with corner finders */
  function buildQR(){
    document.querySelectorAll('.qr[data-qr]').forEach(function(q){
      if(q.childElementCount) return;
      var seed=(q.dataset.qr||'r').charCodeAt(0)||7, frag=document.createDocumentFragment();
      for(var i=0;i<121;i++){
        var c=document.createElement('i'), r=Math.floor(i/11), col=i%11;
        var on, lr=r, lc=col, finder=false;
        if(r<3&&col<3){finder=true;}
        else if(r<3&&col>7){finder=true;lc=col-8;}
        else if(r>7&&col<3){finder=true;lr=r-8;}
        if(finder){ on=(lr===0||lr===2||lc===0||lc===2||(lr===1&&lc===1)); }
        else { on=(((i*seed*37+i*i*13)%100)>52); }
        if(on) c.className='on';
        frag.appendChild(c);
      }
      q.appendChild(frag);
    });
  }

  function init(){buildQR();apply();scalePosters();setTimeout(scalePosters,250);}
  if(document.readyState!=='loading') init();
  else document.addEventListener('DOMContentLoaded',init);
  if(document.fonts&&document.fonts.ready) document.fonts.ready.then(scalePosters);
})();
