# ChatGPT front door

The door R&B employees use day to day. A custom **GPT** ("R&B Operations") on R&B's ChatGPT
business account, wired to the Agency by one **Action**. It routes every request to the Agency,
which runs the workflow across Roofr, Hover, Handoff.ai, QuickBooks, and Microsoft 365.

```
employee → ChatGPT (R&B Operations GPT) → askAgency Action → Agency backend
        → routes to the right lane (GPT or Claude, per ADR-001) → reply
```

## Set it up
1. ChatGPT (Team/Enterprise) → **Create a GPT**.
2. **Instructions:** paste `RB-OS-GPT-instructions.md`.
3. **Actions → Add:** paste `rb-os-actions.openapi.yaml`; set the server URL to R&B's
   Allerion-hosted Agency endpoint and add the `X-RB-OS-Key` API key.
4. Share the GPT with the R&B workspace.

## Why a GPT + Action (not GPT-native logic)
Per **ADR-001**, the workflow brain lives in the **Agency**, not inside the GPT. The GPT is a
thin, friendly front door; the Agency owns routing, multi-step state, the shared Brain, and the
hybrid model choices. Same API backs the MCP server (`../mcp/`) and Teams — one platform, many
doors, no logic duplicated.

## [CONFIRM] on the audit
- ChatGPT plan (Team vs Enterprise) and admin to publish org GPTs + Actions.
- The Agency endpoint URL + API key issuance.
- OpenAI model for the GPT lanes (`agency/openai/assistants.yaml`).
