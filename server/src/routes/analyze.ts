import { Router } from "express";
import type { Request, Response } from "express";
import { scoreText } from "../utils.ts";
import { config } from "../config.ts";
import { analyzeWithClaude } from "../llm.ts";
import { rawPosts } from "../store.ts";
import { saveScoredPosts } from "../archive-helpers.ts";
import type { ScoredTopic } from "../types.ts";

const router = Router();

router.post("/analyze", async (req: Request, res: Response) => {
  if (rawPosts.size === 0) {
    res.status(400).json({ error: "No raw posts collected yet. Run a scrape session first." });
    return;
  }

  const all: ScoredTopic[] = [];
  for (const [subreddit, posts] of rawPosts.entries()) {
    for (const p of posts) {
      const { score, matchedKeywords } = scoreText(p.title, p.comments);
      if (score >= config.minSignalScore) {
        all.push({ ...p, subreddit, signalScore: score, matchedKeywords });
      }
    }
  }

  all.sort((a, b) => b.signalScore - a.signalScore || b.upvotes - a.upvotes);
  await saveScoredPosts(all);
  console.log(`[analyze] scored ${all.length} posts above threshold`);

  const ideas = await analyzeWithClaude(all);

  res.json({ scoredCount: all.length, ideas });
});

export default router;
