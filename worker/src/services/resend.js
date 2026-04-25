/**
 * Resend email API helper service
 */

const RESEND_API_BASE = 'https://api.resend.com/emails';

export async function sendConfirmationEmail(env, email, formType, formData) {
  try {
    if (!env.RESEND_API_KEY) {
      console.warn('RESEND_API_KEY not set - skipping email');
      return { success: false, skipped: true, message: 'Resend credentials not configured' };
    }

    const subject = formType === 'event-proposal' ? 'Event Proposal Received' : 'Art Exhibition Proposal Received';
    const confirmationMessage = formType === 'event-proposal'
      ? 'Thanks for your event proposal submission! We\'ll review it and get back to you within a few days.'
      : 'Thanks for your art exhibition proposal submission! We\'ll review it and get back to you within a few days.';

    const confirmationMessageVI = 'Cảm ơn bạn đã gửi đơn đề xuất! Chúng tôi sẽ xem xét và liên hệ lại trong vài ngày tới.';

    // Build a summary of what they submitted
    const summaryHtml = formData ? buildSubmissionSummary(formType, formData) : '';

    const htmlContent = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Thank you for your submission!</h2>
        <p>${confirmationMessage}</p>

        ${summaryHtml}

        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;" />

        <h2>Cảm ơn bạn!</h2>
        <p>${confirmationMessageVI}</p>

        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;" />

        <p style="color: #666; font-size: 12px;">
          REALITY | Đà Nẵng<br/>
          hello@realitydn.com
        </p>
      </div>
    `;

    const response = await fetch(RESEND_API_BASE, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'REALITY <hello@realitydn.com>',
        to: email,
        subject: subject,
        html: htmlContent
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Resend API error:', response.status, errorData);
      return { success: false, error: `Resend API error: ${response.status}` };
    }

    const data = await response.json();
    console.log('Confirmation email sent:', data.id);
    return { success: true, messageId: data.id };
  } catch (error) {
    console.error('Error sending confirmation email:', error);
    return { success: false, error: error.message };
  }
}

function buildSubmissionSummary(formType, data) {
  const row = (label, value) =>
    value ? `<tr><td style="padding:6px 12px 6px 0;color:#666;vertical-align:top;white-space:nowrap;">${label}</td><td style="padding:6px 0;">${value}</td></tr>` : '';

  const arr = (v) => Array.isArray(v) ? v.join(', ') : v;

  if (formType === 'event-proposal') {
    return `
      <div style="margin:24px 0;">
        <h3 style="font-size:14px;color:#666;margin-bottom:8px;">Here's what you submitted:</h3>
        <table style="font-size:14px;border-collapse:collapse;width:100%;">
          ${row('Name', data.hostName)}
          ${row('Organization', data.organization)}
          ${row('Email', data.email)}
          ${row('Contact', data.contact)}
          ${row('Event', data.eventTitle)}
          ${row('Description', data.eventDescription)}
          ${row('Recurrence', data.recurrence)}
          ${row('Schedule', data.daysAndTimes)}
          ${row('Duration', data.duration)}
          ${row('Cost', data.eventCost)}
          ${row('Languages', arr(data.languages))}
          ${row('Space', arr(data.preferredSpace))}
          ${row('Equipment', arr(data.equipment))}
          ${row('Notes', data.anythingElse)}
        </table>
      </div>`;
  }

  if (formType === 'art-exhibition') {
    return `
      <div style="margin:24px 0;">
        <h3 style="font-size:14px;color:#666;margin-bottom:8px;">Here's what you submitted:</h3>
        <table style="font-size:14px;border-collapse:collapse;width:100%;">
          ${row('Name', data.name)}
          ${row('Artist / Collective', data.artistName)}
          ${row('Email', data.email)}
          ${row('Contact', data.contact)}
          ${row('Location', data.location)}
          ${row('Bio', data.bio)}
          ${row('Portfolio', data.portfolioLink)}
          ${row('Concept', data.showConcept)}
          ${row('Spaces', arr(data.spaces))}
          ${row('Scale', data.spaceScale)}
          ${row('Installation', data.installationNeeds)}
          ${row('Dates', data.preferredDates)}
          ${row('Flexibility', data.flexibility)}
          ${row('Group show', data.groupShow)}
        </table>
      </div>`;
  }

  return '';
}
