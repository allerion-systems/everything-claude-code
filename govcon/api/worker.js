// Cloudflare Workers entry point.
//
// Bindings arrive as `env` — see worker-configuration.d.ts for the shape and
// wrangler.jsonc for what is set where. Secrets are never in config.

import { route } from './src/router.js';

/** @type {ExportedHandler<Env>} */
export default {
  fetch: (request, env) => route(request, env),
};
