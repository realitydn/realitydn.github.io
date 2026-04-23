# Quick Start Guide

## 5-Minute Setup

### 1. Install and Deploy

```bash
npm install
wrangler secret put NOTION_API_KEY
wrangler secret put RESEND_API_KEY
npm run deploy
```

### 2. Get Your Worker URL

After deployment, Cloudflare will give you a URL like:
```
https://reality-form-handler.your-account.workers.dev
```

### 3. Test It

```bash
curl -X POST https://reality-form-handler.your-account.workers.dev/api/event-proposal \
  -H "Content-Type: application/json" \
  -d @test-event-proposal.json
```

Expected response:
```json
{
  "success": true,
  "message": "Event proposal received successfully",
  "submissionId": "page-uuid",
  "emailSent": true,
  "backupSaved": true
}
```

## API Endpoints

### Event Proposals
```
POST /api/event-proposal
```

**Key Fields:**
- hostName, email, contact
- eventDescription
- recurrence, schedule, duration, cost
- language[], space[], equipment[]

### Art Exhibitions
```
POST /api/art-exhibition
```

**Key Fields:**
- artistName/name, email, contact
- bio, portfolioLink, showConcept
- spaceScale, preferredDates, flexibility
- groupShow (yes/no)

## Environment Variables

Add to `wrangler.toml`:

```toml
[vars]
ALLOWED_ORIGIN = "https://realitydn.com"
EVENT_PROPOSAL_SHEET_ID = "sheet-id"
ART_EXHIBITION_SHEET_ID = "sheet-id"
```

## Secrets (Required)

```bash
wrangler secret put NOTION_API_KEY
wrangler secret put RESEND_API_KEY
wrangler secret put GOOGLE_SERVICE_ACCOUNT_KEY  # Optional for Sheets
```

## Integration with React

```javascript
const response = await fetch('https://realitydn.com/api/event-proposal', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(formData)
});

const result = await response.json();
if (result.success) {
  // Show success message
} else {
  // Show error with result.message
}
```

## Notion Database IDs

- Event Proposals: `9dbb8b04-5d08-4599-b34b-51ced6dbb64a`
- Art Exhibitions: `d8d20674-cb93-42aa-aed0-c72308da7eec`

## Field Mappings Quick Reference

### Event Proposal Space Mapping
- "Ground floor lounge (1L)" → "Main Bar"
- Others stay as-is

### Art Exhibition Flexibility Mapping
- "Very flexible" → "Flexible"
- Others stay as-is

### Event Recurrence Mapping
- "Weekly/Biweekly/Monthly" → "Recurring"
- "One-time" → "One-time"
- "Let's discuss" → blank (note in Additional Notes)

## Common Tasks

### Check Logs
```bash
wrangler tail
```

### Test Locally
```bash
npm run dev
# Then in another terminal:
curl -X POST http://localhost:8787/api/event-proposal \
  -H "Content-Type: application/json" \
  -d @test-event-proposal.json
```

### Update Code and Redeploy
```bash
# Make changes to src/
npm run deploy
```

### Rollback
```bash
wrangler rollback
```

## Validation Rules

### Always Required
- Valid email format
- Non-empty string fields
- Arrays must have at least one item
- honeypot field must be empty

### Honeypot
The honeypot field acts as spam protection. It must be an empty string or undefined. If it has any value, the submission is rejected.

## Error Responses

### 400 - Validation Failed
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": ["Invalid email format", "Missing required field: email"]
}
```

### 404 - Wrong Endpoint
```json
{
  "success": false,
  "error": "Not found"
}
```

### 500 - Server Error
Means Notion creation failed (critical). Check logs with `wrangler tail`.

## Health Check

```bash
curl https://realitydn.com/api/health
# Response: { "status": "ok" }
```

## CORS

By default, CORS is allowed for:
- Production: `https://realitydn.com`
- Development: `http://localhost:5173`, `http://localhost:3000`

Modify in `wrangler.toml` under `vars.ALLOWED_ORIGIN`

## Emails

Confirmation emails are sent from `hello@realitydn.com` with bilingual content (English + Vietnamese).

If emails aren't arriving:
1. Check spam folder
2. Verify domain is verified in Resend
3. Check logs: `wrangler tail`

## File Structure

```
worker/
├── src/
│   ├── index.js              # Main entry point
│   ├── handlers/
│   │   ├── eventProposal.js
│   │   └── artExhibition.js
│   ├── services/
│   │   ├── notion.js
│   │   ├── sheets.js
│   │   └── resend.js
│   └── utils/
│       └── validate.js
├── wrangler.toml
├── package.json
├── README.md                 # Full documentation
├── DEPLOYMENT.md            # Detailed deployment guide
└── test-*.json              # Test payloads
```

## Next Steps

1. Get Notion API key from integrations page
2. Get Resend API key from console
3. Deploy: `npm run deploy`
4. Update React forms with worker URL
5. Test end-to-end
6. Monitor with `wrangler tail`

## Support

- **Errors?** Run `wrangler tail` to see detailed logs
- **Test first?** Use test JSON files: `curl -X POST ... -d @test-event-proposal.json`
- **Local dev?** Run `npm run dev` for instant feedback
