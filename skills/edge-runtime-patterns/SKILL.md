---
name: edge-runtime-patterns
description: Fundamentals of coding at the edge - V8 isolates, Web-standard APIs, runtime constraints, the fetch handler model, streaming responses, and choosing edge vs serverless vs origin compute.
origin: ECC
---

# Edge Runtime Patterns

Edge computing runs your code in lightweight runtimes distributed across hundreds of locations close to users, instead of one region. The tradeoff: dramatically lower latency and instant cold starts, in exchange for a restricted runtime that is **not Node.js**.

## When to Use

- Writing or reviewing code for Cloudflare Workers, Vercel Edge Middleware/Functions, Deno Deploy, Netlify Edge Functions, Fastly Compute, or Supabase Edge Functions
- Deciding whether a route belongs at the edge, in a serverless function, or on an origin server
- Debugging "works locally, breaks on deploy" errors caused by Node APIs missing at the edge
- Designing middleware: auth checks, redirects, A/B tests, geolocation, bot filtering, header rewriting

## Core Concepts

### Isolates, not containers

Edge platforms run V8 isolates (or Wasm sandboxes) instead of containers or VMs:

- **Cold starts are ~0-5ms**, not hundreds of milliseconds — isolates spin up per-request cheaply
- **No process model**: no `child_process`, no long-lived background threads, no signals
- **Memory is small** (typically 128MB) and **CPU time is metered** (as low as 10ms per request on free tiers, seconds on paid tiers) — wall-clock waiting on `fetch` usually does not count against CPU
- **State does not survive**: an isolate may be evicted between any two requests. Never rely on module-level variables for correctness — treat them strictly as best-effort caches

### Web-standard APIs only

Edge runtimes converge on the WinterTC (formerly WinterCG) minimum common API — the same primitives as browsers and service workers:

Available everywhere: `fetch`, `Request`, `Response`, `Headers`, `URL`, `URLSearchParams`, `ReadableStream`, `WritableStream`, `TransformStream`, `TextEncoder`/`TextDecoder`, `crypto.subtle` (WebCrypto), `atob`/`btoa`, `structuredClone`, `AbortController`, `setTimeout`/`setInterval`, `console`.

Generally **not** available (or only via compatibility shims): `fs`, `net`, `http`, `child_process`, `os`, `path` file access, native addons (`.node`), and anything depending on them transitively. This is the #1 source of edge deployment failures — a dependency three levels deep imports `fs` and the bundle breaks.

### The fetch handler model

Every edge platform is a variation of: a function receives a `Request`, returns a `Response`.

```typescript
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/hello") {
      return Response.json({ message: "hello from the edge" });
    }

    return new Response("Not found", { status: 404 });
  },
};
```

Key lifecycle rule: the isolate can be torn down as soon as the `Response` is returned. Work that must finish after responding (logging, analytics, cache writes) must be registered with `ctx.waitUntil()` (Cloudflare/Vercel) or the platform equivalent:

```typescript
ctx.waitUntil(logToAnalytics(request)); // runs after the response is sent
return response;
```

### Streaming by default

Edge runtimes make streaming natural — start sending bytes before you have the whole payload:

```typescript
// Proxy + transform a response without buffering it in memory
const upstream = await fetch("https://origin.example.com/big.json");
const transformed = upstream.body!.pipeThrough(
  new TransformStream({
    transform(chunk, controller) {
      controller.enqueue(chunk); // inspect/modify chunks here
    },
  }),
);
return new Response(transformed, { headers: upstream.headers });
```

Never buffer large bodies with `await response.text()` when you can pipe — memory limits are tight.

## Edge vs Serverless vs Origin — decision guide

| Workload | Run it at | Why |
|---|---|---|
| Auth checks, redirects, rewrites, geo-routing, A/B bucketing | **Edge** | Per-request, latency-critical, tiny CPU |
| API reading from a globally replicated store (KV, D1, Turso, Upstash) | **Edge** | Data is already close to the user |
| API doing heavy CPU (image resize, PDF gen, big JSON transforms) | **Serverless / origin** | Edge CPU limits will kill it |
| Anything talking to a single-region database over TCP | **Serverless in that region** | An edge function far from the DB adds round-trips and makes latency *worse* |
| Long-running jobs, websocket fan-out with heavy state, ML inference | **Origin / specialized (Durable Objects, queues)** | Needs persistence or long CPU |

The classic mistake: moving an API route "to the edge" while its Postgres stays in `us-east-1`. Every DB round-trip now crosses the planet. Edge compute only pays off when the data is at the edge too, or when no data access is needed.

## Platform cheat sheet

- **Cloudflare Workers** — richest edge platform: KV, D1 (SQLite), R2 (object storage), Durable Objects, Queues, Workers AI. Deploy with `wrangler`. See the `cloudflare-workers` skill.
- **Vercel Edge Middleware** — runs before every request; ideal for auth/rewrites in Next.js (`middleware.ts`). For route handlers, Vercel now generally recommends the Node runtime with Fluid Compute; reserve the edge runtime for middleware and latency-critical reads.
- **Deno Deploy** — Deno runtime (TypeScript native, Web APIs, npm compat via `npm:` specifiers).
- **Netlify Edge Functions** — Deno-based, sits in front of Netlify sites.
- **Fastly Compute** — Wasm-based (Rust/JS/Go), lowest-level control.
- **Supabase Edge Functions** — Deno-based, colocated with Supabase projects.

## Best Practices

- **Check the runtime before adding a dependency**: prefer dependency-free or Web-API-based libraries (e.g. `jose` for JWT — pure WebCrypto — instead of `jsonwebtoken`, which needs Node `crypto`)
- **Use WebCrypto for all crypto**: `crypto.subtle.sign/verify/digest`, `crypto.randomUUID()`, `crypto.getRandomValues()`
- **Read env from the platform's binding mechanism**, not `process.env` (Workers pass `env` to the handler; some runtimes shim `process.env`, but don't assume it)
- **Set explicit timeouts on outbound `fetch`** with `AbortSignal.timeout(ms)` — a hung upstream burns your request duration
- **Guard module scope**: top-level code runs once per isolate, at unpredictable times, possibly concurrently across many isolates. Keep it to pure setup
- **Test in the real runtime**, not plain Node: `wrangler dev`, `vercel dev`, `deno task dev`, or platform-provided Vitest pools — Node-based unit tests will not catch missing-API failures

## Common Pitfalls

- ❌ Importing a Node-only package (`fs`, `net`, native addons) — fails at build or first request
- ❌ Global mutable state as source of truth — isolates are ephemeral and per-location
- ❌ Fire-and-forget promises without `waitUntil` — silently cancelled when the response returns
- ❌ Edge function + single-region database — latency gets worse, not better
- ❌ Buffering multi-megabyte bodies in memory instead of streaming
- ❌ Assuming one instance: hundreds of isolates run concurrently worldwide; in-memory rate limiting or dedupe does not work — use KV/Durable Objects/Redis
