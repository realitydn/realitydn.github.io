/* Documentation artboards: the spacing scale ramp + the app-screen grid spec.
   Reads the system's existing language — 2px borders, 4/8/12 shadow offsets —
   to justify a 4px base unit. */

const SCALE = [
  ['1', 4, 'hairline gaps, icon-to-label'],
  ['2', 8, 'inside chips, tight stacks'],
  ['3', 12, 'list-row vertical, dot gaps'],
  ['4', 16, 'card padding, control gaps'],
  ['5', 24, 'screen margin, section gap'],
  ['6', 32, 'generous padding, group breaks'],
  ['7', 48, 'min touch target, big gaps'],
  ['8', 64, 'screen-section dividers'],
  ['9', 96, 'hero whitespace'],
];

function ScaleRamp() {
  return (
    <div style={{ fontFamily: 'var(--grotesk)', color: 'var(--fg)' }}>
      <div style={{ fontFamily: 'var(--mont)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', fontSize: 13, marginBottom: 6 }}>4px base · the spacing scale</div>
      <p style={{ fontSize: 12.5, color: 'var(--fg-dim)', maxWidth: '52ch', marginBottom: 22, lineHeight: 1.6 }}>
        The base unit is <b style={{ color: 'var(--fg)', fontWeight: 600 }}>4px</b> — already the system's native rhythm: borders are 2px, the three shadows step 4 / 8 / 12 (1× · 2× · 3×). Every margin, gap and pad is a token below; no loose values.
      </p>
      {SCALE.map(([n, v, use]) => (
        <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '7px 0', borderTop: '1px solid var(--hairline)' }}>
          <span style={{ fontFamily: 'var(--mont)', fontWeight: 700, fontSize: 12, width: 54, color: 'var(--fg-faint)' }}>space-{n}</span>
          <span style={{ fontFamily: 'var(--mont)', fontWeight: 700, fontSize: 13, width: 44 }}>{v}</span>
          <span style={{ height: 16, width: v, background: 'var(--fg)', flex: 'none' }}></span>
          <span style={{ fontSize: 11.5, color: 'var(--fg-dim)' }}>{use}</span>
        </div>
      ))}
    </div>
  );
}

function GridSpec() {
  const ink = 'var(--fg)';
  return (
    <div style={{ fontFamily: 'var(--grotesk)', color: 'var(--fg)' }}>
      <div style={{ fontFamily: 'var(--mont)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', fontSize: 13, marginBottom: 6 }}>App-screen grid &amp; targets</div>
      <p style={{ fontSize: 12.5, color: 'var(--fg-dim)', maxWidth: '50ch', marginBottom: 22, lineHeight: 1.6 }}>
        The phone screen runs a <b style={{ color: 'var(--fg)', fontWeight: 600 }}>4-column grid</b> inside a comfortable margin, with a 12px gutter. Interactive things never sit below the 48px floor.
      </p>

      {/* margin + column diagram */}
      <div style={{ border: `2px solid ${ink}`, position: 'relative', height: 230, background: 'var(--surface)', display: 'flex', gap: 8, padding: '0 24px' }}>
        <span style={{ position: 'absolute', top: 8, left: 24, fontFamily: 'var(--mont)', fontWeight: 700, fontSize: 9, letterSpacing: '.12em', color: 'var(--fg-faint)' }}>24 MARGIN</span>
        {[0, 1, 2, 3].map(i => (
          <div key={i} style={{ flex: 1, marginTop: 26, marginBottom: 12, background: 'repeating-linear-gradient(0deg,var(--accent),var(--accent) 6px,transparent 6px,transparent 12px)', opacity: .35 }}></div>
        ))}
        <span style={{ position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)', fontFamily: 'var(--mont)', fontWeight: 700, fontSize: 9, letterSpacing: '.12em', color: 'var(--fg-faint)' }}>4 COLS · 12 GUTTER</span>
      </div>

      {/* touch target */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 22 }}>
        <div style={{ width: 48, height: 48, border: `2px solid ${ink}`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--sh-light)', flex: 'none' }}>
          <span style={{ width: 16, height: 16, background: ink }}></span>
        </div>
        <div>
          <div style={{ fontFamily: 'var(--mont)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', fontSize: 12 }}>48 × 48 minimum</div>
          <div style={{ fontSize: 12, color: 'var(--fg-dim)' }}>Every tappable element. Visual mark can be smaller; the hit area can't.</div>
        </div>
      </div>
    </div>
  );
}

window.ScaleRamp = ScaleRamp;
window.GridSpec = GridSpec;
