# Worker Architecture

## Overview

The REALITY Form Handler is a Cloudflare Worker that acts as a middleware between the React frontend and backend services (Notion, Google Sheets, Resend).

## High-Level Flow

```
React Form
    ↓
POST /api/event-proposal or /api/art-exhibition
    ↓
Cloudflare Worker (src/index.js)
    ├─ Route to appropriate handler
    ├─ Parse JSON
    └─ CORS handling
    ↓
Handler (eventProposal.js or artExhibition.js)
    ├─ Validate input
    ├─ Check honeypot
    ├─ Create Notion page (REQUIRED)
    ├─ Send email (optional)
    └─ Backup to Sheets (optional)
    ↓
Response to React
```

## Component Architecture

### Entry Point: `src/index.js`

**Responsibilities:**
- HTTP routing (`/api/event-proposal`, `/api/art-exhibition`, `/health`)
- CORS header management
- OPTIONS (preflight) handling
- Request/response lifecycle

**Key Functions:**
- `fetch(request, env, ctx)` - Main handler
- `addCORSHeaders(response, origin, allowedOrigin)` - Add CORS headers
- `handleOptions(origin, allowedOrigin)` - Handle preflight

**CORS Configuration:**
- Allowed origins: `https://realitydn.com` (production), `http://localhost:5173`, `http://localhost:3000` (dev)
- Methods: GET, POST, OPTIONS
- Credentials: Not sent by default (can be enabled if needed)

### Handlers: `src/handlers/`

#### `eventProposal.js`

**Responsibilities:**
- Handle `/api/event-proposal` POST requests
- Validate event proposal data
- Coordinate with services

**Key Function:**
- `handleEventProposal(request, env)` → Response

**Error Handling:**
- 400: Validation errors
- 500: Notion creation failure (critical)
- 200: Success (even if email/sheets fail)

**Notion Database:** `9dbb8b04-5d08-4599-b34b-51ced6dbb64a`

#### `artExhibition.js`

**Responsibilities:**
- Handle `/api/art-exhibition` POST requests
- Validate art exhibition data
- Coordinate with services

**Key Function:**
- `handleArtExhibition(request, env)` → Response

**Error Handling:**
- Same as event proposal

**Notion Database:** `d8d20674-cb93-42aa-aed0-c72308da7eec`

### Services: `src/services/`

#### `notion.js`

**Purpose:** Notion API integration

**Key Functions:**
- `createNotionPage(env, databaseId, properties)` - Create page in database
- `buildEventProposalProperties(formData)` - Format event data for Notion
- `buildArtExhibitionProperties(formData)` - Format art data for Notion

**API Details:**
- Endpoint: `https://api.notion.com/v1/pages`
- Auth: Bearer token (NOTION_API_KEY)
- Version: 2022-06-28

**Error Handling:**
- Throws error if API returns non-200 status
- Critical service - handler stops on error

#### `sheets.js`

**Purpose:** Google Sheets API integration (optional)

**Key Functions:**
- `appendSheetRow(env, sheetId, range, values)` - Append row to sheet
- `getAccessToken(serviceAccountKey)` - Get OAuth token from service account
- `formatEventProposalForSheets(formData)` - Format event data for Sheets
- `formatArtExhibitionForSheets(formData)` - Format art data for Sheets

**API Details:**
- Endpoint: `https://sheets.googleapis.com/v4/spreadsheets/{sheetId}/values/{range}:append`
- Auth: OAuth 2.0 with service account JWT
- Scope: `https://www.googleapis.com/auth/spreadsheets`

**Error Handling:**
- Non-critical - failures are logged but don't block submission
- Returns `{ success: false }` on error; handler continues

**Configuration:**
- SERVICE_ACCOUNT_KEY: Full JSON from Google Cloud
- EVENT_PROPOSAL_SHEET_ID: Spreadsheet ID
- ART_EXHIBITION_SHEET_ID: Spreadsheet ID

#### `resend.js`

**Purpose:** Resend email API integration (optional)

**Key Functions:**
- `sendConfirmationEmail(env, email, formType)` - Send confirmation email

**API Details:**
- Endpoint: `https://api.resend.com/emails`
- Auth: Bearer token (RESEND_API_KEY)
- From: `hello@realitydn.com`

**Email Content:**
- Bilingual (English + Vietnamese)
- Subject: "Event Proposal Received" or "Art Exhibition Proposal Received"
- HTML formatted with event-specific messaging

**Error Handling:**
- Non-critical - failures are logged but don't block submission
- Returns `{ success: false }` on error; handler continues

### Utilities: `src/utils/`

#### `validate.js`

**Purpose:** Input validation

**Key Functions:**
- `validateRequired(data, requiredFields)` - Check required fields present
- `validateEmail(email)` - Check email format
- `validateHoneypot(honeypotValue)` - Spam protection
- `validateEventProposalPayload(data)` - Full event payload validation
- `validateArtExhibitionPayload(data)` - Full art payload validation

**Validation Rules:**
- Required fields must be non-empty
- Arrays must have at least one item
- Email must match regex pattern
- Honeypot must be empty string or undefined
- Portfolio link must be valid URL

**Return Value:**
- Array of error strings (empty if valid)

## Data Flow: Event Proposal Example

```
1. Frontend sends POST /api/event-proposal with JSON body
   {
     "hostName": "John",
     "email": "john@example.com",
     "language": ["English", "Vietnamese"],
     "honeypot": ""
   }

2. Worker receives request in src/index.js
   - Identifies path as /api/event-proposal
   - Calls handleEventProposal()

3. eventProposal.js handler:
   - Parses JSON
   - Calls validateEventProposalPayload()
   - Returns 400 if validation fails
   - Calls buildEventProposalProperties() to format for Notion
   - Calls createNotionPage() → Creates page in Notion
   - If Notion fails: returns 500
   - Calls sendConfirmationEmail() → Sends email (non-critical)
   - Calls appendSheetRow() → Backs up to Sheets (non-critical)
   - Returns 200 success response

4. Response sent to frontend
   {
     "success": true,
     "submissionId": "page-uuid",
     "emailSent": true,
     "backupSaved": true
   }
```

## Notion Field Mapping

### Event Proposals

Notion properties are created with specific types:

```
{
  "Host Name": { title: [...] },           // Title property
  "Email": { email: "..." },               // Email property
  "Contact Info": { rich_text: [...] },    // Rich text
  "Language": { multi_select: [...] },     // Multi-select from array
  "Preferred Space": { multi_select: [...] }, // With "Ground floor lounge (1L)" → "Main Bar" mapping
  "Recurrence": { select: {...} },         // Select with custom mapping
  "Status": { select: { name: "Submitted" } }, // Auto-filled
  "Submitted At": { date: { start: ISO } } // Auto-filled with current timestamp
}
```

### Art Exhibitions

Similar structure with different properties:

```
{
  "Artist / Collective Name": { title: [...] },
  "Email": { email: "..." },
  "Timeline Flexibility": { select: {...} }, // "Very flexible" → "Flexible"
  "Group Show": { rich_text: "Yes (X artists)" or "No" },
  ...
}
```

## Error Handling Strategy

### Validation Errors (400)
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": ["Missing required field: email", "Invalid email format"]
}
```

### Notion Creation Failure (500) - CRITICAL
- Worker returns 500 immediately
- Email and Sheets not attempted
- User sees error message
- Submission is lost (user should retry)

### Email/Sheets Failures (200) - NON-CRITICAL
- Handler catches errors and logs them
- Returns success response anyway
- Notion page is already created (primary goal achieved)
- User sees success and doesn't need to retry

**Rationale:** Notion is the primary database. Email and Sheets are conveniences. If Notion succeeds, the submission is safely stored; other failures are acceptable.

## Security Considerations

### Honeypot Field
- Bots expect to fill hidden fields
- Checking this field catches automated submissions
- Easy to implement in forms: `<input type="honeypot" name="honeypot" style="display: none">`

### Input Validation
- All fields validated before sending to APIs
- Prevents injection attacks into Notion/Sheets/email

### CORS
- Only allows requests from configured origins
- Prevents cross-origin form submissions from other domains
- Preflight (OPTIONS) handled before actual request

### Secrets Management
- API keys stored in Cloudflare secrets, not in code
- Never logged or returned in responses
- Service account key stored as string but only used for token creation

## Performance Characteristics

### Request Latency
- Notion API call: ~500-1000ms (sequential)
- Email send: ~200-500ms (parallel after Notion)
- Sheets append: ~500-800ms (parallel after Notion)
- **Total:** Notion is blocking; email/sheets are non-blocking

### Concurrency
- Cloudflare Workers can handle many concurrent requests
- Each request is independent
- No shared state or rate limiting implemented

### Cost
- Cloudflare Workers: ~$0.50 per million requests
- Notion API: Free tier includes many requests
- Google Sheets: Free tier sufficient
- Resend: Based on emails sent (~$0.20 per email + free tier)

## Monitoring & Debugging

### Logs
- View with: `wrangler tail`
- Includes all console.log() and console.error() calls
- Timestamps and request IDs included

### Key Log Points
```javascript
// Handler start
console.log('Processing event proposal...');

// Validation
console.log('Validation errors:', errors);

// Service calls
console.log('Creating Notion page...');
console.log('Notion page created:', data.id);

// Errors
console.error('Error creating Notion page:', error);
console.error('Unexpected error in handleEventProposal:', error);
```

### Health Check
GET `/health` returns `{ status: "ok" }` instantly - use to verify worker is running.

## Deployment Considerations

### Environment Configuration
- Different `ALLOWED_ORIGIN` for dev vs production
- Same Notion/Resend credentials can be used across environments
- Separate Google Sheets for each environment (optional)

### Versioning
- Use Cloudflare's rollback feature if needed
- Keep git history of worker code

### Scaling
- Worker automatically scales with Cloudflare
- No additional configuration needed
- High availability by default

## Future Enhancements

Possible improvements:
1. Rate limiting per IP address
2. Request logging to database for analytics
3. Webhook notifications to Slack
4. Custom email templates per language
5. Signature verification for webhook security
6. Database transaction rollback on email failure
7. Retry logic for transient failures
8. Request ID tracking across services
