/* Where the war board finds the Allerion API.
 *
 * READ THIS BEFORE PUTTING A KEY HERE.
 *
 * This file ships to the browser. Anyone who can load the page can read `key`
 * — view-source is enough. That is unavoidable for a static app calling an
 * authenticated API, so treat it as an identifier, not a secret:
 *
 *   1. Put the war board behind Cloudflare Access. That is the real control.
 *      The key below only limits what a leaked page can do, not who loads it.
 *   2. Issue this key separately from any server-to-server key, so it can be
 *      rotated on its own by editing API_KEYS on the API and this line here.
 *   3. Keep RATE_LIMIT_PER_MINUTE low on the API so a leaked key is a small
 *      bill rather than a large one.
 *
 * Leave `base` empty to disable the AI features entirely — the board still
 * works offline, and Discover explains that it is unavailable.
 */
window.ALLERION_API = {
  base: "",   // e.g. "https://api.allerion.io/v1"
  key: "",    // browser-scoped API key; see the warning above
};
