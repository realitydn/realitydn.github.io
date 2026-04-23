# File Structure & Purpose

## Configuration Files

### `wrangler.toml`
Cloudflare Wrangler configuration.
- Defines worker name, entry point, compatibility date
- Sets environment variables (ALLOWED_ORIGIN)
- Configures development vs production environments

### `package.json`
Node.js project configuration.
- Lists dependencies (wrangler as dev dependency)
- Defines npm scripts (dev, deploy, deploy:dev)

### `.env.example`
Template for environment variables.
- Reference for what secrets and vars need to be set
- Copy and rename to `.env` locally (optional, for reference only)

## Main Worker Code

### `src/index.js` (89 lines)
**Main entry point - Request router and CORS handler**

Responsibilities:
- Route POST requests to appropriate handlers
- Handle CORS headers and preflight (OPTIONS) requests
- Route GET `/health` for health checks
- Return 404 for unknown routes

Key functions:
- `fetch(request, env, ctx)` - Main request handler
- `addCORSHeaders(response, origin, allowedOrigin)` - Add CORS to response
- `handleOptions(origin, allowedOrigin)` - Handle preflight requests

Allowed origins:
- Production: `https://realitydn.com`
- Development: `http://localhost:5173`, `http://localhost:3000`

## Handlers: Form-Specific Logic

### `src/handlers/eventProposal.js` (90 lines)
**Handler for POST /api/event-proposal**

Responsibilities:
- Parse and validate event proposal JSON
- Check honeypot field
- Create Notion page
- Send confirmation email (non-critical)
- Backup to Google Sheets (non-critical)

Notion database ID: `9dbb8b04-5d08-4599-b34b-51ced6dbb64a`

Required fields: hostName, email, contact, eventDescription, recurrence, schedule, duration, cost, language[], space[], equipment[]

Optional fields: anythingElse, honeypot

### `src/handlers/artExhibition.js` (91 lines)
**Handler for POST /api/art-exhibition**

Responsibilities:
- Parse and validate art exhibition JSON
- Check honeypot field
- Create Notion page
- Send confirmation email (non-critical)
- Backup to Google Sheets (non-critical)

Notion database ID: `d8d20674-cb93-42aa-aed0-c72308da7eec`

Required fields: email, name, location, contact, bio, portfolioLink, showConcept, spaceScale, preferredDates, flexibility, groupShow

Optional fields: artistName, spaces[], installationNeeds, artistCount, curator, honeypot

## Services: External API Integration

### `src/services/notion.js` (190 lines)
**Notion API integration**

Key functions:
- `createNotionPage(env, databaseId, properties)` - Create page in Notion database
- `buildEventProposalProperties(formData)` - Transform form data to Notion properties
- `buildArtExhibitionProperties(formData)` - Transform form data to Notion properties
- `mapRecurrence(recurrenceValue)` - Map form recurrence to Notion select values
- `mapEventSpaces(spaces)` - Map space names (e.g., "Ground floor lounge (1L)" → "Main Bar")

API:
- Endpoint: `https://api.notion.com/v1/pages`
- Auth: Bearer token (NOTION_API_KEY from env)
- API version: 2022-06-28
- Critical: Failures return 500 status code to caller

Field mappings implemented for:
- Event Proposal properties (title, email, rich_text, select, multi_select, date)
- Art Exhibition properties (with special handling for flexibility and group show)

### `src/services/sheets.js` (160 lines)
**Google Sheets API integration (optional)**

Key functions:
- `appendSheetRow(env, sheetId, range, values)` - Append row to spreadsheet
- `getAccessToken(serviceAccountKey)` - Get OAuth token from Google service account
- `signJWT(unsignedToken, privateKey)` - Sign JWT with RSA private key (uses SubtleCrypto)
- `formatEventProposalForSheets(formData)` - Format event data as row
- `formatArtExhibitionForSheets(formData)` - Format art data as row

API:
- Endpoint: `https://sheets.googleapis.com/v4/spreadsheets/{sheetId}/values/{range}:append`
- Auth: OAuth 2.0 Bearer token from service account JWT
- Non-critical: Failures are logged but don't prevent success response

Configuration needed:
- GOOGLE_SERVICE_ACCOUNT_KEY: Full JSON from Google Cloud service account
- EVENT_PROPOSAL_SHEET_ID: Spreadsheet ID for event backups
- ART_EXHIBITION_SHEET_ID: Spreadsheet ID for art backups

### `src/services/resend.js` (78 lines)
**Resend email API integration (optional)**

Key function:
- `sendConfirmationEmail(env, email, formType)` - Send bilingual confirmation email

API:
- Endpoint: `https://api.resend.com/emails`
- Auth: Bearer token (RESEND_API_KEY from env)
- From: `hello@realitydn.com`

Email features:
- Bilingual content (English + Vietnamese)
- HTML formatted
- Different subject/message for event vs art submissions
- Non-critical: Failures are logged but don't prevent success response

## Utilities: Validation

### `src/utils/validate.js` (120 lines)
**Input validation functions**

Key functions:
- `validateRequired(data, requiredFields)` - Check all required fields present and non-empty
- `validateEmail(email)` - Validate email format with regex
- `validateHoneypot(honeypotValue)` - Check honeypot field is empty (spam protection)
- `validateEventProposalPayload(data)` - Full validation for event proposal
- `validateArtExhibitionPayload(data)` - Full validation for art exhibition
- `isValidUrl(string)` - Validate portfolio link is valid URL

Validation rules:
- Required fields: non-empty string or non-empty array
- Email: must match `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
- URL: parseable with URL constructor
- Arrays: must have at least one item
- Honeypot: must be falsy or empty string

Returns array of error strings (empty if valid).

## Documentation

### `README.md` (280 lines)
**Complete documentation**

Contents:
- Overview of worker architecture
- Setup instructions
- Environment variable configuration
- API endpoint documentation with request/response examples
- Field mapping tables
- Error handling information
- Development notes and testing

Target audience: developers setting up and maintaining the worker

### `DEPLOYMENT.md` (350 lines)
**Step-by-step deployment guide**

Contents:
- Prerequisites
- Notion integration setup (9 steps)
- Resend configuration
- Google Sheets configuration (optional, 6 steps)
- Deployment process (5 steps)
- Domain configuration (2 options)
- React app integration example
- Testing procedures (3 tests)
- Monitoring and maintenance
- Troubleshooting section
- Rollback instructions
- GitHub Actions workflow example
- Post-deployment checklist

Target audience: DevOps/developers deploying to production

### `QUICK_START.md` (200 lines)
**5-minute quick reference**

Contents:
- Minimal install and deploy steps
- API endpoint quick reference
- Environment variables to set
- Required secrets
- React integration code snippet
- Notion database IDs
- Field mapping reference
- Common task commands
- Validation rules summary
- Error response formats
- CORS info
- Email delivery info
- File structure overview
- Quick troubleshooting

Target audience: developers who've done this before and need a reference

### `ARCHITECTURE.md` (400 lines)
**Technical architecture deep-dive**

Contents:
- High-level data flow diagram
- Component responsibilities breakdown
- Data flow examples
- Notion field mapping details
- Error handling strategy (critical vs non-critical)
- Security considerations
- Performance characteristics
- Monitoring and debugging
- Deployment considerations
- Future enhancement ideas

Target audience: senior engineers, architects, code reviewers

### `FILES.md` (this file)
**File inventory and descriptions**

Contents:
- List of all files
- Purpose of each file
- Line count and key functions
- Configuration details
- Target audiences for each doc

## Test Data

### `test-event-proposal.json`
Sample event proposal payload for testing.

Contains realistic example:
- Monthly live music event
- All required fields filled
- Arrays with multiple selections
- Honeypot empty

Usage:
```bash
curl -X POST http://localhost:8787/api/event-proposal \
  -H "Content-Type: application/json" \
  -d @test-event-proposal.json
```

### `test-art-exhibition.json`
Sample art exhibition payload for testing.

Contains realistic example:
- Luna Contemporary Studio art exhibition
- All required fields filled
- Single (non-group) show
- Honeypot empty

Usage:
```bash
curl -X POST http://localhost:8787/api/art-exhibition \
  -H "Content-Type: application/json" \
  -d @test-art-exhibition.json
```

## File Statistics

Total files: 15
- Configuration: 3 (wrangler.toml, package.json, .env.example)
- Code: 7 (index.js, 2 handlers, 3 services, 1 utils)
- Documentation: 5 (README, DEPLOYMENT, QUICK_START, ARCHITECTURE, FILES)
- Test data: 2 (test JSONs)

Total lines of code: ~1,000 (excluding comments)
Total documentation: ~1,200 lines

## Directory Structure

```
worker/
├── src/
│   ├── index.js                    (Main router)
│   ├── handlers/
│   │   ├── eventProposal.js        (Event handler)
│   │   └── artExhibition.js        (Art handler)
│   ├── services/
│   │   ├── notion.js               (Notion integration)
│   │   ├── sheets.js               (Sheets integration)
│   │   └── resend.js               (Email integration)
│   └── utils/
│       └── validate.js             (Input validation)
├── wrangler.toml                   (Wrangler config)
├── package.json                    (Dependencies)
├── .env.example                    (Env template)
├── README.md                       (Full docs)
├── DEPLOYMENT.md                   (Deploy guide)
├── QUICK_START.md                  (Quick ref)
├── ARCHITECTURE.md                 (Tech design)
├── FILES.md                        (This file)
├── test-event-proposal.json        (Test data)
└── test-art-exhibition.json        (Test data)
```

## How to Use These Files

1. **First time setup?** → Start with `QUICK_START.md`
2. **Deploying to production?** → Follow `DEPLOYMENT.md`
3. **Need full reference?** → Read `README.md`
4. **Understanding the code?** → Read `ARCHITECTURE.md`
5. **Maintaining code?** → Refer to `FILES.md` (this file)
6. **Integrating with React?** → See README.md section "API Endpoints"
7. **Debugging issues?** → Check README.md "Troubleshooting"

## Key Configuration Values to Know

```
Notion databases:
- Event Proposals: 9dbb8b04-5d08-4599-b34b-51ced6dbb64a
- Art Exhibitions: d8d20674-cb93-42aa-aed0-c72308da7eec

APIs used:
- Notion API: https://api.notion.com/v1
- Google Sheets API: https://sheets.googleapis.com/v4
- Resend API: https://api.resend.com

Environment variables needed:
- NOTION_API_KEY (secret)
- RESEND_API_KEY (secret)
- GOOGLE_SERVICE_ACCOUNT_KEY (secret, optional)
- ALLOWED_ORIGIN (var)
- EVENT_PROPOSAL_SHEET_ID (var, optional)
- ART_EXHIBITION_SHEET_ID (var, optional)

Routes:
- POST /api/event-proposal
- POST /api/art-exhibition
- GET /health
- OPTIONS * (preflight)
```
