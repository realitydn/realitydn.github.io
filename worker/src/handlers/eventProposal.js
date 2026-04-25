/**
 * Event Proposal form submission handler
 */

import { validateEventProposalPayload } from '../utils/validate.js';
import { createNotionPage, buildEventProposalProperties } from '../services/notion.js';
import { appendSheetRow, formatEventProposalForSheets } from '../services/sheets.js';
import { sendConfirmationEmail } from '../services/resend.js';

const EVENT_PROPOSAL_DB_ID = 'aa5974af9aaf48cda868b33b4e8096f6';

export async function handleEventProposal(request, env) {
  try {
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return createErrorResponse(400, 'Invalid JSON payload');
    }

    // Validate required fields and honeypot
    const validationErrors = validateEventProposalPayload(body);
    if (validationErrors.length > 0) {
      return createErrorResponse(400, 'Validation failed', validationErrors);
    }

    // Create Notion page (primary integration - must succeed)
    let notionResult;
    try {
      const properties = buildEventProposalProperties(body);
      notionResult = await createNotionPage(env, EVENT_PROPOSAL_DB_ID, properties);
    } catch (error) {
      console.error('Critical error: Notion creation failed', error);
      return createErrorResponse(500, 'Failed to process submission. Please try again.');
    }

    // Send confirmation email (non-critical - best effort)
    const emailResult = await sendConfirmationEmail(env, body.email, 'event-proposal', body).catch(error => {
      console.error('Error sending email:', error);
      return { success: false, error: error.message };
    });

    if (!emailResult.success && !emailResult.skipped) {
      console.warn('Email notification failed but Notion succeeded:', emailResult.error);
    }

    // Append to Sheets (non-critical - best effort)
    let sheetsResult = { success: true };
    if (env.EVENT_PROPOSAL_SHEET_ID) {
      const rowData = formatEventProposalForSheets(body);
      sheetsResult = await appendSheetRow(env, env.EVENT_PROPOSAL_SHEET_ID, 'Sheet1', rowData).catch(error => {
        console.error('Error appending to Sheets:', error);
        return { success: false, error: error.message };
      });

      if (!sheetsResult.success && !sheetsResult.skipped) {
        console.warn('Sheets backup failed but Notion succeeded:', sheetsResult.error);
      }
    }

    return createSuccessResponse({
      message: 'Event proposal received successfully',
      submissionId: notionResult.pageId,
      emailSent: emailResult.success,
      backupSaved: sheetsResult.success
    });
  } catch (error) {
    console.error('Unexpected error in handleEventProposal:', error);
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
