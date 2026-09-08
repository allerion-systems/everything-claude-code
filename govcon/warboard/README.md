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

## What it deliberately does not do

- **No API credentials.** A key shipped to a browser is a published key, so
  there is no live AI analyst here. The Brief tab computes its guidance from
  board state instead. For a written go/no-go against the actual solicitation
  documents, dispatch `/govcon <solicitation>` from Claude Code.
- **No submissions.** Nothing here transmits to SAM.gov or a contracting
  officer. A human sends every quote.
