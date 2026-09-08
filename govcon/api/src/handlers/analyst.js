// POST /v1/analyst — streams a go/no-go win plan for one pursuit.
//
// Body: { pursuit: {title, sol, agency, setAside, dueLabel, daysOut, note, reqs[]},
//         question?: string }
// 200:  text/event-stream — `delta` events carry text, then `done` or `error`.

import {
  client, models, noKey, json, readJson, clamp,
  ENTITY, RULES, pursuitBrief, sseFromStream,
} from '../openai.js';

export async function handleAnalyst(request, env) {
  const openai = client(env);
  if (!openai) return noKey();

  let body;
  try { body = await readJson(request); } catch (err) {
    return json({ error: 'bad_request', message: err.message }, 400);
  }

  const pursuit = body && body.pursuit;
  if (!pursuit || typeof pursuit !== 'object') {
    return json({ error: 'bad_request', message: 'pursuit object is required' }, 400);
  }

  const question = clamp(body.question || '', 'question');
  const instructions = `You are the Solicitation Analyst on a federal contracting team.

${ENTITY}

${RULES}

Deliver, in under 250 words of plain prose with no markdown headers:
1. Verdict — GO or NO-BID, and the single deciding factor.
2. Critical path in deadline order: what happens today, tomorrow, and by the due date.
3. The biggest compliance trap on this specific pursuit (nonmanufacturer rule, Berry, TAA,
   limitations on subcontracting, a missing NAICS size representation, a mandatory site visit)
   and exactly how to clear it — or why it cannot be cleared in the time left.
4. Pricing posture in one sentence.

You are reasoning from the board record below, not from the solicitation documents. Where the
decision genuinely turns on something only the documents can answer, say which attachment to pull
instead of guessing at its contents.`;

  const input = question
    ? `${pursuitBrief(pursuit)}\n\nThe operator also asks: ${question}`
    : pursuitBrief(pursuit);

  try {
    const stream = await openai.responses.create({
      model: models(env).analyst,
      instructions,
      input,
      max_output_tokens: 1200,
      stream: true,
    });
    return sseFromStream(stream);
  } catch (err) {
    const status = err && err.status;
    if (status === 401) return json({ error: 'upstream_auth', message: 'The model provider rejected the configured key.' }, 502);
    if (status === 429) return json({ error: 'upstream_rate_limited', message: 'The model provider is rate limiting — retry shortly.' }, 429);
    return json({ error: 'upstream', message: 'The analyst could not be reached.' }, 502);
  }
}
