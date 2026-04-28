import Anthropic from "@anthropic-ai/sdk";
import type { ScoredTopic, LLMVideoIdea } from "./types.ts";
import { config } from "./config.ts";
import { saveLLMIdeas } from "./archive-helpers.ts";

const client = new Anthropic();

export async function analyzeWithClaude(
  topPosts: ScoredTopic[]
): Promise<LLMVideoIdea[]> {
  console.log(`[llm] analyzing ${topPosts.length} posts with Claude...`);

  const postsForPrompt = topPosts.slice(0, config.llmTopN).map((p) => ({
    title: p.title,
    subreddit: p.subreddit,
    upvotes: p.upvotes,
    signalScore: p.signalScore,
    matchedKeywords: p.matchedKeywords,
    comments: p.comments.slice(0, 3),
  }));

  const prompt = `You are a YouTube content strategist specializing in AI and computer science education.

Below are Reddit posts from AI/CS subreddits that show information hunger — people genuinely confused, frustrated, or searching for explanations. Each has a signal score (higher = stronger learning intent) and matched keywords indicating what kind of confusion is present.

Your job:
1. Identify GENUINE content gaps where a well-made YouTube video would fill a real need
2. Deduplicate similar topics — merge related posts into one video idea
3. Prioritize topics with high signal scores and upvotes
4. Avoid vague or overly broad topics; be specific and actionable

Return ONLY a JSON array (no markdown, no preamble) of video ideas with this shape:
[
  {
    "topic": "string — the specific subject matter",
    "rationale": "string — why this is a content gap and what the audience pain point is",
    "suggestedTitle": "string — a compelling, specific YouTube video title",
    "category": "concept-explainer" | "tutorial" | "comparison" | "myth-busting" | "deep-dive"
  }
]

Reddit posts to analyze:
${JSON.stringify(postsForPrompt, null, 2)}`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
  });

  const text = message.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { type: "text"; text: string }).text)
    .join("");

  let ideas: LLMVideoIdea[] = [];
  try {
    const cleaned = text.replace(/```json\n?|```\n?/g, "").trim();
    ideas = JSON.parse(cleaned);
  } catch (err) {
    console.error("[llm] failed to parse Claude response:", err);
    console.error("[llm] raw response:", text);
    throw new Error("Claude returned invalid JSON");
  }

  await saveLLMIdeas(ideas);
  console.log(`[llm] got ${ideas.length} video ideas`);
  return ideas;
}
