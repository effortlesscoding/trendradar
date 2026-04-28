import {
  startSession,
  sendPostBatch,
  resetSession,
  type ScrapedPost,
} from "./api-client.js";

const BATCH_SIZE = 20;
const SCROLL_DELAY = 2000;
const TAB_DELAY = 3000;
const POSTS_PER_SUB = 50;

interface ScrapeJob {
  subreddit: string;
  postsTarget: number;
}

let isRunning = false;

async function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function scrollToLoadPosts(tabId: number, targetCount: number): Promise<void> {
  let attempts = 0;
  const maxAttempts = Math.ceil(targetCount / 10) + 3;

  while (attempts < maxAttempts) {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: () => window.scrollTo(0, document.body.scrollHeight),
    });
    await sleep(SCROLL_DELAY);
    attempts++;
  }
}

async function scrapeTab(tabId: number): Promise<ScrapedPost[]> {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        return new Promise<ScrapedPost[]>((resolve) => {
          chrome.runtime.sendMessage({ type: "SCRAPE_POSTS" }, (response) => {
            resolve(response?.posts ?? []);
          });
        });
      },
    });
    return (results?.[0]?.result as ScrapedPost[]) ?? [];
  } catch {
    // Try direct message to content script
    return new Promise((resolve) => {
      chrome.tabs.sendMessage(tabId, { type: "SCRAPE_POSTS" }, (response) => {
        resolve(response?.posts ?? []);
      });
    });
  }
}

async function sendInBatches(
  subreddit: string,
  posts: ScrapedPost[]
): Promise<void> {
  for (let i = 0; i < posts.length; i += BATCH_SIZE) {
    const batch = posts.slice(i, i + BATCH_SIZE);
    const isLast = i + BATCH_SIZE >= posts.length;
    await sendPostBatch(subreddit, batch, isLast);
  }

  // If no posts, still signal done
  if (posts.length === 0) {
    await sendPostBatch(subreddit, [], true);
  }
}

async function processSub(job: ScrapeJob): Promise<void> {
  const { subreddit } = job;
  const url = `https://www.reddit.com/r/${subreddit}/?sort=hot`;

  console.log(`[bg] opening tab for r/${subreddit}`);
  const tab = await chrome.tabs.create({ url, active: false });
  const tabId = tab.id!;

  // Wait for page load
  await new Promise<void>((resolve) => {
    const listener = (id: number, info: chrome.tabs.TabChangeInfo) => {
      if (id === tabId && info.status === "complete") {
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    };
    chrome.tabs.onUpdated.addListener(listener);
  });

  await sleep(2000); // let JS render

  // Scroll to load posts
  await scrollToLoadPosts(tabId, job.postsTarget);

  // Scrape
  const posts = await scrapeTab(tabId);
  console.log(`[bg] r/${subreddit}: scraped ${posts.length} posts`);

  // Close tab
  await chrome.tabs.remove(tabId);

  // Send to API
  await sendInBatches(subreddit, posts.slice(0, job.postsTarget));

  await sleep(TAB_DELAY);
}

async function runScrape(subreddits: string[], postsPerSub: number): Promise<void> {
  isRunning = true;

  try {
    await resetSession();
    await startSession(subreddits);

    for (const subreddit of subreddits) {
      if (!isRunning) break;
      try {
        await processSub({ subreddit, postsTarget: postsPerSub });
      } catch (err) {
        console.error(`[bg] error scraping r/${subreddit}:`, err);
        // Still send done signal
        await sendPostBatch(subreddit, [], true).catch(() => {});
      }
    }
  } finally {
    isRunning = false;
    console.log("[bg] scrape complete");
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "START_SCRAPE") {
    if (isRunning) {
      sendResponse({ ok: false, error: "Already running" });
      return;
    }
    runScrape(message.subreddits, message.postsPerSub ?? POSTS_PER_SUB).catch(
      console.error
    );
    sendResponse({ ok: true });
  }

  if (message.type === "STOP_SCRAPE") {
    isRunning = false;
    sendResponse({ ok: true });
  }

  if (message.type === "IS_RUNNING") {
    sendResponse({ isRunning });
  }
});
