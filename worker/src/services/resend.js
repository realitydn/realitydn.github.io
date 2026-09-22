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

    // No echo of the submission. The recipient address comes from the same
    // unauthenticated POST, so anything we quote back here is text a stranger
    // can mail to any inbox from hello@realitydn.com. A fixed thank-you keeps
    // the endpoint useless as a relay; the team sees the full submission in
    // Notion / Sheets / the Control Room inbox.

    const htmlContent = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Thank you for your submission!</h2>
        <p>${confirmationMessage}</p>


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

/**
 * HTML-escape a value before it goes anywhere near the email body.
 *
 * Kept for any future template that quotes user input: every POSTed field is attacker-controlled (it's whatever was POSTed),
 * and the mail goes out from hello@realitydn.com to the address in the same
 * payload — so unescaped, this endpoint would send arbitrary HTML (phishing
 * links, fake "reset your password" buttons) under REALITY's name. Escaping
 * turns all of it back into inert text. Non-strings are stringified first so
 * an object or number can't slip past as raw markup either.
 */
export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

