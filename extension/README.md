# Reddit Research Tool

Scrape Reddit to find topics people are confused or frustrated about in AI/CS — for YouTube content research.

## Architecture

- **Node.js API** (port 3457) — receives scraped posts, scores them, runs Claude analysis
- **Chrome Extension (MV3)** — opens Reddit tabs, scrapes DOM, sends data to API

## Quick Start

### 1. API Server

```bash
# Install dependencies
npm install

# Copy and fill in your Anthropic API key
cp .env.example .env

# Start the server (Node 22+ required)
npm start
# or for development with auto-restart:
npm run dev
```

### 2. Chrome Extension

```bash
cd extension

# Install TypeScript
npm install -g typescript

# Compile
tsc

# Load in Chrome:
# 1. Go to chrome://extensions/
# 2. Enable "Developer mode"
# 3. Click "Load unpacked"
# 4. Select the `extension/` folder
```

## How It Works

1. Open the extension popup
2. Enter subreddits (one per line)
3. Set posts per subreddit
4. Click **Start Scrape**
5. The extension opens each subreddit in a background tab, scrolls to load posts, scrapes the DOM, and sends batches to the API
6. Once all subreddits are done, the API automatically scores posts and sends top results to Claude
7. Results are saved to `tmp/YYYY-MM-DD/`

## Output Files

| File | Contents |
|------|----------|
| `tmp/YYYY-MM-DD/r_MachineLearning.json` | Scored posts per subreddit |
| `tmp/YYYY-MM-DD/scored.json` | All scored posts, sorted by signal score |
| `tmp/YYYY-MM-DD/llm_ideas.json` | YouTube video ideas from Claude |

## Scoring System

Posts are scored based on regex patterns that detect information hunger:

| Weight | Patterns |
|--------|----------|
| 3 | ELI5, "can someone explain", "no good resource", "wish someone explained", "intuition behind", "nobody explains" |
| 2 | "how does X work", "looking for tutorial", "still don't understand", "what is the difference", "best way to learn" |
| 1 | "how to", "why does", "tutorial", "explain", "beginner", "frustrated" |

Posts below `minSignalScore` (default: 2) are dropped.

## Claude Output Format

```json
[
  {
    "topic": "Attention mechanisms in transformers",
    "rationale": "Many beginners struggle with the math and intuition...",
    "suggestedTitle": "Attention Is All You Need — But What Does That Actually Mean?",
    "category": "concept-explainer"
  }
]
```

Categories: `concept-explainer | tutorial | comparison | myth-busting | deep-dive`

## Configuration (`src/config.ts`)

```ts
{
  postsPerSubreddit: 50,
  commentsPerPost: 10,      // planned for phase 2
  delayBetweenRequests: 1500,
  minSignalScore: 2,
  llmTopN: 30,              // top N posts sent to Claude
}
```

## Environment Variables

```
ANTHROPIC_API_KEY=sk-ant-...
```

## Notes

- Reddit's free API was shut down — the extension scrapes the DOM instead
- Comments are currently scraped as empty; a two-pass approach (score titles first, then fetch comments for high-signal posts) is planned
- The extension handles both new Reddit (`shreddit-post` web components) and old Reddit layouts
