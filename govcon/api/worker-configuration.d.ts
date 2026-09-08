// Bindings available to the Worker. Secrets are set with `wrangler secret put`
// and never appear in wrangler.jsonc; vars come from the `vars` block there.

interface Env {
  /** Comma-separated client API keys. Unset means every request is refused. */
  API_KEYS: string;
  /** Provider key for the model routes. Unset means those routes return 503. */
  OPENAI_API_KEY: string;

  /** Comma-separated origins that receive CORS headers. Not authentication. */
  ALLOWED_ORIGINS?: string;
  /** Per-key fixed-window limit. Defaults to 20 when unset. */
  RATE_LIMIT_PER_MINUTE?: string;
  /** Reasoning model for go/no-go calls. Defaults to gpt-5.5. */
  ANALYST_MODEL?: string;
  /** Cheaper model for structured extraction. Defaults to gpt-5.4-mini. */
  EXTRACT_MODEL?: string;
  /** Override the provider base URL, for Azure or a gateway. */
  OPENAI_BASE_URL?: string;
}
