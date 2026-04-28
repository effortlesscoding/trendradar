

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

import { KeywordMatch } from "./types";

const Env = {
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    REDDIT_CLIENT_ID: process.env.REDDIT_CLIENT_ID,
    REDDIT_CLIENT_SECRET: process.env.REDDIT_CLIENT_SECRET,
    REDDIT_USER_AGENT: process.env.REDDIT_USER_AGENT,
}

const emptyEntries = Object.entries(Env).filter(([k, v]) => !v);
if (emptyEntries.length > 0) {
    console.warn("⚠️  Warning: One or more environment variables are missing. Please check your .env file.");
    console.warn("   Missing:", emptyEntries.map(([k]) => k).join(", "));
}

export const CONFIG = {
  postsPerSubreddit: 50, // How many posts to pull per subreddit
  commentsPerPost: 10, // Top N comments to include
  delayBetweenRequests: 1200, // ms — keeps well under Reddit's 60 req/min limit
  minSignalScore: 2, // Minimum keyword weight sum to include a post
  llmEnabled: true, // Set false to skip LLM step
  llmTopN: 20, // Send only top N posts to LLM (saves tokens)
  Env,
};

// ---------------------------------------------------------------------------
// "Information hunger" keyword signals
// Each pattern has a weight. Higher = stronger signal for a YouTube topic.
// ---------------------------------------------------------------------------

export const KEYWORD_SIGNALS: KeywordMatch[] = [
  // Direct confusion / requests for explanation
  {
    keyword: "how does * work",
    pattern: /how does .{3,40} work/i,
    weight: 3,
  },
  {
    keyword: "can someone explain",
    pattern: /can (someone|anyone) (please )?explain/i,
    weight: 3,
  },
  { keyword: "eli5", pattern: /\beli5\b/i, weight: 3 },
  {
    keyword: "explain like i'm",
    pattern: /explain (like|as if) i'?m/i,
    weight: 3,
  },
  {
    keyword: "what is the difference between",
    pattern: /what('?s| is) the difference between/i,
    weight: 3,
  },
  {
    keyword: "i don't understand",
    pattern: /i (don'?t|cant|can'?t) understand/i,
    weight: 2,
  },
  { keyword: "confused about", pattern: /confused (about|by|with)/i, weight: 2 },
  { keyword: "still don't get", pattern: /still (don'?t|can'?t) get/i, weight: 2 },
  { keyword: "never understood", pattern: /never (fully |really )?understood/i, weight: 2 },

  // Frustration with lack of resources
  {
    keyword: "no good resource",
    pattern: /no (good |clear |decent )?(resource|tutorial|guide|explanation)/i,
    weight: 3,
  },
  {
    keyword: "couldn't find",
    pattern: /couldn'?t find (a |any )?(good |clear )?/i,
    weight: 2,
  },
  {
    keyword: "why isn't there",
    pattern: /why (isn'?t|aren'?t|is there no) (a |any )?/i,
    weight: 2,
  },
  {
    keyword: "wish someone explained",
    pattern: /wish (someone|anyone) (would |could )?(explain|cover|make)/i,
    weight: 3,
  },

  // Active seeking of tutorials / videos
  {
    keyword: "looking for tutorial",
    pattern: /looking for (a |any )?(good |clear )?(tutorial|guide|course|video)/i,
    weight: 3,
  },
  {
    keyword: "recommend a resource",
    pattern: /(recommend|suggest) (a |any )?(resource|tutorial|book|video|course)/i,
    weight: 2,
  },
  {
    keyword: "where to learn",
    pattern: /where (can i|do i|should i) (learn|start|begin)/i,
    weight: 2,
  },
  {
    keyword: "best way to learn",
    pattern: /best way to (learn|understand|grasp)/i,
    weight: 2,
  },

  // Specific frustration patterns common in CS/AI subs
  {
    keyword: "keeps failing",
    pattern: /(it |this )?(keeps|keep) (failing|breaking|crashing)/i,
    weight: 1,
  },
  { keyword: "why does X behave", pattern: /why does .{3,30} (behave|act|work)/i, weight: 2 },
  {
    keyword: "intuition behind",
    pattern: /intuition (behind|for|of)/i,
    weight: 3,
  },
  {
    keyword: "what's the point of",
    pattern: /what'?s the point of/i,
    weight: 2,
  },
  {
    keyword: "make it click",
    pattern: /(help (it|this) )?(finally )?(click|make sense)/i,
    weight: 2,
  },
];