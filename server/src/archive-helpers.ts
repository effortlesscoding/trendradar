import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import type { PostData, ScoredTopic, LLMVideoIdea, Comment } from "./types.ts";
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
      minSignalScore: config.minSignalScore,
      llmTopN: config.llmTopN,
    },
    ...extra,
  };
}

export async function saveSubredditPosts(
  subreddit: string,
  posts: PostData[]
): Promise<void> {
  const base = join(getTodayDir(), `r_${subreddit.replace(/\//g, "_")}`);
  await Promise.all(
    posts.map(async (post) => {
      const dir = join(base, post.id);
      await mkdir(dir, { recursive: true });
      const filepath = join(dir, "summary.json");
      await writeFile(filepath, JSON.stringify(post, null, 2), "utf-8");
    })
  );
  console.log(`[archive] saved ${posts.length} posts under r_${subreddit}/`);
}

export async function savePostComments(
  subreddit: string,
  postId: string,
  comments: Comment[]
): Promise<void> {
  const dir = join(
    getTodayDir(),
    `r_${subreddit.replace(/\//g, "_")}`,
    postId
  );
  await mkdir(dir, { recursive: true });
  const filepath = join(dir, "comments.json");
  await writeFile(filepath, JSON.stringify(comments, null, 2), "utf-8");
  console.log(`[archive] saved ${filepath}`);
}

export async function saveAllRawPosts(posts: PostData[]): Promise<void> {
  const dir = getTodayDir();
  await mkdir(dir, { recursive: true });
  const filepath = join(dir, "raw.json");
  const payload = {
    meta: makeMeta({ totalPosts: posts.length }),
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
