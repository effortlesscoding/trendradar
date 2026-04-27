
// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PostData {
  id: string;
  subreddit: string;
  title: string;
  body: string;
  score: number;
  numComments: number;
  url: string;
  comments: string[];
}

export interface KeywordMatch {
  keyword: string;
  pattern: RegExp;
  weight: number; // higher = stronger "information hunger" signal
}

export interface ScoredTopic {
  subreddit: string;
  title: string;
  url: string;
  score: number;
  redditScore: number;
  matchedSignals: string[];
  rawText: string; // title + top comments, passed to LLM
}

export interface LLMVideoIdea {
  topic: string;
  rationale: string;
  suggestedTitle: string;
  category: string;
}

// ---- Archiving types ---


export interface SubredditArchive {
  meta: {
    subreddit: string;
    fetchedAt: string;
    postCount: number;
    scriptVersion: string;
  };
  posts: PostData[];
}

export interface ScoredArchive {
  meta: {
    fetchedAt: string;
    totalPosts: number;
    matchedPosts: number;
    minSignalScore: number;
    scriptVersion: string;
  };
  topics: ScoredTopic[];
}

export interface LLMArchive {
  meta: {
    fetchedAt: string;
    model: string;
    topNSent: number;
    ideasGenerated: number;
    scriptVersion: string;
  };
  ideas: LLMVideoIdea[];
}
