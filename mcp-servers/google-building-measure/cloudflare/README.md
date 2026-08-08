# Google Building Measure — Cloudflare Worker (web + MCP, no Terminal needed)

**Click ONE button, log into Cloudflare with GitHub, paste your two API keys, click Deploy. Done.**

You get a URL you can:
- Visit in your browser to type an address and get a Roofr-style report (web form)
- Add to Claude Desktop or ChatGPT as a remote MCP server (`/mcp` endpoint)
- Call from any other tool as a JSON API (`/api/measure`)

---

## 🚀 Deploy in 2 minutes

### Step 1 — Click this button:

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/jalleeeee/everything-claude-code/tree/claude/google-earth-solar-mcp-LTPym/mcp-servers/google-building-measure/cloudflare)

> If you don't have a Cloudflare account, it'll ask you to create one (free, 30 seconds, "Sign up with GitHub" is fine).

### Step 2 — Cloudflare prompts you for:

- A name for your Worker (any name, e.g. `building-measure`)
- It clones the repo and deploys automatically

### Step 3 — Add your two API keys:

After deploy, click **"Settings" → "Variables and Secrets"** in your Worker's page and add:

| Variable name | Value |
|---|---|
| `GOOGLE_MAPS_API_KEY` | your Google Cloud key (Geocoding + Maps Static + Street View + Solar + Aerial View enabled) |
| `GEMINI_API_KEY` | your free Gemini key from aistudio.google.com |

Click **"Deploy"** at the top to redeploy with the new variables.

### Step 4 — Use it

Visit your Worker URL (looks like `https://building-measure.YOURNAME.workers.dev`). You'll see a form:

```
🏠 Building Measure
[address input]  [Generate report]
```

Type any U.S. address. Wait ~60 seconds. Done.

---

## Connect to Claude Desktop (optional — for "ask Claude about an address" workflow)

Edit your Claude Desktop config:

- **Mac**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

Add this inside `"mcpServers"`:

```json
"building-measure": {
  "type": "http",
  "url": "https://building-measure.YOURNAME.workers.dev/mcp"
}
```

Restart Claude Desktop. Now you can say:
> "Run generate_roofr_report on 5396 Georgetown Greenville Road, Greenville IN 47124"

---

## Endpoints

| Path | Method | Purpose |
|------|--------|---------|
| `/` | GET | Web form (just visit in browser) |
| `/api/measure` | POST | JSON API. Body: `{ "address": "..." }` |
| `/mcp` | POST | MCP-over-HTTP (JSON-RPC 2.0) for Claude/GPT |
| `/health` | GET | Check whether env vars are configured |

---

## What it returns

Same Roofr-style structure as before:
- Total roof sqft, facet count, predominant pitch
- Lineal feet for every edge type (eaves/ridges/hips/valleys/rakes/wall+step flashing)
- Per-pitch breakdown
- Material counts (shingles, ice & water, ridge caps, drip edge, valley metal) at 0/10/12/15/17/20/22% waste
- Window/door/garage-door counts from 4 Street View facades
- 3D Aerial View fly-around video URL
- Confidence rating + warnings

---

## Free tier limits (more than enough)

- Cloudflare Workers: **100,000 requests/day free**
- Gemini 2.0 Flash: **15 req/min, 1M tokens/day free**
- Google Maps APIs: **$200/month free credit** (≈ 28,000 Static Maps loads or 14,000 Street View shots)

A typical full report uses ~7 API calls (1 geocode, 1 satellite, 4 street view, 1 solar, 1 aerial view) + 6 Gemini calls. Hundreds of reports per month stay inside the free tier.
