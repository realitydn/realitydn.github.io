# REALITY Form Handler Worker - Complete Package

## What You Have

A production-ready Cloudflare Worker that handles form submissions for the REALITY website.

**Location:** `/sessions/lucid-modest-cannon/mnt/Main Reality Website/worker/`

**Status:** Complete and ready to deploy

## Quick Links

| What You Want | Where to Look |
|--------------|---------------|
| Get started in 5 minutes | `QUICK_START.md` |
| Deploy to production | `DEPLOYMENT.md` |
| Full documentation | `README.md` |
| Understand the architecture | `ARCHITECTURE.md` |
| Find a specific file | `FILES.md` |
| How the endpoints work | `README.md` → API Endpoints |
| Troubleshoot issues | `README.md` → Troubleshooting or `DEPLOYMENT.md` → Troubleshooting Deployment |

## What It Does

The worker handles two form endpoints:

1. **Event Proposals** (`POST /api/event-proposal`)
   - For event hosts to propose events at REALITY
   - Integrates with Notion for management
   - Optional backup to Google Sheets
   - Optional confirmation email

2. **Art Exhibitions** (`POST /api/art-exhibition`)
   - For artists to propose exhibitions
   - Integrates with Notion for management
   - Optional backup to Google Sheets
   - Optional confirmation email

## Files Included

### Code Files (7 files)
```
src/
├── index.js                    # Main router & CORS handler
├── handlers/
│   ├── eventProposal.js       # Event form handler
│   └── artExhibition.js       # Art form handler
├── services/
│   ├── notion.js              # Notion database integration
│   ├── sheets.js              # Google Sheets backup (optional)
│   └── resend.js              # Email sending (optional)
└── utils/
    └── validate.js            # Input validation
```

### Configuration (3 files)
```
wrangler.toml          # Cloudflare Worker config
package.json           # Dependencies
.env.example           # Environment variable template
```

### Documentation (6 files)
```
README.md              # Complete documentation
QUICK_START.md         # 5-minute setup reference
DEPLOYMENT.md          # Step-by-step deployment
ARCHITECTURE.md        # Technical deep-dive
FILES.md               # File inventory & purposes
INDEX.md               # This file
```

### Test Data (2 files)
```
test-event-proposal.json      # Sample event proposal
test-art-exhibition.json      # Sample art exhibition
```

## What's Configured

### Notion Databases (Already Set Up)
- Event Proposals: `9dbb8b04-5d08-4599-b34b-51ced6dbb64a`
- Art Exhibitions: `d8d20674-cb93-42aa-aed0-c72308da7eec`

### Field Mappings (Implemented)
- Event proposal fields map to Notion properties
- Art exhibition fields map to Notion properties
- Space names auto-mapped (e.g., "Ground floor lounge (1L)" → "Main Bar")
- Recurrence and flexibility values auto-mapped

### Validation (Built-in)
- All required fields validated
- Email format checked
- URL validation for portfolio links
- Arrays must have items
- Honeypot protection against spam

### Services (Optional)
- **Notion**: Required - primary database
- **Resend Email**: Optional - sends confirmation emails
- **Google Sheets**: Optional - backup copies of submissions

## To Get Started

### 1. Read First
Start with `QUICK_START.md` for a 5-minute overview.

### 2. Understand the Code
Read `ARCHITECTURE.md` to understand how it works.

### 3. Deploy
Follow `DEPLOYMENT.md` for step-by-step deployment instructions.

### 4. Integrate
Update your React forms with the worker URLs from deployment.

### 5. Test
Use the test JSON files to verify everything works:
```bash
curl -X POST https://worker-url/api/event-proposal \
  -H "Content-Type: application/json" \
  -d @test-event-proposal.json
```

## Secrets You'll Need

To deploy, you must provide these to Cloudflare:
1. **NOTION_API_KEY** - From notion.com/my-integrations
2. **RESEND_API_KEY** - From resend.com/api-keys
3. **GOOGLE_SERVICE_ACCOUNT_KEY** (optional) - From Google Cloud console

See `DEPLOYMENT.md` for exact instructions on getting each.

## Environment Variables to Configure

In `wrangler.toml`:
- `ALLOWED_ORIGIN` - Your domain (e.g., https://realitydn.com)
- `EVENT_PROPOSAL_SHEET_ID` (optional) - Google Sheets ID
- `ART_EXHIBITION_SHEET_ID` (optional) - Google Sheets ID

## API Routes

```
POST /api/event-proposal        # Submit event proposal
POST /api/art-exhibition         # Submit art exhibition
GET /health                      # Health check
OPTIONS *                        # CORS preflight
```

## Response Format

Success:
```json
{
  "success": true,
  "message": "Event proposal received successfully",
  "submissionId": "page-uuid",
  "emailSent": true,
  "backupSaved": true
}
```

Error:
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": ["Invalid email format"]
}
```

## Error Handling

- **Validation errors**: 400 status
- **Notion failure**: 500 status (critical)
- **Email/Sheets failure**: Still returns 200 (non-critical)

Only Notion failure will cause an error response. Email and Sheets failures are logged but don't block submission.

## Key Features

1. **CORS Protected** - Only allows requests from your domain
2. **Spam Protected** - Honeypot field prevents bot submissions
3. **Bilingual Emails** - Confirmation emails in English + Vietnamese
4. **Fallback Handling** - Works without email or Sheets if needed
5. **Field Mapping** - Automatically maps form fields to Notion properties
6. **Error Logging** - All errors logged for debugging

## Next Steps

1. Read `QUICK_START.md` (5 min read)
2. Set up Notion integration per `DEPLOYMENT.md` (10 min)
3. Deploy to Cloudflare (5 min)
4. Update React form endpoints (5 min)
5. Test with provided test data (2 min)
6. Monitor with `wrangler tail` (ongoing)

**Total setup time: ~30 minutes**

## Support & Debugging

- **View logs**: `wrangler tail`
- **Test locally**: `npm run dev`
- **Check errors**: See `README.md` Troubleshooting section
- **Understand flow**: See `ARCHITECTURE.md`

## Success Indicators

After deployment, verify:
- Form submissions create Notion pages
- Confirmation emails arrive (check spam)
- Rows appear in Sheets (if configured)
- No errors in `wrangler tail` logs

## File Sizes

```
Total package: 88 KB
Source code: ~1,000 lines
Documentation: ~1,500 lines
Configuration: ~50 lines
```

## Browser/Device Requirements

**Frontend (React):**
- Modern browser with fetch API
- No special requirements

**Backend (Worker):**
- Runs on Cloudflare edge network
- Available in 200+ cities worldwide
- Auto-scales with demand

## Maintenance

Regular maintenance tasks:
- Monitor logs: `wrangler tail`
- Check Notion database for submissions
- Review email delivery
- Update API keys if needed (annually)

## Production Checklist

- [ ] Secrets set in Cloudflare
- [ ] ALLOWED_ORIGIN configured
- [ ] Sheet IDs configured (if using Sheets)
- [ ] Notion integration created and verified
- [ ] Resend API key verified
- [ ] Domain route configured
- [ ] React forms updated with correct URLs
- [ ] Test submissions work end-to-end
- [ ] Monitor logs for 24 hours
- [ ] Documentation backed up

## Questions?

1. **How do I...?** → See `README.md`
2. **Why did it...?** → See `ARCHITECTURE.md`
3. **How do I deploy?** → See `DEPLOYMENT.md`
4. **I need quick info** → See `QUICK_START.md`
5. **Where is file X?** → See `FILES.md`

---

**Created:** March 31, 2026
**Worker Name:** reality-form-handler
**Status:** Ready for deployment
**Compatibility Date:** 2024-03-01

All files are in: `/sessions/lucid-modest-cannon/mnt/Main Reality Website/worker/`
