/* ============================================================
   INSPECTOR — one canonical order, every section a fold.
   ============================================================
   This used to be a flat wall: 82–88 controls and ~2,100px of
   scroll for a title, with folds only inside the photo panel.
   Now it reads the same way for every element type —

     Actions → Content → Type → Subtitle → Rows →
     Colour & surface → Shadow → Transform → Format override

   — and each section is a Fold that (a) carries a badge counting
   the props inside it that differ from this type's defaults, and
   (b) opens itself the first time it has something in it. Once
   you click a fold your choice is stored and wins from then on.

   Same shape as Print Studio's inspector, deliberately: the two
   tools are used within minutes of each other and there is no
   reason for "where is the size control" to have two answers.
   ============================================================ */
import { RUI } from '../../../studio-shared/studio-ui.jsx';
import { DEFAULTS as AP_DEF } from '../../studio-data.jsx';
import { posterDayOf } from '../../studio-element.jsx';
import { Fold } from '../controls.jsx';
import { PhotoControls } from '../photo-panel/index.jsx';
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

function Inspector({ el, doc, update, dup, del, layer, clearAll, setDoc, isOutput, activeLabel, overrideCount, resetOverride, toggleHidden, selCount, align, distribute, centre, formatLabel, sliceMode, setSliceMode, setFeedSlice, feedEvents }){
  if(!el) return <DocumentPanel doc={doc} setDoc={setDoc} isOutput={isOutput} clearAll={clearAll}
    sliceMode={sliceMode} setSliceMode={setSliceMode} setFeedSlice={setFeedSlice} />;

  const caps = TYPE_CAPS[el.type] || {};
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

      {/* ===================== CONTENT ===================== */}
      {/* A photo's content IS its image + press panels, which bring their own
          folds — wrapping them in one more would be a fold inside a fold for
          no gain. Everything else gets a Content fold of its own. */}
      {caps.media && <PhotoControls el={el} update={update} theme={doc.theme} accent={doc.accent} day={posterDayOf(doc)} />}
      {el.type==='block' && <Fold id="f-content" title="Block" dirty={dContent}><BlockControls el={el} doc={doc} update={update} /></Fold>}
      {el.type==='shape' && <Fold id="f-content" title="Shape" dirty={dContent}><ShapeControls el={el} doc={doc} update={update} /></Fold>}
      {el.type==='icon'  && <Fold id="f-content" title="Icon"  dirty={dContent}><IconControls  el={el} doc={doc} update={update} /></Fold>}
      {el.type==='rule'  && <Fold id="f-content" title="Rule"  dirty={dContent}><RuleControls  el={el} doc={doc} update={update} /></Fold>}
      {el.type==='burst' && <Fold id="f-content" title="Burst" dirty={dContent}><BurstControls el={el} doc={doc} update={update} /></Fold>}
      {el.type==='inkmark' && <Fold id="f-content" title="Ink mark" open><InkmarkControls el={el} doc={doc} update={update} /></Fold>}
      {hasContent && <Fold id="f-content" title="Content" open dirty={dContent}><ContentFields el={el} doc={doc} update={update} caps={caps} feedEvents={feedEvents} /></Fold>}

      {/* ===================== TYPE ===================== */}
      {(caps.size || caps.sizePreset || caps.weight || caps.align || isText) &&
        <TypeFold el={el} caps={caps} isText={isText} isOutput={isOutput} activeLabel={activeLabel} update={update} dType={dType} />}

      {/* ===================== SUBTEXT ===================== */}
      {caps.subtitle &&
        <SubtitleFold el={el} isOutput={isOutput} activeLabel={activeLabel} update={update} dSub={dSub} />}
      {el.type==='host' &&
        <KickerFold el={el} doc={doc} update={update} dKicker={dKicker} />}

      {/* ===================== ROWS ===================== */}
      {caps.list &&
        <RowsFold el={el} update={update} dRows={dRows} />}

      {/* ===================== COLOUR & SURFACE ===================== */}
      <SurfaceFold el={el} doc={doc} update={update} caps={caps} dSurface={dSurface} />

      {/* ===================== SHADOW ===================== */}
      {caps.shadow && <ShadowControls el={el} update={update} theme={doc.theme} />}

      {/* ===================== TRANSFORM ===================== */}
      <TransformFold el={el} update={update} caps={caps} isOutput={isOutput} activeLabel={activeLabel}
        selCount={selCount} centre={centre} formatLabel={formatLabel} dTransform={dTransform} />

      {/* ===================== PER-FORMAT OVERRIDE ===================== */}
      {isOutput &&
        <OverrideFold el={el} isText={isText} activeLabel={activeLabel} resetOverride={resetOverride} toggleHidden={toggleHidden} />}
    </React.Fragment>
  );
}

export { Inspector };
