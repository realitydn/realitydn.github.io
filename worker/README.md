# REALITY Form Handler Worker

A Cloudflare Worker that handles form submissions for the REALITY website, integrating with Notion, Google Sheets, and Resend email.

## Overview

This worker processes two form types:
- **Event Proposals**: `/api/event-proposal`
- **Art Exhibitions**: `/api/art-exhibition`

Each submission is:
1. Validated for required fields and honeypot protection
2. Written to Notion database
3. Backed up to Google Sheets (optional)
4. Confirmation email sent via Resend (optional)

## Architecture

- `src/index.js` - Main worker entry point, routing, CORS handling
- `src/handlers/` - Form-specific request handlers
- `src/services/` - Integration services (Notion, Sheets, Resend)
- `src/utils/` - Validation utilities

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Edit `wrangler.toml` and add the following secrets:

```bash
wrangler secret put NOTION_API_KEY
wrangler secret put RESEND_API_KEY
wrangler secret put GOOGLE_SERVICE_ACCOUNT_KEY
```

### Configuration Values

Create/update `wrangler.toml`:

```toml
[env.production]
name = "reality-form-handler"
main = "src/index.js"
compatibility_date = "2024-03-01"

[env.production.vars]
ALLOWED_ORIGIN = "https://realitydn.com"
EVENT_PROPOSAL_SHEET_ID = "YOUR_SHEET_ID_HERE"
ART_EXHIBITION_SHEET_ID = "YOUR_SHEET_ID_HERE"

[env.development]
vars = { ALLOWED_ORIGIN = "http://localhost:5173" }
```

### Required Secrets

#### NOTION_API_KEY
1. Go to [Notion Integrations](https://www.notion.com/my-integrations)
2. Create a new integration
3. Copy the API key
4. Give it access to the databases:
   - Event Proposals: `9dbb8b04-5d08-4599-b34b-51ced6dbb64a`
   - Art Exhibitions: `d8d20674-cb93-42aa-aed0-c72308da7eec`

#### RESEND_API_KEY
1. Go to [Resend API Keys](https://resend.com/api-keys)
2. Create or copy an existing API key
3. Ensure the account is configured with `hello@realitydn.com`

#### GOOGLE_SERVICE_ACCOUNT_KEY
1. Create a Google Cloud service account with Sheets API access
2. Create a JSON key
3. Paste the entire JSON key as the secret

```bash
wrangler secret put GOOGLE_SERVICE_ACCOUNT_KEY
# Then paste the entire JSON content from Google Cloud
```

## Deployment

### Development

```bash
npm run dev
```

The worker will be available at `http://localhost:8787`

### Production

```bash
npm run deploy
```

## API Endpoints

### Event Proposal

**Endpoint:** `POST /api/event-proposal`

**Request Body:**
```json
{
  "hostName": "John Doe",
  "email": "john@example.com",
  "contact": "+84 123 456 789",
  "eventDescription": "Monthly book club meeting",
  "recurrence": "Monthly",
  "schedule": "Every second Tuesday at 7 PM",
  "duration": "2 hours",
  "cost": "Free with drinks purchase",
  "language": ["English", "Vietnamese"],
  "space": ["Ground floor lounge (1L)", "Reading nook"],
  "equipment": ["Projector", "Sound system"],
  "anythingElse": "We might bring some snacks",
  "honeypot": ""
}
```

**Required Fields:**
- hostName, email, contact, eventDescription, recurrence, schedule, duration, cost, language (array), space (array), equipment (array)

**Response:**
```json
{
  "success": true,
  "message": "Event proposal received successfully",
  "submissionId": "page-uuid",
  "emailSent": true,
  "backupSaved": true
}
```

### Art Exhibition

**Endpoint:** `POST /api/art-exhibition`

**Request Body:**
```json
{
  "artistName": "Luna Studios",
  "name": "Sarah Chen",
  "email": "sarah@example.com",
  "location": "Da Nang, Vietnam",
  "contact": "+84 123 456 789",
  "bio": "Contemporary artist focused on sustainable materials",
  "portfolioLink": "https://sarahchen.art",
  "showConcept": "Exploring zero-waste art practices",
  "spaces": ["Main Gallery", "Side Room"],
  "spaceScale": "Medium (500-1000 sq ft)",
  "installationNeeds": "Wall space, lighting",
  "preferredDates": "April-June 2026",
  "flexibility": "Somewhat flexible",
  "groupShow": "no",
  "honeypot": ""
}
```

**Required Fields:**
- email, name, location, contact, bio, portfolioLink, showConcept, spaceScale, preferredDates, flexibility, groupShow

**Optional Fields:**
- artistName, spaces (array), installationNeeds, artistCount (if groupShow=yes), curator (if groupShow=yes)

**Response:**
```json
{
  "success": true,
  "message": "Art exhibition proposal received successfully",
  "submissionId": "page-uuid",
  "emailSent": true,
  "backupSaved": true
}
```

## Form Field Mappings

### Event Proposal → Notion

| Form Field | Notion Property | Notes |
|-----------|----------------|-------|
| hostName | Host Name (title) | |
| email | Email | |
| contact | Contact Info | |
| eventDescription | Event Description | |
| recurrence | Recurrence | "Weekly/Biweekly/Monthly" → "Recurring"; "One-time" → "One-time"; "Let's discuss" → empty + note in Additional Notes |
| schedule | Scheduling Preferences | |
| duration | Duration | |
| cost | Cost | |
| language | Language (multi-select) | |
| space | Preferred Space (multi-select) | "Ground floor lounge (1L)" → "Main Bar" |
| equipment | Equipment Needed | Join array as comma-separated |
| anythingElse | Additional Notes | |
| (auto) | Status | "Submitted" |
| (auto) | Submitted At | ISO timestamp |

### Art Exhibition → Notion

| Form Field | Notion Property | Notes |
|-----------|----------------|-------|
| artistName or name | Artist / Collective Name (title) | Falls back to name if artistName blank |
| email | Email | |
| name | Contact Name | |
| location | Location / Availability | |
| contact | Contact Info | |
| bio | Artist Bio | |
| portfolioLink | Portfolio Link (url) | |
| showConcept | Show Concept | |
| spaces | Spaces Requested (multi-select) | |
| spaceScale | Space Scale | |
| installationNeeds | Installation Needs | |
| preferredDates | Preferred Dates | |
| flexibility | Timeline Flexibility (select) | "Very flexible" → "Flexible" |
| groupShow + artistCount | Group Show | "Yes (X artists)" or "No" |
| curator | Curator / Point of Contact | |
| (auto) | Status | "Submitted" |
| (auto) | Submitted At | ISO timestamp |

## Error Handling

### Validation Errors
Returns 400 status with validation messages.

### Critical Errors (Notion fails)
Returns 500 status. Notion is the primary database and required for success.

### Non-Critical Failures
Email and Sheets failures are logged but don't prevent success response:
- Sheets backup is optional
- Email confirmation is optional
- Notion is required

## Development Notes

### Testing Locally

```bash
npm run dev

# In another terminal, test with curl
curl -X POST http://localhost:8787/api/event-proposal \
  -H "Content-Type: application/json" \
  -d @test-event-proposal.json
```

### CORS

CORS is enabled for:
- Production: `https://realitydn.com`
- Development: `http://localhost:5173`, `http://localhost:3000`

### Health Check

GET `/health` returns `{ status: "ok" }`

## Deployment Checklist

- [ ] Set `NOTION_API_KEY` secret
- [ ] Set `RESEND_API_KEY` secret
- [ ] Set `GOOGLE_SERVICE_ACCOUNT_KEY` secret
- [ ] Configure `ALLOWED_ORIGIN` in `wrangler.toml`
- [ ] Configure sheet IDs for Event Proposals and Art Exhibitions
- [ ] Test with sample submissions
- [ ] Verify Notion pages are created
- [ ] Verify emails are sent
- [ ] Monitor worker logs for errors

## Next Steps

1. Deploy the worker: `npm run deploy`
2. Get the worker URL from Cloudflare dashboard
3. Update form submission endpoints in React site
4. Configure Google Sheets (see sheets.js note about spreadsheet IDs)
5. Test end-to-end with actual form submissions

## Troubleshooting

### Notion pages not created
- Check NOTION_API_KEY is set correctly
- Verify integration has access to databases
- Check database IDs in handlers match your databases

### Emails not sent
- Check RESEND_API_KEY is valid
- Verify `hello@realitydn.com` is configured in Resend
- Check spam folder

### Sheets backup not working
- Check GOOGLE_SERVICE_ACCOUNT_KEY is valid JSON
- Verify service account has Sheets API access
- Configure spreadsheet IDs in wrangler.toml
- Note: This is a non-critical failure; check logs

### CORS errors
- Check origin header matches `ALLOWED_ORIGIN` in wrangler.toml
- For localhost development, ensure port matches (5173 or 3000)
