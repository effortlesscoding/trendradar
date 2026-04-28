import { Router } from "express";
import type { Request, Response } from "express";
import type { PostBatch, PostData, ScoredTopic } from "../types.ts";
import { scoreText } from "../utils.ts";
import { config } from "../config.ts";
import {
  setSubredditStatus,
  isAllDone,
  getSession,
  markAnalysisTriggered,
} from "../session.ts";
import { saveSubredditPosts, saveScoredPosts } from "../archive-helpers.ts";
import { analyzeWithClaude } from "../llm.ts";

const router = Router();

// In-memory store: subreddit -> scored posts
const allScoredPosts = new Map<string, ScoredTopic[]>();

router.post("/posts", async (req: Request, res: Response) => {
  const batch = req.body as PostBatch;

  if (!batch || !batch.subreddit || !Array.isArray(batch.posts)) {
    res.status(400).json({ error: "Invalid batch payload" });
    return;
  }

  const { subreddit, posts, done } = batch;
  const session = getSession();

  if (!session.subreddits[subreddit]) {
    res.status(400).json({ error: `Unknown subreddit: ${subreddit}` });
    return;
  }

  // Mark as scraping on first batch
  if (session.subreddits[subreddit].status === "pending") {
    setSubredditStatus(subreddit, "scraping");
  }

  // Score incoming posts
  const now = new Date().toISOString();
  const scoredBatch: ScoredTopic[] = posts
    .map((p): ScoredTopic => {
      const { score, matchedKeywords } = scoreText(p.title, p.comments);
      return {
        id: p.id,
        title: p.title,
        url: p.url,
        subreddit,
        upvotes: p.upvotes,
        commentCount: p.commentCount,
        comments: p.comments,
        scrapedAt: now,
        signalScore: score,
        matchedKeywords,
      };
    })
    .filter((p) => p.signalScore >= config.minSignalScore);

  // Accumulate
  const existing = allScoredPosts.get(subreddit) ?? [];
  allScoredPosts.set(subreddit, [...existing, ...scoredBatch]);

  if (done) {
    const subredditPosts = allScoredPosts.get(subreddit) ?? [];
    subredditPosts.sort(
      (a, b) => b.signalScore - a.signalScore || b.upvotes - a.upvotes
    );
    allScoredPosts.set(subreddit, subredditPosts);
    setSubredditStatus(subreddit, "done", subredditPosts.length);
    await saveSubredditPosts(subreddit, subredditPosts);
    console.log(
      `[posts] ${subreddit} done — ${subredditPosts.length} scored posts`
    );

    // Trigger analysis if all subreddits are done
    if (isAllDone()) {
      const currentSession = getSession();
      if (!currentSession.analysisTriggered) {
        markAnalysisTriggered();
        // Aggregate + sort all posts
        const all: ScoredTopic[] = [];
        for (const posts of allScoredPosts.values()) all.push(...posts);
        all.sort(
          (a, b) => b.signalScore - a.signalScore || b.upvotes - a.upvotes
        );
        await saveScoredPosts(all);

        // Fire-and-forget LLM analysis
        analyzeWithClaude(all).catch((err) =>
          console.error("[posts] LLM analysis failed:", err)
        );
      }
    }
  }

  res.json({
    received: posts.length,
    scored: scoredBatch.length,
    subredditTotal: allScoredPosts.get(subreddit)?.length ?? 0,
  });
});

export default router;
