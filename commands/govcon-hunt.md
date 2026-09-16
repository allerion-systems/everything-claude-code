---
description: Find and qualify federal contract opportunities for a company. Runs discovery, eligibility screening, and competition-density analysis, then returns a ranked bid/no-bid board.
---

# GovCon Hunt

Find biddable federal contracts for a company and tell the truth about which ones are winnable.

**Usage:** `/govcon-hunt <company name>` — optionally add a lane, state, or set-aside.

## Pipeline

### 1. Establish the bidder
Invoke **govcon-scout** to resolve the company: UEI, CAGE, registered NAICS and PSC codes, SAM business types, and award history. Never search before this resolves.

If the company is not in SAM, stop the pipeline and report that registration is the blocking prerequisite — no federal opportunity is biddable without it.

### 2. Sweep for opportunities
**govcon-scout** runs tiered searches: registered NAICS, then adjacent NAICS, then PSC codes, then place of performance for trades work. Only set-asides the company actually holds. Deadlines today or later.

### 3. Qualify
Invoke **govcon-qualifier** on the board. It applies the hard gates in order — SAM, certification, size standard, bonding, nonmanufacturer rule, past-performance realism — and computes competition density (awards per certified firm) for every candidate NAICS.

### 4. Report

- **Tier 1 — bid now**: eligible, adequate runway, realistic odds
- **Tier 2 — bid if**: one named unblocker
- **Tier 3 — on-ramps**: IDIQ/MACC/SABER vehicles, draft RFPs, sources sought
- **Rejected**: what was dropped and the specific reason

Close with the sequenced next action and honest odds.

## Rules

- Never list an opportunity the company cannot legally bid. Certification gaps are disclosed at the top, not buried.
- Label every sampled statistic as a sample, with its record count.
- If nothing qualifies, say so and give the ordered path to eligibility. That is a complete answer.
- For a high-value target, chain into `/govcon-bid`.
