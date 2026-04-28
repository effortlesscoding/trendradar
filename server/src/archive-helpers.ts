import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import type { ScoredTopic, LLMVideoIdea } from "./types.ts";
import { config } from "./config.ts";

function getTodayDir(): string {
  const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  return join(process.cwd(), "tmp", date);
}

function makeMeta(extra: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    timestamp: new Date().toISOString(),
    version: config.version,
    config: {
      postsPerSubreddit: config.postsPerSubreddit,
      minSignalScore: config.minSignalScore,
      llmTopN: config.llmTopN,
    },
    ...extra,
  };
}

export async function saveSubredditPosts(
  subreddit: string,
  posts: ScoredTopic[]
): Promise<void> {
  const dir = getTodayDir();
  await mkdir(dir, { recursive: true });
  const filename = `r_${subreddit.replace(/\//g, "_")}.json`;
  const filepath = join(dir, filename);
  const payload = {
    meta: makeMeta({ subreddit, postCount: posts.length }),
    posts,
  };
  await writeFile(filepath, JSON.stringify(payload, null, 2), "utf-8");
  console.log(`[archive] saved ${filepath}`);
}

export async function saveScoredPosts(posts: ScoredTopic[]): Promise<void> {
  const dir = getTodayDir();
  await mkdir(dir, { recursive: true });
  const filepath = join(dir, "scored.json");
  const payload = {
    meta: makeMeta({ totalPosts: posts.length }),
    posts,
  };
  await writeFile(filepath, JSON.stringify(payload, null, 2), "utf-8");
  console.log(`[archive] saved ${filepath}`);
}

export async function saveLLMIdeas(ideas: LLMVideoIdea[]): Promise<void> {
  const dir = getTodayDir();
  await mkdir(dir, { recursive: true });
  const filepath = join(dir, "llm_ideas.json");
  const payload = {
    meta: makeMeta({ ideaCount: ideas.length }),
    ideas,
  };
  await writeFile(filepath, JSON.stringify(payload, null, 2), "utf-8");
  console.log(`[archive] saved ${filepath}`);
}
