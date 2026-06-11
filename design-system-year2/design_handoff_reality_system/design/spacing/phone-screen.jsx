/* Shared mock: the same REALITY "live room" screen, rendered under a
   spacing system passed in via props. Only the spatial tokens change
   between options so the density difference is the only variable. */

function PhoneScreen({ s }) {
  // s = spacing system: { screen, gap, cardPad, rowY, btnH, headPad, label }
  const ink = 'var(--fg)';
  return (
    <div style={{
      width: '100%', height: '100%', background: 'var(--bg)', color: 'var(--fg)',
      display: 'flex', flexDirection: 'column', fontFamily: 'var(--grotesk)',
      overflow: 'hidden',
    }}>
      {/* header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: `${s.headPad}px ${s.screen}px`, borderBottom: `2px solid ${ink}`,
      }}>
        <span style={{ fontFamily: 'var(--alt)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.02em', fontSize: 22 }}>Reality</span>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 7,
          fontFamily: 'var(--mont)', fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '.14em', fontSize: 10, border: `2px solid ${ink}`, padding: '5px 9px',
        }}>
          <span style={{ width: 8, height: 8, background: 'var(--red)', borderRadius: '50%' }}></span>Live
        </span>
      </div>

      {/* body */}
      <div style={{ flex: 1, padding: s.screen, display: 'flex', flexDirection: 'column', gap: s.gap, overflow: 'hidden' }}>
        {/* now playing card */}
        <div style={{ border: `2px solid ${ink}`, boxShadow: 'var(--sh-default)', background: 'var(--surface)' }}>
          <div style={{
            background: 'var(--accent)', borderBottom: `2px solid ${ink}`,
            padding: `${Math.round(s.cardPad * 0.5)}px ${s.cardPad}px`, color: '#0d0905',
            fontFamily: 'var(--mont)', fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '.12em', fontSize: 10, display: 'flex', justifyContent: 'space-between', whiteSpace: 'nowrap',
          }}>
            <span>Now playing</span><span>2nd floor</span>
          </div>
          <div style={{ padding: s.cardPad }}>
            <div style={{ fontFamily: 'var(--mont)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.02em', fontSize: 26, lineHeight: .95 }}>Pulse<br/>Sessions</div>
            <div style={{ fontSize: 13, color: 'var(--fg-dim)', marginTop: Math.round(s.cardPad * 0.45) }}>House &amp; disco · 28 in the room</div>
          </div>
        </div>

        {/* leaderboard */}
        <div>
          <div style={{ fontFamily: 'var(--mont)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.14em', fontSize: 10, color: 'var(--fg-faint)', marginBottom: Math.round(s.gap * 0.5) }}>Tonight's leaders</div>
          <div style={{ border: `2px solid ${ink}`, background: 'var(--surface)' }}>
            {[['01', 'Linh · table 4', '248'], ['02', 'Minh', '231'], ['03', 'Tâm + Khoa', '205']].map((r, i) => (
              <div key={r[0]} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: `${s.rowY}px ${s.cardPad}px`,
                borderTop: i === 0 ? 'none' : `1px solid var(--hairline)`,
              }}>
                <span style={{ fontFamily: 'var(--mont)', fontWeight: 700, fontSize: 13, color: 'var(--fg-faint)', width: 22 }}>{r[0]}</span>
                <span style={{ flex: 1, fontFamily: 'var(--mont)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em', fontSize: 13 }}>{r[1]}</span>
                <span style={{ fontFamily: 'var(--mont)', fontWeight: 700, fontSize: 16 }}>{r[2]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* fixed action */}
      <div style={{ padding: s.screen, borderTop: `2px solid ${ink}` }}>
        <button style={{
          width: '100%', height: s.btnH, background: 'var(--red)', color: '#fffbf1',
          border: `2px solid var(--red)`, boxShadow: 'var(--sh-default)',
          fontFamily: 'var(--mont)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', fontSize: 14, cursor: 'pointer',
        }}>Join game</button>
      </div>
    </div>
  );
}

window.PhoneScreen = PhoneScreen;
