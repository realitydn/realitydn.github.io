/**
 * Google Sheets API helper service
 *
 * NOTE: Configure the following environment variables in wrangler.toml:
 * - GOOGLE_SERVICE_ACCOUNT_KEY: JSON key from Google Cloud service account
 * - EVENT_PROPOSAL_SHEET_ID: Spreadsheet ID for event proposals
 * - ART_EXHIBITION_SHEET_ID: Spreadsheet ID for art exhibitions
 */

const SHEETS_API_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';

/**
 * Create JWT token for Google service account
 */
function createJWT(serviceAccount, scope) {
  const header = {
    alg: 'RS256',
    typ: 'JWT'
  };

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: serviceAccount.client_email,
    scope: scope,
    aud: TOKEN_URL,
    exp: now + 3600,
    iat: now
  };

  const headerEncoded = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const payloadEncoded = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const signature = headerEncoded + '.' + payloadEncoded;

  // Note: In a real worker environment, you would use a crypto library
  // For now, this JWT creation is simplified and would need proper implementation
  return signature;
}

/**
 * Get access token from Google OAuth2
 */
async function getAccessToken(serviceAccountKey) {
  try {
    const serviceAccount = JSON.parse(serviceAccountKey);
    const scope = 'https://www.googleapis.com/auth/spreadsheets';

    // Create JWT
    const now = Math.floor(Date.now() / 1000);
    const header = { alg: 'RS256', typ: 'JWT' };
    const payload = {
      iss: serviceAccount.client_email,
      scope: scope,
      aud: TOKEN_URL,
      exp: now + 3600,
      iat: now
    };

    const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    const unsignedToken = `${headerB64}.${payloadB64}`;

    const signedToken = await signJWT(unsignedToken, serviceAccount.private_key);

    // Exchange JWT for access token
    const tokenResponse = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: signedToken
      })
    });

    if (!tokenResponse.ok) {
      throw new Error(`Failed to get access token: ${tokenResponse.statusText}`);
    }

    const data = await tokenResponse.json();
    return data.access_token;
  } catch (error) {
    console.error('Error getting Google access token:', error);
    throw error;
  }
}

/**
 * Sign JWT with private key using SubtleCrypto
 */
async function signJWT(unsignedToken, privateKey) {
  try {
    // Convert PEM private key to PKCS8 format for SubtleCrypto
    const pkcs8Key = privateKey
      .replace('-----BEGIN PRIVATE KEY-----', '')
      .replace('-----END PRIVATE KEY-----', '')
      .replace(/\n/g, '');

    const keyBytes = new Uint8Array(atob(pkcs8Key).split('').map(c => c.charCodeAt(0)));

    const cryptoKey = await crypto.subtle.importKey(
      'pkcs8',
      keyBytes.buffer,
      {
        name: 'RSASSA-PKCS1-v1_5',
        hash: 'SHA-256'
      },
      false,
      ['sign']
    );

    const messageBytes = new TextEncoder().encode(unsignedToken);
    const signatureBuffer = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', cryptoKey, messageBytes);

    const signatureArray = new Uint8Array(signatureBuffer);
    const signatureB64 = btoa(String.fromCharCode.apply(null, signatureArray))
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

    return `${unsignedToken}.${signatureB64}`;
  } catch (error) {
    console.error('Error signing JWT:', error);
    throw error;
  }
}

/**
 * Append a row to Google Sheets
 */
export async function appendSheetRow(env, sheetId, range, values) {
  try {
    if (!env.GOOGLE_SERVICE_ACCOUNT_KEY) {
      console.warn('GOOGLE_SERVICE_ACCOUNT_KEY not set - skipping Sheets backup');
      return { success: false, skipped: true, message: 'Google credentials not configured' };
    }

    const accessToken = await getAccessToken(env.GOOGLE_SERVICE_ACCOUNT_KEY);

    const response = await fetch(
      `${SHEETS_API_BASE}/${sheetId}/values/${range}:append?valueInputOption=USER_ENTERED`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          values: [values]
        })
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Sheets API error:', response.status, errorData);
      return { success: false, error: `Sheets API error: ${response.status}` };
    }

    const data = await response.json();
    console.log('Row appended to Sheets:', data.updates);
    return { success: true };
  } catch (error) {
    console.error('Error appending to Sheets:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Format Event Proposal data for Sheets
 */
export function formatEventProposalForSheets(formData) {
  return [
    new Date().toISOString(),
    formData.hostName,
    formData.email,
    formData.contact,
    formData.eventDescription,
    formData.recurrence,
    formData.daysAndTimes,
    formData.duration,
    formData.eventCost,
    Array.isArray(formData.languages) ? formData.languages.join('; ') : formData.languages,
    Array.isArray(formData.preferredSpace) ? formData.preferredSpace.join('; ') : formData.preferredSpace,
    Array.isArray(formData.equipment) ? formData.equipment.join('; ') : formData.equipment,
    formData.anythingElse || ''
  ];
}

/**
 * Format Art Exhibition data for Sheets
 */
export function formatArtExhibitionForSheets(formData) {
  const artistName = formData.artistName || formData.name;
  return [
    new Date().toISOString(),
    artistName,
    formData.email,
    formData.name,
    formData.location,
    formData.contact,
    formData.bio,
    formData.portfolioLink,
    formData.showConcept,
    Array.isArray(formData.spaces) ? formData.spaces.join('; ') : '',
    formData.spaceScale,
    formData.installationNeeds || '',
    formData.preferredDates,
    formData.flexibility,
    formData.groupShow === 'yes' ? `Yes (${formData.artistCount || '?'} artists)` : 'No',
    formData.curator || ''
  ];
}
