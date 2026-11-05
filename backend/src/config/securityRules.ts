/**
 * Security limits in one place. Change numbers here, not in middleware or routes.
 * Per-IP limits are generous on purpose: many village phones share one mobile-network IP (carrier NAT).
 * The stores are in memory, which is right for one backend instance (see DEPLOY.md before scaling out).
 */
export const RATE_LIMITS = {
  /** Every /api request, per IP. Stops scripts and floods; a real farmer makes a few requests a minute. */
  api: { windowMs: 60_000, limit: 300 },
  /** Every write (POST/PUT/PATCH/DELETE), per IP. */
  writes: { windowMs: 60_000, limit: 120 },
  /** AI calls (diagnose, chat, Snap & List, price estimate), per IP: protects the shared Gemini quota. */
  ai: { windowMs: 60_000, limit: 30 },
} as const;

/**
 * Content-Security-Policy of the API itself. The API only returns JSON, CSV and images, never HTML,
 * so nothing may run, load or frame it. The frontend's own policy is in frontend/nginx.conf (+ render.yaml).
 */
export const API_CSP_DIRECTIVES = {
  defaultSrc: ["'none'"],
  frameAncestors: ["'none'"],
  baseUri: ["'none'"],
  formAction: ["'none'"],
} as const;
