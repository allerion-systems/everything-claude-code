# HOVER API Reference (for the construction drawing pipeline)

Verified against developers.hover.to. Base URL: `https://hover.to`.

## Auth — OAuth 2.0

- Authorize: `GET https://hover.to/oauth/authorize?response_type=code&client_id=...&redirect_uri=...`
- Token: `POST https://hover.to/oauth/token`
  - Initial: `{ grant_type: "authorization_code", client_id, client_secret, redirect_uri, code }`
  - Refresh: `{ grant_type: "refresh_token", client_id, client_secret, refresh_token }`
- Access tokens live **2 hours**. Refresh tokens are long-lived but **rotate
  on every exchange** — always persist the newest one (the client does this
  automatically in `~/.claude/hover-credentials.json`).
- Org-level tokens may need `current_user_id` or `current_user_email` query
  params on write actions; all calls in this pipeline are reads.

## Endpoints used

| Purpose | Endpoint |
| --- | --- |
| List/search jobs | `GET /api/v3/jobs?search=...&per=50&page=1&sort_by=updated_at` |
| Job details (includes models + artifact URLs) | `GET /api/v3/jobs/{job_id}` |
| Measurements | `GET /api/v3/models/{model_id}/artifacts/measurements.json?version=<v>` |

`version` values: `summarized_json`, `full_json` (detailed geometry),
`roof_lines` (roof facet line geometry — best source for roof plans),
`sketch_json` (footprint, TLA deliverables), `paint_measurements`.
Availability depends on the job's deliverable (2 = Roof Only, 3 = Complete,
5/6 = Total Living Area, 8 = Interior).

Job payloads also expose `models[].artifacts` with signed URLs for
measurement PDFs/XLSX and CAD exports (`skp`, `dwg`, `dxf`) when the
deliverable includes them — `hover-api.js pull` downloads everything it
finds there.

## Job list filters worth knowing

- `search` — matches name, address, or user (min 3 chars)
- `updated_since` — epoch seconds
- `reconstruction_states[]=completed` — only jobs with finished 3D models
- Pagination: `per` (max 100), `page`; response carries
  `pagination.next_page`

## Getting credentials

HOVER API access rides on the user's existing HOVER account: they create an
OAuth app / obtain client credentials via HOVER's developer program
(developers.hover.to; HOVER support enables API access for pro/org
accounts). For quick experiments a short-lived `HOVER_ACCESS_TOKEN` works
directly. There is no per-call charge from this pipeline — usage is governed
by the user's HOVER subscription.
