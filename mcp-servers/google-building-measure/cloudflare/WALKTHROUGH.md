# Cloudflare Worker Deploy: Step-by-Step Walkthrough

Take a breath. This guide tells you exactly what you'll see and exactly what to click. No coding required. Total time: about 15 minutes.

---

## Part 1: Before You Click Anything

You need two API keys. Get both of these first, or the rest won't work.

### Key 1: Google Maps API Key

- [ ] Go to https://console.cloud.google.com/
- [ ] Sign in with your Google account
- [ ] Create a new project (top bar dropdown -> "New Project") or use an existing one
- [ ] In the left menu, go to "APIs & Services" -> "Library"
- [ ] Enable these 5 APIs (search each one, click it, click "Enable"):
  1. Maps JavaScript API
  2. Geocoding API
  3. Places API
  4. Solar API
  5. Static Maps API
- [ ] Go to "APIs & Services" -> "Credentials"
- [ ] Click "Create Credentials" -> "API key"
- [ ] Copy the key. It starts with `AIza...`
- [ ] Paste it into a notes app for now. Keep it safe.

### Key 2: Gemini API Key

- [ ] Go to https://aistudio.google.com/apikey
- [ ] Sign in with your Google account
- [ ] Click "Create API key"
- [ ] Choose a project (any will do)
- [ ] Copy the key. It also starts with `AIza...`
- [ ] Paste this one into your notes app too. Label which is which.

Both keys start with `AIza` so you must label them. Do not skip this.

---

## Part 2: The Cloudflare Deploy Flow

### Step 1: Click the deploy link

Open this URL in a new tab:

https://deploy.workers.cloudflare.com/?url=https://github.com/jalleeeee/everything-claude-code/tree/claude/google-earth-solar-mcp-LTPym/mcp-servers/google-building-measure/cloudflare

### Step 2: What you'll see first

Cloudflare's page loads. You'll see a sign-in screen with these options:
- "Sign up"
- "Log in"
- "Sign in with GitHub"
- "Sign in with Google"
- "Sign in with Apple"

**Click "Sign in with GitHub"** since you already have a GitHub account. It's the fastest path.

### Step 3: Authorize GitHub

A GitHub page may appear asking you to authorize "Cloudflare Workers and Pages." You'll see a green button labeled **"Authorize Cloudflare"**.

- [ ] Click it.

If you don't see this screen, skip ahead. It means you've authorized it before.

### Step 4: The Deploy screen

You land on a Cloudflare page titled something like "Clone and deploy" or "Deploy to Workers." You'll see:
- The repository name (`everything-claude-code`)
- A field for "Repository name" (you can leave the default)
- A big purple/blue button labeled **"Create and deploy"** (or just **"Deploy"**)

- [ ] Click that big button.

### Step 5: Wait for the build

You'll see logs scrolling on screen. A spinner shows "Building..." or "Cloning repository..." This takes about 30 seconds.

When it's done, you'll see a green checkmark and text like "Deployment complete" or "Success."

- [ ] Click **"Continue to project"** or the link to view your Worker.

### Step 6: You're on the Worker dashboard

You're now looking at the dashboard for your new Worker. At the top you'll see:
- Your Worker's name
- A URL like `https://google-building-measure.your-name.workers.dev`
- Tabs across the top: "Overview," "Logs," "Deployments," "Settings"

**Do not click the URL yet.** It won't work until you add the API keys.

---

## Part 3: Setting Environment Variables (The Tricky Part)

This is where most people get stuck. Follow exactly.

### Step 1: Open Settings

- [ ] On your Worker dashboard, click the **"Settings"** tab at the top.

### Step 2: Find the Variables section

- [ ] In the left sidebar, click **"Variables and Secrets"** (sometimes labeled "Variables").

You'll see an empty list and a button labeled **"+ Add"**.

### Step 3: Add the first variable (Google Maps key)

- [ ] Click **"+ Add"**.

A small form appears with three fields:
- **Type**: a dropdown
- **Variable name**: a text box
- **Value**: a text box

Fill them in:
- [ ] Type: choose **"Secret"** from the dropdown (this encrypts the value)
- [ ] Variable name: type exactly `GOOGLE_MAPS_API_KEY` (all uppercase, with underscores, no spaces, no quotes)
- [ ] Value: paste your Google Maps key (the one starting with `AIza...`)

If there's a separate "Encrypt" toggle, turn it **ON**. This hides your key from anyone else.

- [ ] Click **"Save"** or **"Deploy"**.

### Step 4: Add the second variable (Gemini key)

- [ ] Click **"+ Add"** again.
- [ ] Type: **"Secret"**
- [ ] Variable name: `GEMINI_API_KEY` (exact case, with underscore)
- [ ] Value: paste your Gemini key
- [ ] Make sure "Encrypt" is ON
- [ ] Click **"Save"**

### Step 5: Redeploy

Your Worker won't see the new variables until you redeploy.

- [ ] Look at the top right of the page for a **"Deploy"** button (sometimes called "Redeploy").
- [ ] Click it.
- [ ] Wait a few seconds. You'll see a confirmation.

---

## Part 4: Using Your Worker

### Step 1: Open the URL

- [ ] Go back to the "Overview" tab.
- [ ] At the top you'll see your Worker URL: `https://google-building-measure.your-name.workers.dev`
- [ ] Click it.

A new tab opens with a web form.

### Step 2: Try it out

- [ ] In the address field, type any U.S. address (e.g., `1600 Pennsylvania Ave NW, Washington, DC`).
- [ ] Click **"Generate Report"**.
- [ ] Wait about 60 seconds. The Worker is calling Google Maps, the Solar API, and Gemini.

You should see a building report with measurements, solar info, and an AI summary.

### Step 3: If you see an error

If the page shows "Missing environment variables" or "API key not configured":
- Your variable names probably don't match exactly. Go back to Part 3.
- The names must be **exactly** `GOOGLE_MAPS_API_KEY` and `GEMINI_API_KEY`. Capital letters and underscores matter.

---

## Part 5: Troubleshooting

### Error: "API key not valid" or "REQUEST_DENIED"

**What it means**: Google rejected your Maps key.

**What to do**:
- Go back to https://console.cloud.google.com/
- Check that all 5 APIs are enabled (Library tab)
- Check that your key has no restrictions, or if it does, that "workers.dev" is allowed
- Copy a fresh key value and paste it again in Cloudflare

### Error: "Quota exceeded" or "Solar API not available for this location"

**What it means**: Either you've hit Google's free tier limit, or the address isn't covered by the Solar API.

**What to do**:
- Try a different U.S. address (Solar API works best in major U.S. cities)
- In Google Cloud Console, go to "Billing" and confirm a billing account is linked (Solar API requires billing enabled even for free-tier usage)

### Error: "Internal Server Error" or blank page

**What it means**: The Worker crashed, usually because of bad variables or a Gemini issue.

**What to do**:
- Go to the Worker dashboard -> "Logs" tab
- Click "Begin log stream" and refresh your Worker URL
- Read the red error message. Most often it says "GEMINI_API_KEY is missing" or "invalid key"
- Re-check Part 3 step-by-step. Pay special attention to capitalization.

---

## You're Done

If your report loaded with building measurements and an AI summary, you've successfully deployed a Cloudflare Worker. Bookmark your Worker URL. You can come back to it any time at https://dash.cloudflare.com.

To change a key later, return to Settings -> Variables and Secrets, click the three-dot menu next to the variable, and edit it. Always click "Deploy" at the top right after any change.
