/**
 * Art Exhibition form submission handler
 */

import { validateArtExhibitionPayload } from '../utils/validate.js';
import { createNotionPage, buildArtExhibitionProperties } from '../services/notion.js';
import { appendSheetRow, formatArtExhibitionForSheets } from '../services/sheets.js';
import { sendConfirmationEmail } from '../services/resend.js';

const ART_EXHIBITION_DB_ID = '13e35baff66941c58470ca8906f891ad';

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

    // Create Notion page (primary integration - must succeed)
    let notionResult;
    try {
      const properties = buildArtExhibitionProperties(body);
      notionResult = await createNotionPage(env, ART_EXHIBITION_DB_ID, properties);
    } catch (error) {
      console.error('Critical error: Notion creation failed', error);
      return createErrorResponse(500, 'Failed to process submission. Please try again.');
    }

    // Send confirmation email (non-critical - best effort)
    const emailResult = await sendConfirmationEmail(env, body.email, 'art-exhibition', body).catch(error => {
      console.error('Error sending email:', error);
      return { success: false, error: error.message };
    });

    if (!emailResult.success && !emailResult.skipped) {
      console.warn('Email notification failed but Notion succeeded:', emailResult.error);
    }

    // Append to Sheets (non-critical - best effort)
    let sheetsResult = { success: true };
    if (env.ART_EXHIBITION_SHEET_ID) {
      const rowData = formatArtExhibitionForSheets(body);
      sheetsResult = await appendSheetRow(env, env.ART_EXHIBITION_SHEET_ID, 'Form Responses 1', rowData).catch(error => {
        console.error('Error appending to Sheets:', error);
        return { success: false, error: error.message };
      });

      if (!sheetsResult.success && !sheetsResult.skipped) {
        console.warn('Sheets backup failed but Notion succeeded:', sheetsResult.error);
      }
    }

    return createSuccessResponse({
      message: 'Art exhibition proposal received successfully',
      submissionId: notionResult.pageId,
      emailSent: emailResult.success,
      backupSaved: sheetsResult.success
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
