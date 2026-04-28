export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface SignalPattern {
  pattern: RegExp;
  weight: number;
  label: string;
}

const SIGNAL_PATTERNS: SignalPattern[] = [
  // Weight 3 - strong learning intent
  { pattern: /\bELI5\b/i, weight: 3, label: "ELI5" },
  { pattern: /can someone explain/i, weight: 3, label: "explain-request" },
  { pattern: /no good (resource|tutorial|explanation)/i, weight: 3, label: "resource-gap" },
  { pattern: /wish someone (had )?explained/i, weight: 3, label: "wish-explained" },
  { pattern: /intuition behind/i, weight: 3, label: "intuition" },
  { pattern: /\bconfused (about|by|regarding)\b/i, weight: 3, label: "confused" },
  { pattern: /\bnobody explains\b/i, weight: 3, label: "nobody-explains" },

  // Weight 2 - moderate learning intent
  { pattern: /how does .{3,40} work/i, weight: 2, label: "how-does-work" },
  { pattern: /looking for (a )?tutorial/i, weight: 2, label: "tutorial-request" },
  { pattern: /\bbeginners? guide\b/i, weight: 2, label: "beginner-guide" },
  { pattern: /\bhard to understand\b/i, weight: 2, label: "hard-to-understand" },
  { pattern: /\bstill don'?t understand\b/i, weight: 2, label: "dont-understand" },
  { pattern: /\bwhat is (the )?difference\b/i, weight: 2, label: "difference-question" },
  { pattern: /\bwhen should (i|you|we) use\b/i, weight: 2, label: "when-to-use" },
  { pattern: /\bbest (way|resource|book) to learn\b/i, weight: 2, label: "learn-resource" },
  { pattern: /\bactually (works?|means?)\b/i, weight: 2, label: "actually-works" },

  // Weight 1 - weak signal
  { pattern: /\bhow to\b/i, weight: 1, label: "how-to" },
  { pattern: /\bwhy (is|does|do|are)\b/i, weight: 1, label: "why-question" },
  { pattern: /\btutorial\b/i, weight: 1, label: "tutorial-mention" },
  { pattern: /\bexplain\b/i, weight: 1, label: "explain-mention" },
  { pattern: /\bnewbie\b|\bnoob\b|\bbeginner\b/i, weight: 1, label: "beginner" },
  { pattern: /\bfrustrat/i, weight: 1, label: "frustrated" },
  { pattern: /\boverwhel/i, weight: 1, label: "overwhelmed" },
  { pattern: /\bwhere (do|can|should) (i|you)\b/i, weight: 1, label: "where-to" },
];

export interface ScoreResult {
  score: number;
  matchedKeywords: string[];
}

export function scoreText(title: string, comments: string[]): ScoreResult {
  const combined = [title, ...comments].join(" ");
  let score = 0;
  const matchedKeywords: string[] = [];

  for (const { pattern, weight, label } of SIGNAL_PATTERNS) {
    if (pattern.test(combined)) {
      score += weight;
      matchedKeywords.push(label);
    }
  }

  return { score, matchedKeywords };
}
