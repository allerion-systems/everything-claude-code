---
name: youtube-ingest
description: Ingest a YouTube video pasted into chat (URL or transcript) and turn it into something useful — a summary, key takeaways, a competitor hook/structure breakdown, notes for the second brain, or repurposed Higgs Field content (video/Shorts/posts). Use whenever the user pastes a youtube.com or youtu.be link, or asks to summarize/analyze/repurpose a YouTube video.
origin: ECC
---

# YouTube Ingest

Paste a YouTube link (or its transcript) into the chat and get something useful back. This skill
defines how to **reliably get the content** and **what to do with it** — defaulting to the actions
Higgs Field / Allerion actually need.

## When to Activate

- The user pastes a `youtube.com/watch?v=…`, `youtu.be/…`, or Shorts link
- The user pastes a YouTube transcript and asks to do something with it
- The user says "summarize / break down / repurpose / learn from this video"

## Step 1 — Get the content (reliability ladder)

You cannot watch raw video pixels from a bare URL. Work down this ladder and **say which rung you
used** so the user knows how complete the source is:

1. **Video-understanding MCP tool** — if one is connected (e.g. a Gemini "understand YouTube video"
   tool, or a videodb/transcription tool), pass the URL to it for transcript + visual context.
   Best fidelity. Check available tools first (ToolSearch for "youtube" / "transcribe" / "video").
2. **WebFetch the URL** — gets title, channel, description, and often chapter/keyword metadata.
   Good for framing and SEO, but usually **not** the full spoken transcript. Use for quick context.
3. **Ask for the transcript (universal fallback)** — if 1 and 2 don't yield the words, ask:
   *"Open the video → '…more' → 'Show transcript' → copy it here and I'll work from that."* This
   always works, in any environment, with full fidelity.

Never silently guess a video's content from the title alone — if you only have metadata, say so and
offer to go deeper with the transcript.

## Step 2 — Confirm the intent (one quick question if unclear)

Ask which outcome they want (or infer from how they pasted it):

- **Summarize** — TL;DR + key takeaways + timestamps if available.
- **Competitor/inspiration breakdown** — the hook, the structure, why it works, what to steal.
- **Repurpose for Higgs Field** — hand the transcript to `skills/higgs-field-content/SKILL.md`
  to produce a long-form script + Shorts + LinkedIn/X posts in the channel's teach-don't-pitch format.
- **Save to the brain** — distil notes into the `digital-5d-brain` (capture as a knowledge note /
  content angle for later).
- **Extract claims/facts** — pull statements, with the caveat that transcript ≠ verified truth.

## Step 3 — Do it, in the right format

- **Summary:** 3–5 bullet takeaways, then a 2–3 sentence TL;DR, then notable timestamps if present.
- **Breakdown (for the channel):** Hook (first 15s) → structure (the beats) → retention tricks →
  "what to borrow for Higgs Field" → one title idea in our pain-first SEO style
  (`docs/allerion/higgs-field/channel-strategy.md`).
- **Repurpose:** invoke `higgs-field-content` with the transcript as the source; return the full
  content drop (video script, 2–3 Shorts, posts), each with the soft Digital Brain Starter CTA.
- **Brain note:** a titled note with source URL, 3–5 distilled points, and a "content angle" line.

## Guardrails

- **Attribute the rung.** Always state whether you worked from full transcript, metadata only, or
  user-pasted text — the user should know how grounded the output is.
- **Don't fabricate quotes or timestamps.** If you only had the description, don't invent what was
  said in the video.
- **Respect copyright.** Repurposing means learning structure and making *original* content, not
  copying someone's script. For the user's *own* videos, anything goes.
- **One link at a time** unless the user pastes several explicitly; batch only on request.

## Examples

- User pastes a competitor's video → "Worked from the transcript. Here's the hook, the structure,
  and three things worth borrowing for Higgs Field…" 
- User pastes their own recorded demo → route to `higgs-field-content` → returns the week's drop.
- User pastes a link with no transcript available → return metadata summary + ask for the transcript
  to go deeper.
