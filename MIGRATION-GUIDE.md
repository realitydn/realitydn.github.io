# Migrating REALITY from Netlify → Cloudflare Pages

This guide walks you through everything step by step. The code changes are already done — this is all about clicking through dashboards and copying values.

**Time estimate:** ~30 minutes of clicking, then a few hours waiting for DNS to propagate.

---

## Part 1: Create a Cloudflare API Token

You need this so GitHub Actions can deploy your site to Cloudflare automatically.

1. Go to [https://dash.cloudflare.com/profile/api-tokens](https://dash.cloudflare.com/profile/api-tokens)
2. Click **"Create Token"**
3. Scroll down and click **"Create Custom Token"** (at the bottom)
4. Fill in:
   - **Token name:** `realitydn-pages-deploy`
   - **Permissions:** Click "Add" and set:
     - Account → Cloudflare Pages → Edit
   - **Account Resources:** Include → your account (it'll show your email)
5. Click **"Continue to summary"** → **"Create Token"**
6. **Copy the token immediately** — you won't be able to see it again

Also grab your **Account ID** while you're here:
- Go to [https://dash.cloudflare.com](https://dash.cloudflare.com)
- Click on any domain (or the main dashboard)
- Your Account ID is in the right sidebar under "API" or in the URL: `dash.cloudflare.com/<THIS-IS-YOUR-ACCOUNT-ID>`

---

## Part 2: Add Secrets to GitHub

These secrets let the GitHub Actions workflow deploy to Cloudflare.

1. Go to your REALITY repo on GitHub
2. Click **Settings** (tab at the top of the repo page)
3. In the left sidebar, click **Secrets and variables** → **Actions**
4. Click **"New repository secret"** and add these two, one at a time:

| Name | Value |
|------|-------|
| `CLOUDFLARE_API_TOKEN` | The token you just created |
| `CLOUDFLARE_ACCOUNT_ID` | Your account ID from the dashboard |

---

## Part 3: Create the Cloudflare Pages Project

The GitHub Actions workflow will try to deploy to a project called `realitydn`. You need to create it first.

1. Go to [https://dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages**
2. Click **"Create"**
3. Click the **"Pages"** tab
4. Choose **"Direct Upload"** (NOT "Connect to Git" — we're using GitHub Actions instead)
5. Set the project name to exactly: **`realitydn`**
6. Click **"Create Project"**
7. It'll ask you to upload files — just skip this for now. The first real deploy will happen from GitHub Actions.

---

## Part 4: Push the Code Changes

The deploy workflow I created needs to be in your repo. From your project folder:

```
git add .github/workflows/deploy.yml
git commit -m "Add Cloudflare Pages deploy workflow"
git push
```

This will trigger the first deploy. Go to your GitHub repo → **Actions** tab to watch it run. It should take 2-3 minutes. If it succeeds, your site will be live at `realitydn.pages.dev`.

**If it fails:** The most common issue is the secrets not being set correctly. Double-check Part 2.

---

## Part 5: Add Your Domain to Cloudflare

Cloudflare Pages requires your domain to be managed by Cloudflare's DNS. This means moving your nameservers from Hover to Cloudflare. (Your domain registration stays at Hover — you're just telling Hover "ask Cloudflare where things are.")

1. In the Cloudflare dashboard, click **"Add a site"** → enter `realitydn.com`
2. Choose the **Free** plan
3. For AI crawlers, choose **"Do not block"** — you already have your own robots.txt
4. Cloudflare will scan your existing DNS records and import them. **Review these carefully** — make sure everything from Hover got imported (especially MX/email records if you have any). If something's missing, add it manually before continuing.
5. Cloudflare will give you two nameservers, something like:
   - `ada.ns.cloudflare.com`
   - `rick.ns.cloudflare.com`
6. **Keep this tab open** — you need those nameserver addresses for the next step.

---

## Part 6: Update Nameservers at Hover

1. Log into [https://www.hover.com/control_panel](https://www.hover.com/control_panel)
2. Click on **realitydn.com**
3. Look for **"Nameservers"** or **"Edit Nameservers"** (this is separate from the DNS records tab)
4. Replace Hover's default nameservers with the two Cloudflare gave you
5. Save

Now go back to Cloudflare and click **"Check nameservers"**. This can take anywhere from a few minutes to a few hours. Cloudflare will email you when it's active.

---

## Part 7: Connect Domain to Pages Project

Once Cloudflare confirms the nameservers are active (you'll get an email):

1. Go to **Workers & Pages** → click on **realitydn**
2. Click the **"Custom domains"** tab
3. Click **"Set up a custom domain"**
4. Enter: `realitydn.com` → follow the prompts. Since Cloudflare now controls your DNS, it'll add the right records automatically.
5. Repeat for `www.realitydn.com` if you want that too.

---

## Part 8: Verify It Works

1. Visit `https://realitydn.com` — you should see your site
2. Visit `https://realitydn.com/event-guidelines` — should work (not a 404)
3. Check that HTTPS is working (padlock icon in browser)
4. View page source on the homepage — if pre-rendering worked, you'll see actual HTML content inside the `<div id="root">` tag, not an empty div

---

## Part 9: Remove Netlify

Only do this after you've confirmed everything works on Cloudflare.

1. Go to [https://app.netlify.com](https://app.netlify.com)
2. Click on your REALITY site
3. Go to **Site configuration** → scroll to the bottom → **"Delete this site"**

You can also delete `netlify.toml` from your repo at this point if you want to clean up, though it won't hurt anything if you leave it.

---

## Troubleshooting

**"Page not found" on deep links (like /event-guidelines):**
Check that `_redirects` is in your `dist/` output. Run `npm run build` locally and look for `dist/_redirects`.

**GitHub Action fails with "project not found":**
Make sure the project name in Cloudflare Pages is exactly `realitydn` (lowercase, no spaces). It must match what's in the workflow file.

**GitHub Action fails with "authentication error":**
Your `CLOUDFLARE_API_TOKEN` secret is wrong or expired. Create a new one (Part 1) and update the secret (Part 2).

**Site loads but looks broken (no styles):**
Clear your browser cache or try incognito. Old Netlify cached assets might be interfering.

**DNS not resolving after several hours:**
Use [https://dnschecker.org](https://dnschecker.org) to check propagation. If it's been over 24 hours, double-check your records at Hover.
