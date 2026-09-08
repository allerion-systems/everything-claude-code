// Cloudflare Workers entry point.
// Secrets and vars arrive as `env`; see wrangler.toml.

import { route } from './src/router.js';

export default {
  fetch: (request, env) => route(request, env),
};
