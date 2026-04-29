#!/usr/bin/env node
import "dotenv/config";
import { readFile, readdir, mkdir, writeFile } from "fs/promises";
import { join, resolve } from "path";
import { scoreText } from "../utils.ts";
import { config } from "../config.ts";
import { analyzeWithClaude } from "../llm.ts";
import type { PostData, ScoredTopic } from "../types.ts";

const dateArg = process.argv.find((_, i) => process.argv[i - 1] === "--date");
const date = dateArg ?? new Date().toISOString().slice(0, 10);
const dir = resolve(process.cwd(), "tmp", date);

async function loadRawPosts(): Promise<PostData[]> {
  try {
    const content = await readFile(join(dir, "raw.json"), "utf-8");
    const { posts } = JSON.parse(content) as { posts: PostData[] };
    return posts;
  } catch {
    // Fall back to individual r_*.json files (collected before raw.json existed)
    const files = (await readdir(dir)).filter(
      (f) => f.startsWith("r_") && f.endsWith(".json")
    );
    if (files.length === 0) throw new Error(`No raw posts found in ${dir}`);
    const all: PostData[] = [];
    for (const file of files) {
      const content = await readFile(join(dir, file), "utf-8");
      const { posts } = JSON.parse(content) as { posts: PostData[] };
      all.push(...posts);
    }
    return all;
  }
}

async function save(filename: string, payload: unknown): Promise<void> {
  await mkdir(dir, { recursive: true });
  const filepath = join(dir, filename);
  await writeFile(filepath, JSON.stringify(payload, null, 2), "utf-8");
  console.log(`[analyze] saved ${filepath}`);
}

const raw = await loadRawPosts();
console.log(`[analyze] loaded ${raw.length} raw posts from tmp/${date}`);

const scored: ScoredTopic[] = [];
for (const p of raw) {
  const { score, matchedKeywords } = scoreText(p.title, p.comments);
  if (score >= config.minSignalScore) {
    scored.push({ ...p, signalScore: score, matchedKeywords });
  }
}
scored.sort((a, b) => b.signalScore - a.signalScore || b.upvotes - a.upvotes);
console.log(
  `[analyze] ${scored.length} / ${raw.length} posts above signal threshold (${config.minSignalScore})`
);

await save("scored.json", {
  meta: { timestamp: new Date().toISOString(), version: config.version, totalPosts: scored.length },
  posts: scored,
});

const ideas = await analyzeWithClaude(scored);

await save("llm_ideas.json", {
  meta: { timestamp: new Date().toISOString(), version: config.version, ideaCount: ideas.length },
  ideas,
});

console.log(`[analyze] done — ${ideas.length} video ideas`);
