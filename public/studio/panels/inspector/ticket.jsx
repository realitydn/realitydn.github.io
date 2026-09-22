/* ============================================================
   REALITY POSTER STUDIO — inspector · ticket
   The ticket's content fields; its formats are TICKET_FORMATS (caps.js).
   ============================================================ */
import { Field, Chips, Hint } from '../controls.jsx';
import { TICKET_FORMATS } from './caps.js';
function TicketContent({ el, update }){
  return (
      <React.Fragment>
        <Chips label="Format" options={[{v:'banner',l:'Banner'},{v:'standard',l:'Standard'},{v:'slim',l:'Slim'},{v:'mini',l:'Mini'}]}
          value={el.variant||'standard'} onChange={v=>update(TICKET_FORMATS[v])} />
        <Hint tight>Wordmark is the canonical REALITY mark (fixed).</Hint>
        <Field label="Website" value={el.site} onChange={v=>update({site:v})} />
        <Field label="Address" value={el.addr} onChange={v=>update({addr:v})} />
        <Chips label="QR" options={[{v:true,l:'Show'},{v:false,l:'Hide'}]} value={el.showQR} onChange={v=>update({showQR:v})} />
        {/* absent prop = ON — the ticket is the brand carrier (see DEFAULTS) */}
        <Chips label="Ink mark" options={[{v:'on',l:'On'},{v:'off',l:'Off'}]} value={el.mark||'on'} onChange={v=>update({mark:v})} />
        {el.mark!=='off' && <Chips label="Mark form" options={[{v:'auto',l:'Auto'},{v:'square',l:'Square'},{v:'strip-long',l:'Full strip'},{v:'strip',l:'Short strip'}]}
          value={el.markForm||'auto'} onChange={v=>update({markForm:v})} />}
        {el.mark!=='off' && <Chips label="Mark mode" options={[{v:'full',l:'Full'},{v:'majors',l:'Majors'},{v:'ink',l:'Ink'}]}
          value={el.markMode||(((el.markForm||'auto')==='square'||((el.markForm||'auto')==='auto'&&!!el.showQR))?'full':'majors')} onChange={v=>update({markMode:v})} />}
        <Hint tight>Auto pairs the canon square with the QR (flush — its quiet zone is the gap) and the <b>full 9×2 strip</b> with a bare band; Square / Full strip / Short strip force one form, on the banner too. Short is the fallback for a band too narrow to hold nine cells. Mode unset keeps each form's classic ink (square Full · strip Majors).</Hint>
      </React.Fragment>
  );
}

export { TicketContent };
