import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { PostData, ScoredTopic, LLMVideoIdea } from "./types";
import { CONFIG } from "./config";
import { LLMArchive, SubredditArchive, ScoredArchive } from './types' ;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SCRIPT_VERSION = "1.0.0";
const TMP_ROOT = "tmp";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function todayFolder(): string {
  return new Date().toISOString().slice(0, 10); // e.g. "2026-04-27"
}

async function ensureDir(path: string): Promise<void> {
  await mkdir(path, { recursive: true });
}

async function writeJSON(filePath: string, data: unknown): Promise<void> {
  await writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
  console.log(`   💾 Saved: ${filePath}`);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns the dated tmp folder path and ensures it exists.
 * e.g. tmp/2026-04-27/
 */
export async function ensureArchiveDir(): Promise<string> {
  const dir = join(TMP_ROOT, todayFolder());
  await ensureDir(dir);
  return dir;
}

/**
 * Saves raw posts for a single subreddit.
 * e.g. tmp/2026-04-27/r_MachineLearning.json
 */
export async function saveSubredditPosts(
  dir: string,
  subreddit: string,
  posts: PostData[]
): Promise<void> {
  const archive: SubredditArchive = {
    meta: {
      subreddit,
      fetchedAt: new Date().toISOString(),
      postCount: posts.length,
      scriptVersion: SCRIPT_VERSION,
    },
    posts,
  };

  const fileName = `r_${subreddit}.json`;
  await writeJSON(join(dir, fileName), archive);
}

/**
 * Saves all signal-scored topics.
 * e.g. tmp/2026-04-27/scored.json
 */
export async function saveScoredTopics(
  dir: string,
  allPosts: PostData[],
  scored: ScoredTopic[]
): Promise<void> {
  const archive: ScoredArchive = {
    meta: {
      fetchedAt: new Date().toISOString(),
      totalPosts: allPosts.length,
      matchedPosts: scored.length,
      minSignalScore: CONFIG.minSignalScore,
      scriptVersion: SCRIPT_VERSION,
    },
    topics: scored,
  };

  await writeJSON(join(dir, "scored.json"), archive);
}

/**
 * Saves LLM-generated video ideas.
 * e.g. tmp/2026-04-27/llm_ideas.json
 */
export async function saveLLMIdeas(
  dir: string,
  ideas: LLMVideoIdea[],
  model: string
): Promise<void> {
  const archive: LLMArchive = {
    meta: {
      fetchedAt: new Date().toISOString(),
      model,
      topNSent: CONFIG.llmTopN,
      ideasGenerated: ideas.length,
      scriptVersion: SCRIPT_VERSION,
    },
    ideas,
  };

  await writeJSON(join(dir, "llm_ideas.json"), archive);
}