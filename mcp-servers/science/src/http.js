// Thin HTTP helpers shared by every data source.
//
// Every source module accepts an injectable `fetchImpl` so the network layer can
// be stubbed in tests; these helpers are the only place that touches the network.

/** Package identity sent in User-Agent. Public science APIs (NCBI, CrossRef, OpenAlex) ask for one. */
export const USER_AGENT = "science-mcp/0.1 (+https://github.com/affaan-m/everything-claude-code)";

/**
 * Optional contact email. CrossRef and OpenAlex route requests that identify a
 * contact into a faster "polite pool". Set SCIENCE_MCP_CONTACT_EMAIL to opt in.
 * @returns {string | undefined}
 */
export function contactEmail() {
  const value = process.env.SCIENCE_MCP_CONTACT_EMAIL;
  return value && value.trim() ? value.trim() : undefined;
}

class HttpError extends Error {
  /** @param {string} message @param {number} status */
  constructor(message, status) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

/**
 * Fetch a URL and return its body as text, throwing a compact error on failure.
 * @param {string} url
 * @param {{ fetchImpl?: typeof fetch, timeoutMs?: number, accept?: string }} [options]
 * @returns {Promise<string>}
 */
export async function fetchText(url, options = {}) {
  const { fetchImpl = fetch, timeoutMs = 20000, accept } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": USER_AGENT,
        ...(accept ? { Accept: accept } : {}),
      },
    });
    const body = await response.text();
    if (!response.ok) {
      throw new HttpError(
        `HTTP ${response.status} from ${hostOf(url)}: ${truncate(body, 200)}`,
        response.status,
      );
    }
    return body;
  } catch (error) {
    if (error && error.name === "AbortError") {
      throw new Error(`Request to ${hostOf(url)} timed out after ${timeoutMs}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Fetch a URL and parse the body as JSON.
 * @param {string} url
 * @param {{ fetchImpl?: typeof fetch, timeoutMs?: number }} [options]
 * @returns {Promise<unknown>}
 */
export async function fetchJson(url, options = {}) {
  const text = await fetchText(url, { ...options, accept: "application/json" });
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Invalid JSON from ${hostOf(url)}`);
  }
}

/** @param {string} url */
function hostOf(url) {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

/** @param {string} value @param {number} max */
function truncate(value, max) {
  const clean = value.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max)}…` : clean;
}
