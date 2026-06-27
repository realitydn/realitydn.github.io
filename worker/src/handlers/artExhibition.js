/**
 * Art Exhibition form submission handler
 *
 * Note (2026-06, WP6): proposals now post cross-origin from the website
 * directly to the hub (app.realitydn.com /api/proposals), which owns
 * persistence + review. The Notion and Google Sheets writes were removed.
 * This handler is retained only as a no-op fallback: it validates the
 * payload and sends the best-effort Resend confirmation email, so a
 * same-origin POST (Plan A, if a proxy is ever added) still works.
 */

import { validateArtExhibitionPayload } from '../utils/validate.js';
import { sendConfirmationEmail } from '../services/resend.js';

export async function handleArtExhibition(request, env) {
  try {
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return createErrorResponse(400, 'Invalid JSON payload');
    }

    // Validate required fields and honeypot
    const validationErrors = validateArtExhibitionPayload(body);
    if (validationErrors.length > 0) {
      console.error('Art exhibition validation failed:', JSON.stringify(validationErrors));
      console.error('Received fields:', Object.keys(body).join(', '));
      return createErrorResponse(400, 'Validation failed', validationErrors);
    }

    // Send confirmation email (non-critical - best effort)
    const emailResult = await sendConfirmationEmail(env, body.email, 'art-exhibition', body).catch(error => {
      console.error('Error sending email:', error);
      return { success: false, error: error.message };
    });

    if (!emailResult.success && !emailResult.skipped) {
      console.warn('Confirmation email failed:', emailResult.error);
    }

    return createSuccessResponse({
      message: 'Art exhibition proposal received successfully',
      emailSent: emailResult.success
    });
  } catch (error) {
    console.error('Unexpected error in handleArtExhibition:', error);
    return createErrorResponse(500, 'An unexpected error occurred');
  }
}

function createSuccessResponse(data) {
  return new Response(JSON.stringify({
    success: true,
    ...data
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

function createErrorResponse(status, message, errors = []) {
  return new Response(JSON.stringify({
    success: false,
    message,
    errors: errors.length > 0 ? errors : undefined
  }), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}
