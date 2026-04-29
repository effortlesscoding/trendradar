import type { SessionState, SubredditStatus } from "./types.ts";

let state: SessionState = {
  subreddits: {},
  startedAt: null,
  finishedAt: null,
};

export function initSession(subreddits: string[]): void {
  state = {
    subreddits: Object.fromEntries(
      subreddits.map((sub) => [
        sub,
        { status: "pending" as SubredditStatus, postCount: 0 },
      ])
    ),
    startedAt: new Date().toISOString(),
    finishedAt: null,
  };
}

export function setSubredditStatus(
  subreddit: string,
  status: SubredditStatus,
  postCount?: number,
  error?: string
): void {
  if (!state.subreddits[subreddit]) return;
  state.subreddits[subreddit].status = status;
  if (postCount !== undefined) state.subreddits[subreddit].postCount = postCount;
  if (error) state.subreddits[subreddit].error = error;
  if (status === "scraping") state.subreddits[subreddit].startedAt = new Date().toISOString();
  if (status === "done" || status === "error") {
    state.subreddits[subreddit].finishedAt = new Date().toISOString();
  }

  // Check if all done
  const allDone = Object.values(state.subreddits).every(
    (s) => s.status === "done" || s.status === "error"
  );
  if (allDone && !state.finishedAt) {
    state.finishedAt = new Date().toISOString();
  }
}

export function getSession(): SessionState {
  return state;
}

export function isAllDone(): boolean {
  return (
    Object.keys(state.subreddits).length > 0 &&
    Object.values(state.subreddits).every(
      (s) => s.status === "done" || s.status === "error"
    )
  );
}

export function resetSession(): void {
  state = {
    subreddits: {},
    startedAt: null,
    finishedAt: null,
  };
}
