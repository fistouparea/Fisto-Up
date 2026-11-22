export const AI_RULES = {
  /**
   * A model without an answer after this long gets company: the next model starts alongside and the first valid
   * answer wins. Measured 22 Nov 2026 with a 38 KB photo: gemini-3.8-flash > 60 s, gemini-3.5-flash 27 s,
   * gemini-3.1-flash-lite 3 s. One after another (25 s timeout each) that was ~53 s of waiting; now ~11 s.
   */
  hedgeAfterMs: 4_000,
} as const;
