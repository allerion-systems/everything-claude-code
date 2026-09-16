---
description: Run capture intelligence and draft a compliant federal proposal for a specific solicitation, then audit it against Section L and Section M before submission.
---

# GovCon Bid

Take one solicitation from decision to submittable proposal.

**Usage:** `/govcon-bid <solicitation number>` — optionally name the bidding company.

## Pipeline

### 1. Confirm eligibility
Invoke **govcon-qualifier** on this specific solicitation. If it returns NO-BID, stop and report why. Do not write a proposal for an ineligible pursuit.

### 2. Capture intelligence
Invoke **govcon-capture-analyst** for the incumbent, contract expiry, protest history, buying-office patterns, price-to-win range, competitive field, and whether the work actually flows through an existing vehicle.

It pulls the solicitation package and extracts the PWS/SOW, **Section L** (instructions), and **Section M** (evaluation factors) by targeted attachment ID.

If capture says walk away, surface that recommendation prominently.

### 3. Draft
Invoke **govcon-proposal-writer**. It reads Section M first, Section L second, builds the compliance matrix before drafting, and writes each volume to the rubric using the government's own structure and vocabulary.

Output goes to `proposals/<solicitation-number>/`.

### 4. Audit
Invoke **govcon-compliance-auditor** on the draft. Four passes: eliminating defects, compliance-matrix verification, scoreability, and integrity.

### 5. Close out
Report the verdict — **SUBMITTABLE** or **NOT SUBMITTABLE with n blocking items** — the open TBDs, and exactly what the user must supply.

## Rules

- Never fabricate past performance, metrics, certifications, references, or personnel. Mark gaps `[TBD]` and name who owns each.
- Integrity findings block submission and are never resolved by softening wording.
- Respect page limits; report current counts per volume.
- Loop steps 3 and 4 until the auditor reports zero blocking items.
