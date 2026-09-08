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

Verified in Chromium: service worker reaches `active`, shell cache holds 9
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

## The AI layer

Discovery and bid analysis are served by the separate **[Allerion API](../api/)**,
not by this app. Set `base` and `key` in `config.js` to enable them; leave `base`
empty and the board runs exactly as it did before, offline included.

Anything in `config.js` ships to the browser and is readable by anyone who can
load the page. That is unavoidable for a static app calling an authenticated
API, so the real control is putting the board behind Cloudflare Access and
issuing it a separate, rate-limited, rotatable key. `config.js` says so at the
top; read it before filling it in.

### Degradation

The app probes the API on boot and tells you which state it is in: no API
configured, unreachable, reachable but missing a model key, or key rejected. In
every failing state the analyst button never renders, Discover explains itself,
and offline behaviour is untouched.

## Testing

```bash
npm test    # in govcon/api — 15 tests covering the API contract
```

The PWA itself was verified in Chromium: service worker active, 9 shell assets
cached, offline reload rendering all pursuits with local edits intact, and no
horizontal overflow at mobile width.

## What it deliberately does not do

- **No submissions.** Nothing here transmits to SAM.gov or a contracting
  officer. A human sends every quote.
- **No document ingestion yet.** The analyst reasons from the board record and
  says which attachment to pull rather than guessing at its contents. For
  analysis of the actual solicitation documents, dispatch
  `/govcon <solicitation>` from Claude Code.
