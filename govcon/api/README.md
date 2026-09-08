# Allerion API

Federal contracting API — plain-English opportunity discovery and bid analysis.
Runtime-portable: the same router runs on Cloudflare Workers and on plain Node,
because the handlers take a `Request` and return a `Response` and nothing else.

## Routes

| Route | Auth | Does |
|---|---|---|
| `GET /v1/health` | none | Liveness. Returns `{status, version}` and nothing about configuration. |
| `POST /v1/search` | Bearer | Plain English → SAM.gov search parameters → live sweep, with ineligible set-asides marked and ranked last. |
| `POST /v1/analyst` | Bearer | Streams a GO / NO-BID win plan for one pursuit as Server-Sent Events. |

```bash
curl https://api.allerion.io/v1/search \
  -H "authorization: Bearer $ALLERION_API_KEY" \
  -H "content-type: application/json" \
  -d '{"query":"guard booths we can fabricate, small business set-aside"}'
```

## Configuration

| Variable | Required | Notes |
|---|---|---|
| `API_KEYS` | yes | Comma-separated. **Unset means every request is refused** — it fails closed, not open. |
| `OPENAI_API_KEY` | yes | Model routes return 503 without it; health still works. |
| `ALLOWED_ORIGINS` | for browsers | Comma-separated origins that get CORS headers. |
| `RATE_LIMIT_PER_MINUTE` | no | Default 20, per key. |
| `ANALYST_MODEL` | no | Default `gpt-5.5`. |
| `EXTRACT_MODEL` | no | Default `gpt-5.4-mini`. |
| `OPENAI_BASE_URL` | no | For Azure or a gateway. |

Keys are compared in constant time. Errors never echo an internal message,
because those can carry a key or upstream detail.

**An Origin allowlist is not authentication.** Browsers enforce CORS; `curl`
ignores it. The API key is the control, and anything you put in a browser is
readable — see `govcon/warboard/config.js`.

## Getting `api.allerion.io` to resolve

**allerion.io is currently on Squarespace nameservers** (`nsb1–4.squarespacedns.com`,
apex A record `5.161.184.187`). That matters, because a Cloudflare Workers
Custom Domain [requires an active Cloudflare zone](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/),
and the cheaper ways around that are gated:

- CNAME setup (partial) — keep Squarespace DNS, proxy one subdomain — is **Business plan or above**.
- Subdomain delegation to a separate Cloudflare zone is **Enterprise**.
- On Free/Pro, [primary (full) setup](https://developers.cloudflare.com/dns/zone-setups/) is the only option.

So pick one:

### Option A — move allerion.io to Cloudflare (free, best long-term)

Point the nameservers at Cloudflare, then uncomment the `routes` block in
`wrangler.jsonc` and deploy. Cloudflare issues the certificate and creates the
DNS record.

**Before you do this:** Cloudflare's import scans existing records, but verify
MX and any Squarespace verification records land correctly *before* changing
nameservers, or you will drop email for the domain. This affects the whole
zone, including the live site on `5.161.184.187`.

### Option B — workers.dev now, custom domain later (zero DNS risk)

```bash
cd govcon/api
npx wrangler deploy                      # leave `routes` commented out
npx wrangler secret put OPENAI_API_KEY
npx wrangler secret put API_KEYS
```

You get `allerion-api.<subdomain>.workers.dev`. Cloudflare notes workers.dev is
[intended for non-business-critical use](https://developers.cloudflare.com/workers/configuration/routing/workers-dev/),
so treat it as a staging address. Point `config.js` at it and everything works
today.

### Option C — run it on your own server, keep Squarespace DNS

The apex already points at `5.161.184.187`. Add an `A` record for `api` at
Squarespace pointing to the same host, then:

```bash
cd govcon/api && npm ci
OPENAI_API_KEY=... API_KEYS=... PORT=8787 node node-server.js
```

Terminate TLS in front of it — Caddy will get a certificate for
`api.allerion.io` automatically:

```
api.allerion.io {
  reverse_proxy 127.0.0.1:8787
}
```

No Cloudflare account needed, and the domain is untouched apart from one new
record.

## Testing

```bash
npm test                    # 15 tests, mocked provider and SAM.gov
npx wrangler dev --local    # run on the real workerd runtime
npx wrangler deploy --dry-run   # validate the bundle without credentials
```

Runs the real router against a mock OpenAI and a mock SAM.gov: auth (missing,
wrong, multiple valid keys, unconfigured), CORS allow/deny and preflight, rate
limiting with `retry-after`, SSE streaming, prompt-injection and model-override
resistance, payload caps, error redaction, and set-aside eligibility ranking.

Beyond the unit tests, the Worker was run on **workerd** — the same runtime
Cloudflare runs in production — via `wrangler dev --local`, confirming health,
401 on a missing key, 503 with no model key, and CORS denial for an unknown
origin. `wrangler deploy --dry-run` bundles at 119.77 KiB gzipped.

**Not covered:** any call against the live OpenAI API, and any real deployment.
Model output quality and production behaviour are unverified until someone runs
it with real credentials.
