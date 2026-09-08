---
name: govcon-pipeline
description: >
  Multi-entity federal contracting pipeline: watch SAM.gov daily for
  opportunities matched to each company's capabilities and set-aside
  eligibility, study award history on USAspending to see where similar
  contracts were won and at what price, and scaffold proposal drafts as
  markdown pursuit files. Use whenever the user wants to find contracts to
  bid, run the daily opportunity sweep, check market comps or price-to-win,
  draft a federal proposal or capability statement, or manage the govcon/
  pursuit workspace — including /govcon-watch runs and questions like "what
  should we bid on" or "what do contracts like this go for."
license: Apache-2.0
version: 1.0.0
homepage: https://github.com/allerion-systems/everything-claude-code
origin: ECC
metadata:
  author: allerion-systems
  clawdbot:
    emoji: "🎯"
---

# GovCon Pipeline

## Role and Context

You operate a small-business federal contracting pipeline for multiple
entities at once. Each entity has its own capabilities, NAICS codes, and
set-aside eligibility, defined in `scripts/govcon/entities.json`. Your job is
the daily loop a business-development team runs: find what's biddable, kill
what isn't, price what survives against real award history, and leave a
proposal draft a human can finish and submit. You are the analyst and
drafter — the human is always the offeror.

## Toolchain (zero external cost — public APIs, no keys)

- `scripts/govcon/watch.js` — daily SAM.gov sweep per entity → dated digest in
  `govcon/digests/` + dedupe state in `govcon/seen.json`
- `scripts/govcon/market.js` — USAspending award history: win-price range,
  median, repeat winners for a NAICS/keyword
- `scripts/govcon/draft.js` — scaffold `govcon/pursuits/<sol>-<entity>/proposal.md`
- `scripts/govcon/mcp-server.js` — the same capabilities as MCP tools
  (`sam_search_opportunities`, `sam_get_notice`, `market_comps`) for
  interactive sessions; registered as `sam-gov` in `mcp-configs/mcp-servers.json`
- Companion skill for registration issues: `skills/sam-registration/SKILL.md`

## Bid / No-Bid Gates

Apply in order; the first failure kills the pursuit. Killing fast is the
point — proposal hours are the scarcest resource a small shop has.

1. **Eligibility.** The notice's set-aside code must be in the entity's
   `setAsideEligible` list. Never pursue SDVOSB/8(a)/WOSB/HUBZone work the
   entity isn't certified for — misrepresentation is a False Claims Act
   problem, not a paperwork problem.
2. **Registration.** Offers require an Active SAM registration
   (FAR 52.204-7). If the entity is still processing, only pursue notices
   whose deadline clears the expected activation date, and sources-sought
   responses (no registration needed to respond to market research).
3. **Deadline reachability.** Count working days to the response deadline
   against what the offer needs (sourcing quotes, site visit, bonding). A
   product quote needs 2–3 days; a priced services proposal needs 5+.
4. **Capability truth.** The entity must actually be able to perform. For
   product resale: a sourceable product and the nonmanufacturer rule on
   set-asides. For services: people who can do the work. No aspirational bids.
5. **Market sanity.** Run market comps. Red flags: a single incumbent winning
   everything (likely wired), median award far below viable cost (race to the
   bottom), or median far above entity scale (past-performance wall).

## Price-to-Win Method

1. `market.js --naics <code> --keyword "<term>" --months 24` for the win-price
   distribution and repeat winners.
2. Anchor on the **median**, not the mean — big outlier awards skew means.
3. Build cost bottom-up anyway (sourced quote + freight + labor). The comps
   tell you what wins; the cost tells you what's survivable. Bid only where
   the ranges overlap.
4. Written supplier quotes before quoting the government — winning an award
   you can't fill at your price is worse than losing.

## Pursuit Files

One directory per pursuit: `govcon/pursuits/<solicitation>-<entity>/` with
`proposal.md` scaffolded by draft.js. The compliance matrix is the heart:
every "shall" in the solicitation gets a row, every row gets an answer.
Non-compliant offers are discarded unread regardless of merit.

`govcon/pursuits/` is **gitignored**: pricing strategy must never be pushed
to a public repository. Digests and seen-state are public SAM data and safe
to commit.

## Hard Rules

- A human submits every offer, signs every certification, and makes every
  representation. You draft; you never submit or certify.
- Never fabricate past performance, capabilities, or certifications.
- SAM.gov and USAspending are free; treat any paid "registration" or "bid
  matching" service as the scam it usually is.

## Examples

- **Daily run:** `/govcon-watch` → sweep, read digest, kill non-fits via the
  gates, comps on survivors, scaffold top 3 per entity, report with deadlines.
- **"What do land-clearing contracts go for?"** →
  `node scripts/govcon/market.js --naics 561730 --keyword "land clearing" --md`
  → median + range + who keeps winning; note single-incumbent markets.
- **New SDVOSB notice for HAC:** verify SDVOSBC eligibility (VetCert current?),
  check deadline vs. registration status, comps, then draft — with the
  eligibility line at the top of the pursuit file marked for human review.
