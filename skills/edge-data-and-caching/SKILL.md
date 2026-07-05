---
name: edge-data-and-caching
description: Data access and caching strategies for edge applications - cache layering, stale-while-revalidate, edge-compatible databases, HTTP over TCP drivers, stateless auth with JWT/WebCrypto, and consistency pitfalls.
origin: ECC
---

# Edge Data and Caching

Edge compute is only as fast as its data access. This skill covers where data should live for edge apps, how to layer caches, and how to do auth without server-side session state. For runtime constraints see `edge-runtime-patterns`; for Cloudflare-specific storage see `cloudflare-workers`.

## When to Use

- Designing data access for an edge function or middleware
- An edge deployment made latency *worse* and you need to find out why
- Choosing an edge-compatible database or cache (KV, D1, Turso, Upstash, Neon, PlanetScale, Hyperdrive)
- Implementing caching headers, `stale-while-revalidate`, or cache invalidation at the edge
- Implementing auth in edge middleware (JWT verification, cookies, sessions)

## Core Concepts

### The distance rule

Every network round-trip from an edge location to a distant origin costs 50-300ms. An edge function that makes 3 sequential calls to a `us-east-1` Postgres is slower for a user in Tokyo than a `us-east-1` serverless function making the same calls. Rank data options by distance:

1. **In the response already** — static generation, cached full responses (0 round-trips)
2. **Edge-local cache** — Cache API, KV read replicas, regional Redis (same-datacenter)
3. **Globally replicated store** — KV, Turso embedded replicas, Upstash global Redis, D1 read replication (near)
4. **Single-region database** — fine only if calls are few and parallel, or the function runs near it (far)

If most requests end at level 4, the route probably should not be at the edge.

### Talking to databases: HTTP, not TCP

Edge runtimes generally can't hold raw TCP sockets or connection pools, and thousands of short-lived isolates would exhaust Postgres connections anyway. Use:

- **HTTP/WebSocket drivers**: Neon serverless driver, PlanetScale `@planetscale/database`, Turso `@libsql/client`, Upstash Redis REST, Supabase REST
- **A pooling proxy** between edge and DB: Cloudflare Hyperdrive, pgbouncer/pgcat, Prisma Accelerate, Supabase Supavisor
- **ORMs that fit**: Drizzle and Kysely work over these HTTP drivers; classic `pg`/`mysql2` with a socket pool does not

### Cache layering pattern

The canonical edge read path — try cheapest first, fill upward:

```typescript
async function getProduct(id: string, env: Env, ctx: ExecutionContext): Promise<Product> {
  // L1: regional response cache (per-datacenter)
  const cacheKey = new Request(`https://cache.internal/product/${id}`);
  const cached = await caches.default.match(cacheKey);
  if (cached) return cached.json();

  // L2: global KV (eventually consistent, ~ms reads everywhere)
  const kv = await env.CACHE.get<Product>(`product:${id}`, "json");
  if (kv) {
    ctx.waitUntil(caches.default.put(cacheKey, Response.json(kv, cacheHeaders(60))));
    return kv;
  }

  // L3: source of truth
  const product = await fetchFromDatabase(id, env);
  ctx.waitUntil(Promise.all([
    env.CACHE.put(`product:${id}`, JSON.stringify(product), { expirationTtl: 300 }),
    caches.default.put(cacheKey, Response.json(product, cacheHeaders(60))),
  ]));
  return product;
}
```

Cache fills go through `ctx.waitUntil` so they never delay the response.

### stale-while-revalidate

The workhorse header for edge caching — serve stale instantly, refresh in the background:

```
Cache-Control: public, max-age=60, stale-while-revalidate=600
```

- Fresh for 60s: served from cache, no origin contact
- 60s-11min: served *stale immediately*, revalidated in the background
- Use `s-maxage` to give CDN/edge caches a different (usually longer) TTL than browsers
- `stale-if-error` keeps serving cached content when the origin is down

### Invalidation

- **Prefer short TTL + SWR over purging** — purge-based invalidation across hundreds of edge locations is eventually consistent anyway and adds failure modes
- **Version keys instead of purging**: embed a version/hash in the cache key (`product:${id}:v${version}`) and bump it on write; stale entries expire naturally
- **Tag-based purge** (Cloudflare `Cache-Tag`, Vercel/Next.js `revalidateTag`) when you genuinely need grouped invalidation
- Never cache `Set-Cookie` responses or per-user pages without keying on the user

## Auth at the edge

There is no shared memory between isolates, so sessions must be **stateless (JWT) or backed by a fast global store**.

JWT verification with WebCrypto works in every edge runtime — use `jose` (pure Web APIs), not `jsonwebtoken` (Node-only):

```typescript
import { jwtVerify, createRemoteJWKSet } from "jose";

const jwks = createRemoteJWKSet(new URL("https://auth.example.com/.well-known/jwks.json"));

async function authenticate(request: Request): Promise<AuthUser | null> {
  const cookie = request.headers.get("Cookie") ?? "";
  const token = /session=([^;]+)/.exec(cookie)?.[1];
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, jwks, { issuer: "https://auth.example.com" });
    return { id: payload.sub!, roles: (payload.roles as string[]) ?? [] };
  } catch {
    return null; // expired/invalid — treat as unauthenticated, don't 500
  }
}
```

Guidelines:

- Verify at the edge, **authorize close to the data** — middleware answers "who is this?", the handler still enforces "may they do this?"
- Short-lived access tokens (5-15 min) + refresh at the origin; edge revocation checks (against KV/Redis) only for high-value routes, since a global deny-list read adds latency to every request
- Cookies: `HttpOnly; Secure; SameSite=Lax; Path=/` minimum
- HMAC/signature work uses `crypto.subtle` — never pull in Node crypto polyfills

## Consistency pitfalls

- **Read-after-write does not hold globally.** A user who saves a setting and reloads may hit a different edge location with a stale replica. Route read-after-write flows to the primary (or return the written value in the response) instead of re-reading through the eventual-consistency layer
- **Last-write-wins stores (KV) lose concurrent updates.** Two edge locations writing the same key race; one write vanishes. Anything with contention needs a single-writer primitive (Durable Object, database row, Redis with CAS)
- **Per-isolate memoization is an optimization, never correctness.** `let cached` at module scope may serve stale data for the isolate's lifetime and differs per location — always pair it with a TTL check

## Common Pitfalls

- ❌ Edge function + sequential queries to a single-region DB — the anti-pattern that makes edge slower than serverless
- ❌ Classic TCP database drivers/pools in an edge runtime — use HTTP drivers or a pooling proxy
- ❌ Caching authenticated or `Set-Cookie` responses in a shared cache
- ❌ Purge-based invalidation as the primary strategy — prefer TTL + SWR + versioned keys
- ❌ Storing sessions in per-isolate memory — isolates are ephemeral and regional
- ❌ Reading a global deny-list on every request "for security" — measure the added latency; scope it to sensitive routes
