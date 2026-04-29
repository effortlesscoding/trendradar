export interface PostData {
  id: string;
  title: string;
  url: string;
  subreddit: string;
  upvotes: number;
  commentCount: number;
  comments: string[];
  scrapedAt: string;
}

export interface ScoredTopic extends PostData {
  signalScore: number;
  matchedKeywords: string[];
}

export type VideoCategory =
  | "concept-explainer"
  | "tutorial"
  | "comparison"
  | "myth-busting"
  | "deep-dive";

export interface LLMVideoIdea {
  topic: string;
  rationale: string;
  suggestedTitle: string;
  category: VideoCategory;
}

export type SubredditStatus = "pending" | "scraping" | "done" | "error";

export interface SubredditState {
  status: SubredditStatus;
  postCount: number;
  error?: string;
  startedAt?: string;
  finishedAt?: string;
}

export interface SessionState {
  subreddits: Record<string, SubredditState>;
  startedAt: string | null;
  finishedAt: string | null;
}

export interface ScrapedPost {
  id: string;
  title: string;
  url: string;
  upvotes: number;
  commentCount: number;
  comments: string[];
}

export interface PostBatch {
  subreddit: string;
  posts: ScrapedPost[];
  done: boolean;
}
