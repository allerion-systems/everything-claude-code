// Shared OpenAI plumbing for the war board's edge functions.
//
// The client never supplies a prompt. It sends structured pursuit fields, and
// every prompt is assembled here — otherwise the endpoint is an open, billable
// OpenAI proxy for anyone who can reach it.

import OpenAI from 'openai';

// Reasoning model for go/no-go calls; a cheaper one for structured extraction.
// Override per deployment with ANALYST_MODEL / EXTRACT_MODEL.
export const models = (env = {}) => ({
  analyst: env.ANALYST_MODEL || 'gpt-5.5',
  extract: env.EXTRACT_MODEL || 'gpt-5.4-mini',
});

// Field caps. A pursuit note is a paragraph; anything larger is either a
// mistake or someone trying to smuggle in a prompt.
const CAPS = {
  title: 200, sol: 80, agency: 160, setAside: 60, dueLabel: 80,
  note: 2000, label: 200, owner: 40, question: 400, query: 400,
};

export function clamp(value, field) {
  if (typeof value !== 'string') return '';
  return value.slice(0, CAPS[field] ?? 200);
}

export function client(env) {
  const apiKey = env && env.OPENAI_API_KEY;
  if (!apiKey) return null;
  const baseURL = env.OPENAI_BASE_URL || undefined; // Azure or a gateway in front of OpenAI
  return new OpenAI({ apiKey, baseURL });
}

export function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

export const noKey = () => json({
  error: 'analyst_unconfigured',
  message: 'OPENAI_API_KEY is not set on this deployment. The board works without it; '
    + 'the Brief tab falls back to computed triage.',
}, 503);

export async function readJson(request, limitBytes = 32_000) {
  const raw = await request.text();
  if (raw.length > limitBytes) throw new Error('payload too large');
  try { return JSON.parse(raw); } catch { throw new Error('invalid JSON body'); }
}

// The entity's real posture. Stated once, here, so no caller can widen it.
export const ENTITY = `ALLERION TECHNOLOGIES LLC — UEI KHLLHCKASEH7, CAGE 23WX9, SAM registration active.
Based in Kentucky; that is where the company and its people are. Work outside Kentucky is not
disqualifying, but travel, per diem and on-site supervision must be priced, and a distant place of
performance is a real cost against a thin margin — say so rather than treating every location alike.
Socioeconomic status: small business only. It holds NO other certification — not SDVOSB, not 8(a),
not HUBZone, not WOSB. Its SAM registration currently carries IT/software NAICS
(541511, 541512, 541519, 541690, 518210); construction and fabrication NAICS are NOT yet on the
registration, so any set-aside offer under those codes is blocked until they are added.
The company has no construction crews, which makes FAR 52.219-14 limitations on subcontracting
(prime self-performs 15% general / 25% specialty of cost) the decisive test on trade work.`;

export const RULES = `Hard rules you must respect:
- A human submits every quote. Never imply the system can submit to SAM.gov or a contracting officer.
- Never claim or assume a certification the entity does not hold.
- Pricing requires live supplier quotes. Never invent prices, and never present a remembered price as current.
- If a pursuit is not winnable, say NO-BID plainly. "Maybe" is not an answer.`;

// Turns the pursuit object the client sent into a bounded, quoted brief.
export function pursuitBrief(p = {}) {
  const reqs = Array.isArray(p.reqs) ? p.reqs.slice(0, 12) : [];
  const lines = reqs.map((r) => `  - [${clamp(r.status, 'owner')}] (${clamp(r.owner, 'owner')}) ${clamp(r.label, 'label')}`);
  return [
    `Title: ${clamp(p.title, 'title')}`,
    `Solicitation: ${clamp(p.sol, 'sol')}`,
    `Agency: ${clamp(p.agency, 'agency')}`,
    `Set-aside: ${clamp(p.setAside, 'setAside')}`,
    `Deadline: ${clamp(p.dueLabel, 'dueLabel')}${Number.isFinite(p.daysOut) ? ` (${p.daysOut.toFixed(1)} days out)` : ''}`,
    `Board intel: ${clamp(String(p.note || '').replace(/<[^>]+>/g, ''), 'note')}`,
    lines.length ? `Open requirements:\n${lines.join('\n')}` : 'Open requirements: none recorded.',
  ].join('\n');
}

// Server-Sent Events bridge for a streaming Responses call.
export function sseFromStream(stream) {
  const encoder = new TextEncoder();
  const body = new ReadableStream({
    async start(controller) {
      const send = (event, data) =>
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      try {
        for await (const event of stream) {
          if (event.type === 'response.output_text.delta' && event.delta) {
            send('delta', { text: event.delta });
          } else if (event.type === 'response.completed') {
            send('done', { ok: true });
          } else if (event.type === 'response.failed' || event.type === 'error') {
            send('error', { message: 'The model run failed.' });
          }
        }
      } catch {
        send('error', { message: 'The analyst stream was interrupted.' });
      } finally {
        controller.close();
      }
    },
  });
  return new Response(body, {
    headers: {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-store',
      connection: 'keep-alive',
    },
  });
}
