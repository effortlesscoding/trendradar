

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

import { KEYWORD_SIGNALS } from "./config";

export const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

export function scoreText(text: string): { total: number; matched: string[] } {
  let total = 0;
  const matched: string[] = [];

  for (const signal of KEYWORD_SIGNALS) {
    if (signal.pattern.test(text)) {
      total += signal.weight;
      matched.push(signal.keyword);
    }
  }

  return { total, matched };
}