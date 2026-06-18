# R&B Roofing & Remodeling — Business Automation Audit

**Prepared by:** Allerion Systems
**Client:** R&B Roofing & Remodeling (Louisville, KY)
**Purpose:** Map R&B's business end to end, find where time and revenue leak, and rank the
automation opportunities that the white-label AI platform should deliver — highest ROI first.

> **Status:** Draft based on the public-facing prototype and standard roofing/remodeling
> contractor operations. Every item tagged **[CONFIRM]** must be validated on the scheduled
> audit call before we build against it. The discovery agenda at the bottom is the script for
> that call.

---

## 1. Company snapshot (to confirm)

| Item | Working assumption | Status |
| --- | --- | --- |
| Trade lines | Roofing, siding, solar, decks, full remodeling | [CONFIRM] |
| Market | Louisville, KY metro (+ surrounding counties?) | [CONFIRM] |
| Job mix | Residential majority; insurance (storm) + retail; some commercial? | [CONFIRM] |
| Team size | Owner(s) + sales reps + crews (or subs?) | [CONFIRM] |
| Lead volume | Unknown — leads/month, seasonality (storm spikes) | [CONFIRM] |
| Avg ticket / close rate | Unknown | [CONFIRM] |
| Existing tools | CRM, calendar, accounting, e-sign, payments | [CONFIRM] — see §5 |

---

## 2. The contractor value chain (lead → cash → retain)

R&B's business is a pipeline. We audit each stage for the manual work and the drop-off that
automation can remove.

```
1. Capture     2. Qualify     3. Estimate    4. Propose     5. Schedule
   lead     →     & route   →   & measure  →   & close   →   inspect/install
                                                                   │
8. Retain   ←   7. Invoice  ←   6. Execute  ←──────────────────────┘
& review        & collect       the job
```

---

## 3. Stage-by-stage findings

Each stage: **current state (assumed)** → **bottleneck** → **automation opportunity** →
**AI leverage** → **priority** (see the matrix in §6).

### Stage 1 — Lead capture
- **Current (assumed):** Web form, phone calls, Google/Meta ads, referrals, door-knocking
  after storms. Leads land in email/voicemail/multiple inboxes. **[CONFIRM]**
- **Bottleneck:** Leads arrive across channels with no single front door; after-hours and
  weekend leads wait until someone checks. Speed-to-lead is the #1 driver of close rate in
  home services, and manual triage loses it.
- **Opportunity:** One unified intake (web, SMS, phone, ads) → instant auto-response within
  seconds, 24/7. Capture address + job type up front.
- **AI leverage:** Conversational intake assistant that greets, asks the few qualifying
  questions, and books the next step — branded as R&B.
- **Priority:** **P0** (compounds every downstream stage).

### Stage 2 — Qualify & route
- **Current (assumed):** A person reads each lead, decides if it's real, which trade, and who
  should handle it. **[CONFIRM]**
- **Bottleneck:** Manual reading/sorting; inconsistent qualification; tire-kickers consume
  rep time; storm vs. retail vs. insurance not tagged.
- **Opportunity:** Auto-classify (trade line, job type, insurance vs. retail, urgency),
  score, dedupe, and route to the right rep/crew with full context.
- **AI leverage:** High-volume, cheap classification + extraction (intent, address, trade,
  insurance signal) — ideal for a small fast model. See blueprint §AI model strategy.
- **Priority:** **P0.**

### Stage 3 — Estimate & measure (the prototype's core)
- **Current (assumed):** Rep schedules a site visit, climbs/measures, prices by hand or in a
  spreadsheet. Days of latency before the homeowner sees a number. **[CONFIRM]**
- **Bottleneck:** Truck rolls and manual measurement are the biggest time sink; slow numbers
  lose deals to faster competitors.
- **Opportunity:** **Instant satellite/aerial measurement → AI estimate in minutes** (already
  prototyped). Homeowner gets a ballpark before a rep is ever dispatched; reps only roll for
  qualified, high-intent jobs.
- **AI leverage:** Vision + measurement on aerial imagery; estimate reasoning over a priced
  catalog (materials, labor, waste factor, pitch, complexity). Complex reasoning model.
- **Priority:** **P0** — this is the flagship differentiator and is already proven.

### Stage 4 — Propose & close
- **Current (assumed):** Rep assembles a proposal/quote document, emails it, follows up by
  hand; financing and good/better/best options are manual. **[CONFIRM]**
- **Bottleneck:** Proposal turnaround and follow-up cadence; deals stall in the gap between
  estimate and signature.
- **Opportunity:** Auto-generate branded PDF proposals with tiered options + financing, send
  e-sign, and run an automated, personalized follow-up sequence until the homeowner acts.
- **AI leverage:** Proposal drafting/personalization; objection-handling follow-up copy;
  next-best-action recommendations from pipeline state.
- **Priority:** **P1.**

### Stage 5 — Schedule (inspection / install)
- **Current (assumed):** Phone/text tag to find a time; crew calendars tracked separately;
  weather reschedules handled manually. **[CONFIRM]**
- **Bottleneck:** Back-and-forth scheduling; crew/calendar conflicts; weather churn.
- **Opportunity:** Self-serve booking tied to crew capacity; automated reminders; weather-aware
  reschedule prompts.
- **AI leverage:** Scheduling assistant that negotiates times and handles reschedules in
  natural language.
- **Priority:** **P1.**

### Stage 6 — Execute the job
- **Current (assumed):** Crew/sub coordination, material ordering, photo documentation by
  text. **[CONFIRM]**
- **Bottleneck:** Status opacity for the office and homeowner; manual material ordering; photo
  capture scattered.
- **Opportunity:** Job status hub; automated homeowner status updates; material lists derived
  from the estimate; structured photo capture.
- **AI leverage:** Summarize crew notes/photos into homeowner-friendly updates.
- **Priority:** **P2.**

### Stage 7 — Invoice & collect
- **Current (assumed):** Manual invoicing; deposits + final payments; Stripe present in the
  prototype. **[CONFIRM]**
- **Bottleneck:** Manual invoice creation; collection follow-up; deposit-to-final tracking.
- **Opportunity:** Auto-invoice from signed proposal milestones; payment links (Stripe);
  automated dunning; financing hand-off.
- **AI leverage:** Light — mostly workflow automation; AI for payment-reminder personalization.
- **Priority:** **P1** (cash flow).

### Stage 8 — Retain & review
- **Current (assumed):** Reviews requested ad hoc; warranty/maintenance and repeat/referral
  largely manual. **[CONFIRM]**
- **Bottleneck:** Reviews drive lead cost down but are inconsistently requested; no systematic
  referral or maintenance re-engagement.
- **Opportunity:** Automated, well-timed review requests (Google), referral asks, warranty
  reminders, seasonal maintenance re-engagement.
- **AI leverage:** Personalized review/referral outreach; sentiment triage of responses.
- **Priority:** **P2.**

### Cross-cutting — Owner visibility
- **Opportunity:** A single dashboard: speed-to-lead, pipeline by stage, close rate, revenue,
  crew utilization, AI-handled vs. human-handled volume.
- **Priority:** **P1** (proves ROI and runs the business).

---

## 4. Where the time and money leak (summary)

1. **Speed-to-lead** — manual, multi-inbox triage loses deals 24/7. *(P0)*
2. **Manual measurement & estimating** — truck rolls + spreadsheets; slow numbers. *(P0)*
3. **Proposal turnaround & follow-up** — deals stall post-estimate. *(P1)*
4. **Scheduling friction** — phone tag, weather churn. *(P1)*
5. **Collections** — manual invoicing/dunning hurts cash flow. *(P1)*
6. **Reviews/referrals** — under-systematized, raising lead cost. *(P2)*

---

## 5. Tooling & integration inventory (to confirm)

We must inventory what R&B uses today so the platform integrates rather than replaces where it
shouldn't. **[CONFIRM all]**

- **CRM / pipeline:** ? (e.g., JobNimbus, AccuLynx, HubSpot, spreadsheets)
- **Calendar/scheduling:** ? (Google Calendar, Calendly, none)
- **Payments:** Stripe (in prototype) — confirm live processor + financing partner
- **E-signature:** ? (DocuSign, none)
- **Accounting:** ? (QuickBooks)
- **Comms:** ? (business phone/SMS provider, email)
- **Aerial/measurement data source:** ? (which imagery/measurement provider feeds the estimator)
- **Lead sources:** ? (Google/Meta ads, Angi, referrals, storm canvassing)

---

## 6. Prioritized opportunity matrix (impact × effort)

| Opportunity | Impact | Effort | Priority |
| --- | --- | --- | --- |
| Unified lead capture + instant 24/7 response | High | Low–Med | **P0** |
| Lead qualify / classify / route | High | Low | **P0** |
| Instant satellite estimate (extend prototype) | High | Med (proven) | **P0** |
| Auto proposal + e-sign + follow-up | High | Med | **P1** |
| Scheduling assistant | Med | Med | **P1** |
| Invoice + payment links + dunning | Med–High | Low–Med | **P1** |
| Owner dashboard / analytics | Med | Med | **P1** |
| Job status hub + homeowner updates | Med | Med | **P2** |
| Reviews / referrals / maintenance re-engagement | Med | Low | **P2** |

**Recommended first build (Phase 1):** the P0 row — unified capture + instant response +
qualification/routing + the instant estimator — because it owns speed-to-lead and the flagship
differentiator, and every later stage inherits clean, structured lead + estimate data.

---

## 7. Discovery-call agenda (the scheduled audit)

Run in ~45–60 min. Goal: replace every **[CONFIRM]** above with facts and lock the Phase 1 scope.

1. **Business shape** — trade-line mix, market radius, residential/commercial, insurance vs.
   retail share, seasonality.
2. **Numbers** — leads/month, close rate, average ticket, current speed-to-lead, biggest
   seasonal spike.
3. **Lead sources & channels** — where leads come from; which inboxes/phones they hit today.
4. **Current process walk-through** — narrate one real deal from inquiry to paid; note every
   manual handoff and tool.
5. **Tool stack** — confirm §5 inventory; what stays, what we integrate, what we replace.
6. **Estimating today** — how measurements + pricing happen now; the priced catalog (materials,
   labor rates, waste/pitch factors); which aerial/measurement data source feeds the estimator.
7. **Team & roles** — who touches a lead; who we'd hand qualified work to; crews vs. subs.
8. **Brand** — name, logo, colors, domain, voice for customer-facing AI (white-label).
9. **Pain ranking** — have R&B rank the §4 leaks by what hurts most right now.
10. **Success metrics** — what "this is working" means in 30/60/90 days (e.g., speed-to-lead,
    close rate, truck-roll reduction, reviews/month).
11. **Constraints** — compliance, data handling, budget, must-have integrations, go-live date.

**Output of the call:** confirmed company snapshot, confirmed tool inventory, locked Phase 1
scope, agreed success metrics, and branding inputs for the white-label build.

---

## 8. Assumptions log (resolve before building)

- Trade lines and market radius as listed in §1. **[CONFIRM]**
- Residential-majority job mix with storm/insurance component. **[CONFIRM]**
- Stripe is (or will be) the live payment processor. **[CONFIRM]**
- An aerial/measurement data source is available for the estimator at production scale and
  acceptable cost. **[CONFIRM — critical dependency for the P0 estimator.]**
- R&B will provide the priced catalog (materials/labor/waste/pitch) the estimate reasons over.
  **[CONFIRM]**
