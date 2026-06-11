/* REALITY app components — built on --space-* tokens + the day/night icon set.
   All styling via var() tokens so every piece flips with the theme.
   Day icons = stroke; Night icons = echo-line (handled by useIDir()). */

const { useState } = React;

// theme-aware icon direction; reads <html data-theme>
function useIDir() {
  const [, force] = useState(0);
  React.useEffect(() => {
    const obs = new MutationObserver(() => force(n => n + 1));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => obs.disconnect();
  }, []);
  return document.documentElement.getAttribute('data-theme') === 'dark' ? 'echo-line' : 'stroke';
}

// Montserrat label helper
const M = (size, ls = 0.1, w = 700) => ({ fontFamily: 'var(--mont)', fontWeight: w, textTransform: 'uppercase', letterSpacing: ls + 'em', fontSize: size });
const ROLE = { action: 'var(--red)', info: 'var(--blue)', notice: 'var(--yellow)', success: 'var(--green)' };
const ROLE_ICON = { action: 'alert', info: 'info', notice: 'bell', success: 'check' };

/* ---------- Switch ---------- */
function Toggle({ defaultOn = false, label }) {
  const [on, setOn] = useState(defaultOn);
  return (
    <button onClick={() => setOn(!on)} role="switch" aria-checked={on}
      style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'none', border: 'none', cursor: 'pointer' }}>
      <span style={{ position: 'relative', width: 56, height: 30, border: '2px solid var(--fg)', background: on ? 'var(--accent)' : 'var(--surface)', boxShadow: 'var(--sh-light)', transition: 'background .15s' }}>
        <span style={{ position: 'absolute', top: 2, left: on ? 28 : 2, width: 22, height: 22, background: 'var(--fg)', transition: 'left .16s var(--ease-snap)' }}></span>
      </span>
      {label && <span style={M(12, 0.08)}>{label}</span>}
    </button>
  );
}

/* ---------- Checkbox ---------- */
function Check({ defaultChecked = false, label }) {
  const [c, setC] = useState(defaultChecked);
  return (
    <button onClick={() => setC(!c)} role="checkbox" aria-checked={c}
      style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'none', border: 'none', cursor: 'pointer' }}>
      <span style={{ width: 26, height: 26, border: '2px solid var(--fg)', background: c ? 'var(--fg)' : 'var(--surface)', boxShadow: 'var(--sh-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
        {c && <svg width="18" height="18" viewBox="0 0 24 24"><path d="M4.5 12.5 L9.5 17.5 L19.5 6.5" fill="none" stroke="var(--bg)" strokeWidth="2.6" strokeLinecap="square" strokeLinejoin="miter" /></svg>}
      </span>
      {label && <span style={M(12, 0.06, 600)}>{label}</span>}
    </button>
  );
}

/* ---------- Radio ---------- */
function Radio({ name, value, selected, setSelected, label }) {
  const on = selected === value;
  return (
    <button onClick={() => setSelected(value)} role="radio" aria-checked={on}
      style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'none', border: 'none', cursor: 'pointer' }}>
      <span style={{ width: 26, height: 26, border: '2px solid var(--fg)', background: 'var(--surface)', boxShadow: 'var(--sh-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
        {on && <span style={{ width: 12, height: 12, background: 'var(--accent)' }}></span>}
      </span>
      {label && <span style={M(12, 0.06, 600)}>{label}</span>}
    </button>
  );
}

/* ---------- Avatar (hard-corner, initials on category colour) ---------- */
function Avatar({ initials, color = 'var(--accent)', size = 44 }) {
  return (
    <span style={{ width: size, height: size, background: color, border: '2px solid var(--fg)', boxShadow: 'var(--sh-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0d0905', flex: 'none', ...M(size * 0.36, 0.02, 700) }}>{initials}</span>
  );
}

/* ---------- Badge + dot ---------- */
function Badge({ children, color = 'var(--red)', text = '#fffbf1' }) {
  return <span style={{ minWidth: 20, height: 20, padding: '0 6px', background: color, color: text, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', ...M(11, 0.04) }}>{children}</span>;
}
function Dot({ color = 'var(--red)' }) {
  return <span style={{ width: 11, height: 11, background: color, border: '2px solid var(--bg)', display: 'inline-block' }}></span>;
}

/* ---------- Toast ---------- */
function Toast({ kind = 'info', title, msg }) {
  return (
    <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', border: '2px solid var(--fg)', background: 'var(--surface)', boxShadow: 'var(--sh-default)', padding: 14, width: 320 }}>
      <span style={{ width: 40, height: 40, background: ROLE[kind], border: '2px solid var(--fg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
        <Icon name={ROLE_ICON[kind]} dir="stroke" size={22} color="#0d0905" />
      </span>
      <div style={{ paddingTop: 1 }}>
        <div style={M(12, 0.06)}>{title}</div>
        <div style={{ fontFamily: 'var(--grotesk)', fontSize: 13, color: 'var(--fg-dim)', marginTop: 3, lineHeight: 1.45 }}>{msg}</div>
      </div>
    </div>
  );
}

/* ---------- Inline alert ---------- */
function Alert({ kind = 'notice', title, msg, action }) {
  return (
    <div style={{ border: '2px solid var(--fg)', background: 'var(--surface)', boxShadow: 'var(--sh-light)' }}>
      <div style={{ background: ROLE[kind], borderBottom: '2px solid var(--fg)', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 9, color: '#0d0905', ...M(11, 0.12) }}>
        <Icon name={ROLE_ICON[kind]} dir="stroke" size={18} color="#0d0905" />{title}
      </div>
      <div style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 16, justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <span style={{ fontFamily: 'var(--grotesk)', fontSize: 13.5, color: 'var(--fg-dim)', flex: 1, minWidth: 160 }}>{msg}</span>
        {action && <Button size="sm" role="action">{action}</Button>}
      </div>
    </div>
  );
}

/* ---------- Progress ---------- */
function Progress({ pct = 60, color = 'var(--accent)' }) {
  return (
    <div style={{ height: 16, border: '2px solid var(--fg)', background: 'var(--surface)', boxShadow: 'var(--sh-light)' }}>
      <span style={{ display: 'block', height: '100%', width: pct + '%', background: color, transition: 'width .3s' }}></span>
    </div>
  );
}

/* ---------- Countdown timer (quiz/bingo) ---------- */
function Timer({ left = 9, total = 15, mmss = '0:09' }) {
  return (
    <div style={{ border: '2px solid var(--fg)', background: 'var(--surface)', boxShadow: 'var(--sh-default)', padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={M(10, 0.14, 700)}>Time left</span>
        <span style={{ ...M(34, 0.02, 700), color: left <= 5 ? 'var(--red)' : 'var(--fg)' }}>{mmss}</span>
      </div>
      <div className="seg-track">
        {Array.from({ length: total }).map((_, i) => <span key={i} className={'s' + (i < left ? ' on' : '')}></span>)}
      </div>
    </div>
  );
}

/* ---------- Stepper / rounds ---------- */
function Stepper({ current = 2, total = 5 }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={M(11, 0.12, 700)}>Round {current} / {total}</span>
      <div style={{ display: 'flex', gap: 5 }}>
        {Array.from({ length: total }).map((_, i) => (
          <span key={i} style={{ width: 18, height: 10, border: '2px solid var(--fg)', background: i < current ? 'var(--fg)' : (i === current ? 'var(--accent)' : 'var(--surface)') }}></span>
        ))}
      </div>
    </div>
  );
}

/* ---------- Button (roles + states) ---------- */
function Button({ children, role, size = 'md', state = 'default' }) {
  const pad = size === 'sm' ? '9px 16px' : '14px 24px';
  const fs = size === 'sm' ? 12 : 14;
  const base = { ...M(fs, 0.1), border: '2px solid var(--fg)', padding: pad, background: 'var(--fg)', color: 'var(--bg)', boxShadow: 'var(--sh-default)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 9, minHeight: size === 'sm' ? 38 : 48 };
  if (role === 'action') Object.assign(base, { background: 'var(--red)', color: '#fffbf1', borderColor: 'var(--red)' });
  if (role === 'info') Object.assign(base, { background: 'var(--blue)', color: '#0d0905', borderColor: 'var(--blue)' });
  if (role === 'notice') Object.assign(base, { background: 'var(--yellow)', color: '#0d0905', borderColor: 'var(--yellow)' });
  if (role === 'ghost') Object.assign(base, { background: 'var(--surface)', color: 'var(--fg)' });
  if (state === 'disabled') Object.assign(base, { background: 'var(--surface)', color: 'var(--fg-faint)', borderColor: 'var(--hairline)', boxShadow: 'none', cursor: 'not-allowed' });
  return (
    <button style={base} disabled={state === 'disabled' || state === 'loading'}>
      {state === 'loading' && <span className="rd-spin"></span>}
      {children}
    </button>
  );
}

/* ---------- Input (states) ---------- */
function Field({ label, placeholder, value, state = 'default', hint }) {
  const border = state === 'error' ? 'var(--red)' : (state === 'focus' ? 'var(--accent)' : 'var(--fg)');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      {label && <label style={M(11, 0.12)}>{label}</label>}
      <input defaultValue={value} placeholder={placeholder} disabled={state === 'disabled'}
        style={{ border: `2px solid ${border}`, outline: state === 'focus' ? '3px solid color-mix(in srgb, var(--accent) 35%, transparent)' : 'none', background: state === 'disabled' ? 'transparent' : 'var(--surface)', boxShadow: state === 'disabled' ? 'none' : 'var(--sh-light)', padding: '13px 14px', fontFamily: 'var(--grotesk)', fontSize: 15, color: 'var(--fg)', opacity: state === 'disabled' ? 0.5 : 1 }} />
      {hint && <span style={{ fontFamily: 'var(--grotesk)', fontSize: 12, color: state === 'error' ? 'var(--red)' : 'var(--fg-faint)' }}>{hint}</span>}
    </div>
  );
}

/* ---------- Bottom nav (formalized · centre Scan emphasized) ---------- */
function NavBar() {
  const idir = useIDir();
  const [active, setActive] = useState('home');
  const tabs = [['home', 'Home'], ['calendar', 'Events'], ['scan', 'Scan'], ['leaders', 'Leaders'], ['user', 'You']];
  return (
    <div style={{ display: 'flex', borderTop: '2px solid var(--fg)', background: 'var(--surface)', position: 'relative' }}>
      {tabs.map(([n, lbl]) => {
        if (n === 'scan') {
          return (
            <button key={n} onClick={() => setActive(n)} style={{ flex: 1, background: 'none', border: 'none', display: 'flex', justifyContent: 'center', cursor: 'pointer' }}>
              <span style={{ width: 60, height: 60, marginTop: -18, background: 'var(--accent)', border: '2px solid var(--fg)', boxShadow: 'var(--sh-default)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
                <Icon name="scan" dir="stroke" size={24} color="#0d0905" />
                <span style={{ ...M(8, 0.12), color: '#0d0905' }}>Scan</span>
              </span>
            </button>
          );
        }
        const on = active === n;
        return (
          <button key={n} onClick={() => setActive(n)} style={{ flex: 1, height: 62, background: on ? 'var(--fg)' : 'transparent', color: on ? 'var(--bg)' : 'var(--fg)', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5, cursor: 'pointer' }}>
            <Icon name={n} dir={on ? 'stroke' : idir} size={23} color="currentColor" echo="var(--accent)" />
            <span style={M(8, 0.1)}>{lbl}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ---------- Leaderboard ---------- */
function Leaderboard() {
  const rows = [
    ['01', 'LK', 'var(--pink)', 'Linh · table 4', '248'],
    ['02', 'MN', 'var(--blue)', 'Minh', '231'],
    ['03', 'TK', 'var(--green)', 'Tâm + Khoa', '205'],
    ['04', 'PD', 'var(--amber)', 'Phúc', '188'],
  ];
  return (
    <div style={{ border: '2px solid var(--fg)', boxShadow: 'var(--sh-default)', background: 'var(--surface)' }}>
      {rows.map((r, i) => {
        const lead = i === 0;
        return (
          <div key={r[0]} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', background: lead ? 'var(--fg)' : 'transparent', color: lead ? 'var(--bg)' : 'var(--fg)', borderTop: i === 0 ? 'none' : '1px solid var(--hairline)' }}>
            <span style={{ ...M(13, 0.04, 700), width: 22, color: lead ? 'var(--bg)' : 'var(--fg-faint)' }}>{r[0]}</span>
            <Avatar initials={r[1]} color={r[2]} size={38} />
            <span style={{ flex: 1, ...M(13, 0.04, 600) }}>{r[3]}</span>
            <span style={M(17, 0.02, 700)}>{r[4]}</span>
          </div>
        );
      })}
    </div>
  );
}

Object.assign(window, { useIDir, Toggle, Check, Radio, Avatar, Badge, Dot, Toast, Alert, Progress, Timer, Stepper, Button, Field, NavBar, Leaderboard });
