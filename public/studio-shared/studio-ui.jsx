/* ============================================================
   REALITY STUDIO UI — the control atoms both Studios share.
   ============================================================
   Poster Studio and Print Studio grew the same components twice:
   Field, Slider, Chips, ScaleControl, Fold — near-identical code
   behind different class prefixes, drifting apart every time one
   of them gained a feature (Print got NumField, undo and folds;
   Poster got graphics grids and per-format overrides). This file
   is the single copy. Both pages load it BEFORE their app script.

   The prefix is the only thing that differs, so it's config:
     RUI.configure({ prefix:'rs', storeKey:'reality-studio' })
   Every class name is built as `${prefix}-row`, `${prefix}-lab`…
   which is exactly what both CSS files already call them.

   Three things live here that neither Studio had before:

   1. FOLD STATE PERSISTS. Both had `const _foldOpen = {}` — a
      module-level object, wiped on reload, so every section you
      collapsed came back on the next open. It's localStorage now.

   2. HINTS ARE A MODE. The inline help (67 paragraphs in Poster)
      is good writing that doesn't need to be on screen forever.
      <Hint> renders only when hints are on; one topbar toggle
      flips them, and the setting sticks.

   3. CONTROLS ARE SEARCHABLE. Fold walks its children's React
      element tree at construction time — which works even while
      the fold is CLOSED, because JSX builds the child elements
      either way — and harvests every `label`. That index is what
      Ctrl-K searches, so "dot gain" finds a slider six folds deep
      without you remembering it lives under Treatment.

   Exposed as window.RUI. No build step of its own beyond the JSX
   compile every Studio file already goes through.
   ============================================================ */

/* Wrapped in an IIFE on purpose. These are classic scripts sharing one global
   scope, so a top-level `function Field(){}` here would collide with the
   `const { Field } = RUI` alias each Studio declares. Only window.RUI escapes. */
(function(){
  /* ---------- config ---------- */
  const CFG = { prefix:'rs', storeKey:'reality-studio' };
  function cls(suffix){ return CFG.prefix + '-' + suffix; }

  /* ---------- a minimal external store (subscribe + snapshot) ----------
     Hints and fold state are read by dozens of components at every depth.
     Threading them through props would mean touching every signature; a
     context would re-render the whole inspector on each toggle. This is
     the smallest thing that works: a Set of listeners and a hook. */
  function makeStore(initial){
    let value = initial;
    const subs = new Set();
    return {
      get(){ return value; },
      set(next){ value = next; subs.forEach(fn=>fn()); },
      subscribe(fn){ subs.add(fn); return ()=>subs.delete(fn); },
    };
  }
  function useStore(store, pick){
    const [, bump] = React.useState(0);
    React.useEffect(()=>store.subscribe(()=>bump(n=>n+1)), [store]);
    return pick ? pick(store.get()) : store.get();
  }

  /* ---------- persisted maps ---------- */
  function lsGet(key, fallback){
    try{ const r = localStorage.getItem(key); if(r){ const v = JSON.parse(r); if(v && typeof v==='object') return v; } }catch(e){}
    return fallback;
  }
  function lsSet(key, value){ try{ localStorage.setItem(key, JSON.stringify(value)); }catch(e){} }

  /* Fold open/closed. A key is present ONLY once the user has clicked that
     fold — absence means "nobody has an opinion", which is what lets the
     dirty-count auto-open rule apply without ever overriding a real choice. */
  const foldStore = makeStore({});
  /* Hints off by default. The help text isn't gone — it's one click away and
     the first-run banner says so. */
  const hintStore = makeStore(false);

  function hydrate(){
    foldStore.set(lsGet(CFG.storeKey+':folds', {}));
    let h = false;
    try{ h = localStorage.getItem(CFG.storeKey+':hints')==='1'; }catch(e){}
    hintStore.set(h);
  }

  function setFold(id, open){
    const next = Object.assign({}, foldStore.get()); next[id] = !!open;
    foldStore.set(next); lsSet(CFG.storeKey+':folds', next);
  }
  function hintsOn(){ return hintStore.get(); }
  function setHints(on){
    hintStore.set(!!on);
    try{ localStorage.setItem(CFG.storeKey+':hints', on?'1':'0'); }catch(e){}
  }

  /* ============================================================
     CONTROL INDEX — what Ctrl-K searches.
     ============================================================
     Walks a React element tree WITHOUT rendering it. JSX evaluates
     `<Slider label="Dot gain" …/>` into a plain object the moment
     the parent's children array is built, so a Fold can read the
     labels of controls it is not currently showing. That's the
     whole trick: a closed fold still indexes its contents.

     Conditional children (`{cond && <Slider/>}`) collapse to false
     when the condition is off, so those index on the first render
     where they apply — the index fills in as you work. */
  const indexStore = makeStore({});     // foldId -> { title, labels:[…] }
  const INDEX = {};                     // the live copy Fold writes into
  let flushQueued = false;
  let actions = [];                     // app-supplied global commands

  function harvest(node, out, depth){
    if(node==null || node===false || node===true || depth>14) return out;
    if(Array.isArray(node)){ for(const n of node) harvest(n, out, depth+1); return out; }
    if(typeof node!=='object') return out;
    const p = node.props;
    if(!p) return out;
    if(typeof p.label==='string' && p.label) out.push(p.label);
    // section headers are plain divs with a string child
    if(typeof p.className==='string' && p.className.indexOf('-sech')>=0 && typeof p.children==='string') out.push(p.children);
    if(p.children!=null) harvest(p.children, out, depth+1);
    return out;
  }

  function indexFold(id, title, children){
    const labels = harvest(children, [], 0);
    if(!labels.length && !title) return;
    const prev = INDEX[id];
    // Merge rather than replace: a fold's conditional controls appear over
    // several selections, and forgetting the ones not showing right now would
    // make search results flicker in and out.
    const merged = prev ? prev.labels : [];
    let changed = !prev || prev.title!==title;
    for(const l of labels) if(merged.indexOf(l)<0){ merged.push(l); changed = true; }
    if(!changed) return;
    INDEX[id] = { title, labels:merged };
    // Publish on a microtask, never inside Fold's render — an open Palette
    // subscribes to this store, and React rightly objects to one component
    // setting another's state mid-render.
    if(flushQueued) return;
    flushQueued = true;
    Promise.resolve().then(()=>{ flushQueued = false; indexStore.set(Object.assign({}, INDEX)); });
  }

  function setActions(list){ actions = list||[]; }

  /* Open the fold a control lives in, scroll to it, and flash it. */
  function reveal(foldId, label){
    if(foldId) setFold(foldId, true);
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      const scope = document.querySelector('.'+cls('inspector')) || document;
      let hit = null;
      if(label){
        const cands = scope.querySelectorAll('.'+cls('lab')+', .'+cls('sech')+', .'+cls('foldhead')+' .t');
        for(const n of cands){
          const t = (n.textContent||'').trim();
          if(t===label || t.indexOf(label)===0){ hit = n; break; }
        }
      }
      if(!hit && foldId) hit = scope.querySelector('[data-fold="'+foldId+'"]');
      if(!hit) return;
      const row = hit.closest('.'+cls('row')) || hit.closest('.'+cls('fold')) || hit;
      row.scrollIntoView({ block:'center', behavior:'smooth' });
      row.classList.add(cls('flash'));
      setTimeout(()=>row.classList.remove(cls('flash')), 1300);
    }));
  }

  /* ---------- atoms ---------- */
  function Hint({ children, tight }){
    const on = useStore(hintStore);
    if(!on) return null;
    return <div className={cls('mini')} style={tight?{ margin:'-2px 0 8px' }:{ margin:'2px 0 8px' }}>{children}</div>;
  }

  function Field({ label, value, onChange, area, mono, placeholder, minHeight }){
    return (
      <div className={cls('row')}>
        {label && <div className={cls('lab')}>{label}</div>}
        {area
          ? <textarea className={cls('area')} value={value||''} spellCheck={false} placeholder={placeholder}
              style={minHeight?{ minHeight }:null} onChange={e=>onChange(e.target.value)} />
          : <input className={cls('input')+(mono?' mono':'')} value={value||''} spellCheck={false} placeholder={placeholder}
              onChange={e=>onChange(e.target.value)} />}
      </div>
    );
  }

  function Slider({ label, val, min, max, step, onChange, suffix }){
    return (
      <div className={cls('row')}>
        <div className={cls('lab')}>{label}<span className="val">{val}{suffix||''}</span></div>
        <input className={cls('slider')} type="range" min={min} max={max} step={step||1} value={val}
          onChange={e=>onChange(parseFloat(e.target.value))} />
      </div>
    );
  }

  function Chips({ label, options, value, onChange }){
    return (
      <div className={cls('row')}>
        {label && <div className={cls('lab')}>{label}</div>}
        <div className={cls('chips')}>
          {options.map(o=>(
            <button key={String(o.v)} className={cls('chip')+(value===o.v?' on':'')}
              title={o.t||null} onClick={()=>onChange(o.v)}>{o.l}</button>
          ))}
        </div>
      </div>
    );
  }

  /* Type size on the canon ladder — the ± buttons step rungs, the slider
     scrubs them. `scale` is the ladder array, `snap`/`step` the studio's own
     maths (px in Poster, pt in Print). */
  function ScaleControl({ label, val, onChange, scale, snap, step, suffix, note }){
    const idx = scale.indexOf(snap(val));
    return (
      <div className={cls('row')}>
        <div className={cls('lab')}>{label}<span className="val">{val}{suffix||''}{note?' · '+note:''}</span></div>
        <div className={cls('stepper')}>
          <button onClick={()=>onChange(step(val,-1))} aria-label="Smaller">A−</button>
          <input className={cls('slider')} type="range" min={0} max={scale.length-1} step={1} value={idx<0?0:idx}
            onChange={e=>onChange(scale[parseInt(e.target.value)])} />
          <button onClick={()=>onChange(step(val,1))} aria-label="Bigger">A+</button>
        </div>
      </div>
    );
  }

  /* numeric field — the precise cousin of the position sliders */
  function NumField({ label, value, onChange, min, step }){
    const [txt, setTxt] = React.useState(null);
    const shown = txt!=null ? txt : String(value!=null?value:0);
    const commit = (s)=>{ const v=parseFloat(s); if(!isNaN(v)) onChange(min!=null?Math.max(min,v):v); setTxt(null); };
    return (
      <label className={cls('num')}>
        <span>{label}</span>
        <input type="number" step={step||1} value={shown}
          onChange={e=>{ setTxt(e.target.value); const v=parseFloat(e.target.value); if(!isNaN(v)) onChange(min!=null?Math.max(min,v):v); }}
          onBlur={e=>commit(e.target.value)}
          onKeyDown={e=>{ if(e.key==='Enter'){ commit(e.currentTarget.value); e.currentTarget.blur(); } }} />
      </label>
    );
  }

  /* ============================================================
     FOLD — the collapsible inspector section.
     ============================================================
     `dirty` is the count of props inside that differ from this
     element's defaults. It does two jobs: it's the badge (so a
     collapsed fold still tells you something is set in there), and
     it auto-opens the fold the first time you meet it. A fold the
     user has actually clicked is never auto-anything again — their
     choice is in the store and wins from then on. */
  function Fold({ id, title, open, badge, dirty, hint, children }){
    indexFold(id, title, children);
    const folds = useStore(foldStore);
    const chosen = folds[id];
    const isOpen = chosen!=null ? chosen : (!!open || (dirty|0) > 0);
    const mark = badge!=null && badge!=='' ? badge : ((dirty|0) > 0 ? String(dirty) : null);
    return (
      <div className={cls('fold')+(isOpen?' open':'')} data-fold={id}>
        <button type="button" className={cls('foldhead')} onClick={()=>setFold(id, !isOpen)}>
          <span className="chev">{isOpen?'▾':'▸'}</span><span className="t">{title}</span>
          {mark!=null ? <span className="badge">{mark}</span> : null}
        </button>
        {isOpen && <div className={cls('foldbody')}>
          {hint && <Hint>{hint}</Hint>}
          {children}
        </div>}
      </div>
    );
  }
  Fold.__ruiFold = true;

  /* ---------- dirtiness ----------
     A prop counts as touched when it differs from the baseline the element
     was born with. Both Studios keep a full DEFAULTS[type].props map, so the
     baseline is real data rather than a hand-maintained second list. */
  function isSet(el, key, baseline){
    const cur = el[key];
    const def = baseline ? baseline[key] : undefined;
    // Unset reads as untouched: the renderer falls back to the same default, and
    // elements saved before a prop existed must not all count as edited.
    if(cur===undefined || cur===null) return false;
    // No baseline for this prop (shadow dials, per-format overrides) — treat the
    // empty-ish values as off rather than guessing.
    if(def===undefined) return !(cur===false || cur===0 || cur==='' || cur==='none' || cur==='auto');
    if(typeof cur==='object' || typeof def==='object') return JSON.stringify(cur)!==JSON.stringify(def);
    return cur!==def;
  }
  function dirtyCount(el, keys, baseline){
    if(!el) return 0;
    let n = 0;
    for(const k of keys) if(isSet(el, k, baseline)) n++;
    return n;
  }

  /* ============================================================
     COMMAND PALETTE — Ctrl-K.
     ============================================================
     ~300 controls is past the point where remembering where each
     one lives is realistic. This searches the harvested index plus
     whatever global actions the app registered (formats, theme,
     accents, export, toggles) and jumps you there. */
  function Palette({ onClose }){
    const [q, setQ] = React.useState('');
    const [sel, setSel] = React.useState(0);
    const idx = useStore(indexStore);
    const inputRef = React.useRef(null);
    React.useEffect(()=>{ if(inputRef.current) inputRef.current.focus(); }, []);

    const results = React.useMemo(()=>{
      const needle = q.trim().toLowerCase();
      const out = [];
      for(const a of actions){
        if(!needle || a.label.toLowerCase().indexOf(needle)>=0 || (a.group||'').toLowerCase().indexOf(needle)>=0)
          out.push({ kind:'action', label:a.label, group:a.group||'Action', run:a.run });
      }
      for(const id of Object.keys(idx)){
        const f = idx[id];
        for(const l of f.labels){
          if(!needle || l.toLowerCase().indexOf(needle)>=0 || (f.title||'').toLowerCase().indexOf(needle)>=0)
            out.push({ kind:'control', label:l, group:f.title||'Inspector', foldId:id });
        }
      }
      // exact prefix matches first — typing "dot" should surface "Dot size"
      // above "Hand-set jitter" just because the latter's fold matched.
      const needleLc = needle;
      out.sort((a,b)=>{
        const ax = a.label.toLowerCase().indexOf(needleLc)===0 ? 0 : 1;
        const bx = b.label.toLowerCase().indexOf(needleLc)===0 ? 0 : 1;
        if(ax!==bx) return ax-bx;
        if(a.kind!==b.kind) return a.kind==='action' ? -1 : 1;
        return a.label.localeCompare(b.label);
      });
      return out.slice(0, 60);
    }, [q, idx]);

    React.useEffect(()=>{ setSel(0); }, [q]);

    function go(r){
      if(!r) return;
      onClose();
      if(r.kind==='action') r.run();
      else reveal(r.foldId, r.label);
    }
    function onKey(e){
      if(e.key==='Escape'){ e.preventDefault(); onClose(); }
      else if(e.key==='ArrowDown'){ e.preventDefault(); setSel(s=>Math.min(s+1, results.length-1)); }
      else if(e.key==='ArrowUp'){ e.preventDefault(); setSel(s=>Math.max(s-1, 0)); }
      else if(e.key==='Enter'){ e.preventDefault(); go(results[sel]); }
    }

    return (
      <div className={cls('palwrap')} onClick={onClose}>
        <div className={cls('pal')} onClick={e=>e.stopPropagation()}>
          <input ref={inputRef} className={cls('palq')} value={q} spellCheck={false}
            placeholder="Search controls and commands…" onChange={e=>setQ(e.target.value)} onKeyDown={onKey} />
          <div className={cls('pallist')}>
            {results.length===0 &&
              <div className={cls('palempty')}>
                Nothing matching. Controls are indexed as you meet them — select an
                element of that kind once and its dials become searchable.
              </div>}
            {results.map((r,i)=>(
              <button key={r.kind+':'+r.group+':'+r.label+':'+i}
                className={cls('palrow')+(i===sel?' on':'')}
                onMouseEnter={()=>setSel(i)} onClick={()=>go(r)}>
                <span className="l">{r.label}</span>
                <span className="g">{r.group}</span>
              </button>
            ))}
          </div>
          <div className={cls('palfoot')}>↑↓ move · ⏎ go · esc close</div>
        </div>
      </div>
    );
  }

  /* Wire Ctrl-K / ⌘-K once. Returns [open, setOpen] for the app to render. */
  function usePalette(){
    const [open, setOpen] = React.useState(false);
    React.useEffect(()=>{
      function onKey(e){
        if((e.ctrlKey||e.metaKey) && (e.key==='k'||e.key==='K')){ e.preventDefault(); setOpen(o=>!o); }
      }
      window.addEventListener('keydown', onKey);
      return ()=>window.removeEventListener('keydown', onKey);
    }, []);
    return [open, setOpen];
  }

  /* Hints toggle for the topbar. */
  function HintsToggle(){
    const on = useStore(hintStore);
    return (
      <button className={cls('iconbtn')+(on?' on':'')} onClick={()=>setHints(!on)}
        title={on ? 'Hide the explanatory notes under each control' : 'Show the explanatory notes under each control'}>
        Hints
      </button>
    );
  }

  function configure(opts){
    if(opts && opts.prefix) CFG.prefix = opts.prefix;
    if(opts && opts.storeKey) CFG.storeKey = opts.storeKey;
    hydrate();
  }

  window.RUI = {
    configure, cls,
    Field, Slider, Chips, ScaleControl, NumField, Fold, Hint, HintsToggle,
    Palette, usePalette,
    hintsOn, setHints, useStore, hintStore, foldStore, setFold,
    dirtyCount, isSet, reveal, setActions, indexStore,
  };
})();
