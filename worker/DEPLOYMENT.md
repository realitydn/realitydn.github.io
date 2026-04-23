# Deployment Guide

This guide walks through deploying the REALITY form handler worker to Cloudflare.

## Prerequisites

- Cloudflare account
- Notion integration with API key
- Resend account with API key
- Google Cloud service account (optional, for Sheets backup)
- Node.js and npm installed locally

## Step 1: Set Up Cloudflare Account

1. Create or sign into your Cloudflare account
2. Go to Workers & Pages
3. Create a new Worker (or use existing if you have one)
4. Note your account ID (visible in Workers dashboard URL or account settings)

## Step 2: Configure Notion Access

1. Go to [Notion Integrations](https://www.notion.com/my-integrations)
2. Click "Create new integration"
   - Name: "REALITY Form Handler"
   - Choose associated workspace
3. Click "Show" under "Internal Integration Token" and copy it
4. Go to the Event Proposals database (ID: 9dbb8b04-5d08-4599-b34b-51ced6dbb64a)
   - Click "..." → "Connections" → Connect your integration
5. Repeat for Art Exhibitions database (ID: d8d20674-cb93-42aa-aed0-c72308da7eec)

## Step 3: Configure Resend

1. Sign in to [Resend Console](https://resend.com)
2. Go to API Keys
3. Create a new API key or copy existing one
4. Verify that `hello@realitydn.com` is configured as a verified sender
   - Domain Settings → Add Domain if needed
   - Verify DKIM/SPF records for your domain

## Step 4: Configure Google Sheets (Optional)

Only needed if you want Sheets backup.

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create new project or select existing
3. Enable Sheets API:
   - APIs & Services → Library
   - Search "Google Sheets API"
   - Click "Enable"
4. Create service account:
   - APIs & Services → Credentials
   - Create Credentials → Service Account
   - Fill in details (name: "reality-form-handler")
   - Grant "Editor" role
   - Create JSON key
   - Download the key file
5. Create Google Sheets:
   - Create new spreadsheet for event proposals
   - Create new spreadsheet for art exhibitions
   - Note the spreadsheet IDs (in the URL: sheets.new/spreadsheets/d/{SHEET_ID})
6. Share both spreadsheets with the service account email (from JSON key)

## Step 5: Deploy the Worker

### 5a. Prepare Local Environment

```bash
cd /path/to/worker
npm install
```

### 5b. Add Secrets to Cloudflare

Using Wrangler CLI:

```bash
# Set the Notion API key
wrangler secret put NOTION_API_KEY
# Paste your Notion integration token

# Set the Resend API key
wrangler secret put RESEND_API_KEY
# Paste your Resend API key

# Set Google service account key (if using Sheets)
wrangler secret put GOOGLE_SERVICE_ACCOUNT_KEY
# Paste the entire JSON from Google Cloud (from the downloaded JSON file)
```

### 5c. Configure wrangler.toml

Edit `wrangler.toml`:

```toml
name = "reality-form-handler"
main = "src/index.js"
compatibility_date = "2024-03-01"
account_id = "your_cloudflare_account_id"

[env.production]
name = "reality-form-handler"
route = "example.com/api/*"  # Adjust domain

[env.production.vars]
ALLOWED_ORIGIN = "https://realitydn.com"
EVENT_PROPOSAL_SHEET_ID = "your_event_proposals_sheet_id"
ART_EXHIBITION_SHEET_ID = "your_art_exhibitions_sheet_id"

[env.development]
name = "reality-form-handler-dev"

[env.development.vars]
ALLOWED_ORIGIN = "http://localhost:5173"
```

### 5d. Deploy

```bash
# Test locally first
npm run dev

# Deploy to production
npm run deploy

# Or deploy to specific environment
npm run deploy:dev
```

## Step 6: Configure Your Domain

### Option A: Using Cloudflare DNS

If you use Cloudflare for DNS:

1. Go to your domain settings in Cloudflare
2. Workers Routes
3. Add route: `realitydn.com/api/*` → `reality-form-handler`

### Option B: Using Custom Domain

If you don't use Cloudflare for DNS:

1. Cloudflare Workers → Your Worker
2. Triggers → Add route
3. Add: `realitydn.com/api/*` → Select Worker
4. In your DNS provider, add CNAME: `realitydn.com` → `reality-form-handler.your-account.workers.dev`

## Step 7: Update Your React Application

In your form submission code:

```javascript
const API_BASE = 'https://realitydn.com/api';

async function submitEventProposal(data) {
  const response = await fetch(`${API_BASE}/event-proposal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return response.json();
}

async function submitArtExhibition(data) {
  const response = await fetch(`${API_BASE}/art-exhibition`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return response.json();
}
```

## Step 8: Test the Deployment

### Test Event Proposal

```bash
curl -X POST https://realitydn.com/api/event-proposal \
  -H "Content-Type: application/json" \
  -d @test-event-proposal.json
```

### Test Art Exhibition

```bash
curl -X POST https://realitydn.com/api/art-exhibition \
  -H "Content-Type: application/json" \
  -d @test-art-exhibition.json
```

### Verify Success

Check:
1. New page appears in Notion database within seconds
2. Confirmation email arrives (check spam folder)
3. New row appears in Google Sheets (if configured)

## Step 9: Monitor and Maintain

### View Worker Logs

```bash
wrangler tail
```

### Monitor Production

1. Cloudflare Dashboard → Workers → Your Worker
2. Check "Analytics" tab for request metrics
3. Watch "Logs" for errors

### Update Worker Code

After making changes:

```bash
# Test locally
npm run dev

# Deploy
npm run deploy
```

## Troubleshooting Deployment

### Worker not responding

1. Check Cloudflare Worker is deployed
2. Verify route is configured correctly
3. Check wrangler.toml has correct account_id
4. View logs: `wrangler tail`

### Notion pages not created

1. Verify NOTION_API_KEY is set: `wrangler secret list`
2. Confirm integration has database access
3. Check database IDs in handlers match your databases
4. View logs for API errors

### Emails not sent

1. Verify RESEND_API_KEY is set
2. Check `hello@realitydn.com` is verified in Resend
3. Test with Resend dashboard directly
4. Check spam folder
5. View worker logs for errors

### Sheets not updating

1. Verify GOOGLE_SERVICE_ACCOUNT_KEY is set
2. Confirm service account has Editor access to spreadsheets
3. Verify sheet IDs are correct in wrangler.toml
4. This is non-critical - check logs but don't block submissions

### CORS errors in browser

1. Verify ALLOWED_ORIGIN in wrangler.toml matches your domain
2. Check request origin matches configured origin
3. For localhost dev, ensure port matches (5173 or 3000)
4. Make sure OPTIONS requests are handled (they are in index.js)

## Rollback

If something goes wrong:

```bash
# View deployment history
wrangler deployments

# Rollback to previous version
wrangler rollback
```

## Scheduled Updates

Set up automated redeploys if you have configuration changes:

1. GitHub Actions workflow (see example below)
2. Schedule with cron: `0 0 * * 0` (weekly)

### Example GitHub Actions Workflow

```yaml
name: Deploy Worker

on:
  schedule:
    - cron: '0 0 * * 0'  # Weekly
  workflow_dispatch:  # Manual trigger

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run deploy
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
```

## Post-Deployment Checklist

- [ ] Worker deployed to production
- [ ] Domain route configured
- [ ] React forms updated with correct API endpoints
- [ ] Test submission succeeds end-to-end
- [ ] Notion page created
- [ ] Email confirmation received
- [ ] Sheets backup row created (if configured)
- [ ] Monitor logs for 24 hours
- [ ] Slack/email notification set up for errors (optional)

## Support

For issues:
1. Check logs: `wrangler tail`
2. Review troubleshooting section above
3. Test with curl using test JSON files
4. Check Cloudflare status page for incidents
