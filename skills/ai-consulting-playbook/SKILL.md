---
name: ai-consulting-playbook
description: The Allerion field playbook for selling and delivering AI automation to ops-heavy SMBs (construction, trades, field services). Use when prepping for a prospect call, scoping an audit/build/retainer, explaining AI to non-technical buyers, handling objections, or pitching a second-brain install. Powers the /drive-prep and /close commands and the ai-consultant agent.
origin: ECC
---

# Allerion AI-Consulting Playbook

How Allerion turns a contractor's "we're drowning in admin" into a paid audit → build →
retainer. This is the field manual: what to ask, how to *teach* (not dumb down), how to scope
on the spot, and how to handle the four objections you always get.

Positioning in one line: **"AI infrastructure for businesses that want to run themselves."**
You are not selling software. You are selling *recovered hours and recovered revenue*.

## When to Activate

- Rehearsing or running a discovery / sales call with a prospect
- Scoping an engagement (audit, build, retainer) live
- Explaining what AI actually does to a non-technical owner
- Handling pushback ("we already have software", "AI is hype", "too expensive", "data privacy")
- Pitching a Second-Brain Install (legacy files → searchable digital brain)

## The buyer

Ops-heavy SMB owner/operator. Construction, roofing, HVAC, plumbing, electrical, field
services, professional services. They are not anti-technology — they are *time-poor and
burned before*. They have 4–6 disconnected systems (CRM, job software, email, accounting,
spreadsheets, a shoebox of PDFs) and reconcile them by hand or in someone's head. They feel
the pain as: late invoices, missed follow-ups, "where's that file", and not knowing job
profitability until it's too late.

The fastest yes comes from naming *their* specific daily pain back to them before you pitch.

## The discovery question bank

Ask, then shut up and listen. One question at a time. You are hunting for three things:
**(1) the manual reconciliation, (2) the revenue leak, (3) the hours lost.**

**Open the wound (where does the day go):**
- "Walk me through what happens from a lead coming in to getting paid. Where does it stall?"
- "What's the thing your team re-types into a second system every day?"
- "When a customer calls asking about an old job, how long to find everything?"
- "Who's the bottleneck — the one person who knows where everything is?"

**Find the revenue leak:**
- "How many quotes go out and never get a follow-up?"
- "When do you find out a job lost money — during, or after?"
- "What falls through the cracks when you're busy?"

**Quantify (turn pain into a number — this becomes your ROI):**
- "Roughly how many hours a week does that eat?" → hours × loaded rate = the cost of doing nothing.
- "What's a typical job worth? How many follow-ups slip a month?" → leak size.

**Qualify (can they buy):**
- "If we recovered [X hours / £Y], what would that be worth to you?"
- "Who else weighs in on a decision like this?" (find the real signer)
- "Have you tried fixing this before? What happened?" (surfaces the "burned before" story)

Rule: leave with at least one number. No number = no ROI = no close.

## The better way of teaching it (NOT dumbing it down)

Will said "dumb it down." He's half right — drop the jargon, never the substance. Dumbing-down
makes you sound like a salesman. *Teaching* makes you sound like the person they should hire.
Three moves:

**1. Outcome-first, mechanism-second.** Lead with the result in their words, not the tech.
- Don't: "We deploy a Claude-powered multi-agent RAG pipeline over your unstructured data."
- Do: "You'll be able to ask 'what did we quote the Hendersons in 2022' and get the answer in
  ten seconds instead of an hour. Want to see how it works underneath? Happy to."
  Offer the depth; let them pull it. Curious owners feel respected, not talked down to.

**2. Analogies they already own.** Map AI onto roles they manage every day:
- **The receptionist that never sleeps** — answers leads, books jobs, chases quotes 24/7.
- **The filing cabinet that talks back** — every file, photo, email, estimate, ever — ask it
  a question, it answers (this *is* the second brain).
- **The apprentice that's read everything you've ever written** — drafts the estimate, the
  follow-up, the report, in your voice; you check and send.
  One sentence each. Pick the one that matches the pain they just described.

**3. Show, don't tell — the 60-second proof.** Beats any slide. Take one real artifact they
have (a folder of old job PDFs, their email) and have the system answer one of *their own*
questions live. The moment they see their own data answer back, the sale shifts from "what is
this" to "when can I have it." Always be ready to run this demo. (See the second-brain
service playbook: `docs/allerion/second-brain-service-playbook.md`.)

Teaching test: if they can re-explain it to a mate at the pub tonight, you taught it. If they'd
just repeat a buzzword, you sold at them — back up.

## The offer ladder (and scoping on the spot)

One ladder, three rungs. Each rung de-risks the next. (Full unified pricing and the
reconciliation of the storefront vs. digital-brain tiers lives in
`docs/allerion/business-model-and-market-research.md`.)

| Rung | Price | What they get | Why it works |
|------|-------|---------------|--------------|
| **Audit** | $1,500 (credited to the build) | Map the systems, find the leaks, a written plan + ROI | Low-risk yes; you get paid to scope; credit removes the "what if I don't build" fear |
| **Build** | $3K–$8K fixed-bid (legacy-data jobs trend higher) | The working system installed in their tools | Fixed bid = no fear of a runaway invoice |
| **Retainer** | $500–$2.5K/mo | Keep it running, tune it, add the next workflow | Recurring; you become their AI department |

**Productized add-ons:** Second-Brain Install, CrewVoice (multilingual voice, $149/mo),
Lead Engine (AI inbound qualification), dashboards.

**Scoping live:** from the discovery pain, name the *one* workflow that hurts most → that's the
build. "Based on what you said, I'd start with [the quote-follow-up engine]. We'd audit first —
$1,500, and that comes straight off the build. Fair?" Always anchor to the audit. Never quote a
build before the audit unless the scope is obvious and small.

**Pricing nerve:** market rate for these builds is $5–15K (legacy-system jobs $15–25K). Allerion's
$3–8K is the accessible-SMB wedge — *on purpose* — but don't reflexively discount a legacy-data
job. If it's a shoebox-of-PDFs ingestion, it's a higher build; say so.

## Objection handling

Acknowledge → reframe → evidence → small next step. Never argue.

- **"We already have software (Procore / ServiceTitan / QuickBooks)."**
  "Good — keep it. We don't replace your tools, we connect them so they stop needing you to
  copy between them. The software stores data; we make it *do* something."

- **"AI is hype / overblown."**
  "A lot of it is. I'm not selling a chatbot — I'm selling [the 6 hours a week your office
  spends re-typing job data]. Let me show you on your own files; if it doesn't, you owe me
  nothing." (Then run the 60-second proof.)

- **"Too expensive."**
  "Compared to what it's costing now? You told me it's ~[X hours/week]. The audit's $1,500 and
  it comes off the build. If the numbers don't beat that, don't do it." Anchor to *their* number.

- **"What about my data / privacy?"**
  "Your data stays yours, in your accounts. We install on your systems, not ours. Nothing is
  sold or shared, and you can pull the plug anytime." (Reference the data-handling clause in
  `docs/allerion/templates/service-agreement.md`.)

## Call shape (15–20 min discovery)

1. **Rapport + frame (2 min):** "I help [trade] businesses stop drowning in admin. Mind if I
   ask how things run today, then I'll tell you straight if I can help?"
2. **Discovery (8–10 min):** the question bank. Get the number.
3. **Teach one thing (2 min):** one analogy + the 60-second proof if you can.
4. **Scope + price (2 min):** name the one workflow → anchor the audit.
5. **Close the next step (1 min):** book the audit, not "think about it." "I've got Thursday or
   Friday — which works?" (See `docs/allerion/booking-and-close-flow.md`.)

## Pre-call prep checklist

- [ ] Who are they (trade, size, area)? Any public info / reviews / website pain signals?
- [ ] Hypothesis: what are their top 2 likely pains for this trade?
- [ ] Which analogy fits that pain?
- [ ] Can I run the 60-second proof? What artifact would I ask for?
- [ ] My one-line frame and my audit anchor, ready to say out loud.

## Quick reference (say-it-out-loud lines)

- Frame: *"I build AI infrastructure for businesses that want to run themselves."*
- Value: *"You're paying for recovered hours and recovered revenue, not software."*
- Audit anchor: *"$1,500 to map it and find the leaks — and it comes straight off the build."*
- Demo invite: *"Let me answer one of your own questions from your own files. Sixty seconds."*
- Close: *"Thursday or Friday for the audit?"*
