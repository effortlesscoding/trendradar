import Snoowrap, { Submission, Comment } from "snoowrap";
import Anthropic from "@anthropic-ai/sdk";
import dotenv from "dotenv";
import { PostData, ScoredTopic, LLMVideoIdea } from './types';
import { CONFIG } from './config';
import { sleep, scoreText } from './utils';
import * as ArchiveHelpers from './archive-helpers';

dotenv.config();

// ---------------------------------------------------------------------------
// Reddit fetching
// ---------------------------------------------------------------------------

async function fetchPostsFromSubreddit(
  r: Snoowrap,
  subreddit: string,
  limit: number
): Promise<PostData[]> {
  console.log(`  ↳ Fetching r/${subreddit}...`);

  const listing = await r.getSubreddit(subreddit).getNew({ limit });
  const posts: PostData[] = [];

  for (const post of listing as Submission[]) {
    const commentTexts: string[] = [];

    try {
      const withComments = await (post as any).expandReplies({ limit: CONFIG.commentsPerPost, depth: 1 });
      const comments: Comment[] = withComments.comments ?? [];

      for (const c of comments.slice(0, CONFIG.commentsPerPost)) {
        if (c.body && c.body !== "[deleted]" && c.body !== "[removed]") {
          commentTexts.push(c.body.slice(0, 300));
        }
      }
    } catch (err) {
      console.warn(`   ⚠️  Could not fetch comments for post ${post.id}:`, (err as Error).message);
      throw err;
    }

    posts.push({
      id: post.id,
      subreddit,
      title: post.title,
      body: (post.selftext ?? "").slice(0, 500),
      score: post.score,
      numComments: post.num_comments,
      url: `https://reddit.com${post.permalink}`,
      comments: commentTexts,
    });

    await sleep(CONFIG.delayBetweenRequests);
  }

  return posts;
}

// ---------------------------------------------------------------------------
// Signal scoring
// ---------------------------------------------------------------------------

function scorePosts(posts: PostData[]): ScoredTopic[] {
  const results: ScoredTopic[] = [];

  for (const post of posts) {
    const fullText = [post.title, post.body, ...post.comments].join(" ");
    const { total, matched } = scoreText(fullText);

    if (total >= CONFIG.minSignalScore) {
      results.push({
        subreddit: post.subreddit,
        title: post.title,
        url: post.url,
        score: total,
        redditScore: post.score,
        matchedSignals: matched,
        rawText: fullText.slice(0, 1500),
      });
    }
  }

  results.sort((a, b) => b.score - a.score || b.redditScore - a.redditScore);
  return results;
}

// ---------------------------------------------------------------------------
// LLM analysis (Anthropic Claude)
// ---------------------------------------------------------------------------

const LLM_MODEL = "claude-sonnet-4-20250514";

async function analyzeWithLLM(topics: ScoredTopic[]): Promise<LLMVideoIdea[]> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const topicsForPrompt = topics.slice(0, CONFIG.llmTopN).map((t, i) => ({
    index: i + 1,
    subreddit: t.subreddit,
    title: t.title,
    signals: t.matchedSignals,
    excerpt: t.rawText.slice(0, 400),
  }));

  const prompt = `You are a YouTube content strategist specialising in AI and computer science education.

Below is a list of Reddit posts where users are clearly hungry for information, confused, or frustrated with a lack of good explanations on a topic. Each entry includes the post title, subreddit, matched confusion signals, and a short excerpt.

Your job:
1. Identify which posts represent a genuine gap in educational YouTube content.
2. Discard duplicates or low-value topics.
3. For each strong candidate, return a JSON array with this shape:

[
  {
    "topic": "short topic label",
    "rationale": "why this is a good YouTube video idea (1-2 sentences)",
    "suggestedTitle": "a compelling YouTube video title",
    "category": one of: "concept-explainer" | "tutorial" | "comparison" | "myth-busting" | "deep-dive"
  }
]

Return ONLY the JSON array. No preamble, no markdown fences.

REDDIT POSTS:
${JSON.stringify(topicsForPrompt, null, 2)}`;

  console.log("\n🤖 Sending top topics to Claude for analysis...");

  const response = await client.messages.create({
    model: LLM_MODEL,
    max_tokens: 2000,
    messages: [{ role: "user", content: prompt }],
  });

  const raw = (response.content[0] as { type: string; text: string }).text.trim();

  try {
    return JSON.parse(raw) as LLMVideoIdea[];
  } catch {
    console.error("⚠️  Could not parse LLM JSON. Raw output:\n", raw);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------

function printResults(scored: ScoredTopic[], ideas: LLMVideoIdea[]) {
  console.log("\n" + "=".repeat(70));
  console.log("📊  TOP SIGNAL POSTS (pre-LLM)");
  console.log("=".repeat(70));

  for (const t of scored.slice(0, 15)) {
    console.log(`\n[signal:${t.score} reddit:${t.redditScore}] r/${t.subreddit}`);
    console.log(`  ${t.title}`);
    console.log(`  Signals: ${t.matchedSignals.join(", ")}`);
    console.log(`  ${t.url}`);
  }

  if (ideas.length > 0) {
    console.log("\n" + "=".repeat(70));
    console.log("🎬  VIDEO IDEAS (Claude-verified)");
    console.log("=".repeat(70));

    for (const idea of ideas) {
      console.log(`\n[${idea.category}] ${idea.topic}`);
      console.log(`  Title    : "${idea.suggestedTitle}"`);
      console.log(`  Rationale: ${idea.rationale}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(subreddits: string[]) {
  console.log(`🔍 Reddit YouTube Research Tool`);
  console.log(`   Subreddits : ${subreddits.join(", ")}`);
  console.log(`   Posts/sub  : ${CONFIG.postsPerSubreddit}`);
  console.log(`   Comments   : ${CONFIG.commentsPerPost} per post\n`);

  const archiveDir = await ArchiveHelpers.ensureArchiveDir();
  console.log(`📁 Archive dir: ${archiveDir}\n`);

  const r = new Snoowrap({
    userAgent: "yt-research-bot/1.0 (personal research script)",
    clientId: process.env.REDDIT_CLIENT_ID!,
    clientSecret: process.env.REDDIT_CLIENT_SECRET!,
    username: process.env.REDDIT_USERNAME!,
    password: process.env.REDDIT_PASSWORD!,
  });

  // Fetch all posts and save each subreddit as it comes in
  const allPosts: PostData[] = [];
  for (const sub of subreddits) {
    const posts = await fetchPostsFromSubreddit(r, sub, CONFIG.postsPerSubreddit);
    allPosts.push(...posts);
    console.log(`   ✓ ${posts.length} posts fetched from r/${sub}`);
    await ArchiveHelpers.saveSubredditPosts(archiveDir, sub, posts);
  }

  console.log(`\n📝 Total posts: ${allPosts.length}`);

  // Score and save
  const scored = scorePosts(allPosts);
  console.log(`✅ Posts matching signal threshold: ${scored.length}`);
  await ArchiveHelpers.saveScoredTopics(archiveDir, allPosts, scored);

  // Optional LLM analysis
  let ideas: LLMVideoIdea[] = [];
  if (CONFIG.llmEnabled && process.env.ANTHROPIC_API_KEY) {
    ideas = await analyzeWithLLM(scored);
    console.log(`💡 Video ideas generated: ${ideas.length}`);
    await ArchiveHelpers.saveLLMIdeas(archiveDir, ideas, LLM_MODEL);
  } else if (CONFIG.llmEnabled) {
    console.log("⚠️  ANTHROPIC_API_KEY not set — skipping LLM step.");
  }

  printResults(scored, ideas);
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

const SUBREDDITS = [
  "MachineLearning",
  "learnmachinelearning",
  "artificial",
  "LocalLLaMA",
  "ChatGPT",
  "learnprogramming",
  "cscareerquestions",
  "compsci",
];

main(SUBREDDITS).catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});