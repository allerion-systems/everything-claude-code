---
name: cloudflare-workers
description: Building on Cloudflare Workers - wrangler workflow, bindings (KV, D1, R2, Durable Objects, Queues, Workers AI), configuration, local dev, testing with vitest-pool-workers, and deployment.
origin: ECC
---

# Cloudflare Workers

Cloudflare Workers is the most fully-featured edge platform: compute (Workers), key-value storage (KV), SQLite databases (D1), object storage (R2), stateful coordination (Durable Objects), messaging (Queues), cron (Triggers), and inference (Workers AI) — all accessed through **bindings** on the `env` object.

For general edge-runtime constraints (Web APIs only, isolates, CPU limits), see the `edge-runtime-patterns` skill. This skill is Workers-specific.

## When to Use

- Creating, configuring, or debugging a Cloudflare Worker
- Choosing between KV, D1, R2, and Durable Objects for a storage need
- Writing `wrangler.jsonc`/`wrangler.toml` configuration
- Setting up local dev, tests, or CI deploys for Workers

## Project Setup

```bash
npm create cloudflare@latest my-worker   # scaffold (framework or hello-world templates)
cd my-worker
npx wrangler dev                          # local dev with real bindings simulated by Miniflare
npx wrangler deploy                       # deploy to production
npx wrangler tail                         # live-stream production logs
```

Configuration lives in `wrangler.jsonc` (current default; `wrangler.toml` still supported):

```jsonc
{
  "name": "my-worker",
  "main": "src/index.ts",
  "compatibility_date": "2025-06-01",   // pin runtime behavior; bump deliberately
  "kv_namespaces": [{ "binding": "CACHE", "id": "..." }],
  "d1_databases": [{ "binding": "DB", "database_name": "app", "database_id": "..." }],
  "r2_buckets": [{ "binding": "FILES", "bucket_name": "app-files" }],
  "vars": { "ENVIRONMENT": "production" },   // non-secret config
  "triggers": { "crons": ["0 3 * * *"] }
}
```

Secrets never go in config: `npx wrangler secret put API_KEY` (or `.dev.vars` file for local dev). Both surface on `env` like any binding.

## The Worker shape

```typescript
export default {
  async fetch(request, env, ctx): Promise<Response> {
    // main HTTP handler
  },
  async scheduled(controller, env, ctx) {
    // cron trigger handler
  },
  async queue(batch, env, ctx) {
    // queue consumer
  },
} satisfies ExportedHandler<Env>;
```

Generate the `Env` type from your config so bindings are type-checked: `npx wrangler types`.

## Choosing storage

| Need | Use | Consistency / notes |
|---|---|---|
| Config, feature flags, cached API responses, sessions | **KV** | Eventually consistent (~seconds to propagate globally); reads are fast everywhere; writes are last-write-wins. Never use for counters or anything read-after-write |
| Relational/queryable app data | **D1** | SQLite; single primary location with read replication; use prepared statements |
| Files, images, backups, large blobs | **R2** | S3-compatible object storage, zero egress fees |
| Counters, locks, rate limits, websocket rooms, anything needing strong consistency | **Durable Objects** | Single-instance-per-id actor with transactional storage — the only strongly consistent primitive |
| Background/deferred work | **Queues** | At-least-once delivery, batched consumers |

### KV

```typescript
await env.CACHE.put("user:42", JSON.stringify(user), { expirationTtl: 3600 });
const user = await env.CACHE.get<User>("user:42", "json"); // null if missing/expired
await env.CACHE.delete("user:42");
```

### D1

```typescript
// Always bind parameters — never interpolate
const { results } = await env.DB
  .prepare("SELECT * FROM posts WHERE author = ? ORDER BY created_at DESC LIMIT ?")
  .bind(authorId, 20)
  .all<Post>();

// Multiple statements atomically
await env.DB.batch([
  env.DB.prepare("INSERT INTO posts (id, title) VALUES (?, ?)").bind(id, title),
  env.DB.prepare("UPDATE authors SET post_count = post_count + 1 WHERE id = ?").bind(authorId),
]);
```

Migrations: keep `.sql` files in `migrations/`, apply with `npx wrangler d1 migrations apply app` (add `--remote` for production).

### Durable Objects

One instance per id, globally unique, with strongly consistent storage — the answer whenever you catch yourself wanting a lock, a counter, or shared in-memory state:

```typescript
export class RateLimiter extends DurableObject {
  async checkLimit(key: string, max: number): Promise<boolean> {
    const count = (await this.ctx.storage.get<number>(key)) ?? 0;
    if (count >= max) return false;
    await this.ctx.storage.put(key, count + 1);
    return true;
  }
}

// In the Worker: route by id — same id always reaches the same instance
const id = env.LIMITER.idFromName(clientIp);
const ok = await env.LIMITER.get(id).checkLimit("req", 100); // RPC call
```

## Testing

Use `@cloudflare/vitest-pool-workers` — tests run inside the actual `workerd` runtime with real (local) bindings, so missing-API and binding bugs surface in unit tests:

```typescript
// vitest.config.ts
import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers/config";
export default defineWorkersConfig({
  test: { poolOptions: { workers: { wrangler: { configPath: "./wrangler.jsonc" } } } },
});

// src/index.test.ts
import { env, createExecutionContext, waitOnExecutionContext } from "cloudflare:test";
import worker from "./index";

it("responds", async () => {
  const ctx = createExecutionContext();
  const res = await worker.fetch(new Request("http://x/api/hello"), env, ctx);
  await waitOnExecutionContext(ctx); // let waitUntil work finish
  expect(res.status).toBe(200);
});
```

## Best Practices

- **Pin and deliberately bump `compatibility_date`** — it gates runtime behavior changes; treat bumps like dependency upgrades
- **Run `wrangler types` after any binding change** and commit the generated `Env`
- **Use `ctx.waitUntil()`** for post-response work (analytics, cache fills) — un-awaited promises are cancelled
- **Use the Cache API for regional response caching** (`caches.default.match/put`) and KV for global data caching — they solve different problems
- **Environments**: use `"env": { "staging": { ... } }` blocks in config plus `wrangler deploy --env staging`; keep binding names identical across envs
- **Observability**: enable Workers Logs / tail Workers rather than sprinkling `console.log` into hot paths; logs on the free tier are sampled
- **CI deploys**: `wrangler deploy` with a `CLOUDFLARE_API_TOKEN` scoped to Workers — never a global API key

## Common Pitfalls

- ❌ Treating KV as read-after-write consistent — a value written in Sydney may not be visible in Frankfurt for seconds
- ❌ Implementing counters/rate limits in KV or module scope — use Durable Objects
- ❌ String-interpolating SQL into D1 queries instead of `.bind()`
- ❌ Forgetting `--remote` on D1 migrations and wondering why production is missing tables
- ❌ Putting secrets in `vars` (they end up in config/version control) — use `wrangler secret put`
- ❌ Testing with plain Vitest/Node instead of vitest-pool-workers, then hitting runtime-only failures in production
