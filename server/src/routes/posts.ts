import { Router } from "express";
import type { Request, Response } from "express";
import type { PostBatch, PostData } from "../types.ts";
import { setSubredditStatus, isAllDone, getSession } from "../session.ts";
import { saveSubredditPosts, saveAllRawPosts } from "../archive-helpers.ts";
import { rawPosts } from "../store.ts";

const router = Router();

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

  if (session.subreddits[subreddit].status === "pending") {
    setSubredditStatus(subreddit, "scraping");
  }

  const now = new Date().toISOString();
  const incoming: PostData[] = posts.map((p) => ({
    id: p.id,
    title: p.title,
    url: p.url,
    subreddit,
    upvotes: p.upvotes,
    commentCount: p.commentCount,
    comments: p.comments,
    scrapedAt: now,
  }));

  const existing = rawPosts.get(subreddit) ?? [];
  rawPosts.set(subreddit, [...existing, ...incoming]);

  if (done) {
    const subredditPosts = rawPosts.get(subreddit) ?? [];
    subredditPosts.sort((a, b) => b.upvotes - a.upvotes);
    rawPosts.set(subreddit, subredditPosts);
    setSubredditStatus(subreddit, "done", subredditPosts.length);
    await saveSubredditPosts(subreddit, subredditPosts);
    console.log(`[posts] ${subreddit} done — ${subredditPosts.length} raw posts`);

    if (isAllDone()) {
      const all: PostData[] = [];
      for (const p of rawPosts.values()) all.push(...p);
      all.sort((a, b) => b.upvotes - a.upvotes);
      await saveAllRawPosts(all);
      console.log(`[posts] all subreddits done — ${all.length} total raw posts. Run POST /analyze to score and classify.`);
    }
  }

  res.json({
    received: posts.length,
    subredditTotal: rawPosts.get(subreddit)?.length ?? 0,
  });
});

export default router;
