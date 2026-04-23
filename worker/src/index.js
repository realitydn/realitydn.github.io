/**
 * REALITY Form Handler Worker
 * Handles form submissions for event proposals and art exhibitions
 */

import { handleEventProposal } from './handlers/eventProposal.js';
import { handleArtExhibition } from './handlers/artExhibition.js';

/**
 * Add CORS headers to response
 */
function addCORSHeaders(response, origin, allowedOrigin) {
  const headers = new Headers(response.headers);

  // Only allow CORS from configured origins
  if (origin === allowedOrigin || origin === 'http://localhost:5173' || origin === 'http://localhost:3000') {
    headers.set('Access-Control-Allow-Origin', origin);
  }

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
function handleOptions(origin, allowedOrigin) {
  const headers = {
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400'
  };

  if (origin === allowedOrigin || origin === 'http://localhost:5173' || origin === 'http://localhost:3000') {
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
    const allowedOrigin = env.ALLOWED_ORIGIN || 'https://realitydn.com';

    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return handleOptions(origin, allowedOrigin);
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
    return addCORSHeaders(response, origin, allowedOrigin);
  }
};
