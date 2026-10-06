/* ============================================================
   INSPECTOR — tabs by job, every section a fold.
   ============================================================
   One header row (what it is, where edits land, what you can do to
   it), then tabs (./tabs.jsx):
     photo, logo  Image · Press · Finish · Layout — the engine's order
     text, lists  Text (content, type, subtitle / kicker, rows) ·
                  Box (colour & surface, shadow) · Layout
     graphics     Shape (its own panel, shadow) · Layout
   Layout is the same everywhere: size & border (photos), shadow
   (photos), transform, this-format visibility.

   Each section is a Fold that (a) badges the props inside it that
   differ from this type's defaults, and (b) opens itself the first
   time it has something in it; a fold you've clicked keeps your
   choice. No fold holds another fold. Each tab shows the sum of its
   folds' counts, so a changed dial in a tab you aren't looking at
   still shows.
   ============================================================ */
import { RUI } from '../../../studio-shared/studio-ui.jsx';
import { DEFAULTS as AP_DEF } from '../../studio-data.jsx';
import { posterDayOf } from '../../studio-element.jsx';
import { Fold } from '../controls.jsx';
import { PhotoControls, photoDirt } from '../photo-panel/index.jsx';
import { familyOf, useTab, noteFamily, Tabs } from './tabs.jsx';
import { TYPE_CAPS } from './caps.js';
import { ShadowControls, SurfaceFold, fillMatters } from './appearance.jsx';
import { BlockControls, ShapeControls, IconControls, RuleControls, BurstControls } from './graphics.jsx';
import { InkmarkControls } from './inkmark.jsx';
import { ContentFields, TypeFold, SubtitleFold, KickerFold } from './text.jsx';
import { RowsFold } from './lists.jsx';
import { ArrangeFold, TransformFold, OverrideFold } from './layout.jsx';
import { DocumentPanel } from './document.jsx';
/* The header's six buttons, drawn rather than typed: ⤓/⤒ and ⧉ fall back to
   whatever symbol font the machine has, at whatever weight it has them. Square
   caps and mitres, like the rest of the chrome. The one-step pair stay the
   filled ▼ ▲ the hints refer to. */
const HEAD_ICONS = {
  back:  <path d="M7 1.5v7.5M3.8 5.8L7 9l3.2-3.2M2 12.5h10" />,
  down:  <path d="M2.5 4.5h9L7 10z" fill="currentColor" stroke="none" />,
  up:    <path d="M2.5 9.5h9L7 4z" fill="currentColor" stroke="none" />,
  front: <path d="M2 1.5h10M7 12.5V5M3.8 8.2L7 5l3.2 3.2" />,
  dup:   <path d="M2 9.5V2h7.5M4.5 4.5h7.5V12H4.5z" />,
  del:   <path d="M1.5 3.5h11M5.2 3.5V1.8h3.6v1.7M3 3.5l.8 9h6.4l.8-9M5.8 6v4.5M8.2 6v4.5" />,
};
function HeadIcon({ k }){
  return <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter" aria-hidden="true">{HEAD_ICONS[k]}</svg>;
}

function Inspector({ el, doc, update, dup, del, layer, clearAll, setDoc, isOutput, activeLabel, overrideCount, resetOverride, toggleHidden, selCount, align, distribute, centre, formatLabel, feedEvents }){
  const caps = el ? (TYPE_CAPS[el.type] || {}) : {};
  /* hooks before the early return — the tab is remembered per family */
  const family = el ? familyOf(el, caps) : 'text';
  const tab = useTab(family);
  noteFamily(el ? family : null);
  if(!el) return <DocumentPanel doc={doc} setDoc={setDoc} isOutput={isOutput} clearAll={clearAll} />;

  const isText = !!caps.text;

  /* Badges + auto-open, counted against what this type is born with. Note the
     box defaults (w/h/anchor/rot) live OUTSIDE DEFAULTS[type].props — fold them
     in, or `anchor:'safe'` reads as an edit on every element ever made. */
  const _D = AP_DEF[el.type] || {};
  const base = Object.assign({ w:_D.w, h:_D.h, anchor:_D.anchor||'safe', rot:0 }, _D.props||{});
  const dirt = (keys)=>RUI.dirtyCount(el, keys, base);
  const dContent   = dirt(['text','name','heading','items','raw','label','site','addr','top','big','sub',
                           'price','time','every','day','allYear','comp','teamA','teamB','date','vs',
                           'variant','showQR','mark','markForm','markMode','kind','preset','glyph','pattern']);
  const dType      = dirt(['fontSize','weight','letterSpacing','lineHeight','align','textInset','orient','textColor','headingSize']);
  // fill only counts where it does something — a hidden control can't badge its fold
  const dSurface   = dirt(fillMatters(el) ? ['surface','fill'] : ['surface']);
  const dSub       = dirt(['subtitle','subSize','subWeight','subTracking','subColor','subLayout']);
  const dKicker    = dirt(['kicker','kickerColor']);
  const dRows      = dirt(['rowSize','rowWeight','rowTracking','rowGap','markerKey']);
  const dTransform = dirt(['rot','anchor']);   // NOT w/h/x/y — placing a box sets those, so counting them badges everything

  const hasContent = ['title','tagline','info','when','cost','stamp','host','ticket','qr','badge','wordmark','weekly','matchup'].indexOf(el.type)>=0 || !!caps.list;

  /* what each tab shows a count for: dials moved off this type's defaults */
  const PD = family==='media' ? photoDirt(el) : null;
  const layoutN = dTransform + (el._overridden?1:0) + (PD ? PD.placeDirty : 0);
  const counts = family==='media' ? Object.assign({}, PD.tabs, { layout:layoutN })
               : family==='text'  ? { text:dContent+dType+dSub+dKicker+dRows, box:dSurface, layout:layoutN }
               :                    { shape:dContent, layout:layoutN };
  const photo = (t)=> <PhotoControls el={el} update={update} theme={doc.theme} accent={doc.accent} day={posterDayOf(doc)} tab={t} />;

  return (
    <React.Fragment>
      {selCount>=2 &&
        <ArrangeFold selCount={selCount} align={align} distribute={distribute} centre={centre} formatLabel={formatLabel} del={del} />}

      {/* ---- the header: what it is, where edits land, what you can do to it ----
          One row. It was a section head plus two rows of labelled buttons
          (stacking, then Duplicate/Delete) under a separate Master/format
          banner — ~130px before the first control. The type and the scope
          chip stack on the left; the buttons are icons, each keeping its
          tooltip (shortcut, and the every-format delete warning). The chip
          is the banner's replacement while something is selected: MASTER, or
          the format you're editing (DETACHED once this element's layout
          there is its own), with the banner's sentence as its tooltip. */}
      <div className="rs-elhead">
        <div className="who">
          <span className="ty">{el.type}</span>
          {isOutput
            ? <span className={'rs-scope out'+(el._overridden?' det':'')}
                title={activeLabel+' output · layout edits override Master'
                  +(overrideCount?' · '+overrideCount+' overridden in '+activeLabel:'')
                  +(el._overridden?'. This element’s layout is detached for '+activeLabel+' — reset it under “'+activeLabel+' only”.':'')}>
                {activeLabel}{el._overridden?' · detached':''}</span>
            : <span className="rs-scope" title="Master source · edits flow to every format">Master</span>}
          {/* its own line, so a long chip can never squeeze it out */}
          {selCount>=2 && <small className="cnt" title={'The last of the '+selCount+' selected — the one these controls edit'}>last of {selCount}</small>}
        </div>
        <div className="rs-elbtns">
          <button className="rs-hbtn" onClick={()=>layer('back')} title="Send to back"><HeadIcon k="back" /></button>
          <button className="rs-hbtn" onClick={()=>layer(-1)} title="Send back one"><HeadIcon k="down" /></button>
          <button className="rs-hbtn" onClick={()=>layer(1)} title="Bring forward one"><HeadIcon k="up" /></button>
          <button className="rs-hbtn" onClick={()=>layer('front')} title="Bring to front"><HeadIcon k="front" /></button>
          <span className="gap" />
          <button className="rs-hbtn" onClick={dup} title="Duplicate (Ctrl-D)"><HeadIcon k="dup" /></button>
          <button className="rs-hbtn rs-del" onClick={del}
            title={isOutput ? 'Delete from EVERY format — to drop it from '+activeLabel+' only, set Visibility to Hidden below' : 'Delete'}><HeadIcon k="del" /></button>
        </div>
      </div>

      <Tabs family={family} value={tab} counts={counts} />

      {/* ===================== PHOTO / LOGO: Image · Press · Finish ===================== */}
      {family==='media' && tab!=='layout' && photo(tab)}

      {/* ===================== TEXT: content, type, subtext, rows ===================== */}
      {family==='text' && tab==='text' && <React.Fragment>
        {hasContent && <Fold id="f-content" title="Content" open dirty={dContent}><ContentFields el={el} doc={doc} update={update} caps={caps} feedEvents={feedEvents} /></Fold>}
        {(caps.size || caps.sizePreset || caps.weight || caps.align || isText) &&
          <TypeFold el={el} caps={caps} isText={isText} isOutput={isOutput} activeLabel={activeLabel} update={update} dType={dType} />}
        {caps.subtitle &&
          <SubtitleFold el={el} isOutput={isOutput} activeLabel={activeLabel} update={update} dSub={dSub} />}
        {el.type==='host' &&
          <KickerFold el={el} doc={doc} update={update} dKicker={dKicker} />}
        {caps.list &&
          <RowsFold el={el} update={update} dRows={dRows} />}
      </React.Fragment>}

      {/* ===================== BOX: colour & surface, shadow ===================== */}
      {family==='text' && tab==='box' && <React.Fragment>
        <SurfaceFold el={el} doc={doc} update={update} caps={caps} dSurface={dSurface} />
        {caps.shadow && <ShadowControls el={el} update={update} theme={doc.theme} />}
      </React.Fragment>}

      {/* ===================== SHAPE: the graphic's own panel, shadow ===================== */}
      {family==='graphic' && tab==='shape' && <React.Fragment>
        {el.type==='block' && <Fold id="f-content" title="Block" open dirty={dContent}><BlockControls el={el} doc={doc} update={update} /></Fold>}
        {el.type==='shape' && <Fold id="f-content" title="Shape" open dirty={dContent}><ShapeControls el={el} doc={doc} update={update} /></Fold>}
        {el.type==='icon'  && <Fold id="f-content" title="Icon" open dirty={dContent}><IconControls  el={el} doc={doc} update={update} /></Fold>}
        {el.type==='rule'  && <Fold id="f-content" title="Rule" open dirty={dContent}><RuleControls  el={el} doc={doc} update={update} /></Fold>}
        {el.type==='burst' && <Fold id="f-content" title="Burst" open dirty={dContent}><BurstControls el={el} doc={doc} update={update} /></Fold>}
        {el.type==='inkmark' && <Fold id="f-content" title="Ink mark" open><InkmarkControls el={el} doc={doc} update={update} /></Fold>}
        {caps.shadow && <ShadowControls el={el} update={update} theme={doc.theme} />}
      </React.Fragment>}

      {/* ===================== LAYOUT: the same tab for everything ===================== */}
      {tab==='layout' && <React.Fragment>
        {family==='media' && photo('layout')}
        {family==='media' && caps.shadow && <ShadowControls el={el} update={update} theme={doc.theme} />}
        <TransformFold el={el} update={update} caps={caps} isOutput={isOutput} activeLabel={activeLabel}
          selCount={selCount} centre={centre} formatLabel={formatLabel} dTransform={dTransform} />
        {isOutput &&
          <OverrideFold el={el} isText={isText} activeLabel={activeLabel} resetOverride={resetOverride} toggleHidden={toggleHidden} />}
      </React.Fragment>}
    </React.Fragment>
  );
}

export { Inspector };
