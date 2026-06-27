/* ============================================================
   REALITY STUDIOS — shared cloud client  (window.RCloud)
   ------------------------------------------------------------
   WP9 (Events Platform) part E. Loaded as a plain UMD/IIFE via
   <script> AFTER studio-store.js, BEFORE the .jsx apps.

   THE ONE RULE: cloud sync is STRICTLY ADDITIVE and best-effort.
   localStorage / IndexedDB (RStore) stay the source of truth.
   EVERY method here is wrapped so it can NEVER throw — on any
   error, when not signed in, or on a 503 (the hub endpoints are
   dormant until STUDIO_TOKEN_SECRET is set) it no-ops, logs ONE
   line, and returns null/false. The Studios must behave exactly
   as they do today when the hub is absent.

   Hub endpoints (live, dormant → 503 until the secret is set):
     POST {HUB}/api/studio/token         (first-party, via popup)
     GET/PUT {HUB}/api/studio/documents
     POST {HUB}/api/events/{id}/posters
     GET  {HUB}/api/feed/v1/events.json
   Sign-in popup: {HUB}/studio-auth  (postMessage 'reality-studio-token').

   Token lives in localStorage('reality-hub-token-v1') with expiry.
   Override the hub for local testing with ?hub=http://localhost:3000
   ============================================================ */
(function () {
  'use strict';

  // Guard: never clobber an existing RCloud (double-load safety).
  if (window.RCloud) return;

  var DEFAULT_HUB = 'https://app.realitydn.com';
  var TOKEN_KEY = 'reality-hub-token-v1';
  var TOKEN_MSG = 'reality-studio-token';
  var SIGNIN_TIMEOUT_MS = 60000;
  var LOG = '[rcloud]';

  /* ---- hub origin (override via ?hub=) ------------------------------------ */
  function hub() {
    try {
      var q = new URLSearchParams(window.location.search);
      var h = q.get('hub');
      if (h) return h.replace(/\/+$/, '');
    } catch (e) { /* ignore — fall through to default */ }
    return DEFAULT_HUB;
  }

  /* ---- token storage ----------------------------------------------------- */
  // Stored shape: { token, email, expiresAt }  (expiresAt = epoch ms).
  function readToken() {
    try {
      var raw = localStorage.getItem(TOKEN_KEY);
      if (!raw) return null;
      var t = JSON.parse(raw);
      if (!t || !t.token) return null;
      if (t.expiresAt && Date.now() >= t.expiresAt) {
        // expired — drop it so isSignedIn() reads false
        try { localStorage.removeItem(TOKEN_KEY); } catch (e2) {}
        return null;
      }
      return t;
    } catch (e) { return null; }
  }
  function writeToken(t) {
    try {
      if (!t || !t.token) { localStorage.removeItem(TOKEN_KEY); return; }
      localStorage.setItem(TOKEN_KEY, JSON.stringify({
        token: t.token,
        email: t.email || null,
        // accept either an epoch-ms number or an ISO string from the popup
        expiresAt: typeof t.expiresAt === 'number'
          ? t.expiresAt
          : (t.expiresAt ? Date.parse(t.expiresAt) || null : null),
      }));
    } catch (e) { /* storage blocked — stay local-only */ }
  }
  function clearToken() { try { localStorage.removeItem(TOKEN_KEY); } catch (e) {} }

  function isSignedIn() { return !!readToken(); }
  function currentEmail() { var t = readToken(); return t ? (t.email || null) : null; }

  /* ---- low-level fetch helper (never throws) ----------------------------- */
  // Returns { ok, status, json, text } or null on any thrown/network error.
  // 503 is treated as "dormant" — logged once, returned with ok:false so callers
  // no-op cleanly.
  function call(method, path, opts) {
    opts = opts || {};
    var t = readToken();
    var headers = Object.assign({}, opts.headers || {});
    if (t && t.token && opts.auth !== false) headers['Authorization'] = 'Bearer ' + t.token;
    return fetch(hub() + path, {
      method: method,
      headers: headers,
      body: opts.body,
      // bearer-token auth, NOT cookies — keep it simple + CORS-safe
      credentials: 'omit',
      mode: 'cors',
      cache: 'no-store',
    }).then(function (res) {
      if (res.status === 503) {
        console.info(LOG, method, path, '→ 503 (hub dormant; staying local-only)');
      }
      if (res.status === 401) {
        // token rejected/expired/revoked — drop it so we fall back to local-only
        console.info(LOG, method, path, '→ 401; clearing stored token');
        clearToken();
      }
      return res.text().then(function (text) {
        var json = null;
        try { json = text ? JSON.parse(text) : null; } catch (e) {}
        return { ok: res.ok, status: res.status, json: json, text: text };
      });
    }).catch(function (err) {
      console.info(LOG, method, path, 'failed (offline/blocked):', err && err.message);
      return null;
    });
  }

  /* ---- sign in / out ----------------------------------------------------- */
  // Opens the hub's first-party popup; resolves with the token object on the
  // 'reality-studio-token' postMessage, or null after a 60s timeout / block.
  function signIn() {
    return new Promise(function (resolve) {
      var settled = false;
      function finish(val) {
        if (settled) return;
        settled = true;
        try { window.removeEventListener('message', onMsg); } catch (e) {}
        if (timer) clearTimeout(timer);
        resolve(val);
      }
      function onMsg(ev) {
        try {
          // accept only messages from the hub origin we opened
          if (ev.origin !== hub()) return;
          var d = ev.data;
          if (!d || d.type !== TOKEN_MSG || !d.token) return;
          writeToken({ token: d.token, email: d.email, expiresAt: d.expiresAt });
          console.info(LOG, 'signed in as', d.email || '(unknown)');
          finish(readToken());
        } catch (e) { /* ignore malformed messages */ }
      }
      var timer = null;
      var popup = null;
      try {
        window.addEventListener('message', onMsg);
        var url = hub() + '/studio-auth?origin=' + encodeURIComponent(window.location.origin);
        popup = window.open(url, 'reality-studio-auth', 'width=460,height=640');
        if (!popup) {
          console.info(LOG, 'sign-in popup blocked; staying local-only');
          finish(null);
          return;
        }
        timer = setTimeout(function () {
          console.info(LOG, 'sign-in timed out (60s); staying local-only');
          finish(null);
        }, SIGNIN_TIMEOUT_MS);
      } catch (e) {
        console.info(LOG, 'sign-in failed:', e && e.message);
        finish(null);
      }
    });
  }

  function signOut() {
    clearToken();
    console.info(LOG, 'signed out (local-only)');
  }

  /* ---- documents API ----------------------------------------------------- */
  // getDoc(studio, docId) → { studio, doc_id, title, json, updatedAt } | null
  function getDoc(studio, docId) {
    if (!isSignedIn()) { return Promise.resolve(null); }
    var qs = '?studio=' + encodeURIComponent(studio) + '&doc_id=' + encodeURIComponent(docId);
    return call('GET', '/api/studio/documents' + qs).then(function (r) {
      if (!r || !r.ok || !r.json) return null;
      return r.json.document || r.json || null;
    });
  }

  // listDocs(studio) → array of { doc_id, title, updatedAt, ... } | []
  function listDocs(studio) {
    if (!isSignedIn()) { return Promise.resolve([]); }
    var qs = '?studio=' + encodeURIComponent(studio);
    return call('GET', '/api/studio/documents' + qs).then(function (r) {
      if (!r || !r.ok || !r.json) return [];
      var list = r.json.documents || r.json || [];
      return Array.isArray(list) ? list : [];
    });
  }

  // putDoc(studio, docId, title, json, updatedAt) → stored doc | null.
  // `json` may be a string (already-stringified doc) or an object — both ok.
  // `updatedAt` is epoch ms (defaults to now). Best-effort, last-write-wins.
  function putDoc(studio, docId, title, json, updatedAt) {
    if (!isSignedIn()) { return Promise.resolve(null); }
    var jsonStr;
    try {
      jsonStr = typeof json === 'string' ? json : JSON.stringify(json);
    } catch (e) {
      console.info(LOG, 'putDoc: could not stringify doc; skipping');
      return Promise.resolve(null);
    }
    var body;
    try {
      body = JSON.stringify({
        studio: studio,
        doc_id: docId,
        title: title || '',
        json: jsonStr,
        updatedAt: typeof updatedAt === 'number' ? updatedAt : Date.now(),
      });
    } catch (e) { return Promise.resolve(null); }
    return call('PUT', '/api/studio/documents', {
      headers: { 'Content-Type': 'application/json' },
      body: body,
    }).then(function (r) {
      if (!r || !r.ok) return null;
      return (r.json && (r.json.document || r.json)) || true;
    });
  }

  // delDoc(studio, docId) — best-effort delete (used for template removal).
  // The hub documents API is last-write-wins; if it has no DELETE verb this
  // simply no-ops on a non-OK status. Never throws.
  function delDoc(studio, docId) {
    if (!isSignedIn()) { return Promise.resolve(false); }
    var qs = '?studio=' + encodeURIComponent(studio) + '&doc_id=' + encodeURIComponent(docId);
    return call('DELETE', '/api/studio/documents' + qs).then(function (r) {
      return !!(r && r.ok);
    });
  }

  /* ---- poster write-back ------------------------------------------------- */
  // putPoster(eventId, slot, blob, contentType) → { ok, slot, url } | null.
  // slot ∈ { feed, poster4x5, square1x1, story }.
  function putPoster(eventId, slot, blob, contentType) {
    if (!isSignedIn()) { return Promise.resolve(null); }
    if (!eventId || !slot || !blob) { return Promise.resolve(null); }
    var fd;
    try {
      fd = new FormData();
      fd.append('slot', slot);
      var ct = contentType || (blob && blob.type) || 'image/png';
      var ext = ct.indexOf('jpeg') >= 0 || ct.indexOf('jpg') >= 0 ? 'jpg' : 'png';
      fd.append('file', blob, slot + '.' + ext);
    } catch (e) {
      console.info(LOG, 'putPoster: could not build form data; skipping');
      return Promise.resolve(null);
    }
    return call('POST', '/api/events/' + encodeURIComponent(eventId) + '/posters', {
      body: fd, // browser sets multipart Content-Type + boundary
    }).then(function (r) {
      if (!r || !r.ok || !r.json) {
        console.info(LOG, 'putPoster', eventId, slot, '→', r ? r.status : 'no-response');
        return null;
      }
      return r.json;
    });
  }

  /* ---- feed read --------------------------------------------------------- */
  // fetchFeed({from, to, location, tag}) → the events.json document | null.
  // Anonymous public read — does NOT require sign-in (no bearer sent).
  function fetchFeed(params) {
    params = params || {};
    var qs = [];
    ['from', 'to', 'location', 'tag'].forEach(function (k) {
      if (params[k]) qs.push(k + '=' + encodeURIComponent(params[k]));
    });
    var path = '/api/feed/v1/events.json' + (qs.length ? '?' + qs.join('&') : '');
    return call('GET', path, { auth: false }).then(function (r) {
      if (!r || !r.ok || !r.json) {
        console.info(LOG, 'fetchFeed →', r ? r.status : 'unavailable', '(feed not available yet)');
        return null;
      }
      return r.json;
    });
  }

  /* ---- expose ------------------------------------------------------------ */
  window.RCloud = {
    HUB: DEFAULT_HUB,
    hub: hub,
    isSignedIn: isSignedIn,
    currentEmail: currentEmail,
    signIn: signIn,
    signOut: signOut,
    getDoc: getDoc,
    listDocs: listDocs,
    putDoc: putDoc,
    delDoc: delDoc,
    putPoster: putPoster,
    fetchFeed: fetchFeed,
  };
})();
