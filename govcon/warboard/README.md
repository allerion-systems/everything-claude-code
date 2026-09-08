# Allerion War Room — Progressive Web App

An installable, offline-first pursuit board for Allerion Technologies LLC's
federal contracting pipeline. Static files only: no build step, no framework,
no server.

## What makes it a PWA

| Requirement | Where |
|---|---|
| Web app manifest | `manifest.webmanifest` — standalone display, 3 icons incl. maskable |
| Service worker | `sw.js` — precaches the app shell, network-first for pursuit data |
| Installable icons | `icons/` — 192/512 PNG + maskable + apple-touch |
| Offline operation | Full board renders with the network cut |
| Persistent state | IndexedDB (`allerion-warboard`) — survives reload and reinstall |
| Install prompt | `beforeinstallprompt` wired to the **Install** button in the app bar |
| Update flow | New service worker surfaces a "Reload" toast rather than silently swapping |

Verified in Chromium: service worker reaches `active`, shell cache holds 8
assets, and an offline reload still renders all pursuits with local edits intact.

## Running it locally

Service workers require `http://localhost` or HTTPS — opening `index.html`
from the filesystem will not register one.

```bash
cd govcon/warboard
python3 -m http.server 8099
# then open http://localhost:8099
```

## Deploying

**Do not publish this to GitHub Pages from this repository.** The repo is a
public plugin fork, and Pages sites are world-readable regardless of repo
visibility on non-Enterprise plans. The pursuit notes contain bid strategy.

Put it behind authentication:

- **Cloudflare Pages + Cloudflare Access** (recommended) — free, and Access
  gates the whole site by email or identity provider.
  ```bash
  npx wrangler pages deploy govcon/warboard --project-name allerion-warboard
  ```
  Then add an Access policy in the Cloudflare dashboard before sharing the URL.

- **Netlify** — drop `govcon/warboard/` in as the publish directory and enable
  password protection (paid tier) or Netlify Identity.

- **allerion.io subpath** — the manifest uses relative `start_url` and `scope`,
  and the service worker registers relatively, so the app works unchanged at
  `https://allerion.io/warboard/` or any other path.

## Installing on a phone

1. Open the deployed HTTPS URL in Chrome (Android) or Safari (iOS).
2. Android: tap **Install** in the app bar, or the browser's "Add to home screen".
   iOS: Share → **Add to Home Screen** (Safari ignores `beforeinstallprompt`,
   so the in-app button stays hidden there — this is expected).
3. It launches standalone, with no browser chrome, and works with no signal.

## Updating pursuit data

`data/pursuits.json` is the seed data. Regenerate the underlying sweep with:

```bash
node scripts/govcon/watch.js          # per-entity digest
node scripts/govcon/make-icons.js     # regenerate icons if the mark changes
```

Each pursuit carries an initial `stage`; once a device has seen a pursuit, that
device's own stage and requirement statuses win — refreshed data never
overwrites work in progress.

Bump `VERSION` in `sw.js` when shipping changed shell assets, so returning
installs pick them up instead of serving a stale cache.

## The AI layer (OpenAI SDK)

Two edge functions run the OpenAI SDK server-side. The browser never sees a
key, because a key shipped to a browser is a published key.

| Route | Does |
|---|---|
| `POST /api/search` | **Discover** — plain English becomes SAM.gov search parameters via structured outputs, sweeps live notices, and marks anything needing a certification Allerion lacks as ineligible |
| `POST /api/analyst` | Streams a GO / NO-BID win plan for one pursuit as Server-Sent Events |

### Configuration

| Variable | Required | Default |
|---|---|---|
| `OPENAI_API_KEY` | yes | — |
| `ANALYST_MODEL` | no | `gpt-5.5` |
| `EXTRACT_MODEL` | no | `gpt-5.4-mini` |
| `OPENAI_BASE_URL` | no | OpenAI (set for Azure or a gateway) |

```bash
npx wrangler pages secret put OPENAI_API_KEY --project-name allerion-warboard
```

### Why the client can't send a prompt

Every prompt is assembled in `server/openai.js` from structured fields. The
client posts a pursuit object, never instructions. Without that, anyone who can
reach the endpoint has a free, billable OpenAI proxy — and could also talk the
model out of the entity's real posture. The entity facts (small business only,
no SDVOSB/8(a)/HUBZone/WOSB, Kentucky-based, which NAICS are missing from SAM)
live server-side for the same reason, so no caller can widen them.

Requests are capped at 32 KB, individual fields are clamped, and the model is
fixed server-side. `npm test` asserts all of this, including that an injected
`instructions` field never reaches the model.

### Degradation

The app probes `POST /api/analyst` on boot. On plain static hosting it 404s, on
a functions deployment without a key it 503s — either way the Discover tab
explains itself, the analyst button never renders, and the board works exactly
as it did before. Nothing about the offline experience depends on the AI layer.

## Testing

```bash
npm test    # 8 tests, mock OpenAI + mock SAM.gov, no key and no tokens needed
```

The suite covers the request shape, structured-output parsing, SSE bridging,
prompt-injection resistance, payload caps, and set-aside eligibility filtering.

**Not covered:** calls against the real OpenAI API. Everything here was verified
against a mock, so model output quality and live API behaviour are unverified
until someone runs it with a real key.

## What it deliberately does not do

- **No submissions.** Nothing here transmits to SAM.gov or a contracting
  officer. A human sends every quote.
- **No document ingestion yet.** The analyst reasons from the board record and
  says which attachment to pull rather than guessing at its contents. For
  analysis of the actual solicitation documents, dispatch
  `/govcon <solicitation>` from Claude Code.
