# Allerion — Automated Book & Close (with Digital Contract)

The end-to-end flow from "yes, let's do the audit" to money in and work started — automated as
far as the tooling allows so closing a deal takes minutes, not a week of email tag.

> Goal: never let a warm prospect cool. Booking, proposal, contract, and deposit should all be
> one short sequence the client completes on their phone.

---

## The flow

```
Discovery call → BOOK audit → (audit delivered) → PROPOSAL → e-sign CONTRACT → DEPOSIT → ONBOARD
     │              │                                  │            │              │          │
   playbook     calendar link                   /close drafts   service-       Stripe      kickoff
                + auto-confirm                   it tailored    agreement.md  payment link  checklist
```

1. **Book the audit.** End every discovery call with a calendar link, not "I'll email you."
   Auto-send a confirmation + reminder. The $1,500 audit is the first commitment (credited to
   the build).
2. **Deliver the audit → proposal.** From the audit notes, generate a tailored proposal: their
   pain + the number, the recommended workflow, the ladder mapping, ROI, next step. Use `/close`.
3. **Digital contract.** Fill `docs/allerion/templates/service-agreement.md` with the scope,
   fees, and dates; send for e-signature.
4. **Deposit.** Send a payment link for the deposit (or the audit fee). Work doesn't start until
   it clears.
5. **Onboard.** Trigger the kickoff checklist (accounts access, intake for the second-brain
   ingestion, scheduling).

---

## Wiring it with available tools

These map to MCP integrations already available to this workspace. Build incrementally — even
the manual version (links pasted into an email) closes deals; automate the repetitive parts next.

| Step | Tool | How |
|------|------|-----|
| Booking | **Google Calendar** (`mcp__Google_Calendar__*`) | Create/booking events, `suggest_time`, send invites + reminders. |
| Proposal & contract delivery | **Gmail / Google Docs** (`mcp__Google_Drive__*`, Gmail tools) | Generate the proposal doc, attach/send the contract for signature. |
| E-signature | Embed a signature block in the contract (manual e-sign) or a dedicated e-sign provider | Start with typed-name + date acceptance clause (see template); upgrade later. |
| Deposit / payment | **Stripe** (`mcp__Stripe__*`) | `create_payment_link` for the audit fee or build deposit; confirm before work starts. |
| Invoicing / books | **QuickBooks** (`mcp__Intuit_QuickBooks__*`) | `qbo_sales_create_invoice` / `create_payment_link`, customer records. |

> **Important:** these steps move real money and send client-facing documents. Always confirm
> the drafted proposal, contract, and amount with J. before anything is sent or charged. The
> `/close` command drafts; the human sends.

---

## Automation roadmap (crawl → walk → run)

- **Crawl (now):** `/close` drafts the proposal + fills the contract; you paste a Calendar link
  and a Stripe payment link into the email by hand.
- **Walk:** one command generates proposal + contract + booking link + payment link as a bundle,
  ready to review and send.
- **Run:** a Zapier/Make scenario (`mcp__Zapier__*` / `mcp__Make__*`) chains booking → reminder →
  contract → deposit → onboarding, with QuickBooks invoicing on signature.

---

## Onboarding kickoff checklist (post-deposit)

- [ ] Access to the client's accounts (the tools the build connects/installs into).
- [ ] Second-brain intake started (see `second-brain-service-playbook.md` intake checklist).
- [ ] Kickoff call booked; success metric + the one number agreed (the hours/revenue we'll move).
- [ ] Retainer start date set if applicable.
