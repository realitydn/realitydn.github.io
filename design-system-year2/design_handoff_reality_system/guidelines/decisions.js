// Click-to-pick for the canon decision cards. Blocks marked data-split take a separate Day and Night pick.
(function(){
  var KEY='reality-canon-picks',TKEY='reality-canon-theme';
  function load(){try{return JSON.parse(localStorage.getItem(KEY))||{}}catch(e){return{}}}
  function save(o){try{localStorage.setItem(KEY,JSON.stringify(o))}catch(e){}}
  function themes(){try{return JSON.parse(localStorage.getItem(TKEY))||{}}catch(e){return{}}}
  function saveThemes(o){try{localStorage.setItem(TKEY,JSON.stringify(o))}catch(e){}}
  function isSplit(q){return q.hasAttribute('data-split')}
  function keyFor(q,th){return isSplit(q)?q.getAttribute('data-q')+':'+th:q.getAttribute('data-q')}
  function themeOf(q){var t=themes();return t[q.getAttribute('data-q')]||'day'}

  function build(){
    document.querySelectorAll('[data-q][data-split]').forEach(function(q){
      if(q.querySelector('.thsw'))return;
      var sw=document.createElement('div');sw.className='thsw';
      sw.innerHTML='<button type="button" data-th="day">Day</button><button type="button" data-th="night">Night</button>';
      var h=q.querySelector('.dq-h');if(h)h.appendChild(sw);
    });
    // carry a round-1 single pick into both themes so nothing is lost
    var p=load(),dirty=false;
    document.querySelectorAll('[data-q][data-split]').forEach(function(q){
      var id=q.getAttribute('data-q');
      if(p[id]){if(!p[id+':day'])p[id+':day']=p[id];if(!p[id+':night'])p[id+':night']=p[id];delete p[id];dirty=true}
    });
    if(dirty)save(p);
  }

  function paint(){
    var picks=load(),qs=document.querySelectorAll('[data-q]:not([data-resolved])'),done=0,total=0;
    qs.forEach(function(q){
      var split=isSplit(q),th=themeOf(q);
      total+=split?2:1;
      if(split){
        q.querySelectorAll('.thsw button').forEach(function(b){b.setAttribute('aria-pressed',String(b.getAttribute('data-th')===th))});
        q.querySelectorAll('.stage').forEach(function(s){s.classList.toggle('scope-day',th==='day');s.classList.toggle('scope-night',th==='night')});
        if(picks[q.getAttribute('data-q')+':day'])done++;
        if(picks[q.getAttribute('data-q')+':night'])done++;
      }else if(picks[q.getAttribute('data-q')]){done++}
      var chosen=picks[keyFor(q,th)];
      q.querySelectorAll('.opt[data-pick]').forEach(function(o){
        var v=o.getAttribute('data-pick'),hit=v===chosen;
        o.setAttribute('data-picked',hit?'1':'0');
        var b=o.querySelector('.pick');
        if(b)b.textContent=split?(hit?'Chosen · '+th:'Choose '+v+' · '+th):(hit?'Chosen':'Choose '+v);
      });
    });
    var n=document.getElementById('tally-n');if(n)n.textContent=done;
    var of=document.getElementById('tally-of');if(of)of.textContent=total;
  }

  document.addEventListener('click',function(e){
    var th=e.target.closest('.thsw button');
    if(th){
      var q=th.closest('[data-q]'),t=themes();
      t[q.getAttribute('data-q')]=th.getAttribute('data-th');saveThemes(t);paint();return;
    }
    var btn=e.target.closest('.pick');
    if(btn){
      var opt=btn.closest('.opt[data-pick]'),qq=opt&&opt.closest('[data-q]');
      if(!qq)return;
      var picks=load(),k=keyFor(qq,themeOf(qq)),v=opt.getAttribute('data-pick');
      if(picks[k]===v)delete picks[k];else picks[k]=v;
      save(picks);paint();return;
    }
    if(e.target.closest('#tally-reset')){save({});paint();}
  });
  function init(){build();paint()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
