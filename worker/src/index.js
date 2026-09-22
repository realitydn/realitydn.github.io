/**
 * REALITY Form Handler Worker
 * Handles form submissions for event proposals and art exhibitions
 */

import { handleEventProposal } from './handlers/eventProposal.js';
import { handleArtExhibition } from './handlers/artExhibition.js';

const DEFAULT_ALLOWED_ORIGINS = 'https://realitydn.com,https://www.realitydn.com';

/**
 * Is this a dev deployment? Only `wrangler dev --env development` /
 * `wrangler deploy --env development` set ENVIRONMENT=development (see
 * wrangler.toml). Production has ENVIRONMENT=production, and a missing value
 * is treated as production too — localhost must never be trusted by default.
 */
function isDevEnv(env) {
  return String(env.ENVIRONMENT || '').toLowerCase() === 'development';
}

/**
 * Check if origin is allowed.
 *
 * Production: exactly the configured ALLOWED_ORIGIN list (realitydn.com and
 * www). Development: that list plus any http://localhost:* or
 * http://127.0.0.1:* origin, for the Vite dev server. Localhost used to be
 * allowed unconditionally, in production too — any page served from a
 * visitor's own machine could post as if it were the site.
 */
function isOriginAllowed(origin, allowedOrigins, env) {
  if (!origin) return false;
  if (allowedOrigins.includes(origin)) return true;
  if (isDevEnv(env)) {
    return /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
  }
  return false;
}

/**
 * Add CORS headers to response
 */
function addCORSHeaders(response, origin, allowedOrigins, env) {
  const headers = new Headers(response.headers);

  if (isOriginAllowed(origin, allowedOrigins, env)) {
    headers.set('Access-Control-Allow-Origin', origin);
  }
  // The ACAO value depends on the request's Origin, so caches must key on it.
  headers.append('Vary', 'Origin');

  headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  headers.set('Access-Control-Max-Age', '86400');

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

/**
 * Handle preflight requests
 */
function handleOptions(origin, allowedOrigins, env) {
  const headers = {
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin'
  };

  if (isOriginAllowed(origin, allowedOrigins, env)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }

  return new Response(null, {
    status: 204,
    headers
  });
}

/**
 * Main request handler
 */
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const origin = request.headers.get('origin') || '';
    // ALLOWED_ORIGIN may be a single origin or a comma-separated list
    // (e.g. "https://realitydn.com,https://www.realitydn.com").
    const allowedOrigins = (env.ALLOWED_ORIGIN || DEFAULT_ALLOWED_ORIGINS)
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean);

    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return handleOptions(origin, allowedOrigins, env);
    }

    // Server-side Origin gate for every POST. CORS alone doesn't protect this
    // endpoint: the handlers parse the body with request.json() whatever its
    // Content-Type, so a cross-site "simple" text/plain POST never triggers a
    // preflight and used to go straight through — and every accepted POST
    // sends an email from hello@realitydn.com to an address in the payload.
    // Browsers always send Origin on POST (same-origin included), so the site's
    // own forms are unaffected; a missing Origin means a non-browser client.
    //
    // This stops drive-by abuse from other websites. It does NOT stop a script
    // that forges the header — that needs a Cloudflare rate-limiting rule on
    // realitydn.com/api/* (dashboard → Security → WAF → Rate limiting rules).
    if (request.method === 'POST' && !isOriginAllowed(origin, allowedOrigins, env)) {
      return addCORSHeaders(
        new Response(JSON.stringify({ success: false, message: 'Forbidden' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        }),
        origin,
        allowedOrigins,
        env
      );
    }

    // Route requests
    let response;

    if (url.pathname === '/api/event-proposal' && request.method === 'POST') {
      response = await handleEventProposal(request, env);
    } else if (url.pathname === '/api/art-exhibition' && request.method === 'POST') {
      response = await handleArtExhibition(request, env);
    } else if (url.pathname === '/health' && request.method === 'GET') {
      response = new Response(JSON.stringify({ status: 'ok' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      response = new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Add CORS headers to all responses
    return addCORSHeaders(response, origin, allowedOrigins, env);
  }
};
