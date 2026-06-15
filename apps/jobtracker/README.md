# R&B Job Tracker

A lightweight internal project tracker for R&B Roofing & Remodeling's commercial jobs —
built so Joey can stop losing track of awarded and in-progress work.

## What it does

- **Dashboard** — every active job as a card: GC, client, contract value, next milestone
  with a live countdown, and a task progress bar.
- **This Week** — a rolling 3-week timeline that auto-builds from job key dates, task due
  dates, and standing weekly meetings (TRH production meeting Tue, Lee St Fri, R&B internal Thu).
- **All Tasks** — every open action item across all jobs in one list, sorted by due date,
  with overdue flags. Check them off as you go.
- **Pipeline / Bids** — the bids/RFPs that are still out (Buckner, USDA Forage, Caldwell
  Preload, Blue Grass Airport CBP, etc.) so they don't fall off the radar.
- **Job detail** — click any job for scope, clickable contacts (email/phone), key dates,
  editable notes, and document references.

## Seeded data

Two active jobs are pre-loaded from the June 2026 Outlook pull:

- **Lee Street Golf Facility** (U of L / Buffalo Construction) — incl. the RoofScreen
  material-only revised quote situation and the local-fab-vs-SC3 decision.
- **Texas Roadhouse — Clarksville IN** (Buffalo Construction) — incl. the ~June 27
  material delivery, Rev 4/Delta 5 drawings, and Procore billing.

## Running it

It's a single self-contained `index.html` — no build step, no server needed.

- **Locally:** double-click `index.html` (or open it in any browser).
- **Hosted:** drop this folder on any static host (Netlify, Cloudflare Pages, S3, etc.).

## Data & backups

Your edits (tasks, notes, new jobs) save to the browser's `localStorage`. That means data
lives in the browser you use it on. Two important buttons in the header:

- **⤓ Backup** — downloads a JSON snapshot of everything. Do this regularly.
- **↺ Restore** — loads a JSON backup back in (e.g. on a new device).

> Note: because storage is per-browser, this is a single-user tool as shipped. If you want
> real multi-device sync (check it on your phone and laptop and have it stay in sync), that's
> a follow-up — wire the same UI to a hosted database (e.g. Supabase). Ask and I'll set it up.
