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
import { ShadowControls, SurfaceFold } from './appearance.jsx';
import { BlockControls, ShapeControls, IconControls, RuleControls, BurstControls } from './graphics.jsx';
import { InkmarkControls } from './inkmark.jsx';
import { ContentFields, TypeFold, SubtitleFold, KickerFold } from './text.jsx';
import { RowsFold } from './lists.jsx';
import { ArrangeFold, TransformFold, OverrideFold } from './layout.jsx';
import { DocumentPanel } from './document.jsx';
function Inspector({ el, doc, update, dup, del, layer, clearAll, setDoc, isOutput, activeLabel, resetOverride, toggleHidden, selCount, align, distribute, centre, formatLabel, sliceMode, setSliceMode, setFeedSlice, feedEvents }){
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
  const dSurface   = dirt(['surface','fill']);
  const dSub       = dirt(['subtitle','subSize','subWeight','subTracking','subColor','subLayout']);
  const dKicker    = dirt(['kicker','kickerColor']);
  const dRows      = dirt(['rowSize','rowWeight','rowTracking','rowGap','markerKey']);
  const dTransform = dirt(['rot','anchor']);   // NOT w/h/x/y — placing a box sets those, so counting them badges everything

  const hasContent = ['title','tagline','info','when','cost','stamp','host','ticket','qr','badge','wordmark','weekly','matchup'].indexOf(el.type)>=0 || !!caps.list;

  return (
    <React.Fragment>
      {selCount>=2 &&
        <ArrangeFold selCount={selCount} align={align} distribute={distribute} centre={centre} formatLabel={formatLabel} del={del} />}

      {/* ---- actions: always bare, always first ---- */}
      <div className="rs-sech" style={{ display:'flex', justifyContent:'space-between' }}>
        <span>{el.type}{el._overridden && <span className="rs-ovtag"> · overridden</span>}</span>
        {selCount>=2 && <span style={{ fontSize:10, opacity:.6 }}>last of {selCount}</span>}
      </div>
      {/* Two rows: stacking order, then the destructive pair. Six buttons on one
          row crushed "Duplicate"/"Delete" to illegible at 312px. */}
      <div className="rs-actions" style={{ marginBottom:6 }}>
        <button className="rs-iconbtn" onClick={()=>layer('back')} title="Send to back">⤓ Back</button>
        <button className="rs-iconbtn" onClick={()=>layer(-1)} title="Send back one">▼</button>
        <button className="rs-iconbtn" onClick={()=>layer(1)} title="Bring forward one">▲</button>
        <button className="rs-iconbtn" onClick={()=>layer('front')} title="Bring to front">⤒ Front</button>
      </div>
      <div className="rs-actions">
        <button className="rs-iconbtn" onClick={dup} title="Duplicate (Ctrl-D)">Duplicate</button>
        <button className="rs-iconbtn rs-del" onClick={del}
          title={isOutput ? 'Delete from EVERY format — to drop it from '+activeLabel+' only, set Visibility to Hidden below' : 'Delete'}>Delete</button>
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
      <TransformFold el={el} update={update} caps={caps} isText={isText} isOutput={isOutput} activeLabel={activeLabel}
        selCount={selCount} centre={centre} formatLabel={formatLabel} dTransform={dTransform} />

      {/* ===================== PER-FORMAT OVERRIDE ===================== */}
      {isOutput &&
        <OverrideFold el={el} isText={isText} activeLabel={activeLabel} resetOverride={resetOverride} toggleHidden={toggleHidden} />}
    </React.Fragment>
  );
}

export { Inspector };
