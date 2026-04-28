const API_BASE = "http://localhost:3457";

export interface SessionStartResponse {
  ok: boolean;
  subreddits: string[];
}

export interface SessionStatus {
  subreddits: Record<
    string,
    {
      status: "pending" | "scraping" | "done" | "error";
      postCount: number;
      error?: string;
      startedAt?: string;
      finishedAt?: string;
    }
  >;
  startedAt: string | null;
  finishedAt: string | null;
  analysisTriggered: boolean;
}

export interface PostBatchResponse {
  received: number;
  scored: number;
  subredditTotal: number;
}

export async function startSession(
  subreddits: string[]
): Promise<SessionStartResponse> {
  const res = await fetch(`${API_BASE}/session/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subreddits }),
  });
  if (!res.ok) throw new Error(`startSession failed: ${res.status}`);
  return res.json();
}

export async function getSessionStatus(): Promise<SessionStatus> {
  const res = await fetch(`${API_BASE}/session/status`);
  if (!res.ok) throw new Error(`getSessionStatus failed: ${res.status}`);
  return res.json();
}

export async function resetSession(): Promise<void> {
  await fetch(`${API_BASE}/session/reset`, { method: "POST" });
}

export interface ScrapedPost {
  id: string;
  title: string;
  url: string;
  upvotes: number;
  commentCount: number;
  comments: string[];
}

export async function sendPostBatch(
  subreddit: string,
  posts: ScrapedPost[],
  done: boolean
): Promise<PostBatchResponse> {
  const res = await fetch(`${API_BASE}/posts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subreddit, posts, done }),
  });
  if (!res.ok) throw new Error(`sendPostBatch failed: ${res.status}`);
  return res.json();
}
