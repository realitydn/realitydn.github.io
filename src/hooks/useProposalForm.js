import { useEffect, useRef, useState } from 'react';
import { scrollBehavior } from './motion';

// useProposalForm — the state machine both proposal forms share
// (EventProposalForm, ArtExhibitionForm): four steps, per-step validation,
// a draft that survives a reload or a tab switch, and one submit path to the
// hub (primary) + the worker (fire-and-forget backup).
//
// Its one caller is components/ProposalForm, which renders the steps from
// each form's spec (the forms themselves are just fields + validation).
// Field / ChoiceGroup (components/FormFields) read the object it returns.
//
//   type        draft key + id prefix: 'event-public' | 'event-private' | 'art'
//   initial     the empty form data
//   validate    (step, data) → { field: code } — codes map to formErrors.<code>
//   kind        the hub's proposal kind ('event' | 'art' — the hub's enum)
//   extra       extra payload fields for both lanes (e.g. { eventType })
//   workerPath  the backup worker route
//   lang        the visitor's site language, sent with the proposal
//   t           the site's translator (t.use)
//   onSuccess   parent hand-off (section-level thank-you)

const WORKER_URL = '';
// Proposals POST to the hub — the app's Control Room inbox is the review
// surface. VITE_HUB_URL overrides for previews; defaults to prod. The Notion
// worker (WORKER_URL) stays live as a fire-and-forget backup.
const HUB = (import.meta.env.VITE_HUB_URL || 'https://app.realitydn.com').replace(/\/$/, '');
const HUB_TIMEOUT_MS = 15000;

const DRAFT_PREFIX = 'reality-proposal-draft:';
const DRAFT_MAX_AGE_MS = 30 * 86400000;

export const LAST_STEP = 4;

// ── validators ──────────────────────────────────────────────────────────────
export function isEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v).trim());
}

// A link to someone's work: http(s) URLs, or a bare domain ("myart.com/x") —
// people paste both. Handles like "@artist" don't pass; the message asks for
// a full link.
export function isUrl(v) {
  const s = String(v).trim();
  if (!s || /\s/.test(s)) return false;
  try {
    const u = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(s) ? s : `https://${s}`);
    return (u.protocol === 'http:' || u.protocol === 'https:') && u.hostname.includes('.');
  } catch (e) {
    return false;
  }
}

// One id per form instance, shared by the hub + worker lanes, so a retry (or
// the two lanes landing twice) can be de-duplicated downstream.
function newSubmissionId() {
  const c = typeof crypto !== 'undefined' ? crypto : null;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  const b = new Uint8Array(16);
  if (c && c.getRandomValues) c.getRandomValues(b);
  else for (let i = 0; i < 16; i++) b[i] = Math.floor(Math.random() * 256);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

// ── drafts (localStorage; every access guarded — private mode, quotas) ──────
function readDraft(type, initial) {
  try {
    const raw = window.localStorage.getItem(DRAFT_PREFIX + type);
    if (!raw) return null;
    const d = JSON.parse(raw);
    if (!d || typeof d.data !== 'object' || Date.now() - (d.savedAt || 0) > DRAFT_MAX_AGE_MS) return null;
    // Only known fields, only the right shapes — a stale draft from an older
    // form version can't smuggle in a field or break an array.
    const data = { ...initial };
    Object.keys(initial).forEach((k) => {
      if (k === 'honeypot') return;
      const v = d.data[k];
      if (Array.isArray(initial[k]) ? Array.isArray(v) : typeof v === 'string') data[k] = v;
    });
    const filled = Object.keys(initial).some((k) =>
      Array.isArray(data[k]) ? data[k].length > 0 : k !== 'honeypot' && data[k] !== ''
    );
    if (!filled) return null;
    const step = Math.min(Math.max(parseInt(d.step, 10) || 1, 1), LAST_STEP);
    return { data, step };
  } catch (e) {
    return null;
  }
}

function writeDraft(type, data, step) {
  try {
    const { honeypot, ...rest } = data;
    window.localStorage.setItem(DRAFT_PREFIX + type, JSON.stringify({ data: rest, step, savedAt: Date.now() }));
  } catch (e) { /* storage unavailable — the draft just won't persist */ }
}

function dropDraft(type) {
  try {
    window.localStorage.removeItem(DRAFT_PREFIX + type);
  } catch (e) { /* nothing to clear */ }
}

export default function useProposalForm({ type, initial, validate, kind, extra, workerPath, lang, t, onSuccess }) {
  const [draft] = useState(() => (typeof window !== 'undefined' ? readDraft(type, initial) : null));
  const [data, setData] = useState(() => (draft ? draft.data : initial));
  const [step, setStep] = useState(() => (draft ? draft.step : 1));
  const [restored, setRestored] = useState(!!draft);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  // null | 'success' | 'error' | 'timeout'
  const [status, setStatus] = useState(null);
  const [submissionId] = useState(newSubmissionId);

  const fieldRefs = useRef({});
  const headingRef = useRef(null);
  const alertRef = useRef(null);
  const mounted = useRef(false);

  // Save as the visitor types; nothing to save once the pitch is in.
  useEffect(() => {
    if (status === 'success') return;
    writeDraft(type, data, step);
  }, [type, data, step, status]);

  // A new step announces itself: focus its heading (tabIndex -1) and bring
  // it into view — the Next button sits at the bottom of a long step, so
  // without this a phone user lands mid-way down the next one. Skipped on
  // mount so opening the form doesn't steal focus.
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    const h = headingRef.current;
    if (!h) return;
    h.focus({ preventScroll: true });
    h.scrollIntoView({ block: 'start', behavior: scrollBehavior() });
  }, [step]);

  const message = (code) => t.use(`formErrors.${code}`);

  // ref callback for a field (or a group's first option) — the focus target
  // when that field fails validation.
  const register = (name) => (el) => {
    if (el) fieldRefs.current[name] = el;
  };

  const clearError = (name) => {
    setErrors((prev) => (prev[name] ? { ...prev, [name]: '' } : prev));
  };

  const onInput = (e) => {
    const { name, value } = e.target;
    setData((prev) => ({ ...prev, [name]: value }));
    clearError(name);
  };

  const pick = (name, value) => {
    setData((prev) => ({ ...prev, [name]: value }));
    clearError(name);
  };

  const toggle = (name, value, checked) => {
    setData((prev) => ({
      ...prev,
      [name]: checked ? [...prev[name], value] : prev[name].filter((v) => v !== value),
    }));
    clearError(name);
  };

  // Validate a step; on failure, move focus to the first invalid field (the
  // validator's insertion order is the form's reading order).
  const check = (stepNum) => {
    const errs = validate(stepNum, data) || {};
    setErrors(errs);
    const first = Object.keys(errs)[0];
    if (first) {
      requestAnimationFrame(() => {
        const el = fieldRefs.current[first];
        if (el && el.isConnected) {
          el.focus({ preventScroll: true });
          el.scrollIntoView({ block: 'center', behavior: scrollBehavior() });
        }
      });
      return false;
    }
    return true;
  };

  const next = () => {
    if (check(step)) setStep((s) => Math.min(s + 1, LAST_STEP));
  };
  const back = () => {
    setErrors({});
    setStep((s) => Math.max(s - 1, 1));
  };

  const startOver = () => {
    dropDraft(type);
    setData(initial);
    setErrors({});
    setStatus(null);
    setRestored(false);
    setStep(1);
  };

  const finish = () => {
    dropDraft(type);
    setStatus('success');
    setData(initial);
    setRestored(false);
    setStep(1);
    // Hand off to parent — renders a full-size thank-you in place of the
    // form so the user stays on the main page instead of staring at a
    // half-collapsed step 4.
    if (typeof onSuccess === 'function') onSuccess();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    // Honeypot tripped: fake a success so bots don't retry, but never POST.
    // Browsers like Brave/Cốc Cốc/iOS Safari and password managers can
    // autofill hidden fields, so a silent return would block real users too —
    // showing the thank-you screen at least keeps them moving.
    if (data.honeypot) {
      finish();
      return;
    }

    // Every step re-checked: a restored draft can land on the review step.
    for (let s = 1; s < LAST_STEP; s++) {
      if (!check(s)) {
        setStep(s);
        return;
      }
    }

    setLoading(true);
    setStatus(null);

    const payload = { ...data, ...extra, submissionId, lang };

    // Notion-era pipeline stays live as a backup while the hub inbox beds in —
    // fire-and-forget to the same-origin worker (Notion + Sheets + the Resend
    // confirmation email). Sent first so a hub outage can't lose the pitch;
    // only the hub response below drives the success/error UX.
    fetch(`${WORKER_URL}${workerPath}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => {});

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), HUB_TIMEOUT_MS);
    try {
      // Primary: the Events Platform hub. Its /api/proposals route CORS-allows
      // realitydn.com and is dormant-safe (accepts + flags unverified until a
      // Turnstile secret is set). `kind` tags the proposal for the inbox; the
      // hub's schema passes every other field through into the payload.
      const response = await fetch(`${HUB}/api/proposals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, kind }),
        signal: controller.signal,
      });

      // Guard against the SPA catch-all serving index.html when the route
      // isn't actually wired up — a 200 with text/html would otherwise look
      // like a successful submit.
      const contentType = response.headers.get('content-type') || '';
      if (response.ok && contentType.includes('application/json')) {
        finish();
      } else {
        setStatus('error');
      }
    } catch (error) {
      console.error('Submission error:', error);
      setStatus(error && error.name === 'AbortError' ? 'timeout' : 'error');
    } finally {
      clearTimeout(timer);
      setLoading(false);
    }
  };

  // The alert is role="alert" (announced on its own); focus follows it too
  // so a keyboard user is next to the retry.
  useEffect(() => {
    if ((status === 'error' || status === 'timeout') && alertRef.current) {
      alertRef.current.focus({ preventScroll: true });
    }
  }, [status]);

  return {
    idBase: `pf-${type}`,
    data,
    setData,
    errors,
    step,
    setStep,
    loading,
    status,
    restored,
    message,
    register,
    onInput,
    pick,
    toggle,
    next,
    back,
    startOver,
    handleSubmit,
    headingRef,
    alertRef,
  };
}
