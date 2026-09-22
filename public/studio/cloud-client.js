/* ============================================================
   REALITY STUDIOS — shared cloud client  (window.RCloud)
   ------------------------------------------------------------
   WP9 (Events Platform) part E. An ES module in the Studio's bundle
   (imported by main.jsx before the app modules). The IIFE below still
   sets window.RCloud — a permanent global, see main.jsx — and the
   module exports that same object as RCloud.

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
   — honoured ONLY when the Studio itself is served from localhost /
   127.0.0.1. Anywhere else ?hub= is ignored (see hub() below).
   ============================================================ */
(function () {
  'use strict';

  // Guard: never clobber an existing RCloud (double-load safety).
  if (window.RCloud) return;

  var DEFAULT_HUB = 'https://app.realitydn.com';
  var TOKEN_KEY = 'reality-hub-token-v1';
  var TOKEN_MSG = 'reality-studio-token';
  var SIGNIN_TIMEOUT_MS = 60000;
  // A hub request that hasn't finished in this long is abandoned (resolves
  // null like any network failure) so a hung connection can't leave a Save /
  // Send button spinning forever. Generous on purpose: poster uploads are
  // multi-MB and the hub is a long way from Đà Nẵng.
  var CALL_TIMEOUT_MS = 20000;
  var LOG = '[rcloud]';

  /* ---- hub origin (override via ?hub=, allowlisted) ----------------------- */
  // call() attaches the stored Bearer token to every request it sends to hub(),
  // so hub() must never be steerable by a stranger: an unchecked ?hub= meant a
  // crafted link (…/studio/?hub=https://evil.example) shipped the token to
  // whoever wrote it. Only two overrides are honoured:
  //   • the production hub itself (harmless, same as the default), and
  //   • http://localhost:* / http://127.0.0.1:* — and ONLY while this page is
  //     itself running on localhost/127.0.0.1, i.e. on Donald's machine.
  // Anything else is ignored (one console line) and the default hub is used.
  // The override is reduced to its origin, so a path/query smuggled into it
  // can't reshape the request URLs either.
  function isLocalHost(hostname) {
    return hostname === 'localhost' || hostname === '127.0.0.1';
  }
  var warnedHub = false;
  function hub() {
    try {
      var q = new URLSearchParams(window.location.search);
      var h = q.get('hub');
      if (h) {
        var u = new URL(h);
        if (u.origin === DEFAULT_HUB) return DEFAULT_HUB;
        if (u.protocol === 'http:' && isLocalHost(u.hostname) &&
            isLocalHost(window.location.hostname)) {
          return u.origin;
        }
        if (!warnedHub) {
          warnedHub = true;
          console.info(LOG, 'ignoring ?hub= override (not allowlisted):', u.origin);
        }
      }
    } catch (e) { /* ignore — malformed URL falls through to default */ }
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
  // no-op cleanly. A request (response headers AND body) still unfinished after
  // CALL_TIMEOUT_MS is aborted and resolves null like any network failure.
  function call(method, path, opts) {
    opts = opts || {};
    var t = readToken();
    var headers = Object.assign({}, opts.headers || {});
    if (t && t.token && opts.auth !== false) headers['Authorization'] = 'Bearer ' + t.token;
    var ctrl = null;
    var timer = null;
    try {
      if (typeof AbortController === 'function') {
        ctrl = new AbortController();
        timer = setTimeout(function () { ctrl.abort(); }, CALL_TIMEOUT_MS);
      }
    } catch (e) { ctrl = null; }
    function done() { if (timer) { clearTimeout(timer); timer = null; } }
    return fetch(hub() + path, {
      method: method,
      headers: headers,
      body: opts.body,
      // bearer-token auth, NOT cookies — keep it simple + CORS-safe
      credentials: 'omit',
      mode: 'cors',
      cache: 'no-store',
      signal: ctrl ? ctrl.signal : undefined,
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
        done();
        return { ok: res.ok, status: res.status, json: json, text: text };
      });
    }).catch(function (err) {
      done();
      if (err && err.name === 'AbortError') {
        console.info(LOG, method, path, 'timed out after ' + (CALL_TIMEOUT_MS / 1000) + 's; staying local-only');
      } else {
        console.info(LOG, method, path, 'failed (offline/blocked):', err && err.message);
      }
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
  // getDoc(studio, docId) → { studio, doc_id, title, json, updated_at } | null.
  // The hub wraps its responses: GET one → { doc }, GET list → { docs } — read
  // those first (the old .document/.documents keys never existed server-side).
  function getDoc(studio, docId) {
    if (!isSignedIn()) { return Promise.resolve(null); }
    var qs = '?studio=' + encodeURIComponent(studio) + '&doc_id=' + encodeURIComponent(docId);
    return call('GET', '/api/studio/documents' + qs).then(function (r) {
      if (!r || !r.ok || !r.json) return null;
      var doc = ('doc' in r.json) ? r.json.doc : (r.json.document || r.json);
      if (!doc) return null;
      // normalise the store's updated_at → the updatedAt callers compare on
      if (doc.updatedAt == null && doc.updated_at != null) doc.updatedAt = doc.updated_at;
      return doc;
    });
  }

  // listDocs(studio) → array of { doc_id, title, json, updated_at, ... } | []
  function listDocs(studio) {
    if (!isSignedIn()) { return Promise.resolve([]); }
    var qs = '?studio=' + encodeURIComponent(studio);
    return call('GET', '/api/studio/documents' + qs).then(function (r) {
      if (!r || !r.ok || !r.json) return [];
      var list = r.json.docs || r.json.documents || r.json || [];
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
  // putPoster(eventId, slot, blob, contentType, opts)
  //   → { ok, slot, url, seriesWide, seriesForced } | null.
  // slot ∈ { feed, poster4x5, square1x1, story }.
  // opts.scope === 'series' asks the hub to stamp the whole series — the series
  // default plus EVERY date, hand-edited ones included. The field is omitted
  // entirely for a normal send, and a hub that predates it simply ignores the
  // extra form part and answers seriesForced: undefined.
  function putPoster(eventId, slot, blob, contentType, opts) {
    if (!isSignedIn()) { return Promise.resolve(null); }
    if (!eventId || !slot || !blob) { return Promise.resolve(null); }
    var fd;
    try {
      fd = new FormData();
      fd.append('slot', slot);
      var ct = contentType || (blob && blob.type) || 'image/png';
      var ext = ct.indexOf('webp') >= 0 ? 'webp'
        : (ct.indexOf('jpeg') >= 0 || ct.indexOf('jpg') >= 0 ? 'jpg' : 'png');
      fd.append('file', blob, slot + '.' + ext);
      if (opts && opts.scope) fd.append('scope', String(opts.scope));
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

  /* ---- upload-size optimizer ---------------------------------------------- */
  // optimizeImage(blob, targetW, targetH, opts) → Promise<{ blob, type }>.
  // Downscales a render (typically the 2x-supersampled export PNG) to
  // targetW×targetH and re-encodes it for UPLOAD — WebP by default, JPEG when
  // opts.prefer === 'image/jpeg' (the story slot: Instagram's share intake
  // doesn't reliably take WebP) or when the browser can't encode WebP (Safari
  // silently falls back to PNG in toBlob, which we detect by the result type).
  // The full-res PNG stays local — this only shrinks what we send to the hub.
  // Never throws; never returns something BIGGER than the input — on any
  // failure it resolves with the original blob untouched.
  function optimizeImage(blob, targetW, targetH, opts) {
    opts = opts || {};
    var fallback = { blob: blob, type: (blob && blob.type) || 'image/png' };
    return new Promise(function (resolve) {
      try {
        if (!blob || typeof window.createImageBitmap !== 'function') { resolve(fallback); return; }
        createImageBitmap(blob).then(function (bmp) {
          try {
            // never upscale — cap the target at the rendered size
            var w = Math.max(1, Math.min(Math.round(targetW || bmp.width), bmp.width));
            var h = Math.max(1, Math.round(targetH ? Math.min(targetH, bmp.height) : bmp.height * (w / bmp.width)));
            var c = document.createElement('canvas');
            c.width = w; c.height = h;
            var ctx = c.getContext('2d');
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(bmp, 0, 0, w, h);
            try { bmp.close(); } catch (e0) {}
            var wantJpeg = opts.prefer === 'image/jpeg';
            function encodeJpeg() {
              // renders are opaque (export sets backgroundColor), so JPEG is safe
              c.toBlob(function (jpg) {
                if (jpg && jpg.size < blob.size) resolve({ blob: jpg, type: 'image/jpeg' });
                else resolve(fallback);
              }, 'image/jpeg', wantJpeg ? 0.9 : 0.85);
            }
            if (wantJpeg) { encodeJpeg(); return; }
            c.toBlob(function (webp) {
              // Safari has no WebP encoder and hands back PNG — check the type
              if (webp && webp.type === 'image/webp' && webp.size < blob.size) {
                resolve({ blob: webp, type: 'image/webp' });
              } else {
                encodeJpeg();
              }
            }, 'image/webp', 0.82);
          } catch (e) { resolve(fallback); }
        }).catch(function () { resolve(fallback); });
      } catch (e) { resolve(fallback); }
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
    optimizeImage: optimizeImage,
    fetchFeed: fetchFeed,
  };
})();

// The one RCloud (the guard above keeps an earlier copy if there is one).
export const RCloud = window.RCloud;
