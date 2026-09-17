---
description: Find and screen grants, SBIR/STTR topics, prizes, and foundation funding for an organization. Verifies deadlines and eligibility, then returns a ranked go/no-go board.
---

# Grant Hunt

Find non-dilutive funding that requires no bonding, no past performance, and no set-aside certification.

**Usage:** `/grant-hunt <organization name>` — optionally add a research area or focus.

## Pipeline

### 1. Sweep all four sources
Invoke **grant-prospector** across:

- **SBIR/STTR** open cycles and topics (filter `activity="open"`, never a date filter)
- **Federal grants and prizes** — prizes surface first when present; they are the lowest-barrier money on the board
- **Foundations** — for nonprofit or mission-adjacent work
- **Agency-direct BAAs and Dear Colleague Letters** that never reach the aggregators

### 2. Verify every deadline
Aggregators report "No deadline" for rolling programs *and* for records where the date was never captured. **grant-prospector** must WebFetch the official program page and report what it actually says, distinguishing verified dates from relayed ones.

### 3. Screen
Invoke **grant-eligibility-screener** on the board. Six gates: applicant type, registrations and lead time, prior-award prerequisites, cost share and financial capacity, deadline feasibility, and fit honesty.

### 4. Report

- **Act now** — verified deadline inside 30 days, real fit, feasible
- **Build toward** — strong fit, later cycle, with the prep list
- **Prerequisite gap** — blocked by a named requirement and its lead time
- **Rejected** — what was dropped and why

Include the registration critical path in days. Flag "DIRECT TO PHASE II" and other prior-award-gated programs as unavailable to first-time applicants rather than listing them as open.

## Rules

- Never present an unverified deadline as confirmed.
- Drop out-of-state programs, wrong-applicant-type programs, and Phase II without Phase I before reporting.
- State eligibility basics once: SBIR/STTR requires for-profit, ≤500 employees, majority US individual ownership.
- If nothing is feasible this cycle, say so and give the ordered prep list for the next one.
- To write one, chain into `/grant-write`.
